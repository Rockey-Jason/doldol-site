import Fastify from 'fastify';
import { WebSocket, WebSocketServer } from 'ws';
import { createHash, randomBytes } from 'node:crypto';
import { admin, verifyPlayer, type VerifiedPlayer } from './auth.js';
import { GameRoom, type Mode, type PlayerClient } from './game-room.js';
import { MAPS, WEAPONS } from './catalog.js';

const app=Fastify({logger:true,bodyLimit:2*1024*1024});
const wss=new WebSocketServer({noServer:true,maxPayload:256*1024,perMessageDeflate:false});
const clients=new Map<string,PlayerClient>();
const queues=new Map<string,PlayerClient[]>();
type Party={
  id:string;code:string;hostId:string;mode:Mode;mapId:string;
  members:PlayerClient[];expiresAt:number;
};
const parties=new Map<string,Party>();
const rooms=new Map<string,GameRoom>();
const messageWindows=new Map<string,number[]>();
const allowedOrigins=new Set(
  (process.env.ALLOWED_ORIGINS||'https://rockey-jason.github.io,http://localhost:5173')
    .split(',').map(s=>s.trim()).filter(Boolean)
);

function send(client:PlayerClient,message:Record<string,unknown>){
  if(client.ws.readyState===WebSocket.OPEN) client.ws.send(JSON.stringify(message));
}
function makeCode(){return randomBytes(4).toString('hex').toUpperCase();}
function hashCode(code:string){return createHash('sha256').update(code).digest('hex');}
function modeSize(mode:Mode){
  if(mode==='1v1'||mode==='ranked')return 2;
  if(mode==='2v2')return 4;
  if(mode==='3v3')return 6;
  return 8;
}
function isMode(value:unknown):value is Mode{
  return ['1v1','2v2','3v3','ranked','ffa'].includes(String(value));
}
function isMap(value:unknown):value is string{
  return typeof value==='string' && Boolean(MAPS[value]);
}
function isWeapon(value:unknown):value is string{
  return typeof value==='string' && Boolean(WEAPONS[value]);
}
function removeFromQueues(client:PlayerClient){
  for(const [key,list] of queues) queues.set(key,list.filter(item=>item!==client));
  for(const [key,list] of queues) if(list.length===0) queues.delete(key);
}
function queueKey(mode:Mode,mapId:string){return mode+':'+mapId;}
function normalPair(a:string,b:string):[string,string]{return a<b?[a,b]:[b,a];}
function rateAllowed(client:PlayerClient,type:string){
  const id=client.player.id;
  const now=Date.now();
  const limit=type==='input'?35:type==='fire'?18:22;
  const window=messageWindows.get(id)||[];
  const recent=window.filter(t=>now-t<1000);
  if(recent.length>=limit){
    messageWindows.set(id,recent);
    return false;
  }
  recent.push(now);
  messageWindows.set(id,recent);
  return true;
}
function roomFor(client:PlayerClient){return client.roomId?rooms.get(client.roomId):undefined;}

async function getLoadout(authUserId:string){
  const {data}=await admin.from('rockey_loadouts')
    .select('primary_weapon,secondary_weapon').eq('auth_user_id',authUserId).eq('slot',1).maybeSingle();
  const primary=isWeapon(data?.primary_weapon)?data!.primary_weapon:'R16';
  const secondary=isWeapon(data?.secondary_weapon)?data!.secondary_weapon:'R9';
  await admin.from('rockey_loadouts').upsert({
    auth_user_id:authUserId,slot:1,primary_weapon:primary,secondary_weapon:secondary
  },{onConflict:'auth_user_id,slot',ignoreDuplicates:true});
  return {primaryWeapon:primary,secondaryWeapon:secondary};
}

async function startRoom(mode:Mode,members:PlayerClient[],mapId:string){
  const id=randomBytes(12).toString('hex');
  const room=new GameRoom(id,mode,members,mapId,roomId=>rooms.delete(roomId));
  rooms.set(id,room);
  await room.start();
}

async function friendshipRows(authUserId:string){
  const [a,b]=await Promise.all([
    admin.from('rockey_friendships').select('*').eq('user_a_id',authUserId),
    admin.from('rockey_friendships').select('*').eq('user_b_id',authUserId)
  ]);
  return [...(a.data||[]),...(b.data||[])];
}

async function handleFriendSearch(client:PlayerClient,queryValue:unknown){
  const query=String(queryValue||'').trim().slice(0,32);
  if(query.length<2) return send(client,{type:'friend.search.results',results:[]});
  const {data:siteUsers,error}=await admin.from('users')
    .select('user_id,name,profile_image')
    .ilike('name','%'+query+'%')
    .neq('user_id',client.player.siteUserId)
    .limit(12);
  if(error) return send(client,{type:'error',message:'플레이어 검색에 실패했습니다.'});
  const siteIds=(siteUsers||[]).map(u=>u.user_id);
  if(siteIds.length===0) return send(client,{type:'friend.search.results',results:[]});
  const {data:mappings}=await admin.from('dori_bank_identity_map')
    .select('auth_user_id,site_user_id').in('site_user_id',siteIds);
  const authIds=(mappings||[]).map(m=>m.auth_user_id);
  const [rows,profiles]=await Promise.all([
    friendshipRows(client.player.id),
    authIds.length?admin.from('rockey_profiles').select('auth_user_id,rank_tier,rank_rating').in('auth_user_id',authIds):Promise.resolve({data:[] as any[]})
  ]);
  const registeredIds=new Set((profiles.data||[]).map((p:any)=>p.auth_user_id));
  const result=(mappings||[]).filter(mapping=>registeredIds.has(mapping.auth_user_id)).map(mapping=>{
    const site=siteUsers!.find(u=>u.user_id===mapping.site_user_id);
    const profile=profiles.data?.find((p:any)=>p.auth_user_id===mapping.auth_user_id);
    const relation=rows.find(r=>
      (r.user_a_id===mapping.auth_user_id&&r.user_b_id===client.player.id)||
      (r.user_b_id===mapping.auth_user_id&&r.user_a_id===client.player.id)
    );
    return {
      id:mapping.auth_user_id,name:site?.name||'ROCKEY PLAYER',
      avatar:site?.profile_image||null,
      online:clients.has(mapping.auth_user_id),
      rank:profile?.rank_tier||'UNRANKED',
      rating:profile?.rank_rating||0,
      friendship:relation?.status||'none',
      requestedBy:relation?.requested_by||null
    };
  });
  send(client,{type:'friend.search.results',results:result});
}

async function handleFriendList(client:PlayerClient){
  const rows=await friendshipRows(client.player.id);
  const accepted=rows.filter(r=>r.status==='accepted');
  const pending=rows.filter(r=>r.status==='pending');
  const targetIds=[...new Set([...accepted,...pending].map(r=>
    r.user_a_id===client.player.id?r.user_b_id:r.user_a_id
  ))];
  if(targetIds.length===0) return send(client,{type:'friend.list',friends:[],requests:[]});
  const [profiles,mappings]=await Promise.all([
    admin.from('rockey_profiles').select('auth_user_id,display_name,rank_tier,rank_rating,wins,losses').in('auth_user_id',targetIds),
    admin.from('dori_bank_identity_map').select('auth_user_id,site_user_id').in('auth_user_id',targetIds)
  ]);
  const siteIds=(mappings.data||[]).map(m=>m.site_user_id);
  const {data:siteUsers}=siteIds.length
    ?await admin.from('users').select('user_id,profile_image').in('user_id',siteIds)
    :{data:[] as any[]};
  const build=(r:any)=>{
    const id=r.user_a_id===client.player.id?r.user_b_id:r.user_a_id;
    const p=profiles.data?.find(x=>x.auth_user_id===id);
    const m=mappings.data?.find(x=>x.auth_user_id===id);
    const s=siteUsers?.find(x=>x.user_id===m?.site_user_id);
    return {
      id,name:p?.display_name||'ROCKEY PLAYER',avatar:s?.profile_image||null,
      online:clients.has(id),rank:p?.rank_tier||'UNRANKED',rating:p?.rank_rating||0,
      wins:p?.wins||0,losses:p?.losses||0,
      incoming:r.status==='pending'&&r.requested_by!==client.player.id,
      outgoing:r.status==='pending'&&r.requested_by===client.player.id
    };
  };
  send(client,{
    type:'friend.list',
    friends:accepted.map(build),
    requests:pending.map(build)
  });
}

async function handleFriendRequest(client:PlayerClient,targetValue:unknown){
  const target=String(targetValue||'');
  if(!/^[0-9a-f-]{36}$/i.test(target)||target===client.player.id)
    return send(client,{type:'error',message:'친구 요청 대상이 올바르지 않습니다.'});
  const {data:targetProfile}=await admin.from('rockey_profiles')
    .select('auth_user_id').eq('auth_user_id',target).maybeSingle();
  if(!targetProfile) return send(client,{type:'error',message:'ROCKEY에 가입한 플레이어만 친구로 추가할 수 있습니다.'});
  const [a,b]=normalPair(client.player.id,target);
  const {data:existing}=await admin.from('rockey_friendships').select('id,status,requested_by')
    .eq('user_a_id',a).eq('user_b_id',b).maybeSingle();
  if(existing?.status==='accepted') return send(client,{type:'friend.request.sent',message:'이미 친구입니다.'});
  if(existing?.status==='pending') return send(client,{type:'error',message:'이미 친구 요청이 존재합니다.'});
  if(existing?.status==='blocked') return send(client,{type:'error',message:'이 플레이어와는 친구 요청을 주고받을 수 없습니다.'});
  const {error}=await admin.from('rockey_friendships').insert({
    user_a_id:a,user_b_id:b,requested_by:client.player.id,status:'pending'
  });
  if(error) return send(client,{type:'error',message:'친구 요청을 보내지 못했습니다.'});
  send(client,{type:'friend.request.sent',targetId:target});
  const online=clients.get(target);
  if(online) send(online,{type:'friend.request.received',from:{id:client.player.id,name:client.player.name}});
}

async function handleFriendRespond(client:PlayerClient,targetValue:unknown,accept:boolean){
  const target=String(targetValue||'');
  const [a,b]=normalPair(client.player.id,target);
  const {data:request}=await admin.from('rockey_friendships').select('id,requested_by,status')
    .eq('user_a_id',a).eq('user_b_id',b).eq('status','pending').maybeSingle();
  if(!request||request.requested_by===client.player.id)
    return send(client,{type:'error',message:'처리할 수 있는 친구 요청이 없습니다.'});
  const {error}=accept
    ?await admin.from('rockey_friendships')
      .update({status:'accepted',updated_at:new Date().toISOString()})
      .eq('id',request.id)
    :await admin.from('rockey_friendships')
      .delete().eq('id',request.id);
  if(error) return send(client,{type:'error',message:'친구 요청을 처리하지 못했습니다.'});
  send(client,{type:'friend.request.updated',targetId:target,accepted:accept});
  const other=clients.get(target);
  if(other) send(other,{type:'friend.request.updated',targetId:client.player.id,accepted:accept});
  await handleFriendList(client);
}

async function handleFriendInvite(client:PlayerClient,targetValue:unknown){
  const target=String(targetValue||'');
  const party=[...parties.values()].find(p=>p.hostId===client.player.id);
  if(!party) return send(client,{type:'error',message:'먼저 비공개 방을 만들어 주세요.'});
  const [a,b]=normalPair(client.player.id,target);
  const {data:friend}=await admin.from('rockey_friendships').select('status')
    .eq('user_a_id',a).eq('user_b_id',b).maybeSingle();
  if(friend?.status!=='accepted') return send(client,{type:'error',message:'친구에게만 초대할 수 있습니다.'});
  const recipient=clients.get(target);
  if(!recipient) return send(client,{type:'error',message:'친구가 현재 온라인이 아닙니다.'});
  const {data:invite,error:inviteError}=await admin.from('rockey_invites')
    .select('id').eq('room_code_hash',hashCode(party.code)).eq('status','pending').maybeSingle();
  if(inviteError||!invite) return send(client,{type:'error',message:'초대 방 정보를 찾지 못했습니다.'});
  const {error}=await admin.from('rockey_invite_recipients').upsert({
    invite_id:invite.id,target_user_id:target,invited_by:client.player.id
  },{onConflict:'invite_id,target_user_id'});
  if(error) return send(client,{type:'error',message:'초대 정보를 저장하지 못했습니다.'});
  send(recipient,{
    type:'friend.invite',
    from:{id:client.player.id,name:client.player.name},
    code:party.code,mode:party.mode,mapId:party.mapId
  });
  send(client,{type:'friend.invite.sent',targetId:target});
}

async function handleReplayList(client:PlayerClient){
  const {data:played}=await admin.from('rockey_match_players')
    .select('match_id').eq('auth_user_id',client.player.id).order('match_id',{ascending:false}).limit(30);
  const ids=(played||[]).map(x=>x.match_id);
  if(ids.length===0) return send(client,{type:'replays.list',replays:[]});
  const {data}=await admin.from('rockey_replays')
    .select('match_id,map_id,mode,duration_ms,created_at,participants')
    .in('match_id',ids).order('created_at',{ascending:false}).limit(20);
  send(client,{type:'replays.list',replays:data||[]});
}

async function handleReplayGet(client:PlayerClient,matchIdValue:unknown){
  const matchId=String(matchIdValue||'');
  if(!/^[0-9a-f-]{36}$/i.test(matchId)) return send(client,{type:'error',message:'리플레이 ID가 올바르지 않습니다.'});
  const {data:participant}=await admin.from('rockey_match_players').select('match_id')
    .eq('match_id',matchId).eq('auth_user_id',client.player.id).maybeSingle();
  if(!participant) return send(client,{type:'error',message:'본인이 참가한 경기만 다시 볼 수 있습니다.'});
  const {data,error}=await admin.from('rockey_replays')
    .select('match_id,map_id,mode,duration_ms,frame_rate,frames,participants')
    .eq('match_id',matchId).maybeSingle();
  if(error||!data) return send(client,{type:'error',message:'리플레이를 찾을 수 없습니다.'});
  send(client,{type:'replay.data',replay:data});
}

async function handleSeason(client:PlayerClient){
  const [{data:season}, {data:profile}] = await Promise.all([
    admin.from('rockey_seasons').select('id,season_code,name,starts_at,ends_at,reward_description')
      .eq('is_active',true).lte('starts_at',new Date().toISOString()).gte('ends_at',new Date().toISOString()).maybeSingle(),
    admin.from('rockey_profiles').select('rank_tier,rank_rating,season_id,season_points')
      .eq('auth_user_id',client.player.id).maybeSingle()
  ]);
  if(!season) return send(client,{type:'season.data',season:null,profile:profile||null,rewards:[]});
  const [{data:rewards},{data:claims}]=await Promise.all([
    admin.from('rockey_season_rewards').select('id,min_season_points,item_code,item_type,display_name,description')
      .eq('season_id',season.id).order('min_season_points'),
    admin.from('rockey_season_reward_claims').select('reward_id')
      .eq('season_id',season.id).eq('auth_user_id',client.player.id)
  ]);
  const claimed=new Set((claims||[]).map(r=>r.reward_id));
  send(client,{
    type:'season.data',season,profile:profile||null,
    rewards:(rewards||[]).map(r=>({...r,claimed:claimed.has(r.id)}))
  });
}

async function handle(client:PlayerClient,raw:WebSocket.RawData){
  let message:Record<string,unknown>;
  try{message=JSON.parse(raw.toString()) as Record<string,unknown>;}
  catch{return send(client,{type:'error',message:'올바르지 않은 메시지입니다.'});}

  const type=String(message.type||'');
  if(!rateAllowed(client,type)){
    send(client,{type:'error',message:'요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요.'});
    return;
  }

  switch(type){
    case 'ping':
      return send(client,{type:'pong',timestamp:Date.now()});

    case 'queue.join': {
      if(client.roomId||client.spectatorRoomId) return send(client,{type:'error',message:'이미 경기에 참가 중입니다.'});
      if(!isMode(message.mode)) return send(client,{type:'error',message:'지원하지 않는 모드입니다.'});
      const mode=message.mode;
      const mapId=isMap(message.mapId)?message.mapId:'training_facility';
      client.selectedMapId=mapId;
      removeFromQueues(client);
      const key=queueKey(mode,mapId);
      const queue=queues.get(key)||[];
      if(!queue.some(item=>item.player.id===client.player.id)) queue.push(client);
      queues.set(key,queue);
      send(client,{type:'queue.joined',mode,mapId,size:queue.length,required:modeSize(mode)});
      if(queue.length>=modeSize(mode)){
        const group=queue.splice(0,modeSize(mode));
        queues.set(key,queue);
        await startRoom(mode,group,mapId);
      }
      return;
    }

    case 'queue.leave':
      removeFromQueues(client);
      return send(client,{type:'queue.left'});

    case 'private.create': {
      if(!isMode(message.mode)||!['1v1','2v2','3v3'].includes(String(message.mode)))
        return send(client,{type:'private.error',message:'비공개 방은 1v1, 2v2, 3v3만 지원합니다.'});
      if(client.roomId||client.spectatorRoomId) return send(client,{type:'private.error',message:'이미 경기에 참가 중입니다.'});
      for(const [id,party] of parties) if(party.hostId===client.player.id) parties.delete(id);
      const code=makeCode();
      const id=randomBytes(10).toString('hex');
      const mode=message.mode as Mode;
      const mapId=isMap(message.mapId)?message.mapId:'training_facility';
      const expiresAt=Date.now()+15*60*1000;
      const {error}=await admin.from('rockey_invites').insert({
        host_user_id:client.player.id,room_code_hash:hashCode(code),
        mode,status:'pending',expires_at:new Date(expiresAt).toISOString()
      });
      if(error) return send(client,{type:'private.error',message:'초대 방을 저장하지 못했습니다.'});
      parties.set(id,{id,code,hostId:client.player.id,mode,mapId,members:[client],expiresAt});
      return send(client,{type:'private.created',code,mode,mapId,members:1,required:modeSize(mode)});
    }

    case 'private.join': {
      const code=String(message.code||'').trim().toUpperCase();
      if(!/^[A-F0-9]{8}$/.test(code)) return send(client,{type:'private.error',message:'초대 코드 형식이 올바르지 않습니다.'});
      const party=[...parties.values()].find(p=>p.code===code);
      if(!party||party.expiresAt<Date.now()) return send(client,{type:'private.error',message:'방이 만료되었거나 서버에서 찾을 수 없습니다.'});
      if(client.roomId||client.spectatorRoomId) return send(client,{type:'private.error',message:'이미 경기에 참가 중입니다.'});
      if(party.members.length>=modeSize(party.mode)) return send(client,{type:'private.error',message:'방 인원이 가득 찼습니다.'});
      if(party.members.some(p=>p.player.id===client.player.id)) return send(client,{type:'private.error',message:'이미 참가한 방입니다.'});
      const {data:invite,error}=await admin.from('rockey_invites')
        .select('id,status,expires_at,target_user_id')
        .eq('room_code_hash',hashCode(code)).maybeSingle();
      if(error||!invite||invite.status!=='pending'||new Date(invite.expires_at).getTime()<Date.now())
        return send(client,{type:'private.error',message:'초대가 만료되었거나 유효하지 않습니다.'});
      const {data:recipients,error:recipientError}=await admin.from('rockey_invite_recipients')
        .select('target_user_id').eq('invite_id',invite.id);
      if(recipientError) return send(client,{type:'private.error',message:'초대 대상 정보를 확인하지 못했습니다.'});
      const allowedTargets=(recipients||[]).map(row=>row.target_user_id as string);
      const hasTargetList=allowedTargets.length>0;
      if(party.hostId!==client.player.id && (
        (hasTargetList && !allowedTargets.includes(client.player.id)) ||
        (!hasTargetList && invite.target_user_id && invite.target_user_id!==client.player.id)
      )) return send(client,{type:'private.error',message:'이 초대는 다른 플레이어에게 발송되었습니다.'});
      party.members.push(client);
      for(const member of party.members) send(member,{
        type:'private.member',name:client.player.name,members:party.members.length,required:modeSize(party.mode)
      });
      return send(client,{type:'private.joined',mode:party.mode,mapId:party.mapId,members:party.members.length,required:modeSize(party.mode)});
    }

    case 'private.start': {
      const party=[...parties.values()].find(p=>p.hostId===client.player.id);
      if(!party||party.expiresAt<Date.now()) return send(client,{type:'private.error',message:'시작할 수 있는 비공개 방이 없습니다.'});
      if(party.members.length!==modeSize(party.mode))
        return send(client,{type:'private.error',message:'필요 인원 '+modeSize(party.mode)+'명 / 현재 '+party.members.length+'명'});
      parties.delete(party.id);
      await admin.from('rockey_invites').update({status:'accepted'})
        .eq('room_code_hash',hashCode(party.code));
      await startRoom(party.mode,party.members,party.mapId);
      return;
    }

    case 'friend.search':
      return handleFriendSearch(client,message.query);
    case 'friend.list':
      return handleFriendList(client);
    case 'friend.request':
      return handleFriendRequest(client,message.targetId);
    case 'friend.respond':
      return handleFriendRespond(client,message.targetId,message.accept===true);
    case 'friend.invite':
      return handleFriendInvite(client,message.targetId);

    case 'loadout.get': {
      const loadout=await getLoadout(client.player.id);
      send(client,{type:'loadout.data',...loadout,weapons:Object.values(WEAPONS),maps:Object.values(MAPS).map(m=>({id:m.id,name:m.name,description:m.description,difficulty:m.difficulty}))});
      return;
    }
    case 'loadout.set': {
      const primary=isWeapon(message.primaryWeapon)?message.primaryWeapon:'R16';
      const secondary=isWeapon(message.secondaryWeapon)?message.secondaryWeapon:'R9';
      if(primary===secondary) return send(client,{type:'error',message:'주무기와 보조 무기는 달라야 합니다.'});
      const {error}=await admin.from('rockey_loadouts').upsert({
        auth_user_id:client.player.id,slot:1,primary_weapon:primary,secondary_weapon:secondary,
        updated_at:new Date().toISOString()
      },{onConflict:'auth_user_id,slot'});
      if(error) return send(client,{type:'error',message:'장비 저장에 실패했습니다.'});
      client.primaryWeapon=primary;
      client.secondaryWeapon=secondary;
      send(client,{type:'loadout.saved',primaryWeapon:primary,secondaryWeapon:secondary});
      return;
    }

    case 'leaderboard.get': {
      const {data,error}=await admin.rpc('rockey_get_leaderboard',{p_limit:50});
      if(error) return send(client,{type:'error',message:'랭킹을 불러오지 못했습니다.'});
      return send(client,{type:'leaderboard.data',rows:data||[]});
    }
    case 'season.get':
      return handleSeason(client);
    case 'replays.list':
      return handleReplayList(client);
    case 'replay.get':
      return handleReplayGet(client,message.matchId);

    case 'matches.live':
      return send(client,{type:'matches.live',matches:[...rooms.values()].map(r=>r.getInfo())});

    case 'match.spectate': {
      if(client.roomId||client.spectatorRoomId)
        return send(client,{type:'spectate.error',message:'경기 중이거나 이미 관전 중인 상태에서는 다른 경기를 열 수 없습니다.'});
      const roomId=String(message.roomId||'');
      const room=rooms.get(roomId);
      if(!room) return send(client,{type:'spectate.error',message:'관전할 수 있는 경기가 없습니다.'});
      room.addSpectator(client);
      return;
    }
    case 'spectator.leave': {
      const room=client.spectatorRoomId?rooms.get(client.spectatorRoomId):undefined;
      room?.removeSpectator(client);
      return;
    }
    case 'match.leave': {
      removeFromQueues(client);
      if(client.spectatorRoomId){
        const spectatorRoom=rooms.get(client.spectatorRoomId);
        spectatorRoom?.removeSpectator(client);
      }
      const room=roomFor(client);
      if(room) room.disconnect(client);
      client.roomId=undefined;
      return send(client,{type:'queue.left'});
    }
    case 'input': {
      const room=roomFor(client);
      room?.handleInput(client,message);
      return;
    }
    case 'fire': {
      const room=roomFor(client);
      room?.handleFire(client,message);
      return;
    }
    case 'reload': {
      roomFor(client)?.handleReload(client);
      return;
    }
    case 'weapon.switch':
      roomFor(client)?.handleSwitchWeapon(client);
      return;

    default:
      return send(client,{type:'error',message:'지원하지 않는 요청입니다.'});
  }
}

app.get('/',async()=>({status:'online',service:'rockey-game-server',build:'BUILD 02'}));

app.get('/health',async()=>({
  status:'online',service:'rockey-game-server',
  activePlayers:clients.size,activeRooms:rooms.size,
  activeSpectators:[...rooms.values()].reduce((sum,r)=>sum+r.getInfo().spectators,0)
}));

app.server.on('upgrade',(request,socket,head)=>{
  const origin=request.headers.origin||'';
  if(!allowedOrigins.has(origin)||request.url?.split('?')[0]!=='/ws'){
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;
  }
  wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
});

wss.on('connection',ws=>{
  const heartbeatState=ws as WebSocket & { isAlive?: boolean };
  heartbeatState.isAlive=true;
  ws.on('pong',()=>{heartbeatState.isAlive=true;});
  ws.on('error',error=>app.log.warn({err:error},'ROCKEY websocket error'));
  let authenticated=false;
  let busy=false;
  let client:PlayerClient|null=null;
  const authTimeout=setTimeout(()=>{if(!authenticated)ws.close(1008,'Authentication required');},8000);

  ws.on('message',async raw=>{
    if(busy) return;
    if(!authenticated){
      busy=true;
      try{
        const msg=JSON.parse(raw.toString()) as Record<string,unknown>;
        if(msg.type!=='auth'||typeof msg.accessToken!=='string'){
          ws.close(1008,'Invalid authentication');return;
        }
        const player:VerifiedPlayer=await verifyPlayer(msg.accessToken);
        const loadout=await getLoadout(player.id);
        client={ws,player,...loadout};
        const existing=clients.get(player.id);
        if(existing){
          removeFromQueues(existing);
          const oldRoom=roomFor(existing);
          oldRoom?.disconnect(existing);
          const oldSpectator=existing.spectatorRoomId?rooms.get(existing.spectatorRoomId):undefined;
          oldSpectator?.removeSpectator(existing);
          existing.ws.close(4001,'Session resumed elsewhere');
        }
        clients.set(player.id,client);
        authenticated=true;
        clearTimeout(authTimeout);
        send(client,{type:'auth.ok',player:{id:player.id,name:player.name}});
        let resumed=false;
        for(const room of rooms.values()){
          if(room.reconnect(client)){resumed=true;break;}
        }
        if(!resumed) send(client,{type:'session.ready'});
      }catch(error){
        const reason=error instanceof Error?error.message:'AUTH_FAILED';
        if(ws.readyState===WebSocket.OPEN){
          ws.send(JSON.stringify({type:'auth.error',reason}));
          ws.close(1008,'Authentication failed');
        }
      }finally{busy=false;}
      return;
    }
    if(!client)return;
    try{await handle(client,raw);}
    catch(error){
      app.log.error(error);
      send(client,{type:'error',message:'서버에서 요청을 처리하지 못했습니다.'});
    }
  });

  ws.on('close',()=>{
    clearTimeout(authTimeout);
    if(!client)return;
    // A replaced socket may close after the new socket has already resumed.
    // Never let a stale close event disconnect the new session.
    if(clients.get(client.player.id)!==client)return;
    clients.delete(client.player.id);
    removeFromQueues(client);
    roomFor(client)?.disconnect(client);
    if(client.spectatorRoomId)rooms.get(client.spectatorRoomId)?.removeSpectator(client);
    for(const [id,party] of parties){
      party.members=party.members.filter(member=>member!==client);
      if(party.members.length===0) parties.delete(id);
    }
    messageWindows.delete(client.player.id);
  });
});

const heartbeatTimer=setInterval(()=>{
  for(const socket of wss.clients){
    if(socket.readyState!==WebSocket.OPEN)continue;
    const state=socket as WebSocket & { isAlive?: boolean };
    if(state.isAlive===false){socket.terminate();continue;}
    state.isAlive=false;
    try{socket.ping();}catch{socket.terminate();}
  }
},25_000);
wss.on('close',()=>clearInterval(heartbeatTimer));

const port=Number(process.env.PORT||3000);
await app.listen({host:'0.0.0.0',port});
app.log.info('ROCKEY BUILD 03 server listening on port '+port);
