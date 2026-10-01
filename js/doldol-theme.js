/* DORI SITE — Unified Motion Engine v1.0 */
(()=>{"use strict";
 const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
 const q=(s)=>document.querySelector(s);
 const world=document.createElement("div");world.className="dori-world";world.innerHTML="<i class='a'></i><i class='b'></i><i class='c'></i>";document.body.prepend(world);
 const sheen=document.createElement("div");sheen.className="dori-sheen";document.body.append(sheen);
 const transition=document.createElement("div");transition.className="dori-page-transition";document.body.append(transition);
 document.documentElement.classList.add("dori-system");
 document.body.classList.add("dori-page");
 if(!reduce) requestAnimationFrame(()=>document.body.classList.add("dori-ready"));
 const mark=document.querySelector("main")||document.querySelector("#사이트")||document.body.firstElementChild;
 if(mark && !mark.classList.contains("dori-enter")) mark.classList.add("dori-enter");
 document.querySelectorAll("main section,main article,.card,.메뉴카드,.패널").forEach((el,i)=>{
   if(i<12 && !el.classList.contains("dori-enter")){el.style.animationDelay=(Math.min(i,8)*.045)+"s";el.classList.add("dori-enter")}
 });
 const leave=(url)=>{
   if(reduce){location.href=url;return}
   transition.classList.add("leaving");sheen.classList.add("show");
   setTimeout(()=>location.href=url,430);
 };
 document.addEventListener("click",(e)=>{
   const a=e.target.closest("a[href]");
   if(!a||e.defaultPrevented||a.target==="_blank"||a.hasAttribute("download"))return;
   const raw=a.getAttribute("href");if(!raw||raw.startsWith("#")||raw.startsWith("javascript:"))return;
   let u;try{u=new URL(raw,location.href)}catch{return}
   if(u.origin!==location.origin)return;
   const same=u.pathname===location.pathname&&u.search===location.search;if(same)return;
   e.preventDefault();leave(u.href);
 },true);
 window.addEventListener("pageshow",()=>{transition.classList.remove("leaving");sheen.classList.remove("show")});
 window.addEventListener("pagehide",()=>{});
 document.addEventListener("keydown",(e)=>{if(e.key==="Escape")document.body.classList.add("dori-escape")});
})();