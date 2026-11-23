/* ROCKEY SHARED CALENDAR · independent local text size */
(() => {
  "use strict";
  if (!document.documentElement.hasAttribute("data-rockey-calendar-page")) return;
  if (window.__ROCKEY_CALENDAR_FONT_SIZE_READY__) return;
  window.__ROCKEY_CALENDAR_FONT_SIZE_READY__ = true;

  const STORAGE_KEY = "rockey-calendar-font-scale-v1";
  const MIN = 80;
  const MAX = 160;
  const clamp = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(MIN, Math.min(MAX, Math.round(number))) : 100;
  };
  const read = () => {
    try { return clamp(localStorage.getItem(STORAGE_KEY) ?? 100); }
    catch (_) { return 100; }
  };

  const toggle = document.getElementById("toggleCalendarFontPanel");
  const panel = document.getElementById("calendarFontPanel");
  const range = document.getElementById("calendarFontRange");
  const number = document.getElementById("calendarFontNumber");
  const valueLabel = document.getElementById("calendarFontValue");
  const reset = document.getElementById("resetCalendarFont");
  if (!toggle || !panel || !range || !number || !valueLabel || !reset) {
    console.error("[ROCKEY Calendar] 글씨 크기 설정 UI를 찾을 수 없습니다.");
    return;
  }

  let value = read();

  function render() {
    range.value = String(value);
    range.setAttribute("aria-valuetext", value + "%");
    number.value = String(value);
    valueLabel.textContent = value + "%";
    panel.querySelectorAll("[data-calendar-font-value]").forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.calendarFontValue) === value));
    });
    document.documentElement.dataset.rockeyCalendarFontScale = String(value);
  }

  function apply(next, persist = true) {
    value = clamp(next);
    render();
    window.applyRockeyCalendarTextScale?.(value);
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(value));
      } catch (error) {
        console.warn("[ROCKEY Calendar] 글씨 크기 설정을 저장하지 못했습니다.", error);
      }
    }
  }

  function setPanel(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) range.focus({ preventScroll: true });
  }

  toggle.addEventListener("click", () => setPanel(panel.hidden));
  range.addEventListener("input", () => apply(range.value));
  number.addEventListener("change", () => apply(number.value));
  number.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply(number.value);
      number.blur();
    }
  });
  reset.addEventListener("click", () => apply(100));
  panel.addEventListener("click", event => {
    const preset = event.target.closest("[data-calendar-font-value]");
    const step = event.target.closest("[data-calendar-font-step]");
    if (preset) apply(Number(preset.dataset.calendarFontValue));
    else if (step) apply(value + Number(step.dataset.calendarFontStep));
  });

  document.addEventListener("pointerdown", event => {
    if (panel.hidden) return;
    if (!panel.contains(event.target) && !toggle.contains(event.target)) setPanel(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) {
      setPanel(false);
      toggle.focus();
    }
  });
  window.addEventListener("storage", event => {
    if (event.key !== STORAGE_KEY) return;
    apply(read(), false);
  });

  render();
  window.applyRockeyCalendarTextScale?.(value);
})();