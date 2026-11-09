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

  const rewards = [
    { id: "door-sign", name: "로열 골드 도어 플레이트", icon: "⌂", price: 120, description: "객실 입구에 골드 시그니처 명패를 장식합니다." },
    { id: "crystal-orb", name: "오로라 크리스탈 오브", icon: "◇", price: 220, description: "객실에 은은한 크리스탈 빛을 더합니다." },
    { id: "gold-tray", name: "로열 웰컴 트레이", icon: "♜", price: 280, description: "침대 옆 테이블을 특별한 웰컴 데스크로 꾸밉니다." },
    { id: "garden-flower", name: "시크릿 가든 플라워", icon: "❋", price: 250, description: "객실 한편에 시그니처 꽃 장식을 놓습니다." }
  ];
  const events = [
    { id: "tea", icon: "♨", category: "CULINARY EXPERIENCE", season: "THE AFTERNOON COLLECTION", title: "로열 애프터눈 티 세레머니", description: "호텔 파티시에가 준비한 오늘의 디저트와 시그니처 블렌딩 티를 즐기는 특별한 오후입니다." },
    { id: "garden", icon: "❋", category: "GARDEN FESTIVAL", season: "THE SECRET GARDEN SERIES", title: "시크릿 가든 라이트 워크", description: "정원 산책로의 조명이 켜지는 시간, 고요한 가든 코스를 따라 특별한 순간을 기록해 보세요." },
    { id: "piano", icon: "♫", category: "MUSIC GALA", season: "THE ROYAL SOUND SERIES", title: "로열 피아노 갈라 나이트", description: "로열 살롱의 오리지널 연주곡과 함께 여유로운 음악 감상 시간을 가져 보세요." },
    { id: "gallery", icon: "◇", category: "ART & CULTURE", season: "THE CRYSTAL ART SERIES", title: "크리스탈 아트 프라이빗 투어", description: "호텔 갤러리에 전시된 오브제와 크리스탈 컬렉션을 둘러보는 프라이빗 투어입니다." },
    { id: "midnight", icon: "✧", category: "NIGHT EXPERIENCE", season: "THE MIDNIGHT COLLECTION", title: "미드나이트 코코아 라운지", description: "잔잔한 음악과 따뜻한 코코아가 있는 심야 라운지 프로그램에 참여해 보세요." }
  ];
  const missions = [
    { id: "attendance", icon: "♛", title: "웰컴 혜택 수령", detail: "오늘의 출석 선물을 받아 보세요.", points: 45, exp: 12 },
    { id: "checkin", icon: "⌂", title: "객실 체크인", detail: "오늘의 객실에 체크인해 보세요.", points: 35, exp: 10 },
    { id: "room-design", icon: "✧", title: "나만의 객실 꾸미기", detail: "객실 테마나 인테리어를 변경해 보세요.", points: 40, exp: 12 },
    { id: "music", icon: "♫", title: "뮤직 리셉션", detail: "로열 라운지 음악을 재생해 보세요.", points: 35, exp: 10 },
    { id: "service", icon: "♧", title: "호텔 서비스 이용", detail: "체크인 후 호텔 서비스를 한 번 요청하세요.", points: 45, exp: 12 },
    { id: "event", icon: "✦", title: "오늘의 이벤트 참여", detail: "오늘 준비된 호텔 이벤트에 참여해 보세요.", points: 50, exp: 15 }
  ];
  const activities = [
    { id: "tea", points: 35, exp: 10, name: "애프터눈 티 세레머니" },
    { id: "garden", points: 35, exp: 10, name: "시크릿 가든 산책" },
    { id: "reading", points: 35, exp: 10, name: "로열 독서 클럽" },
    { id: "concert", points: 35, exp: 10, name: "피아노 리사이틀" }
  ];

  const $ = id => document.getElementById(id);
  let member = null;
  let storageKey = "";
  let state = createDefaultState();

  function createDefaultState() {
    return {
      version: 2,
      selectedRoom: "marble-suite",
      rooms: {},
      activeStay: null,
      history: [],
      requests: [],
      hotelPoints: 0,
      hotelExp: 0,
      attendance: { lastDate: "", streak: 0, total: 0, dates: [] },
      daily: { date: "", attendanceClaimed: false, eventClaimed: false, missions: {}, activityClaims: [], activityBonusClaimed: false, missionBonusClaimed: false },
      rewardOwned: [],
      totalActivities: 0
    };
  }

  function defaultRoomSettings() {
    return { theme: "marble", bed: "classic", light: "warm", decor: "crystal", reward: "none" };
  }

  function roomSettings(roomId) {
    if (!state.rooms[roomId] || typeof state.rooms[roomId] !== "object") {
      state.rooms[roomId] = defaultRoomSettings();
    }
    const saved = state.rooms[roomId];
    const defaults = defaultRoomSettings();
    Object.keys(defaults).forEach(key => {
      if (key === "reward") {
        const valid = saved.reward === "none" || (rewards.some(item => item.id === saved.reward) && state.rewardOwned.includes(saved.reward));
        if (!valid) saved.reward = "none";
      } else {
        const valid = choices[key].some(option => option.value === saved[key]);
        if (!valid) saved[key] = defaults[key];
      }
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
      if (saved && typeof saved === "object" && [1, 2].includes(Number(saved.version))) {
        state = {
          ...createDefaultState(),
          ...saved,
          version: 2,
          rooms: saved.rooms && typeof saved.rooms === "object" ? saved.rooms : {},
          history: Array.isArray(saved.history) ? saved.history.slice(0, 30) : [],
          requests: Array.isArray(saved.requests) ? saved.requests.slice(0, 30) : [],
          hotelPoints: Math.max(0, Math.floor(Number(saved.hotelPoints) || 0)),
          hotelExp: Math.max(0, Math.floor(Number(saved.hotelExp) || 0)),
          attendance: {
            lastDate: String(saved.attendance && saved.attendance.lastDate || ""),
            streak: Math.max(0, Math.floor(Number(saved.attendance && saved.attendance.streak) || 0)),
            total: Math.max(0, Math.floor(Number(saved.attendance && saved.attendance.total) || 0)),
            dates: Array.isArray(saved.attendance && saved.attendance.dates) ? saved.attendance.dates.slice(-30) : []
          },
          daily: saved.daily && typeof saved.daily === "object" ? {
            ...createDefaultState().daily,
            ...saved.daily,
            missions: saved.daily.missions && typeof saved.daily.missions === "object" ? saved.daily.missions : {},
            activityClaims: Array.isArray(saved.daily.activityClaims) ? saved.daily.activityClaims : []
          } : createDefaultState().daily,
          rewardOwned: Array.isArray(saved.rewardOwned) ? saved.rewardOwned.filter(id => rewards.some(item => item.id === id)) : [],
          totalActivities: Math.max(0, Math.floor(Number(saved.totalActivities) || 0))
        };
      }
    } catch (error) {
      console.warn("[Dori Hotel] Saved hotel data could not be read.", error);
    }

    if (!rooms.some(room => room.id === state.selectedRoom && canUseRoom(room))) {
      state.selectedRoom = rooms.find(canUseRoom)?.id || "marble-suite";
    }
    rooms.forEach(room => roomSettings(room.id));
    ensureDailyState();
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
      scene.dataset.bed = settings.bed;
      scene.dataset.decor = settings.decor;
      scene.dataset.reward = settings.reward || "none";
      const reward = rewards.find(item => item.id === settings.reward);
      if ($("hotelRewardObject")) {
        $("hotelRewardObject").textContent = reward ? reward.icon : "";
        $("hotelRewardObject").hidden = !reward;
        $("hotelRewardObject").setAttribute("aria-label", reward ? reward.name : "");
      }
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
      subtitle.textContent = formatDate(entry.checkInAt, true) + " 입실 · " + formatDate(entry.checkOutAt, true) + " 퇴실 · 서비스 " + Number(entry.serviceCount || 0) + "건";
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
    renderEngagement();
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
    completeMission("room-design");
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
    completeMission("checkin");
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
    completeMission("service");
    renderServiceLog();
    renderStay();
    renderEngagement();
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
  window.addEventListener("dori-lounge-music-state", event => {
    syncMusicText();
    const audio=window.DoriLoungeAudio,detail=event.detail||{};
    if(detail.playing===true||(audio&&audio.getState&&audio.getState().playing))completeMission("music");
  });
  $("hotelAttendanceClaim")?.addEventListener("click",claimAttendance);
  $("hotelEventJoin")?.addEventListener("click",joinDailyEvent);
  $("hotelMissionBonus")?.addEventListener("click",claimMissionBonus);
  root.addEventListener("click",event=>{
    const activity=event.target.closest("[data-hotel-activity]");
    if(activity){takeActivity(activity.dataset.hotelActivity);return;}
    const rewardButton=event.target.closest("[data-hotel-reward-action]");
    if(rewardButton)handleRewardAction(rewardButton.dataset.rewardId,rewardButton.dataset.hotelRewardAction);
  });
  function hotelDateKey(date = new Date()) {
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
    const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return values.year+"-"+values.month+"-"+values.day;
  }
  function offsetDateKey(key,offset) {
    const date=new Date(key+"T00:00:00Z");date.setUTCDate(date.getUTCDate()+offset);
    return [date.getUTCFullYear(),String(date.getUTCMonth()+1).padStart(2,"0"),String(date.getUTCDate()).padStart(2,"0")].join("-");
  }
  function ensureDailyState() {
    const today=hotelDateKey();
    if(!state.daily||state.daily.date!==today)state.daily={date:today,attendanceClaimed:false,eventClaimed:false,missions:{},activityClaims:[],activityBonusClaimed:false,missionBonusClaimed:false};
    if(!state.attendance||typeof state.attendance!=="object")state.attendance={lastDate:"",streak:0,total:0,dates:[]};
    if(!Array.isArray(state.attendance.dates))state.attendance.dates=[];
    if(!Array.isArray(state.daily.activityClaims))state.daily.activityClaims=[];
    if(!state.daily.missions||typeof state.daily.missions!=="object")state.daily.missions={};
  }
  function activeDailyEvent() {
    const day=Math.floor(Date.parse(hotelDateKey()+"T00:00:00+09:00")/86400000);
    return events[((day%events.length)+events.length)%events.length];
  }
  function hotelRank() {
    const thresholds=[0,100,260,480,780,1150,1600,2150,2800,3600];
    const names=["신입 게스트","웰컴 게스트","컴포트 게스트","프리미어 게스트","그랜드 게스트","로열 게스트","로열 앰배서더","시그니처 앰배서더","임페리얼 게스트","그랜드 임페리얼"];
    const xp=Math.max(0,Number(state.hotelExp)||0);let index=0;
    for(let i=0;i<thresholds.length;i++){if(xp>=thresholds[i])index=i;else break;}
    const current=thresholds[index],next=thresholds[index+1]||thresholds[index];
    return {level:index+1,name:names[index],current,nextThreshold:next,progress:next>current?Math.max(0,Math.min(100,((xp-current)/(next-current))*100)):100,remaining:Math.max(0,next-xp)};
  }
  function addHotelReward(points,exp) {
    if(!member)return;
    state.hotelPoints=Math.max(0,Math.floor(Number(state.hotelPoints)||0)+Math.max(0,Math.floor(Number(points)||0)));
    state.hotelExp=Math.max(0,Math.floor(Number(state.hotelExp)||0)+Math.max(0,Math.floor(Number(exp)||0)));
    save();renderWallet();
  }
  function completeMission(id) {
    ensureDailyState();const mission=missions.find(item=>item.id===id);
    if(!mission||state.daily.missions[id])return false;
    state.daily.missions[id]=true;addHotelReward(mission.points,mission.exp);renderMissions();
    if(missions.every(item=>state.daily.missions[item.id])&&!state.daily.missionBonusClaimed)showToast("오늘의 미션을 모두 완료했어요! 그랜드 보너스가 열렸습니다.");
    return true;
  }
  function renderWallet() {
    const rank=hotelRank();
    if($("hotelPointsBalance"))$("hotelPointsBalance").textContent=Number(state.hotelPoints||0).toLocaleString("ko-KR");
    if($("hotelGuestRank"))$("hotelGuestRank").textContent=rank.name;
    if($("hotelGuestLevel"))$("hotelGuestLevel").textContent="RANK "+rank.level;
    if($("hotelRankProgress"))$("hotelRankProgress").style.width=rank.progress+"%";
    if($("hotelRankProgressText"))$("hotelRankProgressText").textContent=rank.current.toLocaleString("ko-KR")+" / "+rank.nextThreshold.toLocaleString("ko-KR")+" EXP";
    if($("hotelRankNext"))$("hotelRankNext").textContent=rank.remaining?"다음 등급까지 "+rank.remaining.toLocaleString("ko-KR")+" EXP":"최고 등급 달성";
    if($("hotelShopPoints"))$("hotelShopPoints").textContent=Number(state.hotelPoints||0).toLocaleString("ko-KR");
  }
  function renderAttendance() {
    ensureDailyState();const attendance=state.attendance,claimed=state.daily.attendanceClaimed;
    if($("hotelAttendanceStreak"))$("hotelAttendanceStreak").textContent=attendance.streak+"일";
    if($("hotelAttendanceTotal"))$("hotelAttendanceTotal").textContent=attendance.total+"회";
    const button=$("hotelAttendanceClaim");if(button){button.disabled=claimed;button.textContent=claimed?"✓ 오늘 혜택 수령 완료":"오늘의 혜택 받기";}
    if($("hotelAttendanceMessage"))$("hotelAttendanceMessage").textContent=claimed?"오늘의 웰컴 혜택을 받았습니다. 내일 다시 방문해 주세요.":"7일 연속 출석을 달성하면 +250 포인트와 +50 EXP 보너스!";
    const stamps=$("hotelPassportStamps");
    if(stamps){stamps.replaceChildren();for(let i=6;i>=0;i--){const date=offsetDateKey(hotelDateKey(),-i),done=attendance.dates.includes(date);const stamp=document.createElement("div");stamp.className="hotel-passport-stamp"+(done?" done":"");const mark=document.createElement("span");mark.className="stamp-mark";mark.textContent=done?"✓":"·";const label=document.createElement("small");label.textContent=date.slice(5).replace("-","/");stamp.append(mark,label);stamps.append(stamp);}}
    const week=Array.from({length:7},(_,i)=>offsetDateKey(hotelDateKey(),-i)),count=week.filter(date=>attendance.dates.includes(date)).length;
    if($("hotelPassportCount"))$("hotelPassportCount").textContent="최근 7일 "+count+" / 7";
    if($("hotelPassportStatus"))$("hotelPassportStatus").textContent=claimed?"오늘의 출석 도장을 찍었어요. 내일도 방문해 주세요.":"오늘의 도장을 찍고 호텔 여권을 완성해 보세요.";
  }
  function renderDailyEvent() {
    ensureDailyState();const event=activeDailyEvent(),complete=state.daily.eventClaimed,month=Number(hotelDateKey().slice(5,7));
    const season=month===12||month<=2?"WINTER ROYAL SEASON":month<=5?"SPRING GARDEN SEASON":month<=8?"SUMMER SIGNATURE SEASON":"AUTUMN GOLD SEASON";
    if($("hotelEventCategory"))$("hotelEventCategory").textContent=event.category;
    if($("hotelEventSeason"))$("hotelEventSeason").textContent=season+" · "+event.season;
    if($("hotelEventTitle"))$("hotelEventTitle").textContent=event.title;
    if($("hotelEventDescription"))$("hotelEventDescription").textContent=event.description;
    if($("hotelEventArt"))$("hotelEventArt").textContent=event.icon;
    if($("hotelEventReward"))$("hotelEventReward").textContent="참여 보상 · 80P + 25 EXP";
    const button=$("hotelEventJoin"),panel=button?.closest(".hotel-event-panel");
    if(button){button.disabled=complete;button.textContent=complete?"✓ 오늘 참여 완료":"이벤트 참여";}
    if(panel)panel.classList.toggle("is-complete",complete);
  }
  function renderMissions() {
    ensureDailyState();const grid=$("hotelMissionGrid");if(!grid)return;grid.replaceChildren();
    const done=missions.filter(item=>state.daily.missions[item.id]).length;
    if($("hotelMissionCount"))$("hotelMissionCount").textContent=done+" / "+missions.length+" 완료";
    missions.forEach(mission=>{const yes=Boolean(state.daily.missions[mission.id]),card=document.createElement("article");card.className="hotel-mission-card"+(yes?" is-done":"");const icon=document.createElement("span");icon.className="hotel-mission-icon";icon.textContent=yes?"✓":mission.icon;const copy=document.createElement("span");copy.className="hotel-mission-copy";const title=document.createElement("strong");title.textContent=mission.title;const desc=document.createElement("small");desc.textContent=yes?"오늘의 미션 완료":mission.detail;copy.append(title,desc);const reward=document.createElement("span");reward.className="hotel-mission-reward";reward.textContent=yes?"완료":"+"+mission.points+"P";card.append(icon,copy,reward);grid.append(card);});
    const ready=done===missions.length,claimed=Boolean(state.daily.missionBonusClaimed),button=$("hotelMissionBonus");
    if(button){button.disabled=!ready||claimed;button.textContent=claimed?"✓ 보상 수령 완료":ready?"그랜드 보상 받기":"전체 완료 보상";}
  }
  function renderActivities() {
    ensureDailyState();
    document.querySelectorAll("[data-hotel-activity]").forEach(button=>{const done=state.daily.activityClaims.includes(button.dataset.hotelActivity);button.disabled=done;const label=button.querySelector("span");if(label)label.textContent=done?"오늘 완료":"+35P";});
    const count=state.daily.activityClaims.length;
    if($("hotelActivityStatus"))$("hotelActivityStatus").textContent=count+" / "+activities.length+"개 프로그램 참여 완료"+(count===activities.length?" · 오늘의 액티비티 보너스를 받을 수 있어요.":" · 모든 프로그램에 참여해 추가 보너스에 도전하세요.");
  }
  function renderRewards() {
    const grid=$("hotelRewardGrid");if(!grid)return;grid.replaceChildren();
    const equipped=roomSettings(getRoom(state.selectedRoom).id).reward||"none";
    rewards.forEach(item=>{const owned=state.rewardOwned.includes(item.id),active=equipped===item.id,card=document.createElement("article");card.className="hotel-reward-card"+(owned?" is-owned":"");const art=document.createElement("div");art.className="hotel-reward-art";art.textContent=item.icon;const title=document.createElement("strong");title.textContent=item.name;const desc=document.createElement("p");desc.textContent=item.description;const footer=document.createElement("div");footer.className="hotel-reward-foot";const price=document.createElement("span");price.textContent=owned?"영구 보유":item.price+" HOTEL P";const button=document.createElement("button");button.type="button";button.dataset.rewardId=item.id;button.dataset.hotelRewardAction=owned?"equip":"buy";button.textContent=owned?(active?"장착 중":"장착하기"):"교환하기";button.disabled=owned?active:Number(state.hotelPoints||0)<item.price;footer.append(price,button);card.append(art,title,desc,footer);grid.append(card);});
  }
  function renderEngagement() {
    if(!member)return;ensureDailyState();renderWallet();renderAttendance();renderDailyEvent();renderMissions();renderActivities();renderRewards();
  }
  function claimAttendance() {
    if(!member)return;ensureDailyState();if(state.daily.attendanceClaimed){showToast("오늘의 웰컴 혜택은 이미 받았어요.");return;}
    const today=hotelDateKey(),yesterday=offsetDateKey(today,-1),previous=state.attendance.lastDate;
    state.attendance.streak=previous===yesterday?state.attendance.streak+1:1;state.attendance.lastDate=today;state.attendance.total+=1;
    if(!state.attendance.dates.includes(today))state.attendance.dates.push(today);state.attendance.dates=state.attendance.dates.slice(-30);state.daily.attendanceClaimed=true;
    const bonus=state.attendance.streak%7===0;addHotelReward(100+(bonus?250:0),30+(bonus?50:0));completeMission("attendance");renderEngagement();
    showToast(bonus?"7일 연속 출석 달성! 특별 보너스를 받았어요.":"오늘의 웰컴 혜택을 받았어요!");
  }
  function joinDailyEvent() {
    if(!member)return;ensureDailyState();if(state.daily.eventClaimed){showToast("오늘의 이벤트는 이미 참여했어요. 내일 새로운 이벤트가 열립니다.");return;}
    state.daily.eventClaimed=true;addHotelReward(80,25);completeMission("event");renderEngagement();showToast(activeDailyEvent().title+" 참여 완료! 호텔 포인트를 받았어요.");
  }
  function claimMissionBonus() {
    ensureDailyState();if(!missions.every(item=>state.daily.missions[item.id])){showToast("오늘의 미션을 모두 완료하면 보상을 받을 수 있어요.");return;}
    if(state.daily.missionBonusClaimed){showToast("오늘의 그랜드 보상은 이미 받았어요.");return;}
    state.daily.missionBonusClaimed=true;addHotelReward(250,50);renderEngagement();showToast("오늘의 그랜드 보너스 +250P · +50 EXP!");
  }
  function takeActivity(id) {
    if(!member)return;ensureDailyState();const activity=activities.find(item=>item.id===id);if(!activity)return;
    if(state.daily.activityClaims.includes(id)){showToast("이 프로그램은 오늘 이미 참여했어요.");return;}
    state.daily.activityClaims.push(id);state.totalActivities+=1;addHotelReward(activity.points,activity.exp);
    if(id==="reading")openExistingView("library");else if(id==="concert")$("musicPlayToggle")?.click();else if(id==="garden")showToast("시크릿 가든 산책을 기록했어요. 오늘의 휴식을 즐겨 보세요.");else showToast("애프터눈 티 세레머니 참여 완료!");
    if(state.daily.activityClaims.length===activities.length&&!state.daily.activityBonusClaimed){state.daily.activityBonusClaimed=true;addHotelReward(100,30);showToast("오늘의 액티비티 완료! 올 데이 리트리트 보너스 +100P!");}
    save();renderActivities();renderRewards();
  }
  function handleRewardAction(id,action) {
    const item=rewards.find(reward=>reward.id===id);if(!item)return;
    if(action==="buy"){
      if(state.rewardOwned.includes(item.id))return;
      if(Number(state.hotelPoints||0)<item.price){showToast("호텔 포인트가 부족합니다. 미션과 이벤트에 참여해 보세요.");return;}
      state.hotelPoints-=item.price;state.rewardOwned.push(item.id);save();renderWallet();renderRewards();showToast(item.name+" 교환 완료! 객실 인테리어에서 장착할 수 있어요.");return;
    }
    if(action==="equip"){
      if(!state.rewardOwned.includes(item.id))return;
      const settings=roomSettings(state.selectedRoom);settings.reward=settings.reward===item.id?"none":item.id;save();renderScene();renderRewards();showToast(settings.reward===item.id?item.name+" 장착 완료!":"객실 장식을 해제했어요.");
    }
  }

  window.setInterval(syncMusicText, 3000);
})();