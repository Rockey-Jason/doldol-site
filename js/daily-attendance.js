/* DORI ATTENDANCE — daily claims + year/month calendar */
(() => {
  "use strict";
  if (window.__DORI_ATTENDANCE_CALENDAR__) return;
  window.__DORI_ATTENDANCE_CALENDAR__ = true;

  const URL = "https://scttowfhygcpdirrekqm.supabase.co";
  const KEY = "sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
  const money = n => Number(n || 0).toLocaleString("ko-KR");
  const todaySeoul = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  let clientPromise;
  const getClient = async () => {
    const shared = window.doriSupabase || window.supabaseClient || window.sb;
    if (shared) return shared;
    if (!clientPromise) clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm").then(m => {
      // Publish a single fallback client so the notification center and other
      // page features can reuse its session instead of creating another auth client.
      const existing = window.doriSupabase || window.supabaseClient || window.sb;
      if (existing) return existing;
      const client = m.createClient(URL, KEY);
      window.doriSupabase = client;
      return client;
    });
    return clientPromise;
  };

  function styles() {
    if (document.getElementById("dori-attendance-calendar-style")) return;
    const s = document.createElement("style");
    s.id = "dori-attendance-calendar-style";
    s.textContent = `
      .da-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(2,4,18,.8);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
      .da-overlay.da-open{opacity:1;visibility:visible}
      .da-modal{position:relative;width:min(760px,100%);max-height:min(92dvh,940px);overflow:auto;border:1px solid rgba(151,177,255,.3);border-radius:28px;padding:clamp(20px,4vw,36px);color:#f7f8ff;background:radial-gradient(ellipse at 50% -10%,rgba(93,125,255,.28),transparent 55%),linear-gradient(145deg,rgba(17,25,66,.99),rgba(5,8,28,.99));box-shadow:0 35px 110px rgba(0,0,0,.58),0 0 55px rgba(88,123,255,.15),inset 0 1px rgba(255,255,255,.09);transform:translateY(20px) scale(.98);transition:transform .4s cubic-bezier(.2,.85,.2,1)}
      .da-open .da-modal{transform:translateY(0) scale(1)}
      .da-modal:before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(115deg,transparent 10%,rgba(255,255,255,.045) 48%,transparent 75%);animation:da-sheen 5s ease-in-out infinite}
      .da-close{position:absolute;right:14px;top:14px;width:38px;height:38px;border:1px solid rgba(255,255,255,.13);border-radius:50%;color:#dbe3ff;background:rgba(255,255,255,.06);font-size:22px;cursor:pointer;z-index:2}
      .da-eyebrow{display:flex;align-items:center;gap:8px;color:#b9caff;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
      .da-orb{display:grid;place-items:center;width:58px;height:58px;margin:14px auto 10px;border:1px solid rgba(190,207,255,.4);border-radius:20px;background:linear-gradient(145deg,rgba(139,167,255,.28),rgba(61,89,200,.12));box-shadow:0 0 30px rgba(112,146,255,.2),inset 0 1px rgba(255,255,255,.24);font-size:27px;animation:da-float 3.4s ease-in-out infinite}
      .da-title{text-align:center;font-size:clamp(25px,5vw,38px);font-weight:900;letter-spacing:-.045em;margin:0}
      .da-subtitle{text-align:center;color:#aeb9dc;font-size:13px;line-height:1.7;margin:8px auto 20px;max-width:500px}
      .da-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0}
      .da-stat{padding:14px 10px;border:1px solid rgba(138,166,255,.17);border-radius:17px;background:rgba(255,255,255,.035);text-align:center}
      .da-stat strong{display:block;font-size:clamp(19px,4vw,28px);font-weight:900;color:#d8e2ff;letter-spacing:-.04em}
      .da-stat span{display:block;margin-top:5px;color:#9faed5;font-size:11px}
      .da-reward{position:relative;overflow:hidden;margin-top:13px;padding:18px;border:1px solid rgba(255,218,115,.3);border-radius:20px;background:radial-gradient(ellipse at 90% 0%,rgba(255,205,86,.14),transparent 48%),rgba(255,214,102,.055)}
      .da-reward-label{color:#f8d978;font-size:11px;font-weight:800;letter-spacing:.1em}
      .da-reward-amount{margin:6px 0 3px;font-size:clamp(28px,6vw,39px);font-weight:900;letter-spacing:-.04em;color:#ffe69b;text-shadow:0 0 28px rgba(255,213,95,.18)}
      .da-reward-note{color:#c8cce0;font-size:12px;line-height:1.6}
      .da-track-title{display:flex;justify-content:space-between;gap:10px;margin:20px 0 10px;color:#dfe5ff;font-size:12px;font-weight:800}
      .da-track{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
      .da-day{min-width:0;padding:9px 2px;text-align:center;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.035);color:#aeb8d8}
      .da-day.da-current{border-color:rgba(255,221,126,.6);background:rgba(255,215,103,.12);box-shadow:0 0 22px rgba(255,215,103,.09);color:#ffe59a;transform:translateY(-2px)}
      .da-day-icon{font-size:14px;margin-bottom:4px}.da-day-label{font-size:10px;opacity:.8}.da-day-amount{font-size:clamp(9px,2vw,12px);font-weight:800;margin-top:4px;white-space:nowrap}
      .da-continue{width:100%;margin-top:18px;padding:14px 18px;border:1px solid rgba(190,207,255,.42);border-radius:15px;background:linear-gradient(100deg,#d8e2ff,#9eb7ff);color:#111a42;font:inherit;font-size:14px;font-weight:900;cursor:pointer;transition:transform .2s,filter .2s}
      .da-continue:hover{transform:translateY(-2px);filter:brightness(1.06)}
      .da-error{padding:18px;text-align:center;color:#ffb8c1;line-height:1.7}
      .da-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 12px}
      .da-month-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .da-month-controls select,.da-month-controls button{border:1px solid rgba(160,180,255,.24);border-radius:11px;padding:9px 11px;background:#111a40;color:#eef2ff;font:inherit;font-size:13px}
      .da-month-controls button{cursor:pointer}
      .da-month-label{font-size:clamp(18px,4vw,24px);font-weight:900;letter-spacing:-.03em}
      .da-legend{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;color:#b6c0df;font-size:11px}
      .da-legend span{display:inline-flex;align-items:center;gap:6px}
      .da-dot{width:9px;height:9px;border-radius:3px;display:inline-block}
      .da-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
      .da-weekday{text-align:center;padding:5px 0;color:#8796c0;font-size:11px;font-weight:800}
      .da-date{min-height:clamp(42px,8vw,66px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(255,255,255,.07);border-radius:12px;font-size:14px;font-weight:800;position:relative;overflow:hidden}
      .da-date em{font-style:normal;font-size:9px;font-weight:600;opacity:.85}
      .da-date.attended{background:rgba(36,205,126,.16);border-color:rgba(59,226,145,.45);color:#79f0b0}
      .da-date.missed{background:rgba(255,73,94,.13);border-color:rgba(255,91,110,.3);color:#ff9aa8}
      .da-date.future{background:rgba(160,171,199,.08);border-color:rgba(160,171,199,.13);color:#69758f}
      .da-date.today{box-shadow:inset 0 0 0 1px #dce7ff,0 0 18px rgba(142,171,255,.18)}
      .da-date.empty{border:0;background:transparent}
      .da-calendar-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
      .da-summary{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035)}
      .da-summary strong{display:block;font-size:18px;color:#eef2ff}.da-summary span{display:block;color:#9daacf;font-size:10px;margin-top:4px}
      .da-milestones{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
      .da-milestone{padding:13px;border:1px solid rgba(135,160,255,.16);border-radius:15px;background:rgba(255,255,255,.035)}
      .da-milestone strong{display:block;color:#dfe6ff;font-size:12px}.da-milestone span{display:block;margin-top:5px;color:#9faed5;font-size:11px;line-height:1.55}
      .da-milestone.active{border-color:rgba(255,218,115,.45);background:rgba(255,214,102,.08)}
      @keyframes da-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
      @keyframes da-sheen{0%,100%{opacity:.25;transform:translateX(-3%)}50%{opacity:.75;transform:translateX(3%)}}
      @media(max-width:480px){.da-overlay{padding:9px}.da-modal{padding:22px 13px 15px;border-radius:22px}.da-close{right:9px;top:9px;width:33px;height:33px}.da-stats{gap:5px}.da-stat{padding:11px 5px}.da-calendar{gap:4px}.da-date{border-radius:9px;min-height:42px}.da-date em{font-size:8px}.da-calendar-summary{gap:5px}.da-summary{padding:9px 7px}.da-summary strong{font-size:15px}.da-milestones{grid-template-columns:1fr}.da-month-controls select,.da-month-controls button{padding:8px}}
      @media(prefers-reduced-motion:reduce){.da-overlay,.da-modal,.da-orb,.da-modal:before{transition:none;animation:none}}
    `;
    document.head.appendChild(s);
  }

  function makeOverlay(kind) {
    styles();
    const overlay = document.createElement("div");
    overlay.className = "da-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.dataset.kind = kind;
    const close = () => { overlay.classList.remove("da-open"); setTimeout(() => overlay.remove(), 220); };
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("da-open")));
    return { overlay, close };
  }

  function showClaimPopup(data, client) {
    const { overlay, close } = makeOverlay("claim");
    const streak = Number(data.streak_count || 1);
    const reward = Number(data.reward || 0);
    const bonus = Number(data.bonus_reward || 0);
    const cycle = ((streak - 1) % 7) + 1;
    const rewardTrack = [3000,3000,3000,3000,3000,3000,53000].map((amount,i) => {
      const day=i+1, current=day===cycle;
      return '<div class="da-day '+(current?'da-current':'')+'"><div class="da-day-icon">'+(day===7?'👑':current?'✦':'◈')+'</div><div class="da-day-label">'+day+'일차</div><div class="da-day-amount">'+money(amount)+'</div></div>';
    }).join("");
    const milestone = String(data.milestone||"");
    const notes = [];
    if (milestone.includes("weekly")) notes.push("🎉 7일 연속 출석 보너스 +50,000 코인");
    if (milestone.includes("monthly")) notes.push("🏆 한 달 개근 보너스 +500,000 코인");
    if (milestone.includes("three_months")) notes.push("⚡ 3개월 개근 달성 · 코인 수급량 5배 버프");
    if (milestone.includes("six_months")) notes.push("💎 6개월 개근 달성 · 코인 수급량 10배 버프");
    if (milestone.includes("year")) notes.push("👑 1년 개근 달성 · 코인 수급량 100배 버프");
    overlay.innerHTML = '<section class="da-modal"><button class="da-close" type="button" aria-label="닫기">×</button><div class="da-eyebrow">✦ DOLDOL ATTENDANCE SYSTEM</div><div class="da-orb">🗓️</div><h2 class="da-title">'+streak+'일 '+(streak>1?'연속 ':'')+'출석 완료!</h2><p class="da-subtitle">오늘의 출석이 기록되었어요. 하루하루 쌓인 기록이 특별한 보상으로 이어집니다.</p><div class="da-stats"><div class="da-stat"><strong>'+streak+'일</strong><span>연속 출석</span></div><div class="da-stat"><strong>'+money(data.total_days)+'일</strong><span>누적 출석</span></div><div class="da-stat"><strong>'+Number(data.multiplier||1)+'배</strong><span>현재 코인 버프</span></div></div><div class="da-reward"><div class="da-reward-label">TODAY’S ATTENDANCE REWARD</div><div class="da-reward-amount">+ '+money(reward)+' <span style="font-size:.42em">돌돌코인</span></div><div class="da-reward-note">'+(bonus>0?'추가 특별 보상 +'+money(bonus)+' 코인까지 지급했어요.':'매일 기본 출석 보상 3,000 코인이 지급되었어요.')+'</div>'+(notes.length?'<div class="da-reward-note" style="margin-top:9px;color:#ffe69b">'+notes.join('<br>')+'</div>':'')+'</div><div class="da-track-title"><span>7일 연속 출석 보상</span><span>7일마다 반복</span></div><div class="da-track">'+rewardTrack+'</div><div class="da-claim-calendar"><div class="da-track-title"><span>이번 달 출석 달력</span><span>날짜별 기록</span></div><div id="da-claim-calendar-content" class="da-error">출석 달력을 불러오는 중...</div></div><div class="da-track-title"><span>현재 잔액</span><span>'+money(data.balance)+' 돌돌코인</span></div><button class="da-continue" type="button">확인하고 계속하기</button></section>';
    overlay.querySelector(".da-close").addEventListener("click",close);
    overlay.querySelector(".da-continue").addEventListener("click",close);
    renderInlineCalendar(overlay.querySelector("#da-claim-calendar-content"), client).catch(err => {
      console.error("[돌이 출석] 출석 완료 팝업 달력 로딩 실패:", err);
      const host = overlay.querySelector("#da-claim-calendar-content");
      if (host) host.innerHTML = '<div class="da-error">달력을 표시하지 못했어요. 출석 기록은 정상적으로 저장되었습니다.</div>';
    });
  }

  async function renderInlineCalendar(host, client) {
    const now = todaySeoul().split("-").map(Number);
    let year = now[0], month = now[1];
    const maxYear = Math.max(now[0] + 1, year);
    async function render() {
      if (!host || !host.isConnected) return;
      host.innerHTML = '<div class="da-error">출석 기록을 불러오는 중...</div>';
      const { data, error } = await client.rpc("get_my_attendance_month", { p_year: year, p_month: month });
      if (!host || !host.isConnected) return;
      if (error || !data) {
        host.innerHTML = '<div class="da-error">출석 달력을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.<br><small>' + String(error?.message || "").replace(/[<>]/g, "") + '</small></div>';
        return;
      }
      const days = Array.isArray(data.days) ? data.days : [];
      const byDate = new Map(days.map(d => [String(d.day_date).slice(0, 10), d.status]));
      const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const today = String(data.today || todaySeoul()).slice(0, 10);
      let attended = 0, missed = 0, future = 0, cells = "";
      for (let i = 0; i < first; i++) cells += '<div class="da-date empty"></div>';
      for (let day = 1; day <= count; day++) {
        const date = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        const status = byDate.get(date) || (date > today ? "future" : "missed");
        if (status === "attended") attended++;
        else if (status === "future") future++;
        else missed++;
        cells += '<div class="da-date ' + status + (date === today ? " today" : "") + '" title="' + date + ' · ' + (status === "attended" ? "출석 완료" : status === "missed" ? "미출석" : "아직 오지 않은 날짜") + '"><span>' + day + '</span><em>' + (status === "attended" ? "출석" : status === "missed" ? "미출석" : "예정") + '</em></div>';
      }
      const yearOptions = Array.from({ length: Math.max(1, maxYear - 2019) }, (_, i) => 2020 + i).map(y => '<option value="' + y + '" ' + (y === year ? "selected" : "") + '>' + y + "년</option>").join("");
      const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1).map(m => '<option value="' + m + '" ' + (m === month ? "selected" : "") + '>' + m + "월</option>").join("");
      host.innerHTML = '<div class="da-calendar-head"><div class="da-month-label">' + year + "년 " + month + '월</div><div class="da-month-controls"><button type="button" data-inline-step="-1" aria-label="이전 달">‹</button><select id="da-inline-year" aria-label="연도">' + yearOptions + '</select><select id="da-inline-month" aria-label="월">' + monthOptions + '</select><button type="button" data-inline-step="1" aria-label="다음 달">›</button></div></div><div class="da-legend"><span><i class="da-dot" style="background:#35d98a"></i>출석 완료</span><span><i class="da-dot" style="background:#ff667b"></i>미출석</span><span><i class="da-dot" style="background:#68748e"></i>미래 날짜</span></div><div class="da-calendar">' + ["일", "월", "화", "수", "목", "금", "토"].map(d => '<div class="da-weekday">' + d + '</div>').join("") + cells + '</div><div class="da-calendar-summary"><div class="da-summary"><strong>' + attended + '일</strong><span>출석 완료</span></div><div class="da-summary"><strong>' + missed + '일</strong><span>미출석</span></div><div class="da-summary"><strong>' + future + '일</strong><span>미래 날짜</span></div></div>';
      host.querySelector("#da-inline-year").addEventListener("change", e => { year = Number(e.target.value); render(); });
      host.querySelector("#da-inline-month").addEventListener("change", e => { month = Number(e.target.value); render(); });
      host.querySelectorAll("[data-inline-step]").forEach(button => button.addEventListener("click", () => {
        month += Number(button.dataset.inlineStep);
        if (month < 1) { month = 12; year--; }
        if (month > 12) { month = 1; year++; }
        if (year < 2020) year = 2020;
        if (year > maxYear) { year = maxYear; month = now[1]; }
        render();
      }));
    }
    await render();
  }

  async function openCalendar(initialDate) {
    const { overlay, close } = makeOverlay("calendar");
    overlay.innerHTML = '<section class="da-modal"><button class="da-close" type="button" aria-label="닫기">×</button><div class="da-eyebrow">✦ DOLDOL ATTENDANCE ARCHIVE</div><div class="da-orb">📅</div><h2 class="da-title">출석 체크</h2><p class="da-subtitle">연도와 월을 선택해 날짜별 출석 기록과 특별 보상을 확인하세요.</p><div id="da-calendar-content" class="da-error">출석 기록을 불러오는 중...</div></section>';
    overlay.querySelector(".da-close").addEventListener("click",close);
    try {
      const client = await getClient();
      const {data:{session},error:sessionError}=await client.auth.getSession();
      if(sessionError||!session?.user?.id) { overlay.querySelector("#da-calendar-content").innerHTML='<div class="da-error">출석 기록은 로그인 후 확인할 수 있어요.</div>'; return; }
      const now = todaySeoul().split("-").map(Number);
      let year = initialDate?.year || now[0], month = initialDate?.month || now[1];
      const maxYear = Math.max(now[0]+1,year);
      async function render() {
        const host=overlay.querySelector("#da-calendar-content");
        host.innerHTML='<div class="da-error">출석 기록을 불러오는 중...</div>';
        const {data,error}=await client.rpc("get_my_attendance_month",{p_year:year,p_month:month});
        if(error||!data) { host.innerHTML='<div class="da-error">출석 기록을 불러오지 못했어요.<br><small>'+String(error?.message||"잠시 후 다시 시도해 주세요.").replace(/[<>]/g,"")+'</small></div>';return; }
        const days=Array.isArray(data.days)?data.days:[];
        const byDate=new Map(days.map(d=>[String(d.day_date).slice(0,10),d.status]));
        const first=new Date(Date.UTC(year,month-1,1)).getUTCDay();
        const count=new Date(Date.UTC(year,month,0)).getUTCDate();
        const today=String(data.today||todaySeoul()).slice(0,10);
        let attended=0, missed=0, future=0, cells="";
        for(let i=0;i<first;i++) cells+='<div class="da-date empty"></div>';
        for(let day=1;day<=count;day++){
          const date=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
          const status=byDate.get(date)||(date>today?'future':'missed');
          if(status==="attended") attended++; else if(status==="future") future++; else missed++;
          cells+='<div class="da-date '+status+(date===today?' today':'')+'" title="'+date+' · '+(status==="attended"?'출석 완료':status==="missed"?'미출석':'아직 오지 않은 날짜')+'"><span>'+day+'</span><em>'+(status==="attended"?'출석':status==="missed"?'미출석':'예정')+'</em></div>';
        }
        const yearOptions=Array.from({length:Math.max(1,maxYear-2019)},(_,i)=>2020+i).map(y=>'<option value="'+y+'" '+(y===year?'selected':'')+'>'+y+'년</option>').join("");
        const monthOptions=Array.from({length:12},(_,i)=>i+1).map(m=>'<option value="'+m+'" '+(m===month?'selected':'')+'>'+m+'월</option>').join("");
        const streak=Number(data.streak_count||0), total=Number(data.total_days||0), mult=Number(data.multiplier||1);
        host.innerHTML='<div class="da-calendar-head"><div class="da-month-label">'+year+'년 '+month+'월</div><div class="da-month-controls"><button type="button" data-step="-1" aria-label="이전 달">‹</button><select id="da-year" aria-label="연도">'+yearOptions+'</select><select id="da-month" aria-label="월">'+monthOptions+'</select><button type="button" data-step="1" aria-label="다음 달">›</button></div></div><div class="da-legend"><span><i class="da-dot" style="background:#35d98a"></i>출석 완료</span><span><i class="da-dot" style="background:#ff667b"></i>미출석</span><span><i class="da-dot" style="background:#68748e"></i>미래 날짜</span></div><div class="da-calendar">'+["일","월","화","수","목","금","토"].map(d=>'<div class="da-weekday">'+d+'</div>').join("")+cells+'</div><div class="da-calendar-summary"><div class="da-summary"><strong>'+attended+'일</strong><span>출석 완료</span></div><div class="da-summary"><strong>'+missed+'일</strong><span>미출석</span></div><div class="da-summary"><strong>'+future+'일</strong><span>미래 날짜</span></div></div><div class="da-stats"><div class="da-stat"><strong>'+streak+'일</strong><span>연속 출석</span></div><div class="da-stat"><strong>'+total+'일</strong><span>누적 출석</span></div><div class="da-stat"><strong>'+mult+'배</strong><span>코인 수급 버프</span></div></div><div class="da-milestones"><div class="da-milestone"><strong>🔥 7일 연속 출석</strong><span>추가 50,000 돌돌코인</span></div><div class="da-milestone"><strong>🌙 한 달 개근</strong><span>한 달의 모든 날짜 출석 시 추가 500,000 코인</span></div><div class="da-milestone '+(mult>=5?'active':'')+'"><strong>⚡ 3개월 개근</strong><span>코인 수급량 5배 버프</span></div><div class="da-milestone '+(mult>=10?'active':'')+'"><strong>💎 6개월 개근</strong><span>코인 수급량 10배 버프</span></div><div class="da-milestone '+(mult>=100?'active':'')+'"><strong>👑 1년 개근</strong><span>코인 수급량 100배 버프</span></div></div><button class="da-continue" type="button" id="da-calendar-done">확인</button>';
        host.querySelector("#da-year").addEventListener("change",e=>{year=Number(e.target.value);render()});
        host.querySelector("#da-month").addEventListener("change",e=>{month=Number(e.target.value);render()});
        host.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>{const step=Number(b.dataset.step);month+=step;if(month<1){month=12;year--}if(month>12){month=1;year++}if(year<2020)year=2020;if(year>maxYear){year=maxYear;month=now[1]}render()}));
        host.querySelector("#da-calendar-done").addEventListener("click",close);
      }
      await render();
    } catch(err) {
      console.error("[돌이 출석] 달력 로딩 실패:",err);
      const host=overlay.querySelector("#da-calendar-content");
      if(host)host.innerHTML='<div class="da-error">출석 달력을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>';
    }
  }

  window.doriOpenAttendanceCalendar = () => openCalendar();
  window.addEventListener("dori:open-attendance-calendar",()=>openCalendar());
  async function run() {
    try {
      const client=await getClient();
      const {data:sessionData,error:sessionError}=await client.auth.getSession();
      if(sessionError||!sessionData?.session?.user?.id)return;
      const {data,error}=await client.rpc("claim_daily_attendance");
      if(error){console.error("[돌이 출석] 출석 처리 실패:",error.message);return}
      if(data&&data.already_claimed===false&&Number(data.reward)>0){
        showClaimPopup(data, client);
        window.dispatchEvent(new CustomEvent("dori:attendance-claimed",{detail:data}));
      }
    } catch(error) { console.error("[돌이 출석] 초기화 실패:",error); }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
})();