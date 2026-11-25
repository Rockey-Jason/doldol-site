/* DORI SITE-WIDE TEXT SCALE
 * Scales readable DOM text only. Layout boxes, icons, SVG, canvas and media stay untouched.
 * Recovery-safe: if a page/game changes an inline font-size while our scale is applied,
 * adopt that new authored value as the baseline instead of scaling the previous result again.
 */
(() => {
  "use strict";
  if (window.__DORI_TEXT_SCALE_READY__) return;
  window.__DORI_TEXT_SCALE_READY__ = true;

  const STORAGE_KEY = "dori-convenience-preferences-v1";
  const CALENDAR_STORAGE_KEY = "rockey-calendar-font-scale-v1";
  const MIN_SCALE = 80;
  const MAX_SCALE = 140;
  const LEGACY = { small: 90, normal: 100, large: 115, largest: 130 };
  const snapshots = new Map();
  let currentScale = 100;
  let refreshFrame = 0;
  let refreshTimer = 0;

  const clampScale = value => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 100;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(parsed)));
  };

  function readScale() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (stored && Object.prototype.hasOwnProperty.call(stored, "fontScale")) return clampScale(stored.fontScale);
      return clampScale(LEGACY[stored?.font] ?? 100);
    } catch (_) { return 100; }
  }

  const isRockeyCalendarPage = document.documentElement.hasAttribute("data-rockey-calendar-page");
  function readCalendarScale() {
    if (!isRockeyCalendarPage) return 100;
    try { return clampScale(localStorage.getItem(CALENDAR_STORAGE_KEY) || 100); }
    catch (_) { return 100; }
  }
  let calendarScale = readCalendarScale();

  function restoreOneFontSize(element, original) {
    if (!element || !original) return;
    const currentValue = element.style.getPropertyValue("font-size");
    const currentPriority = element.style.getPropertyPriority("font-size");

    // If our exact !important value is still present, restore the captured baseline.
    if (currentValue === original.appliedValue && currentPriority === "important") {
      if (original.value) element.style.setProperty("font-size", original.value, original.priority);
      else element.style.removeProperty("font-size");
      return;
    }

    // A game or component wrote a new inline size after scaling. Preserve that
    // authored value as the new baseline; never treat the previous scaled size
    // as a fresh base and multiply it again.
    original.value = currentValue;
    original.priority = currentPriority;
  }

  function restoreOriginalFontSizes() {
    for (const [element, original] of snapshots) restoreOneFontSize(element, original);
    snapshots.clear();
  }

  function forgetRemovedSubtree(node) {
    if (!(node instanceof HTMLElement)) return;
    for (const element of [node, ...node.querySelectorAll("*")]) {
      const original = snapshots.get(element);
      if (!original) continue;
      restoreOneFontSize(element, original);
      snapshots.delete(element);
    }
  }

  function hasVisibleTextNode(element) {
    return Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && /\S/u.test(node.nodeValue || ""));
  }

  function isTextTarget(element) {
    if (!(element instanceof HTMLElement)) return false;
    const tag = element.tagName;
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|CANVAS|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|MATH|META|LINK|HEAD|TITLE|OPTION)$/u.test(tag)) return false;
    if (element.closest("svg,canvas,video,audio,iframe,math,[aria-hidden='true'],[data-dori-font-scale-ignore]")) return false;
    const className = typeof element.className === "string" ? element.className : "";
    if (/(^|[\s_-])(icon|icons|material-icons|material-symbols|emoji|glyph|logo-mark)([\s_-]|$)/iu.test(className)) return false;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") {
      const type = (element.getAttribute("type") || "text").toLowerCase();
      return !/^(checkbox|radio|range|color|file|image|hidden)$/u.test(type);
    }
    return hasVisibleTextNode(element);
  }

  function applyNow() {
    restoreOriginalFontSizes();
    const multiplier = (currentScale / 100) * (isRockeyCalendarPage ? calendarScale / 100 : 1);
    if (Math.abs(multiplier - 1) < 0.0001 || !document.body) return;

    const measurements = [];
    document.body.querySelectorAll("*").forEach(element => {
      if (!isTextTarget(element)) return;
      const computed = Number.parseFloat(window.getComputedStyle(element).fontSize);
      if (!Number.isFinite(computed) || computed <= 0) return;
      measurements.push({
        element,
        size: computed,
        originalValue: element.style.getPropertyValue("font-size"),
        originalPriority: element.style.getPropertyPriority("font-size")
      });
    });

    for (const { element, size, originalValue, originalPriority } of measurements) {
      const appliedValue = (size * multiplier).toFixed(3) + "px";
      snapshots.set(element, { value: originalValue, priority: originalPriority, appliedValue });
      element.style.setProperty("font-size", appliedValue, "important");
    }
  }

  function apply(rawScale) {
    currentScale = clampScale(rawScale);
    document.documentElement.dataset.doriFontScale = String(currentScale);
    if (refreshTimer) { window.clearTimeout(refreshTimer); refreshTimer = 0; }
    if (refreshFrame) return;
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      applyNow();
    });
  }

  function scheduleRefresh() {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      refreshTimer = 0;
      apply(currentScale);
    }, 120);
  }

  window.applyDoriTextScale = apply;
  window.applyRockeyCalendarTextScale = rawScale => {
    if (!isRockeyCalendarPage) return;
    calendarScale = clampScale(rawScale);
    document.documentElement.dataset.rockeyCalendarFontScale = String(calendarScale);
    apply(currentScale);
  };
  apply(readScale());

  if (document.body) {
    const observer = new MutationObserver(records => {
      let hasNewTextElements = false;
      for (const record of records) {
        if (record.type !== "childList") continue;
        record.removedNodes.forEach(node => {
          if (node instanceof HTMLElement && !node.isConnected) forgetRemovedSubtree(node);
        });
        if (Array.from(record.addedNodes).some(node => {
          if (!(node instanceof HTMLElement)) return false;
          if (isTextTarget(node)) return true;
          return Array.from(node.querySelectorAll("*")).some(isTextTarget);
        })) hasNewTextElements = true;
      }
      if (hasNewTextElements) scheduleRefresh();
    });
    observer.observe(document.body, { subtree: true, childList: true });
  }

  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("pageshow", scheduleRefresh);
  if (document.fonts?.ready) document.fonts.ready.then(scheduleRefresh).catch(() => {});
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) apply(readScale());
  });
})();
