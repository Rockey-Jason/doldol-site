/* DORI SITE — persistent unified notification center */
(() => {
  "use strict";
  if (window.__DORI_NOTIFICATION_CENTER__) return;
  window.__DORI_NOTIFICATION_CENTER__ = true;

  const URL = "https://scttowfhygcpdirrekqm.supabase.co";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
  const categories = {
    all: {label:"전체",icon:"✦"}, bank:{label:"은행",icon:"₩"}, stock:{label:"증권",icon:"↗"},
    attendance:{label:"출석",icon:"▦"}, achievement:{label:"업적",icon:"♜"},
    mission:{label:"미션",icon:"✓"}, system:{label:"공지",icon:"◈"}
  };
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let clientPromise = null, root = null, currentUserId = null, category = "all";
  let offset = 0, totalRows = 0, busy = false, lastUnread = null, loadMoreTimer = 0;
  let pollTimer = null;
  let activeCleanups = [];

  function disposeRoot() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = null;
    activeCleanups.splice(0).forEach(remove => {
      try { remove(); } catch (_) {}
    });
    if (loadMoreTimer) window.clearTimeout(loadMoreTimer);
    loadMoreTimer = 0;
    busy = false;
    offset = 0;
    totalRows = 0;
    if (root) root.remove();
    root = null;
    currentUserId = null;
  }

  function isAuthError(error) {
    return Number(error && error.status) === 401 ||
      String(error && error.code || "") === "PGRST301" ||
      /invalid jwt|jwt expired|token expired|unauthorized/i.test(String(error && error.message || ""));
  }

  async function refreshSessionAfter401(client, error) {
    if (!isAuthError(error)) return false;
    const refreshed = await client.auth.refreshSession();
    if (refreshed.error || !refreshed.data || !refreshed.data.session) return false;
    return true;
  }

  function getSharedClient() {
    return window.doriSupabase || window.supabaseClient || window.sb || null;
  }

  async function getClient() {
    // The site shell owns the authenticated browser client. Reuse it first;
    // creating a second GoTrueClient can race token refresh and cause REST 401s.
    const shared = getSharedClient();
    if (shared) {
      window.doriNotificationsSupabase = shared;
      return shared;
    }
    if (window.doriNotificationsSupabase) return window.doriNotificationsSupabase;
    if (!clientPromise) clientPromise = (async () => {
      // Shared page clients are initialized by deferred module scripts. Give
      // them time to publish window.doriSupabase before falling back.
      for (let attempt = 0; attempt < 120; attempt++) {
        const ready = getSharedClient();
        if (ready) {
          window.doriNotificationsSupabase = ready;
          return ready;
        }
        await new Promise(resolve => window.setTimeout(resolve, 25));
      }
      const ready = getSharedClient();
      if (ready) {
        window.doriNotificationsSupabase = ready;
        return ready;
      }

      let createClient = window.supabase && window.supabase.createClient;
      if (!createClient) {
        const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        createClient = module.createClient;
      }
      // Re-check after the dynamic import, since another page module may have
      // completed initialization while the library was loading.
      const latest = getSharedClient();
      const client = latest || createClient(URL, KEY);
      if (!window.doriSupabase) window.doriSupabase = client;
      window.doriNotificationsSupabase = window.doriSupabase || client;
      return window.doriNotificationsSupabase;
    })();
    return clientPromise;
  }

  function addStyles() {
    if (document.getElementById("dori-notification-center-style")) return;
    const s = document.createElement("style");
    s.id = "dori-notification-center-style";
    s.textContent =
      "#dori-notification-root{font-family:HancomMalrangmalrang,Jua,sans-serif;color:#f5f7ff}"+
      "#dori-notification-root *{box-sizing:border-box}"+
      ".dn-bell{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));z-index:2147482500;display:grid;place-items:center;width:58px;height:58px;padding:0;border:1px solid rgba(163,190,255,.38);border-radius:21px;color:#f7f9ff;background:radial-gradient(circle at 25% 10%,rgba(133,169,255,.28),transparent 55%),linear-gradient(145deg,rgba(22,31,78,.97),rgba(5,9,32,.98));box-shadow:0 15px 38px rgba(0,0,0,.36),inset 0 1px rgba(255,255,255,.12),0 0 28px rgba(93,129,255,.13);backdrop-filter:blur(20px);cursor:pointer;transition:transform .3s cubic-bezier(.22,1,.36,1),border-color .25s,box-shadow .25s}"+
      ".dn-bell:hover{transform:translateY(-4px) scale(1.035);border-color:rgba(175,207,255,.72);box-shadow:0 20px 45px rgba(0,0,0,.43),0 0 32px rgba(96,150,255,.26)}"+
      ".dn-bell svg{width:25px;height:25px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}"+
      ".dn-count{position:absolute;top:-6px;right:-7px;min-width:23px;height:23px;padding:0 6px;display:grid;place-items:center;border:2px solid #080d2d;border-radius:99px;background:linear-gradient(135deg,#ff7a95,#ff405f);color:white;font:400 11px/1 HancomMalrangmalrang,Jua,sans-serif;box-shadow:0 4px 14px rgba(255,62,104,.38)}.dn-count[hidden]{display:none}"+
      ".dn-overlay{position:fixed;inset:0;z-index:2147482499;display:flex;align-items:flex-end;justify-content:flex-end;padding:22px 22px 94px;background:rgba(2,4,18,.57);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;visibility:hidden;transition:opacity .24s,visibility .24s}.dn-overlay[hidden]{display:none}.dn-overlay.open{opacity:1;visibility:visible}"+
      ".dn-panel{display:flex;flex-direction:column;width:min(570px,calc(100vw - 28px));height:min(760px,calc(100dvh - 132px));min-height:350px;overflow:hidden;border:1px solid rgba(154,180,255,.28);border-radius:27px;color:#f5f7ff;background:radial-gradient(ellipse at 90% -5%,rgba(89,120,255,.2),transparent 34%),linear-gradient(155deg,rgba(15,22,57,.99),rgba(5,8,26,.995));box-shadow:0 30px 95px rgba(0,0,0,.56),inset 0 1px rgba(255,255,255,.07);transform:translateY(18px) scale(.985);transition:transform .38s cubic-bezier(.22,1,.36,1)}.dn-overlay.open .dn-panel{transform:translateY(0) scale(1)}"+
      ".dn-head{display:flex;align-items:center;gap:12px;padding:22px 22px 17px;border-bottom:1px solid rgba(160,180,235,.12)}.dn-mark{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;border:1px solid rgba(143,178,255,.28);border-radius:15px;color:#dbe8ff;background:linear-gradient(145deg,rgba(108,144,255,.22),rgba(61,85,161,.08));font-size:22px}.dn-heading{flex:1;min-width:0}.dn-eyebrow{color:#98b6ff;font-size:10px;letter-spacing:.14em}.dn-title{margin:4px 0 0;color:#fff;font-size:22px;font-weight:400;letter-spacing:-.035em}.dn-subtitle{margin:4px 0 0;color:#9ba9cc;font-size:12px;line-height:1.5}.dn-close{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:1px solid rgba(160,180,235,.17);border-radius:13px;background:rgba(255,255,255,.045);color:#d8e1ff;font-size:24px;cursor:pointer;transition:background .2s,transform .2s}.dn-close:hover{background:rgba(143,171,255,.14);transform:rotate(90deg)}"+
      ".dn-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 22px;color:#aab7d6;font-size:12px}.dn-unread-number{margin-left:8px;color:#cfe2ff;font-size:14px;font-variant-numeric:tabular-nums}.dn-all-read{border:0;padding:7px 0;background:transparent;color:#aac4ff;font:inherit;font-size:12px;cursor:pointer}.dn-all-read:hover{color:#fff}.dn-all-read:disabled{opacity:.45;cursor:default}"+
      ".dn-filters{display:flex;gap:7px;padding:0 22px 16px;overflow-x:auto;scrollbar-width:thin}.dn-filter{flex:0 0 auto;border:1px solid rgba(148,170,225,.16);border-radius:99px;padding:8px 12px;background:rgba(255,255,255,.035);color:#aebadb;font:inherit;font-size:12px;cursor:pointer;transition:all .2s}.dn-filter.active{border-color:rgba(142,178,255,.48);background:linear-gradient(135deg,rgba(104,139,255,.23),rgba(64,95,190,.12));color:#edf4ff}"+
      ".dn-list{flex:1;min-height:0;overflow:auto;padding:0 14px 12px;overscroll-behavior:contain;scrollbar-color:rgba(143,164,220,.3) transparent;scrollbar-width:thin}.dn-item{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) 8px;align-items:start;gap:12px;width:100%;margin:0;padding:15px 12px;border:0;border-top:1px solid rgba(152,174,229,.1);border-radius:13px;background:transparent;color:inherit;text-align:left;cursor:pointer;transition:background .2s,transform .2s}.dn-item:hover{background:rgba(116,146,235,.09);transform:translateX(2px)}.dn-item.unread{background:linear-gradient(95deg,rgba(87,125,255,.095),transparent 88%)}"+
      ".dn-item-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(147,175,243,.18);border-radius:14px;background:linear-gradient(145deg,rgba(100,134,235,.15),rgba(70,88,152,.045));color:#c9dcff;font-size:20px}.dn-item[data-category=bank] .dn-item-icon{color:#ffe2a0;border-color:rgba(241,195,101,.18);background:rgba(214,165,64,.08)}.dn-item[data-category=stock] .dn-item-icon{color:#a9f0d7;border-color:rgba(89,220,176,.18);background:rgba(62,196,153,.07)}"+
      ".dn-item-copy{min-width:0}.dn-item-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.dn-item-title{color:#f3f6ff;font-size:14px;font-weight:400;line-height:1.45;overflow-wrap:anywhere}.dn-item-category{color:#92a9d9;font-size:10px}.dn-item-body{display:block;margin-top:5px;color:#aeb9d5;font-size:12px;line-height:1.65;overflow-wrap:anywhere;white-space:pre-wrap}.dn-item-time{display:block;margin-top:8px;color:#7685aa;font-size:10px;font-variant-numeric:tabular-nums}.dn-unread-dot{width:7px;height:7px;margin-top:6px;border-radius:50%;background:#80aaff;box-shadow:0 0 12px rgba(105,159,255,.65)}.dn-item:not(.unread) .dn-unread-dot{visibility:hidden}"+
      ".dn-state{display:grid;place-items:center;min-height:190px;padding:22px;text-align:center;color:#96a6cb;font-size:13px;line-height:1.8}.dn-state-symbol{display:grid;place-items:center;width:54px;height:54px;margin:0 auto 13px;border:1px solid rgba(147,175,243,.19);border-radius:18px;background:rgba(104,136,222,.09);color:#bdd4ff;font-size:24px}.dn-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 20px 18px;border-top:1px solid rgba(152,174,229,.12);color:#7f91b9;font-size:10px}.dn-more{border:1px solid rgba(141,173,255,.25);border-radius:11px;padding:9px 13px;background:rgba(99,132,245,.09);color:#cad9ff;font:inherit;font-size:11px;cursor:pointer}.dn-more:disabled{opacity:.4;cursor:default}.dn-more[hidden]{display:none}"+
      ".dn-toast{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:94px;z-index:2147482501;max-width:min(340px,calc(100vw - 36px));padding:13px 17px;border:1px solid rgba(150,183,255,.35);border-radius:15px;background:linear-gradient(145deg,rgba(20,31,78,.98),rgba(5,10,32,.98));box-shadow:0 12px 35px rgba(0,0,0,.35);color:#edf4ff;font-size:12px;opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s;cursor:pointer}.dn-toast.show{opacity:1;transform:translateY(0)}.dn-toast[hidden]{display:none}"+
      "@media(max-width:600px){.dn-overlay{padding:12px 10px 88px;align-items:flex-end}.dn-panel{width:100%;height:min(78dvh,720px);min-height:330px;border-radius:24px}.dn-head{padding:18px 17px 14px}.dn-summary{padding:11px 18px}.dn-filters{padding:0 17px 12px}.dn-list{padding:0 9px 9px}.dn-item{gap:10px;padding:13px 9px}.dn-footer{padding:11px 16px 15px}.dn-bell{width:54px;height:54px;border-radius:19px}}@media(prefers-reduced-motion:reduce){.dn-bell,.dn-overlay,.dn-panel,.dn-item,.dn-close,.dn-toast{transition:none!important}.dn-bell:hover,.dn-item:hover{transform:none}}";
    document.head.appendChild(s);
  }

  function showState(list, message, icon) {
    list.innerHTML = '<div class="dn-state"><div><div class="dn-state-symbol">' + (icon || "✦") + '</div>' + esc(message) + '</div></div>';
  }

  function renderRows(list, rows, append, moreButton) {
    const html = rows.map(row => {
      const cat = categories[row.category] || categories.system;
      const time = new Intl.DateTimeFormat("ko-KR", {timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(row.created_at));
      return '<button type="button" class="dn-item' + (row.read_at ? '' : ' unread') + '" data-id="' + esc(row.id) + '" data-url="' + esc(row.target_url || "./index.html") + '" data-category="' + esc(row.category) + '" aria-label="' + esc(row.title) + (row.read_at ? '' : ', 읽지 않음') + '">' +
        '<span class="dn-item-icon" aria-hidden="true">' + cat.icon + '</span>' +
        '<span class="dn-item-copy"><span class="dn-item-top"><span class="dn-item-title">' + esc(row.title) + '</span><span class="dn-item-category">' + cat.label + '</span></span>' +
        '<span class="dn-item-body">' + esc(row.body || "") + '</span><time class="dn-item-time" datetime="' + esc(row.created_at) + '">' + esc(time) + '</time></span>' +
        '<span class="dn-unread-dot" aria-hidden="true"></span></button>';
    }).join("");
    if (append) list.insertAdjacentHTML("beforeend", html);
    else list.innerHTML = html;
    if (!rows.length && !append) showState(list, "아직 알림이 없어요. 새 소식이 생기면 여기에 표시할게요.", "✧");
    moreButton.hidden = offset >= totalRows || rows.length === 0;
    moreButton.disabled = busy;
    moreButton.textContent = moreButton.hidden ? "모든 알림을 확인했어요" : "이전 알림 더 보기 ↓";
  }

  function navigateLocal(rawTarget) {
    try {
      const target = String(rawTarget || "./index.html").trim();
      if (!target || target.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(target)) throw new Error("Invalid local target");
      const url = new URL(target, window.location.href);
      if (url.origin !== window.location.origin) throw new Error("External target blocked");
      window.location.assign(url.href);
    } catch (_) { window.location.assign("./index.html"); }
  }

  function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("open");
    if (requested !== "attendance" && requested !== "achievements") return;

    let tries = 0;
    const attempt = () => {
      if (requested === "attendance" && typeof window.doriOpenAttendanceCalendar === "function") {
        window.doriOpenAttendanceCalendar();
        return;
      }
      if (requested === "achievements") {
        const button = document.getElementById("업적버튼");
        if (button && typeof button.click === "function" && typeof button.onclick === "function") {
          button.click();
          return;
        }
      }
      if (++tries < 40) window.setTimeout(attempt, 150);
    };
    attempt();
    params.delete("open");
    window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash);
  }

  function mount(client, userId) {
    if (root && currentUserId === userId) return;
    if (root) disposeRoot();
    currentUserId = userId;
    addStyles();
    root = document.createElement("div");
    root.id = "dori-notification-root";
    root.innerHTML =
      '<button type="button" class="dn-bell" aria-label="알림 센터 열기" aria-haspopup="dialog" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span class="dn-count" hidden>0</span></button>' +
      '<div class="dn-overlay" hidden><section class="dn-panel" role="dialog" aria-modal="true" aria-labelledby="dn-title">' +
      '<header class="dn-head"><div class="dn-mark" aria-hidden="true">✦</div><div class="dn-heading"><div class="dn-eyebrow">DORI SITE · NOTIFICATION CENTER</div><h2 class="dn-title" id="dn-title">알림 센터</h2><p class="dn-subtitle">중요한 소식과 활동 기록을 한곳에서 확인하세요.</p></div><button type="button" class="dn-close" aria-label="알림 센터 닫기">×</button></header>' +
      '<div class="dn-summary"><div>읽지 않은 알림<strong class="dn-unread-number">0</strong></div><button type="button" class="dn-all-read">모두 읽음 처리</button></div>' +
      '<nav class="dn-filters" aria-label="알림 종류"></nav><div class="dn-list" tabindex="0" aria-live="polite"></div>' +
      '<footer class="dn-footer"><span>알림은 계정에 안전하게 저장돼요.</span><button type="button" class="dn-more" hidden>이전 알림 더 보기 ↓</button></footer></section></div>' +
      '<button type="button" class="dn-toast" hidden>새 알림이 도착했어요. 알림 센터에서 확인하기 ↗</button>';
    document.body.appendChild(root);
    const bell = root.querySelector(".dn-bell"), overlay = root.querySelector(".dn-overlay");
    const list = root.querySelector(".dn-list"), toast = root.querySelector(".dn-toast");
    const moreButton = root.querySelector(".dn-more"), allRead = root.querySelector(".dn-all-read");
    const nav = root.querySelector(".dn-filters");
    Object.keys(categories).forEach(key => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "dn-filter" + (key === "all" ? " active" : "");
      button.dataset.category = key; button.textContent = categories[key].label;
      button.setAttribute("aria-pressed", String(key === "all"));
      nav.appendChild(button);
    });
    function open() {
      if (loadMoreTimer) clearTimeout(loadMoreTimer);
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("open"));
      bell.setAttribute("aria-expanded", "true");
      toast.hidden = true; toast.classList.remove("show");
      void loadList(true); void refreshUnread(false);
      window.setTimeout(() => root.querySelector(".dn-close").focus(), 80);
    }
    function close() {
      overlay.classList.remove("open"); bell.setAttribute("aria-expanded", "false");
      loadMoreTimer = window.setTimeout(() => { if (!overlay.classList.contains("open")) overlay.hidden = true; }, 260);
      bell.focus({preventScroll:true});
    }
    bell.addEventListener("click", () => overlay.hidden || !overlay.classList.contains("open") ? open() : close());
    root.querySelector(".dn-close").addEventListener("click", close);
    overlay.addEventListener("click", e => {if(e.target === overlay) close();});
    root.addEventListener("keydown", e => {if(e.key === "Escape" && !overlay.hidden) close();});
    toast.addEventListener("click", open);
    nav.addEventListener("click", e => {
      const button = e.target.closest(".dn-filter"); if (!button) return;
      category = button.dataset.category || "all";
      nav.querySelectorAll(".dn-filter").forEach(b => {const yes=b===button;b.classList.toggle("active",yes);b.setAttribute("aria-pressed",String(yes));});
      void loadList(true);
    });
    moreButton.addEventListener("click", () => loadList(false));
    allRead.addEventListener("click", async () => {
      allRead.disabled = true;
      try {
        const result = await client.rpc("dori_notifications_mark_all_read");
        if (result.error) throw result.error;
        await Promise.all([refreshUnread(false), loadList(true)]);
      } catch (e) { console.error("[Dori Notifications] 모두 읽음 처리 실패:",e); showState(list,"읽음 처리에 실패했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.","↻"); }
      finally { allRead.disabled = false; }
    });
    list.addEventListener("click", async e => {
      const item = e.target.closest(".dn-item"); if (!item) return;
      item.disabled = true;
      try {
        const result = await client.from("dori_notifications").update({read_at:new Date().toISOString()}).eq("id",item.dataset.id).eq("user_id",userId);
        if (result.error) console.warn("[Dori Notifications] 읽음 상태 저장 실패:", result.error.message);
      } finally { await refreshUnread(false); navigateLocal(item.dataset.url); }
    });

    async function loadList(reset) {
      if (busy) return;
      busy = true;
      if (reset) {offset=0;totalRows=0;list.innerHTML='<div class="dn-state">알림을 불러오는 중이에요…</div>';}
      else {moreButton.disabled=true;moreButton.textContent="불러오는 중…";}
      try {
        let query = client.from("dori_notifications").select("id,category,title,body,target_url,created_at,read_at",{count:"exact"})
          .eq("user_id",userId).order("created_at",{ascending:false}).range(offset,offset+24);
        if (category !== "all") query = query.eq("category",category);
        let result = await query;
        if (result.error && await refreshSessionAfter401(client, result.error)) {
          let retry = client.from("dori_notifications").select("id,category,title,body,target_url,created_at,read_at",{count:"exact"})
            .eq("user_id",userId).order("created_at",{ascending:false}).range(reset ? 0 : offset, (reset ? 0 : offset) + 24);
          if (category !== "all") retry = retry.eq("category",category);
          result = await retry;
        }
        if (result.error) throw result.error;
        if (!root || currentUserId !== userId) return;
        const rows = result.data || [];
        if (reset) totalRows = result.count == null ? rows.length : result.count;
        else if (result.count != null) totalRows = result.count;
        offset = reset ? rows.length : offset + rows.length;
        renderRows(list,rows,!reset,moreButton);
      } catch (e) {
        console.error("[Dori Notifications] 목록 조회 실패:", {
          message: String(e && e.message || e), code: e && e.code || null, status: e && e.status || null
        });
        if (reset && root && currentUserId === userId) showState(list,"알림을 불러오지 못했어요. 연결 상태를 확인한 뒤 다시 열어 주세요.","↻");
        else {moreButton.disabled=false;moreButton.textContent="다시 불러오기 ↻";}
      } finally {busy=false;allRead.disabled=false;if(!moreButton.hidden&&offset>=totalRows)moreButton.hidden=true;moreButton.disabled=moreButton.hidden;}
    }
    async function refreshUnread(showToast) {
      try {
        const runCountQuery = () => client.from("dori_notifications").select("id",{count:"exact",head:true}).eq("user_id",userId).is("read_at",null);
        let result = await runCountQuery();
        if (result.error && await refreshSessionAfter401(client, result.error)) result = await runCountQuery();
        if (result.error) throw result.error;
        if (!root || currentUserId !== userId) return;
        const count = Number(result.count || 0), badge = root.querySelector(".dn-count");
        badge.textContent = count > 99 ? "99+" : String(count); badge.hidden = count === 0;
        bell.setAttribute("aria-label",count ? "읽지 않은 알림 "+count+"개, 알림 센터 열기" : "알림 센터 열기");
        root.querySelector(".dn-unread-number").textContent = new Intl.NumberFormat("ko-KR").format(count);
        allRead.disabled = count === 0 || busy;
        if (showToast && lastUnread !== null && count > lastUnread && overlay.hidden) {
          toast.hidden=false; requestAnimationFrame(()=>toast.classList.add("show"));
          window.setTimeout(()=>{toast.classList.remove("show");window.setTimeout(()=>{toast.hidden=true;},250);},4200);
        }
        lastUnread=count;
      } catch (e) {
        console.warn("[Dori Notifications] 읽지 않은 알림 조회 실패:", {
          message: String(e && e.message || e), code: e && e.code || null, status: e && e.status || null
        });
      }
    }
    const onFocus = () => { void refreshUnread(false); if (!overlay.hidden) void loadList(true); };
    const onVisibility = () => { if (!document.hidden) { void refreshUnread(true); if (!overlay.hidden) void loadList(true); } };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    activeCleanups.push(() => window.removeEventListener("focus", onFocus));
    activeCleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));
    ["dori:attendance-claimed","dori:daily-mission-completed","dori:daily-mission-reward-claimed","dori:achievement-claimed"].forEach(name => {
      const onActivity = () => window.setTimeout(() => {
        if (!root) return;
        void refreshUnread(true);
        if (!overlay.hidden) void loadList(true);
      }, 700);
      window.addEventListener(name, onActivity);
      activeCleanups.push(() => window.removeEventListener(name, onActivity));
    });
    void refreshUnread(false);
    pollTimer = window.setInterval(() => { if (!document.hidden && root) void refreshUnread(true); }, 45000);
    handleDeepLink();
  }

  async function init() {
    try {
      const client = await getClient();
      const first = await client.auth.getSession();
      if (first.error) throw first.error;
      if (first.data && first.data.session && first.data.session.user && first.data.session.user.id) mount(client,first.data.session.user.id);
      client.auth.onAuthStateChange((_event,session)=>{
        window.setTimeout(()=>{
          if(session && session.user && session.user.id) mount(client,session.user.id);
          else { if (root) disposeRoot(); }
        },0);
      });
    } catch(e) {console.warn("[Dori Notifications] 초기화 실패:",e);}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else void init();
})();
