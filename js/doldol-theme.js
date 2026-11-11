/* DORI SITE SHARED INTERACTION ENGINE — UX refresh */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sharedScript = document.currentScript;
  const SITE_ROOT = sharedScript && sharedScript.src
    ? new URL("../", sharedScript.src).href
    : new URL("./", window.location.href).href;
  const HOME_URL = SITE_ROOT;
  const siteAssetUrl = (path) => new URL(path, SITE_ROOT).href;
  const body = document.body;
  if (!body) return;
  if (!reduceMotion && !document.querySelector(".dori-world")) {
    const world = document.createElement("div");
    world.className = "dori-world";
    world.setAttribute("aria-hidden", "true");
    world.innerHTML = '<i class="a"></i><i class="b"></i><i class="c"></i>';
    body.prepend(world);
  }
  if (!document.querySelector(".dori-sheen")) {
    const sheen = document.createElement("div");
    sheen.className = "dori-sheen"; sheen.setAttribute("aria-hidden", "true"); body.append(sheen);
  }
  let transition = document.querySelector(".dori-page-transition");
  if (!transition) {
    transition = document.createElement("div"); transition.className = "dori-page-transition";
    transition.setAttribute("aria-hidden", "true"); body.append(transition);
  }
  let loader = document.querySelector(".dori-loader");
  if (!loader) {
    loader = document.createElement("div"); loader.className = "dori-loader"; loader.setAttribute("aria-hidden", "true");
    loader.innerHTML = '<div class="dori-loader-core"><div class="dori-loader-mark">D</div><div class="dori-loader-name">돌이사이트</div><div class="dori-loader-sub">DOLDOL SYSTEM</div><div class="dori-loader-bar"><i></i></div></div>';
    body.append(loader);
  }
  /* Ordinary brand/back links keep their original label, size and position. */
  const homeUrl = new URL(HOME_URL);
  const homePath = homeUrl.pathname.endsWith("/") ? homeUrl.pathname.slice(0, -1) : homeUrl.pathname;
  const trimPath = (path) => path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  const isSiteHomePage = () => {
    const current = new URL(window.location.href);
    const currentPath = trimPath(current.pathname);
    return current.origin === homeUrl.origin &&
      (currentPath === homePath || currentPath === homePath + "/index.html");
  };
  const isMainSiteDestination = (rawHref) => {
    if (!rawHref) return false;
    try {
      const target = new URL(rawHref, window.location.href);
      const targetPath = trimPath(target.pathname);
      return target.origin === homeUrl.origin &&
        (targetPath === homePath || targetPath === homePath + "/index.html");
    } catch (_) { return false; }
  };
  const renderMainButton = (element, kind) => {
    if (!element || element.dataset.doriMainHomeNormalized === "true") return;
    ["logo","brand","site-brand","site-logo","home-button","back-button","header-btn","뒤로가기","사이트제목","사이트브랜드"].forEach((name) => element.classList.remove(name));
    element.classList.add("dori-main-site-button");
    element.dataset.doriMainHome = "true";
    element.dataset.doriMainHomeNormalized = "true";
    element.setAttribute("aria-label", "돌이사이트 메인으로 이동");
    element.setAttribute("title", "돌이사이트 메인으로 이동");
    if (kind === "link") {
      element.href = HOME_URL;
      element.removeAttribute("target");
    }
    if (kind === "button") element.type = "button";
    element.innerHTML =
      '<span class="dori-main-home-mark" aria-hidden="true">D</span>' +
      '<span class="dori-main-home-label">돌이사이트 메인</span>' +
      '<span class="dori-main-home-arrow" aria-hidden="true">↗</span>';
  };
  const cleanupEmptyWrapper = (parent) => {
    if (!parent || parent === body || parent.children.length || parent.textContent.trim()) return;
    if (parent.matches(".brand,.logo,.site-brand,.site-logo,.사이트브랜드,.header-brand,.brand-area")) parent.remove();
  };
  const navigationContainer = (seed) => {
    const header = seed && seed.closest ? seed.closest("header") : document.querySelector("header");
    if (header) return header.querySelector(".wrap,.header-inner,.topbar-inner,.header-container,.container,.inner") || header;
    return document.querySelector(".상단바,.상단영역,.상단,.topbar,.top") || body;
  };
  const hideLegacyBackControl = (element) => {
    if (!element || element.dataset.doriMainHomeNormalized === "true") return;
    element.classList.add("dori-obsolete-home-control");
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("tabindex", "-1");
  };
  const removeDuplicateHomeLink = (link) => {
    if (!link || link.dataset.doriMainHomeNormalized === "true") return;
    const parent = link.parentElement;
    link.remove();
    cleanupEmptyWrapper(parent);
  };
  const normalizeMainSiteButtons = (root = document) => {
    if (isSiteHomePage()) {
      const logo = document.getElementById("사이트로고");
      const logoLink = logo && logo.closest("a[href]");
      if (logoLink) {
        logoLink.id = "사이트로고";
        renderMainButton(logoLink, "link");
      }
      document.querySelectorAll("a[href]").forEach((link) => {
        if (link.id !== "사이트로고" && isMainSiteDestination(link.getAttribute("href"))) removeDuplicateHomeLink(link);
      });
      return;
    }

    const allHomeLinks = Array.from(document.querySelectorAll("a[href]"))
      .filter((link) => isMainSiteDestination(link.getAttribute("href")));
    let primary = allHomeLinks.find((link) => link.dataset.doriMainHomeNormalized === "true") || allHomeLinks[0] || null;

    // If the page has no homepage link, reuse the existing header back button to
    // preserve event listeners already attached by the page's original scripts.
    if (!primary) {
      primary = Array.from(document.querySelectorAll("button"))
        .find((button) => button.id === "뒤로가기" || button.classList.contains("뒤로가기") ||
          button.classList.contains("back-button") || button.dataset.doriMainHomeNormalized === "true") || null;
    }

    if (!primary) {
      primary = document.createElement("a");
      primary.href = HOME_URL;
      primary.dataset.doriMainHomeCreated = "true";
      const container = navigationContainer(null);
      container.insertBefore(primary, container.firstChild);
      renderMainButton(primary, "link");
    } else {
      const kind = primary.tagName === "A" ? "link" : "button";
      const container = navigationContainer(primary);
      const oldParent = primary.parentElement;
      if (container && primary.parentElement !== container) container.insertBefore(primary, container.firstChild);
      else if (container && primary !== container.firstElementChild) container.insertBefore(primary, container.firstChild);
      if (oldParent && oldParent !== container) cleanupEmptyWrapper(oldParent);
      renderMainButton(primary, kind);
    }

    Array.from(document.querySelectorAll("a[href]")).forEach((link) => {
      if (link !== primary && isMainSiteDestination(link.getAttribute("href"))) removeDuplicateHomeLink(link);
    });

    // Keep hidden nodes where legacy code binds handlers, but remove them from the UI.
    Array.from(document.querySelectorAll("button#뒤로가기,button.뒤로가기,a.back-button,button.back-button"))
      .forEach((element) => { if (element !== primary) hideLegacyBackControl(element); });

    Array.from(document.querySelectorAll("button")).forEach((button) => {
      if (button === primary || button.dataset.doriMainHomeNormalized === "true") return;
      const label = (button.innerText || button.textContent || "").replace(/\s+/g, " ").trim();
      const legacyLabel = /^(?:←\s*)?(?:돌이\s*사이트|돌이사이트|메인으로|홈으로|뒤로가기)(?:\s*↗)?$/i.test(label);
      if (legacyLabel && (button.closest("header,.topbar,.top,.상단바,.상단영역,.상단") || button.id === "뒤로가기")) {
        hideLegacyBackControl(button);
      }
    });

    // Remove a duplicate, non-clickable generic site wordmark from the header.
    // Real product names such as "돌이 AI" and "돌돌증권" are intentionally kept.
    Array.from(document.querySelectorAll("header .brand,header .site-brand,header .site-title,.상단바 .brand,.top .brand"))
      .forEach((brand) => {
        if (brand === primary || brand.querySelector("a,button")) return;
        const label = (brand.innerText || brand.textContent || "").replace(/\s+/g, " ").trim();
        if (/^(?:돌이\s*사이트|돌이사이트)$/i.test(label)) brand.remove();
      });
  };
  normalizeMainSiteButtons();
  if ("MutationObserver" in window) {
    const homeLinkObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) normalizeMainSiteButtons(node);
      }));
    });
    homeLinkObserver.observe(body, { childList: true, subtree: true });
  }
  document.documentElement.classList.add("dori-system"); body.classList.add("dori-page");
  const pageRoot = document.querySelector("[data-dori-page-root]") || document.querySelector("main") || document.getElementById("사이트") || document.querySelector(".page");
  if (pageRoot && !reduceMotion && !pageRoot.hasAttribute("data-no-page-intro")) pageRoot.classList.add("dori-enter");
  /* Reveal is opt-in; don't overwrite animations built into individual pages. */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const items = document.querySelectorAll("[data-dori-reveal]");
    if (items.length) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add("dori-visible"); observer.unobserve(entry.target); }
        });
      }, { threshold: .08 });
      items.forEach((item) => { item.classList.add("dori-reveal"); observer.observe(item); });
    }
  }
  /* Fast pages never show a blocking loader; slow pages get a brief fallback. */
  let loaderShown = false;
  const loaderTimer = window.setTimeout(() => { loaderShown = true; loader.classList.add("show"); }, 320);
  function finishLoading() { window.clearTimeout(loaderTimer); loader.classList.add("done"); }
  if (document.readyState === "complete") finishLoading();
  else window.addEventListener("load", finishLoading, { once: true });
  /* Short transition only for normal same-tab internal navigation. */
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("download") || link.target === "_blank" || link.target === "_parent" ||
        link.target === "_top" || link.hasAttribute("data-no-transition") || link.closest("[data-no-transition]")) return;
    const raw = link.getAttribute("href");
    if (!raw || raw[0] === "#" || /^javascript:/i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) return;
    let destination;
    try { destination = new URL(raw, window.location.href); } catch (_) { return; }
    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
    event.preventDefault(); transition.classList.add("leaving");
    const sheen = document.querySelector(".dori-sheen"); if (sheen) sheen.classList.add("show");
    window.setTimeout(() => window.location.assign(destination.href), reduceMotion ? 0 : 170);
  });
  window.addEventListener("pageshow", () => {
    transition.classList.remove("leaving");
    const sheen = document.querySelector(".dori-sheen"); if (sheen) sheen.classList.remove("show");
    loader.classList.remove("show", "done");
  });
  /* Preserve Doldol Securities tabs without blanket card transforms. */
  if (document.querySelector(".tabs .tab[data-tab]")) {
    const activateTab = (tabName) => {
      document.querySelectorAll(".tabs .tab[data-tab]").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
      document.querySelectorAll(".section[id^='section-']").forEach((section) => section.classList.toggle("active", section.id === "section-" + tabName));
    };
    document.querySelectorAll(".tabs .tab[data-tab]").forEach((tab) => {
      if (tab.dataset.doldolTabBound === "true") return;
      tab.dataset.doldolTabBound = "true";
      tab.addEventListener("click", (event) => { event.preventDefault(); activateTab(tab.dataset.tab); });
    });
  }
  if (!document.querySelector('script[data-dori-daily-attendance]')) {
    const attendanceScript = document.createElement("script");
    attendanceScript.src = siteAssetUrl("js/daily-attendance.js?v=20261023-shared-client-2");
    attendanceScript.dataset.doriDailyAttendance = "true"; attendanceScript.async = true;
    (document.head || document.documentElement).appendChild(attendanceScript);
  }

  /* Keep the authenticated notification center available across site pages. */
  if (document.body?.dataset.disableNotificationCenter !== "true" && !document.querySelector('script[data-dori-notification-center]')) {
    const notificationScript = document.createElement("script");
    notificationScript.src = siteAssetUrl("js/dori-notification-center.js?v=20261023-notifications-4");
    notificationScript.dataset.doriNotificationCenter = "true";
    notificationScript.async = true;
    (document.head || document.documentElement).appendChild(notificationScript);
  }

  /* Account-wide Random Box background: read the authenticated user's equipped_background. */
  (() => {
    const PROJECT_URL = "https://scttowfhygcpdirrekqm.supabase.co";
    const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY";
    if (!document.getElementById("dori-site-background-style")) {
      const style = document.createElement("style");
      style.id = "dori-site-background-style";
      style.textContent = "/* ===== Random Box: account-wide site backgrounds ===== */\nbody.dori-site-background-active{\n  background:transparent!important;\n  isolation:isolate;\n}\n.dori-site-background-layer{\n  position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;\n  background:\n    radial-gradient(ellipse at 50% 0%,rgba(93,119,255,.15),transparent 58%),\n    linear-gradient(145deg,#070d35,#030514 76%);\n  background-size:cover;\n  transform:translateZ(0);\n}\n.dori-site-background-layer::before,\n.dori-site-background-layer::after{\n  content:\"\";position:absolute;inset:-12%;pointer-events:none;\n}\n.dori-site-background-layer::before{\n  opacity:.48;\n  background:\n    radial-gradient(circle at 18% 28%,rgba(105,178,255,.18),transparent 25%),\n    radial-gradient(circle at 78% 72%,rgba(138,108,255,.16),transparent 30%),\n    radial-gradient(circle at 52% 48%,rgba(255,255,255,.035),transparent 52%);\n}\n.dori-site-background-layer::after{\n  opacity:.2;\n  background-image:radial-gradient(rgba(255,255,255,.6) .7px,transparent .9px);\n  background-size:46px 46px;\n  mask-image:linear-gradient(to bottom,transparent,#000 18%,#000 82%,transparent);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_RARE\"]{\n  background:\n    radial-gradient(ellipse at 16% 20%,rgba(45,133,255,.3),transparent 38%),\n    radial-gradient(ellipse at 86% 76%,rgba(41,93,201,.24),transparent 42%),\n    linear-gradient(145deg,#071b43 0%,#07112f 48%,#030817 100%);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_SUPER_RARE\"]{\n  background:\n    radial-gradient(ellipse at 15% 12%,rgba(52,180,255,.34),transparent 38%),\n    radial-gradient(ellipse at 84% 24%,rgba(143,95,255,.28),transparent 42%),\n    radial-gradient(ellipse at 48% 100%,rgba(35,107,232,.28),transparent 48%),\n    linear-gradient(135deg,#08163b,#10113b 55%,#050a20);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_SUPER_RARE\"]::before{\n  opacity:.62;filter:blur(5px);\n  background:conic-gradient(from 35deg at 50% 48%,transparent 0 18%,rgba(67,186,255,.12) 25%,transparent 36% 54%,rgba(163,107,255,.12) 64%,transparent 78%);\n  animation:doriBackgroundAurora 24s ease-in-out infinite alternate;\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_MYTHIC\"]{\n  background:\n    radial-gradient(ellipse at 48% 45%,rgba(115,75,220,.24),transparent 45%),\n    radial-gradient(ellipse at 15% 10%,rgba(63,108,255,.28),transparent 38%),\n    radial-gradient(ellipse at 85% 85%,rgba(201,76,255,.2),transparent 40%),\n    linear-gradient(145deg,#0b0b32,#08091e 58%,#170b32);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_MYTHIC\"]::before{\n  opacity:.72;background:\n    radial-gradient(circle at 20% 25%,#fff 0 1px,transparent 1.8px),\n    radial-gradient(circle at 68% 18%,rgba(180,202,255,.95) 0 1px,transparent 2px),\n    radial-gradient(circle at 82% 68%,rgba(255,190,255,.9) 0 1px,transparent 2px),\n    radial-gradient(circle at 38% 78%,rgba(156,187,255,.9) 0 1px,transparent 2px),\n    radial-gradient(ellipse at 50% 50%,rgba(156,94,255,.16),transparent 60%);\n  background-size:173px 157px,211px 193px,239px 223px,181px 207px,100% 100%;\n  animation:doriBackgroundStars 36s linear infinite;\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_LEGENDARY\"]{\n  background:\n    radial-gradient(ellipse at 50% -10%,rgba(255,218,130,.34),transparent 43%),\n    radial-gradient(ellipse at 8% 72%,rgba(170,108,255,.24),transparent 38%),\n    radial-gradient(ellipse at 94% 70%,rgba(255,173,95,.2),transparent 36%),\n    linear-gradient(145deg,#21183b 0%,#11102c 48%,#080a1d 100%);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_LEGENDARY\"]::before{\n  opacity:.62;\n  background:repeating-radial-gradient(ellipse at 50% 50%,transparent 0 70px,rgba(255,221,158,.07) 72px 73px,transparent 76px 145px);\n  animation:doriBackgroundOrbit 70s linear infinite;\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_DORI\"]{\n  background:\n    radial-gradient(ellipse at 50% 0%,rgba(255,230,170,.44),transparent 45%),\n    radial-gradient(ellipse at 12% 72%,rgba(255,171,106,.24),transparent 38%),\n    radial-gradient(ellipse at 90% 78%,rgba(255,218,142,.23),transparent 40%),\n    linear-gradient(145deg,#493052 0%,#292447 45%,#11162e 100%);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_DORI\"]::before{\n  opacity:.42;\n  background:\n    radial-gradient(ellipse at 50% 55%,rgba(255,240,199,.22),transparent 52%),\n    radial-gradient(circle at 22% 30%,rgba(255,226,169,.8) 0 2px,transparent 3px),\n    radial-gradient(circle at 76% 66%,rgba(255,205,139,.65) 0 2px,transparent 3px);\n  background-size:100% 100%,127px 119px,171px 163px;\n  animation:doriBackgroundAurora 28s ease-in-out infinite alternate;\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_DORONIUM\"]{\n  background:\n    radial-gradient(ellipse at 50% 42%,rgba(66,226,255,.28),transparent 42%),\n    radial-gradient(ellipse at 12% 12%,rgba(60,144,255,.28),transparent 40%),\n    radial-gradient(ellipse at 88% 86%,rgba(77,105,255,.28),transparent 42%),\n    linear-gradient(135deg,#041b38 0%,#071b36 42%,#080d2d 100%);\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_DORONIUM\"]::before{\n  opacity:.72;filter:blur(1px);\n  background:\n    conic-gradient(from 20deg at 50% 50%,transparent 0 12%,rgba(78,236,255,.13) 18%,transparent 26% 43%,rgba(88,130,255,.16) 52%,transparent 64% 80%,rgba(90,235,255,.1) 88%,transparent),\n    repeating-linear-gradient(125deg,transparent 0 44px,rgba(125,242,255,.035) 45px 46px,transparent 47px 92px);\n  animation:doriBackgroundAurora 32s ease-in-out infinite alternate;\n}\n.dori-site-background-layer[data-background=\"BACKGROUND_DORONIUM\"]::after{\n  opacity:.38;background-image:linear-gradient(30deg,transparent 48%,rgba(111,245,255,.14) 49%,transparent 50%),linear-gradient(150deg,transparent 48%,rgba(111,245,255,.1) 49%,transparent 50%);\n  background-size:84px 84px;mask-image:radial-gradient(ellipse at center,#000,transparent 78%);\n}\n@keyframes doriBackgroundAurora{from{transform:translate3d(-1.5%,0,0) rotate(-3deg) scale(1)}to{transform:translate3d(1.5%,1%,0) rotate(3deg) scale(1.08)}}\n@keyframes doriBackgroundStars{from{transform:translate3d(0,0,0)}to{transform:translate3d(-42px,28px,0)}}\n@keyframes doriBackgroundOrbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}\n@media(prefers-reduced-motion:reduce){.dori-site-background-layer::before,.dori-site-background-layer::after{animation:none!important}}\n@media(max-width:600px){.dori-site-background-layer::before{opacity:.38}.dori-site-background-layer::after{background-size:36px 36px}}";
      (document.head || document.documentElement).appendChild(style);
    }
    const ALLOWED = new Set(["BACKGROUND_RARE","BACKGROUND_SUPER_RARE","BACKGROUND_MYTHIC","BACKGROUND_LEGENDARY","BACKGROUND_DORI","BACKGROUND_DORONIUM"]);
    const apply = (rawCode) => {
      const code = String(rawCode || "").toUpperCase();
      const valid = ALLOWED.has(code) ? code : "";
      let layer = document.querySelector(".dori-site-background-layer");
      if (!valid) {
        if (layer) layer.remove();
        document.body?.classList.remove("dori-site-background-active");
        delete document.body?.dataset.doriSiteBackground;
        return;
      }
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "dori-site-background-layer";
        layer.setAttribute("aria-hidden","true");
        document.body?.prepend(layer);
      }
      layer.dataset.background = valid;
      document.body?.classList.add("dori-site-background-active");
      document.body.dataset.doriSiteBackground = valid;
    };
    window.applyDoriSiteBackground = apply;
    const clientReady = async () => {
      const shared = () => window.doriSupabase || window.supabaseClient || window.sb || null;
      for (let i=0;i<120;i++) {
        const client=shared();
        if(client) return client;
        await new Promise(resolve=>window.setTimeout(resolve,25));
      }
      if (window.__doriSiteBackgroundClient) return window.__doriSiteBackgroundClient;
      let createClient = window.supabase && window.supabase.createClient;
      if (!createClient) {
        const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
        createClient = module.createClient;
      }
      const client = createClient(PROJECT_URL,ANON_KEY);
      if (!window.doriSupabase) window.doriSupabase = client;
      window.__doriSiteBackgroundClient = window.doriSupabase || client;
      return window.__doriSiteBackgroundClient;
    };
    let loadSequence = 0;
    let subscribedClient = null;
    const attachAuthListener = client => {
      if (!client?.auth?.onAuthStateChange || subscribedClient === client) return;
      subscribedClient = client;
      client.auth.onAuthStateChange(event => {
        if (event === "SIGNED_OUT") apply("");
        else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") load();
      });
    };
    const load = async () => {
      const sequence = ++loadSequence;
      try {
        const client = await clientReady();
        attachAuthListener(client);
        const {data:{session},error:sessionError} = await client.auth.getSession();
        if(sessionError) throw sessionError;
        if(!session) { apply(""); return; }
        const {data,error} = await client.from("dori_site_customization")
          .select("equipped_background").eq("user_id",session.user.id).maybeSingle();
        if(error) throw error;
        if(sequence!==loadSequence) return;
        apply(data?.equipped_background || "");
      } catch(error) {
        console.warn("돌이사이트 배경을 불러오지 못했습니다:",error);
      }
    };
    const start = () => {
      if(!document.body) return;
      load();
      window.addEventListener("storage",event=>{
        if(event.key && event.key.includes("auth-token")) load();
      });
    };
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
    else start();
  })();

})();
