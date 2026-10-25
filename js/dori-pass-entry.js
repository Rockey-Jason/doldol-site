import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const URL="https://scttowfhygcpdirrekqm.supabase.co";
const KEY="sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
const sb=window.doriSupabase||createClient(URL,KEY);
if(!window.doriSupabase)window.doriSupabase=sb;
function installStyles(){
 if(document.getElementById("doriPassEntryStyles"))return;
 const style=document.createElement("style");style.id="doriPassEntryStyles";
 style.textContent=[
 '.dori-pass-menu-entry{position:relative!important;isolation:isolate;overflow:hidden;margin:5px 0!important;border:1px solid rgba(131,169,255,.27)!important;background:linear-gradient(100deg,rgba(75,107,206,.17),rgba(102,93,202,.08))!important;color:#e8efff!important}',
 '.dori-pass-menu-entry:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,transparent 20%,rgba(179,208,255,.10) 48%,transparent 72%);transform:translateX(-120%);transition:transform .55s ease}',
 '.dori-pass-menu-entry:hover:before{transform:translateX(120%)}',
 '.dori-pass-menu-entry .pass-entry-icon{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border:1px solid rgba(156,186,255,.24);border-radius:10px;background:linear-gradient(145deg,rgba(113,148,255,.25),rgba(76,91,178,.12));color:#e4efff;font-size:17px}',
 '.dori-pass-menu-entry .pass-entry-copy{display:flex;flex:1;flex-direction:column;gap:3px;min-width:0}',
 '.dori-pass-menu-entry .pass-entry-copy strong{font-weight:400;color:#f0f4ff}.dori-pass-menu-entry .pass-entry-copy small{font-size:10px;font-weight:400;color:#a2b4df;line-height:1.4}',
 '.dori-pass-menu-entry .pass-entry-arrow{color:#a5c7ff;font-size:18px;margin-left:auto}.dori-pass-menu-entry:hover{border-color:rgba(160,195,255,.48)!important;box-shadow:0 8px 25px rgba(69,104,211,.12)}',
 '.dori-pass-menu-entry .pass-entry-progress{height:3px;margin-top:3px;overflow:hidden;background:rgba(255,255,255,.08);border-radius:99px}.dori-pass-menu-entry .pass-entry-progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,#7d8fff,#8de8ff);border-radius:inherit;transition:width .6s cubic-bezier(.22,1,.36,1)}',
 '.dori-pass-menu-card .이미지틀{position:relative;isolation:isolate;overflow:hidden;border-color:rgba(137,171,255,.3)!important;background:radial-gradient(circle at 50% 42%,rgba(78,123,245,.25),transparent 45%),linear-gradient(145deg,#172b60,#09112e 68%,#11153b)!important}',
 '.dori-pass-menu-card .이미지틀:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 18%,rgba(255,255,255,.15) 48%,transparent 67%);transform:translateX(-120%);animation:doriPassCardSweep 7s ease-in-out infinite}',
 '.dori-pass-menu-card .pass-card-art{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}.dori-pass-menu-card .pass-card-orbit{position:absolute;width:70%;aspect-ratio:1;border:1px solid rgba(155,190,255,.3);border-radius:50%;transform:scaleY(.48) rotate(-27deg);box-shadow:0 0 22px rgba(112,156,255,.12)}',
 '.dori-pass-menu-card .pass-card-orbit.two{width:84%;transform:scaleY(.48) rotate(38deg);border-color:rgba(167,148,255,.23)}',
 '.dori-pass-menu-card .pass-card-gem{position:relative;display:grid;place-items:center;width:72px;height:72px;border:1px solid rgba(202,229,255,.65);border-radius:20px 12px 20px 12px;transform:rotate(45deg);background:linear-gradient(135deg,rgba(180,218,255,.38),rgba(79,112,206,.35) 50%,rgba(109,119,231,.22));box-shadow:0 0 32px rgba(110,160,255,.3),inset 0 0 18px rgba(225,242,255,.18);animation:doriPassGemFloat 4s ease-in-out infinite}',
 '.dori-pass-menu-card .pass-card-gem span{transform:rotate(-45deg);font:800 30px Arial,sans-serif;color:#eff7ff;text-shadow:0 0 15px rgba(151,197,255,.75)}',
 '.dori-pass-menu-card .pass-card-label{position:absolute;left:14px;top:14px;font:700 8px Arial,sans-serif;letter-spacing:2px;color:#a9c9ff}.dori-pass-menu-card .pass-card-season{position:absolute;left:14px;right:14px;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:6px;color:#b7c9ed;font-size:10px}.dori-pass-menu-card .pass-card-season strong{color:#e0eaff;font:700 10px Arial,sans-serif}',
 '.dori-pass-menu-card .메인버튼{align-items:center;gap:10px}.dori-pass-menu-card .pass-card-arrow{color:#a7c7ff;font-size:22px;transition:transform .3s ease}.dori-pass-menu-card .메인버튼:hover .pass-card-arrow{transform:translateX(4px)}.dori-pass-menu-card .카드설명{color:#a4b5d7}',
 '#doriPassAvatarFrame{position:fixed;z-index:101;top:13px;right:15px;width:68px;height:68px;border:2px solid rgba(145,181,255,.7);border-radius:50%;pointer-events:none;box-shadow:0 0 15px rgba(105,152,255,.25),inset 0 0 0 3px rgba(8,14,40,.65)}',
 '#doriPassAvatarBadge{position:fixed;z-index:102;top:59px;right:13px;width:23px;height:23px;display:grid;place-items:center;border:1px solid rgba(192,221,255,.48);border-radius:9px;background:linear-gradient(145deg,#273d7c,#111c43);color:#edf7ff;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none}',
 '@keyframes doriPassCardSweep{0%,40%{transform:translateX(-120%)}70%,100%{transform:translateX(120%)}}@keyframes doriPassGemFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}',
 '@media(max-width:650px){.dori-pass-menu-card .pass-card-gem{width:62px;height:62px}.dori-pass-menu-card .pass-card-gem span{font-size:26px}#doriPassAvatarFrame{width:65px;height:65px;top:14px;right:16px}#doriPassAvatarBadge{top:56px;right:13px}}',
 '@media(prefers-reduced-motion:reduce){.dori-pass-menu-entry:before,.dori-pass-menu-entry .pass-entry-progress span,.dori-pass-menu-card .pass-card-gem,.dori-pass-menu-card .이미지틀:before{animation:none!important;transition:none!important}}'
 ].join("\n");
 document.head.appendChild(style);
}
function installMenuButton(){
 const menu=document.getElementById("메뉴");if(!menu||document.getElementById("돌이패스버튼"))return;
 const b=document.createElement("button");b.id="돌이패스버튼";b.type="button";b.className="프로필버튼 dori-pass-menu-entry";
 b.innerHTML='<span class="pass-entry-icon" aria-hidden="true">✦</span><span class="pass-entry-copy"><strong>돌이 패스</strong><small id="doriPassEntrySub">이번 시즌 보상 확인</small><span class="pass-entry-progress"><span id="doriPassEntryProgress"></span></span></span><span class="pass-entry-arrow" aria-hidden="true">↗</span>';
 b.addEventListener("click",()=>{location.href="dori-pass.html"});
 const missions=document.getElementById("일일미션버튼");
 if(missions&&missions.parentElement===menu)missions.insertAdjacentElement("afterend",b);else menu.prepend(b);
}
function installMainCard(){
 const grid=document.querySelector(".메뉴영역");if(!grid||document.getElementById("돌이패스메인카드"))return;
 const card=document.createElement("article");card.id="돌이패스메인카드";card.className="메뉴카드 dori-pass-menu-card";card.style.animationDelay=".36s";
 card.innerHTML='<div class="이미지틀" aria-hidden="true"><div class="pass-card-art"><span class="pass-card-label">MONTHLY PROGRESSION</span><span class="pass-card-orbit"></span><span class="pass-card-orbit two"></span><span class="pass-card-gem"><span>D</span></span><span class="pass-card-season"><span id="doriPassCardSeason">이번 시즌 · 100단계</span><strong id="doriPassCardTier">LEVEL —</strong></span></div></div><button class="메인버튼" type="button" id="doriPassCardOpen">돌이 패스 <span class="pass-card-arrow" aria-hidden="true">↗</span></button><p class="카드설명">사이트 활동으로 성장하고 시즌 한정 보상을 모아 보세요.</p>';
 const open=()=>{location.href="dori-pass.html"};card.querySelector("#doriPassCardOpen").addEventListener("click",open);card.querySelector(".이미지틀").addEventListener("click",open);grid.appendChild(card);
}
function applyCosmetics(items){
 const frame=(items||[]).find(x=>x.kind==="profile_frame"&&x.equipped),icon=(items||[]).find(x=>x.kind==="special_icon"&&x.equipped),avatar=document.getElementById("돌이사진");if(!avatar)return;
 let frameEl=document.getElementById("doriPassAvatarFrame"),badge=document.getElementById("doriPassAvatarBadge");
 if(!frame){if(frameEl)frameEl.remove()}else{
  if(!frameEl){frameEl=document.createElement("span");frameEl.id="doriPassAvatarFrame";document.body.appendChild(frameEl)}
  const colors={Rare:"#89b9ff",Epic:"#ae9aff",Legendary:"#ffd985",Myth:"#ff91a9",Doronum:"#82eaff"},color=colors[frame.rarity]||colors.Rare;
  frameEl.style.borderColor=color;frameEl.style.boxShadow="0 0 17px "+color+"66,inset 0 0 0 3px rgba(8,14,40,.65)";frameEl.title=frame.name||"돌이 패스 프로필 프레임";
 }
 if(!icon){if(badge)badge.remove()}else{
  if(!badge){badge=document.createElement("span");badge.id="doriPassAvatarBadge";document.body.appendChild(badge)}
  badge.textContent=icon.icon||"✦";badge.title=icon.name||"돌이 패스 특별 아이콘";
 }
}
async function sync(){
 try{
  const {data:sd}=await sb.auth.getSession(),session=sd&&sd.session;
  const sub=document.getElementById("doriPassEntrySub"),bar=document.getElementById("doriPassEntryProgress");
  if(!session){if(sub)sub.textContent="로그인 후 시즌 보상 확인";if(bar)bar.style.width="0%";return}
  const {data,error}=await sb.rpc("dori_pass_get_dashboard");if(error)throw error;
  const d=Array.isArray(data)?data[0]:data;if(!d||!d.ok)return;
  const pct=Math.min(100,(Number(d.xp)||0)/10000*100);
  if(sub)sub.textContent=(d.season&&d.season.name?d.season.name:"이번 시즌")+" · "+(Number(d.tier)||0)+"/100단계";
  if(bar)bar.style.width=pct+"%";
  const season=document.getElementById("doriPassCardSeason"),tier=document.getElementById("doriPassCardTier");
  if(season)season.textContent=(d.season&&d.season.name?d.season.name:"이번 시즌")+" · "+(Number(d.xp)||0).toLocaleString("ko-KR")+" XP";
  if(tier)tier.textContent="LEVEL "+(Number(d.tier)||0);
  window.doriPassCosmetics=Array.isArray(d.cosmetics)?d.cosmetics:[];
  window.dispatchEvent(new CustomEvent('dori:pass-cosmetics-updated'));
  applyCosmetics(window.doriPassCosmetics);
 }catch(e){console.warn("[돌이 패스] 메인 진행도 동기화 실패:",e)}
}
function init(){installStyles();installMenuButton();installMainCard();sync();sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session)sync();if(event==="SIGNED_OUT"){window.doriPassCosmetics=[];window.dispatchEvent(new CustomEvent("dori:pass-cosmetics-updated"));applyCosmetics([]);sync()}})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
