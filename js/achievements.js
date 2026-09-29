/* =========================================================
   돌이사이트 공통 업적 시스템
   - Supabase claim_achievement RPC를 단일 진입점으로 사용
   - 새 업적만 팝업 큐에 추가
   - 신문/코인 조건은 페이지를 열 때마다 서버 상태를 확인
========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpckVxqmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";

// 메인 페이지가 이미 인증에 사용 중인 클라이언트를 최우선으로 재사용한다.
// 이렇게 하면 업적 모듈과 로그인/프로필 시스템이 서로 다른 세션 저장소를 사용하지 않는다.
const supabase = window.doriSupabase || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  queue: [],
  showing: false,
  timer: null,
  closeTimer: null,
  initialized: false,
  checkPromise: null,
  authErrorUntil: 0,
  backgroundTimer: null,
  backgroundChain: 0,
  backgroundChainResetTimer: null
};

function ensureStyles() {
  if (document.getElementById("dori-achievement-global-style")) return;

  const style = document.createElement("style");
  style.id = "dori-achievement-global-style";
  style.textContent = `#dori-achievement-global-popup{position:fixed;top:22px;right:22px;z-index:2147483000;width:min(458px,calc(100vw - 32px));pointer-events:none;font-family:"HancomMalrangmalrang","Noto Sans KR",sans-serif}
.dori-achievement-card{--rarity-color:#d4deee;--rarity-accent:#fff;--rarity-soft:rgba(205,218,238,.12);--rarity-glow:rgba(170,190,220,.2);--rarity-deep:rgba(11,19,43,.98);--rarity-speed:.72;position:relative;overflow:hidden;isolation:isolate;display:grid;grid-template-columns:76px 1fr;gap:16px;align-items:center;padding:18px 20px;border:1px solid color-mix(in srgb,var(--rarity-color) 38%,rgba(255,255,255,.12));border-radius:23px;background:radial-gradient(circle at 92% 4%,var(--rarity-soft),transparent 34%),linear-gradient(135deg,var(--rarity-deep),rgba(4,7,24,.97));box-shadow:0 24px 76px rgba(0,0,0,.54),0 0 34px var(--rarity-glow);backdrop-filter:blur(24px) saturate(135%);-webkit-backdrop-filter:blur(24px) saturate(135%);opacity:0;transform:translate3d(38px,-12px,0) scale(.955);filter:blur(3px)}
.dori-achievement-card::before,.dori-achievement-card::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit}
.dori-achievement-card::before{z-index:-2;background:radial-gradient(circle at 18% 115%,var(--rarity-soft),transparent 45%);animation:doriRarityAura calc(5.5s / var(--rarity-speed)) ease-in-out infinite}
.dori-achievement-card::after{z-index:7;border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px rgba(255,255,255,.13),inset 0 -1px rgba(0,0,0,.22)}
.dori-achievement-card.show{animation:doriAchievementIn .72s cubic-bezier(.22,1,.36,1) forwards}
.dori-achievement-card.closing{animation:doriAchievementOut .76s cubic-bezier(.22,1,.36,1) forwards}
.dori-achievement-icon{position:relative;z-index:8;width:70px;height:70px;border-radius:20px;display:grid;place-items:center;font-size:36px;background:radial-gradient(circle at 35% 25%,rgba(255,255,255,.2),transparent 30%),radial-gradient(circle,var(--rarity-soft),rgba(255,255,255,.025) 70%);border:1px solid color-mix(in srgb,var(--rarity-color) 62%,transparent);box-shadow:inset 0 1px rgba(255,255,255,.18),0 0 22px var(--rarity-glow);animation:doriAchievementIconIn .8s cubic-bezier(.22,1,.36,1) both;will-change:transform,filter,box-shadow}
.dori-achievement-copy{position:relative;z-index:8;min-width:0}
.dori-achievement-kicker{font-size:9px;letter-spacing:.19em;color:var(--rarity-color);font-weight:900;margin-bottom:4px;text-shadow:0 0 12px var(--rarity-glow)}
.dori-achievement-title{font-size:20px;line-height:1.2;font-weight:900;color:#fff;margin-bottom:3px;text-shadow:0 0 15px rgba(255,255,255,.08)}
.dori-achievement-name{font-size:16px;line-height:1.3;font-weight:850;color:#e6ecff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dori-achievement-desc{margin-top:5px;font-size:12px;line-height:1.45;color:rgba(235,240,255,.68)}
.dori-achievement-rewards{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.dori-achievement-rewards span{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.055);color:#eaf0ff}
.dori-achievement-shine,.dori-achievement-particles,.dori-achievement-rays,.dori-achievement-sparkles,.dori-achievement-orbit,.dori-achievement-prism{position:absolute;inset:0;pointer-events:none}
.dori-achievement-shine{z-index:3;background:linear-gradient(110deg,transparent 24%,rgba(255,255,255,.13) 47%,transparent 66%);transform:translateX(-125%);animation:doriAchievementShine 4.8s .45s ease-in-out infinite}
.dori-achievement-particles{z-index:2;opacity:.55;background-image:radial-gradient(circle at 8% 32%,var(--rarity-color) 0 1px,transparent 2px),radial-gradient(circle at 19% 78%,var(--rarity-accent) 0 1px,transparent 2px),radial-gradient(circle at 42% 14%,var(--rarity-color) 0 1px,transparent 2px),radial-gradient(circle at 76% 23%,var(--rarity-accent) 0 1px,transparent 2px),radial-gradient(circle at 92% 72%,var(--rarity-color) 0 1.2px,transparent 2.4px),radial-gradient(circle at 67% 90%,var(--rarity-color) 0 1px,transparent 2px);animation:doriAchievementParticles calc(4.2s / var(--rarity-speed)) ease-in-out infinite}
.dori-achievement-rays{z-index:1;opacity:.16;background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,var(--rarity-soft) 18deg,transparent 35deg,var(--rarity-soft) 57deg,transparent 76deg,var(--rarity-soft) 104deg,transparent 128deg);animation:doriAchievementRays calc(10s / var(--rarity-speed)) linear infinite}
.dori-achievement-sparkles{z-index:4;opacity:.35;background-image:radial-gradient(circle at 12% 18%,#fff 0 1.3px,transparent 2px),radial-gradient(circle at 91% 24%,var(--rarity-color) 0 1.7px,transparent 2.5px),radial-gradient(circle at 68% 88%,#fff 0 1.2px,transparent 2px),radial-gradient(circle at 38% 8%,var(--rarity-color) 0 1.4px,transparent 2px);animation:doriAchievementSparkles calc(3.5s / var(--rarity-speed)) ease-in-out infinite}
.dori-achievement-orbit{z-index:6;inset:-22px;opacity:0;border-radius:28px;border:1px solid transparent;background:linear-gradient(90deg,transparent,var(--rarity-color),transparent) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:doriOrbit calc(4.5s / var(--rarity-speed)) linear infinite}
.dori-achievement-prism{z-index:0;opacity:0;background:linear-gradient(115deg,transparent 10%,rgba(91,247,255,.14) 35%,rgba(121,112,255,.12) 50%,rgba(255,92,213,.12) 65%,transparent 90%);background-size:220% 100%;animation:doriPrism 3.8s linear infinite}
.dori-rarity-common{--rarity-color:#d4deee;--rarity-accent:#fff;--rarity-soft:rgba(205,218,238,.12);--rarity-glow:rgba(170,190,220,.2);--rarity-deep:rgba(11,19,43,.98);--rarity-speed:.72}
.dori-rarity-rare{--rarity-color:#66b8ff;--rarity-accent:#d9f5ff;--rarity-soft:rgba(54,157,255,.17);--rarity-glow:rgba(42,145,255,.3);--rarity-deep:rgba(7,20,48,.98);--rarity-speed:.9}
.dori-rarity-epic{--rarity-color:#c58aff;--rarity-accent:#f0dfff;--rarity-soft:rgba(160,82,255,.2);--rarity-glow:rgba(155,65,255,.36);--rarity-deep:rgba(24,10,49,.98);--rarity-speed:1}
.dori-rarity-legendary{--rarity-color:#ffd66b;--rarity-accent:#fff2bd;--rarity-soft:rgba(255,182,40,.21);--rarity-glow:rgba(255,170,35,.48);--rarity-deep:rgba(44,28,7,.98);--rarity-speed:1.08;border-color:rgba(255,206,93,.54);box-shadow:0 25px 82px rgba(0,0,0,.58),0 0 36px rgba(255,175,40,.42),0 0 80px rgba(255,135,20,.14)}
.dori-rarity-myth{--rarity-color:#ff5e83;--rarity-accent:#ffd0db;--rarity-soft:rgba(255,40,88,.22);--rarity-glow:rgba(255,35,90,.5);--rarity-deep:rgba(45,7,24,.98);--rarity-speed:1.16;border-color:rgba(255,82,115,.58);box-shadow:0 27px 90px rgba(0,0,0,.62),0 0 40px rgba(255,35,90,.46),0 0 92px rgba(180,20,55,.17)}
.dori-rarity-doronum{--rarity-color:#69f7ff;--rarity-accent:#e8ffff;--rarity-soft:rgba(38,229,255,.26);--rarity-glow:rgba(28,232,255,.72);--rarity-deep:rgba(3,34,54,.99);--rarity-speed:1.32;border-color:rgba(112,249,255,.78);box-shadow:0 30px 100px rgba(0,0,0,.66),0 0 42px rgba(35,232,255,.68),0 0 105px rgba(45,105,255,.3),0 0 150px rgba(70,235,255,.1);background:radial-gradient(circle at 82% 4%,rgba(50,240,255,.22),transparent 35%),radial-gradient(circle at 10% 100%,rgba(85,105,255,.18),transparent 38%),linear-gradient(135deg,rgba(5,44,65,.99),rgba(3,9,30,.99))}
.dori-rarity-legendary .dori-achievement-icon,.dori-rarity-myth .dori-achievement-icon,.dori-rarity-doronum .dori-achievement-icon{animation:doriAchievementIconIn .8s cubic-bezier(.22,1,.36,1) both,doriAchievementPulse calc(2.5s / var(--rarity-speed)) 1s ease-in-out infinite}
.dori-rarity-legendary .dori-achievement-rays,.dori-rarity-myth .dori-achievement-rays{opacity:.28}
.dori-rarity-legendary .dori-achievement-orbit{opacity:.62}
.dori-rarity-myth .dori-achievement-orbit{opacity:.74;inset:-25px}
.dori-rarity-myth .dori-achievement-sparkles{opacity:.62}
.dori-rarity-doronum .dori-achievement-prism{opacity:1}
.dori-rarity-doronum .dori-achievement-orbit{opacity:.9;inset:-30px;border-width:2px}
.dori-rarity-doronum .dori-achievement-rays{opacity:.48}
.dori-rarity-doronum .dori-achievement-sparkles{opacity:.9}
.dori-rarity-doronum .dori-achievement-title,.dori-rarity-doronum .dori-achievement-name{text-shadow:0 0 10px rgba(69,241,255,.34),0 0 24px rgba(70,120,255,.18)}
.dori-rarity-legendary .dori-achievement-title{color:#fff7d6;text-shadow:0 0 16px rgba(255,188,48,.35)}
.dori-rarity-myth .dori-achievement-title{color:#ffe6ec;text-shadow:0 0 18px rgba(255,50,95,.42)}
.dori-rarity-doronum .dori-achievement-icon{box-shadow:inset 0 1px rgba(255,255,255,.28),0 0 26px rgba(40,232,255,.62),0 0 50px rgba(80,100,255,.24)}.dori-rarity-myth .dori-achievement-prism{opacity:.72;background:linear-gradient(115deg,transparent 5%,rgba(255,35,75,.12) 28%,rgba(255,95,125,.24) 48%,rgba(170,20,65,.16) 68%,transparent 94%);background-size:240% 100%;animation:doriMythPrism 2.7s linear infinite}
.dori-rarity-myth .dori-achievement-rays{background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,rgba(255,40,80,.4) 16deg,transparent 31deg,rgba(255,100,130,.26) 52deg,transparent 72deg,rgba(255,35,75,.35) 103deg,transparent 130deg);animation:doriAchievementRays 5.5s linear infinite}
.dori-rarity-myth .dori-achievement-particles{opacity:.8}
.dori-rarity-doronum .dori-achievement-prism{opacity:1;background:linear-gradient(105deg,transparent 4%,rgba(70,245,255,.08) 18%,rgba(77,255,238,.34) 34%,rgba(102,174,255,.22) 47%,rgba(223,255,255,.2) 55%,rgba(55,220,255,.3) 67%,rgba(102,122,255,.2) 80%,transparent 96%);background-size:300% 100%;animation:doriDoronumPrism 2.1s linear infinite}
.dori-rarity-doronum .dori-achievement-rays{opacity:.62;animation:doriAchievementRays 4.2s linear infinite}
.dori-rarity-doronum .dori-achievement-particles{opacity:1;animation:doriAchievementParticles 2.5s ease-in-out infinite}
.dori-rarity-doronum .dori-achievement-sparkles{opacity:1;animation:doriAchievementSparkles 1.9s ease-in-out infinite}
.dori-rarity-doronum .dori-achievement-shine{animation:doriAchievementShine 2.7s .2s ease-in-out infinite}
.dori-rarity-doronum .dori-achievement-icon{animation:doriAchievementIconIn .8s cubic-bezier(.22,1,.36,1) both,doriDoronumIcon 2.15s ease-in-out 1s infinite}
.dori-rarity-doronum .dori-achievement-title{animation:doriDoronumText 2.4s ease-in-out infinite}
@keyframes doriMythPrism{0%{background-position:240% 0;transform:translateX(-2%)}100%{background-position:-40% 0;transform:translateX(2%)}}
@keyframes doriDoronumPrism{0%{background-position:300% 0;filter:hue-rotate(0deg) brightness(.9)}45%{filter:hue-rotate(8deg) brightness(1.18)}100%{background-position:-60% 0;filter:hue-rotate(-8deg) brightness(1)}}
@keyframes doriDoronumIcon{0%,100%{transform:scale(1) rotate(0deg);filter:brightness(1);box-shadow:inset 0 1px rgba(255,255,255,.3),0 0 28px rgba(40,232,255,.7),0 0 58px rgba(80,100,255,.3)}50%{transform:scale(1.055) rotate(.8deg);filter:brightness(1.22);box-shadow:inset 0 1px rgba(255,255,255,.4),0 0 44px rgba(80,245,255,.92),0 0 86px rgba(80,120,255,.45)}}
@keyframes doriDoronumText{0%,100%{text-shadow:0 0 10px rgba(69,241,255,.3),0 0 24px rgba(70,120,255,.16)}50%{text-shadow:0 0 14px rgba(150,255,255,.62),0 0 34px rgba(60,180,255,.35),0 0 58px rgba(70,100,255,.18)}}

.dori-rarity-legendary .dori-achievement-icon{box-shadow:inset 0 1px rgba(255,255,255,.28),0 0 27px rgba(255,185,50,.48)}
.dori-rarity-myth .dori-achievement-icon{box-shadow:inset 0 1px rgba(255,255,255,.25),0 0 30px rgba(255,45,90,.55)}
@keyframes doriAchievementIn{0%{opacity:0;transform:translate3d(38px,-12px,0) scale(.955);filter:blur(3px)}65%{opacity:1;transform:translate3d(-3px,2px,0) scale(1.008);filter:blur(0)}100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}}
@keyframes doriAchievementOut{0%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}35%{opacity:1;transform:translate3d(4px,-2px,0) scale(.995);filter:blur(0)}100%{opacity:0;transform:translate3d(48px,-18px,0) scale(.94);filter:blur(4px)}}
@keyframes doriAchievementIconIn{0%{opacity:0;transform:scale(.55) rotate(-12deg)}65%{opacity:1;transform:scale(1.06) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes doriAchievementShine{0%,72%{transform:translateX(-125%)}88%,100%{transform:translateX(125%)}}
@keyframes doriAchievementParticles{0%,100%{opacity:.28;transform:translate3d(0,8px,0) scale(.98)}50%{opacity:.72;transform:translate3d(-5px,-9px,0) scale(1.05)}}
@keyframes doriAchievementRays{0%{transform:rotate(0deg) scale(.95)}100%{transform:rotate(360deg) scale(1.08)}}
@keyframes doriAchievementSparkles{0%,100%{opacity:.24;transform:scale(.94)}50%{opacity:.92;transform:scale(1.1)}}
@keyframes doriRarityAura{0%,100%{transform:scale(.96);opacity:.65}50%{transform:scale(1.06);opacity:1}}
@keyframes doriOrbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes doriPrism{0%{background-position:220% 0}100%{background-position:-20% 0}}
@keyframes doriAchievementPulse{0%,100%{filter:brightness(1);transform:scale(1);box-shadow:inset 0 1px rgba(255,255,255,.18),0 0 22px var(--rarity-glow)}50%{filter:brightness(1.16);transform:scale(1.035);box-shadow:inset 0 1px rgba(255,255,255,.27),0 0 42px var(--rarity-glow)}}

/* =========================================================
   업적 달성 사이트 배경 효과
   - 팝업과 분리된 전용 레이어
   - Legendary / Myth / Doronum만 사용
   - 화면 전체를 뒤덮지 않고 은은한 광원과 느린 파동만 표시
========================================================= */
#dori-achievement-background{position:fixed;inset:0;z-index:2147482990;pointer-events:none;overflow:hidden;opacity:0;visibility:hidden;transform:translateZ(0);transition:opacity 1.15s cubic-bezier(.22,1,.36,1),visibility 1.15s ease,filter 1.05s ease;will-change:opacity,filter}
#dori-achievement-background.active{animation:doriBackgroundEnter 1.05s cubic-bezier(.16,1,.3,1) both}
#dori-achievement-background.active::after{content:"";position:absolute;inset:-15%;background:radial-gradient(circle at 50% 48%,rgba(255,255,255,.18),transparent 17%),conic-gradient(from 0deg at 50% 50%,transparent 0deg,var(--bg-flare,transparent) 24deg,transparent 48deg,var(--bg-flare,transparent) 92deg,transparent 126deg,var(--bg-flare,transparent) 188deg,transparent 224deg,var(--bg-flare,transparent) 292deg,transparent 332deg);mix-blend-mode:screen;opacity:0;animation:doriBackgroundBurst 1.65s cubic-bezier(.16,1,.3,1) both;pointer-events:none}
#dori-achievement-background.active .dori-bg-ring:nth-child(2){animation-delay:.18s}
#dori-achievement-background.active .dori-bg-ring:nth-child(3){animation-delay:.36s}
#dori-achievement-background.active{opacity:1;visibility:visible}
#dori-achievement-background .dori-bg-vignette{position:absolute;inset:0;background:radial-gradient(circle at 82% 10%,var(--bg-glow,transparent),transparent 27%),radial-gradient(circle at 14% 88%,var(--bg-glow-soft,transparent),transparent 30%);mix-blend-mode:screen;opacity:.62}
#dori-achievement-background .dori-bg-bloom{position:absolute;inset:-20%;background:radial-gradient(ellipse at 50% 48%,var(--bg-bloom,transparent) 0%,transparent 35%);filter:blur(28px);opacity:.22;animation:doriBackgroundBloom 4.8s ease-in-out infinite}
#dori-achievement-background .dori-bg-ring{position:absolute;left:50%;top:50%;width:min(78vw,1050px);height:min(78vw,1050px);transform:translate(-50%,-50%) scale(.78);border:1px solid var(--bg-ring,transparent);border-radius:50%;opacity:0;box-shadow:0 0 70px var(--bg-ring-glow,transparent),inset 0 0 70px var(--bg-ring-glow,transparent);animation:doriBackgroundRing 4.8s cubic-bezier(.2,.8,.2,1) forwards}
#dori-achievement-background .dori-bg-sheen{position:absolute;inset:-10%;background:linear-gradient(112deg,transparent 35%,var(--bg-sheen,transparent) 50%,transparent 65%);transform:translateX(-110%);opacity:.2;animation:doriBackgroundSheen 3.8s .15s ease-out forwards}
#dori-achievement-background .dori-bg-stars{position:absolute;inset:-5%;background-image:radial-gradient(circle at 7% 16%,var(--bg-star,transparent) 0 1.5px,transparent 2.5px),radial-gradient(circle at 24% 34%,var(--bg-star,transparent) 0 1px,transparent 2px),radial-gradient(circle at 49% 12%,var(--bg-star,transparent) 0 1.6px,transparent 2.6px),radial-gradient(circle at 73% 28%,var(--bg-star,transparent) 0 1px,transparent 2px),radial-gradient(circle at 91% 13%,var(--bg-star,transparent) 0 1.4px,transparent 2.4px),radial-gradient(circle at 84% 67%,var(--bg-star,transparent) 0 1.5px,transparent 2.5px),radial-gradient(circle at 16% 79%,var(--bg-star,transparent) 0 1.2px,transparent 2.2px),radial-gradient(circle at 55% 88%,var(--bg-star,transparent) 0 1px,transparent 2px);opacity:0;animation:doriBackgroundStars 4.8s ease-out .1s forwards}
#dori-achievement-background .dori-bg-rays{display:none!important}
#dori-achievement-background .dori-bg-dots{position:absolute;inset:0;opacity:.28;background-image:radial-gradient(circle at 18% 22%,var(--bg-dot,transparent) 0 1px,transparent 2px),radial-gradient(circle at 78% 19%,var(--bg-dot,transparent) 0 1px,transparent 2px),radial-gradient(circle at 86% 74%,var(--bg-dot,transparent) 0 1.2px,transparent 2.4px),radial-gradient(circle at 27% 81%,var(--bg-dot,transparent) 0 1px,transparent 2px);animation:doriBackgroundDots 4.8s ease-in-out forwards}

#dori-achievement-background .dori-bg-wave{
  position:absolute;
  left:50%;
  top:47%;
  width:min(34vw,520px);
  height:min(34vw,520px);
  border:1px solid var(--bg-wave,transparent);
  border-radius:50%;
  transform:translate(-50%,-50%) scale(.18);
  opacity:0;
  box-shadow:0 0 26px var(--bg-wave-glow,transparent),inset 0 0 20px var(--bg-wave-inner,transparent);
  filter:blur(.15px);
  will-change:transform,opacity;
  mix-blend-mode:screen;
  pointer-events:none;
}
#dori-achievement-background.active .dori-bg-wave{animation:doriBackgroundWave 5.8s cubic-bezier(.18,.72,.24,1) infinite}
#dori-achievement-background.active .dori-bg-wave.wave-2{animation-delay:1.35s}
#dori-achievement-background.active .dori-bg-wave.wave-3{animation-delay:2.7s}
#dori-achievement-background.active .dori-bg-wave.wave-4{animation-delay:4.05s}
#dori-achievement-background .dori-bg-wave.wave-2{width:min(44vw,680px);height:min(44vw,680px)}
#dori-achievement-background .dori-bg-wave.wave-3{width:min(56vw,860px);height:min(56vw,860px)}
#dori-achievement-background .dori-bg-wave.wave-4{width:min(70vw,1080px);height:min(70vw,1080px)}
#dori-achievement-background.legendary{--bg-wave:rgba(255,224,130,.62);--bg-wave-glow:rgba(255,188,55,.25);--bg-wave-inner:rgba(255,230,150,.08)}
#dori-achievement-background.myth{--bg-wave:rgba(255,125,150,.58);--bg-wave-glow:rgba(255,45,90,.25);--bg-wave-inner:rgba(255,120,150,.07)}
#dori-achievement-background.doronum{--bg-wave:rgba(145,255,255,.72);--bg-wave-glow:rgba(35,232,255,.34);--bg-wave-inner:rgba(110,245,255,.1)}
@keyframes doriBackgroundWave{
  0%{opacity:0;transform:translate(-50%,-50%) scale(.18)}
  12%{opacity:.72}
  38%{opacity:.46}
  72%{opacity:.14}
  100%{opacity:0;transform:translate(-50%,-50%) scale(1.18)}
}

#dori-achievement-background .dori-bg-triangles{position:absolute;inset:0;overflow:hidden;pointer-events:none;perspective:none;z-index:5;transform:translateZ(0)}
#dori-achievement-background .dori-bg-triangles i{
  position:absolute;display:block;
  width:clamp(30px,4.2vw,72px);height:clamp(30px,4.2vw,72px);
  opacity:0;pointer-events:none;
  clip-path:polygon(50% 0%,100% 100%,0% 100%);
  background:linear-gradient(145deg,var(--bg-triangle-fill,rgba(255,255,255,.09)),rgba(255,255,255,.015));
  filter:drop-shadow(0 0 9px var(--bg-triangle-glow,transparent));
  transform-origin:50% 55%;
  will-change:transform,opacity;
}
#dori-achievement-background .dori-bg-triangles i::after{
  content:"";position:absolute;inset:2px;
  clip-path:polygon(50% 0%,100% 100%,0% 100%);
  background:linear-gradient(145deg,rgba(255,255,255,.08),transparent 68%);
  opacity:.8;
}
#dori-achievement-background .dori-bg-triangles i:nth-child(1){left:8%;top:18%;animation:doriTriangleFloat1 6.4s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(2){left:23%;top:70%;width:clamp(20px,2.7vw,46px);height:clamp(20px,2.7vw,46px);animation:doriTriangleFloat2 7.2s .45s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(3){left:42%;top:10%;width:clamp(24px,3.1vw,52px);height:clamp(24px,3.1vw,52px);animation:doriTriangleFloat3 7.8s .8s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(4){left:68%;top:23%;width:clamp(36px,4.9vw,80px);height:clamp(36px,4.9vw,80px);animation:doriTriangleFloat4 6.9s .2s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(5){left:84%;top:64%;width:clamp(22px,3vw,54px);height:clamp(22px,3vw,54px);animation:doriTriangleFloat5 8.1s .65s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(6){left:57%;top:78%;width:clamp(28px,3.8vw,62px);height:clamp(28px,3.8vw,62px);animation:doriTriangleFloat6 7.4s 1s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(7){left:3%;top:54%;width:clamp(18px,2.3vw,40px);height:clamp(18px,2.3vw,40px);animation:doriTriangleFloat7 6.7s .35s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(8){left:76%;top:88%;width:clamp(16px,2.1vw,36px);height:clamp(16px,2.1vw,36px);animation:doriTriangleFloat8 8.6s .75s ease-in-out infinite}
#dori-achievement-background .dori-bg-triangles i:nth-child(1),#dori-achievement-background .dori-bg-triangles i:nth-child(4){--triangle-scale:1.12}
#dori-achievement-background .dori-bg-triangles i:nth-child(2),#dori-achievement-background .dori-bg-triangles i:nth-child(5),#dori-achievement-background .dori-bg-triangles i:nth-child(8){--triangle-scale:.82}
@keyframes doriTriangleFloat1{
  0%{opacity:0;transform:translate3d(-10px,20px,0) rotateZ(-8deg) scale(.72)}
  18%{opacity:.82} 50%{opacity:.52;transform:translate3d(42px,-28px,0) rotateZ(18deg) scale(var(--triangle-scale,1))}
  78%{opacity:.7} 100%{opacity:0;transform:translate3d(88px,-64px,0) rotateZ(42deg) scale(.52)}
}
@keyframes doriTriangleFloat2{
  0%{opacity:0;transform:translate3d(8px,-8px,0) rotateZ(12deg) scale(.58)}
  22%{opacity:.68} 50%{opacity:.4;transform:translate3d(-32px,-50px,0) rotateZ(-26deg) scale(var(--triangle-scale,1))}
  78%{opacity:.58} 100%{opacity:0;transform:translate3d(-64px,-92px,0) rotateZ(-58deg) scale(.4)}
}
@keyframes doriTriangleFloat3{
  0%{opacity:0;transform:translate3d(0,18px,0) rotateZ(0deg) scale(.68)}
  20%{opacity:.72} 52%{opacity:.42;transform:translate3d(28px,48px,0) rotateZ(30deg) scale(1.08)}
  80%{opacity:.6} 100%{opacity:0;transform:translate3d(66px,82px,0) rotateZ(68deg) scale(.38)}
}
@keyframes doriTriangleFloat4{
  0%{opacity:0;transform:translate3d(14px,5px,0) rotateZ(-15deg) scale(.75)}
  17%{opacity:.88} 48%{opacity:.48;transform:translate3d(-64px,32px,0) rotateZ(-36deg) scale(var(--triangle-scale,1))}
  82%{opacity:.72} 100%{opacity:0;transform:translate3d(-112px,68px,0) rotateZ(-72deg) scale(.46)}
}
@keyframes doriTriangleFloat5{
  0%{opacity:0;transform:translate3d(-8px,0,0) rotateZ(8deg) scale(.54)}
  24%{opacity:.64} 55%{opacity:.38;transform:translate3d(46px,-40px,0) rotateZ(38deg) scale(.94)}
  82%{opacity:.54} 100%{opacity:0;transform:translate3d(88px,-72px,0) rotateZ(78deg) scale(.36)}
}
@keyframes doriTriangleFloat6{
  0%{opacity:0;transform:translate3d(0,12px,0) rotateZ(-5deg) scale(.64)}
  20%{opacity:.7} 50%{opacity:.4;transform:translate3d(-52px,-26px,0) rotateZ(-42deg) scale(1.05)}
  80%{opacity:.6} 100%{opacity:0;transform:translate3d(-90px,-58px,0) rotateZ(-86deg) scale(.38)}
}
@keyframes doriTriangleFloat7{
  0%{opacity:0;transform:translate3d(5px,5px,0) rotateZ(15deg) scale(.52)}
  25%{opacity:.58} 54%{opacity:.34;transform:translate3d(34px,-38px,0) rotateZ(52deg) scale(.88)}
  84%{opacity:.5} 100%{opacity:0;transform:translate3d(66px,-66px,0) rotateZ(98deg) scale(.3)}
}
@keyframes doriTriangleFloat8{
  0%{opacity:0;transform:translate3d(-5px,-4px,0) rotateZ(-10deg) scale(.5)}
  20%{opacity:.62} 50%{opacity:.36;transform:translate3d(-38px,-48px,0) rotateZ(-40deg) scale(.94)}
  80%{opacity:.52} 100%{opacity:0;transform:translate3d(-72px,-90px,0) rotateZ(-82deg) scale(.32)}
}
#dori-achievement-background.legendary{--bg-triangle:#ffe7a3;--bg-triangle-fill:rgba(255,210,100,.18);--bg-triangle-glow:rgba(255,190,60,.62)}
#dori-achievement-background.myth{--bg-triangle:#ffb0c2;--bg-triangle-fill:rgba(255,65,100,.18);--bg-triangle-glow:rgba(255,45,90,.68)}
#dori-achievement-background.doronum{--bg-triangle:#bfffff;--bg-triangle-fill:rgba(55,235,255,.2);--bg-triangle-glow:rgba(45,235,255,.78)}
@media(prefers-reduced-motion:reduce){#dori-achievement-background .dori-bg-triangles i{animation:none!important;opacity:.28!important;transform:none!important}}
#dori-achievement-background .dori-bg-dots::before,#dori-achievement-background .dori-bg-dots::after{content:"";position:absolute;inset:-10%;border-radius:50%;pointer-events:none}
#dori-achievement-background .dori-bg-dots::before{background:radial-gradient(circle at 22% 34%,var(--bg-dot,transparent) 0 1px,transparent 2.5px),radial-gradient(circle at 58% 72%,var(--bg-dot,transparent) 0 1.2px,transparent 2.7px),radial-gradient(circle at 91% 43%,var(--bg-dot,transparent) 0 1px,transparent 2.4px);animation:doriBackgroundFloat 6.4s ease-in-out infinite}
#dori-achievement-background .dori-bg-dots::after{background:radial-gradient(ellipse at 50% 50%,transparent 0 35%,var(--bg-flare,transparent) 36%,transparent 52%);filter:blur(18px);opacity:.22;animation:doriBackgroundHalo 5.6s ease-in-out infinite}
#dori-achievement-background .dori-bg-ring:nth-child(7){animation-duration:5.8s}
#dori-achievement-background .dori-bg-ring:nth-child(8){animation-duration:6.8s}

#dori-achievement-background.legendary{--bg-glow:rgba(255,190,55,.22);--bg-glow-soft:rgba(255,170,40,.12);--bg-bloom:rgba(255,186,46,.24);--bg-ring:rgba(255,210,105,.42);--bg-ring-glow:rgba(255,177,35,.16);--bg-sheen:rgba(255,239,174,.34);--bg-dot:#ffe49a;--bg-star:#fff3b0;--bg-ray:rgba(255,210,90,.08);--bg-flare:rgba(255,210,90,.10)}
#dori-achievement-background.myth{--bg-glow:rgba(255,48,93,.23);--bg-glow-soft:rgba(230,25,70,.11);--bg-bloom:rgba(255,40,84,.23);--bg-ring:rgba(255,102,130,.38);--bg-ring-glow:rgba(255,35,90,.16);--bg-sheen:rgba(255,196,208,.28);--bg-dot:#ffc0ce;--bg-star:#ffd6df;--bg-ray:rgba(255,70,110,.08);--bg-flare:rgba(255,70,110,.10)}
#dori-achievement-background.doronum{--bg-glow:rgba(42,232,255,.24);--bg-glow-soft:rgba(68,104,255,.12);--bg-bloom:rgba(35,225,255,.25);--bg-ring:rgba(112,249,255,.5);--bg-ring-glow:rgba(35,225,255,.22);--bg-sheen:rgba(220,255,255,.4);--bg-dot:#bffcff;--bg-star:#dfffff;--bg-ray:rgba(80,240,255,.11);--bg-flare:rgba(80,240,255,.13)}
@keyframes doriBackgroundBloom{0%,100%{transform:scale(.9);opacity:.13}45%{transform:scale(1.06);opacity:.28}}
@keyframes doriBackgroundRing{0%{opacity:0;transform:translate(-50%,-50%) scale(.78)}18%{opacity:.42}100%{opacity:0;transform:translate(-50%,-50%) scale(1.18)}}
@keyframes doriBackgroundSheen{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}
@keyframes doriBackgroundEnter{0%{opacity:0;filter:brightness(.72) saturate(.8);transform:scale(1.035)}42%{opacity:1;filter:brightness(1.28) saturate(1.28);transform:scale(1)}100%{opacity:1;filter:brightness(1) saturate(1);transform:scale(1)}}
@keyframes doriBackgroundBurst{0%{opacity:0;transform:scale(.45) rotate(-12deg)}24%{opacity:.8;transform:scale(.92) rotate(8deg)}100%{opacity:0;transform:scale(1.25) rotate(28deg)}}
@keyframes doriBackgroundStars{0%{opacity:0;transform:scale(.9) translateY(10px)}22%{opacity:.72}65%{opacity:.42}100%{opacity:0;transform:scale(1.08) translateY(-16px)}}
@keyframes doriBackgroundRays{0%{opacity:0;transform:translate(-50%,-50%) rotate(0deg) scale(.88)}18%{opacity:.28}70%{opacity:.14}100%{opacity:0;transform:translate(-50%,-50%) rotate(360deg) scale(1.08)}}
@keyframes doriBackgroundDots{0%{opacity:0;transform:scale(.96)}25%{opacity:.32}75%{opacity:.2}100%{opacity:0;transform:scale(1.03)}}
@keyframes doriBackgroundFloat{0%,100%{transform:translate3d(-1%,1%,0) scale(.98);opacity:.18}50%{transform:translate3d(1.5%,-1.5%,0) scale(1.04);opacity:.46}}
@keyframes doriBackgroundHalo{0%,100%{transform:scale(.84);opacity:.08}50%{transform:scale(1.12);opacity:.34}}



/* 고등급 팝업 전용 고급 연출 */
.dori-rarity-legendary{transform-origin:90% 10%}
.dori-rarity-myth{transform-origin:88% 12%;background-image:radial-gradient(circle at 96% 0%,rgba(255,92,125,.24),transparent 30%),radial-gradient(circle at 5% 100%,rgba(125,10,45,.2),transparent 38%),linear-gradient(135deg,var(--rarity-deep),rgba(12,4,20,.98))}
.dori-rarity-doronum{transform-origin:90% 8%;background-image:radial-gradient(circle at 88% 0%,rgba(84,250,255,.25),transparent 30%),radial-gradient(circle at 5% 100%,rgba(65,95,255,.18),transparent 38%),linear-gradient(135deg,rgba(5,44,65,.99),rgba(3,9,30,.99))}
.dori-rarity-legendary.show{animation:doriLegendaryIn .9s cubic-bezier(.16,1,.3,1) forwards}
.dori-rarity-myth.show{animation:doriMythIn 1s cubic-bezier(.16,1,.3,1) forwards}
.dori-rarity-doronum.show{animation:doriDoronumIn 1.12s cubic-bezier(.12,1,.25,1) forwards}
.dori-rarity-legendary.closing,.dori-rarity-myth.closing,.dori-rarity-doronum.closing{animation:doriAchievementOut .76s cubic-bezier(.22,1,.36,1) forwards}
.dori-rarity-legendary .dori-achievement-kicker,.dori-rarity-myth .dori-achievement-kicker,.dori-rarity-doronum .dori-achievement-kicker{letter-spacing:.22em}
.dori-rarity-legendary .dori-achievement-name{color:#fff4c7}
.dori-rarity-myth .dori-achievement-name{color:#ffe1e8}
.dori-rarity-doronum .dori-achievement-name{color:#dfffff}
.dori-rarity-myth .dori-achievement-title{animation:doriMythTitle 2.2s ease-in-out infinite}
.dori-rarity-legendary .dori-achievement-icon{animation:doriLegendaryIcon 2.4s ease-in-out 1s infinite}
@keyframes doriLegendaryIn{0%{opacity:0;transform:translate3d(42px,-18px,0) scale(.78) rotate(2deg);filter:blur(7px) brightness(1.6)}48%{opacity:1;transform:translate3d(-4px,2px,0) scale(1.025) rotate(0);filter:blur(0) brightness(1.18)}100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:none}}
@keyframes doriMythIn{0%{opacity:0;transform:translate3d(52px,-22px,0) scale(.7) rotate(3deg);filter:blur(9px) brightness(1.8)}38%{opacity:1;transform:translate3d(-6px,3px,0) scale(1.035) rotate(-.4deg);filter:blur(0) brightness(1.25)}65%{transform:translate3d(2px,-1px,0) scale(.995) rotate(.2deg)}100%{opacity:1;transform:translate3d(0,0,0) scale(1) rotate(0);filter:none}}
@keyframes doriDoronumIn{0%{opacity:0;transform:translate3d(58px,-28px,0) scale(.62) rotate(4deg);filter:blur(12px) brightness(2)}32%{opacity:1;transform:translate3d(-7px,3px,0) scale(1.045) rotate(-.5deg);filter:blur(0) brightness(1.35)}55%{transform:translate3d(2px,-1px,0) scale(.992)}76%{transform:translate3d(0,0,0) scale(1.008)}100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:none}}
@keyframes doriLegendaryIcon{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.07) rotate(-1deg);filter:brightness(1.22) drop-shadow(0 0 12px rgba(255,200,70,.55))}}
@keyframes doriMythTitle{0%,100%{transform:translateX(0);text-shadow:0 0 12px rgba(255,50,90,.28)}50%{transform:translateX(1px);text-shadow:0 0 18px rgba(255,50,90,.58),0 0 34px rgba(255,50,90,.22)}}

@media(max-width:600px){#dori-achievement-global-popup{top:12px;right:12px;width:calc(100vw - 24px)}.dori-achievement-card{grid-template-columns:58px 1fr;gap:12px;padding:15px}.dori-achievement-icon{width:56px;height:56px;font-size:29px}.dori-achievement-title{font-size:18px}}
@media(prefers-reduced-motion:reduce){.dori-achievement-card,.dori-achievement-icon,.dori-achievement-shine,.dori-achievement-particles,.dori-achievement-rays,.dori-achievement-sparkles,.dori-achievement-orbit,.dori-achievement-prism{animation:none!important}.dori-achievement-card{opacity:1;transform:none;filter:none}.dori-achievement-card.closing{opacity:0}#dori-achievement-background{transition:none!important}.dori-bg-bloom,.dori-bg-ring,.dori-bg-sheen,.dori-bg-dots,.dori-bg-stars,.dori-bg-rays{animation:none!important}.dori-bg-dots::before,.dori-bg-dots::after{animation:none!important}}
/* ===== FULL-SITE ACHIEVEMENT WORLD / CHAIN EFFECT ===== */
#사이트{position:relative!important;z-index:1!important}
#dori-achievement-background{
  z-index:0!important;
  background:
    radial-gradient(circle at 50% 45%,rgba(255,255,255,.10),transparent 18%),
    linear-gradient(135deg,#03034a,#050516 72%)!important;
  opacity:0!important;
  visibility:hidden!important;
  transition:opacity 1.15s cubic-bezier(.22,1,.36,1),background 1.05s ease,filter 1.05s ease!important;
}
#dori-achievement-background.active{opacity:1!important;visibility:visible!important}
#dori-achievement-background::before{
  content:"";
  position:absolute;
  inset:-12%;
  background:
    radial-gradient(circle at 50% 45%,rgba(255,255,255,.16),transparent 20%),
    radial-gradient(circle at 10% 15%,rgba(255,255,255,.09),transparent 30%),
    radial-gradient(circle at 90% 85%,rgba(255,255,255,.07),transparent 34%);
  filter:blur(14px);
  animation:doriAchievementWorldPulse 1.15s cubic-bezier(.2,.8,.2,1) 2;
}
#dori-achievement-background.legendary{
  background:
    radial-gradient(circle at 50% 42%,rgba(255,249,184,.62),transparent 22%),
    radial-gradient(circle at 12% 18%,rgba(255,196,48,.48),transparent 34%),
    radial-gradient(circle at 88% 82%,rgba(255,116,22,.38),transparent 42%),
    linear-gradient(135deg,#704800,#2b1900 48%,#0d0802 100%)!important;
}
#dori-achievement-background.myth{
  background:
    radial-gradient(circle at 50% 42%,rgba(255,92,116,.56),transparent 22%),
    radial-gradient(circle at 10% 18%,rgba(205,0,47,.55),transparent 35%),
    radial-gradient(circle at 90% 82%,rgba(104,0,32,.48),transparent 43%),
    linear-gradient(135deg,#650820,#28000d 48%,#0d0208 100%)!important;
}
#dori-achievement-background.doronum{
  background:
    radial-gradient(circle at 50% 42%,rgba(225,255,255,.68),transparent 21%),
    radial-gradient(circle at 10% 18%,rgba(45,241,255,.56),transparent 34%),
    radial-gradient(circle at 90% 82%,rgba(55,137,255,.52),transparent 42%),
    linear-gradient(135deg,#08617f,#073a5c 45%,#04152f 100%)!important;
}
#dori-achievement-background.chain-2{filter:hue-rotate(12deg) saturate(1.08)}
#dori-achievement-background.chain-3{filter:hue-rotate(-14deg) saturate(1.12)}
#dori-achievement-background.chain-4{filter:hue-rotate(26deg) saturate(1.14)}
#dori-achievement-background.chain-5{filter:hue-rotate(-28deg) saturate(1.16)}
#dori-achievement-background.chain-6{filter:hue-rotate(42deg) saturate(1.18)}
#dori-achievement-background.chain-7{filter:hue-rotate(-45deg) saturate(1.2)}
#dori-achievement-background.chain-8{filter:hue-rotate(60deg) saturate(1.22)}
#dori-achievement-background.chain-9{filter:hue-rotate(-62deg) saturate(1.24)}
#dori-achievement-background.chain-10{filter:hue-rotate(78deg) saturate(1.26)}
#dori-achievement-background.chain-11{filter:hue-rotate(-82deg) saturate(1.28)}
#dori-achievement-background.chain-12{filter:hue-rotate(98deg) saturate(1.30)}
@keyframes doriAchievementWorldPulse{
  0%{transform:scale(.92);opacity:.12}
  35%{transform:scale(1.08);opacity:.95}
  100%{transform:scale(1.16);opacity:.18}
}
@media(prefers-reduced-motion:reduce){
  #dori-achievement-background::before{animation:none!important}
}
`;
  document.head.appendChild(style);
}
function popupElement() {
  let el = document.getElementById("dori-achievement-global-popup");
  if (!el) {
    el = document.createElement("div");
    el.id = "dori-achievement-global-popup";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  return el;
}


function backgroundEffectElement() {
  let el = document.getElementById("dori-achievement-background");
  if (!el) {
    el = document.createElement("div");
    el.id = "dori-achievement-background";
    el.innerHTML = '<div class="dori-bg-vignette"></div><div class="dori-bg-bloom"></div><div class="dori-bg-triangles"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="dori-bg-stars"></div><div class="dori-bg-rays"></div><div class="dori-bg-wave wave-1"></div><div class="dori-bg-wave wave-2"></div><div class="dori-bg-wave wave-3"></div><div class="dori-bg-wave wave-4"></div><div class="dori-bg-sheen"></div><div class="dori-bg-dots"></div>';
    document.body.appendChild(el);
  }
  return el;
}

function triggerBackgroundEffect(rarity) {
  if (!["legendary", "myth", "doronum"].includes(rarity)) return;

  const bg = backgroundEffectElement();

  // 한 번의 연속 업적 체인을 하나의 시퀀스로 유지합니다.
  state.backgroundChain = (state.backgroundChain || 0) + 1;
  const chain = ((state.backgroundChain - 1) % 12) + 1;

  clearTimeout(state.backgroundChainResetTimer);
  state.backgroundChainResetTimer = setTimeout(() => {
    state.backgroundChain = 0;
  }, 9000);

  clearTimeout(state.backgroundTimer);

  bg.className = `${rarity} active chain-${chain}`;
  // 애니메이션을 한 프레임 뒤에 재시작해 연속 업적에서도 광원/링이 끊기지 않도록 합니다.
  requestAnimationFrame(() => {
    if (bg.classList.contains("active")) {
      void bg.offsetWidth;
      bg.className = `${rarity} active chain-${chain}`;
    }
  });

  // 다음 업적이 큐에서 나올 때까지 충분히 유지합니다.
  state.backgroundTimer = setTimeout(() => {
    bg.classList.remove("active");
  }, 7480);
}

function showNext() {
  if (state.showing || !state.queue.length) return;
  state.showing = true;

  const data = state.queue.shift();
  const popup = popupElement();
  const rawRarity = String(data.rarity || "Common");
  const rarity = /도로늄|doronum/i.test(rawRarity) || /도로늄/.test(String(data.name || "")) ? "doronum" : rawRarity.toLowerCase().replace(/[^a-z]/g, "");
  const rarityLabel = { common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY", doronum: "DORONUM", myth: "MYTH" }[rarity] || rawRarity.toUpperCase();
  triggerBackgroundEffect(rarity);

  popup.innerHTML = `
    <div class="dori-achievement-card dori-rarity-${rarity}">
      <div class="dori-achievement-prism"></div>
      <div class="dori-achievement-rays"></div>
      <div class="dori-achievement-particles"></div>
      <div class="dori-achievement-sparkles"></div>
      <div class="dori-achievement-orbit"></div>
      <div class="dori-achievement-shine"></div>
      <div class="dori-achievement-icon">${data.icon || "🏆"}</div>
      <div class="dori-achievement-copy">
        <div class="dori-achievement-kicker">${rarityLabel} · ACHIEVEMENT UNLOCKED</div>
        <div class="dori-achievement-title">🏆 업적 달성!</div>
        <div class="dori-achievement-name">${escapeHtml(data.name || "새 업적")}</div>
        <div class="dori-achievement-desc">${escapeHtml(data.description || "")}</div>
        <div class="dori-achievement-rewards">
          ${Number(data.reward_doldolcoin || 0) > 0 ? `<span>💰 +${Number(data.reward_doldolcoin).toLocaleString()} 돌돌코인</span>` : ""}
          ${Number(data.reward_exp || 0) > 0 ? `<span>✨ +${Number(data.reward_exp).toLocaleString()} EXP</span>` : ""}
          ${data.title ? `<span>🏷️ ${escapeHtml(data.title)}</span>` : ""}
        </div>
      </div>
    </div>`;

  const card = popup.firstElementChild;
  requestAnimationFrame(() => card.classList.add("show"));

  clearTimeout(state.timer);
  clearTimeout(state.closeTimer);
  state.timer = setTimeout(() => {
    card.classList.remove("show");
    card.classList.add("closing");

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    state.closeTimer = setTimeout(() => {
      popup.innerHTML = "";
      state.showing = false;
      setTimeout(showNext, 180);
    }, reduced ? 0 : 760);
  }, 6500);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

async function claim(id) {
  if (!id) return null;

  // 401/인증 오류가 난 직후에는 같은 요청을 여러 이벤트가 동시에 반복하지 않는다.
  if (Date.now() < state.authErrorUntil) return null;

  let { data, error } = await supabase.rpc("claim_achievement", {
    p_achievement_id: id
  });

  if (error) {
    const authError = Number(error?.status || error?.code || 0) === 401 ||
      /invalid api key|jwt|unauthorized/i.test(String(error?.message || ""));

    if (authError) {
      // 오래된 access token 때문에 401이 발생한 경우 세션을 먼저 갱신한 뒤 한 번만 재시도한다.
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed?.session) {
        state.authErrorUntil = Date.now() + 10000;
        console.warn("[Dori Achievement] Supabase 인증 갱신 실패. 10초 후 재시도합니다.", refreshError || error);
        return null;
      }

      ({ data, error } = await supabase.rpc("claim_achievement", {
        p_achievement_id: id
      }));

      if (!error) {
        // 재시도 성공
      } else {
        state.authErrorUntil = Date.now() + 10000;
        console.warn("[Dori Achievement] Supabase 인증 오류. 10초 후 재시도합니다.", error);
        return null;
      }
    } else {
      console.warn("[Dori Achievement] claim failed:", id, error);
      return null;
    }
  }

  if (data?.success && !data?.already_claimed) {
    const rawRarity = String(data.rarity || "");
    const rarity = /도로늄|doronum/i.test(rawRarity) || /도로늄/.test(String(data.name || "")) ? "doronum" : rawRarity.toLowerCase().replace(/[^a-z]/g, "");
    state.queue.push(data);
    showNext();
  }

  return data;
}

async function checkSiteAchievements() {
  // focus/pageshow/interval/auth 이벤트가 동시에 발생해도 한 번만 검사한다.
  if (state.checkPromise) return state.checkPromise;

  state.checkPromise = (async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user) return;

  // 돌돌코인 업적은 브라우저의 Number로 금액을 비교하지 않는다.
  // 특히 1경(10^16)은 JS 안전 정수 범위를 넘으므로 서버가 bigint로 직접 판정한다.
  // 각 RPC가 users 행을 잠그고 보상을 반영하므로 연속 달성도 안전하다.
  await claim("rich");
  await claim("very_rich");
  await claim("super_rich");
  await claim("rockey_7777777");

  const userId = sessionData.session.user.id;
  let { data: user, error } = await supabase
    .from("users")
    .select("doldolcoin, read_dori_news, user_achievement")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && (Number(error?.status || error?.code || 0) === 401 || /invalid api key|jwt|unauthorized/i.test(String(error?.message || "")))) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed?.session) {
      ({ data: user, error } = await supabase
        .from("users")
        .select("doldolcoin, read_dori_news, user_achievement")
        .eq("user_id", userId)
        .maybeSingle());
    }
  }

  if (error || !user) {
    console.warn("[Dori Achievement] users 조회 실패:", error || "user row 없음");
    return;
  }

  const owned = user.user_achievement && typeof user.user_achievement === "object" ? user.user_achievement : {};
  const need = id => !owned[id];

  // Supabase bigint/text 값 모두 안전하게 비교할 수 있도록 문자열 기반 정수 비교를 사용합니다.
  const coinValue = (() => {
    const raw = user.doldolcoin;
    const normalized = String(raw ?? "").replace(/,/g, "").trim();
    if (!normalized) return 0n;
    try { return BigInt(normalized); } catch { return 0n; }
  })();

  // 서버의 claim_achievement가 실제 보유 코인을 다시 검증하므로,
  // 여기서는 직접 보상 금액을 계산하지 않습니다.
  void coinValue;

  if (need("first_login")) await claim("first_login");

  const readNewsNumber = Number(user.read_dori_news || 0);

  // read_dori_news는 현재 읽을 수 있거나 읽은 신문 번호를 나타내므로
  // 1 이상이면 첫 신문 관련 업적, 10 이상이면 10회 관련 업적을 확인합니다.
  if (readNewsNumber >= 1) {
    if (need("read_news")) await claim("read_news");
    if (need("read_1_news")) await claim("read_1_news");
  }

  if (readNewsNumber >= 10 && need("read_10_news")) {
    await claim("read_10_news");
  }

  // rich는 함수 초반에 이미 서버 검증했다.
  })().finally(() => {
    state.checkPromise = null;
  });

  return state.checkPromise;
}

window.doriClaimAchievement = claim;
window.doriCheckAchievements = checkSiteAchievements;

async function init() {
  if (state.initialized) return;
  state.initialized = true;
  ensureStyles();
  await checkSiteAchievements();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

window.setInterval(() => {
  if (document.visibilityState === "visible") checkSiteAchievements();
}, 20000);

// 코인이 다른 페이지/컴포넌트에서 증가한 직후에도 놓치지 않도록 재검사한다.
window.addEventListener("focus", () => checkSiteAchievements());
window.addEventListener("pageshow", () => checkSiteAchievements());
window.addEventListener("dori:coin-changed", () => checkSiteAchievements());

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    setTimeout(checkSiteAchievements, 120);
  }
});
