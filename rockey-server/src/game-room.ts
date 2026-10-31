import type { WebSocket } from 'ws';
import { admin, type VerifiedPlayer } from './auth.js';
import { ITEMS, MAPS, WEAPONS, type RockeyItemCode, type RockeyWeapon } from './catalog.js';
import { canFireWeapon, calculateWeaponDamage, calculateWeaponRecoil, traceWeaponShot } from './combat.js';

export type Mode = '1v1' | '2v2' | '3v3' | 'ranked' | 'ffa';
export type PlayerClient = {
  ws: WebSocket;
  player: VerifiedPlayer;
  roomId?: string;
  spectatorRoomId?: string;
  primaryWeapon: string;
  secondaryWeapon: string;
  selectedPrimaryWeapon?: string;
  selectedSecondaryWeapon?: string;
  selectedItemCode?: RockeyItemCode;
  selectedMapId?: string;
};

type PlayerSnapshot = {
  id: string; name: string; team: number;
  x: number; y: number; z: number; yaw: number;
  health: number; alive: boolean; connected: boolean; aim:boolean;
};

type ReplayFrame = { t: number; players: PlayerSnapshot[] };

interface PlayerState {
  client: PlayerClient;
  team: number;
  x: number; y: number; z: number;
  spawnX: number; spawnZ: number; spawnYaw: number;
  yaw: number; pitch: number;
  forward: number; right: number; sprint: boolean; aim: boolean;
  verticalVelocity: number;
  health: number; kills: number; deaths: number; headshots: number; damage: number;
  sequence: number; lastFire: number; lastInput: number;
  weaponCode: string; secondaryWeapon: string;
  itemCode:RockeyItemCode;itemCount:number;itemInventory:Record<RockeyItemCode,number>;lastItemUse:number;energyUntil:number;
  ammo: number; reserve: number; reloadUntil: number; reloadToken:number; reloadTimer:NodeJS.Timeout|null;
  weaponAmmo: Record<string,{ammo:number;reserve:number}>;
  alive: boolean; connected: boolean; disconnectedAt: number | null;
  suspiciousInputs: number; weaponKills: Record<string, number>;
}

function send(client: PlayerClient, message: Record<string, unknown>) {
  if (client.ws.readyState === 1) client.ws.send(JSON.stringify(message));
}
function angleDistance(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}
export class GameRoom {
  readonly id: string;
  readonly mode: Mode;
  readonly mapId: string;
  private persistedMatchId: string | null = null;
  private players: PlayerState[];
  private smokeVolumes:Array<{x:number;y:number;z:number;radius:number;expiresAt:number}>=[];
  private worldDestruction:Array<{id:string;x:number;y:number;z:number;radius:number}>=[];
  private nextDestructionId=1;
  private spectators = new Set<PlayerClient>();
  private score = [0,0];
  private startedAt = Date.now();
  private seasonId: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private finished = false;
  private round = 1;
  private lastReplayFrameAt = 0;
  private replayFrames: ReplayFrame[] = [];
  private onFinished: (id: string) => void;
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  private replaySaved = false;

  constructor(id: string, mode: Mode, members: PlayerClient[], mapId: string, onFinished: (id: string) => void) {
    this.id = id;
    this.mode = mode;
    this.mapId = MAPS[mapId] ? mapId : 'training_facility';
    this.onFinished = onFinished;

    const teamSize = mode === 'ffa' ? 1 : Math.max(1,members.length/2);
    this.players = members.map((client,index) => {
      const team = mode === 'ffa' ? index : Math.floor(index/teamSize);
      const lane = mode === 'ffa' ? index : index%teamSize;
      const angle = (Math.PI*2*index)/members.length;
      const spawnX = mode === 'ffa' ? Math.cos(angle)*21 : team === 0 ? -21 : 21;
      const spawnZ = mode === 'ffa' ? Math.sin(angle)*21 : team === 0 ? 13-lane*4 : -13+lane*4;
      const spawnYaw = mode === 'ffa' ? angle+Math.PI : team === 0 ? 0 : Math.PI;
      const chosenPrimary=client.selectedPrimaryWeapon||client.primaryWeapon,chosenSecondary=client.selectedSecondaryWeapon||client.secondaryWeapon;
      const weaponCode=WEAPONS[chosenPrimary]?chosenPrimary:'R16',weapon=WEAPONS[weaponCode];
      const secondaryWeapon=WEAPONS[chosenSecondary]?chosenSecondary:'R9';
      const itemCode=(client.selectedItemCode&&ITEMS[client.selectedItemCode]?client.selectedItemCode:'GRENADE') as RockeyItemCode;
      const itemInventory=Object.fromEntries(Object.values(ITEMS).map(item=>[item.code,item.startingCount])) as Record<RockeyItemCode,number>;
      const secondaryDefinition = WEAPONS[secondaryWeapon];
      return {
        client,team,x:spawnX,y:0.92,z:spawnZ,spawnX,spawnZ,spawnYaw,
        yaw:spawnYaw,pitch:0,forward:0,right:0,sprint:false,aim:false,verticalVelocity:0,
        health:100,kills:0,deaths:0,headshots:0,damage:0,
        sequence:-1,lastFire:0,lastInput:Date.now(),
        weaponCode,secondaryWeapon,ammo:weapon.magazine,reserve:weapon.reserve,
        itemCode,itemCount:itemInventory[itemCode],itemInventory,lastItemUse:0,energyUntil:0,
        weaponAmmo:{
          [weaponCode]:{ammo:weapon.magazine,reserve:weapon.reserve},
          [secondaryWeapon]:{ammo:secondaryDefinition.magazine,reserve:secondaryDefinition.reserve}
        },
        reloadUntil:0,reloadToken:0,reloadTimer:null,alive:true,connected:true,disconnectedAt:null,
        suspiciousInputs:0,weaponKills:{}
      };
    });
  }

  private floorHeightAt(x:number,z:number,currentY:number):number {
    for(const centerX of [-17.2,17.2]){
      const localX=x-centerX,localZ=z+1.5;
      const absX=Math.abs(localX),absZ=Math.abs(localZ);
      // Rooftop access stair and upper roof deck.
      if(currentY>4.05&&absX<.72&&localZ>=-.35&&localZ<=2.85){
        return 4.38+((2.75-localZ)/3.01)*1.33;
      }
      if(currentY>5.85&&absX<4.0&&absZ<4.45)return 5.99;
      // Second-floor stairs and upper gallery.
      if(currentY>.78&&currentY<5.2&&localX>=2.45&&localX<=3.65&&localZ>=-2.55&&localZ<=2.4){
        return Math.max(0,Math.min(3.9,((2.35-localZ)/4.85)*3.9));
      }
      if(currentY>3.95&&absX<4.42&&localZ>=-2.65&&localZ<=4.85)return 4.19;
      // Basement stairwell is a descending run through the ground-floor opening.
      if(currentY>-2.3&&currentY<1.8&&absX<.78&&localZ>=-2.3&&localZ<=2.3){
        return -((2.25-localZ)/4.5)*2.45;
      }
      // The basement floor occupies the footprint below the first-floor slab.
      if(currentY<-.35&&absX<4.05&&absZ<4.3)return -2.64;
      // Ground-floor interior excluding the stairwell opening.
      if(absX<4.35&&absZ<4.75)return 0;
    }
    // Upper bridge is a continuous walkable plane between the two second floors.
    if(currentY>3.95&&x>=-12.8&&x<=12.8&&z>=-2.75&&z<=-.25)return 4.19;
    // The underpass joins both basements beneath the centre lane.
    if(currentY<-.35&&x>=-12.8&&x<=12.8&&z>=-2.88&&z<=-.12)return -2.64;
    return 0;
  }

  private get weaponForActivePlayer() {
    return WEAPONS;
  }

  async start() {
    const { data: season } = await admin.from('rockey_seasons')
      .select('id').eq('is_active',true).lte('starts_at',new Date().toISOString())
      .gte('ends_at',new Date().toISOString()).maybeSingle();
    this.seasonId = season?.id || null;

    const { data: match, error } = await admin.from('rockey_matches').insert({
      mode:this.mode,map_id:this.mapId,season_id:this.seasonId,
      status:'playing',started_at:new Date().toISOString(),server_region:'singapore'
    }).select('id').single();

    if (error || !match) {
      console.error('ROCKEY match record insert failed',error?.message);
    } else {
      this.persistedMatchId = match.id;
      const { error: playersError } = await admin.from('rockey_match_players').insert(
        this.players.map(p=>({
          match_id:match.id,auth_user_id:p.client.player.id,team_id:p.team,
          weapon_code:p.weaponCode
        }))
      );
      if (playersError) console.error('ROCKEY match players insert failed',playersError.message);
    }

    for (const p of this.players) {
      p.client.roomId=this.id;
      const weapon=WEAPONS[p.weaponCode];
      send(p.client,{
        type:'match.start',mode:this.mode,roomId:this.id,matchId:this.persistedMatchId,
        playerId:p.client.player.id,playerName:p.client.player.name,team:p.team,
        spawn:{x:p.spawnX,y:0.92,z:p.spawnZ,yaw:p.spawnYaw},
        mapId:this.mapId,mapName:MAPS[this.mapId].name,
        weaponCode:p.weaponCode,secondaryWeapon:p.secondaryWeapon,itemCode:p.itemCode,itemCount:p.itemCount,itemInventory:p.itemInventory,
        ammo:p.ammo,reserve:p.reserve,weapon
      });
    }
    this.broadcast({type:'round.update',team0:0,team1:0,round:1});
    this.timer=setInterval(()=>this.tick(),50);
  }

  getInfo() {
    return {
      roomId:this.id,matchId:this.persistedMatchId,mode:this.mode,mapId:this.mapId,
      mapName:MAPS[this.mapId].name,
      players:this.players.filter(p=>p.connected).length,
      maxPlayers:this.players.length,
      spectators:this.spectators.size,
      startedAt:this.startedAt
    };
  }

  private snapshots(): PlayerSnapshot[] {
    return this.players.map(p=>({
      id:p.client.player.id,name:p.client.player.name,team:p.team,
      x:p.x,y:p.y,z:p.z,yaw:p.yaw,health:p.health,alive:p.alive,connected:p.connected,aim:p.aim
    }));
  }

  private broadcast(message: Record<string,unknown>) {
    for(const p of this.players) if(p.connected) send(p.client,message);
    for(const spectator of this.spectators) send(spectator,message);
  }

  private flagSuspicious(p:PlayerState,reason:string) {
    p.suspiciousInputs++;
    if(p.suspiciousInputs===5 && p.connected) {
      send(p.client,{type:'anti-cheat.warning',message:'비정상 입력이 감지되었습니다. 정상적인 조작을 유지해 주세요.'});
    }
    if(p.suspiciousInputs>=15 && p.connected) {
      send(p.client,{type:'anti-cheat.removed',reason});
      p.client.ws.close(4003,'Anti-cheat violation');
      this.disconnect(p.client);
    }
  }

  addSpectator(client: PlayerClient) {
    if(this.finished) return send(client,{type:'spectate.error',message:'이미 종료된 경기입니다.'});
    if(this.players.some(p=>p.client.player.id===client.player.id)) {
      return send(client,{type:'spectate.error',message:'경기 참가자는 관전할 수 없습니다.'});
    }
    this.spectators.add(client);
    client.spectatorRoomId=this.id;
    send(client,{
      type:'match.spectating',roomId:this.id,matchId:this.persistedMatchId,
      mode:this.mode,mapId:this.mapId,mapName:MAPS[this.mapId].name
    });
    send(client,{type:'snapshot',serverTime:Date.now(),players:this.snapshots()});
    send(client,{type:'world.state',destruction:this.worldDestruction});
    send(client,{type:'round.update',team0:this.score[0],team1:this.score[1],round:this.round});
  }

  removeSpectator(client: PlayerClient) {
    this.spectators.delete(client);
    if(client.spectatorRoomId===this.id) client.spectatorRoomId=undefined;
    send(client,{type:'spectator.left'});
  }

  reconnect(client: PlayerClient): boolean {
    if(this.finished) return false;
    const p=this.players.find(item=>item.client.player.id===client.player.id);
    if(!p || p.connected || !p.disconnectedAt || Date.now()-p.disconnectedAt>30000) return false;
    const timer=this.disconnectTimers.get(client.player.id);
    if(timer) clearTimeout(timer);
    this.disconnectTimers.delete(client.player.id);
    p.client=client;
    p.connected=true;
    p.disconnectedAt=null;
    client.roomId=this.id;
    const weapon=WEAPONS[p.weaponCode];
    send(client,{
      type:'match.resume',mode:this.mode,roomId:this.id,matchId:this.persistedMatchId,
      playerId:client.player.id,team:p.team,
      spawn:{x:p.x,y:p.y,z:p.z,yaw:p.yaw},
      mapId:this.mapId,mapName:MAPS[this.mapId].name,
      weaponCode:p.weaponCode,secondaryWeapon:p.secondaryWeapon,itemCode:p.itemCode,itemCount:p.itemCount,itemInventory:p.itemInventory,
      ammo:p.ammo,reserve:p.reserve,health:p.health,weapon,
      worldDestruction:this.worldDestruction,score:this.score,round:this.round
    });
    this.broadcast({type:'player.reconnected',playerId:client.player.id,name:client.player.name});
    send(client,{type:'snapshot',serverTime:Date.now(),players:this.snapshots()});
    return true;
  }

  disconnect(client: PlayerClient) {
    const p=this.players.find(item=>item.client.player.id===client.player.id);
    if(!p || !p.connected) return;
    p.connected=false;
    p.disconnectedAt=Date.now();
    p.forward=0;p.right=0;p.sprint=false;p.aim=false;
    this.broadcast({type:'player.disconnected',playerId:client.player.id,name:client.player.name,graceMs:30000});
    const timer=setTimeout(()=>{
      this.disconnectTimers.delete(client.player.id);
      if(this.finished || p.connected) return;
      p.alive=false;
      p.deaths+=1;
      this.broadcast({type:'player.expired',playerId:client.player.id});
      if(this.players.every(item=>!item.connected)) this.abort();
    },30000);
    this.disconnectTimers.set(client.player.id,timer);
  }

  handleInput(client:PlayerClient,message:Record<string,unknown>) {
    const p=this.players.find(item=>item.client===client);
    if(!p || !p.alive || !p.connected || this.finished) return;
    const sequence=Number(message.sequence);
    if(!Number.isSafeInteger(sequence) || sequence<=p.sequence) {
      this.flagSuspicious(p,'입력 순서가 비정상적입니다.');
      return;
    }
    p.sequence=sequence;
    const rawForward=Number(message.forward)||0;
    const rawRight=Number(message.right)||0;
    if(Math.abs(rawForward)>1.05 || Math.abs(rawRight)>1.05) this.flagSuspicious(p,'이동 입력 범위를 초과했습니다.');
    p.forward=Math.max(-1,Math.min(1,rawForward));
    p.right=Math.max(-1,Math.min(1,rawRight));
    p.sprint=message.sprint===true;
    p.aim=message.aim===true;
    if(message.jump===true && p.y<=0.94 && p.verticalVelocity<=0) p.verticalVelocity=7.2;
    if(Number.isFinite(Number(message.yaw))) {
      const proposed=Number(message.yaw);
      const turn=angleDistance(proposed,p.yaw);
      if(turn>1.6){
        this.flagSuspicious(p,'비정상적인 시점 회전이 감지되었습니다.');
        const direction=Math.sign(((proposed-p.yaw+Math.PI*3)%(Math.PI*2))-Math.PI);
        p.yaw+=direction*1.6;
      }else p.yaw=proposed;
    }
    if(Number.isFinite(Number(message.pitch))) {
      const proposed=Number(message.pitch);
      if(Math.abs(proposed)>1.36) p.suspiciousInputs++;
      p.pitch=Math.max(-1.3,Math.min(1.3,proposed));
    }
    p.lastInput=Date.now();
  }

  handleReload(client:PlayerClient) {
    const p=this.players.find(item=>item.client===client);
    if(!p || this.finished || WEAPONS[p.weaponCode].category==='MELEE' || p.ammo>=WEAPONS[p.weaponCode].magazine ||
      p.reserve<=0 || Date.now()<p.reloadUntil) return;
    const weapon=WEAPONS[p.weaponCode];
    p.reloadUntil=Date.now()+weapon.reloadMs;
    const token=++p.reloadToken;
    if(p.reloadTimer)clearTimeout(p.reloadTimer);
    p.reloadTimer=setTimeout(()=>{
      if(this.finished||p.reloadToken!==token||p.weaponCode!==weapon.code)return;
      const amount=Math.min(weapon.magazine-p.ammo,p.reserve);
      p.ammo+=amount;p.reserve-=amount;p.reloadUntil=0;p.reloadTimer=null;
      p.weaponAmmo[p.weaponCode]={ammo:p.ammo,reserve:p.reserve};
      if(p.connected)send(p.client,{type:'ammo.update',ammo:p.ammo,reserve:p.reserve,weaponCode:p.weaponCode});
    },weapon.reloadMs);
  }

  handleSwitchWeapon(client:PlayerClient) {
    const p=this.players.find(item=>item.client===client);
    if(!p || this.finished) return;
    // Weapon switching is a valid reload-cancel action. Incomplete reloads
    // do not transfer ammunition; the old magazine remains unchanged.
    if(p.reloadTimer){clearTimeout(p.reloadTimer);p.reloadTimer=null;}
    p.reloadToken++;p.reloadUntil=0;
    p.weaponAmmo[p.weaponCode]={ammo:p.ammo,reserve:p.reserve};
    const primary=p.client.selectedPrimaryWeapon||p.client.primaryWeapon;
    const next=p.weaponCode===primary?p.secondaryWeapon:primary;
    if(!WEAPONS[next]) return;
    p.weaponCode=next;
    const weapon=WEAPONS[next];
    const stored=p.weaponAmmo[next]||{ammo:weapon.magazine,reserve:weapon.reserve};
    p.ammo=stored.ammo;
    p.reserve=stored.reserve;
    p.lastFire=0;
    send(p.client,{type:'weapon.update',weaponCode:next,weapon,ammo:p.ammo,reserve:p.reserve});
  }

  private eliminatePlayer(shooter:PlayerState,target:PlayerState,weaponCode:string,now:number){
    if(!target.alive||target.health>0)return;target.alive=false;target.deaths++;shooter.kills++;shooter.weaponKills[weaponCode]=(shooter.weaponKills[weaponCode]||0)+1;
    const clipStart=now-this.startedAt-3500,killcamFrames=this.replayFrames.filter(frame=>frame.t>=clipStart);killcamFrames.push({t:now-this.startedAt,players:this.snapshots()});
    send(target.client,{type:'eliminated',by:shooter.client.player.name,killerId:shooter.client.player.id,killcamFrames});
    send(shooter.client,{type:'elimination',target:target.client.player.name,kills:shooter.kills});
    if(this.mode==='ffa'){if(shooter.kills>=20)void this.finish(shooter.client.player.id);}
    else{
      this.score[shooter.team]++;this.broadcast({type:'round.update',team0:this.score[0],team1:this.score[1],round:this.round});
      if(this.score[shooter.team]>=5)void this.finish(shooter.client.player.id);
      else{this.round++;this.players.forEach(p=>{
        p.health=100;p.alive=true;p.x=p.spawnX;p.y=.92;p.z=p.spawnZ;p.verticalVelocity=0;
        p.weaponAmmo[p.weaponCode]={ammo:WEAPONS[p.weaponCode].magazine,reserve:WEAPONS[p.weaponCode].reserve};
        p.weaponAmmo[p.secondaryWeapon]={ammo:WEAPONS[p.secondaryWeapon].magazine,reserve:WEAPONS[p.secondaryWeapon].reserve};
        p.ammo=p.weaponAmmo[p.weaponCode].ammo;p.reserve=p.weaponAmmo[p.weaponCode].reserve;
        p.itemInventory=Object.fromEntries(Object.values(ITEMS).map(item=>[item.code,item.startingCount])) as Record<RockeyItemCode,number>;
        p.itemCount=p.itemInventory[p.itemCode];p.energyUntil=0;
        if(p.connected){send(p.client,{type:'ammo.update',ammo:p.ammo,reserve:p.reserve,weaponCode:p.weaponCode});send(p.client,{type:'item.update',itemCode:p.itemCode,count:p.itemCount,inventory:p.itemInventory,health:p.health});}
      });}
    }
    if(!this.finished){setTimeout(()=>{if(this.finished||target.connected)return;target.alive=false;},0);setTimeout(()=>{if(this.finished||!target.connected)return;target.health=100;target.alive=true;target.x=target.spawnX;target.z=target.spawnZ;target.y=.92;target.verticalVelocity=0;},1800);}
    else setTimeout(()=>{if(!this.finished)return;target.health=100;target.alive=true;},1800);
  }
  private applyDamage(shooter:PlayerState,target:PlayerState,damage:number,weaponCode:string,headshot:boolean,now:number){
    if(!target.alive||damage<=0)return;target.health=Math.max(0,target.health-damage);target.damage+=damage;if(headshot)shooter.headshots++;
    send(shooter.client,{type:'hit',damage,headshot,target:target.client.player.name,targetId:target.client.player.id,weaponCode});
    send(target.client,{type:'damage',health:target.health,damage,headshot,from:shooter.client.player.name});
    if(target.health<=0)this.eliminatePlayer(shooter,target,weaponCode,now);
  }
  handleSelectItem(client:PlayerClient,message:Record<string,unknown>){
    const p=this.players.find(v=>v.client===client);if(!p||!p.alive||!p.connected||this.finished)return;
    const code=String(message.itemCode||'');
    if(!(code in ITEMS))return send(client,{type:'item.error',message:'존재하지 않는 아이템입니다.'});
    const selected=code as RockeyItemCode;
    if((p.itemInventory[selected]||0)<=0)return send(client,{type:'item.error',message:'해당 아이템을 모두 사용했습니다.'});
    p.itemCode=selected;p.itemCount=p.itemInventory[selected];
    send(client,{type:'item.update',itemCode:p.itemCode,count:p.itemCount,inventory:p.itemInventory,health:p.health});
  }

  handleUseItem(client:PlayerClient,message:Record<string,unknown>){
    const p=this.players.find(v=>v.client===client),now=Date.now();if(!p||!p.alive||!p.connected||this.finished)return;
    if(message.itemCode!==p.itemCode){p.suspiciousInputs++;return;}
    if((p.itemInventory[p.itemCode]||0)<=0||now-p.lastItemUse<850)return;
    if(p.itemCode==='PILLS'&&p.health>=100){send(client,{type:'item.update',itemCode:p.itemCode,count:p.itemCount,inventory:p.itemInventory,health:p.health});return;}
    p.lastItemUse=now;p.itemInventory[p.itemCode]=Math.max(0,p.itemInventory[p.itemCode]-1);p.itemCount=p.itemInventory[p.itemCode];
    const selectedItemCode=p.itemCode;
    if(selectedItemCode==='PILLS'){p.health=Math.min(100,p.health+35);send(client,{type:'item.update',itemCode:selectedItemCode,count:p.itemCount,inventory:p.itemInventory,health:p.health,effect:'HEAL'});return;}
    if(selectedItemCode==='ENERGY'){p.energyUntil=now+8000;send(client,{type:'item.update',itemCode:selectedItemCode,count:p.itemCount,inventory:p.itemInventory,health:p.health,effect:'ENERGY'});return;}
    const itemCode=selectedItemCode,fuseMs=itemCode==='GRENADE'?1050:itemCode==='SMOKE'?850:650;
    const dx=-Math.sin(p.yaw)*Math.cos(p.pitch),dy=Math.sin(p.pitch),dz=-Math.cos(p.yaw)*Math.cos(p.pitch);
    const x=Math.max(-26,Math.min(26,p.x+dx*7.2)),z=Math.max(-26,Math.min(26,p.z+dz*7.2)),y=Math.max(.75,p.y+.55+dy*3.2);
    send(client,{type:'item.update',itemCode,count:p.itemCount,inventory:p.itemInventory,health:p.health});
    this.broadcast({type:'item.throw',ownerId:client.player.id,itemCode,x:p.x,y:p.y+.55,z:p.z,yaw:p.yaw,pitch:p.pitch,fuseMs});
    setTimeout(()=>{
      if(this.finished)return;
      if(itemCode==='GRENADE'){
        const destruction={id:this.id+':'+this.nextDestructionId++,x,y,z,radius:6};
        this.worldDestruction.push(destruction);
        if(this.worldDestruction.length>240)this.worldDestruction.shift();
        this.broadcast({type:'world.state',revision:this.nextDestructionId-1,destruction:this.worldDestruction});
        this.broadcast({type:'item.effect',effect:'GRENADE',x,y,z,radius:6,durationMs:520,eventId:destruction.id});
        for(const target of this.players.filter(v=>v.alive&&v.connected&&v.team!==p.team)){
          const distance=Math.hypot(target.x-x,target.z-z,(target.y+.5)-y);if(distance<7)this.applyDamage(p,target,Math.max(1,Math.round(82*(1-distance/7))),'GRENADE',false,Date.now());
        }
      }else if(itemCode==='SMOKE'){
        const durationMs=8000;
        this.smokeVolumes.push({x,y,z,radius:4.5,expiresAt:Date.now()+durationMs});
        this.broadcast({type:'item.effect',effect:'SMOKE',x,y,z,radius:4.5,durationMs});
      }
      else{
        for(const target of this.players){if(!target.alive||!target.connected||target.team===p.team)continue;const distance=Math.hypot(target.x-x,target.z-z,(target.y+.5)-y);if(distance<10)send(target.client,{type:'item.effect',effect:'FLASH',durationMs:Math.round(1400*(1-distance/12))});}
        this.broadcast({type:'item.effect',effect:'FLASH_BURST',x,y,z,radius:4,durationMs:360});
      }
    },fuseMs);
  }

  handleFire(client:PlayerClient,message:Record<string,unknown>) {
    const shooter=this.players.find(p=>p.client===client);
    if(!shooter || !shooter.alive || !shooter.connected || this.finished) return;
    if(message.weaponCode!==shooter.weaponCode) {
      shooter.suspiciousInputs++;
      return;
    }
    const weapon=WEAPONS[shooter.weaponCode] as RockeyWeapon;
    const now=Date.now();
    if(!canFireWeapon(now,shooter.lastFire,shooter.reloadUntil,shooter.ammo,weapon.fireInterval)) {
      if(now-shooter.lastFire<weapon.fireInterval/3) shooter.suspiciousInputs++;
      return;
    }
    shooter.lastFire=now;
    if(weapon.category!=='MELEE'){
      shooter.ammo--;
      shooter.weaponAmmo[shooter.weaponCode]={ammo:shooter.ammo,reserve:shooter.reserve};
      send(client,{type:'ammo.update',ammo:shooter.ammo,reserve:shooter.reserve,weaponCode:shooter.weaponCode});
    }
    const arenaWalls=[
      {x:0,z:-29.4,hx:30,hz:0.6,top:4.4},{x:0,z:29.4,hx:30,hz:0.6,top:4.4},
      {x:-29.4,z:0,hx:0.6,hz:30,top:4.4},{x:29.4,z:0,hx:0.6,hz:30,top:4.4}
    ];
    const activeSmoke=this.smokeVolumes.filter(cloud=>cloud.expiresAt>now);
    this.smokeVolumes=activeSmoke;
    const trace=traceWeaponShot(shooter,this.players,this.mode,[...MAPS[this.mapId].cover,...arenaWalls],weapon,activeSmoke);
    const target=trace.target as PlayerState|null;
    const best=trace.distance;
    const headshot=trace.headshot;
    if(weapon.category!=='MELEE')this.broadcast({
      type:'weapon.shot',shotId:client.player.id+':'+String(message.sequence??now),
      shooterId:client.player.id,x:shooter.x,y:shooter.y+0.55,z:shooter.z,
      yaw:shooter.yaw,pitch:shooter.pitch,weaponCode:weapon.code,
      hit:!!target,targetId:target?.client.player.id??null,headshot,distance:target?best:null
    });
    // Server-authoritative recoil: apply after the shot ray is evaluated, then sync the new aim to the shooter.
    const recoil=calculateWeaponRecoil(weapon);
    shooter.pitch=Math.max(-1.3,Math.min(1.3,shooter.pitch+recoil));
    shooter.yaw+=(Math.random()-0.5)*recoil*0.18;
    send(shooter.client,{type:'weapon.recoil',pitch:shooter.pitch,yaw:shooter.yaw});
    if(!target)return;
    const damage=calculateWeaponDamage(weapon,headshot,best);
    this.applyDamage(shooter,target,damage,weapon.code,headshot,now);
  }

  private captureReplayFrame(now:number) {
    if(now-this.lastReplayFrameAt<200 || this.replayFrames.length>=3600) return;
    this.lastReplayFrameAt=now;
    this.replayFrames.push({
      t:now-this.startedAt,
      players:this.snapshots()
    });
  }

  private tick() {
    if(this.finished) return;
    const now=Date.now(),delta=0.05;
    this.smokeVolumes=this.smokeVolumes.filter(cloud=>cloud.expiresAt>now);
    const cover=MAPS[this.mapId].cover;
    for(const p of this.players) {
      if(!p.alive || !p.connected) continue;
      if(now-p.lastInput>1200) {p.forward=0;p.right=0;p.aim=false;}
      const speed=(p.sprint?7:5.4)*(now<p.energyUntil?2:1)*(p.aim?0.5:1);
      const fx=-Math.sin(p.yaw),fz=-Math.cos(p.yaw);
      const rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);
      let dx=(fx*p.forward+rx*p.right)*speed*delta;
      let dz=(fz*p.forward+rz*p.right)*speed*delta;
      const length=Math.hypot(dx,dz),max=speed*delta;
      if(length>max){dx*=max/length;dz*=max/length;}
      const nx=Math.max(-27.5,Math.min(27.5,p.x+dx));
      const nz=Math.max(-27.5,Math.min(27.5,p.z+dz));
      p.verticalVelocity-=18*delta;
      const nextY=p.y+p.verticalVelocity*delta;
      const blocked=cover.some(b=>
        p.y-0.86<b.top && p.y+0.86>(b.bottom??0) &&
        nx+0.38>b.x-b.hx && nx-0.38<b.x+b.hx &&
        nz+0.38>b.z-b.hz && nz-0.38<b.z+b.hz
      );
      if(!blocked){p.x=nx;p.z=nz;}
      const floorCenter=this.floorHeightAt(p.x,p.z,p.y)+.92;
      if(nextY<=floorCenter&&p.y>=floorCenter-.95){
        p.y=floorCenter;p.verticalVelocity=0;
      }else{
        p.y=Math.min(8,nextY);
      }
    }
    this.captureReplayFrame(now);
    this.broadcast({type:'snapshot',serverTime:now,players:this.snapshots()});
    if(this.mode==='ffa' && now-this.startedAt>5*60*1000) {
      const winner=[...this.players].sort((a,b)=>b.kills-a.kills)[0];
      void this.finish(winner?.client.player.id||null);
    }
    if(now-this.startedAt>12*60*1000 && this.mode!=='ffa') {
      const winnerTeam=this.score[0]===this.score[1]?null:this.score[0]>this.score[1]?0:1;
      const winner=this.players.find(p=>p.team===winnerTeam);
      void this.finish(winner?.client.player.id||null);
    }
  }

  abort() {
    if(this.finished) return;
    this.finished=true;
    if(this.timer) clearInterval(this.timer);
    for(const timer of this.disconnectTimers.values()) clearTimeout(timer);
    this.disconnectTimers.clear();
    for(const p of this.players) {
      if(p.connected) send(p.client,{type:'match.cancelled',message:'연결 가능한 플레이어가 없어 경기가 취소되었습니다.'});
      p.client.roomId=undefined;
    }
    for(const spectator of this.spectators) {
      spectator.spectatorRoomId=undefined;
      send(spectator,{type:'match.cancelled',message:'경기가 취소되었습니다.'});
    }
    this.spectators.clear();
    if(this.persistedMatchId) void admin.from('rockey_matches')
      .update({status:'cancelled',ended_at:new Date().toISOString()}).eq('id',this.persistedMatchId);
    this.onFinished(this.id);
  }

  private async finish(winnerId:string|null) {
    if(this.finished) return;
    this.finished=true;
    if(this.timer) clearInterval(this.timer);
    for(const timer of this.disconnectTimers.values()) clearTimeout(timer);
    this.disconnectTimers.clear();
    this.captureReplayFrame(Date.now());

    const winnerTeam=this.players.find(p=>p.client.player.id===winnerId)?.team??null;
    const result={
      winnerId,winnerTeam,mode:this.mode,mapId:this.mapId,score:this.score,
      players:this.players.map(p=>({
        userId:p.client.player.id,name:p.client.player.name,team:p.team,
        kills:p.kills,deaths:p.deaths,headshots:p.headshots,damage:p.damage,
        weaponKills:p.weaponKills,weaponCode:p.weaponCode
      }))
    };

    if(this.persistedMatchId) {
      const playerWrite=await admin.from('rockey_match_players').upsert(
        this.players.map(p=>({
          match_id:this.persistedMatchId,auth_user_id:p.client.player.id,team_id:p.team,
          kills:p.kills,deaths:p.deaths,headshots:p.headshots,damage:p.damage,
          weapon_code:p.weaponCode,weapon_stats:{weaponKills:p.weaponKills},
          placement:this.mode==='ffa'
            ?(p.client.player.id===winnerId?1:null)
            :(p.team===winnerTeam?1:null)
        })),
        {onConflict:'match_id,auth_user_id'}
      );
      if(playerWrite.error) console.error('ROCKEY match player result write failed',playerWrite.error.message);

      const replayWrite=await admin.from('rockey_replays').upsert({
        match_id:this.persistedMatchId,map_id:this.mapId,mode:this.mode,
        duration_ms:Date.now()-this.startedAt,frame_rate:5,
        frames:this.replayFrames,
        participants:this.players.map(p=>({id:p.client.player.id,name:p.client.player.name,team:p.team}))
      },{onConflict:'match_id'});
      this.replaySaved=!replayWrite.error;
      if(replayWrite.error) console.error('ROCKEY replay write failed',replayWrite.error.message);

      const matchWrite=await admin.from('rockey_matches').update({
        status:'completed',ended_at:new Date().toISOString(),winner_team:winnerTeam,
        replay_available:this.replaySaved,result
      }).eq('id',this.persistedMatchId);
      if(matchWrite.error) console.error('ROCKEY match final write failed',matchWrite.error.message);

      const processed=await admin.rpc('rockey_process_match_result',{p_match_id:this.persistedMatchId});
      if(processed.error) console.error('ROCKEY ranked/profile stats update failed',processed.error.message);
    }

    for(const p of this.players) {
      const won=this.mode==='ffa'
        ?p.client.player.id===winnerId
        :p.team===winnerTeam;
      if(p.connected) send(p.client,{
        type:'match.result',won,detail:'처치 '+p.kills+' · 사망 '+p.deaths,
        ratingDelta:this.mode==='ranked'?(won?24:-18):0,
        replayAvailable:this.replaySaved
      });
      p.client.roomId=undefined;
    }
    for(const spectator of this.spectators) {
      send(spectator,{type:'match.result',won:false,detail:'관전 경기가 종료되었습니다.',replayAvailable:Boolean(this.persistedMatchId)});
      spectator.spectatorRoomId=undefined;
    }
    this.spectators.clear();
    this.onFinished(this.id);
  }
}
