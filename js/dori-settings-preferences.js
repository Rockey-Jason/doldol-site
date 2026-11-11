/* DORI SETTINGS ONLY · detailed preferences are edited from the Settings tab */
(() => {
  "use strict";
  const KEY = "dori-convenience-preferences-v1";
  const DEFAULTS = {font:"normal",contrast:false,reader:false,motion:false};
  const fontValues = ["small","normal","large","largest"];
  const read = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        font: fontValues.includes(stored.font) ? stored.font : DEFAULTS.font,
        contrast: stored.contrast === true,
        reader: stored.reader === true,
        motion: stored.motion === true
      };
    } catch (_) { return {...DEFAULTS}; }
  };
  let prefs = read();
  const apply = () => {
    const html = document.documentElement;
    html.dataset.doriFont = prefs.font;
    html.dataset.doriMotion = prefs.motion ? "reduced" : "normal";
    document.body.classList.toggle("dori-conv-high-contrast",prefs.contrast);
    document.body.classList.toggle("dori-conv-reader",prefs.reader);
  };
  const render = () => {
    const root = document.getElementById("site-preferences");
    if (!root) return;
    root.querySelectorAll('[data-site-pref="font"]').forEach(button => {
      button.setAttribute("aria-pressed",String(button.dataset.value === prefs.font));
    });
    root.querySelectorAll("[data-site-pref-toggle]").forEach(button => {
      const key=button.dataset.sitePrefToggle;
      const enabled=!!prefs[key];
      button.setAttribute("aria-pressed",String(enabled));
      button.textContent=key==="contrast"?(enabled?"고대비 사용 중":"고대비 켜기"):
        key==="reader"?(enabled?"넓은 줄 간격 사용 중":"줄 간격 넓히기"):
        (enabled?"애니메이션 줄이는 중":"모션 줄이기");
    });
  };
  const persist = (message="설정을 저장했어요. 돌이사이트 전체에 적용됩니다.") => {
    try {
      localStorage.setItem(KEY,JSON.stringify(prefs));
      apply();
      render();
      const status=document.getElementById("site-pref-status");
      if(status) status.textContent=message;
    } catch (_) {
      const status=document.getElementById("site-pref-status");
      if(status) status.textContent="브라우저 저장 공간에 접근할 수 없어 설정을 저장하지 못했습니다.";
    }
  };
  document.addEventListener("click",event => {
    const fontButton=event.target.closest('#site-preferences [data-site-pref="font"]');
    if(fontButton) {
      if(!fontValues.includes(fontButton.dataset.value)) return;
      prefs.font=fontButton.dataset.value;
      persist();
      return;
    }
    const toggle=event.target.closest("#site-preferences [data-site-pref-toggle]");
    if(toggle) {
      const key=toggle.dataset.sitePrefToggle;
      if(!Object.prototype.hasOwnProperty.call(DEFAULTS,key) || typeof DEFAULTS[key]!=="boolean") return;
      prefs[key]=!prefs[key];
      persist();
      return;
    }
    if(event.target.closest("#site-pref-reset")) {
      prefs={...DEFAULTS};
      persist("모든 표시 설정을 기본값으로 초기화했습니다.");
    }
  });
  window.addEventListener("storage",event => {
    if(event.key!==KEY) return;
    prefs=read();
    apply();
    render();
    const status=document.getElementById("site-pref-status");
    if(status) status.textContent="다른 탭에서 변경된 설정을 반영했습니다.";
  });
  window.initDoriSettingsPreferences = () => {
    prefs=read();
    apply();
    render();
  };
  apply();
})();