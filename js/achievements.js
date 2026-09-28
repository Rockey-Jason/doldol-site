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
  authErrorUntil: 0
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
.dori-rarity-doronum{--rarity-color:#65f6ff;--rarity-accent:#d9ffff;--rarity-soft:rgba(34,224,255,.23);--rarity-glow:rgba(25,224,255,.62);--rarity-deep:rgba(4,31,49,.98);--rarity-speed:1.25;border-color:rgba(86,245,255,.65);box-shadow:0 30px 100px rgba(0,0,0,.64),0 0 42px rgba(35,232,255,.6),0 0 105px rgba(45,105,255,.23);background:radial-gradient(circle at 82% 4%,rgba(50,240,255,.18),transparent 35%),radial-gradient(circle at 10% 100%,rgba(85,105,255,.14),transparent 38%),linear-gradient(135deg,rgba(5,39,58,.99),rgba(3,9,30,.98))}
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
.dori-rarity-doronum .dori-achievement-icon{box-shadow:inset 0 1px rgba(255,255,255,.28),0 0 26px rgba(40,232,255,.62),0 0 50px rgba(80,100,255,.24)}
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
@media(max-width:600px){#dori-achievement-global-popup{top:12px;right:12px;width:calc(100vw - 24px)}.dori-achievement-card{grid-template-columns:58px 1fr;gap:12px;padding:15px}.dori-achievement-icon{width:56px;height:56px;font-size:29px}.dori-achievement-title{font-size:18px}}
@media(prefers-reduced-motion:reduce){.dori-achievement-card,.dori-achievement-icon,.dori-achievement-shine,.dori-achievement-particles,.dori-achievement-rays,.dori-achievement-sparkles,.dori-achievement-orbit,.dori-achievement-prism{animation:none!important}.dori-achievement-card{opacity:1;transform:none;filter:none}.dori-achievement-card.closing{opacity:0}}`;
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

function showNext() {
  if (state.showing || !state.queue.length) return;
  state.showing = true;

  const data = state.queue.shift();
  const popup = popupElement();
  const rawRarity = String(data.rarity || "Common");
  const rarity = /도로늄|doronum/i.test(rawRarity) || /도로늄/.test(String(data.name || "")) ? "doronum" : rawRarity.toLowerCase().replace(/[^a-z]/g, "");
  const rarityLabel = { common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY", doronum: "DORONUM", myth: "MYTHIC" }[rarity] || rawRarity.toUpperCase();

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

  const { data, error } = await supabase.rpc("claim_achievement", {
    p_achievement_id: id
  });

  if (error) {
    const status = Number(error?.status || error?.code || 0);
    if (status === 401 || /invalid api key|jwt/i.test(String(error?.message || ""))) {
      state.authErrorUntil = Date.now() + 10000;
      console.warn("[Dori Achievement] Supabase 인증 오류. 10초 후 재시도합니다.");
    } else {
      console.warn("[Dori Achievement] claim failed:", id, error);
    }
    return null;
  }

  if (data?.success && !data?.already_claimed) {
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

  // users REST 조회가 401이어도 rich 업적은 먼저 서버 RPC로 검사한다.
  // claim_achievement는 auth.uid()와 DB의 실제 doldolcoin을 직접 확인한다.
  const richResult = await claim("rich");
  if (richResult?.success && !richResult?.already_claimed) return;

  const userId = sessionData.session.user.id;
  const { data: user, error } = await supabase
    .from("users")
    .select("doldolcoin, read_dori_news_numbers, read_dori_news, user_achievement")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !user) {
    console.warn("[Dori Achievement] users 조회 실패:", error || "user row 없음");
    return;
  }

  const owned = user.user_achievement && typeof user.user_achievement === "object" ? user.user_achievement : {};
  const need = id => !owned[id];

  // bigint가 문자열로 내려오거나 매우 큰 값이어도 안전하게 비교한다.
  const coinValue = (() => {
    const raw = user.doldolcoin;
    if (typeof raw === "bigint") return raw;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    const normalized = String(raw ?? "").replace(/,/g, "").trim();
    if (!normalized) return 0;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  })();

  // 서버에 실제 획득 기록이 없는 업적만 요청한다.
  if (need("first_login")) await claim("first_login");

  const readNumbers = Array.isArray(user.read_dori_news_numbers)
    ? user.read_dori_news_numbers.map(Number).filter(Number.isInteger)
    : [];

  // 최소 1회 읽음.
  if (readNumbers.length > 0 || Number(user.read_dori_news || 0) >= 1) {
    if (need("read_news")) await claim("read_news");
  }

  // 정확히 1회/10회 신문을 읽었는지 서버 저장 목록으로 판정.
  if (readNumbers.includes(1) && need("read_1_news")) await claim("read_1_news");
  if (readNumbers.includes(10) && need("read_10_news")) await claim("read_10_news");

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
