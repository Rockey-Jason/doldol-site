/* DORI UNIVERSAL CONVENIENCE ENGINE · keyboard, search, quick actions and accessibility */
(() => {
  "use strict";
  if (window.__DORI_CONVENIENCE_READY__) return;
  window.__DORI_CONVENIENCE_READY__ = true;

  const script = document.currentScript;
  const ROOT = script && script.src ? new URL("../", script.src) : new URL("./", location.href);
  const rootHref = (path) => new URL(path, ROOT).href;
  const homeHref = rootHref("index.html");
  const feedbackHref = rootHref("dori-feedback.html");
  const PREF_KEY = "dori-convenience-preferences-v1";
  const pageItems = [
    {label:"돌이사이트 메인",path:"index.html",icon:"⌂",desc:"모든 메뉴가 모여 있는 첫 화면",keywords:"홈 메인 처음 시작"},
    {label:"돌이신문",path:"readingrockeynews.html",icon:"▤",desc:"신문 기사와 돌이 세계 소식",keywords:"뉴스 기사 읽기"},
    {label:"돌돌코인 상점",path:"doldolcoinmart.html",icon:"◈",desc:"아이템과 다양한 상점 메뉴",keywords:"상점 구매 아이템"},
    {label:"돌이 정보",path:"knowledgeofrockey.html",icon:"ⓘ",desc:"돌이와 돌이 세계에 대한 정보",keywords:"정보 도감 지식"},
    {label:"돌이게임",path:"gamepage.html",icon:"◎",desc:"돌이 게임 모아보기",keywords:"게임 플레이"},
    {label:"돌이 랜덤 박스",path:"Randombox.html",icon:"▣",desc:"랜덤 박스와 획득 기록",keywords:"랜덤박스 보상"},
    {label:"돌돌증권",path:"doldolstock.html",icon:"↗",desc:"돌이 세계 기업과 주가",keywords:"주식 증권 시장"},
    {label:"DORI AI 연구소",path:"dori-ai-lab.html",icon:"✦",desc:"AI 비서·세계 검색·보고서·경제 분석",keywords:"인공지능 ai 검색 보고서"},
    {label:"돌이 은행",path:"dori-bank.html",icon:"▤",desc:"계좌·이체·예금·거래 내역",keywords:"은행 금융 계좌 송금"},
    {label:"돌이 라이프",path:"dori-life.html",icon:"🐶",desc:"돌이의 일상과 생활 공간",keywords:"라이프 일상"},
    {label:"돌이 패스",path:"dori-pass.html",icon:"✧",desc:"시즌 진행도와 보상",keywords:"패스 시즌 보상"},
    {label:"일일 미션",path:"daily-missions.html",icon:"✓",desc:"오늘의 미션과 진행 상황",keywords:"미션 오늘"},
    {label:"도로늄 박물관",path:"doronium-museum.html",icon:"◇",desc:"도로늄 전시와 연구 기록",keywords:"박물관 도로늄 전시"},
    {label:"도로늄 공장",path:"doronium-factory/",icon:"⚙",desc:"공장 건설과 산업 자동화",keywords:"공장 산업 제조"},
    {label:"돌이 월드",path:"dori-world/",icon:"◎",desc:"돌이 세계 지도와 지역",keywords:"월드 지도 왕국"},
    {label:"로키 스터디",path:"rockey-study.html",icon:"▧",desc:"학습과 시간 관리 도구",keywords:"공부 학습 스터디"},
    {label:"설정",path:"settings.html",icon:"⚙",desc:"계정과 사이트 설정",keywords:"환경설정 계정"},
    {label:"버그·아이디어 건의함",path:"dori-feedback.html",icon:"✎",desc:"오류 신고, 불편한 점, 새로운 아이디어 접수",keywords:"버그 오류 문제 불편 건의 제안 아이디어"}
  ];
  const defaults = {font:"normal",contrast:false,reader:false,motion:false};
  let prefs = {...defaults};
  try { prefs = {...defaults,...JSON.parse(localStorage.getItem(PREF_KEY) || "{}")}; } catch (_) {}
  const html = document.documentElement;
  const applyPrefs = () => {
    html.dataset.doriFont = ["small","normal","large","largest"].includes(prefs.font) ? prefs.font : "normal";
    html.dataset.doriMotion = prefs.motion ? "reduced" : "normal";
    document.body.classList.toggle("dori-conv-high-contrast",!!prefs.contrast);
    document.body.classList.toggle("dori-conv-reader",!!prefs.reader);
  };
  const savePrefs = () => {
    try { localStorage.setItem(PREF_KEY,JSON.stringify(prefs)); } catch (_) {}
    applyPrefs();
  };
  applyPrefs();

  const root = document.createElement("div");
  root.id = "dori-quick-access-root";
  root.innerHTML = '<button id="dori-quick-launcher" type="button" aria-expanded="false" aria-controls="dori-quick-menu" aria-label="돌이사이트 빠른 메뉴 열기"><span id="dori-quick-mark" aria-hidden="true">D</span><span id="dori-quick-copy">빠른 메뉴<small>검색 · 이동 · 편의 설정</small></span><span id="dori-quick-caret" aria-hidden="true">⌃</span></button><nav id="dori-quick-menu" aria-label="빠른 실행 메뉴" data-open="false"><div class="dori-quick-menu-title">어디로 이동하거나 무엇을 할까?</div><div class="dori-quick-menu-grid"></div><div class="dori-quick-menu-tip">검색 단축키: Ctrl + K 또는 / · 닫기: Esc</div></nav>';
  (document.body || document.documentElement).appendChild(root);

  const overlay = document.createElement("div");
  overlay.id = "dori-convenience-overlay";
  overlay.dataset.open = "false";
  overlay.hidden = true;
  overlay.innerHTML = '<section class="dori-conv-dialog" role="dialog" aria-modal="true" aria-labelledby="dori-conv-title"><header class="dori-conv-head"><div><div class="dori-conv-heading" id="dori-conv-title">돌이사이트 통합 검색</div><div class="dori-conv-subtitle" id="dori-conv-subtitle">메뉴와 현재 페이지의 항목을 한 번에 찾아봐.</div></div><button class="dori-conv-close" type="button" aria-label="닫기">×</button></header><div class="dori-conv-body" id="dori-conv-search-view"><input id="dori-conv-search" type="search" autocomplete="off" placeholder="어떤 메뉴나 기능을 찾고 있어?" aria-label="사이트 통합 검색"><div class="dori-conv-search-hint">메뉴 이름, 기능 이름, 현재 페이지의 제목을 입력해 봐.</div><div id="dori-conv-results" role="listbox" aria-label="검색 결과"></div></div><div class="dori-conv-body" id="dori-conv-preferences-view" hidden><div class="dori-pref-grid"><div class="dori-pref-card"><span class="dori-pref-label">글자 크기</span><div class="dori-pref-options" data-pref="font"><button data-value="small" type="button">작게</button><button data-value="normal" type="button">보통</button><button data-value="large" type="button">크게</button><button data-value="largest" type="button">아주 크게</button></div><p>제목과 본문에서 사용하는 상대 글자 크기에 적용돼.</p></div><div class="dori-pref-card"><span class="dori-pref-label">화면 가독성</span><button class="dori-pref-toggle" type="button" data-pref-toggle="contrast">고대비 화면</button><p>글자와 테두리의 대비를 높여 읽기 쉽게 해.</p></div><div class="dori-pref-card"><span class="dori-pref-label">읽기 편한 간격</span><button class="dori-pref-toggle" type="button" data-pref-toggle="reader">넓은 줄 간격</button><p>본문과 목록의 줄 간격을 넓혀 줘.</p></div><div class="dori-pref-card"><span class="dori-pref-label">움직임 효과</span><button class="dori-pref-toggle" type="button" data-pref-toggle="motion">애니메이션 줄이기</button><p>화면 전환과 움직임을 최소화해.</p></div></div><div class="dori-pref-footer"><button class="dori-pref-reset" id="dori-pref-reset" type="button">기본 설정으로 초기화</button><button class="dori-pref-save" id="dori-pref-save" type="button">설정 저장 완료</button></div></div></section>';
  document.body.appendChild(overlay);
  const toast = document.createElement("div");
  toast.id = "dori-conv-toast";
  toast.setAttribute("role","status");
  toast.setAttribute("aria-live","polite");
  document.body.appendChild(toast);

  const launcher = root.querySelector("#dori-quick-launcher");
  const menu = root.querySelector("#dori-quick-menu");
  const menuGrid = root.querySelector(".dori-quick-menu-grid");
  const dialog = overlay.querySelector(".dori-conv-dialog");
  const searchInput = overlay.querySelector("#dori-conv-search");
  const resultBox = overlay.querySelector("#dori-conv-results");
  const searchView = overlay.querySelector("#dori-conv-search-view");
  const prefView = overlay.querySelector("#dori-conv-preferences-view");
  const titleNode = overlay.querySelector("#dori-conv-title");
  const subtitleNode = overlay.querySelector("#dori-conv-subtitle");
  let activeView = "search";
  let toastTimer = 0;
  let previousFocus = null;
  let searchItems = [];

  const showToast = (message) => {
    toast.textContent = message;
    toast.dataset.show = "true";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.dataset.show = "false"; },2200);
  };
  const closeMenu = () => {
    menu.dataset.open = "false";
    launcher.setAttribute("aria-expanded","false");
  };
  const openMenu = () => {
    menu.dataset.open = "true";
    launcher.setAttribute("aria-expanded","true");
  };
  const openOverlay = (view="search") => {
    closeMenu();
    previousFocus = document.activeElement;
    activeView = view;
    searchView.hidden = view !== "search";
    prefView.hidden = view !== "preferences";
    titleNode.textContent = view === "search" ? "돌이사이트 통합 검색" : "내 편의 설정";
    subtitleNode.textContent = view === "search" ? "메뉴와 현재 페이지의 항목을 한 번에 찾아봐." : "이 기기에 저장되어 다음 방문에도 유지돼.";
    overlay.hidden = false;
    overlay.dataset.open = "true";
    if (view === "search") {
      buildSearchItems();
      searchInput.value = "";
      renderResults("");
      window.setTimeout(() => searchInput.focus(),30);
    } else {
      renderPreferences();
      window.setTimeout(() => overlay.querySelector(".dori-pref-options button[aria-pressed='true'],.dori-pref-toggle")?.focus(),30);
    }
  };
  const closeOverlay = () => {
    overlay.dataset.open = "false";
    overlay.hidden = true;
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  };
  overlay.querySelector(".dori-conv-close").addEventListener("click",closeOverlay);
  overlay.addEventListener("click",(event)=>{if(event.target===overlay)closeOverlay();});
  launcher.addEventListener("click",()=>menu.dataset.open==="true"?closeMenu():openMenu());

  const makeQuickAction = (icon,label,action) => {
    const button=document.createElement("button");
    button.type="button"; button.className="dori-quick-action";
    const mark=document.createElement("span"); mark.textContent=icon;
    const text=document.createElement("span"); text.textContent=label;
    button.append(mark,text); button.addEventListener("click",action); menuGrid.appendChild(button);
  };
  makeQuickAction("⌕","전체 메뉴 검색",()=>openOverlay("search"));
  makeQuickAction("⌂","돌이사이트 홈",()=>location.assign(homeHref));
  makeQuickAction("✎","버그·아이디어 건의함",()=>location.assign(feedbackHref));
  makeQuickAction("⚙","편의 설정",()=>openOverlay("preferences"));
  makeQuickAction("↑","페이지 맨 위로",()=>{closeMenu();window.scrollTo({top:0,behavior:prefs.motion?"auto":"smooth"});});
  makeQuickAction("←","이전 페이지",()=>{closeMenu();if(history.length>1)history.back();else location.assign(homeHref);});
  makeQuickAction("↗","현재 페이지 공유",async()=>{
    closeMenu();
    try {
      if(navigator.share) await navigator.share({title:document.title,url:location.href});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);showToast("현재 페이지 주소를 복사했어.");}
      else showToast("이 브라우저에서는 공유 기능을 사용할 수 없어.");
    } catch(error) { if(error?.name!=="AbortError") showToast("공유를 완료하지 못했어."); }
  });

  const safeLabel = (node) => (node?.getAttribute("aria-label") || node?.innerText || node?.textContent || "").replace(/\s+/g," ").trim().slice(0,100);
  function buildSearchItems() {
    const items=[];
    const seen=new Set();
    const add=(label,url,icon,desc,keywords="")=>{
      if(!label||!url) return;
      let parsed;
      try { parsed=new URL(url,location.href); } catch (_) { return; }
      if(parsed.origin!==location.origin || parsed.protocol!=="https:" && parsed.protocol!=="http:") return;
      const key=parsed.pathname+parsed.search+parsed.hash+"|"+label;
      if(seen.has(key)) return;
      seen.add(key);
      items.push({label,url:parsed.href,icon:icon||"↗",desc:desc||parsed.pathname,keywords});
    };
    pageItems.forEach(item=>add(item.label,rootHref(item.path),item.icon,item.desc,item.keywords));
    document.querySelectorAll("a[href]").forEach(link=>{
      if(link.target==="_blank"||link.hasAttribute("download")) return;
      const label=safeLabel(link);
      if(label.length<2||/로그아웃|삭제|구매|결제|송금|주문 취소/.test(label)) return;
      add(label,link.href,"↗",link.getAttribute("title")||link.closest("article")?.querySelector("p,.카드설명,.description")?.textContent?.trim().slice(0,90)||"현재 페이지의 연결 메뉴");
    });
    document.querySelectorAll("h1,h2,h3,h4,[data-search-label]").forEach((heading,index)=>{
      const label=safeLabel(heading);
      if(label.length<2) return;
      if(!heading.id) heading.id="dori-search-section-"+index;
      add(label,location.pathname+location.search+"#"+heading.id,"§","현재 페이지의 해당 영역");
    });
    searchItems=items;
  }
  function renderResults(query) {
    const q=String(query||"").trim().toLocaleLowerCase("ko");
    const words=q.split(/\s+/).filter(Boolean);
    const matched=searchItems.map(item=>{
      const content=(item.label+" "+item.desc+" "+item.keywords).toLocaleLowerCase("ko");
      let score=0;
      words.forEach(word=>{if(item.label.toLocaleLowerCase("ko").includes(word))score+=4;else if(content.includes(word))score+=1;});
      return {...item,score};
    }).filter(item=>!words.length||item.score>=words.length).sort((a,b)=>b.score-a.score).slice(0,12);
    resultBox.textContent="";
    if(!matched.length){
      const empty=document.createElement("div"); empty.className="dori-conv-empty"; empty.textContent="찾는 메뉴가 없어. 다른 단어로 검색해 봐."; resultBox.appendChild(empty); return;
    }
    matched.forEach(item=>{
      const link=document.createElement("a");
      link.className="dori-conv-result"; link.href=item.url; link.setAttribute("role","option");
      const icon=document.createElement("span"); icon.className="dori-conv-result-icon"; icon.textContent=item.icon;
      const copy=document.createElement("span"); copy.className="dori-conv-result-text";
      const label=document.createElement("span"); label.className="dori-conv-result-title"; label.textContent=item.label;
      const desc=document.createElement("span"); desc.className="dori-conv-result-desc"; desc.textContent=item.desc;
      copy.append(label,desc); link.append(icon,copy);
      link.addEventListener("click",closeOverlay);
      resultBox.appendChild(link);
    });
  }
  searchInput.addEventListener("input",()=>renderResults(searchInput.value));
  searchInput.addEventListener("keydown",(event)=>{
    const options=Array.from(resultBox.querySelectorAll("a"));
    const current=options.indexOf(document.activeElement);
    if(event.key==="ArrowDown"&&options.length){event.preventDefault();options[Math.min(current+1,options.length-1)].focus();}
    else if(event.key==="ArrowUp"&&options.length){event.preventDefault();if(current<=0)searchInput.focus();else options[current-1].focus();}
    else if(event.key==="Enter"&&options.length){event.preventDefault();options[0].click();}
  });

  function renderPreferences() {
    overlay.querySelectorAll("[data-pref]").forEach(group=>{
      const key=group.dataset.pref;
      group.querySelectorAll("button[data-value]").forEach(button=>button.setAttribute("aria-pressed",String(prefs[key]===button.dataset.value)));
    });
    overlay.querySelectorAll("[data-pref-toggle]").forEach(button=>{
      const key=button.dataset.prefToggle;
      const enabled=!!prefs[key];
      button.setAttribute("aria-pressed",String(enabled));
      button.textContent=button.dataset.prefToggle==="contrast"?(enabled?"고대비 사용 중":"고대비 화면 켜기"):
        button.dataset.prefToggle==="reader"?(enabled?"넓은 줄 간격 사용 중":"넓은 줄 간격 켜기"):
        (enabled?"애니메이션 줄이는 중":"애니메이션 줄이기");
    });
  }
  overlay.querySelectorAll(".dori-pref-options button[data-value]").forEach(button=>{
    button.addEventListener("click",()=>{prefs.font=button.dataset.value;savePrefs();renderPreferences();});
  });
  overlay.querySelectorAll("[data-pref-toggle]").forEach(button=>{
    button.addEventListener("click",()=>{const key=button.dataset.prefToggle;prefs[key]=!prefs[key];savePrefs();renderPreferences();});
  });
  overlay.querySelector("#dori-pref-reset").addEventListener("click",()=>{prefs={...defaults};savePrefs();renderPreferences();showToast("편의 설정을 기본값으로 돌렸어.");});
  overlay.querySelector("#dori-pref-save").addEventListener("click",()=>{savePrefs();closeOverlay();showToast("편의 설정을 저장했어.");});

  document.addEventListener("keydown",(event)=>{
    const target=event.target;
    const editing=target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
      event.preventDefault();
      if(overlay.dataset.open==="true") closeOverlay(); else openOverlay("search");
      return;
    }
    if(event.key==="/"&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      event.preventDefault();openOverlay("search");return;
    }
    if(event.key==="Escape"){
      if(overlay.dataset.open==="true") closeOverlay();
      else closeMenu();
    }
  });
  document.addEventListener("click",(event)=>{
    if(menu.dataset.open==="true"&&!root.contains(event.target)) closeMenu();
  });
  window.addEventListener("storage",(event)=>{
    if(event.key===PREF_KEY){
      try { prefs={...defaults,...JSON.parse(event.newValue||"{}")};applyPrefs(); }
      catch (_) {}
    }
  });
})();