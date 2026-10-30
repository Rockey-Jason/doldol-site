import Fastify from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import { createHash, randomBytes } from 'node:crypto';
import { admin, verifyPlayer, type VerifiedPlayer } from './auth.js';
import { GameRoom, type Mode, type PlayerClient } from './game-room.js';

const app = Fastify({ logger: true, bodyLimit: 16384 });
const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
const clients = new Map<string, PlayerClient>();
const queues = new Map<Mode, PlayerClient[]>();
type Party = { id: string; code: string; hostId: string; mode: Mode; members: PlayerClient[]; expiresAt: number };
const parties = new Map<string, Party>();
const rooms = new Map<string, GameRoom>();
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://rockey-jason.github.io,http://localhost:5173')
    .split(',').map(s => s.trim()).filter(Boolean)
);

function send(client: PlayerClient, message: Record<string, unknown>) {
  if (client.ws.readyState === WebSocket.OPEN) client.ws.send(JSON.stringify(message));
}
function makeCode() { return randomBytes(4).toString('hex').toUpperCase(); }
function hashCode(code: string) { return createHash('sha256').update(code).digest('hex'); }
function modeSize(mode: Mode) {
  if (mode === '1v1' || mode === 'ranked') return 2;
  if (mode === '2v2') return 4;
  if (mode === '3v3') return 6;
  return 8;
}
function isMode(value: unknown): value is Mode {
  return ['1v1', '2v2', '3v3', 'ranked', 'ffa'].includes(String(value));
}
function removeFromQueues(client: PlayerClient) {
  for (const [mode, list] of queues) queues.set(mode, list.filter(item => item !== client));
}
async function startRoom(mode: Mode, members: PlayerClient[]) {
  const id = randomBytes(12).toString('hex');
  const room = new GameRoom(id, mode, members, roomId => rooms.delete(roomId));
  rooms.set(id, room);
  await room.start();
}
async function handle(client: PlayerClient, raw: WebSocket.RawData) {
  let message: Record<string, unknown>;
  try { message = JSON.parse(raw.toString()) as Record<string, unknown>; }
  catch { return send(client, { type: 'error', message: '올바르지 않은 메시지입니다.' }); }

  switch (message.type) {
    case 'ping':
      return send(client, { type: 'pong', timestamp: Date.now() });

    case 'queue.join': {
      if (client.roomId) return send(client, { type: 'error', message: '이미 경기에 참가 중입니다.' });
      if (!isMode(message.mode)) return send(client, { type: 'error', message: '지원하지 않는 게임 모드입니다.' });
      const mode = message.mode;
      removeFromQueues(client);
      const queue = queues.get(mode) || [];
      if (!queue.some(item => item.player.id === client.player.id)) queue.push(client);
      queues.set(mode, queue);
      send(client, { type: 'queue.joined', mode, size: queue.length, required: modeSize(mode) });
      if (queue.length >= modeSize(mode)) {
        const group = queue.splice(0, modeSize(mode));
        queues.set(mode, queue);
        await startRoom(mode, group);
      }
      return;
    }

    case 'queue.leave':
      removeFromQueues(client);
      return send(client, { type: 'queue.left' });

    case 'private.create': {
      if (!isMode(message.mode) || !['1v1','2v2','3v3'].includes(String(message.mode))) {
        return send(client, { type: 'private.error', message: '비공개 방은 1v1, 2v2, 3v3만 지원합니다.' });
      }
      if (client.roomId) return send(client, { type: 'private.error', message: '이미 경기에 참가 중입니다.' });
      for (const [id, party] of parties) {
        if (party.hostId === client.player.id) parties.delete(id);
      }
      const code = makeCode();
      const id = randomBytes(10).toString('hex');
      const mode = message.mode as Mode;
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const { error } = await admin.from('rockey_invites').insert({
        host_user_id: client.player.id,
        room_code_hash: hashCode(code),
        mode,
        status: 'pending',
        expires_at: new Date(expiresAt).toISOString()
      });
      if (error) return send(client, { type: 'private.error', message: '초대 방을 저장하지 못했습니다.' });
      parties.set(id, { id, code, hostId: client.player.id, mode, members: [client], expiresAt });
      return send(client, { type: 'private.created', code, mode, members: 1, required: modeSize(mode) });
    }

    case 'private.join': {
      const code = String(message.code || '').trim().toUpperCase();
      if (!/^[A-F0-9]{8}$/.test(code)) return send(client, { type: 'private.error', message: '초대 코드 형식이 올바르지 않습니다.' });
      const party = [...parties.values()].find(p => p.code === code);
      if (!party || party.expiresAt < Date.now()) return send(client, { type: 'private.error', message: '방이 만료되었거나 서버에서 찾을 수 없습니다.' });
      if (client.roomId) return send(client, { type: 'private.error', message: '이미 경기에 참가 중입니다.' });
      if (party.members.length >= modeSize(party.mode)) return send(client, { type: 'private.error', message: '방 인원이 가득 찼습니다.' });
      if (party.members.some(p => p.player.id === client.player.id)) return send(client, { type: 'private.error', message: '이미 참가한 방입니다.' });

      const { data: invite, error } = await admin.from('rockey_invites')
        .select('id,status,expires_at')
        .eq('room_code_hash', hashCode(code))
        .maybeSingle();
      if (error || !invite || invite.status !== 'pending' || new Date(invite.expires_at).getTime() < Date.now()) {
        return send(client, { type: 'private.error', message: '초대가 만료되었거나 유효하지 않습니다.' });
      }

      party.members.push(client);
      for (const member of party.members) {
        send(member, { type: 'private.member', name: client.player.name, members: party.members.length, required: modeSize(party.mode) });
      }
      return send(client, { type: 'private.joined', mode: party.mode, members: party.members.length, required: modeSize(party.mode) });
    }

    case 'private.start': {
      const party = [...parties.values()].find(p => p.hostId === client.player.id);
      if (!party || party.expiresAt < Date.now()) return send(client, { type: 'private.error', message: '시작할 수 있는 비공개 방이 없습니다.' });
      if (party.members.length !== modeSize(party.mode)) {
        return send(client, { type: 'private.error', message: '필요 인원 ' + modeSize(party.mode) + '명 / 현재 ' + party.members.length + '명' });
      }
      parties.delete(party.id);
      await admin.from('rockey_invites')
        .update({ status: 'accepted' })
        .eq('room_code_hash', hashCode(party.code));
      await startRoom(party.mode, party.members);
      return;
    }

    case 'match.leave': {
      removeFromQueues(client);
      const room = client.roomId ? rooms.get(client.roomId) : undefined;
      if (room) room.abort();
      client.roomId = undefined;
      return send(client, { type: 'queue.left' });
    }

    case 'input': {
      const room = client.roomId ? rooms.get(client.roomId) : undefined;
      room?.handleInput(client, message);
      return;
    }

    case 'fire': {
      const room = client.roomId ? rooms.get(client.roomId) : undefined;
      room?.handleFire(client, message);
      return;
    }

    case 'reload': {
      const room = client.roomId ? rooms.get(client.roomId) : undefined;
      room?.handleReload(client);
      return;
    }

    default:
      return send(client, { type: 'error', message: '지원하지 않는 요청입니다.' });
  }
}

app.get('/health', async () => ({
  status: 'online',
  service: 'rockey-game-server',
  activePlayers: clients.size,
  activeRooms: rooms.size
}));

app.server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin || '';
  if (!allowedOrigins.has(origin) || request.url?.split('?')[0] !== '/ws') {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request));
});

wss.on('connection', ws => {
  let authenticated = false;
  let busy = false;
  let client: PlayerClient | null = null;
  const authTimeout = setTimeout(() => {
    if (!authenticated) ws.close(1008, 'Authentication required');
  }, 8000);

  ws.on('message', async raw => {
    if (busy) return;
    if (!authenticated) {
      busy = true;
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (msg.type !== 'auth' || typeof msg.accessToken !== 'string') {
          ws.close(1008, 'Invalid authentication');
          return;
        }
        const player: VerifiedPlayer = await verifyPlayer(msg.accessToken);
        client = { ws, player };
        const existing = clients.get(player.id);
        existing?.ws.close(4001, 'Signed in elsewhere');
        clients.set(player.id, client);
        authenticated = true;
        clearTimeout(authTimeout);
        send(client, { type: 'auth.ok', player: { id: player.id, name: player.name } });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'AUTH_FAILED';
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'auth.error', reason }));
          ws.close(1008, 'Authentication failed');
        }
      } finally {
        busy = false;
      }
      return;
    }
    if (!client) return;
    try { await handle(client, raw); }
    catch (error) {
      app.log.error(error);
      send(client, { type: 'error', message: '서버에서 요청을 처리하지 못했습니다.' });
    }
  });

  ws.on('close', () => {
    clearTimeout(authTimeout);
    if (!client) return;
    removeFromQueues(client);
    if (clients.get(client.player.id) === client) clients.delete(client.player.id);
    const room = client.roomId ? rooms.get(client.roomId) : undefined;
    room?.abort();
    for (const [id, party] of parties) {
      party.members = party.members.filter(member => member !== client);
      if (party.members.length === 0) parties.delete(id);
    }
  });
});

const port = Number(process.env.PORT || 3000);
await app.listen({ host: '0.0.0.0', port });
app.log.info('ROCKEY server listening on port ' + port);