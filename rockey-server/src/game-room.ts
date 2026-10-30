import type { WebSocket } from 'ws';
import { admin, type VerifiedPlayer } from './auth.js';

export type Mode = '1v1' | '2v2' | '3v3' | 'ranked' | 'ffa';
export type PlayerClient = { ws: WebSocket; player: VerifiedPlayer; roomId?: string };
type Block = { x: number; z: number; hx: number; hz: number; top: number };
const COVER: Block[] = [
  { x: 0, z: 0, hx: 2.4, hz: 2.4, top: 3 },
  { x: -9, z: -7, hx: 3.2, hz: 1.1, top: 2.2 }, { x: 9, z: -7, hx: 3.2, hz: 1.1, top: 2.2 },
  { x: -9, z: 7, hx: 3.2, hz: 1.1, top: 2.2 }, { x: 9, z: 7, hx: 3.2, hz: 1.1, top: 2.2 },
  { x: -17, z: 0, hx: 1.2, hz: 4.2, top: 4.4 }, { x: 17, z: 0, hx: 1.2, hz: 4.2, top: 4.4 }
];
function send(client: PlayerClient, message: Record<string, unknown>) {
  if (client.ws.readyState === 1) client.ws.send(JSON.stringify(message));
}
function rayBlocked(ox: number, oz: number, dx: number, dz: number, distance: number, box: Block) {
  let min = 0, max = distance;
  for (const axis of [
    { o: ox, d: dx, lo: box.x - box.hx, hi: box.x + box.hx },
    { o: oz, d: dz, lo: box.z - box.hz, hi: box.z + box.hz }
  ]) {
    if (Math.abs(axis.d) < 0.00001) {
      if (axis.o < axis.lo || axis.o > axis.hi) return false;
      continue;
    }
    let a = (axis.lo - axis.o) / axis.d, b = (axis.hi - axis.o) / axis.d;
    if (a > b) [a, b] = [b, a];
    min = Math.max(min, a); max = Math.min(max, b);
    if (max < min) return false;
  }
  return true;
}

interface State {
  client: PlayerClient;
  team: number;
  x: number; y: number; z: number;
  spawnX: number; spawnZ: number;
  yaw: number; pitch: number;
  forward: number; right: number; sprint: boolean;
  verticalVelocity: number;
  health: number; kills: number; deaths: number; headshots: number; damage: number;
  sequence: number; lastFire: number; lastInput: number;
  ammo: number; reserve: number; reloadUntil: number;
  alive: boolean;
}

export class GameRoom {
  readonly id: string;
  readonly mode: Mode;
  private players: State[];
  private score = [0, 0];
  private startedAt = Date.now();
  private matchId: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private finished = false;
  private round = 1;
  private onFinished: (id: string) => void;

  constructor(id: string, mode: Mode, clients: PlayerClient[], onFinished: (id: string) => void) {
    this.id = id;
    this.mode = mode;
    this.onFinished = onFinished;
    this.players = clients.map((client, index) => {
      const teamSize = mode === 'ffa' ? 1 : Math.max(1, clients.length / 2);
      const team = mode === 'ffa' ? index : Math.floor(index / teamSize);
      const lane = mode === 'ffa' ? index : index % teamSize;
      const angle = (Math.PI * 2 * index) / clients.length;
      const spawnX = mode === 'ffa' ? Math.cos(angle) * 20 : (team === 0 ? -20 : 20);
      const spawnZ = mode === 'ffa' ? Math.sin(angle) * 20 : (team === 0 ? 17 - lane * 3 : -17 + lane * 3);
      const spawnYaw = mode === 'ffa' ? angle + Math.PI : (team === 0 ? 0 : Math.PI);
      return {
        client, team,
        x: spawnX, y: 0.92, z: spawnZ,
        spawnX, spawnZ, yaw: spawnYaw,
        pitch: 0, forward: 0, right: 0, sprint: false,
        verticalVelocity: 0,
        health: 100, kills: 0, deaths: 0, headshots: 0, damage: 0,
        sequence: -1, lastFire: 0, lastInput: Date.now(),
        ammo: 30, reserve: 90, reloadUntil: 0, alive: true
      };
    });
  }

  async start() {
    const { data: match, error } = await admin
      .from('rockey_matches')
      .insert({ mode: this.mode, map_id: 'training_facility', status: 'playing', started_at: new Date().toISOString() })
      .select('id').single();

    if (error || !match) {
      console.error('ROCKEY match record insert failed', error?.message);
    } else {
      this.matchId = match.id;
      const { error: playersError } = await admin.from('rockey_match_players').insert(
        this.players.map(p => ({ match_id: match.id, auth_user_id: p.client.player.id, team_id: p.team }))
      );
      if (playersError) console.error('ROCKEY match player insert failed', playersError.message);
    }

    for (const state of this.players) {
      state.client.roomId = this.id;
      send(state.client, {
        type: 'match.start', mode: this.mode, roomId: this.id,
        playerId: state.client.player.id, playerName: state.client.player.name,
        team: state.team,
        spawn: { x: state.spawnX, y: 0.92, z: state.spawnZ, yaw: state.yaw },
        map: 'training_facility'
      });
      send(state.client, { type: 'ammo.update', ammo: state.ammo, reserve: state.reserve });
    }
    this.broadcast({ type: 'round.update', team0: 0, team1: 0, round: 1 });
    this.timer = setInterval(() => this.tick(), 50);
  }

  handleInput(client: PlayerClient, message: Record<string, unknown>) {
    const p = this.players.find(item => item.client === client);
    if (!p || !p.alive || this.finished) return;
    const sequence = Number(message.sequence);
    if (!Number.isSafeInteger(sequence) || sequence <= p.sequence) return;
    p.sequence = sequence;
    p.forward = Math.max(-1, Math.min(1, Number(message.forward) || 0));
    p.right = Math.max(-1, Math.min(1, Number(message.right) || 0));
    p.sprint = message.sprint === true;
    if (message.jump === true && p.y <= 0.94 && p.verticalVelocity <= 0) {
      p.verticalVelocity = 7.2;
    }
    if (Number.isFinite(Number(message.yaw))) p.yaw = Number(message.yaw);
    if (Number.isFinite(Number(message.pitch))) p.pitch = Math.max(-1.3, Math.min(1.3, Number(message.pitch)));
    p.lastInput = Date.now();
  }

  handleReload(client: PlayerClient) {
    const p = this.players.find(item => item.client === client);
    if (!p || this.finished || p.ammo >= 30 || p.reserve <= 0 || Date.now() < p.reloadUntil) return;
    p.reloadUntil = Date.now() + 1500;
    setTimeout(() => {
      if (this.finished) return;
      const amount = Math.min(30 - p.ammo, p.reserve);
      p.ammo += amount;
      p.reserve -= amount;
      p.reloadUntil = 0;
      send(client, { type: 'ammo.update', ammo: p.ammo, reserve: p.reserve });
    }, 1500);
  }

  handleFire(client: PlayerClient, message: Record<string, unknown>) {
    const shooter = this.players.find(p => p.client === client);
    if (!shooter || !shooter.alive || this.finished || message.weaponCode !== 'R16') return;
    const now = Date.now();
    if (now < shooter.reloadUntil || shooter.ammo <= 0 || now - shooter.lastFire < 100) return;
    shooter.lastFire = now;
    shooter.ammo -= 1;
    send(client, { type: 'ammo.update', ammo: shooter.ammo, reserve: shooter.reserve });

    const cp = Math.cos(shooter.pitch);
    const dx = -Math.sin(shooter.yaw) * cp;
    const dy = Math.sin(shooter.pitch);
    const dz = -Math.cos(shooter.yaw) * cp;
    const ox = shooter.x, oy = shooter.y + 0.55, oz = shooter.z;
    let target: State | null = null;
    let best = 65;
    let headshot = false;

    for (const candidate of this.players) {
      if (candidate === shooter || !candidate.alive) continue;
      if (this.mode !== 'ffa' && candidate.team === shooter.team) continue;
      const tx = candidate.x - ox, ty = candidate.y + 0.65 - oy, tz = candidate.z - oz;
      const along = tx * dx + ty * dy + tz * dz;
      if (along <= 0 || along >= best) continue;
      const px = tx - dx * along, py = ty - dy * along, pz = tz - dz * along;
      if (Math.hypot(px, py, pz) > 0.62) continue;
      if (COVER.some(box => rayBlocked(ox, oz, dx, dz, along, box))) continue;
      best = along;
      target = candidate;
      headshot = Math.abs(oy + dy * along - (candidate.y + 1.45)) < 0.24;
    }

    if (!target) return;
    const damage = headshot ? 45 : 25;
    target.health = Math.max(0, target.health - damage);
    target.damage += damage;
    if (headshot) shooter.headshots += 1;
    send(shooter.client, { type: 'hit', damage, headshot, target: target.client.player.name });
    send(target.client, { type: 'damage', health: target.health, damage, headshot });

    if (target.health <= 0) {
      target.alive = false;
      target.deaths += 1;
      shooter.kills += 1;
      send(target.client, { type: 'eliminated', by: shooter.client.player.name });
      send(shooter.client, { type: 'elimination', target: target.client.player.name, kills: shooter.kills });

      if (this.mode === 'ffa') {
        if (shooter.kills >= 20) void this.finish(shooter.client.player.id);
      } else {
        this.score[shooter.team] += 1;
        this.broadcast({ type: 'round.update', team0: this.score[0], team1: this.score[1], round: this.round });
        if (this.score[shooter.team] >= 5) {
          void this.finish(shooter.client.player.id);
        } else {
          this.round += 1;
          this.players.forEach((p, index) => {
            p.health = 100; p.alive = true;
            p.x = p.spawnX;
            p.y = 0.92; p.z = p.spawnZ;
            p.verticalVelocity = 0;
          });
        }
      }
      if (!this.finished) {
        setTimeout(() => {
          if (this.finished) return;
          target!.health = 100;
          target!.alive = true;
          target!.x = target!.spawnX;
          target!.z = target!.spawnZ;
          target!.y = 0.92;
          target!.verticalVelocity = 0;
        }, 1800);
      }
    }
  }

  private tick() {
    if (this.finished) return;
    const delta = 0.05;
    for (const p of this.players) {
      if (!p.alive) continue;
      if (Date.now() - p.lastInput > 1200) { p.forward = 0; p.right = 0; }
      const speed = p.sprint ? 7 : 5.4;
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
      let dx = (fx * p.forward + rx * p.right) * speed * delta;
      let dz = (fz * p.forward + rz * p.right) * speed * delta;
      const magnitude = Math.hypot(dx, dz);
      if (magnitude > speed * delta) { dx *= speed * delta / magnitude; dz *= speed * delta / magnitude; }
      const nx = Math.max(-27.5, Math.min(27.5, p.x + dx));
      const nz = Math.max(-27.5, Math.min(27.5, p.z + dz));
      p.verticalVelocity -= 18 * delta;
      const nextY = p.y + p.verticalVelocity * delta;
      if (nextY <= 0.92) {
        p.y = 0.92;
        p.verticalVelocity = 0;
      } else {
        p.y = Math.min(8, nextY);
      }
      const blocked = COVER.some(b =>
        p.y - 0.86 < b.top &&
        p.y + 0.86 > 0 &&
        nx + 0.38 > b.x - b.hx &&
        nx - 0.38 < b.x + b.hx &&
        nz + 0.38 > b.z - b.hz &&
        nz - 0.38 < b.z + b.hz
      );
      if (!blocked) { p.x = nx; p.z = nz; }
    }
    this.broadcast({
      type: 'snapshot', serverTime: Date.now(),
      players: this.players.map(p => ({
        id: p.client.player.id, name: p.client.player.name, team: p.team,
        x: p.x, y: p.y, z: p.z, yaw: p.yaw, health: p.health, alive: p.alive
      }))
    });
    if (this.mode === 'ffa' && Date.now() - this.startedAt > 5 * 60 * 1000) {
      const winner = [...this.players].sort((a, b) => b.kills - a.kills)[0];
      void this.finish(winner?.client.player.id || null);
    }
  }

  private broadcast(message: Record<string, unknown>) {
    for (const p of this.players) send(p.client, message);
  }

  abort() {
    if (this.finished) return;
    this.finished = true;
    if (this.timer) clearInterval(this.timer);
    for (const p of this.players) {
      send(p.client, { type: 'match.cancelled', message: '플레이어 연결이 종료되어 경기가 취소되었습니다.' });
      p.client.roomId = undefined;
    }
    if (this.matchId) {
      void admin.from('rockey_matches').update({ status: 'cancelled', ended_at: new Date().toISOString() }).eq('id', this.matchId);
    }
    this.onFinished(this.id);
  }

  private async finish(winnerId: string | null) {
    if (this.finished) return;
    this.finished = true;
    if (this.timer) clearInterval(this.timer);
    const winnerTeam = this.players.find(p => p.client.player.id === winnerId)?.team ?? null;
    const result = {
      winnerId, winnerTeam, mode: this.mode, score: this.score,
      players: this.players.map(p => ({
        userId: p.client.player.id, name: p.client.player.name, team: p.team,
        kills: p.kills, deaths: p.deaths, headshots: p.headshots, damage: p.damage
      }))
    };

    if (this.matchId) {
      const updates = await admin.from('rockey_match_players').upsert(
        this.players.map(p => ({
          match_id: this.matchId,
          auth_user_id: p.client.player.id,
          team_id: p.team,
          kills: p.kills,
          deaths: p.deaths,
          headshots: p.headshots,
          damage: p.damage,
          placement: this.mode === 'ffa'
            ? (p.client.player.id === winnerId ? 1 : null)
            : (p.team === winnerTeam ? 1 : null)
        })),
        { onConflict: 'match_id,auth_user_id' }
      );
      if (updates.error) console.error('ROCKEY match result write failed', updates.error.message);
      await admin.from('rockey_matches').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_team: winnerTeam,
        result
      }).eq('id', this.matchId);
      const processed = await admin.rpc('rockey_process_match_result', { p_match_id: this.matchId });
      if (processed.error) console.error('ROCKEY profile stats update failed', processed.error.message);
    }

    for (const p of this.players) {
      const won = this.mode === 'ffa'
        ? p.client.player.id === winnerId
        : p.team === winnerTeam;
      send(p.client, { type: 'match.result', won, detail: '처치 ' + p.kills + ' · 사망 ' + p.deaths });
      p.client.roomId = undefined;
    }
    this.onFinished(this.id);
  }
}