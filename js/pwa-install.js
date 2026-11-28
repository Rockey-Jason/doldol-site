(function () {
  "use strict";

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isNativeAndroidApp = () => (navigator.userAgent || "").indexOf("DoldolAndroidApp/") !== -1;

  function addStyles() {
    if (document.getElementById("dori-pwa-install-styles")) return;
    const style = document.createElement("style");
    style.id = "dori-pwa-install-styles";
    style.textContent = `
      #doriPwaInstallButton{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;margin:0 7px 0 0;padding:8px 12px;border:1px solid rgba(229,200,121,.38);border-radius:10px;background:linear-gradient(145deg,rgba(229,200,121,.16),rgba(125,96,42,.12));color:#f1dda2;font:400 12px sans-serif;cursor:pointer;white-space:nowrap;transition:background .2s,border-color .2s,transform .2s}
      #doriPwaInstallButton:hover{border-color:rgba(242,217,155,.72);background:rgba(125,96,42,.25);transform:translateY(-1px)}
      #doriPwaInstallButton:focus-visible,#doriPwaInstallClose:focus-visible{outline:2px solid #f1dda2;outline-offset:3px}
      #doriPwaInstallGuide{position:fixed;z-index:10020;inset:0;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(1,5,17,.76);backdrop-filter:blur(9px)}
      #doriPwaInstallGuide[aria-hidden="false"]{display:flex}
      #doriPwaInstallGuide .dori-pwa-panel{width:min(100%,390px);padding:24px;border:1px solid rgba(229,200,121,.28);border-radius:20px;background:linear-gradient(145deg,#10213a,#071020 78%);box-shadow:0 24px 80px rgba(0,0,0,.48);color:#edf3ff}
      #doriPwaInstallGuide h2{margin:0 0 10px;color:#f0d99b;font-size:19px;font-weight:400}
      #doriPwaInstallGuide p{margin:0;color:#b9c7da;font-size:13px;line-height:1.75}
      #doriPwaInstallGuide .dori-pwa-guide-close{display:flex;justify-content:flex-end;margin-top:20px}
      #doriPwaInstallClose{min-height:38px;padding:8px 16px;border:1px solid rgba(229,200,121,.35);border-radius:10px;background:rgba(229,200,121,.12);color:#f0dfa9;font:inherit;cursor:pointer}
      @media(max-width:600px){#doriPwaInstallButton{min-height:34px;padding:7px 9px;font-size:11px;margin-right:5px}}
      @media(prefers-reduced-motion:reduce){#doriPwaInstallButton{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function init() {
    // The native Android package already provides its own app installation.\n    if (isStandalone() || isNativeAndroidApp()) return;
    const auth = document.querySelector(".인증영역");
    if (!auth || document.getElementById("doriPwaInstallButton")) return;
    addStyles();

    const button = document.createElement("button");
    button.id = "doriPwaInstallButton";
    button.type = "button";
    button.textContent = "앱 설치";
    button.setAttribute("aria-label", "돌이사이트 앱 설치");
    auth.insertBefore(button, auth.firstChild);

    const guide = document.createElement("div");
    guide.id = "doriPwaInstallGuide";
    guide.setAttribute("aria-hidden", "true");
    guide.innerHTML = '<section class="dori-pwa-panel" role="dialog" aria-modal="true" aria-labelledby="doriPwaGuideTitle"><h2 id="doriPwaGuideTitle">돌이사이트 앱 설치</h2><p id="doriPwaGuideText"></p><div class="dori-pwa-guide-close"><button id="doriPwaInstallClose" type="button">확인</button></div></section>';
    document.body.appendChild(guide);

    const close = () => guide.setAttribute("aria-hidden", "true");
    guide.addEventListener("click", (event) => { if (event.target === guide) close(); });
    guide.querySelector("#doriPwaInstallClose").addEventListener("click", close);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });

    let installPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      button.textContent = "앱 설치";
    });

    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      button.hidden = true;
      close();
    });

    button.addEventListener("click", async () => {
      if (installPrompt) {
        const promptEvent = installPrompt;
        installPrompt = null;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") button.hidden = true;
        return;
      }

      const ua = navigator.userAgent || "";
      const isAppleMobile = /iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const text = isAppleMobile
        ? "Safari에서 돌이사이트를 연 다음 공유 버튼을 누르고 ‘홈 화면에 추가’를 선택해 주세요."
        : /android/i.test(ua)
          ? "Chrome 오른쪽 위 ⋮ 메뉴를 열고 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요."
          : "Chrome 또는 Edge에서 돌이사이트를 연 다음 주소창의 설치 아이콘을 누르거나 브라우저 메뉴에서 ‘앱 설치’를 선택해 주세요.";
      guide.querySelector("#doriPwaGuideText").textContent = text;
      guide.setAttribute("aria-hidden", "false");
      guide.querySelector("#doriPwaInstallClose").focus();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
