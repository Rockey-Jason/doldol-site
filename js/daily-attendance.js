/* DORI DAILY ATTENDANCE — server-verified, once per Korea calendar day */
(() => {
  "use strict";
  if (window.__DORI_DAILY_ATTENDANCE__) return;
  window.__DORI_DAILY_ATTENDANCE__ = true;

  const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
  const REWARDS = [1000, 1500, 2000, 2500, 3500, 5000, 12000];
  const money = n => Number(n || 0).toLocaleString("ko-KR");

  function addStyles() {
    if (document.getElementById("dori-attendance-style")) return;
    const style = document.createElement("style");
    style.id = "dori-attendance-style";
    style.textContent = `
      .da-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:22px;background:rgba(2,4,18,.78);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);opacity:0;transition:opacity .35s ease}
      .da-overlay.da-open{opacity:1}
      .da-modal{position:relative;width:min(680px,100%);max-height:min(90dvh,900px);overflow:auto;border:1px solid rgba(151,177,255,.32);border-radius:30px;padding:clamp(22px,5vw,42px);color:#f7f8ff;background:radial-gradient(ellipse at 50% -10%,rgba(93,125,255,.30),transparent 55%),linear-gradient(145deg,rgba(17,25,66,.98),rgba(5,8,28,.99));box-shadow:0 35px 110px rgba(0,0,0,.58),0 0 55px rgba(88,123,255,.15),inset 0 1px rgba(255,255,255,.09);transform:translateY(24px) scale(.97);transition:transform .48s cubic-bezier(.2,.85,.2,1);isolation:isolate}
      .da-open .da-modal{transform:translateY(0) scale(1)}
      .da-modal:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;background:linear-gradient(115deg,transparent 10%,rgba(255,255,255,.045) 48%,transparent 75%);animation:da-sheen 5s ease-in-out infinite}
      .da-close{position:absolute;right:16px;top:16px;width:40px;height:40px;border:1px solid rgba(255,255,255,.12);border-radius:50%;color:#dbe3ff;background:rgba(255,255,255,.06);font-size:23px;cursor:pointer;transition:transform .2s,background .2s}
      .da-close:hover{transform:rotate(90deg);background:rgba(255,255,255,.12)}
      .da-eyebrow{display:flex;align-items:center;gap:9px;color:#b9caff;font-size:12px;font-weight:800;letter-spacing:.17em;text-transform:uppercase}
      .da-orb{display:grid;place-items:center;width:68px;height:68px;margin:20px auto 12px;border:1px solid rgba(190,207,255,.45);border-radius:23px;background:linear-gradient(145deg,rgba(139,167,255,.28),rgba(61,89,200,.12));box-shadow:0 0 36px rgba(112,146,255,.22),inset 0 1px rgba(255,255,255,.24);font-size:31px;animation:da-float 3.4s ease-in-out infinite}
      .da-title{text-align:center;font-size:clamp(27px,5vw,40px);font-weight:900;letter-spacing:-.045em;margin:0}
      .da-subtitle{text-align:center;color:#aeb9dc;font-size:14px;line-height:1.7;margin:10px auto 24px;max-width:430px}
      .da-streak{display:flex;align-items:center;justify-content:center;gap:14px;padding:18px;border:1px solid rgba(138,166,255,.2);border-radius:22px;background:linear-gradient(120deg,rgba(92,120,235,.15),rgba(255,255,255,.025));}
      .da-streak-number{font-size:clamp(46px,9vw,68px);line-height:1;font-weight:900;letter-spacing:-.06em;background:linear-gradient(140deg,#fff,#c3d2ff 60%,#8ca8ff);color:transparent;background-clip:text;-webkit-background-clip:text}
      .da-streak-copy{color:#c6d1f2;font-size:13px;line-height:1.55}
      .da-streak-copy strong{display:block;color:#fff;font-size:16px;margin-bottom:3px}
      .da-reward{position:relative;overflow:hidden;margin-top:16px;padding:20px;border:1px solid rgba(255,218,115,.3);border-radius:22px;background:radial-gradient(ellipse at 90% 0%,rgba(255,205,86,.14),transparent 48%),rgba(255,214,102,.055)}
      .da-reward-label{color:#f8d978;font-size:12px;font-weight:800;letter-spacing:.1em}
      .da-reward-amount{margin:7px 0 4px;font-size:clamp(28px,6vw,40px);font-weight:900;letter-spacing:-.04em;color:#ffe69b;text-shadow:0 0 28px rgba(255,213,95,.18)}
      .da-reward-note{color:#c8cce0;font-size:13px;line-height:1.6}
      .da-track-title{display:flex;justify-content:space-between;gap:12px;margin:23px 0 12px;color:#dfe5ff;font-size:13px;font-weight:800}
      .da-track-title span:last-child{color:#929fc7;font-weight:500}
      .da-track{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
      .da-day{min-width:0;padding:10px 2px 9px;text-align:center;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.035);color:#aeb8d8}
      .da-day.da-current{border-color:rgba(255,221,126,.6);background:rgba(255,215,103,.12);box-shadow:0 0 22px rgba(255,215,103,.09);color:#ffe59a;transform:translateY(-3px)}
      .da-day.da-milestone{border-color:rgba(143,169,255,.28)}
      .da-day-icon{font-size:15px;margin-bottom:5px}
      .da-day-label{font-size:10px;color:inherit;opacity:.8}
      .da-day-amount{font-size:clamp(9px,2vw,12px);font-weight:800;margin-top:5px;white-space:nowrap}
      .da-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;color:#9ba8ce;font-size:12px}
      .da-balance{color:#dbe4ff;font-weight:800}
      .da-continue{width:100%;margin-top:18px;padding:15px 20px;border:1px solid rgba(190,207,255,.42);border-radius:16px;background:linear-gradient(100deg,#d8e2ff,#9eb7ff);color:#111a42;font:inherit;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 10px 28px rgba(106,139,255,.18);transition:transform .2s,filter .2s}
      .da-continue:hover{transform:translateY(-2px);filter:brightness(1.06)}
      .da-continue:active{transform:scale(.985)}
      .da-error{color:#ffb8c1;text-align:center;font-size:13px;line-height:1.6;margin-top:14px}
      @keyframes da-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
      @keyframes da-sheen{0%,100%{opacity:.25;transform:translateX(-3%)}50%{opacity:.75;transform:translateX(3%)}}
      @media(max-width:480px){.da-overlay{padding:12px}.da-modal{padding:23px 16px 18px;border-radius:24px}.da-close{right:10px;top:10px;width:35px;height:35px}.da-orb{width:56px;height:56px;margin-top:15px;font-size:25px}.da-streak{padding:14px;gap:10px}.da-day{border-radius:10px;padding-top:8px;padding-bottom:7px}.da-track{gap:4px}.da-day-icon{font-size:13px}.da-footer{align-items:flex-start;flex-direction:column;gap:6px}}
      @media(prefers-reduced-motion:reduce){.da-overlay,.da-modal,.da-orb,.da-modal:before{transition:none;animation:none}}
    `;
    document.head.appendChild(style);
  }

  function showPopup(data) {
    addStyles();
    const streak = Number(data.streak_count || 1);
    const reward = Number(data.reward || 0);
    const cycleDay = Number(data.cycle_day || ((streak - 1) % 7) + 1);
    const nextReward = Number(data.next_reward || REWARDS[streak % 7]);
    const totalDays = Number(data.total_days || 1);
    const overlay = document.createElement("div");
    overlay.className = "da-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "da-title");
    const days = REWARDS.map((amount, i) => {
      const n = i + 1;
      const current = n === cycleDay;
      const milestone = n === 7;
      return `<div class="da-day ${current ? "da-current" : ""} ${milestone ? "da-milestone" : ""}">
        <div class="da-day-icon">${current ? "✦" : milestone ? "👑" : "◈"}</div>
        <div class="da-day-label">${n}일차</div>
        <div class="da-day-amount">${money(amount)}</div>
      </div>`;
    }).join("");
    overlay.innerHTML = `
      <section class="da-modal">
        <button class="da-close" type="button" aria-label="출석 보상 창 닫기">×</button>
        <div class="da-eyebrow"><span>✦</span> DOLDOL DAILY ATTENDANCE</div>
        <div class="da-orb" aria-hidden="true">🗓️</div>
        <h2 class="da-title" id="da-title">${streak}일 연속 출석 달성!</h2>
        <p class="da-subtitle">오늘도 돌이사이트에 찾아왔네요.<br>연속 출석 보상을 지급했어요. 내일도 이어서 방문해 보세요!</p>
        <div class="da-streak">
          <div class="da-streak-number">${streak}<span style="font-size:.38em;letter-spacing:0">일</span></div>
          <div class="da-streak-copy"><strong>연속 출석 기록</strong>누적 출석 ${money(totalDays)}일<br>한국 시간 기준 매일 자정에 갱신</div>
        </div>
        <div class="da-reward">
          <div class="da-reward-label">TODAY'S REWARD · ${cycleDay}/7</div>
          <div class="da-reward-amount">+ ${money(reward)} <span style="font-size:.48em">돌돌코인</span></div>
          <div class="da-reward-note">${cycleDay === 7 ? "7일 연속 출석 특별 보상! 다음 7일 주기도 첫 단계부터 보상이 이어집니다." : "출석 보상이 계정에 안전하게 반영되었어요. 다음 출석 보상은 " + money(nextReward) + " 돌돌코인이에요."}</div>
        </div>
        <div class="da-track-title"><span>7일 출석 보상 트랙</span><span>7일마다 보상 주기 반복</span></div>
        <div class="da-track">${days}</div>
        <div class="da-footer"><span>출석은 하루 한 번만 인정됩니다.</span><span class="da-balance">현재 잔액 · ${money(data.balance)} 코인</span></div>
        <button class="da-continue" type="button">보상 확인 완료 · 사이트 계속 이용하기</button>
      </section>`;
    const close = () => {
      overlay.classList.remove("da-open");
      setTimeout(() => overlay.remove(), 260);
    };
    overlay.querySelector(".da-close").addEventListener("click", close);
    overlay.querySelector(".da-continue").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape" && overlay.isConnected) {
        close();
        document.removeEventListener("keydown", esc);
      }
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("da-open")));
  }

  async function run() {
    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      const client = window.doriSupabase || window.supabaseClient || window.sb || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData?.session?.user?.id) return;
      const { data, error } = await client.rpc("claim_daily_attendance");
      if (error) {
        console.error("[돌이 출석] 출석 처리 실패:", error.message);
        return;
      }
      if (data && data.already_claimed === false && Number(data.reward) > 0) {
        showPopup(data);
        window.dispatchEvent(new CustomEvent("dori:attendance-claimed", { detail: data }));
      }
    } catch (error) {
      console.error("[돌이 출석] 초기화 실패:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
