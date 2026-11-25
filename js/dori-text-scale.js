/* DORI SITE-WIDE TEXT SCALE
 * Scales readable DOM text only. Layout boxes, icons, SVG, canvas and media stay untouched.
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
      if (stored && Object.prototype.hasOwnProperty.call(stored, "fontScale")) {
        return clampScale(stored.fontScale);
      }
      return clampScale(LEGACY[stored?.font] ?? 100);
    } catch (_) {
      return 100;
    }
  }

  const isRockeyCalendarPage = document.documentElement.hasAttribute("data-rockey-calendar-page");
  function readCalendarScale() {
    if (!isRockeyCalendarPage) return 100;
    try {
      return clampScale(localStorage.getItem(CALENDAR_STORAGE_KEY) || 100);
    } catch (_) {
      return 100;
    }
  }
  let calendarScale = readCalendarScale();

  function restoreOneFontSize(element, original) {
    if (!element || !original) return;

    // 다른 게임 코드가 인라인 글자 크기를 직접 바꿨다면 그 변경을 보존합니다.
    const currentValue = element.style.getPropertyValue("font-size");
    const currentPriority = element.style.getPropertyPriority("font-size");
    if (currentValue !== original.appliedValue || currentPriority !== "important") return;

    if (original.value) {
      element.style.setProperty("font-size", original.value, original.priority);
    } else {
      element.style.removeProperty("font-size");
    }
  }

  function restoreOriginalFontSizes() {
    for (const [element, original] of snapshots) {
      restoreOneFontSize(element, original);
    }
    snapshots.clear();
  }

  function forgetRemovedSubtree(node) {
    if (!(node instanceof HTMLElement)) return;
    const elements = [node, ...node.querySelectorAll("*")];
    for (const element of elements) {
      const original = snapshots.get(element);
      if (!original) continue;
      restoreOneFontSize(element, original);
      snapshots.delete(element);
    }
  }

  function containsScalableText(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (isTextTarget(node)) return true;
    return Array.from(node.querySelectorAll("*")).some(isTextTarget);
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

    measurements.forEach(({ element, size, originalValue, originalPriority }) => {
      const appliedValue = (size * multiplier).toFixed(3) + "px";
      snapshots.set(element, {
        value: originalValue,
        priority: originalPriority,
        appliedValue
      });
      element.style.setProperty("font-size", appliedValue, "important");
    });
  }

  function apply(rawScale) {
    currentScale = clampScale(rawScale);
    document.documentElement.dataset.doriFontScale = String(currentScale);
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
      refreshTimer = 0;
    }
    if (refreshFrame) return;
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      applyNow();
    });
  }

  // 여러 요소가 한 번에 렌더링될 때 전체 재계산을 한 번으로 묶습니다.
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

        // 제거된 게임 UI는 저장된 인라인 스타일만 복구하고 기록에서 해제합니다.
        // 같은 요소가 DOM 안에서 이동 중이면 전체 갱신에서 처리하도록 남겨 둡니다.
        record.removedNodes.forEach(node => {
          if (node instanceof HTMLElement && !node.isConnected) {
            forgetRemovedSubtree(node);
          }
        });

        // textContent/타이머 숫자처럼 텍스트 노드만 바뀐 경우에는 글꼴을 다시 계산할 필요가 없습니다.
        if (Array.from(record.addedNodes).some(containsScalableText)) {
          hasNewTextElements = true;
        }
      }

      if (hasNewTextElements) scheduleRefresh();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true
    });
  }

  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("pageshow", scheduleRefresh);
  if (document.fonts?.ready) document.fonts.ready.then(scheduleRefresh).catch(() => {});
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) apply(readScale());
  });
})();