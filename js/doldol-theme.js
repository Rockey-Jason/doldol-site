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
  document.querySelectorAll('#뒤로가기,a.dori-home-button,a[data-dori-home="true"]').forEach((link) => {
    link.classList.add("dori-home-button");
    if (link.id === "뒤로가기") link.href = HOME_URL;
    if (!link.hasAttribute("aria-label")) link.setAttribute("aria-label", "돌이사이트 메인으로 이동");
  });
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
