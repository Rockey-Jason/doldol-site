/* DORI SITE-WIDE TEXT SCALE
 * Scales readable DOM text only. Layout boxes, icons, SVG, canvas and media stay untouched.
 */
(() => {
  "use strict";
  if (window.__DORI_TEXT_SCALE_READY__) return;
  window.__DORI_TEXT_SCALE_READY__ = true;

  const STORAGE_KEY = "dori-convenience-preferences-v1";
  const MIN_SCALE = 80;
  const MAX_SCALE = 140;
  const LEGACY = { small: 90, normal: 100, large: 115, largest: 130 };
  const snapshots = new Map();
  let currentScale = 100;
  let refreshFrame = 0;

  const clampScale = value => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 100;
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(parsed)));
  };

  function readScale() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (stored && Object.prototype.hasOwnProperty.call(stored, "fontScale")) {
        return clampScale(stored.fontScale);
      }
      return clampScale(LEGACY[stored?.font] ?? 100);
    } catch (_) {
      return 100;
    }
  }

  function restoreOriginalFontSizes() {
    for (const [element, original] of snapshots) {
      if (!element.isConnected) continue;
      if (original.value) {
        element.style.setProperty("font-size", original.value, original.priority);
      } else {
        element.style.removeProperty("font-size");
      }
    }
    snapshots.clear();
  }

  function hasVisibleTextNode(element) {
    return Array.from(element.childNodes).some(node =>
      node.nodeType === Node.TEXT_NODE && /\S/u.test(node.nodeValue || "")
    );
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

  function apply(rawScale) {
    currentScale = clampScale(rawScale);
    const html = document.documentElement;
    html.dataset.doriFontScale = String(currentScale);
    restoreOriginalFontSizes();

    if (currentScale === 100 || !document.body) return;

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

    const multiplier = currentScale / 100;
    measurements.forEach(({ element, size, originalValue, originalPriority }) => {
      snapshots.set(element, { value: originalValue, priority: originalPriority });
      element.style.setProperty("font-size", (size * multiplier).toFixed(3) + "px", "important");
    });
  }

  function scheduleRefresh() {
    if (refreshFrame) return;
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      apply(currentScale);
    });
  }

  window.applyDoriTextScale = apply;
  apply(readScale());

  if (document.body) {
    const observer = new MutationObserver(records => {
      if (records.some(record =>
        (record.type === "childList" && (record.addedNodes.length || record.removedNodes.length)) ||
        (record.type === "attributes" && (record.attributeName === "class" || record.attributeName === "hidden"))
      )) scheduleRefresh();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "hidden"]
    });
  }

  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("pageshow", scheduleRefresh);
  if (document.fonts?.ready) document.fonts.ready.then(scheduleRefresh).catch(() => {});
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) apply(readScale());
  });
})();