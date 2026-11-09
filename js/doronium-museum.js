import { createCrystalViewer } from "../doronium-factory/world3d.js?v=19";

const specimens = [
 {id:"doronium_normal",name:"일반 도로늄",en:"NORMAL DORONIUM",grade:"FOUNDATION",group:"base",color:"#63d8e8",glow:"rgba(99,216,232,.23)",shape:"Octahedron",shapeKo:"팔면체",process:"돌이 고기 10개 · 공명 압력 반응로",temp:"1,800°C · 압력 1,000",desc:"모든 도로늄 변형의 출발점이 되는 기본 결정입니다. 안정적인 공명 구조를 바탕으로 여러 변환 공정의 핵심 원료가 됩니다.",note:"첫 합성에 성공한 기초 표본. 이후 모든 변형 결정은 이 표본의 격자와 공명 특성을 바꾸어 제작합니다.",recipe:"돌이 고기 10개를 고온·고압 공명 공정에 투입"},
 {id:"doronium_blue",name:"블루 도로늄",en:"BLUE DORONIUM",grade:"ELEMENTAL",group:"element",color:"#288ff0",glow:"rgba(40,143,240,.25)",shape:"Hexagonal Prism",shapeKo:"육각 기둥",process:"일반 도로늄 3개 · 석영 2개 · 물 8L",temp:"냉각 결정화 · 35초",desc:"푸른 빛을 띠는 육각형 결정입니다. 석영과 물을 사용하는 냉각 결정화 공정으로 형성됩니다.",note:"연구 기록에서 가장 먼저 안정적인 색상 변환이 확인된 표본 중 하나입니다.",recipe:"일반 도로늄 3개 + 석영 2개 + 물 8L"},
 {id:"doronium_red",name:"레드 도로늄",en:"RED DORONIUM",grade:"ELEMENTAL",group:"element",color:"#f05a65",glow:"rgba(240,90,101,.24)",shape:"Tetrahedron",shapeKo:"정사면체",process:"일반 도로늄 3개 · 석탄 5개 · 철판 1개",temp:"열 안정 결정화 · 35초",desc:"붉은 색의 뾰족한 사면체 결정입니다. 열 안정화 공정을 거쳐 특유의 붉은 공명 패턴을 형성합니다.",note:"결정 내부의 열 공명 반응을 연구하기 위한 대표 표본으로 보존됩니다.",recipe:"일반 도로늄 3개 + 석탄 5개 + 철판 1개"},
 {id:"doronium_iron",name:"아이언 도로늄",en:"IRON DORONIUM",grade:"ELEMENTAL",group:"element",color:"#9aa9b7",glow:"rgba(154,169,183,.22)",shape:"Dodecahedron",shapeKo:"십이면체",process:"일반 도로늄 3개 · 철판 4개",temp:"철 원자 격자 공정 · 38초",desc:"금속성 회색 광택을 가진 십이면체 결정입니다. 철 원자 격자를 결합해 단단한 형태를 이루도록 변환합니다.",note:"금속성 격자 구조와 결정의 공명 안정성을 함께 관찰하는 비교 표본입니다.",recipe:"일반 도로늄 3개 + 철판 4개"},
 {id:"doronium_orange",name:"오렌지 도로늄",en:"ORANGE DORONIUM",grade:"ELEMENTAL",group:"element",color:"#ffa344",glow:"rgba(255,163,68,.24)",shape:"Pentagonal Prism",shapeKo:"오각 기둥",process:"일반 도로늄 3개 · 구리 전선 5개 · 구리 광석 2개",temp:"전도 공명 공정 · 38초",desc:"따뜻한 주황색의 오각 기둥 결정입니다. 구리 계열 재료를 사용해 전도 공명 특성을 부여합니다.",note:"전도 특성을 지닌 변형 결정의 구조를 보여주는 표본입니다.",recipe:"일반 도로늄 3개 + 구리 전선 5개 + 구리 광석 2개"},
 {id:"doronium_thermal",name:"써멀 크리스탈",en:"THERMAL CRYSTAL",grade:"ELEMENTAL",group:"element",color:"#ff5937",glow:"rgba(255,89,55,.24)",shape:"Icosahedron",shapeKo:"이십면체",process:"일반 도로늄 4개 · 석탄 7개 · 석영 1개",temp:"열 에너지 봉인 · 42초",desc:"주황빛과 붉은빛이 겹쳐 보이는 결정입니다. 열 에너지를 결정 내부에 봉인하는 변환 공정으로 제작됩니다.",note:"열 에너지 봉인 공정의 결과를 보존한 표본으로, 빛의 농담이 다각면을 따라 달라집니다.",recipe:"일반 도로늄 4개 + 석탄 7개 + 석영 1개"},
 {id:"doronium_cold",name:"콜드 크리스탈",en:"COLD CRYSTAL",grade:"ELEMENTAL",group:"element",color:"#8feaff",glow:"rgba(143,234,255,.25)",shape:"Crystal Spike",shapeKo:"첨정석형",process:"일반 도로늄 4개 · 물 15L · 석영 2개",temp:"저온 위상 고정 · 42초",desc:"맑고 차가운 푸른빛의 뾰족한 결정입니다. 저온 위상 고정 공정으로 결정 구조를 안정화합니다.",note:"저온에서도 형태를 유지하는 결정 구조의 특징을 관찰할 수 있습니다.",recipe:"일반 도로늄 4개 + 물 15L + 석영 2개"},
 {id:"doronium_black",name:"블랙 도로늄",en:"BLACK DORONIUM",grade:"RARE",group:"advanced",color:"#62527d",glow:"rgba(98,82,125,.3)",shape:"Cubic Crystal",shapeKo:"입방 결정",process:"일반 도로늄 5개 · 석탄 12개 · 산업 회로 2개",temp:"에너지 흡수 결정 공정 · 48초",desc:"빛을 흡수하는 듯한 짙은 보랏빛 검은 결정입니다. 석탄과 산업 회로를 사용해 에너지 흡수형 구조를 형성합니다.",note:"어두운 표면과 내부의 보랏빛 발광이 대비되는 희귀 표본입니다.",recipe:"일반 도로늄 5개 + 석탄 12개 + 산업 회로 2개"},
 {id:"doronium_clear",name:"투명 도로늄",en:"CLEAR DORONIUM",grade:"RARE",group:"advanced",color:"#c7f7ff",glow:"rgba(199,247,255,.28)",shape:"Square Prism",shapeKo:"사각 기둥",process:"일반 도로늄 4개 · 석영 8개 · 물 5L",temp:"광학 투명화 · 48초",desc:"빛이 내부를 통과하는 듯한 맑은 결정입니다. 석영과 물을 이용한 광학 투명화 공정으로 만들어집니다.",note:"투명도와 빛의 굴절을 연구하는 광학 전시 구역의 대표 표본입니다.",recipe:"일반 도로늄 4개 + 석영 8개 + 물 5L"},
 {id:"doronium_special",name:"스페셜 도로늄",en:"SPECIAL DORONIUM",grade:"ADVANCED",group:"advanced",color:"#f4d66d",glow:"rgba(244,214,109,.25)",shape:"Resonance Ring",shapeKo:"공명 고리",process:"일반 도로늄 5개 · 산업 회로 5개 · 다이아몬드 1개",temp:"고급 분자 재배열 · 55초",desc:"금빛 고리 형태로 표현되는 고급 결정입니다. 고급 분자 재배열 공정을 거쳐 독특한 공명 구조를 형성합니다.",note:"중앙에 빈 공간을 가진 고리형 구조가 특징입니다. 정밀한 분자 배열의 결과를 보여줍니다.",recipe:"일반 도로늄 5개 + 산업 회로 5개 + 다이아몬드 1개"},
 {id:"doronium_limited",name:"리미티드 도로늄",en:"LIMITED DORONIUM",grade:"LIMITED",group:"advanced",color:"#e7b65c",glow:"rgba(231,182,92,.25)",shape:"Crown Crystal",shapeKo:"왕관형 결정",process:"일반 도로늄 8개 · 금 광석 8개 · 산업 회로 8개",temp:"한정 공명 공정 · 65초",desc:"왕관을 닮은 황금빛 결정입니다. 한정 공명 공정으로 제작되며 박물관의 특별 수집 표본으로 분류됩니다.",note:"제작 공정이 길고 투입 재료가 많은 한정 계열 표본입니다.",recipe:"일반 도로늄 8개 + 금 광석 8개 + 산업 회로 8개"},
 {id:"doronium_crystal",name:"크리스탈 도로늄",en:"CRYSTAL DORONIUM",grade:"ADVANCED",group:"advanced",color:"#8aafff",glow:"rgba(138,175,255,.25)",shape:"Faceted Crystal",shapeKo:"다면체 결정",process:"일반 도로늄 5개 · 다이아몬드 2개 · 석영 8개",temp:"결정 격자 성장 · 58초",desc:"다수의 면이 정교하게 맞물린 푸른 보랏빛 결정입니다. 다이아몬드와 석영을 이용해 결정 격자를 성장시킵니다.",note:"빛을 여러 방향으로 나누는 다면 구조가 특징인 정밀 표본입니다.",recipe:"일반 도로늄 5개 + 다이아몬드 2개 + 석영 8개"},
 {id:"doronium_resonant",name:"공명 도로늄",en:"RESONANT DORONIUM",grade:"RESONANCE",group:"advanced",color:"#55e1c3",glow:"rgba(85,225,195,.25)",shape:"Resonance Knot",shapeKo:"매듭형 결정",process:"일반 도로늄 7개 · 산업 회로 8개 · 석영 5개",temp:"공명 주파수 각인 · 60초",desc:"청록색 매듭처럼 얽힌 결정입니다. 공명 주파수를 각인해 반복적인 공명 패턴을 형성합니다.",note:"복잡한 곡선형 모델로 표현되는 공명 계열의 대표 표본입니다.",recipe:"일반 도로늄 7개 + 산업 회로 8개 + 석영 5개"},
 {id:"doronium_prismatic",name:"프리즈매틱 도로늄",en:"PRISMATIC DORONIUM",grade:"ULTRA",group:"advanced",color:"#d68aff",glow:"rgba(214,138,255,.28)",shape:"Triangular Prism",shapeKo:"삼각 기둥",process:"일반 도로늄 8개 · 금 광석 5개 · 다이아몬드 3개",temp:"프리즘 분광 분리 · 68초",desc:"빛을 여러 색으로 분리하는 프리즘형 결정입니다. 금과 다이아몬드를 활용하는 분광 분리 공정으로 탄생합니다.",note:"각 면에 다른 색의 반사가 보이는 듯한 프리즘 계열 표본입니다.",recipe:"일반 도로늄 8개 + 금 광석 5개 + 다이아몬드 3개"},
 {id:"doronium_void",name:"보이드 도로늄",en:"VOID DORONIUM",grade:"VOID",group:"advanced",color:"#5b3b86",glow:"rgba(91,59,134,.33)",shape:"Void Dodecahedron",shapeKo:"공허 십이면체",process:"일반 도로늄 10개 · 블랙 도로늄 2개 · 산업 회로 10개 · 석탄 15개",temp:"공허 압축 · 75초",desc:"깊은 보랏빛을 품은 고밀도 결정입니다. 공허 압축 공정으로 복잡한 내부 구조를 가진 표본을 제작합니다.",note:"15종의 정식 변형 중 마지막 계열로 보존되는 고난도 표본입니다.",recipe:"일반 도로늄 10개 + 블랙 도로늄 2개 + 산업 회로 10개 + 석탄 15개"}
];

const shapeKeys = {doronium_normal:"octa",doronium_blue:"hex",doronium_red:"tetra",doronium_iron:"dodeca",doronium_orange:"pent",doronium_thermal:"icosa",doronium_cold:"spike",doronium_black:"block",doronium_clear:"square",doronium_special:"ring",doronium_limited:"crown",doronium_crystal:"faceted",doronium_resonant:"knot",doronium_prismatic:"tri",doronium_void:"void"};\n\nconst shapeSvg = {
 octa:'<path class="gem-face" d="M50 4 89 32 72 91 50 115 28 91 11 32Z"/><path class="gem-light" d="M50 4 50 57 11 32Z"/><path class="gem-dark" d="M50 57 72 91 50 115Z"/><path class="gem-line" d="M11 32 50 57 89 32M50 4V115M28 91 50 57 72 91"/>',
 hex:'<path class="gem-face" d="M50 4 86 25 86 83 50 114 14 83 14 25Z"/><path class="gem-light" d="M50 4 50 61 14 25Z"/><path class="gem-dark" d="M50 61 86 25 86 83 50 114Z"/><path class="gem-line" d="M14 25 50 61 86 25M50 4V114M14 83 50 61 86 83"/>',
 tetra:'<path class="gem-face" d="M50 7 94 94 50 114 6 94Z"/><path class="gem-light" d="M50 7 50 114 6 94Z"/><path class="gem-dark" d="M50 7 94 94 50 114Z"/><path class="gem-line" d="M6 94 50 67 94 94"/>',
 dodeca:'<path class="gem-face" d="M50 4 83 17 96 52 76 98 50 115 24 98 4 52 17 17Z"/><path class="gem-light" d="M50 4 50 58 17 17Z"/><path class="gem-dark" d="M50 58 96 52 76 98 50 115Z"/><path class="gem-line" d="M17 17 50 58 83 17M4 52 50 58 96 52M24 98 50 58 76 98M50 4V115"/>',
 pent:'<path class="gem-face" d="M50 5 88 32 75 94 50 114 25 94 12 32Z"/><path class="gem-light" d="M50 5 50 60 12 32Z"/><path class="gem-dark" d="M50 60 88 32 75 94 50 114Z"/><path class="gem-line" d="M12 32 50 60 88 32M25 94 50 60 75 94M50 5V114"/>',
 icosa:'<path class="gem-face" d="M50 4 87 25 96 66 74 101 50 115 26 101 4 66 13 25Z"/><path class="gem-light" d="M50 4 50 61 13 25Z"/><path class="gem-dark" d="M50 61 96 66 74 101 50 115Z"/><path class="gem-line" d="M13 25 50 61 87 25M4 66 50 61 96 66M26 101 50 61 74 101M50 4V115"/>',
 spike:'<path class="gem-face" d="M50 3 83 68 72 99 50 116 28 99 17 68Z"/><path class="gem-light" d="M50 3 50 68 17 68Z"/><path class="gem-dark" d="M50 68 83 68 72 99 50 116Z"/><path class="gem-line" d="M17 68 50 68 83 68M28 99 50 68 72 99M50 3V116"/>',
 block:'<path class="gem-face" d="M50 5 91 27 91 86 50 113 9 86 9 27Z"/><path class="gem-light" d="M50 5 50 60 9 27Z"/><path class="gem-dark" d="M50 60 91 27 91 86 50 113Z"/><path class="gem-line" d="M9 27 50 60 91 27M9 86 50 60 91 86M50 5V113"/>',
 square:'<path class="gem-face" d="M50 4 82 23 82 96 50 114 18 96 18 23Z"/><path class="gem-light" d="M50 4 50 58 18 23Z"/><path class="gem-dark" d="M50 58 82 23 82 96 50 114Z"/><path class="gem-line" d="M18 23 50 58 82 23M18 96 50 58 82 96M50 4V114"/>',
 ring:'<path class="gem-face" d="M50 5C78 5 94 27 88 56C83 85 67 107 50 113C33 107 17 85 12 56C6 27 22 5 50 5Z"/><path class="gem-dark" d="M50 28C67 28 75 41 71 56C67 71 58 84 50 87C42 84 33 71 29 56C25 41 33 28 50 28Z"/><path class="gem-line" d="M50 5V28M12 56 29 56M71 56 88 56M33 88 50 87 67 88"/>',
 crown:'<path class="gem-face" d="M50 4 67 34 91 20 82 91 50 115 18 91 9 20 33 34Z"/><path class="gem-light" d="M50 4 50 65 9 20Z"/><path class="gem-dark" d="M50 65 91 20 82 91 50 115Z"/><path class="gem-line" d="M9 20 50 65 91 20M18 91 50 65 82 91M33 34 50 65 67 34M50 4V115"/>',
 faceted:'<path class="gem-face" d="M50 3 92 27 87 79 50 115 13 79 8 27Z"/><path class="gem-light" d="M50 3 50 58 8 27Z"/><path class="gem-dark" d="M50 58 92 27 87 79 50 115Z"/><path class="gem-line" d="M8 27 50 58 92 27M13 79 50 58 87 79M50 3V115M13 79 50 91 87 79"/>',
 knot:'<path d="M50 20C90 12 91 63 57 66C21 69 9 36 35 24C62 11 88 39 74 73C62 101 20 106 16 77C12 50 48 38 66 55C83 72 68 99 45 94" fill="none" stroke="var(--gem)" stroke-width="13" stroke-linecap="round"/><path d="M50 20C90 12 91 63 57 66C21 69 9 36 35 24C62 11 88 39 74 73C62 101 20 106 16 77C12 50 48 38 66 55C83 72 68 99 45 94" fill="none" stroke="#edffff" stroke-opacity=".58" stroke-width="2"/>',
 tri:'<path class="gem-face" d="M50 4 96 105 4 105Z"/><path class="gem-light" d="M50 4 50 105 4 105Z"/><path class="gem-dark" d="M50 4 96 105 50 105Z"/><path class="gem-line" d="M4 105 50 64 96 105M50 4V105"/>',
 void:'<path class="gem-face" d="M50 3 82 17 97 51 82 91 50 115 18 91 3 51 18 17Z"/><path class="gem-dark" d="M50 24 69 32 79 53 69 78 50 94 31 78 21 53 31 32Z"/><path class="gem-line" d="M18 17 50 53 82 17M3 51 50 53 97 51M18 91 50 53 82 91M50 3V115"/>'
};

const grid = document.querySelector("#specimen-grid");
const searchInput = document.querySelector("#specimen-search");
const countLabel = document.querySelector("#collection-count");
const emptyState = document.querySelector("#empty-state");
const visitedCount = document.querySelector("#visited-count");
const visitedProgress = document.querySelector("#visited-progress");
const dialog = document.querySelector("#specimen-dialog");
const dialogCanvas = document.querySelector("#specimen-canvas");
const toastEl = document.querySelector("#museum-toast");
let activeFilter = "all";
let activeViewer = null;
let toastTimer = 0;
let viewed = new Set();
try {
 const saved = JSON.parse(localStorage.getItem("doriMuseumViewed.v1") || "[]");
 if (Array.isArray(saved)) viewed = new Set(saved.filter(id => specimens.some(item => item.id === id)));
} catch { viewed = new Set(); }

function renderGem(item) {
 const id = "gem-" + item.id.replace(/[^a-z0-9]/gi, "");
 return `<svg class="specimen-gem" viewBox="0 0 100 120" role="img" aria-label="${item.name} 결정 모형" style="--gem:${item.color};--gem-glow:${item.glow}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".9"/><stop offset=".3" stop-color="${item.color}"/><stop offset="1" stop-color="#071b2b"/></linearGradient></defs><g style="--gem:${item.color}">${shapeSvg[shapeKeys[item.id] || "octa"] || shapeSvg.octa}</g></svg>`;
}

function visibleSpecimens() {
 const q = searchInput.value.trim().toLocaleLowerCase();
 return specimens.filter(item => {
  const matchesFilter = activeFilter === "all" || item.group === activeFilter;
  const matchesText = !q || item.name.toLocaleLowerCase().includes(q) || item.en.toLowerCase().includes(q) || item.desc.toLocaleLowerCase().includes(q);
  return matchesFilter && matchesText;
 });
}

function renderCards() {
 const visible = visibleSpecimens();
 grid.innerHTML = visible.map((item) => {
  const number = String(specimens.indexOf(item) + 1).padStart(3, "0");
  const seen = viewed.has(item.id);
  const shape = item.id.replace("doronium_", "");
  return `<button class="specimen-card" type="button" data-specimen="${item.id}" style="--gem:${item.color};--gem-glow:${item.glow};--delay:${(specimens.indexOf(item)%5)*-.55}s" aria-label="${item.name} 상세 정보 열기">
    <div class="specimen-visual"><span class="specimen-number">NO. ${number}</span><span class="specimen-grade">${item.grade}</span>${renderGem(item)}</div>
    <div class="specimen-copy"><small>${item.en}</small><strong>${item.name}</strong><span>${item.desc}</span></div>
    <div class="specimen-open"><span>${seen ? "관람한 표본" : "표본 상세 보기"}</span><b>↗</b></div>
   </button>`;
 }).join("");
 countLabel.textContent = `${visible.length}개 표본 전시 중`;
 emptyState.hidden = visible.length > 0;
}

function updateProgress() {
 visitedCount.textContent = String(viewed.size);
 visitedProgress.style.width = (viewed.size / specimens.length * 100) + "%";
 try { localStorage.setItem("doriMuseumViewed.v1", JSON.stringify([...viewed])); } catch {}
}

function showToast(message) {
 toastEl.textContent = message;
 toastEl.classList.add("show");
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function fillDialog(item, isInfinity = false) {
 const index = isInfinity ? 16 : specimens.indexOf(item) + 1;
 document.querySelector("#dialog-class").textContent = `SPECIMEN / ${String(index).padStart(3,"0")} · ${isInfinity ? "ULTIMATE CLASS" : item.grade}`;
 document.querySelector("#dialog-title").textContent = isInfinity ? "인피니티 도로늄" : item.name;
 document.querySelector("#dialog-lead").textContent = isInfinity
  ? "15종의 정식 도로늄 결정이 하나로 결합된 궁극 표본입니다. 7단계 퓨전 공정을 완료한 뒤 행성 안정화 프로토콜에 투입됩니다."
  : item.desc;
 document.querySelector("#dialog-tags").innerHTML = isInfinity
  ? "<span>CLASS ∞</span><span>ULTIMATE</span><span>PLANETARY CORE</span>"
  : `<span>${item.en}</span><span>${item.grade}</span><span>${item.shapeKo}</span>`;
 document.querySelector("#dialog-shape").textContent = isInfinity ? "인피니티 다중 공명 구조" : item.shapeKo + " · " + item.shape;
 document.querySelector("#dialog-process").textContent = isInfinity ? "15종 × 100개 · 7단계 퓨전" : item.process;
 document.querySelector("#dialog-note").textContent = isInfinity
  ? "기록된 퓨전 프로젝트의 최종 산물. 인피니티 도로늄 1개를 중앙 안정화 코어에 장착하고, 연구 및 릴레이 조건을 충족하면 행성 에너지 네트워크를 동기화할 수 있습니다."
  : item.note + " / 투입 재료: " + item.recipe + (item.temp ? " · " + item.temp : "");
}

async function openSpecimen(item, isInfinity = false) {
 if (!item && !isInfinity) return;
 if (activeViewer) { activeViewer.dispose(); activeViewer = null; }
 fillDialog(item, isInfinity);
 if (!dialog.open) dialog.showModal();
 if (!isInfinity) {
  viewed.add(item.id);
  updateProgress();
  renderCards();
 }
 const modelId = isInfinity ? "infinity" : item.id;
 requestAnimationFrame(() => {
  try { activeViewer = createCrystalViewer(dialogCanvas, modelId); }
  catch (error) { console.error("3D specimen viewer unavailable", error); showToast("3D 모델을 불러오지 못했어요. 표본 기록은 계속 볼 수 있습니다."); }
 });
}

grid.addEventListener("click", event => {
 const card = event.target.closest("[data-specimen]");
 if (!card) return;
 const item = specimens.find(entry => entry.id === card.dataset.specimen);
 if (item) openSpecimen(item);
});

document.querySelectorAll("[data-filter]").forEach(button => {
 button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach(tab => {
   const selected = tab === button;
   tab.classList.toggle("active", selected);
   tab.setAttribute("aria-pressed", String(selected));
  });
  renderCards();
 });
});
searchInput.addEventListener("input", renderCards);
document.querySelector("#open-infinity").addEventListener("click", () => openSpecimen(null, true));
document.querySelector("#dialog-done").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => {
 if (activeViewer) { activeViewer.dispose(); activeViewer = null; }
});
document.querySelector("#reset-visit").addEventListener("click", () => {
 viewed.clear();
 updateProgress();
 renderCards();
 showToast("관람 기록을 초기화했습니다.");
});
document.addEventListener("keydown", event => {
 if (event.key === "/" && !event.ctrlKey && !event.metaKey && !["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) {
  event.preventDefault();
  searchInput.focus();
 }
});
renderCards();
updateProgress();
