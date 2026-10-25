import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const URL="https://scttowfhygcpdirrekqm.supabase.co";
const KEY="sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
const sb=window.doriSupabase||createClient(URL,KEY); if(!window.doriSupabase)window.doriSupabase=sb;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const num=v=>(Number(v)||0).toLocaleString("ko-KR");
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state=null,busy=false,toTimer=0;
const challengeIcons={show_up:"🗓️",lucky_drop:"🎁",focus_routine:"📚",chess_strategist:"♟️",market_maker:"📈",daily_goals:"🎯"};
const achievementIcons={first_100:"✦",tier_25:"🧭",tier_50:"💫",tier_100:"👑",weekly_hero:"🏅",multi_domain:"🌌"};
function toast(message){const el=$("#passToast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(toTimer);toTimer=setTimeout(()=>el.classList.remove("show"),3200)}
function celebrate(title,detail){$("#celebrationTitle").textContent=title;$("#celebrationDetail").textContent=detail;$("#claimCelebration").classList.add("show");$("#claimCelebration").setAttribute("aria-hidden","false")}
function closeCelebration(){$("#claimCelebration").classList.remove("show");$("#claimCelebration").setAttribute("aria-hidden","true")}
function obj(v){return Array.isArray(v)?(v[0]||{}):(v||{})}
function errText(e){const m=String(e&&e.message||"");if(/not unlocked|not_unlocked/i.test(m))return "아직 해제되지 않은 단계예요.";if(/already claimed|already_claimed|duplicate key/i.test(m))return "이미 수령한 보상이에요.";if(/not_completed/i.test(m))return "목표를 달성한 다음 받을 수 있어요.";if(/not_owned/i.test(m))return "보유한 아이템만 장착할 수 있어요.";if(/JWT|auth|login|로그인/i.test(m))return "로그인 상태를 확인한 뒤 다시 시도해 주세요.";return m.replace(/[<>]/g,"").slice(0,160)||"요청을 처리하지 못했어요."}
function progress(el,p){if(el)el.style.width=Math.max(0,Math.min(100,Number(p)||0))+"%"}
function renderHero(d){
 const s=d.season||{};
 $("#seasonLabel").textContent=s.name||(s.key||"")+" · 돌이 패스";
 $("#seasonStatus").textContent="시즌 "+(s.key||"");
 $("#seasonDay").innerHTML=num(s.day_number)+' <small>/ '+num(s.days_total)+'일</small>';
 $("#daysLeft").innerHTML=num(s.days_left)+' <small>일</small>';
 $("#heroXp").innerHTML=num(d.xp)+' <small>XP</small>';
 $("#heroProgressText").textContent=num(d.xp)+" / 10,000 XP";
 progress($("#heroProgressBar"),Math.min(100,(Number(d.xp)||0)/10000*100));
 $("#tierCount").innerHTML=num(d.tier)+'<span>/100</span>';
 $("#currentTier").textContent="LV. "+num(d.tier);
 $("#nextTierLabel").textContent=Number(d.tier)>=100?"시즌 패스 완주":"다음 단계까지";
 $("#nextTierXp").textContent=Number(d.tier)>=100?"모든 단계 해제":num(d.next_tier_xp)+" XP 남음";
 progress($("#tierProgressBar"),d.tier_progress);
 $("#weekReset").textContent="다음 월요일 00:00 · 한국 시간";
 $("#achievementCount").textContent=(d.achievements||[]).filter(a=>a.claimed).length+" / "+(d.achievements||[]).length;
 $("#collectionCount").textContent=num((d.cosmetics||[]).length);
 $("#lastUpdated").textContent="동기화 "+new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
}
function renderTier(t){
 const level=Number(t.tier)||0, cosmetics=Array.isArray(t.cosmetics)?t.cosmetics:[], c=cosmetics[0];
 const claimed=t.claimed===true, unlocked=t.unlocked===true, special=cosmetics.length>0;
 const classes=["tier-card",claimed?"claimed":"",unlocked?"unlocked":"",special?"special":"",level===Number(state&&state.tier)?"current":""].filter(Boolean).join(" ");
 const name=c?c.name:"시즌 돌돌코인", art=c&&c.icon?c.icon:(level%10===0?"✧":"◈");
 const label=claimed?"✓ 수령 완료":unlocked?"보상 받기":"🔒 잠김";
 return '<article class="'+classes+'" data-tier="'+level+'" style="animation-delay:'+(Math.min(24,level%24)*12)+'ms">'+
 '<div class="tier-top"><span class="tier-number">TIER '+String(level).padStart(2,"0")+'</span><span class="tier-status">'+(claimed?"✓":unlocked?"✦":"⌑")+'</span></div>'+
 '<div class="tier-art" aria-hidden="true">'+esc(art)+'</div><div class="tier-reward-name">'+esc(name)+'</div>'+
 '<div class="tier-coin">+'+num(t.coins)+' 🪙</div><button class="tier-action" type="button" data-claim-tier="'+level+'" '+(!unlocked||claimed?"disabled":"")+'>'+label+'</button></article>';
}
function renderChallenges(d){
 const items=Array.isArray(d.challenges)?d.challenges:[];
 $("#weeklyGrid").innerHTML=items.map(item=>{
  const n=Number(item.progress)||0, target=Math.max(1,Number(item.target)||1), done=n>=target, claimed=item.claimed===true, can=item.claimable===true;
  const label=claimed?"✓ 경험치 수령 완료":can?"패스 경험치 받기":done?"보상 수령하기":"도전 진행 중";
  return '<article class="challenge-card '+(claimed?"done":"")+'" data-challenge="'+esc(item.key)+'"><div class="challenge-heading"><div class="challenge-icon">'+(challengeIcons[item.key]||"✦")+'</div><div><h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p></div><div class="challenge-reward">+'+num(item.xp_reward)+' XP</div></div>'+
  '<div class="challenge-progress-label"><span>'+(claimed?"목표 달성 완료":done?"목표 달성 · 보상 수령 가능":"주간 목표 진행도")+'</span><strong>'+num(n)+' / '+num(target)+'</strong></div>'+
  '<div class="challenge-progress"><span style="width:'+Math.min(100,n/target*100)+'%"></span></div><button type="button" class="challenge-action" data-claim-challenge="'+esc(item.key)+'" '+(!can?"disabled":"")+'>'+label+'</button></article>';
 }).join("")||'<div class="loading-card">이번 주 도전을 불러오지 못했어요.</div>';
}
function renderAchievements(d){
 const items=Array.isArray(d.achievements)?d.achievements:[];
 $("#seasonAchievementGrid").innerHTML=items.map(item=>{
  const n=Math.max(0,Number(item.progress)||0), target=Math.max(1,Number(item.target)||1), claimed=item.claimed===true, can=item.claimable===true;
  return '<article class="season-achievement '+(claimed?"done":"")+'" data-achievement="'+esc(item.key)+'"><div class="achievement-emblem">'+(achievementIcons[item.key]||"✦")+'</div><div class="achievement-main"><div class="achievement-top"><h3>'+esc(item.title)+'</h3><span class="achievement-reward">+'+num(item.coin_reward)+' 🪙</span></div><p>'+esc(item.description)+'</p><div class="achievement-progressline"><span style="width:'+Math.min(100,n/target*100)+'%"></span></div><div class="achievement-bottom"><span>'+(claimed?"수령 완료":num(n)+" / "+num(target))+'</span><button type="button" class="achievement-action" data-claim-achievement="'+esc(item.key)+'" '+(!can?"disabled":"")+'>'+(claimed?"✓ 완료":can?"보상 받기":"진행 중")+'</button></div></div></article>';
 }).join("")||'<div class="loading-card">시즌 업적을 불러오지 못했어요.</div>';
}
function renderCollection(d){
 const items=Array.isArray(d.cosmetics)?d.cosmetics:[];
 if(!items.length){$("#collectionGrid").innerHTML='<div class="empty-collection">아직 보유한 패스 꾸미기 아이템이 없어요.<br>10·20·25단계 등의 주요 보상을 수령해 첫 아이템을 모아 보세요.</div>';return}
 const kinds={title:"칭호",profile_frame:"프로필 프레임",special_icon:"특별 아이콘"};
 $("#collectionGrid").innerHTML=items.map(item=>{
  const equipped=item.equipped===true, rarity=["Rare","Epic","Legendary","Myth","Doronum"].includes(item.rarity)?item.rarity:"Rare";
  return '<article class="cosmetic-card '+(equipped?"equipped":"")+'"><div class="cosmetic-icon">'+esc(item.icon||"✦")+'</div><span class="cosmetic-rarity '+rarity+'">'+esc(rarity.toUpperCase())+'</span><h3>'+esc(item.name)+'</h3><span class="cosmetic-detail">'+esc(kinds[item.kind]||"시즌 보상")+' · '+esc(item.season_key||"")+'</span><button class="cosmetic-equip" type="button" data-equip-cosmetic="'+esc(item.key)+'" '+(equipped?"disabled":"")+'>'+(equipped?"✓ 장착 중":"장착하기")+'</button></article>';
 }).join("");
}
function render(input){
 state=obj(input);renderHero(state);
 $("#rewardTrackGrid").innerHTML=(state.tiers||[]).map(renderTier).join("")||'<div class="loading-card">보상 트랙이 아직 준비되지 않았어요.</div>';
 renderChallenges(state);renderAchievements(state);renderCollection(state);
 $("#passApp").hidden=false;$("#loginRequired").hidden=true;
}
async function load({silent=false}={}){
 if(!silent)$("#rewardTrackGrid").innerHTML='<div class="loading-card"><span class="spinner"></span>보상 트랙을 불러오는 중이에요.</div>';
 const {data:sd,error:se}=await sb.auth.getSession();if(se)throw se;
 if(!sd||!sd.session||!sd.session.user){$("#loginRequired").hidden=false;$("#passApp").hidden=true;$("#seasonStatus").textContent="로그인 필요";return null}
 const {data,error}=await sb.rpc("dori_pass_get_dashboard");if(error)throw error;render(data);return state;
}
async function rpc(name,args,onSuccess){
 if(busy)return;busy=true;document.body.classList.add("pass-busy");
 try{
  const {data,error}=await sb.rpc(name,args);if(error)throw error;const result=obj(data);
  if(result.ok===false){
   const messages={not_unlocked:"아직 열리지 않은 단계예요.",already_claimed:"이미 수령한 보상이에요.",not_completed:"목표를 달성한 다음 받을 수 있어요.",not_owned:"보유한 아이템만 장착할 수 있어요.",unknown_challenge:"유효하지 않은 도전이에요.",unknown_achievement:"유효하지 않은 업적이에요."};
   toast(messages[result.reason]||"요청을 처리하지 못했어요.");await load({silent:true});return
  }
  await load({silent:true});if(onSuccess)onSuccess(result)
 }catch(e){console.error("[돌이 패스] "+name+" 오류:",e);toast(errText(e))}
 finally{busy=false;document.body.classList.remove("pass-busy")}
}
function claimTier(tier){rpc("dori_pass_claim_tier",{p_tier:Number(tier)},r=>{const list=Array.isArray(r.cosmetics)?r.cosmetics:[];celebrate(tier+"단계 보상 획득!","+"+num(r.coins)+" 돌돌코인"+(list.length?" · "+list.map(x=>x.name).join(", "):""))})}
function claimAll(){
 const count=(state&&state.tiers||[]).filter(t=>t.unlocked&&!t.claimed).length;if(!count){toast("지금 받을 수 있는 단계 보상이 없어요.");return}
 rpc("dori_pass_claim_all_available",{},r=>celebrate("보상을 한 번에 획득했어요!",num(r.claimed_count)+"개 단계 · +"+num(r.coins)+" 돌돌코인"))
}
document.addEventListener("click",e=>{
 const tier=e.target.closest("[data-claim-tier]");if(tier&&!tier.disabled){claimTier(tier.dataset.claimTier);return}
 const ch=e.target.closest("[data-claim-challenge]");if(ch&&!ch.disabled){rpc("dori_pass_claim_challenge",{p_challenge_key:ch.dataset.claimChallenge},r=>celebrate("주간 도전 완료!","+"+num(r.xp_reward)+" 패스 경험치를 획득했어요."));return}
 const ac=e.target.closest("[data-claim-achievement]");if(ac&&!ac.disabled){rpc("dori_pass_claim_achievement",{p_achievement_key:ac.dataset.claimAchievement},r=>celebrate("시즌 업적 달성!","+"+num(r.coins)+" 돌돌코인을 획득했어요."));return}
 const eq=e.target.closest("[data-equip-cosmetic]");if(eq&&!eq.disabled){rpc("dori_pass_equip_cosmetic",{p_cosmetic_key:eq.dataset.equipCosmetic},r=>celebrate("꾸미기 아이템 장착 완료",(r.equipped&&r.equipped.name||"아이템")+"을(를) 장착했어요."))}
});
$("#claimAllButton").addEventListener("click",claimAll);$("#claimAllSmall").addEventListener("click",claimAll);
$("#jumpCurrent").addEventListener("click",()=>{
 const level=Math.max(1,Number(state&&state.tier)||1),card=$('[data-tier="'+level+'"]');if(!card){toast("현재 단계 카드가 보이지 않아요.");return}
 card.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});card.classList.add("current-pulse");setTimeout(()=>card.classList.remove("current-pulse"),1300)
});
$("#celebrationClose").addEventListener("click",closeCelebration);
$("#claimCelebration").addEventListener("click",e=>{if(e.target===$("#claimCelebration"))closeCelebration()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCelebration()});
$$(".pass-tab").forEach(tab=>tab.addEventListener("click",()=>{$$(".pass-tab").forEach(x=>x.classList.toggle("active",x===tab))}));
const sections=$$(".section-block[id]");
if("IntersectionObserver" in window&&sections.length){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible)$$(".pass-tab").forEach(tab=>tab.classList.toggle("active",tab.getAttribute("href")==="#"+visible.target.id))},{rootMargin:"-18% 0px -65% 0px",threshold:[0,.1,.3]});sections.forEach(s=>observer.observe(s))}
async function init(){try{await load()}catch(e){console.error("[돌이 패스] 대시보드 로드 오류:",e);$("#loginRequired").hidden=true;$("#passApp").hidden=false;$("#rewardTrackGrid").innerHTML='<div class="loading-card">패스 정보를 불러오지 못했어요. <button class="small-outline" id="retryPass" type="button">다시 시도</button></div>';$("#retryPass")&&$("#retryPass").addEventListener("click",()=>init(),{once:true});toast(errText(e))}}
sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session)window.setTimeout(()=>load({silent:true}).catch(e=>toast(errText(e))),0);else if(event==="SIGNED_OUT")window.setTimeout(()=>{$("#loginRequired").hidden=false;$("#passApp").hidden=true;$("#seasonStatus").textContent="로그인 필요"},0)});
window.addEventListener("focus",()=>{if(!document.hidden&&!busy)load({silent:true}).catch(e=>console.warn("[돌이 패스] 복귀 동기화 실패:",e))});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!busy)load({silent:true}).catch(e=>console.warn("[돌이 패스] 화면 복귀 동기화 실패:",e))});
init();
