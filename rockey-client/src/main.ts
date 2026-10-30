import './style.css';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, ROCKEY_WS_URL } from './config';
import { GameSocket, type GameMessage } from './network/GameSocket';
import { createGame, type GameInstance, type RemotePlayer } from './core/Game';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const socket = new GameSocket();
const $ = (id: string) => document.getElementById(id);
const menu = $('menu')!;
const hud = $('hud')!;
const statusText = $('menuStatus')!;
const canvas = $('gameCanvas') as HTMLCanvasElement;
let game: GameInstance | null = null;
let currentMode = 'practice';
let userId = '';

function status(message: string) { statusText.textContent = message; }
function toast(message: string) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  window.setTimeout(() => el.classList.remove('show'), 2200);
}
function setConnection(connected: boolean, label: string) {
  $('connectionText')!.textContent = label;
  $('connectionDot')!.classList.toggle('online', connected);
  $('connectionDot')!.classList.toggle('offline', !connected);
}
function showMenu() {
  menu.classList.remove('hidden');
  hud.classList.add('hidden');
  $('resultPanel')!.classList.add('hidden');
  document.exitPointerLock?.();
}
function showGame() {
  menu.classList.add('hidden');
  hud.classList.remove('hidden');
  $('resultPanel')!.classList.add('hidden');
}
function updateHud(hp: number, ammo: number, reserve: number, weapon: string) {
  $('healthValue')!.textContent = String(Math.round(hp));
  ($('healthBar') as HTMLElement).style.width = hp + '%';
  $('ammoValue')!.textContent = ammo + ' / ' + reserve;
  $('modeLabel')!.textContent = currentMode.toUpperCase() + ' · ' + weapon;
}
function send(message: Record<string, unknown> & { type: string }) {
  if (!socket.send(message)) toast('게임 서버 연결이 끊어졌습니다.');
}
function showResult(won: boolean, detail: string) {
  $('resultPanel')!.classList.remove('hidden');
  hud.classList.add('hidden');
  $('resultTitle')!.textContent = won ? 'VICTORY' : 'DEFEAT';
  $('resultDescription')!.textContent = detail;
  document.exitPointerLock?.();
}

async function initialize() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      status('돌이사이트에 먼저 로그인해 주세요.');
      $('welcomeText')!.textContent = '로그인 후 ROCKEY를 이용할 수 있습니다.';
      return;
    }

    userId = data.session.user.id;
    const display = data.session.user.user_metadata?.name || data.session.user.email || 'PLAYER';
    $('welcomeText')!.textContent = 'WELCOME, ' + String(display);

    try {
      await socket.connect(ROCKEY_WS_URL, data.session.access_token);
      setConnection(true, 'SERVER ONLINE');
      status('서버 연결 완료. 전투 모드를 선택하세요.');
    } catch {
      setConnection(false, 'SERVER OFFLINE');
      status('게임 서버 연결 전입니다. 훈련장은 이용할 수 있습니다.');
    }

    game = await createGame(canvas, send, toast, updateHud);
  } catch (error) {
    console.error('ROCKEY initialization failed', error);
    status('게임 초기화에 실패했습니다. 새로고침해 주세요.');
  }
}

$('practiceBtn')?.addEventListener('click', () => {
  if (!game) return;
  currentMode = 'practice';
  game.activate('practice');
  showGame();
  toast('TRAINING FACILITY');
});

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode || '1v1';
    if (!socket.connected) return status('실시간 대전에는 게임 서버 연결이 필요합니다.');
    currentMode = mode;
    send({ type: 'queue.join', mode });
    status('상대를 찾고 있습니다: ' + mode.toUpperCase());
  });
});

$('createPrivateBtn')?.addEventListener('click', () => {
  if (!socket.connected) return status('게임 서버 연결이 필요합니다.');
  const mode = ($('privateMode') as HTMLSelectElement).value;
  send({ type: 'private.create', mode });
  status('비공개 방을 만들고 있습니다.');
});
$('joinPrivateBtn')?.addEventListener('click', () => {
  const code = ($('privateCode') as HTMLInputElement).value.trim().toUpperCase();
  if (!code) return status('초대 코드를 입력해 주세요.');
  send({ type: 'private.join', code });
});
$('startPrivateBtn')?.addEventListener('click', () => send({ type: 'private.start' }));
$('copyCodeBtn')?.addEventListener('click', async () => {
  const code = $('privateCodeText')?.textContent || '';
  try { await navigator.clipboard.writeText(code); toast('초대 코드를 복사했습니다.'); }
  catch { toast('초대 코드: ' + code); }
});
$('cameraBtn')?.addEventListener('click', () => game?.toggleCamera());
$('exitBtn')?.addEventListener('click', () => { send({ type: 'match.leave' }); showMenu(); });
$('returnMenuBtn')?.addEventListener('click', showMenu);

socket.onMessage((message: GameMessage) => {
  switch (message.type) {
    case 'match.start':
      currentMode = String(message.mode || '1v1');
      game?.activate(currentMode, Number(message.team || 0));
      $('modeLabel')!.textContent = currentMode.toUpperCase() + ' · R-16';
      showGame();
      toast('MATCH START');
      break;
    case 'snapshot': {
      const players = (message.players || []) as RemotePlayer[];
      game?.setRemotePlayers(players.filter(player => player.id !== userId));
      break;
    }
    case 'round.update':
      game?.setScore(Number(message.team0 || 0), Number(message.team1 || 0), Number(message.round || 1));
      break;
    case 'damage':
      game?.setHealth(Number(message.health));
      break;
    case 'hit':
      toast(message.headshot ? 'HEADSHOT' : 'HIT');
      break;
    case 'elimination':
      toast('ELIMINATION');
      break;
    case 'eliminated':
      toast('ELIMINATED');
      break;
    case 'private.created':
      $('privateCodePanel')!.classList.remove('hidden');
      $('privateCodeText')!.textContent = String(message.code || '');
      status('비공개 방 생성 완료. 친구에게 코드를 공유하세요.');
      break;
    case 'private.joined':
      status('방에 참가했습니다. 방장이 경기를 시작할 때까지 기다려 주세요.');
      break;
    case 'private.member':
      toast(String(message.name || '플레이어') + ' 참가');
      break;
    case 'private.error':
    case 'error':
      status(String(message.message || '요청을 처리하지 못했습니다.'));
      break;
    case 'match.result':
      showResult(Boolean(message.won), String(message.detail || '경기가 종료되었습니다.'));
      break;
    case 'network.closed':
      setConnection(false, 'SERVER OFFLINE');
      status('게임 서버 연결이 종료되었습니다.');
      break;
    case 'queue.joined':
      status('매칭 대기열에 등록되었습니다.');
      break;
    case 'queue.left':
      status('매칭 대기열에서 나왔습니다.');
      break;
  }
});

void initialize();