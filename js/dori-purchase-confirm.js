(() => {
  "use strict";
  if (window.DoriPurchaseConfirm) return;

  const integer = value => {
    const raw = String(value ?? "0").replace(/[^0-9-]/g, "");
    try { return BigInt(raw || "0"); } catch { return 0n; }
  };
  const format = value => {
    const n = integer(value);
    return n.toLocaleString("ko-KR");
  };
  const escapeText = value => String(value ?? "");

  function ask(options = {}) {
    return new Promise(resolve => {
      const amount = integer(options.amount);
      const hasBalance = options.currentBalance !== undefined && options.currentBalance !== null && options.currentBalance !== "";
      const balance = hasBalance ? integer(options.currentBalance) : null;
      const enough = !hasBalance || balance >= amount;
      const disableWhenInsufficient = options.disableWhenInsufficient !== false;
      let settled = false;

      const dialog = document.createElement("dialog");
      dialog.className = "dpc-dialog";
      dialog.setAttribute("aria-labelledby", "dpcTitle");
      dialog.setAttribute("aria-describedby", "dpcDescription");
      dialog.innerHTML = `
        <div class="dpc-shell">
          <div class="dpc-topline"><span class="dpc-emblem" aria-hidden="true">₿</span><span class="dpc-kicker">DORI PURCHASE REVIEW</span><span class="dpc-step">FINAL CHECK</span></div>
          <h2 id="dpcTitle">이 상품을 구매하시겠습니까?</h2>
          <p class="dpc-description" id="dpcDescription">구매할 상품과 사용될 돌돌코인을 확인해 주세요.</p>
          <div class="dpc-product"><span class="dpc-product-label">구매 항목</span><strong class="dpc-product-name"></strong></div>
          <div class="dpc-price-card">
            <span class="dpc-price-label">결제할 금액</span>
            <strong class="dpc-price-value"><span class="dpc-price-number"></span><small class="dpc-currency"></small></strong>
            <span class="dpc-price-caption">구매 확정 전에는 코인이 차감되지 않습니다.</span>
          </div>
          <div class="dpc-balance" hidden>
            <div><span>현재 보유</span><strong class="dpc-balance-value"></strong></div>
            <div><span>구매 후 잔액</span><strong class="dpc-after-value"></strong></div>
          </div>
          <p class="dpc-detail" hidden></p>
          <p class="dpc-warning" hidden>현재 보유한 돌돌코인이 부족합니다.</p>
          <div class="dpc-actions">
            <button type="button" class="dpc-cancel">취소</button>
            <button type="button" class="dpc-confirm">구매 확정</button>
          </div>
          <p class="dpc-footnote">취소를 누르면 아무것도 구매하지 않습니다.</p>
        </div>`;
      const $ = selector => dialog.querySelector(selector);

      $(".dpc-product-name").textContent = escapeText(options.itemName || "상품");
      $(".dpc-price-number").textContent = format(amount);
      $(".dpc-currency").textContent = escapeText(options.currency || "돌돌코인");
      if (options.title) $("#dpcTitle").textContent = escapeText(options.title);
      if (options.description) $("#dpcDescription").textContent = escapeText(options.description);

      if (hasBalance) {
        const row = $(".dpc-balance");
        row.hidden = false;
        $(".dpc-balance-value").textContent = format(balance) + " " + (options.currency || "돌돌코인");
        $(".dpc-after-value").textContent = (balance >= amount ? format(balance - amount) : format(0)) + " " + (options.currency || "돌돌코인");
      }
      if (options.detail) {
        const detail = $(".dpc-detail");
        detail.hidden = false;
        detail.textContent = escapeText(options.detail);
      }
      if (!enough) {
        const warning = $(".dpc-warning");
        warning.hidden = false;
        if (disableWhenInsufficient) {
          $(".dpc-confirm").disabled = true;
          $(".dpc-confirm").textContent = "돌돌코인 부족";
        }
      }

      const finish = accepted => {
        if (settled) return;
        settled = true;
        try { dialog.close(); } catch {}
        dialog.remove();
        resolve(Boolean(accepted));
      };
      $(".dpc-cancel").addEventListener("click", () => finish(false));
      $(".dpc-confirm").addEventListener("click", () => finish(true));
      dialog.addEventListener("cancel", event => {
        event.preventDefault();
        finish(false);
      });
      dialog.addEventListener("click", event => {
        if (event.target === dialog) finish(false);
      });
      dialog.addEventListener("close", () => {
        if (!settled) finish(false);
      });

      document.body.appendChild(dialog);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      $(".dpc-cancel").focus({ preventScroll: true });
    });
  }

  const style = document.createElement("style");
  style.textContent = `
    .dpc-dialog{width:min(470px,calc(100vw - 28px));max-width:none;max-height:min(90dvh,760px);padding:0;border:1px solid rgba(217,184,112,.38);border-radius:25px;background:transparent;color:#f5f1e7;overflow:visible;box-shadow:0 32px 100px rgba(0,0,0,.48)}
    .dpc-dialog::backdrop{background:rgba(4,9,20,.7);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .dpc-shell{position:relative;padding:27px;border-radius:24px;background:radial-gradient(ellipse at 50% -25%,rgba(206,173,105,.18),transparent 56%),linear-gradient(145deg,#15223a,#091326 78%);font-family:inherit}
    .dpc-topline{display:flex;align-items:center;gap:10px}
    .dpc-emblem{display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(224,194,133,.42);border-radius:12px;background:rgba(214,181,112,.12);color:#e4c98f;font:20px Georgia,serif}
    .dpc-kicker{color:#d5bb83;font:9px/1.2 Arial,sans-serif;letter-spacing:.2em}
    .dpc-step{margin-left:auto;color:#7887a2;font:8px Arial,sans-serif;letter-spacing:.15em}
    .dpc-shell h2{margin:22px 0 7px;color:#fff8e9;font-size:24px;font-weight:400;letter-spacing:-.04em}
    .dpc-description{margin:0;color:#a9b4c7;font-size:12px;line-height:1.7}
    .dpc-product{display:flex;flex-direction:column;gap:6px;margin-top:21px;padding:14px 16px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(255,255,255,.045)}
    .dpc-product-label,.dpc-price-label{color:#8797b0;font-size:10px;letter-spacing:.08em}
    .dpc-product-name{color:#f7edda;font-size:15px;font-weight:400;overflow-wrap:anywhere}
    .dpc-price-card{display:flex;flex-direction:column;gap:6px;margin-top:10px;padding:17px 16px;border:1px solid rgba(218,184,111,.35);border-radius:16px;background:linear-gradient(120deg,rgba(194,155,82,.15),rgba(255,255,255,.035))}
    .dpc-price-value{display:flex;align-items:baseline;gap:8px;color:#f2d79d;font:400 clamp(24px,6vw,32px)/1.15 Georgia,serif;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
    .dpc-price-value small{color:#d3bd8a;font:400 11px/1.4 inherit}
    .dpc-price-caption{color:#8d9bb0;font-size:9px}
    .dpc-balance{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;padding:12px 14px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025)}
    .dpc-balance div{display:flex;flex-direction:column;gap:5px;min-width:0}
    .dpc-balance div+div{padding-left:10px;border-left:1px solid rgba(255,255,255,.09)}
    .dpc-balance span{color:#8998ad;font-size:9px}
    .dpc-balance strong{color:#e7e1d3;font-size:11px;font-weight:400;overflow-wrap:anywhere}
    .dpc-detail{margin:12px 1px 0;color:#abb7c8;font-size:10px;line-height:1.7;overflow-wrap:anywhere}
    .dpc-warning{margin:11px 0 0;padding:10px 12px;border:1px solid rgba(237,157,126,.28);border-radius:11px;background:rgba(196,103,74,.11);color:#f2b79c;font-size:10px}
    .dpc-actions{display:grid;grid-template-columns:1fr 1.25fr;gap:9px;margin-top:22px}
    .dpc-actions button{min-height:46px;padding:0 13px;border-radius:12px;font:400 12px inherit;cursor:pointer;transition:transform .2s ease,filter .2s ease,background .2s ease}
    .dpc-cancel{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:#d2d9e4}
    .dpc-confirm{border:1px solid #c9a363;background:linear-gradient(110deg,#9a743d,#d3b36f 55%,#a47c40);color:#fffdf7;box-shadow:0 7px 21px rgba(189,146,70,.2)}
    .dpc-actions button:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.08)}
    .dpc-confirm:disabled{border-color:rgba(255,255,255,.12);background:#3a4658;color:#929cac;box-shadow:none;cursor:not-allowed}
    .dpc-footnote{margin:12px 0 0;color:#728198;font-size:9px;text-align:center}
    @media(max-width:480px){.dpc-shell{padding:21px 18px}.dpc-shell h2{font-size:21px}.dpc-dialog{border-radius:21px}.dpc-balance{gap:7px;padding:11px}.dpc-balance div+div{padding-left:8px}}
    @media(prefers-reduced-motion:no-preference){.dpc-dialog[open] .dpc-shell{animation:dpcEnter .38s cubic-bezier(.16,1,.3,1) both}@keyframes dpcEnter{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}}
    @media(prefers-reduced-motion:reduce){.dpc-actions button{transition:none}}
  `;
  document.head.appendChild(style);
  window.DoriPurchaseConfirm = Object.freeze({ ask });
})();