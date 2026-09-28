/* =========================================================
   돌이사이트 공통 업적 시스템
   - Supabase claim_achievement RPC를 단일 진입점으로 사용
   - 새 업적만 팝업 큐에 추가
   - 신문/코인 조건은 페이지를 열 때마다 서버 상태를 확인
========================================================= */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmxlIiwicmVmIjoic2N0dG93Zmh5Z2NwZGlycmVr","XwdQh4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBq";

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
  position:relative;overflow:hidden;display:grid;grid-template-columns:74px 1fr;
  gap:16px;align-items:center;padding:18px 20px;
  border:1px solid rgba(255,255,255,.14);border-radius:22px;
  background:linear-gradient(135deg,rgba(10,18,48,.97),rgba(4,7,24,.96));
  box-shadow:0 22px 70px rgba(0,0,0,.5),0 0 42px var(--dori-achievement-glow,rgba(100,130,255,.18));
  backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  opacity:0;transform:translate3d(34px,-12px,0) scale(.96);
  filter:blur(3px);
}
.dori-achievement-card.show{
  animation:doriAchievementIn .72s cubic-bezier(.22,1,.36,1) forwards;
}
.dori-achievement-card.closing{
  animation:doriAchievementOut .76s cubic-bezier(.22,1,.36,1) forwards;
}
.dori-achievement-icon{
  width:68px;height:68px;border-radius:19px;display:grid;place-items:center;
  font-size:36px;background:radial-gradient(circle,rgba(255,255,255,.16),rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 1px rgba(255,255,255,.16);
  animation:doriAchievementIconIn .8s cubic-bezier(.22,1,.36,1) both;
}
.dori-achievement-copy{min-width:0}
.dori-achievement-kicker{font-size:10px;letter-spacing:.18em;color:#9eafff;font-weight:900;margin-bottom:3px}
.dori-achievement-title{font-size:20px;font-weight:900;color:#fff;margin-bottom:2px}
.dori-achievement-name{font-size:16px;font-weight:800;color:#dce4ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dori-achievement-desc{margin-top:5px;font-size:12px;line-height:1.45;color:rgba(235,240,255,.68)}
.dori-achievement-rewards{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.dori-achievement-rewards span{font-size:10px;font-weight:800;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.07);color:#eaf0ff}
.dori-achievement-shine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.13) 48%,transparent 67%);transform:translateX(-120%);animation:doriAchievementShine 1.15s .35s ease-out both}
.dori-achievement-particles{position:absolute;inset:0;pointer-events:none;opacity:.6;background-image:radial-gradient(circle at 20% 35%,#fff 0 1px,transparent 2px),radial-gradient(circle at 76% 22%,#9eb4ff 0 1px,transparent 2px),radial-gradient(circle at 88% 75%,#fff 0 1px,transparent 2px);animation:doriAchievementParticles 2.4s ease-out both}
.dori-rarity-common{--dori-achievement-glow:rgba(150,170,210,.18)}
.dori-rarity-rare{--dori-achievement-glow:rgba(70,130,255,.28)}
.dori-rarity-epic{--dori-achievement-glow:rgba(170,80,255,.30)}
.dori-rarity-legendary{--dori-achievement-glow:rgba(255,180,55,.34)}
.dori-rarity-myth{--dori-achievement-glow:rgba(255,80,130,.34)}
.dori-rarity-doronum{--dori-achievement-glow:rgba(80,235,255,.40)}
@keyframes doriAchievementIn{0%{opacity:0;transform:translate3d(34px,-12px,0) scale(.96);filter:blur(3px)}65%{opacity:1;transform:translate3d(-3px,2px,0) scale(1.008);filter:blur(0)}100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}}
@keyframes doriAchievementOut{0%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}35%{opacity:1;transform:translate3d(4px,-2px,0) scale(.995);filter:blur(0)}100%{opacity:0;transform:translate3d(46px,-18px,0) scale(.94);filter:blur(4px)}}
@keyframes doriAchievementIconIn{0%{opacity:0;transform:scale(.55) rotate(-12deg)}65%{opacity:1;transform:scale(1.06) rotate(2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes doriAchievementShine{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@keyframes doriAchievementParticles{0%{opacity:0;transform:scale(.8)}25%{opacity:.65}100%{opacity:0;transform:scale(1.2)}}
@media(max-width:600px){#dori-achievement-global-popup{top:12px;right:12px;width:calc(100vw - 24px)}.dori-achievement-card{grid-template-columns:58px 1fr;gap:12px;padding:15px}.dori-achievement-icon{width:56px;height:56px;font-size:29px}.dori-achievement-title{font-size:18px}}
@media(prefers-reduced-motion:reduce){.dori-achievement-card,.dori-achievement-icon,.dori-achievement-shine,.dori-achievement-particles{animation:none!important}.dori-achievement-card{opacity:1;transform:none;filter:none}.dori-achievement-card.closing{opacity:0}}
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

  const userId = sessionData.session.user.id;
  const { data: user, error } = await supabase
    .from("users")
    .select("doldolcoin, read_dori_news_numbers, read_dori_news")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !user) return;

  // 로그인 자체가 조건인 업적. RPC가 중복 획득을 원자적으로 차단한다.
  await claim("first_login");

  const readNumbers = Array.isArray(user.read_dori_news_numbers)
    ? user.read_dori_news_numbers.map(Number).filter(Number.isInteger)
    : [];

  // 최소 1회 읽음.
  if (readNumbers.length > 0 || Number(user.read_dori_news || 0) >= 1) {
    await claim("read_news");
  }

  // 정확히 1회/10회 신문을 읽었는지 서버 저장 목록으로 판정.
  if (readNumbers.includes(1)) await claim("read_1_news");
  if (readNumbers.includes(10)) await claim("read_10_news");

  // 현재 보유 코인이 1억 이상이면 부자 업적.
  if (Number(user.doldolcoin || 0) >= 100000000) {
    await claim("rich");
  }
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

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    setTimeout(checkSiteAchievements, 120);
  }
});
