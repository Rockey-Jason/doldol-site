/* DORI SITE — global service finder.
 * Stores only navigation preferences (favorites/recent), never account secrets.
 */
(() => {
  "use strict";
  if (window.__DORI_COMMAND_CENTER__) return;
  window.__DORI_COMMAND_CENTER__ = true;

  const script = document.currentScript;
  const SITE_ROOT = script && script.src ? new URL("../", script.src).href : new URL("./", location.href).href;
  const STORE_KEY = "dori-command-center:v1";
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const catalog = [
    {id:"home",title:"돌이사이트 메인",category:"홈",description:"모든 서비스의 시작 화면",path:"./",keywords:"메인 홈 대시보드"},
    {id:"world",title:"돌이 월드",category:"월드",description:"금융·은행·산업·VIP 구역",path:"dori-world/",keywords:"지도 월드 지역 구역"},
    {id:"bank",title:"돌이은행",category:"금융",description:"계좌, 송금, 예금 및 대출 관리",path:"dori-bank.html",keywords:"은행 계좌 송금 예금 대출"},
    {id:"stocks",title:"돌돌증권",category:"금융",description:"종목, 주문 및 보유 현황",path:"doldolstock.html",keywords:"주식 증권 종목 거래 포트폴리오"},
    {id:"factory",title:"도로늄 공장",category:"산업",description:"3D 공장 건설과 생산 운영",path:"doronium-factory/",keywords:"도로늄 공장 산업 생산 건설"},
    {id:"clicker",title:"로키 클릭커",category:"게임",description:"로키 코인과 업그레이드",path:"rockey-clicker.html",keywords:"클릭커 코인 업그레이드"},
    {id:"full-throttle",title:"DORI: FULL THROTTLE",category:"게임",description:"돌이 액션 게임",path:"dori-full-throttle.html",keywords:"액션 게임 돌이"},
    {id:"games",title:"돌이게임",category:"게임",description:"게임 허브와 플레이 메뉴",path:"gamepage.html",keywords:"게임 목록 플레이"},
    {id:"study",title:"로키 스터디",category:"학습",description:"학습 도구와 기록 관리",path:"rockey-study.html",keywords:"공부 스터디 문제 학습"},
    {id:"news",title:"돌이신문",category:"콘텐츠",description:"신문과 소식 읽기",path:"readingrockeynews.html",keywords:"신문 뉴스 기사"},
    {id:"knowledge",title:"돌이 정보",category:"콘텐츠",description:"돌이와 로키 관련 정보",path:"knowledgeofrockey.html",keywords:"정보 소개 도감"},
    {id:"shop",title:"돌돌코인 상점",category:"상점",description:"상점 아이템과 구매 메뉴",path:"doldolcoinmart.html",keywords:"상점 구매 아이템"},
    {id:"vip",title:"VIP 라운지",category:"월드",description:"VIP 전용 공간과 수집 콘텐츠",path:"dori-world/vip-lounge.html",keywords:"VIP 라운지 멤버십 음악"},
    {id:"settings",title:"계정 설정",category:"계정",description:"프로필과 사이트 환경 설정",path:"settings.html",keywords:"설정 프로필 테마 사운드"},
    {id:"admin",title:"관리자 센터",category:"관리",description:"사이트 운영 및 회원 관리",url:"https://rockey-jason.github.io/doldol-site-admin/",keywords:"관리자 admin 운영 보안"}
  ];

  const readStore = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return {
        favorites: Array.isArray(value.favorites) ? value.favorites.filter(id => catalog.some(x => x.id === id)).slice(0, 30) : [],
        recent: Array.isArray(value.recent) ? value.recent.filter(id => catalog.some(x => x.id === id)).slice(0, 8) : []
      };
    } catch (_) { return {favorites:[],recent:[]}; }
  };
  let store = readStore(), view = "all", active = false, previousFocus = null, root = null, input = null, results = null, empty = null;
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (_) {} };
  const resolveUrl = item => item.url || new URL(item.path, SITE_ROOT).href;
  const recordRecent = id => { store.recent = [id, ...store.recent.filter(x => x !== id)].slice(0, 8); persist(); };

  const currentItem = catalog.find(item => {
    try { return new URL(resolveUrl(item)).pathname.replace(/\/+$/, "/") === location.pathname.replace(/\/+$/, "/"); }
    catch (_) { return false; }
  });
  if (currentItem) recordRecent(currentItem.id);

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createCard(item) {
    const card = make("article", "dori-hub-card");
    const link = make("a", "dori-hub-card-link");
    link.href = resolveUrl(item);
    link.dataset.hubDestination = item.id;
    if (item.url) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
    const icons = {home:"⌂",world:"✦",bank:"₩",stocks:"↗",factory:"◇",clicker:"◉","full-throttle":"⚡",games:"▣",study:"✎",news:"▤",knowledge:"i",shop:"◆",vip:"♛",settings:"⚙",admin:"⛨"};
    const icon = make("span", "dori-hub-icon", icons[item.id] || "•");
    icon.setAttribute("aria-hidden", "true");
    const copy = make("span", "dori-hub-copy");
    copy.append(make("strong", "", item.title), make("small", "", item.description));
    const category = make("span", "dori-hub-category", item.category);
    link.append(icon, copy, category);
    const isFavorite = store.favorites.includes(item.id);
    const favorite = make("button", "dori-hub-favorite", isFavorite ? "★" : "☆");
    favorite.type = "button";
    favorite.dataset.hubFavorite = item.id;
    favorite.setAttribute("aria-label", (isFavorite ? "즐겨찾기 해제: " : "즐겨찾기 추가: ") + item.title);
    favorite.title = favorite.getAttribute("aria-label");
    card.append(link, favorite);
    return card;
  }

  function getItems(query) {
    let items = catalog;
    if (view === "favorites") items = catalog.filter(item => store.favorites.includes(item.id));
    if (view === "recent") items = store.recent.map(id => catalog.find(item => item.id === id)).filter(Boolean);
    const q = query.trim().toLocaleLowerCase("ko");
    if (q) items = items.filter(item => [item.title,item.category,item.description,item.keywords].join(" ").toLocaleLowerCase("ko").includes(q));
    return items;
  }

  function render() {
    if (!results) return;
    results.replaceChildren();
    const items = getItems(input ? input.value : "");
    items.forEach(item => results.append(createCard(item)));
    empty.hidden = items.length > 0;
  }

  function setView(next) {
    view = next;
    root.querySelectorAll("[data-hub-view]").forEach(button => {
      const selected = button.dataset.hubView === view;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    render();
  }

  function close() {
    if (!active || !root) return;
    active = false;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("dori-hub-open");
    window.setTimeout(() => { if (!active) root.hidden = true; }, reduceMotion ? 0 : 180);
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }

  function open() {
    if (!root) return;
    previousFocus = document.activeElement;
    root.hidden = false;
    active = true;
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("dori-hub-open");
    window.requestAnimationFrame(() => {
      root.classList.add("is-open");
      input.focus();
      input.select();
    });
    render();
  }

  function mount() {
    if (!document.body || root) return;
    const trigger = make("button", "dori-hub-trigger");
    trigger.type = "button";
    trigger.innerHTML = '<span aria-hidden="true">⌕</span><span>서비스 검색</span><kbd>Ctrl K</kbd>';
    trigger.setAttribute("aria-label", "돌이사이트 서비스 검색 열기");
    trigger.addEventListener("click", open);

    root = make("div", "dori-hub-overlay");
    root.id = "dori-command-center";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = [
      '<div class="dori-hub-backdrop" data-hub-close></div>',
      '<section class="dori-hub-dialog" role="dialog" aria-modal="true" aria-labelledby="dori-hub-title">',
      '<header class="dori-hub-header"><div><span class="dori-hub-eyebrow">DORI SITE · QUICK ACCESS</span><h2 id="dori-hub-title">서비스 통합 검색</h2><p>돌이사이트의 서비스와 주요 기능으로 빠르게 이동하세요.</p></div><button class="dori-hub-close" type="button" data-hub-close aria-label="검색 닫기">×</button></header>',
      '<label class="dori-hub-search"><span aria-hidden="true">⌕</span><input type="search" autocomplete="off" placeholder="서비스 이름이나 기능 검색…" aria-label="서비스 검색"><kbd>ESC</kbd></label>',
      '<nav class="dori-hub-tabs" aria-label="검색 필터"><button type="button" data-hub-view="all" aria-pressed="true" class="is-active">전체</button><button type="button" data-hub-view="favorites" aria-pressed="false">★ 즐겨찾기</button><button type="button" data-hub-view="recent" aria-pressed="false">최근 방문</button></nav>',
      '<div class="dori-hub-results" role="list" aria-label="서비스 검색 결과"></div>',
      '<div class="dori-hub-empty" hidden>검색 결과가 없습니다. 다른 단어로 검색해 보세요.</div>',
      '<footer class="dori-hub-footer"><span>ENTER로 선택 · ESC로 닫기</span><span>하나의 계정, 하나의 세계</span></footer>',
      '</section>'
    ].join("");
    document.body.append(trigger, root);
    input = root.querySelector("input");
    results = root.querySelector(".dori-hub-results");
    empty = root.querySelector(".dori-hub-empty");
    input.addEventListener("input", render);
    root.querySelectorAll("[data-hub-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.hubView)));
    root.addEventListener("click", event => {
      const closeButton = event.target.closest("[data-hub-close]");
      if (closeButton) { close(); return; }
      const favoriteButton = event.target.closest("[data-hub-favorite]");
      if (favoriteButton) {
        const id = favoriteButton.dataset.hubFavorite;
        store.favorites = store.favorites.includes(id) ? store.favorites.filter(x => x !== id) : store.favorites.concat(id);
        persist(); render(); return;
      }
      const link = event.target.closest("[data-hub-destination]");
      if (link) recordRecent(link.dataset.hubDestination);
    });
    root.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.stopPropagation(); close(); }
      if (event.key === "Enter" && event.target === input) {
        const first = results.querySelector("a[data-hub-destination]");
        if (first) first.click();
      }
    });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (active) close(); else open();
      } else if (event.key === "Escape" && active) close();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, {once:true});
  else mount();
})();