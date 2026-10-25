import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const SUPABASE_URL="https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_KEY="sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
const supabase=window.doriSupabase||createClient(SUPABASE_URL,SUPABASE_KEY);
if(!window.doriSupabase)window.doriSupabase=supabase;

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const fmt=value=>(Number(value)||0).toLocaleString("ko-KR");
const escapeHtml=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const shortNumber=value=>{
 const n=Number(value)||0;
 if(n>=1000000)return (n/1000000).toFixed(n>=10000000?0:1).replace(/\.0$/,"")+"M";
 if(n>=10000)return (n/1000).toFixed(n>=100000?0:1).replace(/\.0$/,"")+"K";
 if(n>=1000)return (n/1000).toFixed(1).replace(/\.0$/,"")+"K";
 return String(n);
};
const missionIcons={attendance:"🗓️",daily_mission:"🎯",random_box:"🎁",chess_game:"♟️",study_focus:"📚",stock_trade:"📈",bank_transaction:"🏦",study_plan:"📝"};
const achievementIcons={first_100:"✦",tier_25:"🧭",tier_50:"💫",tier_100:"👑",weekly_hero:"🏅",multi_domain:"🌌"};
const chapters=["출발의 성운","항해의 관문","푸른 성운","별빛 회랑","궤도의 도시","차원의 바다","은하 중심","초신성 지대","도로늄 심연","정복자의 왕좌"];
let dashboard=null,busy=false,toastTimer=0,resizeObserver=null,routeResizeFrame=0,lastMapColumns=0;

function toast(message){
 const el=$("#passToast");if(!el)return;
 el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);
 toastTimer=window.setTimeout(()=>el.classList.remove("show"),3300);
}
function celebrate(title,detail){
 $("#celebrationTitle").textContent=title;$("#celebrationDetail").textContent=detail;
 $("#claimCelebration").classList.add("show");$("#claimCelebration").setAttribute("aria-hidden","false");
}
function closeCelebration(){$("#claimCelebration").classList.remove("show");$("#claimCelebration").setAttribute("aria-hidden","true")}
function asObject(data){return Array.isArray(data)?(data[0]||{}):(data||{})}
function setBar(element,value){if(element)element.style.width=Math.max(0,Math.min(100,Number(value)||0))+"%"}
function prettyError(error){
 const msg=String(error&&error.message||"");
 if(/not_unlocked/i.test(msg))return "아직 이 노드의 로키 포인트 조건을 충족하지 못했어요.";
 if(/already_claimed/i.test(msg))return "이미 수령한 보상이에요.";
 if(/not_completed/i.test(msg))return "미션을 완료한 다음 로키 포인트를 받을 수 있어요.";
 if(/mission_not_found/i.test(msg))return "오늘의 미션 목록이 변경되었어요. 새로고침해 주세요.";
 if(/invalid_mission/i.test(msg))return "유효하지 않은 미션입니다.";
 if(/JWT|auth|login|로그인/i.test(msg))return "로그인 상태를 확인한 뒤 다시 시도해 주세요.";
 return msg.replace(/[<>]/g,"").slice(0,180)||"요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
function getColCount(){
 if(window.matchMedia("(max-width:420px)").matches)return 3;
 if(window.matchMedia("(max-width:720px)").matches)return 4;
 if(window.matchMedia("(max-width:1050px)").matches)return 6;
 return 10;
}
function refreshMapRoute(){
 const canvas=$("#rewardMapCanvas"),grid=$("#rewardMapNodes"),svg=$("#mapRouteSvg");
 if(!canvas||!grid||!svg||!grid.children.length)return;
 const nodes=$$(".map-node",grid);
 if(!nodes.length)return;
 const width=Math.max(1,grid.scrollWidth),height=Math.max(1,grid.scrollHeight);
 svg.setAttribute("viewBox","0 0 "+width+" "+height);
 svg.setAttribute("width",String(width));svg.setAttribute("height",String(height));
 const bounds=grid.getBoundingClientRect();
 const points=nodes.map(node=>{
  const r=node.getBoundingClientRect();
  return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2};
 });
 const pathFor=pts=>{
  if(!pts.length)return "";
  let path="M "+pts[0].x.toFixed(1)+" "+pts[0].y.toFixed(1);
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y;
   if(Math.abs(dy)<2){
    path+=" C "+(a.x+dx*.32).toFixed(1)+" "+a.y.toFixed(1)+", "+(b.x-dx*.32).toFixed(1)+" "+b.y.toFixed(1)+", "+b.x.toFixed(1)+" "+b.y.toFixed(1);
   }else{
    path+=" C "+a.x.toFixed(1)+" "+(a.y+dy*.45).toFixed(1)+", "+b.x.toFixed(1)+" "+(b.y-dy*.45).toFixed(1)+", "+b.x.toFixed(1)+" "+b.y.toFixed(1);
   }
  }
  return path;
 };
 const allPath=pathFor(points);
 const tier=Math.max(0,Number(dashboard&&dashboard.tier)||0);
 const active=pathFor(points.slice(0,Math.min(points.length,tier+1)));
 const underlay=$(".route-underlay",svg),main=$(".route-main",svg),activePath=$(".route-active",svg);
 if(underlay)underlay.setAttribute("d",allPath);
 if(main)main.setAttribute("d",allPath);
 if(activePath)activePath.setAttribute("d",active);
}
function scheduleMapRoute(){
 if(routeResizeFrame)cancelAnimationFrame(routeResizeFrame);
 routeResizeFrame=requestAnimationFrame(()=>{routeResizeFrame=0;refreshMapRoute()});
}
function updateHero(data){
 const season=data.season||{},tier=Math.max(0,Number(data.tier)||0);
 $("#seasonLabel").textContent=season.name||((season.key||"")+" · 돌이 패스");
 $("#seasonStatus").textContent="시즌 "+(season.key||"");
 $("#rockyPointsWallet").innerHTML=fmt(data.rocky_points)+' <small>RP</small>';
 $("#seasonPointsTotal").innerHTML=fmt(data.season_points)+' <small>RP</small>';
 $("#currentTierHero").innerHTML=fmt(tier)+' <small>/ 100</small>';
 $("#heroNextTier").textContent=tier>=100?"FINAL NODE":"NODE "+String(tier+1).padStart(2,"0");
 $("#heroProgressText").textContent=tier>=100?"100단계 완주":fmt(data.next_tier_progress)+" / "+fmt(data.next_tier_cost)+" RP";
 const percent=tier>=100?100:(Number(data.next_tier_cost)>0?(Number(data.next_tier_progress)||0)/Number(data.next_tier_cost)*100:0);
 setBar($("#heroProgressBar"),percent);
 const multiplier=Math.max(1,Number(data.coin_multiplier)||1);
 const multiplierBadge=$("#coinMultiplierBadge");
 const multiplierLabel=$("#coinMultiplierLabel");
 if(multiplierBadge)multiplierBadge.hidden=multiplier<=1;
 if(multiplierLabel)multiplierLabel.textContent="×"+String(multiplier).replace(/\.0$/,"")+" 보상";
 $("#heroProgressCaption").textContent=tier>=100?"최종 노드를 정복했어요! 다음 시즌을 준비해 보세요.":"다음 노드까지 로키 포인트 "+fmt(data.next_tier_remaining)+"점";
 $("#tierCount").innerHTML=fmt(tier)+' <i>/ 100</i>';
 $("#currentChapter").textContent=String(Math.min(10,Math.max(1,Math.ceil(Math.max(1,tier)/10)))).padStart(2,"0")+" · "+chapters[Math.min(9,Math.floor(Math.max(0,tier-1)/10))];
 $("#nextTierLabel").textContent=tier>=100?"최종 구역 정복 완료":"다음 목표 노드";
 $("#nextTierXp").textContent=tier>=100?"100단계 · 은하의 핵":"NODE "+String(tier+1).padStart(2,"0")+" · "+fmt(data.next_tier_required)+" RP";
 $("#weekReset").textContent="다음 월요일 00:00 · 한국 시간";
 $("#todayPointsEarned").textContent=fmt(data.today_points_earned)+" RP";
 $("#achievementCount").textContent=(data.achievements||[]).filter(a=>a.claimed).length+" / "+(data.achievements||[]).length;
 $("#collectionCount").textContent=fmt((data.cosmetics||[]).length);
 $("#lastUpdated").textContent="동기화 "+new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
 const chapterIndex=Math.min(9,Math.floor(Math.max(0,tier-1)/10));
 $$(".chapter-pill").forEach((pill,i)=>{pill.classList.toggle("active",i===chapterIndex);pill.classList.toggle("completed",i<chapterIndex)});
}
function renderDailyMissions(data){
 const items=Array.isArray(data.daily_missions)?data.daily_missions:[];
 const claimed=items.filter(item=>item.claimed).length;
 const completed=items.filter(item=>item.completed).length;
 const maxPoints=items.reduce((sum,item)=>sum+(Number(item.reward_points)||0),0);
 $("#dailyMissionCount").textContent=claimed+" / 5 보상 수령";
 $("#dailyMissionRewardTotal").textContent="오늘의 보상 최대 "+fmt(maxPoints)+" RP";
 setBar($("#dailyMissionProgressBar"),claimed/5*100);
 const icons=missionIcons;
 $("#dailyMissionGrid").innerHTML=items.map((item,index)=>{
  const p=Math.max(0,Number(item.progress)||0),target=Math.max(1,Number(item.target)||1);
  const isClaimed=item.claimed===true,complete=item.completed===true,claimable=item.claimable===true;
  const status=isClaimed?"수령 완료":claimable?"보상 수령 가능":complete?"완료 · 보상 대기":("진행 중 · "+p+"/"+target);
  const btn=isClaimed?"✓ 포인트 수령 완료":claimable?"로키 포인트 받기":complete?"보상 수령하기":"임무 진행 중";
  return '<article class="daily-mission-card '+(isClaimed?"is-claimed":claimable?"is-ready":complete?"is-complete":"")+'" style="animation-delay:'+(index*55)+'ms">'+
   '<div class="daily-mission-card-top"><span class="mission-index">MISSION 0'+(index+1)+'</span><span class="mission-state">'+(isClaimed?"✓":claimable?"✦":complete?"●":"○")+'</span></div>'+
   '<div class="daily-mission-main"><div class="daily-mission-icon">'+(icons[item.key]||"✦")+'</div><div class="daily-mission-copy"><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.description)+'</p></div></div>'+
   '<div class="daily-mission-progress-row"><span>'+escapeHtml(status)+'</span><strong>'+fmt(Math.min(p,target))+' / '+fmt(target)+'</strong></div>'+
   '<div class="daily-mission-progress"><span style="width:'+Math.min(100,p/target*100)+'%"></span></div>'+
   '<div class="daily-mission-card-bottom"><span class="mission-points">+'+fmt(item.reward_points)+' <i>RP</i></span><button type="button" class="daily-mission-claim" data-claim-daily-mission="'+Number(item.slot)+'" '+(!claimable?"disabled":"")+'>'+btn+'</button></div></article>';
 }).join("")||'<div class="loading-card">오늘의 임무를 불러오지 못했어요.</div>';
 $("#todayPointsEarned").textContent=fmt(data.today_points_earned)+" RP";
}
function renderMapNode(tier){
 const level=Number(tier.tier)||0,cosmetics=Array.isArray(tier.cosmetics)?tier.cosmetics:[];
 const claimed=tier.claimed===true,unlocked=tier.unlocked===true,claimable=tier.claimable===true;
 const colCount=getColCount(),row=Math.floor((level-1)/colCount)+1,offset=(level-1)%colCount;
 const col=(row%2===1)?offset+1:colCount-offset;
 const special=cosmetics.length>0,milestone=level%10===0,chapter=Math.min(10,Math.ceil(level/10));
 const main=cosmetics[0],icon=main&&main.icon?main.icon:(milestone?"✧":"🪙");
 const classes=["map-node",claimed?"is-claimed":"",unlocked?"is-unlocked":"",claimable?"is-claimable":"",special?"is-special":"",milestone?"is-milestone":"",level===Number(dashboard&&dashboard.tier)+1?"is-next":"",level===Number(dashboard&&dashboard.tier)?"is-current":""].filter(Boolean).join(" ");
 let status=claimed?"✓":claimable?"✦":unlocked?"○":"⌑";
 const stageCoins=Number(tier.display_coins??tier.coins)||0;
 const stageName=main?main.name:"돌돌코인";
 const label=claimed?"보상 수령 완료":claimable?"노드 해금 보상 받기":unlocked?"보상 수령 가능":"로키 포인트 "+fmt(tier.total_required)+"점 필요";
 return '<button type="button" class="'+classes+'" data-tier="'+level+'" data-claim-tier="'+level+'" style="grid-column:'+col+';grid-row:'+row+';animation-delay:'+((level%30)*9)+'ms" '+(!claimable?"disabled":"")+' aria-label="'+escapeHtml("노드 "+level+", "+stageName+", "+fmt(stageCoins)+" 돌돌코인, "+label)+'" title="'+escapeHtml("노드 "+level+" · "+stageName+" · "+fmt(stageCoins)+" 돌돌코인")+'">'+
   '<span class="map-node-top"><span class="map-node-number">'+String(level).padStart(2,"0")+'</span><span class="map-node-state">'+status+'</span></span>'+
   '<span class="map-node-icon">'+escapeHtml(icon)+'</span>'+
   '<span class="map-node-reward">'+shortNumber(stageCoins)+' <i>🪙</i></span>'+
   (special?'<span class="map-node-prize-tag">'+(cosmetics.length>1?"RARE SET":(main.kind==="title"?"TITLE":main.kind==="profile_frame"?"FRAME":"ICON"))+'</span>':'')+
   '<span class="map-node-tooltip"><strong>'+escapeHtml(stageName)+'</strong><small>'+label+'</small></span>'+
   '</button>';
}
function renderTrack(data){
 const tiers=Array.isArray(data.tiers)?data.tiers:[];
 const grid=$("#rewardMapNodes");
 lastMapColumns=getColCount();
 grid.style.setProperty("--map-columns",String(lastMapColumns));
 grid.style.gridTemplateColumns="repeat("+lastMapColumns+",minmax(0,1fr))";
 grid.innerHTML=tiers.map(renderMapNode).join("")||'<div class="loading-card">보상 지도를 준비하지 못했어요.</div>';
 renderChapterStrip();
 scheduleMapRoute();
 if(resizeObserver)resizeObserver.disconnect();
 if("ResizeObserver" in window){resizeObserver=new ResizeObserver(scheduleMapRoute);resizeObserver.observe(grid)}
}
function renderChapterStrip(){
 const strip=$("#mapChapterStrip");
 if(!strip)return;
 strip.innerHTML=chapters.map((name,i)=>{
  const start=i*10+1,end=(i+1)*10;
  const t=Number(dashboard&&dashboard.tier)||0;
  const active=t>=start-1&&t<end,complete=t>=end;
  return '<span class="chapter-pill '+(active?"active":"")+' '+(complete?"completed":"")+'"><i>'+String(i+1).padStart(2,"0")+'</i> '+escapeHtml(name)+'</span>';
 }).join("");
}
function renderMegaMission(data){
 const host=$("#megaMissionPanel");if(!host)return;
 const mega=data&&data.mega_mission;
 if(!mega){host.innerHTML='<div class="loading-card">메가 미션 정보를 불러오지 못했어요.</div>';return}
 const objectives=Array.isArray(mega.objectives)?mega.objectives:[];
 const claimed=mega.claimed===true,complete=mega.complete===true,claimable=mega.claimable===true;
 host.innerHTML='<div class="mega-mission-card '+(claimed?"is-claimed":"")+'"><div class="mega-card-glow"></div>'+
 '<div class="mega-card-head"><div class="mega-boss-emblem">✦<span>MEGA</span></div><div class="mega-title-copy"><div class="mega-kicker">WEEKLY BOSS · MEGA EXPEDITION</div><h3>메가 돌이 미션</h3><p>여섯 가지 극한 목표를 전부 돌파하고 초희귀 은하 프레임을 쟁취하세요.</p></div><div class="mega-status '+(claimed?"claimed":complete?"complete":"")+'">'+(claimed?"정복 완료":complete?"최종 보상 개방":"주간 도전")+'</div></div>'+
 '<div class="mega-progress-head"><span>메가 미션 진행도</span><strong>'+fmt(mega.completed_objectives||0)+' <i>/ '+fmt(mega.total_objectives||6)+'</i></strong></div><div class="mega-progress-track"><span style="width:'+Math.min(100,(Number(mega.completed_objectives)||0)/Math.max(1,Number(mega.total_objectives)||6)*100)+'%"></span></div>'+
 '<div class="mega-objective-grid">'+objectives.map((o,i)=>'<article class="mega-objective '+(o.complete?"complete":"")+'"><span class="mega-objective-number">'+String(i+1).padStart(2,"0")+'</span><div class="mega-objective-copy"><strong>'+escapeHtml(o.title)+'</strong><p>'+escapeHtml(o.description)+'</p><div class="mega-objective-progress"><span style="width:'+Math.min(100,(Number(o.progress)||0)/Math.max(1,Number(o.target)||1)*100)+'%"></span></div><small>'+fmt(o.progress)+' / '+fmt(o.target)+(o.complete?' · 달성 ✓':'')+'</small></div><span class="mega-objective-check">'+(o.complete?"✓":"✧")+'</span></article>').join("")+'</div>'+
 '<div class="mega-rewards"><div class="mega-reward-heading"><span>✧ FINAL LOOT</span><strong>최종 보상 상자</strong></div><div class="mega-reward-items">'+
 ''+
 '<div class="mega-reward-item coins"><span>🪙</span><div><strong>+'+fmt(mega.display_coin_reward??mega.base_coin_reward)+' 돌돌코인</strong><small>'+(Number(mega.coin_multiplier)>1?'현재 부스트 ×'+Number(mega.coin_multiplier).toLocaleString("ko-KR")+' 적용':'대규모 코인 금고')+'</small></div></div>'+
 ''+
 '<div class="mega-reward-item frame"><span>🌌</span><div><strong>메가 은하 프레임</strong><small>LEGENDARY 프로필 프레임</small></div></div></div>'+
 '<div class="mega-reward-footer"><span>매주 월요일 00:00 · 한국 시간 초기화</span><button type="button" class="mega-claim-button" data-claim-mega '+(!claimable?"disabled":"")+'>'+(claimed?"✓ 메가 미션 보상 수령 완료":claimable?"최종 보상 전부 받기 ✦":"극한 목표 6개를 전부 완료하세요")+'</button></div></div></div>';
}
function renderChallenges(data){
 const items=Array.isArray(data.challenges)?data.challenges:[];
 const icons={daily_missions:"🎯",collect_points:"💠",lucky_drop:"🎁",focus_routine:"📚",pass_steps:"🗺️",market_maker:"📈"};
 $("#weeklyGrid").innerHTML=items.map(item=>{
  const p=Number(item.progress)||0,target=Math.max(1,Number(item.target)||1),claimed=item.claimed===true,complete=p>=target,can=item.claimable===true;
  return '<article class="challenge-card '+(claimed?"done":"")+'"><div class="challenge-heading"><div class="challenge-icon">'+(icons[item.key]||"✦")+'</div><div><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.description)+'</p></div><div class="challenge-reward">+'+fmt(item.rocky_points_reward)+' RP</div></div>'+
   '<div class="challenge-progress-label"><span>'+(claimed?"포인트 수령 완료":complete?"목표 달성 · 보상 수령 가능":"주간 목표 진행도")+'</span><strong>'+fmt(Math.min(p,target))+' / '+fmt(target)+'</strong></div>'+
   '<div class="challenge-progress"><span style="width:'+Math.min(100,p/target*100)+'%"></span></div>'+
   '<button type="button" class="challenge-action" data-claim-challenge="'+escapeHtml(item.key)+'" '+(!can?"disabled":"")+'>'+(claimed?"✓ 로키 포인트 수령 완료":can?"로키 포인트 받기":"원정 진행 중")+'</button></article>';
 }).join("")||'<div class="loading-card">주간 원정을 불러오지 못했어요.</div>';
}
function renderAchievements(data){
 const items=Array.isArray(data.achievements)?data.achievements:[];
 $("#seasonAchievementGrid").innerHTML=items.map(item=>{
  const p=Math.max(0,Number(item.progress)||0),target=Math.max(1,Number(item.target)||1),claimed=item.claimed===true,can=item.claimable===true;
  return '<article class="season-achievement '+(claimed?"done":"")+'"><div class="achievement-emblem">'+(achievementIcons[item.key]||"✦")+'</div><div class="achievement-main"><div class="achievement-top"><h3>'+escapeHtml(item.title)+'</h3><span class="achievement-reward">+'+fmt(item.display_coin_reward??item.coin_reward)+' 🪙</span></div><p>'+escapeHtml(item.description)+'</p><div class="achievement-progressline"><span style="width:'+Math.min(100,p/target*100)+'%"></span></div><div class="achievement-bottom"><span>'+(claimed?"수령 완료":fmt(p)+" / "+fmt(target))+'</span><button type="button" class="achievement-action" data-claim-achievement="'+escapeHtml(item.key)+'" '+(!can?"disabled":"")+'>'+(claimed?"✓ 완료":can?"보상 받기":"진행 중")+'</button></div></div></article>';
 }).join("")||'<div class="loading-card">시즌 업적을 불러오지 못했어요.</div>';
}
function renderCollection(data){
 const items=Array.isArray(data.cosmetics)?data.cosmetics:[];
 if(!items.length){$("#collectionGrid").innerHTML='<div class="empty-collection">아직 보유한 패스 꾸미기 아이템이 없어요.<br>5단계부터 특별 아이콘, 10단계부터 시즌 칭호, 20단계부터 프로필 프레임을 모을 수 있어요.</div>';return}
 const kinds={title:"시즌 칭호",profile_frame:"프로필 프레임",special_icon:"특별 아이콘"};
 $("#collectionGrid").innerHTML=items.map(item=>{
  const equipped=item.equipped===true,rarity=["Rare","Epic","Legendary","Myth","Doronum"].includes(item.rarity)?item.rarity:"Rare";
  return '<article class="cosmetic-card '+(equipped?"equipped":"")+'"><div class="cosmetic-icon">'+escapeHtml(item.icon||"✦")+'</div><span class="cosmetic-rarity '+rarity+'">'+escapeHtml(rarity.toUpperCase())+'</span><h3>'+escapeHtml(item.name)+'</h3><span class="cosmetic-detail">'+escapeHtml(kinds[item.kind]||"시즌 보상")+' · '+escapeHtml(item.season_key||"")+'</span><button class="cosmetic-equip" type="button" data-equip-cosmetic="'+escapeHtml(item.key)+'" '+(equipped?"disabled":"")+'>'+(equipped?"✓ 장착 중":"장착하기")+'</button></article>';
 }).join("");
}
function render(data){
 dashboard=asObject(data);
 updateHero(dashboard);renderDailyMissions(dashboard);renderTrack(dashboard);
 renderChallenges(dashboard);renderMegaMission(dashboard);renderAchievements(dashboard);renderCollection(dashboard);
 $("#passApp").hidden=false;$("#loginRequired").hidden=true;
}
async function loadDashboard({silent=false}={}){
 if(!silent)$("#dailyMissionGrid").innerHTML='<div class="loading-card"><span class="spinner"></span>오늘의 임무를 불러오는 중이에요.</div>';
 const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
 if(sessionError)throw sessionError;
 if(!sessionData||!sessionData.session||!sessionData.session.user){
  $("#loginRequired").hidden=false;$("#passApp").hidden=true;$("#seasonStatus").textContent="로그인 필요";return null;
 }
 const {data,error}=await supabase.rpc("dori_pass_get_dashboard");
 if(error)throw error;
 render(data);
  const {data:megaData,error:megaError}=await supabase.rpc("dori_pass_get_mega_mission");
  if(megaError)throw megaError;
  dashboard.mega_mission=asObject(megaData);renderMegaMission(dashboard);return dashboard;
}
async function doRpc(name,args,onSuccess){
 if(busy)return;busy=true;document.body.classList.add("pass-busy");
 try{
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  const result=asObject(data);
  if(result.ok===false){
   const messages={not_unlocked:"아직 이 노드의 로키 포인트 조건을 충족하지 못했어요.",already_claimed:"이미 수령한 보상이에요.",not_completed:"목표를 완료한 후 보상을 받을 수 있어요.",mission_not_found:"오늘의 임무 목록을 새로 불러와 주세요.",invalid_mission:"유효하지 않은 임무예요."};
   toast(messages[result.reason]||"요청을 처리하지 못했어요.");await loadDashboard({silent:true});return;
  }
  await loadDashboard({silent:true});
  if(onSuccess)onSuccess(result);
 }catch(error){
  console.error("[돌이 패스] "+name+" 오류:",error);toast(prettyError(error));
 }finally{busy=false;document.body.classList.remove("pass-busy")}
}
function claimDailyMission(slot){
 doRpc("dori_pass_claim_daily_mission",{p_slot:Number(slot)},r=>{
  celebrate("로키 포인트 획득!",r.mission_title+" · +"+fmt(r.reward_points)+" RP");
 });
}
function claimTier(tier){
 doRpc("dori_pass_claim_tier",{p_tier:Number(tier)},r=>{
  const items=Array.isArray(r.cosmetics)?r.cosmetics:[];
  const extra=items.length?" · "+items.map(x=>x.name).join(" · "):"";
  celebrate("노드 "+String(tier).padStart(2,"0")+" 정복!", "+"+fmt(r.coins)+" 돌돌코인"+extra);
 });
}
function claimAll(){
 const unlocked=(dashboard&&dashboard.tiers||[]).filter(t=>t.unlocked&&!t.claimed).length;
 if(!unlocked){toast("지금 받을 수 있는 보상 노드가 없어요. 일일 임무로 로키 포인트를 모아 보세요.");return}
 doRpc("dori_pass_claim_all_available",{},r=>{
  celebrate("열린 노드 보상 획득!",fmt(r.claimed_count)+"개 노드 · +"+fmt(r.coins)+" 돌돌코인 · "+fmt(r.cosmetics_count)+"개 꾸미기 아이템");
 });
}
document.addEventListener("click",event=>{
 const daily=event.target.closest("[data-claim-daily-mission]");
 if(daily&&!daily.disabled){claimDailyMission(daily.dataset.claimDailyMission);return}
 const tier=event.target.closest("[data-claim-tier]");
 if(tier&&!tier.disabled){claimTier(tier.dataset.claimTier);return}
 const challenge=event.target.closest("[data-claim-challenge]");
 if(challenge&&!challenge.disabled){doRpc("dori_pass_claim_challenge",{p_challenge_key:challenge.dataset.claimChallenge},r=>celebrate("주간 원정 완료!","+"+fmt(r.rocky_points_reward)+" 로키 포인트를 획득했어요."));return}
 const mega=event.target.closest("[data-claim-mega]");
  if(mega&&!mega.disabled){doRpc("dori_pass_claim_mega_mission",{},r=>celebrate("메가 돌이 미션 정복!","+"+fmt(r.rocky_points_reward)+" RP · +"+fmt(r.coins)+" 돌돌코인 · 한정 칭호와 프레임 획득!"));return}
  const achievement=event.target.closest("[data-claim-achievement]");
 if(achievement&&!achievement.disabled){doRpc("dori_pass_claim_achievement",{p_achievement_key:achievement.dataset.claimAchievement},r=>celebrate("시즌 업적 달성!","+"+fmt(r.coins)+" 돌돌코인을 획득했어요."));return}
 const cosmetic=event.target.closest("[data-equip-cosmetic]");
 if(cosmetic&&!cosmetic.disabled){doRpc("dori_pass_equip_cosmetic",{p_cosmetic_key:cosmetic.dataset.equipCosmetic},r=>celebrate("꾸미기 아이템 장착 완료!",(r.equipped&&r.equipped.name||"아이템")+"을(를) 장착했어요."))}
});
$("#claimAllButton").addEventListener("click",claimAll);
$("#jumpCurrent").addEventListener("click",()=>{
 const tier=Math.max(1,Number(dashboard&&dashboard.tier)||0);
 const node=$('[data-tier="'+(tier>=100?100:tier+1)+'"]');
 if(!node){toast("현재 위치를 찾지 못했어요.");return}
 node.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
 node.classList.add("node-focus-pulse");window.setTimeout(()=>node.classList.remove("node-focus-pulse"),1400);
});
$("#celebrationClose").addEventListener("click",closeCelebration);
$("#claimCelebration").addEventListener("click",event=>{if(event.target===$("#claimCelebration"))closeCelebration()});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeCelebration()});
$$(".pass-tab").forEach(tab=>tab.addEventListener("click",()=>{$$(".pass-tab").forEach(x=>x.classList.toggle("active",x===tab))}));
const sections=$$(".section-block[id]");
if("IntersectionObserver" in window&&sections.length){
 const observer=new IntersectionObserver(entries=>{
  const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(visible)$$(".pass-tab").forEach(tab=>tab.classList.toggle("active",tab.getAttribute("href")==="#"+visible.target.id));
 },{rootMargin:"-18% 0px -65% 0px",threshold:[0,.1,.3]});
 sections.forEach(section=>observer.observe(section));
}
function handleMapResize(){if(dashboard&&getColCount()!==lastMapColumns)renderTrack(dashboard);else scheduleMapRoute()}
window.addEventListener("resize",handleMapResize);
window.addEventListener("orientationchange",handleMapResize);
window.addEventListener("focus",()=>{if(!document.hidden&&!busy)loadDashboard({silent:true}).catch(e=>console.warn("[돌이 패스] 복귀 동기화 실패:",e))});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!busy)loadDashboard({silent:true}).catch(e=>console.warn("[돌이 패스] 화면 복귀 동기화 실패:",e))});
async function init(){
 try{await loadDashboard()}
 catch(error){
  console.error("[돌이 패스] 대시보드 로드 오류:",error);
  $("#loginRequired").hidden=true;$("#passApp").hidden=false;
  $("#dailyMissionGrid").innerHTML='<div class="loading-card">패스 정보를 불러오지 못했어요. <button class="small-outline" id="retryPass" type="button">다시 시도</button></div>';
  $("#retryPass")&&$("#retryPass").addEventListener("click",()=>init(),{once:true});
  toast(prettyError(error));
 }
}
supabase.auth.onAuthStateChange((event,session)=>{
 if(event==="SIGNED_IN"&&session)window.setTimeout(()=>loadDashboard({silent:true}).catch(e=>toast(prettyError(e))),0);
 else if(event==="SIGNED_OUT")window.setTimeout(()=>{$("#loginRequired").hidden=false;$("#passApp").hidden=true;$("#seasonStatus").textContent="로그인 필요"},0);
});
init();
