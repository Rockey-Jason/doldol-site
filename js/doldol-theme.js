/* DORI SITE SHARED INTERACTION ENGINE — UX refresh */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOME_URL = "https://rockey-jason.github.io/doldol-site/";
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
    attendanceScript.src = "https://rockey-jason.github.io/doldol-site/js/daily-attendance.js?v=20261018-calendar-popup-1";
    attendanceScript.dataset.doriDailyAttendance = "true"; attendanceScript.async = true;
    (document.head || document.documentElement).appendChild(attendanceScript);
  }
})();
