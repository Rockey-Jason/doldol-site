import './style.css';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, ROCKEY_WS_URL } from './config';
import { GameSocket, type GameMessage } from './network/GameSocket';
import type { GameInstance, RemotePlayer, ReplayFrame } from './core/Game';
import { RockeyHub } from './RockeyHub';

const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const socket=new GameSocket();
const $=(id:string)=>document.getElementById(id);
const menu=$('menu')!;
const hud=$('hud')!;
const statusText=$('menuStatus')!;
const canvas=$('gameCanvas') as HTMLCanvasElement;
let game:GameInstance|null=null;
let gameLoading:Promise<void>|null=null;
let currentMode='practice';
let userId='';
let activeMapId='training_facility';
let primaryWeapon='R16';
let secondaryWeapon='R9';
let activeWeapon='R16';
let isSpectating=false;
let isKillcam=false;
let latestLocalSnapshot:RemotePlayer|null=null;
let reconnectTimer=0;
let reconnectAttempts=0;
let reconnecting=false;
let menuSessionAvailable=false;

function status(message:string){statusText.textContent=message;}
function requestLandscape(){
  if(!window.matchMedia('(pointer:coarse)').matches)return;
  const orientation=screen.orientation as ScreenOrientation & {lock?:(value:'landscape')=>Promise<void>};
  try{void orientation.lock?.('landscape').catch(()=>{});}catch{/* Rotation prompt remains as the fallback. */}
}
function toast(message:string){
  const el=$('toast');
  if(!el)return;
  el.textContent=message;el.classList.add('show');
  window.setTimeout(()=>el.classList.remove('show'),2300);
}
function setConnection(connected:boolean,label:string){
  $('connectionText')!.textContent=label;
  $('connectionDot')!.classList.toggle('online',connected);
  $('connectionDot')!.classList.toggle('offline',!connected);
  $('sessionStatus')!.textContent=connected?'CONNECTED · DEV 03/04':'RECONNECTING';
}
function showMenu(){
  document.body.classList.remove('game-active');
  game?.cancelKillcam();
  isKillcam=false;
  menu.classList.remove('hidden');hud.classList.add('hidden');
  $('resultPanel')!.classList.add('hidden');$('hubPanel')!.classList.add('hidden');
  document.exitPointerLock?.();
  isSpectating=false;
}
function showGame(){
  document.body.classList.add('game-active');
  menu.classList.add('hidden');hud.classList.remove('hidden');
  $('resultPanel')!.classList.add('hidden');
}
function updateHud(hp:number,ammo:number,reserve:number,weapon:string){
  $('healthValue')!.textContent=String(Math.max(0,Math.round(hp)));
  ($('healthBar') as HTMLElement).style.width=Math.max(0,Math.min(100,hp))+'%';
  $('ammoValue')!.textContent=ammo+' / '+reserve;
  $('modeLabel')!.textContent=currentMode.toUpperCase()+' · '+weapon;
}
function send(message:Record<string,unknown>&{type:string}){
  if(!socket.send(message))toast('게임 서버 연결이 끊어졌습니다.');
}
function showResult(won:boolean,detail:string){
  $('resultPanel')!.classList.remove('hidden');hud.classList.add('hidden');
  $('resultTitle')!.textContent=won?'VICTORY':'DEFEAT';
  $('resultDescription')!.textContent=detail;
  document.exitPointerLock?.();
  isSpectating=false;
}
function updateLocalLoadout(){
  const loadout=hub.getLoadout();
  primaryWeapon=loadout.primaryWeapon;
  secondaryWeapon=loadout.secondaryWeapon;
}
function applyQuality(){
  const quality=(localStorage.getItem('rockey.quality')||'balanced') as 'low'|'balanced'|'high';
  game?.setQuality(quality);
  const sensitivity=Number(localStorage.getItem('rockey.sensitivity')||'1');
  game?.setSensitivity(Number.isFinite(sensitivity)?sensitivity:1);
}
async function ensureGame(mapId:string){
  if(game&&activeMapId===mapId)return;
  if(gameLoading)await gameLoading;
  if(game&&activeMapId===mapId)return;
  game?.dispose();
  game=null;
  activeMapId=mapId;
  const loading=(async()=>{
    // Keep the heavy 3D engine and physics code out of the initial menu bundle.
    const {createGame}=await import('./core/Game');
    const next=await createGame(canvas,send,toast,updateHud,mapId);
    if(activeMapId!==mapId){next.dispose();return;}
    game=next;
    applyQuality();
  })();
  gameLoading=loading;
  try{await loading;}finally{if(gameLoading===loading)gameLoading=null;}
}
async function enterMatch(message:Record<string,any>){
  const mapId=String(message.mapId||'training_facility');
  await ensureGame(mapId);
  currentMode=String(message.mode||'1v1');
  isSpectating=false;
  isKillcam=false;
  latestLocalSnapshot=null;
  activeWeapon=String(message.weaponCode||primaryWeapon);
  game?.activate(
    currentMode,
    Number(message.team||0),
    message.spawn as {x:number;y:number;z:number;yaw:number}|undefined,
    activeWeapon,
    String(message.secondaryWeapon||secondaryWeapon)
  );
  if(typeof message.ammo==='number')game?.setAmmo(message.ammo,Number(message.reserve||0));
  $('modeLabel')!.textContent=currentMode.toUpperCase()+' · '+String(message.weaponCode||primaryWeapon);
  showGame();toast('MATCH START · '+String(message.mapName||mapId));
}
async function enterSpectator(message:Record<string,any>){
  const mapId=String(message.mapId||'training_facility');
  await ensureGame(mapId);
  currentMode='spectator';isSpectating=true;isKillcam=false;
  game?.activate('spectator');
  $('modeLabel')!.textContent='SPECTATING · '+String(message.mapName||mapId);
  showGame();toast('SPECTATOR MODE');
}
function scheduleReconnect(){
  if(reconnectTimer||reconnecting)return;
  const delay=Math.min(30000,1200*Math.pow(1.7,reconnectAttempts));
  reconnectAttempts++;
  reconnectTimer=window.setTimeout(async()=>{
    reconnectTimer=0;
    if(reconnecting)return;
    reconnecting=true;
    let retry=false;
    try{
      const {data}=await supabase.auth.getSession();
      if(!data.session){
        status('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }
      await socket.connect(ROCKEY_WS_URL,data.session.access_token);
      reconnectAttempts=0;
      setConnection(true,'SERVER ONLINE');
      status('게임 서버에 다시 연결했습니다.');
      toast('RECONNECTED');
    }catch{
      setConnection(false,'RECONNECTING');
      retry=true;
    }finally{
      reconnecting=false;
      if(retry)scheduleReconnect();
    }
  },delay);
}
function switchWeapon(){
  if(currentMode==='practice'){
    activeWeapon=activeWeapon===primaryWeapon?secondaryWeapon:primaryWeapon;
    game?.setWeapon(activeWeapon);
    toast('WEAPON · '+activeWeapon);
  }else if(isSpectating){
    toast('관전 중에는 무기를 바꿀 수 없습니다.');
  }else send({type:'weapon.switch'});
}

const hub=new RockeyHub(
  $('hubPanel')!,
  send,
  async (frames:ReplayFrame[],mapId:string)=>{
    await ensureGame(mapId);
    currentMode='replay';isSpectating=true;
    game?.activate('replay');
    game?.playReplay(frames);
    $('modeLabel')!.textContent='MATCH REPLAY';
    showGame();
  },
  level=>game?.setQuality(level),
  value=>game?.setSensitivity(value)
);

async function initialize(){
  try{
    const {data,error}=await supabase.auth.getSession();
    if(error||!data.session){
      status('돌이사이트에 먼저 로그인해 주세요.');
      $('welcomeText')!.textContent='로그인 후 ROCKEY를 이용할 수 있습니다.';
      return;
    }
    menuSessionAvailable=true;
    userId=data.session.user.id;
    const display=data.session.user.user_metadata?.name||data.session.user.email||'PLAYER';
    $('welcomeText')!.textContent='WELCOME, '+String(display);
    try{
      await socket.connect(ROCKEY_WS_URL,data.session.access_token);
      setConnection(true,'SERVER ONLINE');
      status('서버 연결 완료. 전투 모드를 선택하세요.');
    }catch{
      setConnection(false,'SERVER OFFLINE');
      status('게임 서버 연결을 기다리는 중입니다. 훈련장은 이용할 수 있습니다.');
      scheduleReconnect();
    }
    // 3D/physics modules are loaded only after the player enters a match or training.
    hub.refresh();
  }catch(error){
    console.error('ROCKEY initialization failed',error);
    status('게임 초기화에 실패했습니다. 새로고침해 주세요.');
  }
}

$('hubOpenBtn')?.addEventListener('click',()=>{
  if(!menuSessionAvailable)return status('돌이사이트 로그인 후 이용할 수 있습니다.');
  hub.open('friends');
});
$('practiceBtn')?.addEventListener('click',async()=>{
  requestLandscape();
  try{
    updateLocalLoadout();
    const loadout=hub.getLoadout();
    await ensureGame(loadout.mapId||'training_facility');
    currentMode='practice';isSpectating=false;
    activeWeapon=loadout.primaryWeapon;
    game?.activate('practice',0,undefined,loadout.primaryWeapon,loadout.secondaryWeapon);
    showGame();toast('TRAINING FACILITY');
  }catch(error){console.error(error);status('훈련장 로딩에 실패했습니다.');}
});
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>{
  button.addEventListener('click',()=>{
    requestLandscape();
    const mode=button.dataset.mode||'1v1';
    if(!socket.connected)return status('실시간 대전에는 게임 서버 연결이 필요합니다.');
    updateLocalLoadout();
    const loadout=hub.getLoadout();
    currentMode=mode;
    send({type:'queue.join',mode,mapId:loadout.mapId});
    status('상대를 찾고 있습니다: '+mode.toUpperCase()+' · '+loadout.mapId.toUpperCase());
  });
});
$('createPrivateBtn')?.addEventListener('click',()=>{
  requestLandscape();
  if(!socket.connected)return status('게임 서버 연결이 필요합니다.');
  updateLocalLoadout();
  send({type:'private.create',mode:($('privateMode') as HTMLSelectElement).value,mapId:hub.getLoadout().mapId});
  status('비공개 방을 만들고 있습니다.');
});
$('joinPrivateBtn')?.addEventListener('click',()=>{
  requestLandscape();
  const code=($('privateCode') as HTMLInputElement).value.trim().toUpperCase();
  if(!code)return status('초대 코드를 입력해 주세요.');
  send({type:'private.join',code});
});
$('startPrivateBtn')?.addEventListener('click',()=>{requestLandscape();send({type:'private.start'});});
$('copyCodeBtn')?.addEventListener('click',async()=>{
  const code=$('privateCodeText')?.textContent||'';
  try{await navigator.clipboard.writeText(code);toast('초대 코드를 복사했습니다.');}
  catch{toast('초대 코드: '+code);}
});
$('cameraBtn')?.addEventListener('click',()=>game?.toggleCamera());
$('weaponSwitchBtn')?.addEventListener('click',switchWeapon);
$('mobileSwitch')?.addEventListener('pointerdown',event=>{event.preventDefault();switchWeapon();});
$('exitBtn')?.addEventListener('click',()=>{
  if(isSpectating)send({type:'spectator.leave'});
  else send({type:'match.leave'});
  showMenu();
});
$('returnMenuBtn')?.addEventListener('click',showMenu);

socket.onMessage((message:GameMessage)=>{
  hub.onMessage(message);
  switch(message.type){
    case 'auth.ok':
      setConnection(true,'SERVER ONLINE');
      break;
    case 'session.ready':
      hub.refresh();
      break;
    case 'match.start':
    case 'match.resume':
      void enterMatch(message);
      break;
    case 'match.spectating':
      void enterSpectator(message);
      break;
    case 'snapshot':{
      const players=(message.players||[]) as RemotePlayer[];
      const local=players.find(p=>p.id===userId);
      if(local)latestLocalSnapshot=local;
      if(isKillcam)break;
      if(!isSpectating){
        if(local)game?.reconcileLocalPlayer(local);
        game?.setRemotePlayers(players.filter(p=>p.id!==userId));
      }else{
        game?.setRemotePlayers(players);
      }
      break;
    }
    case 'round.update':
      game?.setScore(Number(message.team0||0),Number(message.team1||0),Number(message.round||1));
      break;
    case 'damage':
      game?.setHealth(Number(message.health));
      break;
    case 'ammo.update':
      game?.setAmmo(Number(message.ammo),Number(message.reserve));
      break;
    case 'weapon.update':
      activeWeapon=String(message.weaponCode||activeWeapon);
      game?.setWeapon(activeWeapon,Number(message.ammo),Number(message.reserve));
      toast('WEAPON · '+activeWeapon);
      break;
    case 'weapon.recoil':
      game?.applyRecoil(Number(message.pitch),Number(message.yaw));
      break;
    case 'hit':{
      toast(message.headshot?'HEADSHOT':'HIT');
      const crosshair=document.querySelector('.crosshair');
      crosshair?.classList.remove('hit','headshot');
      crosshair?.classList.add(message.headshot?'headshot':'hit');
      window.setTimeout(()=>crosshair?.classList.remove('hit','headshot'),180);
      break;
    }
    case 'elimination':
      toast('ELIMINATION');
      break;
    case 'eliminated':{
      const killerName=String(message.by||'상대 플레이어');
      toast('ELIMINATED BY '+killerName);
      const frames=(message.killcamFrames||[]) as ReplayFrame[];
      if(game&&frames.length>1){
        isKillcam=true;
        const banner=$('killcamBanner');
        if(banner){banner.textContent='KILLCAM · ELIMINATED BY '+killerName;banner.classList.remove('hidden');}
        game.playKillcam(frames,String(message.killerId||''),()=>{
          isKillcam=false;
          banner?.classList.add('hidden');
          if(latestLocalSnapshot)game?.reconcileLocalPlayer(latestLocalSnapshot);
        });
      }
      break;
    }
    case 'private.created':
      $('privateCodePanel')!.classList.remove('hidden');
      $('privateCodeText')!.textContent=String(message.code||'');
      status('비공개 방 생성 완료. 친구 허브에서 온라인 친구를 초대할 수 있습니다.');
      break;
    case 'private.joined':
      status('방에 참가했습니다. 방장이 경기를 시작할 때까지 기다려 주세요.');
      break;
    case 'private.member':
      toast(String(message.name||'플레이어')+' 참가');
      break;
    case 'friend.invite':
      hub.open('friends');
      break;
    case 'player.disconnected':
      toast(String(message.name||'플레이어')+' 연결 끊김 · 재접속 대기');
      break;
    case 'player.reconnected':
      toast(String(message.name||'플레이어')+' 재접속');
      break;
    case 'player.expired':
      toast('PLAYER DISCONNECTED');
      break;
    case 'match.result':
      showResult(Boolean(message.won),String(message.detail||'경기가 종료되었습니다.'));
      if(message.replayAvailable)toast('리플레이가 저장되었습니다.');
      hub.refresh();
      break;
    case 'match.cancelled':
      status(String(message.message||'경기가 취소되었습니다.'));
      showMenu();
      break;
    case 'spectator.left':
      isSpectating=false;
      showMenu();
      break;
    case 'spectate.error':
      toast(String(message.message||'관전할 수 없습니다.'));
      break;
    case 'network.closed':
      setConnection(false,'RECONNECTING');
      status('연결이 끊어졌습니다. 자동으로 재접속합니다.');
      scheduleReconnect();
      break;
    case 'queue.joined':
      status('매칭 대기열 등록 완료 · '+String(message.size)+'/'+String(message.required));
      break;
    case 'queue.left':
      status('매칭 대기열에서 나왔습니다.');
      break;
    case 'error':
    case 'private.error':
      status(String(message.message||'요청을 처리하지 못했습니다.'));
      break;
  }
});

document.addEventListener('keydown',event=>{
  if(event.code==='Escape'&&!$('resultPanel')!.classList.contains('hidden'))showMenu();
  if(event.code==='Escape'&&!$('hubPanel')!.classList.contains('hidden'))hub.close();
});

void initialize();
