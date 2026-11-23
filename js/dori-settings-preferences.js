/* DORI SETTINGS ONLY · preferences are edited from the Settings tab */
(() => {
  "use strict";
  const KEY = "dori-convenience-preferences-v1";
  const MIN_FONT_SCALE = 80;
  const MAX_FONT_SCALE = 140;
  const LEGACY_FONT_SCALE = {small:90,normal:100,large:115,largest:130};
  const DEFAULTS = {font:"normal",fontScale:100,contrast:false,reader:false,motion:false};

  const clampFontScale = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(MIN_FONT_SCALE,Math.min(MAX_FONT_SCALE,Math.round(n))) : 100;
  };
  const normalize = stored => {
    const data = stored && typeof stored === "object" ? stored : {};
    const fontScale = Object.prototype.hasOwnProperty.call(data,"fontScale")
      ? clampFontScale(data.fontScale)
      : clampFontScale(LEGACY_FONT_SCALE[data.font] ?? 100);
    return {
      font:"normal",
      fontScale,
      contrast:data.contrast === true,
      reader:data.reader === true,
      motion:data.motion === true
    };
  };
  const read = () => {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch (_) { return {...DEFAULTS}; }
  };
  let prefs = read();

  const apply = () => {
    const html = document.documentElement;
    html.dataset.doriFont = "normal";
    html.dataset.doriFontScale = String(prefs.fontScale);
    html.dataset.doriMotion = prefs.motion ? "reduced" : "normal";
    document.body.classList.toggle("dori-conv-high-contrast",prefs.contrast);
    document.body.classList.toggle("dori-conv-reader",prefs.reader);
    window.applyDoriTextScale?.(prefs.fontScale);
  };

  const render = () => {
    const root = document.getElementById("site-preferences");
    if (!root) return;
    const range = root.querySelector('[data-site-pref-font-scale]');
    const output = root.querySelector("#site-pref-font-value");
    if (range) {
      range.value = String(prefs.fontScale);
      range.setAttribute("aria-valuetext",prefs.fontScale + "%");
    }
    if (output) output.textContent = prefs.fontScale + "%";
    root.querySelectorAll("[data-site-pref-toggle]").forEach(button => {
      const key = button.dataset.sitePrefToggle;
      const enabled = !!prefs[key];
      button.setAttribute("aria-pressed",String(enabled));
      button.textContent = key === "contrast" ? (enabled ? "고대비 사용 중" : "고대비 켜기") :
        key === "reader" ? (enabled ? "넓은 줄 간격 사용 중" : "줄 간격 넓히기") :
        (enabled ? "애니메이션 줄이는 중" : "모션 줄이기");
    });
  };

  const persist = (message = "설정을 저장했어요. 돌이사이트 전체에 적용됩니다.") => {
    try {
      localStorage.setItem(KEY,JSON.stringify(prefs));
      apply();
      render();
      const status = document.getElementById("site-pref-status");
      if (status) status.textContent = message;
    } catch (_) {
      const status = document.getElementById("site-pref-status");
      if (status) status.textContent = "브라우저 저장 공간에 접근할 수 없어 설정을 저장하지 못했습니다.";
    }
  };

  document.addEventListener("input",event => {
    const range = event.target.closest('#site-preferences [data-site-pref-font-scale]');
    if (!range) return;
    prefs.fontScale = clampFontScale(range.value);
    apply();
    const output = document.getElementById("site-pref-font-value");
    if (output) output.textContent = prefs.fontScale + "%";
    range.setAttribute("aria-valuetext",prefs.fontScale + "%");
    const status = document.getElementById("site-pref-status");
    if (status) status.textContent = "글자 크기 " + prefs.fontScale + "% 미리보기 중 · 놓으면 자동 저장됩니다.";
  });

  document.addEventListener("change",event => {
    if (!event.target.closest('#site-preferences [data-site-pref-font-scale]')) return;
    persist("글자 크기 " + prefs.fontScale + "%를 저장했습니다. 모든 돌이사이트 페이지에 적용됩니다.");
  });

  document.addEventListener("click",event => {
    const toggle = event.target.closest("#site-preferences [data-site-pref-toggle]");
    if (toggle) {
      const key = toggle.dataset.sitePrefToggle;
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS,key) || typeof DEFAULTS[key] !== "boolean") return;
      prefs[key] = !prefs[key];
      persist();
      return;
    }
    if (event.target.closest("#site-pref-reset")) {
      prefs = {...DEFAULTS};
      persist("모든 표시 설정을 기본값으로 초기화했습니다.");
    }
  });

  window.addEventListener("storage",event => {
    if (event.key !== KEY) return;
    prefs = read();
    apply();
    render();
    const status = document.getElementById("site-pref-status");
    if (status) status.textContent = "다른 탭에서 변경된 설정을 반영했습니다.";
  });

  window.initDoriSettingsPreferences = () => {
    prefs = read();
    apply();
    render();
  };

  apply();
})();