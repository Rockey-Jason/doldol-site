/* DORI ROYAL HOTEL — account-scoped hotel state and interactions */
(() => {
  "use strict";

  const root = document.getElementById("view-hotel");
  if (!root || root.dataset.hotelInitialized === "true") return;
  root.dataset.hotelInitialized = "true";

  const rooms = [
    { id: "marble-suite", name: "그랜드 마블 스위트", level: 2, icon: "◇", short: "화이트 마블 · 클래식 럭셔리", description: "정제된 화이트 마블과 따뜻한 골드 디테일이 어우러지는 시그니처 객실입니다." },
    { id: "garden-suite", name: "가든 테라스 스위트", level: 4, icon: "❋", short: "프라이빗 가든 · 자연의 휴식", description: "초록빛 정원과 부드러운 자연광을 담은 차분한 테라스 객실입니다." },
    { id: "royal-suite", name: "로열 팰리스 스위트", level: 6, icon: "♛", short: "로열 골드 · 프레스티지", description: "깊은 우드와 로열 골드, 섬세한 장식으로 완성한 프레스티지 객실입니다." },
    { id: "sky-villa", name: "스카이 시그니처 빌라", level: 9, icon: "✧", short: "파노라마 뷰 · 최상위 스테이", description: "높은 전망과 미드나이트 블루 톤이 어우러지는 최상위 시그니처 공간입니다." }
  ];

  const choices = {
    theme: [
      { value: "marble", label: "화이트 마블" },
      { value: "garden", label: "가든 보태니컬" },
      { value: "midnight", label: "미드나이트 블루" },
      { value: "aurora", label: "오로라 크리스탈" }
    ],
    bed: [
      { value: "classic", label: "클래식 실크 베딩" },
      { value: "canopy", label: "로열 캐노피 베드" },
      { value: "cloud", label: "클라우드 모던 베드" }
    ],
    light: [
      { value: "warm", label: "웜 골드 조명" },
      { value: "candle", label: "캔들 앰비언트" },
      { value: "cool", label: "쿨 문라이트" },
      { value: "aurora", label: "오로라 글로우" }
    ],
    decor: [
      { value: "crystal", label: "오로라 크리스탈" },
      { value: "sculpture", label: "마블 조각상" },
      { value: "floral", label: "시그니처 플라워" }
    ]
  };

  const services = [
    { id: "room-service", icon: "♨", name: "룸서비스", desc: "객실 다이닝 요청" },
    { id: "housekeeping", icon: "✧", name: "하우스키핑", desc: "객실 정돈 요청" },
    { id: "spa", icon: "❋", name: "스파 예약 요청", desc: "릴랙스 프로그램" },
    { id: "concierge", icon: "♧", name: "컨시어지", desc: "맞춤 안내 요청" }
  ];

  const $ = id => document.getElementById(id);
  let member = null;
  let storageKey = "";
  let state = createDefaultState();

  function createDefaultState() {
    return {
      version: 1,
      selectedRoom: "marble-suite",
      rooms: {},
      activeStay: null,
      history: [],
      requests: []
    };
  }

  function defaultRoomSettings() {
    return { theme: "marble", bed: "classic", light: "warm", decor: "crystal" };
  }

  function roomSettings(roomId) {
    if (!state.rooms[roomId] || typeof state.rooms[roomId] !== "object") {
      state.rooms[roomId] = defaultRoomSettings();
    }
    const saved = state.rooms[roomId];
    const defaults = defaultRoomSettings();
    Object.keys(defaults).forEach(key => {
      const valid = choices[key].some(option => option.value === saved[key]);
      if (!valid) saved[key] = defaults[key];
    });
    return saved;
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function canUseRoom(room) {
    return Boolean(member && (member.isAdmin || member.level >= room.level));
  }

  function getRoom(roomId) {
    return rooms.find(room => room.id === roomId) || rooms[0];
  }

  function tierInfo() {
    if (member && member.isAdmin) {
      return {
        name: "IMPERIAL CIRCLE",
        korean: "임페리얼 앰배서더",
        description: "관리자 전용 최상위 권한으로 모든 객실과 호텔 기능을 이용할 수 있습니다.",
        benefits: ["모든 시그니처 객실 이용", "모든 객실 인테리어 프리셋", "프라이빗 컨시어지 및 전체 호텔 서비스"]
      };
    }
    const level = Number(member && member.level || 1);
    if (level >= 9) return {
      name: "IMPERIAL CIRCLE", korean: "임페리얼 게스트",
      description: "돌이사이트 최상위 회원 등급에 연결된 호텔 멤버십입니다.",
      benefits: ["스카이 시그니처 빌라 이용", "모든 객실 및 인테리어 선택", "프라이빗 컨시어지 및 전체 서비스"]
    };
    if (level >= 6) return {
      name: "ROYAL AMBASSADOR", korean: "로열 앰배서더",
      description: "로열 객실과 프리미엄 컨시어지 혜택을 이용할 수 있습니다.",
      benefits: ["로열 팰리스 스위트 이용", "객실별 테마와 가구 커스터마이징", "룸서비스·하우스키핑·스파 요청"]
    };
    if (level >= 4) return {
      name: "GRAND PREMIER", korean: "그랜드 프리미어",
      description: "가든 테라스 객실과 호텔의 주요 서비스를 이용할 수 있습니다.",
      benefits: ["가든 테라스 스위트 이용", "개별 조명과 장식 설정", "룸서비스·하우스키핑 요청"]
    };
    return {
      name: "PREMIER GUEST", korean: "프리미어 게스트",
      description: "돌이 라운지 프리미엄 회원에게 제공되는 호텔 기본 멤버십입니다.",
      benefits: ["그랜드 마블 스위트 이용", "나만의 기본 인테리어 저장", "가상 호텔 체크인 및 숙박 기록"]
    };
  }

  function save() {
    if (!storageKey) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      const status = $("hotelSaveStatus");
      if (status) status.textContent = "계정 저장 완료 · 클라우드 동기화";
      return true;
    } catch (error) {
      const status = $("hotelSaveStatus");
      if (status) status.textContent = "저장 공간을 확인해 주세요";
      showToast("호텔 정보를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
  }

  function loadState() {
    state = createDefaultState();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && typeof saved === "object" && saved.version === 1) {
        state = {
          ...createDefaultState(),
          ...saved,
          rooms: saved.rooms && typeof saved.rooms === "object" ? saved.rooms : {},
          history: Array.isArray(saved.history) ? saved.history.slice(0, 30) : [],
          requests: Array.isArray(saved.requests) ? saved.requests.slice(0, 30) : []
        };
      }
    } catch (error) {
      console.warn("[Dori Hotel] Saved hotel data could not be read.", error);
    }

    if (!rooms.some(room => room.id === state.selectedRoom && canUseRoom(room))) {
      state.selectedRoom = rooms.find(canUseRoom)?.id || "marble-suite";
    }
    rooms.forEach(room => roomSettings(room.id));
    if (state.activeStay && !rooms.some(room => room.id === state.activeStay.roomId)) {
      state.activeStay = null;
    }
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2700);
  }

  function formatDate(value, includeTime) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const options = includeTime
      ? { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { year: "numeric", month: "long", day: "numeric" };
    return new Intl.DateTimeFormat("ko-KR", options).format(date);
  }

  function durationLabel(minutes) {
    const total = Math.max(0, Math.floor(Number(minutes) || 0));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return hours ? hours + "시간 " + mins + "분" : mins + "분";
  }

  function renderMembership() {
    const tier = tierInfo();
    if ($("hotelTierName")) $("hotelTierName").textContent = tier.name;
    if ($("hotelTierKorean")) $("hotelTierKorean").textContent = tier.korean;
    if ($("hotelTierDescription")) $("hotelTierDescription").textContent = tier.description;
    if ($("hotelAccountLevel")) $("hotelAccountLevel").textContent = member.isAdmin ? "관리자" : "Lv." + member.level;
    if ($("hotelStayCount")) $("hotelStayCount").textContent = state.history.length + "회";
    if ($("hotelLastStay")) {
      $("hotelLastStay").textContent = state.activeStay
        ? "투숙 중"
        : state.history[0] ? formatDate(state.history[0].checkOutAt || state.history[0].checkInAt, false) : "첫 방문";
    }

    const list = $("hotelBenefits");
    if (list) {
      list.replaceChildren();
      tier.benefits.forEach(text => {
        const item = document.createElement("li");
        item.textContent = text;
        list.append(item);
      });
    }
    const saveStatus = $("hotelSaveStatus");
    if (saveStatus) saveStatus.textContent = "계정 저장 완료 · 클라우드 동기화";
  }

  function renderRooms() {
    const grid = $("hotelRoomGrid");
    if (!grid) return;
    grid.replaceChildren();

    rooms.forEach(room => {
      const allowed = canUseRoom(room);
      const selected = state.selectedRoom === room.id;
      const active = state.activeStay && state.activeStay.roomId === room.id;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "hotel-room-card" + (selected ? " selected" : "");
      card.disabled = !allowed;
      card.setAttribute("aria-pressed", String(selected));
      card.innerHTML =
        '<span class="hotel-room-card-top"><span class="hotel-room-symbol">' + room.icon + '</span>' +
        '<span class="hotel-room-state">' + (active ? "IN RESIDENCE" : selected ? "SELECTED" : allowed ? "AVAILABLE" : "LOCKED") + '</span></span>' +
        '<strong>' + escapeHTML(room.name) + '</strong>' +
        '<small>' + escapeHTML(room.short) + '</small>' +
        (allowed ? "" : '<small class="hotel-room-lock">회원 레벨 ' + room.level + ' 이상 필요</small>');
      card.addEventListener("click", () => selectRoom(room.id));
      grid.append(card);
    });
  }

  function renderScene() {
    const room = getRoom(state.selectedRoom);
    const settings = roomSettings(room.id);
    const scene = $("hotelRoomScene");
    if (scene) {
      scene.dataset.room = room.id;
      scene.dataset.theme = settings.theme;
      scene.dataset.light = settings.light;
    }
    if ($("hotelSelectedRoomName")) $("hotelSelectedRoomName").textContent = room.name;
    if ($("hotelSelectedRoomDescription")) $("hotelSelectedRoomDescription").textContent = room.description;
    if ($("hotelSceneCaption")) $("hotelSceneCaption").textContent = room.short.toUpperCase();
    ["theme", "bed", "light", "decor"].forEach(key => {
      const select = $("hotel" + key.charAt(0).toUpperCase() + key.slice(1));
      if (select) select.value = settings[key];
    });
    if ($("hotelRoomThemeName")) {
      const selected = choices.theme.find(item => item.value === settings.theme);
      $("hotelRoomThemeName").textContent = selected ? selected.label : "화이트 마블";
    }
  }

  function renderStay() {
    const active = state.activeStay;
    const selectedRoom = getRoom(state.selectedRoom);
    const checkIn = $("hotelCheckIn");
    const checkOut = $("hotelCheckOut");
    const status = $("hotelStayStatus");

    if (active) {
      const activeRoom = getRoom(active.roomId);
      if (status) {
        status.classList.remove("is-away");
        status.textContent = activeRoom.name + " · " + formatDate(active.checkInAt, true) + " 체크인";
      }
      if (checkIn) checkIn.hidden = true;
      if (checkOut) checkOut.hidden = false;
      if (checkOut) checkOut.disabled = false;
      if (selectedRoom.id !== active.roomId && status) {
        status.textContent = activeRoom.name + "에 투숙 중입니다. 체크아웃 후 객실을 변경할 수 있어요.";
      }
    } else {
      if (status) {
        status.classList.add("is-away");
        status.textContent = "현재 체크인한 객실이 없습니다.";
      }
      if (checkIn) checkIn.hidden = false;
      if (checkOut) checkOut.hidden = true;
      if (checkIn) checkIn.disabled = !canUseRoom(selectedRoom);
    }

    document.querySelectorAll("[data-hotel-service]").forEach(button => {
      button.disabled = !active;
    });
  }

  function renderServiceLog() {
    const list = $("hotelServiceLog");
    if (!list) return;
    list.replaceChildren();
    const entries = state.requests.slice(0, 4);
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "hotel-empty-state";
      empty.textContent = "아직 서비스 요청 기록이 없습니다. 객실에 체크인한 뒤 필요한 서비스를 신청할 수 있어요.";
      list.append(empty);
      return;
    }
    entries.forEach(entry => {
      const service = services.find(item => item.id === entry.serviceId);
      const row = document.createElement("div");
      row.className = "hotel-log-item";
      const left = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = service ? service.name : "호텔 서비스";
      const meta = document.createElement("small");
      meta.textContent = formatDate(entry.requestedAt, true) + " · " + getRoom(entry.roomId).name;
      left.append(title, meta);
      const status = document.createElement("span");
      status.className = "hotel-log-status";
      status.textContent = entry.status || "접수 완료";
      row.append(left, status);
      list.append(row);
    });
  }

  function renderHistory() {
    const list = $("hotelHistory");
    if (!list) return;
    list.replaceChildren();
    if (!state.history.length) {
      const empty = document.createElement("div");
      empty.className = "hotel-empty-state";
      empty.textContent = "첫 체크아웃을 완료하면 이곳에 객실과 숙박 시간이 기록됩니다.";
      list.append(empty);
      return;
    }
    state.history.slice(0, 8).forEach(entry => {
      const room = getRoom(entry.roomId);
      const date = new Date(entry.checkInAt);
      const row = document.createElement("article");
      row.className = "hotel-history-item";
      const dateBadge = document.createElement("div");
      dateBadge.className = "hotel-history-date";
      const day = document.createElement("strong");
      day.textContent = Number.isNaN(date.getTime()) ? "—" : String(date.getDate()).padStart(2, "0");
      const month = document.createElement("small");
      month.textContent = Number.isNaN(date.getTime()) ? "" : (date.getMonth() + 1) + "월";
      dateBadge.append(day, month);

      const copy = document.createElement("div");
      copy.className = "hotel-history-copy";
      const title = document.createElement("strong");
      title.textContent = room.name;
      const subtitle = document.createElement("small");
      subtitle.textContent = formatDate(entry.checkInAt, true) + " 입실 · " + formatDate(entry.checkOutAt, true) + " 퇴실";
      copy.append(title, subtitle);

      const duration = document.createElement("span");
      duration.className = "hotel-history-duration";
      duration.textContent = durationLabel(entry.durationMinutes);
      row.append(dateBadge, copy, duration);
      list.append(row);
    });
  }

  function syncMusicText() {
    const title = $("musicNowTitle");
    const status = $("musicPlayerStatus");
    const hotelTitle = $("hotelMusicTitle");
    const hotelStatus = $("hotelMusicStatus");
    const audio = window.DoriLoungeAudio;
    const playing = Boolean(audio && audio.getState && audio.getState().playing);
    if (hotelTitle) hotelTitle.textContent = title ? title.textContent : "로열 피아노";
    if (hotelStatus) hotelStatus.textContent = playing ? "현재 음악이 재생 중입니다." : status ? "재생 버튼을 눌러 음악을 시작하세요." : "라운지 음악 플레이어";
    const toggle = $("hotelMusicToggle");
    if (toggle) toggle.textContent = playing ? "Ⅱ 일시정지" : "▶ 재생";
  }

  function render() {
    if (!member) return;
    renderMembership();
    renderRooms();
    renderScene();
    renderStay();
    renderServiceLog();
    renderHistory();
    syncMusicText();
  }

  function selectRoom(roomId) {
    const room = getRoom(roomId);
    if (!canUseRoom(room)) {
      showToast("이 객실은 회원 레벨 " + room.level + " 이상부터 이용할 수 있어요.");
      return;
    }
    if (state.activeStay && state.activeStay.roomId !== roomId) {
      showToast("현재 객실에서 체크아웃한 뒤 다른 객실을 선택해 주세요.");
      return;
    }
    state.selectedRoom = roomId;
    save();
    renderRooms();
    renderScene();
    renderStay();
  }

  function updateRoomSetting(key, value) {
    if (!member || !choices[key].some(option => option.value === value)) return;
    const room = getRoom(state.selectedRoom);
    roomSettings(room.id)[key] = value;
    save();
    renderScene();
    showToast("객실 인테리어를 저장했어요.");
  }

  function checkIn() {
    if (!member) return;
    if (state.activeStay) {
      showToast("이미 투숙 중인 객실이 있어요. 먼저 체크아웃해 주세요.");
      return;
    }
    const room = getRoom(state.selectedRoom);
    if (!canUseRoom(room)) {
      showToast("현재 회원 등급으로 이용할 수 없는 객실입니다.");
      return;
    }
    const now = new Date().toISOString();
    state.activeStay = { roomId: room.id, checkInAt: now, services: [] };
    save();
    render();
    showToast(room.name + " 가상 체크인 완료!");
  }

  function checkOut() {
    if (!state.activeStay) {
      showToast("현재 체크인한 객실이 없습니다.");
      return;
    }
    const stay = state.activeStay;
    const ended = new Date().toISOString();
    const start = new Date(stay.checkInAt).getTime();
    const finish = new Date(ended).getTime();
    state.history.unshift({
      roomId: stay.roomId,
      checkInAt: stay.checkInAt,
      checkOutAt: ended,
      durationMinutes: Number.isFinite(start) && Number.isFinite(finish) ? Math.max(0, Math.round((finish - start) / 60000)) : 0,
      serviceCount: Array.isArray(stay.services) ? stay.services.length : 0
    });
    state.history = state.history.slice(0, 30);
    state.activeStay = null;
    save();
    render();
    showToast("체크아웃이 완료됐어요. 숙박 기록에 저장했습니다.");
  }

  function requestService(serviceId) {
    if (!state.activeStay) {
      showToast("호텔 서비스는 객실 체크인 후 신청할 수 있어요.");
      return;
    }
    const service = services.find(item => item.id === serviceId);
    if (!service) return;
    const entry = {
      id: Date.now() + "-" + serviceId,
      serviceId: serviceId,
      roomId: state.activeStay.roomId,
      requestedAt: new Date().toISOString(),
      status: "가상 접수 완료"
    };
    state.requests.unshift(entry);
    state.requests = state.requests.slice(0, 30);
    state.activeStay.services = Array.isArray(state.activeStay.services) ? state.activeStay.services : [];
    state.activeStay.services.push(entry.id);
    save();
    renderServiceLog();
    renderStay();
    showToast(service.name + " 요청이 이용 기록에 저장됐어요.");
  }

  function openExistingView(name) {
    const button = document.querySelector('[data-view="' + name + '"]');
    if (button) button.click();
  }

  function activateMember(detail) {
    if (!detail || !detail.userId) return;
    member = {
      userId: String(detail.userId),
      name: String(detail.name || "회원"),
      level: Math.max(1, Number(detail.level) || 1),
      isAdmin: detail.isAdmin === true
    };
    storageKey = "dori-hotel:v1:" + member.userId;
    loadState();
    render();
  }

  function clearMember() {
    member = null;
    storageKey = "";
    state = createDefaultState();
  }

  root.addEventListener("change", event => {
    const select = event.target.closest("[data-hotel-setting]");
    if (!select) return;
    updateRoomSetting(select.dataset.hotelSetting, select.value);
  });

  root.addEventListener("click", event => {
    const serviceButton = event.target.closest("[data-hotel-service]");
    if (serviceButton) {
      requestService(serviceButton.dataset.hotelService);
      return;
    }
    const openButton = event.target.closest("[data-hotel-open]");
    if (openButton) {
      openExistingView(openButton.dataset.hotelOpen);
      return;
    }
  });

  $("hotelCheckIn")?.addEventListener("click", checkIn);
  $("hotelCheckOut")?.addEventListener("click", checkOut);
  $("hotelMusicToggle")?.addEventListener("click", () => {
    $("musicPlayToggle")?.click();
    window.setTimeout(syncMusicText, 100);
  });
  $("hotelMusicStore")?.addEventListener("click", () => {
    openExistingView("shop");
    window.setTimeout(() => $("musicStore")?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
  });

  window.addEventListener("dori:lounge-member-ready", event => activateMember(event.detail));
  window.addEventListener("dori:lounge-member-locked", clearMember);
  window.addEventListener("dori:cloud-sync-ready", () => {
    if (member && storageKey) {
      loadState();
      render();
    }
  });
  window.addEventListener("dori-lounge-music-state", syncMusicText);
  window.setInterval(syncMusicText, 3000);
})();