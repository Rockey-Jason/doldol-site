/* DORI SITE FINAL MOTION ENGINE v2 */
(()=>{"use strict";
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
const $=(s)=>document.querySelector(s);
const world=document.createElement("div");world.className="dori-world";world.innerHTML="<i class=a></i><i class=b></i><i class=c></i>";document.body.prepend(world);
const sheen=document.createElement("div");sheen.className="dori-sheen";document.body.append(sheen);
const transition=document.createElement("div");transition.className="dori-page-transition";document.body.append(transition);
const loader=document.createElement("div");loader.className="dori-loader";loader.innerHTML='<div class="dori-loader-core"><div class="dori-loader-mark">D</div><div class="dori-loader-name">돌이사이트</div><div class="dori-loader-sub">DOLDOL SYSTEM</div><div class="dori-loader-bar"><i></i></div></div>';document.body.append(loader);

// Unified Dori site home navigation — single canonical button
const HOME_URL="https://rockey-jason.github.io/doldol-site/";
const isHomeHref=(raw)=>{
  if(!raw)return false;
  try{
    const u=new URL(raw,location.href);
    const sameOrigin=u.origin===location.origin;
    return (sameOrigin&&(u.pathname.endsWith("/index.html")||u.pathname.endsWith("/"))) ||
      u.href===HOME_URL || u.href===HOME_URL+"index.html";
  }catch{return false}
};
const normalizeHomeButton=(a)=>{
  a.classList.add("dori-home-button");
  a.classList.remove("dori-home-float");
  a.dataset.doriHome="true";
  a.setAttribute("aria-label","돌이사이트 메인으로 이동");
  a.href=HOME_URL;
  a.innerHTML='<span class="dori-home-symbol" aria-hidden="true">D</span><span class="dori-home-label">돌이사이트</span><span class="dori-home-arrow" aria-hidden="true">↗</span>';
};
const candidates=[...document.querySelectorAll("a[href]")].filter(a=>isHomeHref(a.getAttribute("href")));
const legacy=document.getElementById("뒤로가기");
if(legacy&&!candidates.includes(legacy))candidates.push(legacy);
let canonical=candidates.find(a=>a.offsetWidth>0&&a.offsetHeight>0)||candidates[0]||null;
if(canonical){
  normalizeHomeButton(canonical);
  candidates.filter(a=>a!==canonical).forEach(a=>{
    a.classList.remove("dori-home-button","dori-home-float");
    a.dataset.doriHomeDuplicate="true";
    a.setAttribute("aria-hidden","true");
    a.style.display="none";
  });
}else if(!(location.pathname.endsWith("/index.html")||location.pathname.endsWith("/"))){
  const home=document.createElement("a");
  home.href=HOME_URL;
  home.className="dori-home-button dori-home-float";
  home.dataset.doriHome="true";
  home.innerHTML='<span class="dori-home-symbol" aria-hidden="true">D</span><span class="dori-home-label">돌이사이트</span><span class="dori-home-arrow" aria-hidden="true">↗</span>';
  home.setAttribute("aria-label","돌이사이트 메인으로 이동");
  document.body.append(home);
}
document.documentElement.classList.add("dori-system");document.body.classList.add("dori-page");
const root=document.querySelector("main")||document.querySelector("#사이트")||document.body.firstElementChild;
if(root&&!root.classList.contains("dori-enter"))root.classList.add("dori-enter");
const targets=document.querySelectorAll("main section,main article,.card,.메뉴카드,.패널,[class*='card'],[class*='카드']");
targets.forEach((el,i)=>{if(i<18&&!el.classList.contains("dori-enter")){el.style.animationDelay=(.04+Math.min(i,12)*.035)+"s";el.classList.add("dori-enter")}});
if(!reduce){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("dori-visible");io.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll("section,article").forEach(e=>{if(!e.classList.contains("dori-enter"))io.observe(e)})}
const finish=()=>setTimeout(()=>loader.classList.add("done"),reduce?80:Math.min(900,Math.max(420,(performance.now?.()||600))));
if(document.readyState==="complete")finish();else addEventListener("load",finish,{once:true});
const leave=url=>{if(reduce){location.href=url;return}transition.classList.add("leaving");sheen.classList.add("show");setTimeout(()=>location.href=url,480)};
document.addEventListener("click",e=>{
 const a=e.target.closest("a[href]");if(!a||e.defaultPrevented||a.target==="_blank"||a.hasAttribute("download"))return;
 const raw=a.getAttribute("href");if(!raw||raw[0]==="#"||raw.startsWith("javascript:"))return;
 let u;try{u=new URL(raw,location.href)}catch{return}
 if(u.origin!==location.origin||u.pathname===location.pathname&&u.search===location.search)return;
 e.preventDefault();leave(u.href);
},true);
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b||b.disabled)return;
 b.animate([{transform:"scale(1)"},{transform:"scale(.965)"},{transform:"scale(1)"}],{duration:230,easing:"cubic-bezier(.2,.8,.2,1)"});
});
document.addEventListener("pointermove",e=>{
 const card=e.target.closest(".dori-glass,[class*='card'],[class*='카드']");if(!card||innerWidth<800)return;
 const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
 if(Math.abs(x)>.5||Math.abs(y)>.5)return;
 card.style.transform="perspective(900px) rotateX("+(-y*1.6)+"deg) rotateY("+(x*1.6)+"deg) translateY(-2px)";
},{passive:true});
document.addEventListener("pointerout",e=>{const c=e.target.closest(".dori-glass,[class*='card'],[class*='카드']");if(c)c.style.transform=""});
addEventListener("pageshow",()=>{transition.classList.remove("leaving");sheen.classList.remove("show")});
})();

// DOLDOL SECURITIES TAB NAVIGATION
// doldolstock.html의 data-tab 버튼과 section-* 영역을 연결한다.
if (document.querySelector(".tabs .tab[data-tab]")) {
  const activateDoldolTab = (tabName) => {
    document.querySelectorAll(".tabs .tab[data-tab]").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });
    document.querySelectorAll(".section[id^='section-']").forEach((section) => {
      section.classList.toggle("active", section.id === "section-" + tabName);
    });
  };

  document.querySelectorAll(".tabs .tab[data-tab]").forEach((tab) => {
    if (tab.dataset.doldolTabBound === "true") return;
    tab.dataset.doldolTabBound = "true";
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateDoldolTab(tab.dataset.tab);
    });
  });
}
