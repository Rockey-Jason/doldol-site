/* 돌이사이트 공통 글꼴 굵기 조정
 * HancomMalrangmalrang 글꼴이 실제로 적용된 요소만 400으로 맞춥니다.
 * 글꼴 종류는 바꾸지 않으며, 다른 글꼴 요소의 기존 굵기는 건드리지 않습니다.
 */
(() => {
  "use strict";

  const FONT_TOKEN = "hancommalrangmalrang";
  const MARKER = "data-hancom-weight-normalized";
  const ORIGINAL_WEIGHT = "data-hancom-original-weight";
  const ORIGINAL_PRIORITY = "data-hancom-original-priority";

  function normalizeElement(element) {
    if (!(element instanceof Element)) return;

    let isHancom = false;
    try {
      isHancom = getComputedStyle(element).fontFamily
        .toLowerCase()
        .includes(FONT_TOKEN);
    } catch (_) {
      return;
    }

    const marked = element.hasAttribute(MARKER);

    if (isHancom) {
      if (!marked) {
        element.setAttribute(ORIGINAL_WEIGHT, element.style.getPropertyValue("font-weight"));
        element.setAttribute(ORIGINAL_PRIORITY, element.style.getPropertyPriority("font-weight"));
        element.setAttribute(MARKER, "");
      }

      if (
        element.style.getPropertyValue("font-weight") !== "400" ||
        element.style.getPropertyPriority("font-weight") !== "important"
      ) {
        element.style.setProperty("font-weight", "400", "important");
      }
      return;
    }

    if (marked) {
      const originalWeight = element.getAttribute(ORIGINAL_WEIGHT) || "";
      const originalPriority = element.getAttribute(ORIGINAL_PRIORITY) || "";

      if (originalWeight) {
        element.style.setProperty("font-weight", originalWeight, originalPriority);
      } else {
        element.style.removeProperty("font-weight");
      }

      element.removeAttribute(MARKER);
      element.removeAttribute(ORIGINAL_WEIGHT);
      element.removeAttribute(ORIGINAL_PRIORITY);
    }
  }

  function scan(root) {
    if (root instanceof Element) normalizeElement(root);
    if (root && typeof root.querySelectorAll === "function") {
      root.querySelectorAll("*").forEach(normalizeElement);
    }
  }

  function start() {
    scan(document.documentElement);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) scan(node);
          });
        } else if (
          mutation.type === "attributes" &&
          (mutation.attributeName === "class" || mutation.attributeName === "style")
        ) {
          scan(mutation.target);
        }
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
