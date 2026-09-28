/* =========================================================
   돌이사이트 공통 업적 시스템
   - Supabase claim_achievement RPC를 단일 진입점으로 사용
   - 새 업적만 팝업 큐에 추가
   - 신문/코인 조건은 페이지를 열 때마다 서버 상태를 확인
========================================================= */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  queue: [],
  showing: false,
  timer: null,
  closeTimer: null,
  initialized: false
};

function ensureStyles() {
  if (document.getElementById("dori-achievement-global-style")) return;

  const style = document.createElement("style");
  style.id = "dori-achievement-global-style";
  style.textContent = `
#dori-achievement-global-popup{
  position:fixed;top:22px;right:22px;z-index:2147483000;
  width:min(440px,calc(100vw - 32px));pointer-events:none;
  font-family:"HancomMalrangmalrang","Noto Sans KR",sans-serif;
}
.dori-achievement-card{
  --rarity-color:rgba(170,190,220,.8);
  --rarity-soft:rgba(170,190,220,.16);
  --rarity-glow:rgba(140,165,205,.22);
  position:relative;overflow:hidden;display:grid;grid-template-columns:74px 1fr;
  gap:16px;align-items:center;padding:18px 20px;
  border:1px solid rgba(255,255,255,.14);border-radius:22px;
  background:linear-gradient(135deg,rgba(10,18,48,.97),rgba(4,7,24,.96));
  box-shadow:0 22px 70px rgba(0,0,0,.5),0 0 42px var(--rarity-glow);
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  opacity:0;transform:translate3d(34px,-12px,0) scale(.96);filter:blur(3px);
}
.dori-achievement-card.show{animation:doriAchievementIn .72s cubic-bezier(.22,1,.36,1) forwards}
.dori-achievement-card.closing{animation:doriAchievementOut .76s cubic-bezier(.22,1,.36,1) forwards}
.dori-achievement-icon{
  position:relative;width:68px;height:68px;border-radius:19px;display:grid;place-items:center;
  font-size:36px;background:radial-gradient(circle,var(--rarity-soft),rgba(255,255,255,.025));
  border:1px solid color-mix(in srgb,var(--rarity-color) 55%,transparent);
  box-shadow:inset 0 1px rgba(255,255,255,.16),0 0 22px var(--rarity-glow);
  animation:doriAchievementIconIn .8s cubic-bezier(.22,1,.36,1) both;
}
.dori-achievement-copy{min-width:0}
.dori-achievement-kicker{font-size:10px;letter-spacing:.18em;color:var(--rarity-color);font-weight:900;margin-bottom:3px}
.dori-achievement-title{font-size:20px;font-weight:900;color:#fff;margin-bottom:2px}
.dori-achievement-name{font-size:16px;font-weight:800;color:#dce4ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dori-achievement-desc{margin-top:5px;font-size:12px;line-height:1.45;color:rgba(235,240,255,.68)}
.dori-achievement-rewards{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.dori-achievement-rewards span{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.07);color:#eaf0ff}
.dori-achievement-shine,.dori-achievement-particles,.dori-achievement-rays,.dori-achievement-sparkles{position:absolute;inset:0;pointer-events:none}
.dori-achievement-shine{
  background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.13) 48%,transparent 67%);
  transform:translateX(-120%);animation:doriAchievementShine 1.15s .35s ease-out both;
}
.dori-achievement-particles{
  opacity:.6;
  background-image:radial-gradient(circle at 20% 35%,var(--rarity-color) 0 1px,transparent 2px),radial-gradient(circle at 76% 22%,#fff 0 1px,transparent 2px),radial-gradient(circle at 88% 75%,var(--rarity-color) 0 1px,transparent 2px);
  animation:doriAchievementParticles 2.4s ease-out both;
}
.dori-achievement-rays{opacity:0;background:conic-gradient(from 0deg at 50% 50%,transparent 0deg,var(--rarity-soft) 18deg,transparent 36deg,var(--rarity-soft) 55deg,transparent 78deg);animation:doriAchievementRays 2.8s ease-out both}
.dori-achievement-sparkles{opacity:0;background-image:radial-gradient(circle at 12% 18%,#fff 0 1.5px,transparent 2px),radial-gradient(circle at 91% 24%,var(--rarity-color) 0 2px,transparent 2.5px),radial-gradient(circle at 68% 88%,#fff 0 1.5px,transparent 2px),radial-gradient(circle at 38% 8%,var(--rarity-color) 0 1.5px,transparent 2px);animation:doriAchievementSparkles 2.4s ease-out both}
.dori-rarity-common{--rarity-color:#aebbd0;--rarity-soft:rgba(174,187,208,.13);--rarity-glow:rgba(130,155,190,.18)}
.dori-rarity-rare{--rarity-color:#65a9ff;--rarity-soft:rgba(75,145,255,.18);--rarity-glow:rgba(55,130,255,.28)}
.dori-rarity-epic{--rarity-color:#c487ff;--rarity-soft:rgba(170,85,255,.20);--rarity-glow:rgba(165,70,255,.32)}
.dori-rarity-legendary{--rarity-color:#ffd76a;--rarity-soft:rgba(255,190,55,.23);--rarity-glow:rgba(255,175,40,.42)}
.dori-rarity-doronum{--rarity-color:#68f6ff;--rarity-soft:rgba(45,225,255,.25);--rarity-glow:rgba(30,225,255,.58)}
.dori-rarity-myth{--rarity-color:#ff75c8;--rarity-soft:rgba(255,65,150,.25);--rarity-glow:rgba(255,45,150,.48)}
.dori-rarity-legendary,.dori-rarity-doronum{border-color:color-mix(in srgb,var(--rarity-color) 48%,transparent)}
.dori-rarity-legendary .dori-achievement-icon,.dori-rarity-doronum .dori-achievement-icon{animation:doriAchievementIconIn .8s cubic-bezier(.22,1,.36,1) both,doriAchievementPulse 2.1s 1s ease-in-out infinite}
.dori-rarity-legendary .dori-achievement-rays,.dori-rarity-doronum .dori-achievement-rays{opacity:.8}
.dori-rarity-doronum{background:radial-gradient(circle at 80% 10%,rgba(50,230,255,.13),transparent 38%),linear-gradient(135deg,rgba(6,35,54,.98),rgba(3,9,28,.97));box-shadow:0 24px 85px rgba(0,0,0,.58),0 0 34px var(--rarity-glow),0 0 95px rgba(40,230,255,.20)}
.dori-rarity-doronum .dori-achievement-title,.dori-rarity-legendary .dori-achievement-title{text-shadow:0 0 18px var(--rarity-glow)}
.dori-rarity-legendary{background:radial-gradient(circle at 80% 10%,rgba(255,190,45,.14),transparent 38%),linear-gradient(135deg,rgba(45,30,9,.98),rgba(9,7,25,.97))}
@keyframes doriAchievementIn{0%{opacity:0;transform:translate3d(34px,-12px,0) scale(.96);filter:blur(3px)}65%{opacity:1;transform:translate3d(-3px,2px,0) scale(1.008);filter:blur(0)}100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}}
@keyframes doriAchievementOut{0%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}35%{opacity:1;transform:translate3d(4px,-2px,0) scale(.995);filter:blur(0)}100%{opacity:0;transform:translate3d(46px,-18px,0) scale(.94);filter:blur(4px)}}
@keyframes doriAchievementIconIn{0%{opacity:0;transform:scale(.55) rotate(-12deg)}65%{opacity:1;transform:scale(1.06) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes doriAchievementShine{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@keyframes doriAchievementParticles{0%{opacity:0;transform:scale(.8)}25%{opacity:.65}100%{opacity:0;transform:scale(1.2)}}
@keyframes doriAchievementRays{0%{opacity:0;transform:rotate(0deg) scale(.75)}25%{opacity:.75}100%{opacity:0;transform:rotate(70deg) scale(1.35)}}
@keyframes doriAchievementSparkles{0%{opacity:0;transform:scale(.6)}30%{opacity:1}100%{opacity:0;transform:scale(1.25)}}
@keyframes doriAchievementPulse{0%,100%{filter:brightness(1);box-shadow:inset 0 1px rgba(255,255,255,.16),0 0 22px var(--rarity-glow)}50%{filter:brightness(1.16);box-shadow:inset 0 1px rgba(255,255,255,.25),0 0 38px var(--rarity-glow)}}
@media(max-width:600px){#dori-achievement-global-popup{top:12px;right:12px;width:calc(100vw - 24px)}.dori-achievement-card{grid-template-columns:58px 1fr;gap:12px;padding:15px}.dori-achievement-icon{width:56px;height:56px;font-size:29px}.dori-achievement-title{font-size:18px}}
@media(prefers-reduced-motion:reduce){.dori-achievement-card,.dori-achievement-icon,.dori-achievement-shine,.dori-achievement-particles,.dori-achievement-rays,.dori-achievement-sparkles{animation:none!important}.dori-achievement-card{opacity:1;transform:none;filter:none}.dori-achievement-card.closing{opacity:0}}
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

function showNext() {
  if (state.showing || !state.queue.length) return;
  state.showing = true;

  const data = state.queue.shift();
  const popup = popupElement();
  const rarity = String(data.rarity || "Common").toLowerCase().replace(/[^a-z]/g, "");

  popup.innerHTML = `
    <div class="dori-achievement-card dori-rarity-${rarity}">
      <div class="dori-achievement-shine"></div>
      <div class="dori-achievement-particles"></div>
      <div class="dori-achievement-icon">${data.icon || "🏆"}</div>
      <div class="dori-achievement-copy">
        <div class="dori-achievement-kicker">ACHIEVEMENT UNLOCKED</div>
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

  const { data, error } = await supabase.rpc("claim_achievement", {
    p_achievement_id: id
  });

  if (error) {
    console.warn("[Dori Achievement] claim failed:", id, error);
    return null;
  }

  if (data?.success && !data?.already_claimed) {
    state.queue.push(data);
    showNext();
  }

  return data;
}

async function checkSiteAchievements() {
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
