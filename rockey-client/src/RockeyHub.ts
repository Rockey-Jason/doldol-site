import type { ReplayFrame } from './core/Game';

type Sender=(message:Record<string,unknown>&{type:string})=>void;
type Friend={id:string;name:string;avatar?:string|null;online:boolean;rank:string;rating:number;wins?:number;losses?:number;incoming?:boolean;outgoing?:boolean;friendship?:string;requestedBy?:string|null};
type Weapon={code:string;name:string;category:string;damage:number;headshotMultiplier:number;fireInterval:number;magazine:number;reserve:number;reloadMs:number;range:number;pellets?:number};
type MapItem={id:string;name:string;description:string;difficulty:string};
type ReplayItem={match_id:string;map_id:string;mode:string;duration_ms:number;created_at:string;participants:Array<{id:string;name:string;team:number}>};
type LiveMatch={roomId:string;matchId:string|null;mode:string;mapId:string;mapName:string;players:number;maxPlayers:number;spectators:number;startedAt:number};
type Season={id:string;season_code:string;name:string;starts_at:string;ends_at:string;reward_description:string};
type Reward={id:string;min_season_points:number;item_code:string;item_type:string;display_name:string;description:string;claimed:boolean};

const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export class RockeyHub {
  private root:HTMLElement;
  private send:Sender;
  private onReplay:(frames:ReplayFrame[])=>void;
  private onQuality:(level:'low'|'balanced'|'high')=>void;
  private onSensitivity:(value:number)=>void;
  private tab='friends';
  private friends:Friend[]=[];
  private requests:Friend[]=[];
  private searchResults:Friend[]=[];
  private leaderboard:Array<Record<string,unknown>>=[];
  private season:Season|null=null;
  private profile:Record<string,unknown>|null=null;
  private rewards:Reward[]=[];
  private replays:ReplayItem[]=[];
  private liveMatches:LiveMatch[]=[];
  private weapons:Weapon[]=[];
  private maps:MapItem[]=[];
  private primaryWeapon='R16';
  private secondaryWeapon='R9';
  private mapId='training_facility';
  private searchQuery='';
  private incomingInvite:{from:{id:string;name:string};code:string;mode:string;mapId:string}|null=null;
  private notice='';
  private quality:'low'|'balanced'|'high'='balanced';
  private sensitivity=1;

  constructor(root:HTMLElement,send:Sender,onReplay:(frames:ReplayFrame[])=>void,onQuality:(level:'low'|'balanced'|'high')=>void,onSensitivity:(value:number)=>void){
    this.root=root;this.send=send;this.onReplay=onReplay;this.onQuality=onQuality;this.onSensitivity=onSensitivity;
    this.quality=(localStorage.getItem('rockey.quality') as any)||'balanced';
    const saved=Number(localStorage.getItem('rockey.sensitivity')||'1');
    this.sensitivity=Number.isFinite(saved)?Math.max(.4,Math.min(2.2,saved)):1;
    this.root.addEventListener('click',e=>this.handleClick(e));
    this.root.addEventListener('submit',e=>this.handleSubmit(e));
    this.root.addEventListener('change',e=>this.handleChange(e));
  }
  open(tab='friends'){this.tab=tab;this.root.classList.remove('hidden');this.refresh();this.render();}
  close(){this.root.classList.add('hidden');}
  getLoadout(){return {primaryWeapon:this.primaryWeapon,secondaryWeapon:this.secondaryWeapon,mapId:this.mapId};}
  refresh(){
    this.send({type:'friend.list'});this.send({type:'leaderboard.get'});this.send({type:'season.get'});
    this.send({type:'loadout.get'});this.send({type:'replays.list'});this.send({type:'matches.live'});
  }
  onMessage(m:Record<string,any>){
    switch(m.type){
      case 'friend.list':this.friends=m.friends||[];this.requests=m.requests||[];this.render();break;
      case 'friend.search.results':this.searchResults=m.results||[];this.render();break;
      case 'friend.request.sent':this.notice='친구 요청을 보냈습니다.';this.send({type:'friend.list'});this.render();break;
      case 'friend.request.received':this.notice=(m.from?.name||'플레이어')+' 님이 친구 요청을 보냈습니다.';this.send({type:'friend.list'});this.render();break;
      case 'friend.request.updated':this.notice=m.accepted?'친구가 되었습니다.':'친구 요청을 거절했습니다.';this.send({type:'friend.list'});this.render();break;
      case 'friend.invite':
        this.incomingInvite={
          from:{id:String(m.from?.id||''),name:String(m.from?.name||'친구')},
          code:String(m.code||''),mode:String(m.mode||'1v1'),mapId:String(m.mapId||'training_facility')
        };
        this.notice=(m.from?.name||'친구')+' 님이 비공개 경기에 초대했습니다.';
        this.render();break;
      case 'friend.invite.sent':this.notice='친구에게 경기 초대를 보냈습니다.';this.render();break;
      case 'leaderboard.data':this.leaderboard=m.rows||[];this.render();break;
      case 'season.data':this.season=m.season||null;this.profile=m.profile||null;this.rewards=m.rewards||[];this.render();break;
      case 'loadout.data':
        this.weapons=m.weapons||[];this.maps=m.maps||[];
        this.primaryWeapon=m.primaryWeapon||this.primaryWeapon;
        this.secondaryWeapon=m.secondaryWeapon||this.secondaryWeapon;this.render();break;
      case 'loadout.saved':
        this.primaryWeapon=m.primaryWeapon||this.primaryWeapon;this.secondaryWeapon=m.secondaryWeapon||this.secondaryWeapon;
        this.notice='장비 설정을 저장했습니다.';this.render();break;
      case 'replays.list':this.replays=m.replays||[];this.render();break;
      case 'matches.live':this.liveMatches=m.matches||[];this.render();break;
      case 'replay.data':
        this.close();this.onReplay((m.replay?.frames||[]) as ReplayFrame[]);break;
      case 'error':this.notice=String(m.message||'요청을 처리하지 못했습니다.');this.render();break;
    }
  }
  private handleSubmit(event:Event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement))return;
    if(form.id!=='friendSearchForm')return;
    event.preventDefault();
    const input=form.querySelector<HTMLInputElement>('input[name="query"]');
    this.searchQuery=input?.value.trim()||'';
    this.send({type:'friend.search',query:this.searchQuery});
  }
  private handleChange(event:Event){
    const t=event.target;
    if(!(t instanceof HTMLInputElement||t instanceof HTMLSelectElement))return;
    if(t.id==='hubPrimary')this.primaryWeapon=t.value;
    if(t.id==='hubSecondary')this.secondaryWeapon=t.value;
    if(t.id==='hubMap')this.mapId=t.value;
    if(t.id==='hubQuality'){
      this.quality=t.value as any;localStorage.setItem('rockey.quality',this.quality);this.onQuality(this.quality);
    }
    if(t.id==='hubSensitivity'){
      this.sensitivity=Number(t.value);localStorage.setItem('rockey.sensitivity',String(this.sensitivity));
      this.onSensitivity(this.sensitivity);
      const label=this.root.querySelector('#sensitivityValue');if(label)label.textContent=this.sensitivity.toFixed(1)+'×';
    }
  }
  private handleClick(event:Event){
    const target=event.target;
    if(!(target instanceof Element))return;
    const b=target.closest<HTMLElement>('[data-action]');
    if(!b)return;
    const action=b.dataset.action||'',id=b.dataset.id||'';
    switch(action){
      case 'close':this.close();break;
      case 'tab':this.tab=b.dataset.tab||'friends';this.notice='';this.render();break;
      case 'friend-add':this.send({type:'friend.request',targetId:id});break;
      case 'friend-accept':this.send({type:'friend.respond',targetId:id,accept:true});break;
      case 'friend-reject':this.send({type:'friend.respond',targetId:id,accept:false});break;
      case 'friend-invite':this.send({type:'friend.invite',targetId:id});break;
      case 'invite-accept':
        if(this.incomingInvite){this.send({type:'private.join',code:this.incomingInvite.code});this.incomingInvite=null;this.close();}break;
      case 'invite-dismiss':this.incomingInvite=null;this.render();break;
      case 'loadout-save':
        if(this.primaryWeapon===this.secondaryWeapon){this.notice='주무기와 보조 무기는 달라야 합니다.';this.render();}
        else this.send({type:'loadout.set',primaryWeapon:this.primaryWeapon,secondaryWeapon:this.secondaryWeapon});break;
      case 'rank-refresh':this.send({type:'leaderboard.get'});break;
      case 'season-refresh':this.send({type:'season.get'});break;
      case 'live-refresh':this.send({type:'matches.live'});break;
      case 'replays-refresh':this.send({type:'replays.list'});break;
      case 'spectate':this.send({type:'match.spectate',roomId:id});this.close();break;
      case 'replay-play':this.send({type:'replay.get',matchId:id});break;
    }
  }
  private render(){
    const tabs=[['friends','FRIENDS','친구'],['rank','RANK','랭킹'],['season','SEASON','시즌'],['arsenal','ARSENAL','무기·맵'],['replays','REPLAY','관전·리플레이']];
    const nav=tabs.map(t=>'<button class="hub-tab '+(this.tab===t[0]?'active':'')+'" data-action="tab" data-tab="'+t[0]+'"><b>'+t[1]+'</b><span>'+t[2]+'</span></button>').join('');
    let invite='';
    if(this.incomingInvite){
      invite='<aside class="hub-invite"><div><b>'+esc(this.incomingInvite.from.name)+'</b> 님의 경기 초대 <span>'+esc(this.incomingInvite.mode)+' · '+esc(this.incomingInvite.mapId)+'</span></div><button data-action="invite-accept" class="hub-primary">참가</button><button data-action="invite-dismiss" class="hub-secondary">나중에</button></aside>';
    }
    this.root.innerHTML=
      '<div class="hub-backdrop" data-action="close"></div>'+
      '<section class="hub-card" role="dialog" aria-modal="true" aria-label="ROCKEY 플레이어 허브">'+
        '<header class="hub-header"><div><div class="hub-kicker">ROCKEY COMMAND CENTER</div><h2>PLAYER HUB</h2></div><button class="hub-close" data-action="close" aria-label="닫기">×</button></header>'+
        '<nav class="hub-nav">'+nav+'</nav>'+
        '<div class="hub-notice '+(this.notice?'show':'')+'">'+esc(this.notice)+'</div>'+
        '<main class="hub-content">'+this.renderTab()+'</main>'+invite+
      '</section>';
  }
  private renderTab(){
    switch(this.tab){
      case 'friends':return this.renderFriends();
      case 'rank':return this.renderRank();
      case 'season':return this.renderSeason();
      case 'arsenal':return this.renderArsenal();
      case 'replays':return this.renderReplays();
      default:return '';
    }
  }
  private renderFriends(){
    const results=this.searchResults.map(f=>
      '<div class="hub-row"><div class="hub-avatar">'+esc(f.name.slice(0,1))+'</div><div class="hub-row-main"><b>'+esc(f.name)+'</b><span>'+(f.online?'● 온라인':'○ 오프라인')+' · '+esc(f.rank)+' '+f.rating+'</span></div>'+
      (f.friendship==='none'?'<button class="hub-small" data-action="friend-add" data-id="'+f.id+'">친구 추가</button>':
      f.friendship==='accepted'?'<span class="hub-dim">친구</span>':
      f.requestedBy===f.id?'<span class="hub-dim">요청 보냄</span>':'<span class="hub-dim">요청 대기</span>')+'</div>'
    ).join('');
    const friends=this.friends.map(f=>
      '<div class="hub-row"><div class="hub-avatar '+(f.online?'online':'')+'">'+esc(f.name.slice(0,1))+'</div><div class="hub-row-main"><b>'+esc(f.name)+'</b><span>'+(f.online?'● 온라인':'○ 오프라인')+' · '+esc(f.rank)+' '+f.rating+' RP · W '+(f.wins||0)+'</span></div>'+
      (f.online?'<button class="hub-small" data-action="friend-invite" data-id="'+f.id+'">초대</button>':'<span class="hub-dim">오프라인</span>')+'</div>'
    ).join('');
    const requests=this.requests.map(f=>
      '<div class="hub-row"><div class="hub-avatar">'+esc(f.name.slice(0,1))+'</div><div class="hub-row-main"><b>'+esc(f.name)+'</b><span>'+(f.incoming?'친구 요청':'요청 응답 대기')+'</span></div>'+
      (f.incoming?'<button class="hub-small" data-action="friend-accept" data-id="'+f.id+'">수락</button><button class="hub-small danger" data-action="friend-reject" data-id="'+f.id+'">거절</button>':'<span class="hub-dim">보냄</span>')+'</div>'
    ).join('');
    return '<section class="hub-section"><div class="hub-section-head"><div><h3>PLAYER SEARCH</h3><p>돌이사이트 계정으로 ROCKEY 플레이어를 찾아보세요.</p></div></div>'+
      '<form id="friendSearchForm" class="hub-search"><input name="query" minlength="2" maxlength="32" value="'+esc(this.searchQuery)+'" placeholder="플레이어 이름 검색"><button class="hub-primary" type="submit">검색</button></form>'+
      '<div class="hub-list">'+(results||'<div class="hub-empty">검색 결과가 여기에 표시됩니다.</div>')+'</div></section>'+
      '<section class="hub-section"><div class="hub-section-head"><div><h3>YOUR FRIENDS <small>'+this.friends.length+'</small></h3><p>온라인 친구에게 비공개 경기 초대를 보낼 수 있습니다.</p></div></div><div class="hub-list">'+(friends||'<div class="hub-empty">아직 친구가 없습니다. 플레이어를 검색해 보세요.</div>')+'</div></section>'+
      '<section class="hub-section"><div class="hub-section-head"><div><h3>FRIEND REQUESTS <small>'+this.requests.filter(r=>r.incoming).length+'</small></h3></div></div><div class="hub-list">'+(requests||'<div class="hub-empty">대기 중인 친구 요청이 없습니다.</div>')+'</div></section>';
  }
  private renderRank(){
    const rows=this.leaderboard.map((r:any,index)=>
      '<div class="hub-rank-row"><strong class="hub-rank-number">'+String(index+1).padStart(2,'0')+'</strong><div class="hub-row-main"><b>'+esc(r.display_name)+'</b><span>'+esc(r.rank_tier)+' · '+(r.wins||0)+'승 '+(r.losses||0)+'패 · '+(r.matches_played||0)+'경기</span></div><strong class="hub-rating">'+Number(r.rank_rating||0).toLocaleString()+' <small>RP</small></strong></div>'
    ).join('');
    return '<section class="hub-section"><div class="hub-section-head"><div><h3>GLOBAL RANKING</h3><p>경쟁전 승리와 경기 결과로 랭크 점수를 획득하세요.</p></div><button class="hub-small" data-action="rank-refresh">새로고침</button></div><div class="hub-rank-list">'+(rows||'<div class="hub-empty">아직 랭킹 데이터가 없습니다.</div>')+'</div></section>'+
      '<div class="hub-note">랭크 점수는 서버에서 경기 결과를 확인한 뒤 반영됩니다. 일반전과 훈련장은 랭크 점수에 영향을 주지 않습니다.</div>';
  }
  private renderSeason(){
    const p=this.profile||{},points=Number(p.season_points||0);
    const next=this.rewards.find(r=>!r.claimed&&r.min_season_points>points);
    const previous=this.rewards.filter(r=>r.min_season_points<=points).pop();
    const start=previous?.min_season_points||0,end=next?.min_season_points||Math.max(1,points);
    const progress=next?Math.max(0,Math.min(100,(points-start)/(end-start)*100)):100;
    const rewards=this.rewards.map(r=>
      '<div class="hub-reward '+(r.claimed?'claimed':points>=r.min_season_points?'ready':'')+'"><div class="hub-reward-mark">'+(r.claimed?'✓':points>=r.min_season_points?'◆':'◇')+'</div><div class="hub-row-main"><b>'+esc(r.display_name)+'</b><span>'+r.min_season_points.toLocaleString()+' RP · '+esc(r.description)+'</span></div><span class="hub-dim">'+(r.claimed?'획득 완료':points>=r.min_season_points?'지급 대기':'잠김')+'</span></div>'
    ).join('');
    if(!this.season)return '<div class="hub-empty">현재 진행 중인 시즌이 없습니다.</div>';
    return '<section class="hub-season-hero"><div class="hub-kicker">'+esc(this.season.season_code)+'</div><h3>'+esc(this.season.name)+'</h3><p>'+esc(this.season.reward_description)+'</p>'+
      '<div class="hub-season-stats"><div><span>SEASON RP</span><b>'+points.toLocaleString()+'</b></div><div><span>RANK</span><b>'+esc(p.rank_tier||'UNRANKED')+'</b></div><div><span>RATING</span><b>'+Number(p.rank_rating||0).toLocaleString()+'</b></div></div>'+
      '<div class="hub-progress"><i style="width:'+progress+'%"></i></div><div class="hub-progress-label">'+(next?points+' / '+end+' RP · 다음 보상까지 '+Math.max(0,end-points)+' RP':'모든 시즌 보상을 달성했습니다.')+'</div></section>'+
      '<section class="hub-section"><div class="hub-section-head"><div><h3>SEASON REWARDS</h3><p>조건 달성 시 서버가 전용 칭호·배너·효과를 자동 지급합니다.</p></div><button class="hub-small" data-action="season-refresh">새로고침</button></div><div class="hub-list">'+rewards+'</div></section>';
  }
  private renderArsenal(){
    const option=(w:Weapon)=>'<option value="'+w.code+'" '+(w.code===this.primaryWeapon?'':'')+'>'+esc(w.name)+' · '+esc(w.category)+'</option>';
    const primaryOptions=this.weapons.map(w=>'<option value="'+w.code+'" '+(w.code===this.primaryWeapon?'selected':'')+'>'+esc(w.name)+' · '+esc(w.category)+'</option>').join('');
    const secondaryOptions=this.weapons.map(w=>'<option value="'+w.code+'" '+(w.code===this.secondaryWeapon?'selected':'')+'>'+esc(w.name)+' · '+esc(w.category)+'</option>').join('');
    const mapOptions=this.maps.map(m=>'<option value="'+m.id+'" '+(m.id===this.mapId?'selected':'')+'>'+esc(m.name)+' · '+esc(m.difficulty)+'</option>').join('');
    const cards=this.weapons.map(w=>
      '<div class="hub-weapon"><div class="hub-weapon-icon">'+esc(w.code.slice(0,2))+'</div><div class="hub-row-main"><b>'+esc(w.name)+'</b><span>'+esc(w.category)+' · 피해 '+w.damage+' · 탄창 '+w.magazine+'</span></div><span class="hub-weapon-rate">'+(1000/w.fireInterval).toFixed(1)+' <small>RPM</small></span></div>'
    ).join('');
    return '<section class="hub-section"><div class="hub-section-head"><div><h3>LOADOUT CONFIGURATION</h3><p>전투에 사용할 주무기와 보조 무기를 저장하세요.</p></div></div>'+
      '<div class="hub-loadout-grid"><label>PRIMARY WEAPON<select id="hubPrimary">'+primaryOptions+'</select></label><label>SECONDARY WEAPON<select id="hubSecondary">'+secondaryOptions+'</select></label><label class="hub-map-select">BATTLE MAP<select id="hubMap">'+mapOptions+'</select></label></div>'+
      '<button class="hub-primary wide" data-action="loadout-save">장비 저장</button></section>'+
      '<section class="hub-section"><div class="hub-section-head"><div><h3>WEAPON ARMORY <small>'+this.weapons.length+'/10</small></h3><p>총기별 연사 속도와 탄창을 비교할 수 있습니다.</p></div></div><div class="hub-weapon-list">'+(cards||'<div class="hub-empty">무기 데이터를 불러오는 중입니다.</div>')+'</div></section>'+
      '<section class="hub-section"><div class="hub-section-head"><div><h3>GRAPHICS & CONTROLS</h3><p>모바일 기기에서는 낮은 그래픽 설정을 권장합니다.</p></div></div><div class="hub-settings">'+
      '<label>GRAPHICS QUALITY<select id="hubQuality"><option value="low" '+(this.quality==='low'?'selected':'')+'>LOW · 성능 우선</option><option value="balanced" '+(this.quality==='balanced'?'selected':'')+'>BALANCED · 균형</option><option value="high" '+(this.quality==='high'?'selected':'')+'>HIGH · 화질 우선</option></select></label>'+
      '<label>MOUSE / TOUCH SENSITIVITY <span id="sensitivityValue">'+this.sensitivity.toFixed(1)+'×</span><input id="hubSensitivity" type="range" min="0.4" max="2.2" step="0.1" value="'+this.sensitivity+'"></label></div></section>';
  }
  private renderReplays(){
    const live=this.liveMatches.map(m=>
      '<div class="hub-row"><div class="hub-avatar live">●</div><div class="hub-row-main"><b>'+esc(m.mode.toUpperCase())+' · '+esc(m.mapName)+'</b><span>'+m.players+'/'+m.maxPlayers+' 플레이어 · 관전자 '+m.spectators+'</span></div><button class="hub-small" data-action="spectate" data-id="'+m.roomId+'">관전</button></div>'
    ).join('');
    const replays=this.replays.map(r=>
      '<div class="hub-row"><div class="hub-avatar replay">▶</div><div class="hub-row-main"><b>'+esc(r.mode.toUpperCase())+' · '+esc(r.map_id)+'</b><span>'+new Date(r.created_at).toLocaleString('ko-KR')+' · '+(r.duration_ms/1000).toFixed(0)+'초 · '+(r.participants||[]).length+'명</span></div><button class="hub-small" data-action="replay-play" data-id="'+r.match_id+'">재생</button></div>'
    ).join('');
    return '<section class="hub-section"><div class="hub-section-head"><div><h3>LIVE MATCHES</h3><p>진행 중인 경기를 관전할 수 있습니다.</p></div><button class="hub-small" data-action="live-refresh">새로고침</button></div><div class="hub-list">'+(live||'<div class="hub-empty">현재 관전 가능한 경기가 없습니다.</div>')+'</div></section>'+
      '<section class="hub-section"><div class="hub-section-head"><div><h3>MATCH REPLAYS</h3><p>본인이 참가한 경기를 다시 볼 수 있습니다.</p></div><button class="hub-small" data-action="replays-refresh">새로고침</button></div><div class="hub-list">'+(replays||'<div class="hub-empty">저장된 리플레이가 없습니다.</div>')+'</div></section>';
  }
}
