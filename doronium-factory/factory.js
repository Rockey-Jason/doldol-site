import { createWorld3D, createCrystalViewer, DORONIUM_CRYSTAL_MODELS, DORONIUM_CRYSTAL_MODEL_SHAPES } from "./world3d.js?v=25";
import { CATALOG_ITEMS, CATALOG_RECIPES, CATALOG_MACHINES, validateCatalog } from "./catalog.js?v=2";
import { createRuntimeState, ensureItemStacks, addItemStack, syncLegacyInventory, availableItemCount, reserveItemStacks, reserveItemBatch, releaseItemReservation, commitItemReservations, removeItemStacks, runCanonicalTick, requestSaveSnapshot, calculateOutputQuality, calculateOutputPurity, accuracyQuality, validateRuntimeState } from "./simulation-core.js?v=6";
import { WORLD_W, WORLD_H, MINE_W, MINE_H, MINE_LEVELS, MINE_ENTRANCES, PRIMARY_MINE_ID, biomeAt, regionAt, terrainHeightAt, mineFloorY, mineDepositKey, mineTunnelAt, mineInstanceId, nearestMineInstanceId, createMineInstances, migrateMineInstances } from "./terrain-system.js?v=8";
import { validateGameData } from "./game-data-validation.js?v=3";
import { resolveMachinePower, advanceMachineEnvironment, applyMachineWear, commitCompletionBuffer, clearCompletionBuffer } from "./production-runtime.js?v=5";
import { SKILL_NODES, SKILL_GROUPS, createSkillState, normalizeSkillState, awardSkillPoints, unlockSkill, skillNodeStatus, calculateSkillBonuses, validateSkillTree, validateSkillState } from "./skill-runtime.js?v=1";
import { createSaveEnvelope, decodeSave, readBestSave, restoreSaveCandidate, validateSaveEnvelope, writeSaveEnvelope } from "./save-store.js?v=1";
import { reserveFusionInputs, validateFusionReservations, releaseFusionInputs, commitFusionInputs } from "./fusion-runtime.js?v=1";
let createClient = null;

/* DORONIUM FACTORY — INFINITE INDUSTRY
   Standalone Canvas game, deterministic map seed, fixed-step simulation,
   persistent browser save + authenticated per-user Supabase cloud save.
*/
const E2E_MODE = new URLSearchParams(location.search).has("e2e");
const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
const CLOUD_KEY = "doronium_factory_infinite_industry_v1";
const LOCAL_KEY = "doronium_factory_infinite_industry_local_v1";
let activeLocalKey = LOCAL_KEY;
let saveBlockedForFutureSchema = false;
const TILE = 46, STEP = 0.1, BUILDING_LIMIT = 180;
const $ = (id) => document.getElementById(id);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const fmt = (n)=>Math.floor(Number(n)||0).toLocaleString("ko-KR");
const short = (n)=>{n=Number(n)||0;return n>=1e9?(n/1e9).toFixed(1)+"B":n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":fmt(n)};
const nowISO=()=>new Date().toISOString();
const checksumText=(value)=>{let h=0x811c9dc5;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,0x01000193)}return (h>>>0).toString(16).padStart(8,"0")};
const DIRS=[{x:0,y:-1,name:"북"},{x:1,y:0,name:"동"},{x:0,y:1,name:"남"},{x:-1,y:0,name:"서"}];
const RESOURCE={
 wood:{name:"목재",icon:"🪵",price:5,kind:"raw"},stone:{name:"석재",icon:"🪨",price:4,kind:"raw"},
 ironOre:{name:"철광석",icon:"⛏️",price:8,kind:"raw"},copperOre:{name:"구리 광석",icon:"🟠",price:9,kind:"raw"},
 coal:{name:"석탄",icon:"⬛",price:6,kind:"raw"},water:{name:"물",icon:"💧",price:2,kind:"fluid"},
 quartz:{name:"석영",icon:"🔹",price:16,kind:"raw"},goldOre:{name:"금 광석",icon:"🟡",price:24,kind:"raw"},
 diamond:{name:"다이아몬드",icon:"💠",price:80,kind:"rare"},ironPlate:{name:"철판",icon:"▰",price:25,kind:"part"},
 wire:{name:"구리 전선",icon:"〰️",price:18,kind:"part"},circuit:{name:"산업 회로",icon:"▦",price:95,kind:"part"},
 doriMeat:{name:"돌이 고기",icon:"🍖",price:55,kind:"special"},
 doronium_normal:{name:"일반 도로늄",icon:"🔷",price:900,kind:"doronium"},
 doronium_blue:{name:"블루 도로늄",icon:"🟦",price:1400,kind:"doronium"},
 doronium_red:{name:"레드 도로늄",icon:"🟥",price:1500,kind:"doronium"},
 doronium_iron:{name:"아이언 도로늄",icon:"⚙️",price:1600,kind:"doronium"},
 doronium_orange:{name:"오렌지 도로늄",icon:"🟠",price:1700,kind:"doronium"},
 doronium_thermal:{name:"써멀 크리스탈",icon:"🔥",price:1900,kind:"doronium"},
 doronium_cold:{name:"콜드 크리스탈",icon:"❄️",price:1900,kind:"doronium"},
 doronium_black:{name:"블랙 도로늄",icon:"⚫",price:2400,kind:"doronium"},
 doronium_clear:{name:"투명 도로늄",icon:"💎",price:2600,kind:"doronium"},
 doronium_special:{name:"스페셜 도로늄",icon:"✨",price:3200,kind:"doronium"},
 doronium_limited:{name:"리미티드 도로늄",icon:"🌟",price:5000,kind:"doronium"},
 doronium_crystal:{name:"크리스탈 도로늄",icon:"🔮",price:3800,kind:"doronium"},
 doronium_resonant:{name:"공명 도로늄",icon:"🪄",price:4200,kind:"doronium"},
 doronium_prismatic:{name:"프리즈매틱 도로늄",icon:"🌈",price:4800,kind:"doronium"},
 doronium_void:{name:"보이드 도로늄",icon:"🌌",price:6000,kind:"doronium"},
 infinity:{name:"인피니티 도로늄",icon:"💠",price:1000000,kind:"final"}
};
const VARIANTS=["doronium_normal","doronium_blue","doronium_red","doronium_iron","doronium_orange","doronium_thermal","doronium_cold","doronium_black","doronium_clear","doronium_special","doronium_limited","doronium_crystal","doronium_resonant","doronium_prismatic","doronium_void"];
const BUILDINGS=[
{id:"belt",name:"컨베이어 벨트",icon:"➜",cat:"logistics",cost:12,materials:{wood:1},desc:"평탄화한 산업 기초 타일 위에 설치하는 표준 운송 벨트입니다. X 키로 방향을 바꾸세요.",unlock:null,kind:"belt",power:0},
{id:"beltAdaptive",name:"자연 적응형 컨베이어",icon:"〰️",cat:"logistics",cost:55,materials:{wood:2,ironPlate:1},desc:"경사와 단차를 따라가며 별도 평탄화나 기초 타일 없이 설치할 수 있습니다.",unlock:"logistics",kind:"belt",power:0},
{id:"storage",name:"산업 창고",icon:"📦",cat:"logistics",cost:90,materials:{wood:6,stone:3},desc:"벨트로 전달된 아이템을 공용 창고에 보관합니다.",unlock:null,kind:"storage",power:0},
{id:"warehouse",name:"통합 물류 센터",icon:"🏬",cat:"logistics",cost:450,materials:{wood:12,ironPlate:5},desc:"인접 벨트의 생산품을 자동으로 회수하고 대량 보관합니다.",unlock:"logistics",kind:"warehouse",power:1},
{id:"solar",name:"태양광 발전기",icon:"☀️",cat:"power",cost:140,materials:{wood:8,stone:4,copperOre:2},desc:"낮에 전력을 생산합니다. 밤에는 발전량이 감소합니다.",unlock:null,kind:"power",power:0,gen:8},
{id:"wind",name:"풍력 발전기",icon:"🌬️",cat:"power",cost:280,materials:{wood:10,stone:8,ironPlate:2},desc:"날씨에 영향을 받지만 밤에도 전력을 공급합니다.",unlock:"electricity",kind:"power",power:0,gen:7},
{id:"coalgen",name:"석탄 화력 발전소",icon:"♨️",cat:"power",cost:520,materials:{ironPlate:6,stone:10},desc:"석탄을 태워 안정적으로 대량의 전력을 생산합니다.",unlock:"metallurgy",kind:"power",power:0,gen:18},
{id:"pump",name:"정수 펌프",icon:"💧",cat:"resource",cost:150,materials:{wood:7,stone:5},desc:"수원지에서 물을 끌어올립니다. 물 타일 위에 설치하세요.",unlock:null,kind:"pump",power:1},
{id:"minerIron",name:"철광석 채굴기",icon:"⛏️",cat:"resource",cost:180,materials:{wood:8,stone:5,ironOre:2},desc:"철 광맥에서 철광석을 자동 채굴합니다.",unlock:null,kind:"miner",resource:"ironOre",power:2},
{id:"minerCopper",name:"구리 채굴기",icon:"🟠",cat:"resource",cost:205,materials:{wood:8,stone:5,copperOre:2},desc:"구리 광맥에서 구리 광석을 자동 채굴합니다.",unlock:"mining",kind:"miner",resource:"copperOre",power:2},
{id:"minerCoal",name:"심층 석탄 채굴기",icon:"⬛",cat:"resource",cost:240,materials:{wood:8,ironPlate:2},desc:"석탄 광맥을 자동 채굴합니다.",unlock:"mining",kind:"miner",resource:"coal",power:3},
{id:"doriFarm",name:"돌이 나무 재배기",icon:"🌳",cat:"resource",cost:290,materials:{wood:8,stone:6,ironPlate:2},desc:"인접한 돌이 고기 나무를 관리합니다. 60초마다 물 2L를 사용해 열매 1개를 수확합니다.",unlock:"bio",kind:"doriFarm",power:2},
{id:"smelter",name:"고온 제련로",icon:"🔥",cat:"process",cost:280,materials:{stone:10,ironOre:6},desc:"철광석 2개와 석탄 1개를 철판 1개로 제련합니다.",unlock:null,kind:"machine",power:4,recipe:"smelt"},
{id:"wiremill",name:"전선 압연기",icon:"〰️",cat:"process",cost:250,materials:{wood:8,stone:4},desc:"구리 광석 1개를 전선 2개로 가공합니다.",unlock:null,kind:"machine",power:3,recipe:"wire"},
{id:"assembler",name:"회로 조립기",icon:"▦",cat:"process",cost:430,materials:{ironPlate:4,wire:5},desc:"철판 1개와 전선 2개로 산업 회로를 조립합니다.",unlock:"mechanical",kind:"machine",power:5,recipe:"circuit"},
{id:"lab",name:"기술 연구소",icon:"🔬",cat:"advanced",cost:360,materials:{ironPlate:4,wire:3},desc:"산업 회로와 자금을 사용해 신기술을 연구합니다.",unlock:null,kind:"lab",power:4},
{id:"market",name:"산업 거래소",icon:"⚖️",cat:"logistics",cost:180,materials:{wood:8,ironPlate:2},desc:"인접한 벨트의 생산품을 자동 판매합니다. 일반 거래소 가격의 80%를 지급합니다.",unlock:null,kind:"market",power:0},
{id:"reactor",name:"도로늄 압력 반응로",icon:"🔷",cat:"advanced",cost:1450,materials:{ironPlate:12,circuit:8,wire:6},desc:"비합성 돌이 고기 10개를 고온·고압 공명 공정으로 합성해 일반 도로늄 1개를 만듭니다.",unlock:"doronium",kind:"reactor",power:14,recipe:"doronium"},
{id:"variantLab",name:"결정 변환 연구로",icon:"💎",cat:"advanced",cost:2600,materials:{ironPlate:20,circuit:12,quartz:8},desc:"일반 도로늄을 14가지 특수 결정 계열로 변환합니다. 설비를 선택해 제조 레시피를 설정하세요.",unlock:"variant",kind:"variant",power:18},
{id:"cooling",name:"초전도 냉각탑",icon:"❄️",cat:"power",cost:950,materials:{ironPlate:10,circuit:4},desc:"고압 설비와 퓨전 반응로의 열을 안정화합니다.",unlock:"pressure",kind:"cooling",power:5},
{id:"fusion",name:"인피니티 퓨전 설비",icon:"🌌",cat:"advanced",cost:12000,materials:{ironPlate:100,circuit:50,quartz:30},desc:"15종의 정식 도로늄을 각 100개씩 투입해 7단계 퓨전을 수행합니다.",unlock:"fusion",kind:"fusion",power:40},
{id:"relay",name:"행성 안정화 릴레이",icon:"📡",cat:"advanced",cost:1500,materials:{ironPlate:25,circuit:15,doronium_normal:10},desc:"행성 에너지 노드에 설치하는 안정화 장치입니다.",unlock:"relay",kind:"relay",power:3},
{id:"core",name:"중앙 안정화 코어",icon:"💠",cat:"advanced",cost:4800,materials:{ironPlate:45,circuit:30,doronium_special:5},desc:"인피니티 도로늄을 장착해 행성의 에너지 네트워크를 동기화합니다.",unlock:"infinity",kind:"core",power:12}
];
// Correct the relay's materials without relying on malformed external data.

const RECIPES={
smelt:{name:"철 제련",inputs:{ironOre:2,coal:1},output:"ironPlate",qty:1,time:12,temp:1538,pressure:100},
wire:{name:"구리 전선 압연",inputs:{copperOre:1},output:"wire",qty:2,time:8,temp:250,pressure:50},
circuit:{name:"산업 회로 조립",inputs:{ironPlate:1,wire:2},output:"circuit",qty:1,time:14,temp:120,pressure:20},
doronium:{name:"도로늄 공명 합성",inputs:{doriMeat:10},output:"doronium_normal",qty:1,time:42,temp:1800,pressure:1000}
};
const VARIANT_RECIPES={
doronium_blue:{name:"냉각 결정화",inputs:{doronium_normal:3,quartz:2,water:8},time:35},
doronium_red:{name:"열 안정 결정화",inputs:{doronium_normal:3,coal:5,ironPlate:1},time:35},
doronium_iron:{name:"철 원자 격자",inputs:{doronium_normal:3,ironPlate:4},time:38},
doronium_orange:{name:"전도 공명",inputs:{doronium_normal:3,wire:5,copperOre:2},time:38},
doronium_thermal:{name:"열 에너지 봉인",inputs:{doronium_normal:4,coal:7,quartz:1},time:42},
doronium_cold:{name:"저온 위상 고정",inputs:{doronium_normal:4,water:15,quartz:2},time:42},
doronium_black:{name:"에너지 흡수 결정",inputs:{doronium_normal:5,coal:12,circuit:2},time:48},
doronium_clear:{name:"광학 투명화",inputs:{doronium_normal:4,quartz:8,water:5},time:48},
doronium_special:{name:"고급 분자 재배열",inputs:{doronium_normal:5,circuit:5,diamond:1},time:55},
doronium_limited:{name:"한정 공명 공정",inputs:{doronium_normal:8,goldOre:8,circuit:8},time:65},
doronium_crystal:{name:"결정 격자 성장",inputs:{doronium_normal:5,diamond:2,quartz:8},time:58},
doronium_resonant:{name:"공명 주파수 각인",inputs:{doronium_normal:7,circuit:8,quartz:5},time:60},
doronium_prismatic:{name:"프리즘 분광 분리",inputs:{doronium_normal:8,goldOre:5,diamond:3},time:68},
doronium_void:{name:"공허 압축",inputs:{doronium_normal:10,doronium_black:2,circuit:10,coal:15},time:75}
};

const RESEARCH=[
{id:"survey",name:"정밀 광맥 탐사",icon:"🛰️",tier:0,cost:120,need:{wood:5,stone:5},time:30,desc:"광맥 탐지 효율 향상. 채굴기 설치 해금."},
{id:"mining",name:"기계식 채굴",icon:"⛏️",tier:0,cost:240,need:{ironOre:4,copperOre:2},time:45,desc:"구리·석탄 자동 채굴을 해금합니다." ,requires:["survey"]},
{id:"logistics",name:"산업 물류망",icon:"➜",tier:0,cost:300,need:{ironPlate:2},time:50,desc:"대형 창고와 고속 물류 장비를 해금합니다.",requires:["mining"]},
{id:"mechanical",name:"정밀 기계 공학",icon:"⚙️",tier:1,cost:500,need:{ironPlate:5,wire:4},time:60,desc:"회로 조립기와 연구소를 해금합니다.",requires:["logistics"]},
{id:"electricity",name:"풍력 발전 기술",icon:"🌬️",tier:1,cost:650,need:{ironPlate:5,circuit:1},time:65,desc:"풍력 발전기를 해금합니다.",requires:["mechanical"]},
{id:"metallurgy",name:"고급 야금술",icon:"🔥",tier:1,cost:850,need:{ironPlate:8,coal:10},time:75,desc:"고성능 화력 발전소를 해금합니다.",requires:["mechanical"]},
{id:"bio",name:"돌이 생체 에너지 연구",icon:"🌳",tier:2,cost:1000,need:{circuit:3,water:10},time:90,desc:"돌이 나무 재배기를 해금합니다.",requires:["electricity"]},
{id:"chemistry",name:"분자 촉매 공학",icon:"🧪",tier:2,cost:1250,need:{circuit:4,quartz:4},time:100,desc:"가공 공정의 품질을 높입니다.",requires:["metallurgy"]},
{id:"pressure",name:"초고압 공정",icon:"⏣",tier:2,cost:1800,need:{ironPlate:15,circuit:5},time:120,desc:"안전 압력 용기와 고압 냉각 설비를 해금합니다.",requires:["chemistry"]},
{id:"doronium",name:"도로늄 공명 이론",icon:"🔷",tier:3,cost:2600,need:{doriMeat:5,circuit:8},time:150,desc:"도로늄 압력 반응로의 설계도를 해금합니다.",requires:["bio","pressure"]},
{id:"resonance",name:"공명 주파수 제어",icon:"〽️",tier:3,cost:3200,need:{doronium_normal:2,circuit:8},time:160,desc:"공명 반응의 안정성을 높입니다.",requires:["doronium"]},
{id:"variant",name:"결정 변환 기술",icon:"💎",tier:4,cost:4800,need:{doronium_normal:3,circuit:10},time:180,desc:"특수 도로늄 변환 연구로를 해금합니다.",requires:["resonance"]},
{id:"purity",name:"초고순도 정제",icon:"✨",tier:4,cost:6200,need:{doronium_blue:2,circuit:12},time:190,desc:"고순도 도로늄 생산 보정 연구.",requires:["variant"]},
{id:"automation",name:"완전 자동화 프로토콜",icon:"🤖",tier:4,cost:7600,need:{circuit:20,ironPlate:25},time:200,desc:"자동 공급 및 기계 효율 +15%.",requires:["variant"]},
{id:"fusion",name:"인피니티 퓨전 이론",icon:"🌌",tier:5,cost:12000,need:{doronium_special:5,circuit:30},time:240,desc:"인피니티 퓨전 설비의 설계도를 해금합니다.",requires:["purity","automation"]},
{id:"relay",name:"행성 릴레이 공학",icon:"📡",tier:5,cost:16000,need:{doronium_resonant:5,circuit:35},time:260,desc:"행성 안정화 릴레이를 해금합니다.",requires:["fusion"]},
{id:"infinity",name:"무한 결정 구조",icon:"♾️",tier:6,cost:25000,need:{doronium_prismatic:10,doronium_resonant:3},time:300,desc:"중앙 안정화 코어와 최종 프로토콜을 해금합니다.",requires:["relay"]},
{id:"planet",name:"행성 안정화 프로토콜",icon:"🌍",tier:7,cost:40000,need:{doronium_void:3,circuit:30},time:360,desc:"행성 에너지 네트워크 최종 동기화.",requires:["infinity"]}
];
// Fix canonical ingredient keys for a few research entries.



const FUSION_STAGES=[
{name:"물질·공명 분석",temp:500,pressure:100,power:5,time:20},
{name:"에너지 분리",temp:1200,pressure:500,power:10,time:25},
{name:"분자 평형",temp:1800,pressure:1000,power:15,time:30},
{name:"초고압 압축",temp:2500,pressure:5000,power:22,powerUnused:0,time:35},
{name:"결정 융합",temp:3500,pressure:10000,power:28,time:40},
{name:"결정 핵 형성",temp:4500,pressure:15000,power:34,time:50},
{name:"인피니티 결정화",temp:5000,pressure:20000,power:40,time:60}
];
/* Expand the live runtime while retaining every legacy save identifier. */
Object.assign(RESOURCE,CATALOG_ITEMS);
Object.assign(RECIPES,CATALOG_RECIPES);
const skippedCatalogMachineItems=new Set(["machine_wiremill","machine_storage","machine_conveyor","machine_doronium_fusion"]);
for(const machine of CATALOG_MACHINES){
 if(skippedCatalogMachineItems.has(machine.itemId))continue;
 const definition={...machine};
 if(machine.itemId==="machine_transformer")definition.kind="utility";
 if(machine.itemId==="machine_auto_miner")definition.kind="utility";
 if(machine.itemId==="machine_auto_furnace")definition.catalogStation="furnace";
 if(machine.itemId==="machine_auto_electric_furnace")definition.catalogStation="electric_furnace";
 if(machine.itemId==="machine_solar_panel"){definition.kind="power";definition.generation="solar";definition.gen=10}
 if(machine.itemId==="machine_wind_turbine"){definition.kind="power";definition.generation="wind";definition.gen=13}
 if(machine.itemId==="machine_thermal_generator"){definition.kind="power";definition.generation="coal";definition.gen=28}
 if(machine.itemId==="machine_doronium_generator"){definition.kind="power";definition.generation="doronium";definition.gen=48}
 definition.defaultRecipe=Object.values(CATALOG_RECIPES).find(recipe=>recipe.station===definition.catalogStation)?.id||null;
 BUILDINGS.push(definition);
}
for(const definition of BUILDINGS){
 if(definition.id==="assembler")definition.catalogStation="crafting";
 if(definition.id==="smelter")definition.catalogStation="furnace";
 if(definition.id==="wiremill"){definition.catalogStation="wiremill";definition.catalogItemId="machine_wiremill"}
 if(definition.id==="storage")definition.catalogItemId="machine_storage";
 if(definition.id==="belt")definition.catalogItemId="machine_conveyor";
}
const catalogFusion=BUILDINGS.find(definition=>definition.id==="fusion");
if(catalogFusion){catalogFusion.catalogItemId="machine_doronium_fusion"}
const CATALOG_VALIDATION=validateCatalog();
if(!CATALOG_VALIDATION.valid)console.error("Doronium catalogue validation failed",CATALOG_VALIDATION.errors);
const DATA_VALIDATION=validateGameData({resources:RESOURCE,recipes:RECIPES,variantRecipes:VARIANT_RECIPES,buildings:BUILDINGS,research:RESEARCH});
if(!DATA_VALIDATION.valid)console.error("Doronium Factory data validation failed",DATA_VALIDATION.errors);
const QUESTS=[
{id:"q1",chapter:0,title:"폐허의 첫걸음",desc:"숲에서 도끼로 목재 10개를 벌목하고, 첫 번째 광산에서 곡괭이로 석재 10개를 채굴하세요.",reward:250,check:s=>s.stats.gathered.wood>=10&&s.stats.gathered.stone>=10,progress:s=>Math.min(10,s.stats.gathered.wood)+Math.min(10,s.stats.gathered.stone),max:20,orbit:"“기초 자원 확보 확인. 이곳은 아직 충분히 복구할 수 있습니다.”"},
{id:"q2",chapter:0,title:"첫 번째 전력망",desc:"작업 구역을 평탄화하고 기초 타일을 설치한 뒤 태양광 발전기를 건설하세요. 광산에서 철광석 8개도 확보해야 합니다.",reward:400,check:s=>Object.keys(s.foundation||{}).length>0&&hasBuilding(s,"solar")&&(s.stats.gathered.ironOre||0)>=8,progress:s=>(Object.keys(s.foundation||{}).length>0?1:0)+(hasBuilding(s,"solar")?1:0)+Math.min(1,Math.floor((s.stats.gathered.ironOre||0)/8)),max:3,orbit:"“전력 계통이 연결되었습니다. 산업 설비를 가동할 수 있습니다.”"},
{id:"q3",chapter:0,title:"자동화의 시작",desc:"자연 적응형 또는 표준 컨베이어와 제련로를 설치하고 철판 5개를 생산하세요.",reward:650,check:s=>s.buildings.some(b=>isBeltType(b.type))&&hasBuilding(s,"smelter")&&(s.stats.produced.ironPlate||0)>=5,progress:s=>Math.min(1,s.buildings.some(b=>isBeltType(b.type))?1:0)+Math.min(1,s.stats.built.smelter||0)+Math.min(5,s.stats.produced.ironPlate||0),max:7,orbit:"“생산 라인에서 첫 번째 완제품이 확인되었습니다.”"},
{id:"q4",chapter:1,title:"생체 에너지의 흔적",desc:"돌이 나무 재배기를 설치하고 돌이 고기 10개를 수확하세요.",reward:900,check:s=>hasBuilding(s,"doriFarm")&&(s.stats.produced.doriMeat||0)>=10,progress:s=>Math.min(1,s.stats.built.doriFarm||0)+Math.min(10,s.stats.produced.doriMeat||0),max:11,orbit:"“분석 결과, 이 식물의 열매는 특이한 분자 에너지 구조를 가지고 있습니다.”"},
{id:"q5",chapter:2,title:"푸른 물질의 정체",desc:"도로늄 공명 이론을 연구하고 일반 도로늄을 처음 합성하세요.",reward:1600,check:s=>s.research.includes("doronium")&&(s.stats.produced.doronium_normal||0)>=1,progress:s=>(s.research.includes("doronium")?1:0)+Math.min(1,s.stats.produced.doronium_normal||0),max:2,orbit:"“Unknown material detected. Designation: DORONUM.”"},
{id:"q6",chapter:2,title:"결정의 다변화",desc:"결정 변환 연구로를 건설하고 특수 도로늄 3종을 제조하세요.",reward:2600,check:s=>hasBuilding(s,"variantLab")&&VARIANTS.filter(id=>id!=="doronium_normal"&&(s.stats.produced[id]||0)>0).length>=3,progress:s=>Math.min(3,VARIANTS.filter(id=>id!=="doronium_normal"&&(s.stats.produced[id]||0)>0).length)+(hasBuilding(s,"variantLab")?1:0),max:4,orbit:"“15개의 결정 공명 계열이 확인되었습니다. 최초 공장의 기록과 일치합니다.”"},
{id:"q7",chapter:3,title:"인피니티 프로젝트",desc:"인피니티 퓨전 이론을 연구하고 퓨전 설비를 건설하세요.",reward:6000,check:s=>s.research.includes("fusion")&&hasBuilding(s,"fusion"),progress:s=>(s.research.includes("fusion")?1:0)+(hasBuilding(s,"fusion")?1:0),max:2,orbit:"“INFINITE PROJECT identified. 행성 에너지 네트워크 자료를 복구했습니다.”"},
{id:"q8",chapter:3,title:"완벽한 재료",desc:"정식 도로늄 15종을 각각 100개씩 확보하세요. 모든 재료는 품질·순도 90 이상이어야 합니다.",reward:12000,check:s=>VARIANTS.every(id=>(s.inventory[id]||0)>=100&&quality(s,id)>=90&&purity(s,id)>=90&&!synthetic(s,id)),progress:s=>VARIANTS.filter(id=>(s.inventory[id]||0)>=100&&quality(s,id)>=90&&purity(s,id)>=90&&!synthetic(s,id)).length,max:15,orbit:"“모든 입력 결정의 순도와 품질이 기준을 통과했습니다. 퓨전을 시작할 수 있습니다.”"},
{id:"q9",chapter:4,title:"인피니티 결정화",desc:"7단계 퓨전을 완료해 인피니티 도로늄을 제작하세요.",reward:25000,check:s=>(s.inventory.infinity||0)>=1||s.fusionDone,progress:s=>s.fusionDone?1:0,max:1,orbit:"“Infinity Doronum secured. 이제 행성 안정화 장치를 구축해야 합니다.”"},
{id:"q10",chapter:4,title:"행성의 심장",desc:"3개의 릴레이와 중앙 코어를 설치하고 행성 안정화 프로토콜을 실행하세요.",reward:100000,check:s=>s.victory===true,progress:s=>(s.relaySites||[]).filter(Boolean).length+(s.coreInstalled?1:0),max:4,orbit:"“Energy network synchronization complete. Planetary instability: decreasing. Factory status: OPERATIONAL.”"}
];
function hasBuilding(s,id){return s.buildings.some(b=>b.type===id)}
function isBeltType(type){return type==="belt"||type==="beltAdaptive"||type==="catalog_maglev_conveyor"}
function surfaceKey(x,y){return x+","+y}
function surfaceElevation(x,y){const v=S.flattened?.[surfaceKey(Math.floor(x+.5),Math.floor(y+.5))];return v&&Number.isFinite(v.height)?v.height:terrainHeightAt(x,y)}
function hasFoundation(x,y){const k=surfaceKey(x,y);return !!S.flattened?.[k]&&!!S.foundation?.[k]}
function notifyNewMission(q){if(!q||E2E_MODE)return;const el=$("mission-alert");if(!el)return;el.innerHTML='<div class="mission-alert-kicker">ORBIT · MISSION CONTROL</div><strong>신규 임무 등록</strong><span>'+q.title+'</span>';el.classList.remove("mission-alert-out","mission-alert-in");void el.offsetWidth;el.classList.add("mission-alert-in");setTimeout(()=>{el.classList.remove("mission-alert-in");el.classList.add("mission-alert-out")},1700);setTimeout(()=>el.classList.remove("mission-alert-out"),2450);setTimeout(()=>{const hud=$("active-mission-hud");if(hud){hud.innerHTML='<small>ACTIVE DIRECTIVE · '+String(S.questIndex+1).padStart(2,"0")+'</small><strong>'+q.title+'</strong><span>'+q.desc+'</span>';hud.classList.remove("mission-hud-visible");void hud.offsetWidth;hud.classList.add("mission-hud-visible")}},1850)}
let storySceneIndex=0;
const DORONIUM_PROLOGUE=[
 {icon:"🐅",eyebrow:"A TALE FROM THE OLD FOREST",title:"아주 먼 옛날, 호랑이가 나타나던 시절",text:"아주 먼 옛날, 호랑이들이 밤마다 마을을 찾아와 물건들을 어지럽히곤 했습니다. 사람들은 밤이 올 때마다 걱정했어요.",speaker:"옛날이야기",line:"“오늘 밤에도 호랑이들이 올까?” 마을 사람들은 서로를 걱정하며 작은 불빛 아래 모였습니다."},
 {icon:"🐕",eyebrow:"THE LITTLE COMPANION",title:"돌이는 사람들과 함께 사냥했어요",text:"사람들이 소를 가리키며 부탁하자 돌이는 힘차게 짖으며 달려갔습니다. 소는 깜짝 놀라 잠시 주저앉았고, 돌이는 사람들을 도와 소를 데려왔어요.",speaker:"사람들",line:"“자자… 돌이, 물어와!”  “멍멍! 멍머멍머!”  “잘했어!”  “왕왕!”"},
 {icon:"🌲",eyebrow:"A BARK IN THE FOREST",title:"돌이의 짖음이 숲에 울려 퍼졌어요",text:"돌이의 힘찬 짖음에 놀란 동물들은 멀찍이 물러났고, 사람들은 돌이와 함께 숲을 살펴볼 수 있었습니다.",speaker:"마을 사람들",line:"“잘했어, 돌이!”  돌이는 꼬리를 흔들며 더 깊은 숲을 향해 달려갔습니다."},
 {icon:"🌳",eyebrow:"THE UNUSUAL TREE",title:"어느 날, 이상한 나무를 발견했습니다",text:"돌이가 유난히 신나게 짖는 곳에는 처음 보는 나무가 한 그루 자라고 있었습니다. 놀랍게도 나뭇가지에는 고기가 열리고 있었어요.",speaker:"사람들",line:"“어? 저 나무에 고기가 열려 있잖아!”  돌이가 찾아낸 것은 끝없이 열매를 맺는 신비한 나무였습니다."},
 {icon:"📜",eyebrow:"THE OLD SIGN",title:"나무 옆 표지판에는 비밀이 적혀 있었어요",text:"표지판에는 이 나무의 고기에 돌이의 털을 섞으면 특별한 인챈트가 생기고, 그것을 10:1 비율로 압축하면 아주 단단한 물질을 만들 수 있다고 적혀 있었습니다.",speaker:"표지판",line:"‘돌이 고기에 돌이 털을 섞어 인챈트 고기를 만든다. 인챈트 고기 10개를 압축하면 도로늄 1개가 탄생한다.’"},
 {icon:"✨",eyebrow:"THE FIRST EXPERIMENT",title:"사람들은 표지판의 방법을 따라 했습니다",text:"사람들은 재료를 모으고 압축 장치를 만들었습니다. 온도와 압력을 조절해 조심스럽게 실험하자, 표지판에 적힌 일이 실제로 일어났습니다.",speaker:"연구 기록",line:"돌이 털 인챈트 고기 10개 → 정밀 압축 → 도로늄 1개. 믿기 어려울 만큼 단단한 물질이 만들어졌습니다."},
 {icon:"🔷",eyebrow:"THE BIRTH OF DORONIUM",title:"새로운 물질은 도로늄이라 불렸습니다",text:"사람들은 돌이가 찾아낸 고기를 ‘돌이 고기’, 그것을 압축해 만든 물질을 ‘도로늄’이라고 불렀습니다. 도로늄을 사고파는 산업이 생겼지만 생산에는 시간과 비용이 많이 들었습니다.",speaker:"산업 연대기",line:"도로늄을 만들고 판매한 사람들은 부자가 되었습니다. 하지만 거대한 생산 시설을 갖춘 사람은 아직 많지 않았습니다."},
 {icon:"🏭",eyebrow:"YOUR INDUSTRIAL JOURNEY",title:"이제 당신의 도로늄 공장을 세울 차례입니다",text:"당신도 거대한 도로늄 공장을 세우기로 결심했습니다. 숲과 광산을 탐험하고, 자원을 가공하고, 전력과 물류를 연결해 최고의 공장을 만들어 보세요.",speaker:"공장 설립 선언",line:"당신의 첫 목표는 간단합니다. 자원을 모으고, 생산 라인을 만들고, 도로늄을 만들어 부자가 되는 것. 이제 모험을 시작하세요!"}
];
function renderPrologueScene(){
 const scene=DORONIUM_PROLOGUE[storySceneIndex];if(!scene)return;
 $("story-scene-icon").textContent=scene.icon;
 $("story-scene-eyebrow").textContent=scene.eyebrow;
 $("story-scene-count").textContent="PROLOGUE · "+String(storySceneIndex+1).padStart(2,"0")+" / "+String(DORONIUM_PROLOGUE.length).padStart(2,"0");
 $("story-scene-title").textContent=scene.title;
 $("story-scene-text").textContent=scene.text;
 $("story-transmission-title").textContent=scene.speaker;
 $("story-transmission-text").textContent=scene.line;
 $("story-progress-fill").style.width=((storySceneIndex+1)/DORONIUM_PROLOGUE.length*100)+"%";
 $("story-next-button").textContent=storySceneIndex===DORONIUM_PROLOGUE.length-1?"공장 시작 →":"다음 장면 →";
}
function showStoryIntro(){
 const el=$("story-intro");if(el)el.hidden=false;
 storySceneIndex=0;renderPrologueScene();
 $("story-start-button").hidden=false;$("story-next-button").hidden=true;$("story-skip-button").hidden=true;
}
function startCampaign(){
 storySceneIndex=0;renderPrologueScene();
 $("story-start-button").hidden=true;$("story-next-button").hidden=false;$("story-skip-button").hidden=false;
 playTone(560,.16,"sine");
}
function advancePrologue(){
 storySceneIndex++;
 if(storySceneIndex>=DORONIUM_PROLOGUE.length){finishCampaignIntro();return}
 renderPrologueScene();
}
function finishCampaignIntro(){
 const el=$("story-intro");if(el)el.hidden=true;
 S.campaign??={};S.campaign.introSeen=true;S.campaign.prologueVersion=2;
 markDirty();toggleFullscreen();playTone(720,.22,"sine");
 setTimeout(()=>notifyNewMission(getQuest()),380);
 toast("돌이의 발견 기록 완료 · 도로늄 공장 여정 시작");
}
function focusActivePanelTab(){const tab=document.querySelector('.main-tab[data-panel="'+activePanel+'"]');if(tab)requestAnimationFrame(()=>tab.focus({preventScroll:true}));}
function toggleControlPanel(name=activePanel){const wasOpen=controlPanelOpen,previous=activePanel;if(name)changePanel(name);controlPanelOpen=!(wasOpen&&previous===name);$("control-column")?.classList.toggle("panel-open",controlPanelOpen);$("game-menu-toggle")?.classList.toggle("active",controlPanelOpen);if(controlPanelOpen){if(document.pointerLockElement===canvas)document.exitPointerLock();focusActivePanelTab()}else $("game-menu-toggle")?.focus({preventScroll:true});}
function closeControlPanel(){controlPanelOpen=false;$("control-column")?.classList.remove("panel-open");$("game-menu-toggle")?.classList.remove("active");$("game-menu-toggle")?.focus({preventScroll:true})}
let fullscreenRequestPending=false;
function isCoarsePointer(){return window.matchMedia?.("(pointer:coarse)").matches||("ontouchstart" in window&&navigator.maxTouchPoints>0);}
function requestDesktopImmersion(){if(E2E_MODE||isCoarsePointer()||document.fullscreenElement||fullscreenRequestPending)return;try{const request=document.documentElement.requestFullscreen?.();if(!request||typeof request.then!=="function")return;fullscreenRequestPending=true;request.catch(()=>{}).finally(()=>{fullscreenRequestPending=false;});}catch{fullscreenRequestPending=false;}}
async function toggleFullscreen(){try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.();if(isCoarsePointer()){try{await screen.orientation?.lock?.("landscape")}catch{}}else{try{await canvas.requestPointerLock?.()}catch{}}}else{if(document.pointerLockElement===canvas)document.exitPointerLock();await document.exitFullscreen?.();if(isCoarsePointer())try{screen.orientation?.unlock?.()}catch{}}}catch{toast("브라우저에서 전체 화면 전환을 허용하지 않았습니다. F 키 또는 전체 화면 버튼으로 다시 시도하세요.","warn")}}
function quality(s,id){return s.meta?.[id]?.quality??(s.inventory?.[id]>0?90:0)}
function purity(s,id){return s.meta?.[id]?.purity??(s.inventory?.[id]>0?90:0)}
function synthetic(s,id){return s.meta?.[id]?.synthetic??false}
function seedRand(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function makeWorld(){
 const rng=seedRand(827142),nodes={};
 const put=(x,y,type,amount=80)=>{const node={type,amount,max:amount,cooldown:0,seed:Math.floor(rng()*1e9)};nodes[x+","+y]=node;return node};
 for(let x=42;x<=54;x++)for(let y=44;y<=56;y++)if(rng()>.42)put(x,y,"wood",90);
 for(let x=58;x<=69;x++)for(let y=47;y<=60;y++)if(rng()>.55)put(x,y,"wood",90);
 for(let x=25;x<=36;x++)for(let y=20;y<=30;y++)if(rng()>.52)put(x,y,"wood",90);
 for(let x=78;x<=88;x++)for(let y=32;y<=44;y++)if(rng()>.45)put(x,y,"water",500);
 for(let x=15;x<=23;x++)for(let y=68;y<=77;y++)if(rng()>.55)put(x,y,"water",500);
 for(let x=94;x<=105;x++)for(let y=72;y<=83;y++)if(rng()>.72)put(x,y,"water",500);
 for(let x=36;x<=43;x++)for(let y=32;y<=42;y++)if(rng()>.7)put(x,y,"dori",999999);
 for(let x=87;x<=96;x++)for(let y=51;y<=61;y++)if(rng()>.72)put(x,y,"dori",999999);
 // Seeded natural resource patches across both continents. Only trees,
 // Dori trees and water sources spawn here; all mineral deposits stay underground.
 for(let z=6;z<WORLD_H-6;z++)for(let x=6;x<WORLD_W-6;x++){
  const key=x+","+z;if(nodes[key])continue;
  const biome=biomeAt(x,z),roll=rng();
  if(biome==="forest"&&roll>.925)put(x,z,"wood",75+Math.floor(rng()*65));
  else if(biome==="forest"&&roll<.009)put(x,z,"dori",999999);
  else if(biome==="wetland"&&roll>.982)put(x,z,"water",350+Math.floor(rng()*450));
  else if(biome==="meadow"&&roll>.9987)put(x,z,"wood",60);
 }
 // Seeded biome resources for the named gathering regions. Existing story trees and
 // the original world seed stay in place so old routes and saves remain valid.
 const scatter=(x0,x1,z0,z1,type,chance,amount)=>{
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const key=x+","+z;
   if(!nodes[key]&&rng()>1-chance)put(x,z,type,amount+Math.floor(rng()*Math.max(1,amount*.35)));
  }
 };
 scatter(47,79,43,65,"birchTree",.12,90);
 scatter(55,70,38,54,"rubberTree",.045,75);
 scatter(87,104,47,66,"barkTree",.105,100);
 scatter(3,30,4,21,"frozenTree",.12,90);
 scatter(48,76,13,35,"fireTree",.10,85);
 scatter(35,82,48,72,"grassPatch",.075,60);
 scatter(49,75,20,33,"heatCrystalNode",.022,30);
 scatter(7,29,5,17,"coldCrystalNode",.025,30);
 scatter(168,182,72,87,"oil",.05,180);
 const spawnWildDori=(cx,cz,hostile)=>{
  for(let r=0;r<=5;r++){
   let placed=false;
   for(let dz=-r;dz<=r&&!placed;dz++)for(let dx=-r;dx<=r&&!placed;dx++){
    const x=cx+dx,z=cz+dz,key=x+","+z;
    if(regionAt(x,z)!==(hostile?"doriForest":"doroniumForest")||nodes[key])continue;
    const node=put(x,z,"wildDori",1);node.hostile=!!hostile;node.roamSeed=rng();node.attackCooldown=0;placed=true;
   }
   if(placed)return;
  }
 };
 spawnWildDori(38,35,true);spawnWildDori(42,40,true);
 spawnWildDori(91,54,false);spawnWildDori(96,60,false);

 for(const entrance of MINE_ENTRANCES)nodes[entrance.x+","+entrance.y]={type:"mineEntrance",mineId:entrance.id,mineName:entrance.name,amount:1,max:1,cooldown:0,seed:0};
 const sites={relay:[{x:9,y:84},{x:118,y:12},{x:113,y:86}],core:{x:66,y:54}};
 for(const p of sites.relay)nodes[p.x+","+p.y]={type:"relaySite",amount:1,max:1,cooldown:0,seed:0};
 nodes[sites.core.x+","+sites.core.y]={type:"coreSite",amount:1,max:1,cooldown:0,seed:0};
 return {nodes,sites,mineInstances:createMineInstances(827142)};
}
function freshState(){
 const world=makeWorld();
 const state={runtime:createRuntimeState(),version:1,worldVersion:6,seed:827142,player:{x:72,y:52,viewMode:"first",yaw:0,pitch:-0.12,layer:"surface",mineLevel:1,mineId:PRIMARY_MINE_ID,surfacePosition:null},survival:{health:100,hunger:100,thirst:100},tools:{axe:true,pickaxe:true},activeTool:"pickaxe",mineInstances:world.mineInstances,flattened:{},foundation:{},campaign:{introSeen:false},factoryAutomationPaused:false,treeGrowthKeys:[],money:1100,inventory:{oldAxe:1,wood:85,stone:55,ironOre:24,copperOre:18,coal:24,water:32,quartz:2},meta:{},buildings:[],nodes:world.nodes,sites:world.sites,seen:{},research:[],activeResearch:null,researchProgress:0,questIndex:0,day:1,seconds:8*3600,tick:0,simSpeed:1,paused:false,logs:[],stats:{gathered:{},built:{},produced:{},sold:0,energyProduced:0},fusionJob:null,fusionDone:false,relaySites:[false,false,false],coreInstalled:false,victory:false,skills:createSkillState(),settings:{sound:true,reducedMotion:false},lastSavedAt:null};
 ensureItemStacks(state);return state;
}
let S=freshState(), dirty=false, sceneRevision=1, visibilityRevision=1, frameRenderAccumulator=0, worldFrameHandle=0, selectedBuild=null, selectedBuilding=null, selectedLandTool=null, activeCategory="all", activePanel="build", controlPanelOpen=false, camera={x:72,y:52,zoom:1}, hoverCell=null, canvasRect=null, dpr=1, cloudClient=null, authSession=null, cloudUpdatedAt=null, cloudBusy=false, saveTimer=null, pollTimer=null, lastFrame=0, accumulator=0, drawTime=0, soundCtx=null, crystalViewer=null;
let activeCooldownKeys=new Set(),cooldownNodeSource=null;
let buildingIndex=new Map(),buildingIndexSource=null,buildingIndexRevision=-1,buildingIndexLength=-1;
let playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:Number(S.player.yaw)||0,pitch:Number(S.player.pitch??-.12),path:[],moving:false,facing:0,onArrive:null};
const adventureKeys=new Set();
let mineHeld=false,mineCooldown=0,lookPointer=null,survivalHudClock=0,adventureTarget=null;
function clearAdventureInput(){adventureKeys.clear();mineHeld=false;}
function currentMineId(){const id=S.player?.mineId;return S.mineInstances?.[id]?id:PRIMARY_MINE_ID;}
function getMineInstance(mineId=currentMineId()){const id=S.mineInstances?.[mineId]?mineId:PRIMARY_MINE_ID;return S.mineInstances?.[id]||null;}
function getMineDeposits(mineId=currentMineId()){return getMineInstance(mineId)?.deposits||{};}
function mineName(mineId=currentMineId()){return getMineInstance(mineId)?.name||MINE_ENTRANCES.find(entry=>entry.id===mineId)?.name||"광산";}
function linkedMineId(building){return S.mineInstances?.[building?.mineId]?building.mineId:nearestMineInstanceId(building?.x,building?.y);}
const canvas=$("world-canvas"),world3d=createWorld3D(canvas,()=>S);
const toast=(message,type="")=>{const el=document.createElement("div");el.className="toast "+type;el.textContent=message;$("toast-stack").append(el);setTimeout(()=>el.remove(),2800)};
function log(message,type="info"){S.logs.unshift({message,type,time:S.seconds});S.logs=S.logs.slice(0,18);if(!E2E_MODE)renderEvents();dirty=true}
function markDirty(){dirty=true;if(!E2E_MODE)$("save-message").textContent="변경 사항 저장 대기"}
function markSceneDirty(){sceneRevision++;buildingIndexRevision=-1}
function markVisibilityDirty(){visibilityRevision++}
function rebuildCooldownIndex(){
 activeCooldownKeys.clear();
 const nodes=S.nodes||{};
 for(const key of Object.keys(nodes))if(Number(nodes[key]?.cooldown)>0)activeCooldownKeys.add(key);
 cooldownNodeSource=nodes;
}
function ensureCooldownIndex(){if(cooldownNodeSource!==S.nodes)rebuildCooldownIndex()}
function startNodeCooldown(x,y,node,seconds){
 ensureCooldownIndex();
 const key=surfaceKey(x,y),value=Math.max(0,Number(seconds)||0);
 node.cooldown=value;
 if(value>0)activeCooldownKeys.add(key);else activeCooldownKeys.delete(key);
}
function findNearbyDoriNode(x,y){
 const ownKey=surfaceKey(x,y),own=S.nodes?.[ownKey];
 if(own?.type==="dori")return {key:ownKey,x,y,node:own};
 let best=null,bestCooldown=Infinity;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  if(dx*dx+dy*dy>4)continue;
  const nx=x+dx,ny=y+dy;
  if(nx<0||ny<0||nx>=WORLD_W||ny>=WORLD_H)continue;
  const key=surfaceKey(nx,ny),node=S.nodes?.[key];
  if(node?.type!=="dori")continue;
  const cooldown=Math.max(0,Number(node.cooldown)||0);
  if(cooldown<bestCooldown){best={key,x:nx,y:ny,node};bestCooldown=cooldown;}
 }
 return best;
}
function ensureBuildingIndex(){
 const buildings=S.buildings||[];
 if(buildingIndexSource===buildings&&buildingIndexRevision===sceneRevision&&buildingIndexLength===buildings.length)return;
 buildingIndex.clear();
 for(const b of buildings)buildingIndex.set(surfaceKey(b.x,b.y),b);
 buildingIndexSource=buildings;buildingIndexRevision=sceneRevision;buildingIndexLength=buildings.length;
}
function playTone(freq=520,duration=.08,kind="sine"){if(!S.settings.sound)return;try{soundCtx??=new AudioContext();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=kind;osc.frequency.value=freq;gain.gain.setValueAtTime(.035,soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration)}catch{}}
function setCloud(state,label){const el=$("cloud-state");el.className="cloud-state "+state;el.querySelector("span").textContent=label}
function itemCount(id){return Math.max(0,Number(S.inventory[id]||0))}
function addItem(id,qty,meta={},record=true){if(!RESOURCE[id]||qty<=0)return;ensureItemStacks(S);addItemStack(S,id,qty,meta);syncLegacyInventory(S);if(record)S.stats.produced[id]=(S.stats.produced[id]||0)+qty;markDirty()}
function takeItemDetailed(id,qty,ownerID="direct-consume"){
 if(availableItemCount(S,id)<qty)return null;
 const reservation=reserveItemStacks(S,id,qty,ownerID);if(!reservation)return null;
 const removed=commitItemReservations(S,[reservation]);
 if(!removed){releaseItemReservation(S,reservation);return null}
 const quantity=removed.reduce((sum,stack)=>sum+stack.quantity,0);
 if(quantity!==qty)return null;
 const quality=removed.reduce((sum,stack)=>sum+stack.quality*stack.quantity,0)/quantity;
 const purity=removed.reduce((sum,stack)=>sum+stack.purity*stack.quantity,0)/quantity;
 const synthetic=removed.some(stack=>stack.synthetic);
 syncLegacyInventory(S);markDirty();
 return {quantity,quality,purity,synthetic};
}
function takeItem(id,qty){return !!takeItemDetailed(id,qty)}
function hasItems(items){return Object.entries(items||{}).every(([id,n])=>availableItemCount(S,id)>=n)}
function takeItems(items){const requirements=Object.fromEntries(Object.entries(items||{}).filter(([,quantity])=>Number(quantity)>0));if(!Object.keys(requirements).length)return true;if(!hasItems(requirements))return false;const reservations=reserveItemBatch(S,requirements,"multi-item-transaction");if(!reservations)return false;const removed=commitItemReservations(S,reservations);if(!removed){for(const id of reservations)releaseItemReservation(S,id);return false}syncLegacyInventory(S);markDirty();return true}
function buildingMoneyCost(b){const discounted=["storage","warehouse"].includes(b.id)&&S.skills?.unlockedSkillIDs?.includes("BUFFER_ENGINEER");return discounted?Math.max(0,Math.floor(b.cost*.95)):b.cost}
function canAfford(b){const hasMachineItem=!!b.catalogItemId&&availableItemCount(S,b.catalogItemId)>=1;const hasBuildMaterials=Object.keys(b.materials||{}).length>0&&hasItems(b.materials);return S.money>=buildingMoneyCost(b)&&(b.catalogItemId?hasMachineItem||hasBuildMaterials:hasItems(b.materials))}
function unlockOk(b){return !b.unlock||S.research.includes(b.unlock)}
function buildingDef(id){return BUILDINGS.find(b=>b.id===id)}
function buildingAt(x,y){ensureBuildingIndex();return buildingIndex.get(surfaceKey(x,y))||null}
function tileNode(x,y){return S.nodes[x+","+y]||null}
function currentPower(){
 const daylight=(S.seconds%86400)/86400,sun=daylight>.25&&daylight<.78?1:.22,weather=weatherNow();
 let gen=0,totalUsed=0;const sources=[],transformers=[],loads=[];
 for(const b of S.buildings){
  const d=buildingDef(b.type);if(!d)continue;
  const generation=d.generation||({solar:"solar",wind:"wind",coalgen:"coal"}[b.type]);
  if(generation==="solar"){const amount=(d.gen||8)*sun*(weather==="Storm"?.45:weather==="Rain"?.72:1);gen+=amount;sources.push(b)}
  else if(generation==="wind"){const amount=(d.gen||8)*(weather==="Storm"?1.4:weather==="Clear"?.9:1.05);gen+=amount;sources.push(b)}
  else if(generation==="coal"||generation==="doronium"){const amount=b.fuelTimer>0?(d.gen||0):0;gen+=amount;if(amount>0)sources.push(b)}
  else{
   const load=b.type==="fusion"?(S.fusionJob?FUSION_STAGES[S.fusionJob.stage]?.power||40:4):Math.max(0,Number(d.power)||0);
   if(load>0){totalUsed+=load;loads.push({building:b,load})}
  }
  if(b.type==="catalog_transformer")transformers.push(b);
 }
 const distance=(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0));
 const connectedTransformers=new Set(),networkRange=14,sourceRange=9;
 let expanded=true;
 while(expanded){
  expanded=false;
  for(const transformer of transformers){
   if(connectedTransformers.has(transformer))continue;
   const connectedToSource=sources.some(source=>distance(source,transformer)<=networkRange);
   const connectedToTransformer=[...connectedTransformers].some(other=>distance(other,transformer)<=networkRange);
   if(connectedToSource||connectedToTransformer){connectedTransformers.add(transformer);expanded=true}
  }
 }
 const networkActive=transformers.length>0;
 const isConnected=building=>{
  if(!networkActive)return true;
  if(sources.some(source=>distance(source,building)<=sourceRange))return true;
  return [...connectedTransformers].some(transformer=>distance(transformer,building)<=networkRange);
 };
 let connectedUsed=0,unconnectedUsed=0,connectedCount=0;
 const localRatios={};
 for(const {building,load} of loads){
  if(isConnected(building)){connectedUsed+=load;connectedCount++;localRatios[building.uid]=1}
  else{unconnectedUsed+=load;localRatios[building.uid]=0}
 }
 const ratio=connectedUsed===0?1:Math.min(1,gen/connectedUsed);
 for(const entry of loads)if(localRatios[entry.building.uid]>0)localRatios[entry.building.uid]=ratio;
 return {gen,used:connectedUsed,totalUsed,unconnectedUsed,ratio,raw:gen-totalUsed,localRatios,network:{active:networkActive,transformers:transformers.length,connectedTransformers:connectedTransformers.size,connectedConsumers:connectedCount,disconnectedConsumers:loads.length-connectedCount,range:networkRange}};
}
function powerRatioForBuilding(building,power){
 const snapshot=power||currentPower();
 return building&&snapshot.localRatios&&Object.prototype.hasOwnProperty.call(snapshot.localRatios,building.uid)?snapshot.localRatios[building.uid]:snapshot.ratio;
}
function weatherNow(){const day=Math.floor(S.seconds/86400);return ["Clear","Clear","Rain","Clear","Storm","Clear","Snow"][day%7]}
function revealAround(){if(S.player.layer==="mine")return;let changed=false;const radius=11*calculateSkillBonuses(S.skills).scannerRangeMultiplier,limit=radius*radius;for(let y=-Math.ceil(radius);y<=Math.ceil(radius);y++)for(let x=-Math.ceil(radius);x<=Math.ceil(radius);x++){if(x*x+y*y>limit)continue;const xx=S.player.x+x,yy=S.player.y+y;if(xx>=0&&yy>=0&&xx<WORLD_W&&yy<WORLD_H){const key=xx+","+yy;if(!S.seen[key]){S.seen[key]=true;changed=true}}}if(biomeAt(S.player.x,S.player.y)==="crystal")claimSkillPoint("EXPLORATION_CRYSTAL_CAVERN");if(changed)markVisibilityDirty()}
function getQuest(){return S.questIndex>=QUESTS.length?null:QUESTS[S.questIndex]}
function questCheck(){const q=getQuest();if(!q||S.victory)return;const ok=q.check(S);if(ok){S.money+=q.reward;S.questIndex=Math.min(QUESTS.length,S.questIndex+1);const oldChapter=Math.max(0,Number(S.chapter)||0);S.chapter=Math.max(oldChapter,q.chapter);for(let chapter=oldChapter+1;chapter<=Math.min(4,S.chapter);chapter++)claimSkillPoint("STORY_CHAPTER_"+chapter);log("임무 완료: "+q.title,"good");toast("임무 완료 · "+q.title+"  +"+fmt(q.reward)+" D");$("orbit-dialogue").textContent=q.orbit;playTone(720,.18,"triangle");markDirty();$("active-mission-hud")?.classList.remove("mission-hud-visible");renderMissions();renderHud();renderQuickObjectives();setTimeout(()=>notifyNewMission(getQuest()),650)}}
function changePanel(name){activePanel=name;document.querySelectorAll(".main-tab").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));document.querySelectorAll(".panel-view").forEach(p=>p.classList.toggle("active",p.id==="panel-"+name));if(name==="inventory")renderInventory();if(name==="catalog")renderCatalog();if(name==="research")renderResearch();if(name==="mission")renderMissions();if(name==="factory")renderFactory()}
function renderHud(){const p=currentPower();$("hud-money").textContent=short(S.money)+" D";$("hud-doronium").textContent=short(VARIANTS.reduce((a,id)=>a+itemCount(id),0));$("hud-power").textContent=(p.used?Math.round(p.ratio*100):Math.round(p.gen))+"%";$("hud-tier").textContent="TIER "+Math.min(7,Math.floor(S.research.length/2));$("build-count").textContent=S.buildings.length+" / "+BUILDING_LIMIT;$("active-machines").textContent="가동 기계 "+S.buildings.filter(b=>b.status==="RUNNING").length;$("world-population").textContent="엔지니어 1";$("system-state").textContent=p.used>p.gen?"전력 부족":S.victory?"행성 안정화 완료":"시스템 정상";$("sim-speed").textContent="시뮬레이션 "+S.simSpeed+"×";$("pause-sim").textContent=S.paused?"▶ 재개":"Ⅱ 일시정지";$("speed-sim").textContent="속도 "+S.simSpeed+"×";const day=Math.floor(S.seconds/86400)+1,sec=S.seconds%86400,h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);$("world-clock-text").textContent="DAY "+String(day).padStart(2,"0")+" · "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");$("day-icon").textContent=h>=6&&h<18?"☀":"☾";$("weather-label").textContent=({Clear:"맑음",Rain:"비",Storm:"폭풍",Snow:"눈",Heat:"폭염"})[weatherNow()]||"맑음";$("world-coordinate").textContent="SECTOR "+String(Math.floor(S.player.x/16)+1).padStart(2,"0")+" / X: "+(S.player.x*32-2048)+"m · Z: "+(S.player.y*32-1536)+"m";const biome=regionAt(S.player.x,S.player.y);const biomeName=({doriForest:"돌이의 숲",denseForest:"울창한 숲",doroniumForest:"도로늄 숲",lava:"용암 지대",cold:"냉각 지대",oilField:"석유 지대",forest:"고대 숲",meadow:"초원",wetland:"습지",desert:"붉은 사막",highlands:"고산 지대",frost:"빙설 산맥",crystal:"수정 협곡",volcanic:"화산 지대"})[biome]||"탐사 구역";$("region-title").innerHTML=biomeName+' <span>SECTOR '+String(Math.floor(S.player.x/16)+1).padStart(2,"0")+"-"+String(Math.floor(S.player.y/16)+1).padStart(2,"0")+"</span>";
 const v=S.survival||{health:100,hunger:100,thirst:100};
 for(const [key,value] of [["health",v.health],["hunger",v.hunger],["thirst",v.thirst]]){
  const fill=$(key+"-fill"),label=$(key+"-value");if(fill)fill.style.width=clamp(value,0,100)+"%";if(label)label.textContent=Math.ceil(value);
 }
 document.querySelectorAll("[data-view-mode]").forEach(b=>b.classList.toggle("active",b.dataset.viewMode===S.player.viewMode));document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===S.activeTool));if($("equipped-tool-label"))$("equipped-tool-label").textContent=S.activeTool==="axe"?"도끼 장착":"곡괭이 장착";
}
function renderBuildList(){const list=BUILDINGS.filter(b=>!["minerIron","minerCopper","minerCoal"].includes(b.id)&&(activeCategory==="all"||b.cat===activeCategory));$("build-list").innerHTML=list.map(b=>{const locked=!unlockOk(b),afford=canAfford(b);const material=b.catalogItemId?(RESOURCE[b.catalogItemId]?.icon||"⚙️")+" "+(itemCount(b.catalogItemId)>0?"보유 "+fmt(itemCount(b.catalogItemId)):"설비 아이템 제작 필요"):Object.entries(b.materials||{}).map(([id,n])=>(RESOURCE[id]?.icon||"◆")+fmt(n)).join(" ");return '<button class="build-card '+(selectedBuild===b.id?"selected ":"")+(locked?"locked":"")+'" data-build="'+b.id+'"><div class="build-top"><span class="build-icon">'+b.icon+'</span><div style="min-width:0"><div class="build-name">'+b.name+'</div><div class="build-kind">'+({resource:"자원 생산",power:"전력 시설",process:"가공 설비",logistics:"물류 시설",advanced:"첨단 산업"})[b.cat]+'</div></div></div><div class="build-cost"><b>'+fmt(buildingMoneyCost(b))+' D</b><em>'+material+'</em></div>'+(locked?'<span class="build-lock-label">🔒 연구 필요</span>':"")+'</button>'}).join("");renderBuildInspector()}
function renderBuildInspector(){
 const b=buildingDef(selectedBuild),el=$("build-inspector");
 $("build-mode-dot").classList.toggle("build",!!b);
 $("build-mode-text").textContent=b?"건설 모드 · "+b.name+" / 설치할 타일을 클릭":"선택 모드 · 시설을 선택하거나 자원을 채집하세요";
 if(!b){el.innerHTML='<div class="inspector-empty"><span>⌖</span><strong>건설 설비를 선택하세요</strong><p>시설을 선택하면 비용과 기능을 확인할 수 있습니다.</p></div>';return}
 const materialCost=Object.entries(b.materials||{}).map(([id,n])=>'<span>'+(RESOURCE[id]?.icon||"◆")+" "+fmt(n)+" "+(RESOURCE[id]?.name||id)+"</span>").join("");
 const itemCost=b.catalogItemId?'<span>'+(RESOURCE[b.catalogItemId]?.icon||"⚙️")+' '+(RESOURCE[b.catalogItemId]?.name||b.catalogItemId)+' × 1</span>':"";
 const cost='<span>'+fmt(buildingMoneyCost(b))+' D</span>'+itemCost+materialCost;
 el.innerHTML='<div class="inspector-title"><span class="build-icon">'+b.icon+'</span><div><strong>'+b.name+'</strong><small>'+b.desc+'</small></div></div><p class="inspector-desc">'+b.desc+'</p><div class="cost-line">'+cost+'</div><div class="inspector-actions"><button class="action-button" id="place-mode" '+(!canAfford(b)||!unlockOk(b)?"disabled":"")+'>설치할 위치 선택</button><button class="action-button secondary" id="cancel-build">취소</button></div>';
 $("place-mode").onclick=()=>{if(!canAfford(b)||!unlockOk(b)){toast("연구 또는 자원이 부족합니다.","warn");return}selectedBuild=b.id;renderBuildList();toast("월드에서 설치할 위치를 클릭하세요.")};
 $("cancel-build").onclick=()=>{selectedBuild=null;renderBuildList();drawWorld()};
}
function renderInventory(){const items=Object.entries(S.inventory).filter(([id,n])=>n>0&&RESOURCE[id]).sort((a,b)=>(RESOURCE[a[0]]?.kind||"").localeCompare(RESOURCE[b[0]]?.kind||""));const kinds=items.length;$("inventory-slots").textContent=kinds+" 종류";$("inventory-summary").innerHTML='<div><small>아이템 종류</small><strong>'+kinds+'</strong></div><div><small>총 보유 수량</small><strong>'+short(items.reduce((a,[,n])=>a+n,0))+'</strong></div><div><small>특수 결정</small><strong>'+short(VARIANTS.reduce((a,id)=>a+itemCount(id),0))+'</strong></div>';$("inventory-grid").innerHTML=items.map(([id,n])=>'<div class="inventory-item"><span class="res-icon">'+RESOURCE[id].icon+'</span><div><strong>'+RESOURCE[id].name+'</strong><small>Q '+Math.round(quality(S,id))+' · P '+Math.round(purity(S,id))+(synthetic(S,id)?" · 합성":" · 비합성")+' · 사용 가능 '+fmt(availableItemCount(S,id))+' · 예약 '+fmt(Math.max(0,n-availableItemCount(S,id)))+'</small></div>'+(['treeNutrition','treeGrowthAccelerator','treePermanentGrowthCatalyst'].includes(id)?'<button class="inventory-use-button" type="button" data-use-tree-item="'+id+'">사용</button>':"")+'<b>'+fmt(n)+'</b></div>').join("")||'<div class="inspector-empty">창고가 비어 있습니다.</div>';$("crystal-codex").innerHTML=VARIANTS.map(id=>'<button class="crystal-codex-card" data-crystal="'+id+'"><span>'+RESOURCE[id].icon+'</span><strong>'+RESOURCE[id].name+'</strong><small>'+(itemCount(id)>0?"보유 "+fmt(itemCount(id)):"도감 미발견")+'</small></button>').join("")+'<button class="crystal-codex-card infinity-card" data-crystal="infinity"><span>💠</span><strong>인피니티 도로늄</strong><small>'+(itemCount("infinity")>0?"보유 "+fmt(itemCount("infinity")):"최종 결정")+'</small></button>';const sel=$("sell-resource");const old=sel.value;sel.innerHTML=items.filter(([id])=>id!=="infinity").map(([id,n])=>'<option value="'+id+'">'+RESOURCE[id].icon+" "+RESOURCE[id].name+" ("+fmt(n)+")</option>").join("");if(items.some(([id])=>id===old))sel.value=old;updateMarketEstimate()}

function updateMarketEstimate(){const id=$("sell-resource").value,n=Math.max(0,Math.floor(Number($("sell-amount").value)||0));$("market-estimate").textContent="판매 예상액 "+fmt(n*(RESOURCE[id]?.price||0))+" D"}

function renderFactory(){
 const p=currentPower(),built=S.buildings.length;
 const lines=[["⚡","전력 생산",fmt(p.gen)+" kW"],["ϟ","전력 소비",fmt(p.used)+" kW"],["🏭","설비 수",built+" 개"],["💎","도로늄 생산",fmt(S.stats.produced.doronium_normal||0)+" 개"]];
 $("operation-cards").innerHTML=lines.map(x=>'<div class="operation-card"><small>'+x[0]+" "+x[1]+'</small><strong>'+x[2]+'</strong><em>실시간 운영 지표</em></div>').join("");
 renderMachineDetails();renderEvents();
}
function renderMachineDetails(){
 const el=$("machine-details"),b=S.buildings.find(x=>x.uid===selectedBuilding);
 if(!b){el.innerHTML='<div class="inspector-empty"><span>⌖</span><strong>월드에서 기계를 선택하세요</strong><p>기계를 선택하면 레시피, 온도·압력 조건, 입출력 버퍼와 상태를 확인할 수 있습니다.</p></div>';return}
 const d=buildingDef(b.type),recipe=recipeFor(b);
 const input=Object.entries(b.input||{}).map(([id,n])=>(RESOURCE[id]?.icon||"◆")+" "+fmt(n)+" "+(RESOURCE[id]?.name||id)).join(" · ")||"없음";
 const output=b.output?(RESOURCE[b.output.id]?.icon||"◆")+" "+fmt(b.output.qty)+" "+(RESOURCE[b.output.id]?.name||b.output.id):"없음";
 const status=({RUNNING:"가동 중",BROWNOUT_RUNNING:"저전력 가동",PAUSED_POWER:"전력 부족",PAUSED_OUTPUT:"출력 대기",PAUSED_CONTROL:"통제 컴퓨터 일시정지",WAITING_INPUT:"원료 부족",NO_INPUT:"원료 부족",BROKEN:"고장",COOLING:"온도·압력 조정 중",ERROR:"공정 오류",DEPLETED:"매장량 고갈",GROWING:"자원 성장 중",CONFIG_REQUIRED:"복제 대상을 선택하세요",INVALID_COPY_TARGET:"복제 불가 품목",QUALITY_PASS:"품질 검사 통과",QUALITY_REJECTED:"품질 검사 반려",SHIPPED:"출하 완료",SORTING:"분류 중",DISTRIBUTING:"분배 중",MERGING:"합류 중",ELEVATING:"이송 중",INSERTING:"자동 삽입 중"})[b.status]||"대기";
 const compatible=d?.catalogStation?Object.values(CATALOG_RECIPES).filter(r=>recipeSupportsStation(r,d.catalogStation)):[];
 const recipeSelect=compatible.length?'<div class="catalog-machine-recipe"><label for="machine-recipe-select">설비 레시피 선택</label><select id="machine-recipe-select">'+compatible.map(r=>'<option value="'+r.id+'" '+((b.recipeId||d.defaultRecipe||"")===r.id?"selected":"")+'>'+r.name+'</option>').join("")+'</select><small>'+compatible.length+'개 공정 지원 · 생산 중이거나 출력이 남아 있으면 변경할 수 없습니다.</small></div>':"";
 const isCopier=b.type==="catalog_resource_copier"||b.type==="catalog_item_copier";
 const copyable=Object.entries(RESOURCE).filter(([id,item])=>b.type!=="catalog_resource_copier"||["raw","material","rare","special","doronium","final"].includes(item.kind));
 const copyControl=isCopier?'<div class="catalog-machine-recipe"><label for="machine-copy-item-select">복제할 '+(b.type==="catalog_resource_copier"?"자원":"아이템")+' 선택</label><select id="machine-copy-item-select"><option value="">복제 대상 선택</option>'+copyable.map(([id,item])=>'<option value="'+id+'" '+(b.copyItemId===id?"selected":"")+'>'+item.name+'</option>').join("")+'</select><small>선택한 원본을 창고에 1개 이상 보유해야 합니다. 복제품은 합성 아이템으로 표시되어 비합성 도로늄 제조에는 사용할 수 없습니다.</small><b>누적 복제 '+fmt(b.copyCount||0)+'개 · 기준 원본 보유 '+(b.copyItemId?fmt(availableItemCount(S,b.copyItemId)):"—")+'</b></div>':"";
 const filterControl=b.type==="catalog_sorter"?'<div class="catalog-machine-recipe"><label for="machine-filter-select">분류 기준</label><select id="machine-filter-select"><option value="">전체 아이템은 정면으로</option>'+Object.entries(RESOURCE).map(([id,item])=>'<option value="'+id+'" '+(b.filterItemId===id?"selected":"")+'>'+item.name+'</option>').join("")+'</select><small>선택한 아이템은 정면, 나머지는 오른쪽 출구로 보냅니다.</small></div>':"";
 const logisticsInfo=b.type==="catalog_shipping_center"?'<div class="machine-buffer"><span>누적 출하</span><b>'+fmt(b.shipped||0)+'개 · 최근 '+(RESOURCE[b.lastShipment]?.name||"없음")+'</b></div>':b.type==="catalog_quality_checker"||b.type==="catalog_auto_quality_checker"?'<div class="machine-buffer"><span>검사 결과</span><b>통과 '+fmt(b.passed||0)+'개 · 반려 '+fmt(b.rejected||0)+'개</b></div>':"";
 const automationControl=b.type==="catalog_control_computer"?'<div class="machine-buffer"><span>공장 전체 자동화</span><b>'+(S.factoryAutomationPaused?"일시 정지 중":"가동 중")+'</b></div><button class="action-button '+(S.factoryAutomationPaused?"gold-button":"secondary")+'" id="machine-automation">'+(S.factoryAutomationPaused?"전체 생산 재개":"전체 생산 일시정지")+'</button>':"";
 const climateMarkup=["catalog_air_conditioner","catalog_fan","catalog_heater"].includes(b.type)?'<div class="machine-buffer"><span>환경 보호 범위</span><b>반경 7타일 · 전력 80% 이상에서 작동</b></div>':"";
 const isElevator=["catalog_item_elevator","catalog_water_elevator","catalog_maglev_elevator"].includes(b.type);
 const isMineLinked=["catalog_auto_miner","catalog_item_elevator","catalog_water_elevator","catalog_maglev_elevator"].includes(b.type);
 const liftMineId=linkedMineId(b),liftMineName=mineName(liftMineId);
 const liftLevel=clamp(Number(b.liftLevel)||1,1,MINE_LEVELS),liftBuffer=elevatorBufferSummary(liftLevel,liftMineId);
 const mineLinkControl=isMineLinked?'<div class="catalog-machine-recipe"><label for="machine-mine-id">연결된 독립 광산</label><select id="machine-mine-id">'+MINE_ENTRANCES.map(entry=>'<option value="'+entry.id+'" '+(liftMineId===entry.id?"selected":"")+'>'+entry.name+'</option>').join("")+'</select><small>광맥·층별 플레이어 위치·엘리베이터 버퍼가 이 광산에만 저장됩니다.</small></div>':"";
 const liftItems=Object.entries(RESOURCE).filter(([id])=>b.type!=="catalog_water_elevator"||["water","waterBottle","waterBucket","lavaBucket","crudeOil","oil"].includes(id));
 const liftControl=isElevator?'<div class="catalog-machine-recipe"><label for="machine-lift-level">연결할 광산 층 · '+liftMineName+'</label><select id="machine-lift-level">'+Array.from({length:MINE_LEVELS},(_,i)=>i+1).map(level=>'<option value="'+level+'" '+(liftLevel===level?"selected":"")+'>'+level+'층</option>').join("")+'</select><label for="machine-lift-direction">이송 방향</label><select id="machine-lift-direction"><option value="down" '+((b.liftDirection||"down")==="down"?"selected":"")+' >지상 창고 → 광산</option><option value="up" '+(b.liftDirection==="up"?"selected":"")+' >광산 → 지상 창고</option></select><label for="machine-lift-item">이송 아이템</label><select id="machine-lift-item">'+liftItems.map(([id,item])=>'<option value="'+id+'">'+item.name+' · 보유 '+fmt(availableItemCount(S,id))+'</option>').join("")+'</select><label for="machine-lift-quantity">이송 수량</label><input id="machine-lift-quantity" type="number" min="1" max="99999" value="1"><div class="machine-buffer"><span>'+liftLevel+'층 버퍼</span><b>'+fmt(liftBuffer.reduce((sum,x)=>sum+x.quantity,0))+'개 · '+liftBuffer.slice(0,4).map(x=>(RESOURCE[x.id]?.name||x.id)+" "+fmt(x.quantity)).join(" · ")+'</b></div><div class="lift-actions"><button class="action-button secondary" id="machine-lift-load">광산으로 적재</button><button class="action-button" id="machine-lift-unload">창고로 회수</button></div><small>벨트가 이 설비에 도달하면 설정한 방향과 층으로 자동 이송합니다. 물 엘리베이터는 액체 아이템만 처리합니다.</small></div>':"";
 const processWindow=recipe?.safeTemperatureMin!==undefined?"허용 범위 "+recipe.safeTemperatureMin+"–"+recipe.safeTemperatureMax+"°C · "+recipe.safePressureMin+"–"+recipe.safePressureMax+" MPa":"";
 const recipeDetail=recipe?'<div class="machine-buffer"><span>현재 레시피</span><b>'+recipe.name+'</b></div><div class="machine-buffer"><span>필요 원료</span><b>'+Object.entries(recipe.inputs||{}).map(([id,n])=>(RESOURCE[id]?.name||id)+" × "+n).join(" · ")+'</b></div><div class="machine-buffer"><span>생산 결과</span><b>'+(RESOURCE[recipe.output]?.name||recipe.output)+" × "+(recipe.qty||1)+'</b></div><div class="machine-buffer"><span>공정 목표</span><b>'+(recipe.temp===null||recipe.temp===undefined?"수동 혼합":Math.round(recipe.temp)+"°C · "+(recipe.pressure??0)+" MPa")+' · '+recipe.time+'초</b></div>'+(processWindow?'<div class="machine-buffer"><span>허용 공정 범위</span><b>'+processWindow+'</b></div>':"")+'<div class="machine-buffer"><span>자동 제어</span><b>기계가 목표 온도·압력으로 자동 조정</b></div>':"";
 const fusionInfo=b.type==="fusion"&&S.fusionJob?'<div class="machine-buffer"><span>퓨전 진행</span><b>'+(Math.min(7,S.fusionJob.stage+1))+'/7 단계 · '+(S.fusionJob.inputCustody==="reserved"?"원료 1,500개 예약":"기존 저장 공정")+'</b></div>':"";
 el.innerHTML='<div class="inspector-title"><span class="build-icon">'+(d?.icon||"⚙️")+'</span><div><strong>'+(d?.name||b.type)+'</strong><small>'+status+' · 방향 '+DIRS[b.dir||1].name+' · 내구도 '+Math.round(b.condition||100)+'%</small></div></div><div class="machine-kpi"><div><small>생산 공정</small><b>'+(recipe?.name||({miner:"자원 채굴",pump:"물 공급",doriFarm:"돌이 고기 수확",power:"전력 공급",fusion:"인피니티 퓨전"})[d?.kind]||"산업 설비")+'</b></div><div><small>공정 진행률</small><b>'+Math.round((b.progress||0)/(recipe?.time||10)*100)+'%</b></div></div>'+recipeSelect+copyControl+filterControl+logisticsInfo+automationControl+climateMarkup+mineLinkControl+liftControl+recipeDetail+'<div class="machine-buffer"><span>투입 버퍼</span><b>'+input+'</b></div><div class="machine-buffer"><span>출력 버퍼</span><b>'+output+'</b></div>'+fusionInfo+(d?.kind==="variant"||b.type==="variantLab"?'<div class="machine-buffer"><span>결정 레시피</span><b>'+(RESOURCE[b.variant||"doronium_blue"]?.name||b.variant)+'</b></div>':"")+'<div class="machine-controls"><button class="action-button" id="machine-collect" '+(!b.output?"disabled":"")+'>출력 회수</button><button class="action-button secondary" id="machine-supply">창고에서 투입</button><button class="action-button secondary" id="machine-rotate">방향 회전</button><button class="action-button danger" id="machine-remove">해체</button>'+(b.type==="variantLab"?'<button class="action-button secondary" id="machine-recipe">결정 레시피 변경</button>':"")+(b.type==="fusion"&&!S.fusionJob?'<button class="action-button gold-button" id="machine-fusion">퓨전 시작</button>':"")+(b.type==="fusion"&&S.fusionJob?.inputCustody==="reserved"?'<button class="action-button secondary" id="machine-fusion-cancel">퓨전 중단 · 원료 반환</button>':"")+(b.type==="core"?'<button class="action-button gold-button" id="machine-core">인피니티 설치</button>':"")+'</div>';
 $("machine-collect").onclick=()=>collectOutput(b);
 $("machine-supply").onclick=()=>supplyMachine(b);
 $("machine-rotate").onclick=()=>{b.dir=((b.dir||1)+1)%4;markDirty();renderMachineDetails();drawWorld()};
 $("machine-remove").onclick=()=>removeBuilding(b);
 if($("machine-recipe"))$("machine-recipe").onclick=()=>chooseVariant(b);
 if($("machine-fusion"))$("machine-fusion").onclick=startFusion;
 if($("machine-fusion-cancel"))$("machine-fusion-cancel").onclick=()=>abortFusionJob("사용자가 퓨전을 중단했습니다.");
 if($("machine-core"))$("machine-core").onclick=()=>installCore(b);
 if($("machine-automation"))$("machine-automation").onclick=()=>{
  if(powerRatioForBuilding(b,currentPower())<.8){toast("통제 컴퓨터가 전력망에 연결되지 않았거나 전력이 부족합니다. 발전기 또는 변압기 연결을 확인하세요.","warn");return}
  S.factoryAutomationPaused=!S.factoryAutomationPaused;
  log(S.factoryAutomationPaused?"통제 컴퓨터 · 전체 생산 설비 일시 정지":"통제 컴퓨터 · 전체 생산 설비 재개");
  markDirty();renderMachineDetails();renderFactory();toast(S.factoryAutomationPaused?"전체 생산을 일시 정지했습니다.":"전체 생산을 재개했습니다.");
 };
 const mineIdControl=$("machine-mine-id");
 if(mineIdControl)mineIdControl.onchange=()=>{if(S.mineInstances?.[mineIdControl.value]){b.mineId=mineIdControl.value;markDirty();renderMachineDetails();toast("연결 광산 변경 · "+mineName(b.mineId))}};
 const liftLevelControl=$("machine-lift-level");
 if(liftLevelControl)liftLevelControl.onchange=()=>{b.liftLevel=clamp(Number(liftLevelControl.value)||1,1,MINE_LEVELS);markDirty();renderMachineDetails()};
 const liftDirectionControl=$("machine-lift-direction");
 if(liftDirectionControl)liftDirectionControl.onchange=()=>{b.liftDirection=liftDirectionControl.value==="up"?"up":"down";markDirty();renderMachineDetails()};
 if($("machine-lift-load"))$("machine-lift-load").onclick=()=>transferElevatorBuffer(b,"load");
 if($("machine-lift-unload"))$("machine-lift-unload").onclick=()=>transferElevatorBuffer(b,"unload");
 const copySelect=$("machine-copy-item-select");
 if(copySelect)copySelect.onchange=()=>{b.copyItemId=copySelect.value||null;b.progress=0;b.status="IDLE";markDirty();renderMachineDetails();toast("복제 대상 설정 완료")};
 const filterSelect=$("machine-filter-select");
 if(filterSelect)filterSelect.onchange=()=>{b.filterItemId=filterSelect.value||null;markDirty();renderMachineDetails();toast("아이템 분류 기준 설정 완료")};
 const recipeControl=$("machine-recipe-select");
 if(recipeControl)recipeControl.onchange=()=>{
  const next=CATALOG_RECIPES[recipeControl.value];
  if(!recipeSupportsStation(next,d.catalogStation))return;
  if(b.activeMeta||b.output){toast("진행 중인 공정을 마치고 출력물을 회수한 뒤 변경하세요.","warn");recipeControl.value=b.recipeId||d.defaultRecipe||"";return}
  b.recipeId=next.id;b.progress=0;b.status="IDLE";b.errorCode=null;markDirty();renderMachineDetails();renderCatalog();toast("레시피 변경 · "+next.name);
 };
}
function chooseCatalogRecipe(id){
 const recipe=CATALOG_RECIPES[id];if(!recipe)return;
 const candidates=S.buildings.filter(b=>recipeSupportsStation(recipe,buildingDef(b.type)?.catalogStation));
 if(!candidates.length){toast("먼저 이 공정을 지원하는 기계를 설치하세요.","warn");return}
 const machine=candidates.find(b=>!b.activeMeta&&!b.output)||candidates[0];
 if(machine.activeMeta||machine.output){toast("선택한 공정 기계가 가동 중이거나 출력 대기 중입니다.","warn");return}
 machine.recipeId=recipe.id;machine.progress=0;machine.status="IDLE";machine.errorCode=null;selectedBuilding=machine.uid;
 changePanel("factory");renderMachineDetails();markDirty();toast("공정 지정 완료 · "+recipe.name);
}
function renderCatalog(){
 const grid=$("catalog-grid");if(!grid)return;
 const query=String($("catalog-search")?.value||"").trim().toLowerCase();
 const mode=$("catalog-mode")?.value||"items",category=$("catalog-category")?.value||"all";
 let cards=[],count=0;
 if(mode==="items"){
  const rows=Object.entries(RESOURCE).filter(([id,item])=>{
   const text=(id+" "+item.name+" "+(item.kind||"")).toLowerCase();
   return (!query||text.includes(query))&&(category==="all"||item.kind===category);
  });
  count=rows.length;
  cards=rows.map(([id,item])=>'<article class="catalog-card"><span class="catalog-item-icon">'+(item.icon||"◆")+'</span><div class="catalog-card-copy"><strong>'+item.name+'</strong><small>'+id+' · '+(item.kind||"기타")+'</small><small>기준 가치 '+fmt(item.price||0)+' D</small></div><b class="catalog-owned">보유 '+fmt(itemCount(id))+'</b></article>');
 }else if(mode==="recipes"){
  const rows=Object.entries(CATALOG_RECIPES).filter(([id,r])=>{
   const text=(id+" "+r.name+" "+r.station+" "+Object.keys(r.inputs||{}).join(" ")+" "+r.output).toLowerCase();
   const outputKind=RESOURCE[r.output]?.kind||"";return (!query||text.includes(query))&&(category==="all"||category==="packaged"&&r.output.startsWith("pack")||category==="doronium"&&(r.output.includes("doronium")||r.output==="infinity")||category===outputKind);
  });
  count=rows.length;
  cards=rows.map(([id,r])=>'<button type="button" class="catalog-card catalog-recipe-card" data-catalog-recipe="'+id+'"><span class="catalog-item-icon">⚗️</span><div class="catalog-card-copy"><strong>'+r.name+'</strong><small>'+r.station+' · '+r.time+'초</small><small>투입 '+Object.entries(r.inputs||{}).map(([item,n])=>(RESOURCE[item]?.name||item)+" × "+n).join(" · ")+'</small><small>출력 '+(RESOURCE[r.output]?.name||r.output)+' × '+(r.qty||1)+'</small></div><span class="catalog-card-arrow">설비에 지정 →</span></button>');
 }else{
  const rows=CATALOG_MACHINES.filter(m=>(!query||(m.name+" "+m.itemId+" "+m.catalogStation).toLowerCase().includes(query))&&(category==="all"||m.cat===category||category==="machine"));
  count=rows.length;
  cards=rows.map(m=>{
   const target=m.itemId==="machine_wiremill"?"wiremill":m.itemId==="machine_storage"?"storage":m.itemId==="machine_conveyor"?"belt":m.itemId==="machine_doronium_fusion"?"fusion":m.id;
   return '<button type="button" class="catalog-card catalog-machine-card" data-machine-build="'+target+'"><span class="catalog-item-icon">'+m.icon+'</span><div class="catalog-card-copy"><strong>'+m.name+'</strong><small>'+m.itemId+' · '+m.catalogStation+'</small><small>설비 아이템 보유 '+fmt(itemCount(m.itemId))+'</small></div><span class="catalog-card-arrow">건설 선택 →</span></button>';
  });
 }
 $("catalog-count").textContent=count+" 항목";
 $("catalog-summary").innerHTML='<span>'+Object.keys(RESOURCE).length+'개 아이템</span><span>'+Object.keys(CATALOG_RECIPES).length+'개 레시피</span><span>'+CATALOG_MACHINES.length+'개 기계 설계</span>';
 grid.innerHTML=cards.join("")||'<div class="inspector-empty catalog-empty">검색 결과가 없습니다. 다른 이름이나 분류로 찾아보세요.</div>';
}
function openBuildingManagement(b){
 const d=buildingDef(b.type);if(!d)return;
 const recipe=recipeFor(b);
 const isLab=b.type==="lab",activeResearch=S.activeResearch?RESEARCH.find(r=>r.id===S.activeResearch):null;
 const status=b.status==="RUNNING"?"가동 중":b.status==="PAUSED_POWER"?"전력 부족":b.status==="PAUSED_OUTPUT"?"출력 대기":b.status==="NO_INPUT"?"원료 부족":"대기";
 const body='<div class="building-modal-hero"><span class="build-icon">'+d.icon+'</span><div><b>'+d.name+'</b><small>'+status+' · 내구도 '+Math.round(b.condition||100)+'%</small></div></div>'+
 '<p>'+d.desc+'</p>'+
 (isLab?'<div class="building-modal-stat"><span>연구소 수</span><b>'+S.buildings.filter(x=>x.type==="lab").length+'개</b></div><div class="building-modal-stat"><span>연구 상태</span><b>'+(activeResearch?activeResearch.name+" · "+formatResearchTime(researchRemaining(activeResearch))+" 남음":"진행 중인 연구 없음")+'</b></div>'+(activeResearch?'<b class="research-countdown" id="building-research-countdown">남은 시간 '+formatResearchTime(researchRemaining(activeResearch))+'</b>':""):
 '<div class="building-modal-stat"><span>생산 공정</span><b>'+(recipe?.name||({miner:"자원 채굴",pump:"물 공급",doriFarm:"돌이 고기 수확",power:"전력 공급",fusion:"인피니티 퓨전"})[d.kind]||"산업 설비")+'</b></div><div class="building-modal-stat"><span>공정 진행률</span><b>'+Math.round((b.progress||0)/(recipe?.time||10)*100)+'%</b></div><div class="building-modal-stat"><span>투입 버퍼</span><b>'+Object.entries(b.input||{}).map(([id,n])=>(RESOURCE[id]?.name||id)+" "+fmt(n)+"개").join(" · ")+'</b></div><div class="building-modal-stat"><span>출력 버퍼</span><b>'+(b.output?(RESOURCE[b.output.id]?.name||b.output.id)+" "+fmt(b.output.qty)+"개":"없음")+'</b></div>')+
 '<div class="building-modal-actions" id="building-modal-actions"></div>';
 const buttons=[];
 if(isLab)buttons.push({label:"연구 관리 열기",cls:"primary",action:()=>{closeModal();if(controlPanelOpen)changePanel("research");else toggleControlPanel("research")}});
 else{
  if(b.output)buttons.push({label:"출력 회수",cls:"primary",action:()=>{collectOutput(b);closeModal();renderMachineDetails()}});
  if(recipe)buttons.push({label:"창고에서 원료 투입",cls:"secondary",action:()=>{supplyMachine(b);closeModal();renderMachineDetails()}});
  if(b.type==="variantLab")buttons.push({label:"레시피 변경",cls:"secondary",action:()=>chooseVariant(b)});
  if(b.type==="fusion"&&!S.fusionJob)buttons.push({label:"퓨전 시작",cls:"gold-button",action:()=>{startFusion();closeModal()}});
  if(b.type==="fusion"&&S.fusionJob?.inputCustody==="reserved")buttons.push({label:"퓨전 중단 · 원료 반환",cls:"secondary",action:()=>{abortFusionJob("사용자가 퓨전을 중단했습니다.");closeModal()}});
  if(b.type==="core")buttons.push({label:"인피니티 설치",cls:"gold-button",action:()=>{installCore(b);closeModal()}});
  buttons.push({label:"방향 회전",cls:"secondary",action:()=>{b.dir=((b.dir||1)+1)%4;markDirty();renderMachineDetails();drawWorld();closeModal();openBuildingManagement(b)}});
  buttons.push({label:"시설 해체",cls:"danger",action:()=>{removeBuilding(b);closeModal()}});
 }
 buttons.push({label:"닫기",cls:"secondary"});
 showModal(d.name,body,buttons);
}
function renderEvents(){const logs=S.logs||[];$("event-feed").innerHTML=logs.slice(0,7).map(e=>'<div class="event-row"><i></i><span>'+e.message+'</span><time>'+String(Math.floor(e.time%86400/3600)).padStart(2,"0")+":"+String(Math.floor(e.time%3600/60)).padStart(2,"0")+'</time></div>').join("")||'<div class="inspector-empty">아직 생산 기록이 없습니다.</div>'}

function claimSkillPoint(claimID){
 const result=awardSkillPoints(S.skills,claimID,1);
 S.skills=result.state;
 if(result.awarded){log("엔지니어 스킬 포인트 획득 · "+claimID,"good");markDirty();return true}
 return false;
}
function awardResearchTierSkillPoints(){
 const tiers=RESEARCH.filter(r=>S.research.includes(r.id)).map(r=>Number(r.tier)||0);
 const highest=Math.min(7,Math.max(0,...tiers));
 for(let tier=1;tier<=highest;tier++)claimSkillPoint("RESEARCH_TIER_"+tier);
}
function reconcileSkillMilestones(){
 const tiers=RESEARCH.filter(r=>S.research.includes(r.id)).map(r=>Number(r.tier)||0);
 for(let tier=1;tier<=Math.min(7,Math.max(0,...tiers));tier++)claimSkillPoint("RESEARCH_TIER_"+tier);
 for(let chapter=1;chapter<=Math.min(4,Number(S.chapter)||0);chapter++)claimSkillPoint("STORY_CHAPTER_"+chapter);
 if(Number(S.player?.mineLevel)>=3)claimSkillPoint("EXPLORATION_MINE_DEPTH_3");
 if(Number(S.player?.mineLevel)>=5)claimSkillPoint("EXPLORATION_MINE_DEPTH_5");
 if(Object.keys(S.seen||{}).some(key=>{if(!S.seen[key])return false;const [x,y]=key.split(",").map(Number);return biomeAt(x,y)==="crystal"}))claimSkillPoint("EXPLORATION_CRYSTAL_CAVERN");
}
function activateSkill(nodeID){
 const preview=unlockSkill(S.skills,nodeID);
 if(!preview.ok){toast(preview.reason==="INSUFFICIENT_POINTS"?"스킬 포인트가 부족합니다.":preview.reason==="PREREQUISITES_LOCKED"?"같은 분야의 이전 스킬을 먼저 습득하세요.":preview.reason==="ALREADY_UNLOCKED"?"이미 습득한 스킬입니다.":"유효하지 않은 스킬입니다.","warn");return false}
 const node=preview.node;
 showModal("전문화 습득 확인",'<p><strong>'+node.name+'</strong> 전문화를 습득할까요?</p><p>'+node.description+'</p><p>효과: '+node.effect+'</p><p>소모 포인트: 1 · 습득 후 남은 포인트: '+Math.max(0,S.skills.availablePoints-1)+'</p>',[
  {label:"취소",cls:"secondary"},
  {label:"1포인트 사용",cls:"gold",action:()=>{
   const committed=unlockSkill(S.skills,nodeID);
   if(!committed.ok){closeModal();toast("스킬 상태가 변경되어 습득을 취소했습니다.","warn");renderSkillTree();return}
   S.skills=committed.state;log("전문화 습득 · "+committed.node.name,"good");markDirty();closeModal();renderSkillTree();renderHud();toast(committed.node.name+" 전문화 습득 완료");
  }}
 ]);
 return true;
}
function renderSkillTree(){
 const host=$("skill-tree");if(!host)return;
 const skillState=validateSkillState(S.skills);
 $("skill-point-count").textContent=(S.skills?.availablePoints||0)+" / 15 포인트";
 $("skill-tree-progress").textContent=(S.skills?.unlockedSkillIDs?.length||0)+" / 20 습득";
 host.innerHTML=SKILL_GROUPS.map(group=>{
  const cards=SKILL_NODES.filter(node=>node.group===group.id).map(node=>{
   const status=skillNodeStatus(S.skills,node.id),unlocked=status==="UNLOCKED",available=status==="AVAILABLE";
   return '<article class="skill-node '+(unlocked?"unlocked":available?"available":"locked")+'"><div class="skill-node-top"><span>T'+node.tier+'</span><b>'+node.name+'</b><em>'+(unlocked?"습득 완료":available?"습득 가능":"잠김")+'</em></div><p>'+node.description+'</p><small>'+node.effect+'</small><button type="button" class="action-button '+(unlocked?"secondary":"")+'" data-skill="'+node.id+'" '+(!available?"disabled":"")+'>'+(unlocked?"습득 완료":available?"포인트 1 사용":"선행 스킬 필요")+'</button></article>';
  }).join("");
  return '<section class="skill-group"><header><strong>'+group.label+'</strong><small>'+group.name+'</small></header><div class="skill-group-nodes">'+cards+'</div></section>';
 }).join("");
 host.dataset.valid=String(skillState.valid);
}

function researchRemaining(r){return Math.max(0,(Number(r?.time)||0)-(S.researchProgress||0))}
function formatResearchTime(seconds){const total=Math.max(0,Math.ceil(seconds));const minutes=Math.floor(total/60),secs=total%60;return minutes?minutes+"분 "+String(secs).padStart(2,"0")+"초":secs+"초"}
function researchNeedsHTML(r){return Object.entries(r.need||{}).map(([id,n])=>{const item=RESOURCE[id],have=availableItemCount(S,id),ok=have>=n;return '<span class="research-resource '+(ok?"ready":"missing")+'"><b>'+(item?.icon||"◆")+' '+(item?.name||id)+'</b><small>필요 '+fmt(n)+'개 · 사용 가능 '+fmt(have)+'개'+(ok?"":" · 부족 "+fmt(n-have)+'개')+'</small></span>'}).join("")}
function updateResearchCountdownDisplays(){if(!S.activeResearch)return;const r=RESEARCH.find(x=>x.id===S.activeResearch);if(!r)return;const label="남은 시간 "+formatResearchTime(researchRemaining(r));const node=$("research-countdown");if(node)node.textContent=label;const modal=$("building-research-countdown");if(modal)modal.textContent=label}
function renderResearch(){const done=S.research.length;$("research-progress-label").textContent=done+" / "+RESEARCH.length;$("research-percent").textContent=Math.round(done/RESEARCH.length*100)+"%";$("research-progress-bar").style.width=done/RESEARCH.length*100+"%";$("research-tree").innerHTML=RESEARCH.map(r=>{const complete=S.research.includes(r.id),available=!complete&&(!r.requires||r.requires.every(id=>S.research.includes(id)));const active=S.activeResearch===r.id;return '<div class="research-node '+(complete?"complete":available?"available":"")+'"><span class="research-icon">'+r.icon+'</span><div class="research-info"><strong>'+r.name+'</strong><p>'+r.desc+'</p><div class="research-requirements">'+researchNeedsHTML(r)+'</div><small>연구 시간 '+r.time+'초 · 연구 비용 '+fmt(r.cost)+' D</small>'+(active?'<b class="research-countdown" id="research-countdown">남은 시간 '+formatResearchTime(researchRemaining(r))+'</b>':"")+'</div><button class="action-button '+(complete?"secondary":available?"":"secondary")+'" data-research="'+r.id+'" '+(!available||active?"disabled":"")+'>'+(complete?"완료":active?"연구 중":available?"연구 시작":"잠김")+'</button></div>'}).join("");document.querySelectorAll("[data-research]").forEach(btn=>btn.onclick=()=>startResearch(btn.dataset.research));renderSkillTree()}
function renderMissions(){const chapters=["ACT I · THE RUINS","ACT II · HIDDEN INDUSTRY","ACT III · DORONUM TRUTH","ACT IV · INFINITE PROJECT","ACT V · LAST FACTORY"];const q=getQuest();const activeChapter=q?.chapter??4;$("orbit-level").textContent=String(Math.min(9,S.questIndex+1)).padStart(2,"0");$("story-chapters").innerHTML=chapters.map((c,i)=>'<div class="chapter-chip '+(i===activeChapter?"active":i<activeChapter?"complete":"")+'">'+c+'</div>').join("");const progress=q?Math.min(q.max,q.progress(S)):1;$("mission-list").innerHTML=QUESTS.map((m,i)=>'<div class="mission-card '+(i<S.questIndex?"completed":"")+'"><div class="mission-head"><strong>'+m.title+'</strong><span>'+(i<S.questIndex?"완료":i===S.questIndex?"진행 중":"잠김")+'</span></div><p>'+m.desc+'</p><div class="mission-reward">보상 · '+fmt(m.reward)+' D</div>'+(i===S.questIndex?'<div class="mission-progress"><i style="width:'+Math.round(progress/m.max*100)+'%"></i></div>':"")+'</div>').join("");if(q)$("orbit-dialogue").textContent=q.orbit}

function addInput(b,id,qty,meta={quality:90,purity:90,synthetic:false}){b.input??={};b.inputMeta??={};b.input[id]=(b.input[id]||0)+qty;const old=b.inputMeta[id]||{quality:90,purity:90,synthetic:false},before=b.input[id]-qty,total=b.input[id];b.inputMeta[id]={quality:(old.quality*before+meta.quality*qty)/total,purity:(old.purity*before+meta.purity*qty)/total,synthetic:old.synthetic||!!meta.synthetic};markDirty()}
function recipeFor(b){const d=buildingDef(b.type);if(b.recipeId&&CATALOG_RECIPES[b.recipeId])return CATALOG_RECIPES[b.recipeId];if(d?.defaultRecipe&&CATALOG_RECIPES[d.defaultRecipe])return CATALOG_RECIPES[d.defaultRecipe];if(d?.recipe)return RECIPES[d.recipe];if(b.type==="variantLab")return VARIANT_RECIPES[b.variant||"doronium_blue"];return null}
function recipeSupportsStation(recipe,station){return !!recipe&&(recipe.station===station||Array.isArray(recipe.stations)&&recipe.stations.includes(station))}
function canConsumeRecipe(b,r){return Object.entries(r.inputs).every(([id,n])=>(b.input?.[id]||0)+availableItemCount(S,id)>=n)}
function consumeRecipe(b,r){if(!canConsumeRecipe(b,r))return null;const inventoryNeed={};for(const[id,n]of Object.entries(r.inputs)){const buffered=Math.min(n,b.input?.[id]||0),remaining=n-buffered;if(remaining>0)inventoryNeed[id]=remaining}const reservations=reserveItemBatch(S,inventoryNeed,"recipe:"+String(b.uid||b.type));if(!reservations)return null;const committed=reservations.length?commitItemReservations(S,reservations):[];if(!committed){for(const id of reservations)releaseItemReservation(S,id);return null}let qsum=0,psum=0,weight=0,hasSynthetic=false;const absorb=m=>{qsum+=m.quality*m.quantity;psum+=m.purity*m.quantity;weight+=m.quantity;hasSynthetic=hasSynthetic||m.synthetic};for(const[id,n]of Object.entries(r.inputs)){const fromBuffer=Math.min(n,b.input?.[id]||0);if(fromBuffer>0){const m=b.inputMeta?.[id]||{quality:90,purity:90,synthetic:false};absorb({...m,quantity:fromBuffer});b.input[id]-=fromBuffer;if(b.input[id]<=0){delete b.input[id];delete b.inputMeta[id]}}}for(const stack of committed)absorb(stack);syncLegacyInventory(S);return {quality:weight?qsum/weight:90,purity:weight?psum/weight:90,synthetic:hasSynthetic}}
function createOutput(b,id,qty,meta){if(!commitCompletionBuffer(b,{id,qty,meta})){b.status="PAUSED_OUTPUT";return false}b.status="PAUSED_OUTPUT";S.stats.produced[id]=(S.stats.produced[id]||0)+qty;log(RESOURCE[id].name+" 생산 · "+fmt(qty)+"개");markDirty();return true}
function isBridgeType(type){return ["catalog_wood_bridge","catalog_iron_bridge","catalog_concrete_bridge"].includes(type)}
function isBridgeBuilding(building){return !!building&&isBridgeType(building.type)}
function placeBuilding(type,x,y){const d=buildingDef(type);if(!d)return false;if(S.player.layer==="mine"){toast("지하 광산에서는 공장 시설을 설치할 수 없습니다.","warn");return false}if(S.buildings.length>=BUILDING_LIMIT){toast("공장 시설 한도 "+BUILDING_LIMIT+"개에 도달했습니다.","warn");return false}if(buildingAt(x,y)){toast("이미 시설이 설치된 타일입니다.","warn");return false}if(type!=="beltAdaptive"&&!["relay","core","pump"].includes(type)&&!isBridgeType(type)&&!hasFoundation(x,y)){toast("기계와 물류 시설은 먼저 땅을 평탄화하고 기초 타일을 설치해야 합니다.","warn");return false}const node=tileNode(x,y);if(isBridgeType(type)&&node?.type!=="water"){toast("다리는 강이나 수로의 물 타일 위에 설치해야 합니다.","warn");return false}if(type==="pump"&&node?.type!=="water"){toast("정수 펌프는 수원지 위에 설치해야 합니다.","warn");return false}if(type==="catalog_oil_drill"&&node?.type!=="oil"){toast("원유 시추기는 석유 지대의 유정 위에 설치해야 합니다.","warn");return false}if(["minerIron","minerCopper","minerCoal"].includes(type)){toast("광물은 지하 광산에서 곡괭이로 직접 채굴하세요.","warn");return false}if((type==="doriFarm"||type==="catalog_dori_harvester")&&node?.type==="dori"){toast("재배기는 나무 바로 옆의 평탄한 부지에 설치하세요.","warn");return false}if((type==="doriFarm"||type==="catalog_dori_harvester")&&!findNearbyDoriNode(x,y)){toast("돌이 나무 재배기는 돌이 고기 나무 주변에 설치해야 합니다.","warn");return false}if(type==="relay"&&node?.type!=="relaySite"){toast("행성 에너지 릴레이 설치 지점을 찾아야 합니다.","warn");return false}if(type==="core"&&node?.type!=="coreSite"){toast("중앙 안정화 코어는 지정된 코어 부지에 설치해야 합니다.","warn");return false}if(node&&["water","wood","dori","birchTree","rubberTree","barkTree","frozenTree","fireTree","grassPatch","heatCrystalNode","coldCrystalNode","oil","mineEntrance","relaySite","coreSite"].includes(node.type)&&!["pump","doriFarm","catalog_dori_harvester","catalog_oil_drill","relay","core","catalog_wood_bridge","catalog_iron_bridge","catalog_concrete_bridge"].includes(type)&&!(type==="beltAdaptive"&&node.type==="grassPatch")){toast("이 타일에는 해당 시설을 설치할 수 없습니다.","warn");return false}if(!unlockOk(d)){toast("필요한 기술 연구를 먼저 완료하세요.","warn");return false}if(!canAfford(d)){toast("건설 자원이 부족합니다.","warn");return false}const hasCatalogItem=!!d.catalogItemId&&availableItemCount(S,d.catalogItemId)>0;if(hasCatalogItem){if(!takeItem(d.catalogItemId,1)){toast("설비 아이템을 차감하지 못했습니다. 건설을 취소했습니다.","warn");return false}}else if(!takeItems(d.materials)){toast("건설 재료 또는 설비 아이템이 부족합니다. 자금은 사용하지 않았습니다.","warn");return false}S.money-=buildingMoneyCost(d);const b={uid:"B"+(++S.tick)+"-"+Math.floor(Math.random()*99999),type,x,y,dir:1,progress:0,elapsed:0,condition:100,input:{},inputMeta:{},output:null,outputDir:1,status:"IDLE",autoFeed:true,variant:"doronium_blue",recipeId:d.defaultRecipe||null,temp:25,pressure:0,fuelTimer:0,moveTimer:0};if(["catalog_auto_miner","catalog_item_elevator","catalog_water_elevator","catalog_maglev_elevator"].includes(type))b.mineId=nearestMineInstanceId(x,y);S.buildings.push(b);markSceneDirty();S.stats.built[type]=(S.stats.built[type]||0)+1;if(type==="relay"){const index=S.sites.relay.findIndex(p=>p.x===x&&p.y===y);if(index>=0)S.relaySites[index]=true}if(type==="core")S.corePlaced=true;selectedBuilding=b.uid;selectedBuild=null;log(d.name+" 건설 완료");toast(d.name+" 설치 완료");playTone(580,.1,"triangle");markDirty();renderAll();questCheck();return true}
function isWalkable(x,y){if(x<0||y<0||x>=WORLD_W||y>=WORLD_H)return false;const building=buildingAt(x,y);if(building&&!isBridgeBuilding(building))return false;if(S.player.layer==="mine")return mineTunnelAt(x,y,currentMineId());const node=tileNode(x,y);return !node||node.amount<=0||isBridgeBuilding(building)}
function findPlayerPath(startX,startY,goalX,goalY){if(goalX===startX&&goalY===startY)return [];if(!isWalkable(goalX,goalY))return null;const start=startX+","+startY,goal=goalX+","+goalY,queue=[{x:startX,y:startY}],came=new Map([[start,null]]);let found=false;for(let head=0;head<queue.length&&head<1200;head++){const p=queue[head];for(const d of DIRS){const x=p.x+d.x,y=p.y+d.y,key=x+","+y;if(came.has(key)||!isWalkable(x,y))continue;came.set(key,p.x+","+p.y);if(key===goal){found=true;break}queue.push({x,y})}if(found)break}if(!found)return null;const path=[];let key=goal;while(key!==start){const [x,y]=key.split(",").map(Number);path.push({x,y});key=came.get(key)}return path.reverse()}
function movePlayerTo(x,y,onArrive=null){const origin=playerMotion.path.length?playerMotion.path[playerMotion.path.length-1]:{x:S.player.x,y:S.player.y};const path=findPlayerPath(origin.x,origin.y,x,y);if(path===null){toast("이동 경로가 막혀 있습니다.","warn");return false}playerMotion.path=playerMotion.path.concat(path);playerMotion.onArrive=onArrive;if(!playerMotion.path.length){playerMotion.moving=false;const fn=playerMotion.onArrive;playerMotion.onArrive=null;if(fn)fn()}return true}
function approachTile(x,y,onArrive=null){const origin=playerMotion.path.length?playerMotion.path[playerMotion.path.length-1]:{x:S.player.x,y:S.player.y},options=[];for(const d of DIRS){const nx=x+d.x,ny=y+d.y;if(!isWalkable(nx,ny))continue;const path=findPlayerPath(origin.x,origin.y,nx,ny);if(path!==null)options.push({path,nx,ny})}options.sort((a,b)=>a.path.length-b.path.length);if(!options.length){toast("대상 주변으로 접근할 경로가 없습니다.","warn");return false}const best=options[0];playerMotion.path=playerMotion.path.concat(best.path);playerMotion.onArrive=onArrive;if(!best.path.length){const fn=playerMotion.onArrive;playerMotion.onArrive=null;if(fn)fn()}return true}
function adventureMode(){return S.player.viewMode!=="map"}
function setViewMode(mode){
 if(S.player.layer==="mine"&&mode==="map"){toast("광산 내부에서는 1인칭 또는 3인칭만 사용할 수 있습니다.","warn");return}
 let next=["first","third","map"].includes(mode)?mode:"first";
 if(next!=="map"&&world3d.backend!=="webgl"){toast("이 기기는 WebGL 3D 시점을 지원하지 않아 전략 지도를 사용합니다.","warn");next="map"}
 S.player.viewMode=next;playerMotion.path=[];playerMotion.onArrive=null;
 if(next==="map"){playerMotion.x=S.player.x;playerMotion.z=S.player.y;playerMotion.y=0;world3d.setViewMode?.("map");centerCamera()}
 else{world3d.setViewMode?.(next);world3d.center(S.player.x,S.player.y)}
 document.querySelectorAll("[data-view-mode]").forEach(b=>b.classList.toggle("active",b.dataset.viewMode===next));
 $("app-layout").classList.toggle("adventure-active",next!=="map");
 $("world-frame").classList.toggle("adventure-active",next!=="map");
 if($("adventure-crosshair"))$("adventure-crosshair").hidden=next==="map";
 if($("world-help"))$("world-help").innerHTML=next==="map"?"<b>키보드 조작</b><span>WASD 이동 · +/- 확대/축소</span><span>마우스 이동으로 시점 회전 · Esc 메뉴 닫기</span><span>B 건설 · O 운영 · I 창고 · C 도감 · T 연구 · J 임무</span>":"<b>생존 조작</b><span>WASD 이동 · Shift 달리기 · Space 점프 · E 사용</span><span>마우스를 움직여 시점 회전 · 좌클릭 채집/사용</span><span>V 1인칭/3인칭 · M 전략 지도 · B/O/I/C/T/J 메뉴</span>";
 renderHud();drawWorld();markDirty();
}
function isAdventureCellFree(x,z){
 const cx=Math.floor(x+.5),cz=Math.floor(z+.5);
 if(S.player.layer==="mine")return cx>=0&&cz>=0&&cx<MINE_W&&cz<MINE_H&&mineTunnelAt(cx,cz,currentMineId());
 if(cx<0||cz<0||cx>=WORLD_W||cz>=WORLD_H)return false;
 if(cx===Math.floor(playerMotion.x+.5)&&cz===Math.floor(playerMotion.z+.5))return true;
 const node=tileNode(cx,cz);return !buildingAt(cx,cz)&&(!node||node.amount<=0);
}
function updatePlayerMotion(dt){
 if(S.paused){playerMotion.moving=false;return}
 if(!adventureMode()){
  if(!playerMotion.path.length){playerMotion.moving=false;return}
  let remaining=Math.max(0,dt)*4.2;playerMotion.moving=true;
  while(remaining>0&&playerMotion.path.length){
   const target=playerMotion.path[0],dx=target.x-playerMotion.x,dz=target.y-playerMotion.z,dist=Math.hypot(dx,dz);
   if(dist<.0001||remaining>=dist){playerMotion.x=target.x;playerMotion.z=target.y;remaining-=dist;playerMotion.path.shift();S.player.x=target.x;S.player.y=target.y;revealAround();markDirty()}
   else{playerMotion.x+=dx/dist*remaining;playerMotion.z+=dz/dist*remaining;remaining=0}
   if(Math.abs(dx)+Math.abs(dz)>.0001)playerMotion.facing=Math.atan2(dx,dz)
  }
  if(!playerMotion.path.length){playerMotion.moving=false;const fn=playerMotion.onArrive;playerMotion.onArrive=null;if(fn)fn()}
  return;
 }
 const forward=(adventureKeys.has("w")||adventureKeys.has("arrowup")?1:0)-(adventureKeys.has("s")||adventureKeys.has("arrowdown")?1:0);
 const side=(adventureKeys.has("d")||adventureKeys.has("arrowright")?1:0)-(adventureKeys.has("a")||adventureKeys.has("arrowleft")?1:0);
 const length=Math.hypot(forward,side)||1,speed=(adventureKeys.has("shift")?7.1:4.6)*dt;
 const fx=-Math.sin(playerMotion.yaw),fz=-Math.cos(playerMotion.yaw);
 const dx=(fx*forward+Math.cos(playerMotion.yaw)*side)/length*speed;
 const dz=(fz*forward-Math.sin(playerMotion.yaw)*side)/length*speed;
 let moved=false;
 const maxX=S.player.layer==="mine"?MINE_W-.35:WORLD_W-.35,maxZ=S.player.layer==="mine"?MINE_H-.35:WORLD_H-.35;
 const nextX=clamp(playerMotion.x+dx,.35,maxX);
 const stepX=S.player.layer==="mine"?0:Math.abs(surfaceElevation(nextX,playerMotion.z)-surfaceElevation(playerMotion.x,playerMotion.z));
 if(isAdventureCellFree(nextX,playerMotion.z)&&stepX<=(playerMotion.y>7?18:12)&&Math.abs(nextX-playerMotion.x)>.0001){playerMotion.x=nextX;moved=true}
 const nextZ=clamp(playerMotion.z+dz,.35,maxZ);
 const stepZ=S.player.layer==="mine"?0:Math.abs(surfaceElevation(playerMotion.x,nextZ)-surfaceElevation(playerMotion.x,playerMotion.z));
 if(isAdventureCellFree(playerMotion.x,nextZ)&&stepZ<=(playerMotion.y>7?18:12)&&Math.abs(nextZ-playerMotion.z)>.0001){playerMotion.z=nextZ;moved=true}
 playerMotion.moving=moved;if(moved)playerMotion.facing=Math.atan2(dx,dz);
 if(adventureKeys.has(" ")&&playerMotion.grounded){playerMotion.velocityY=34;playerMotion.grounded=false}
 if(!playerMotion.grounded){playerMotion.velocityY-=72*dt;playerMotion.y+=playerMotion.velocityY*dt;if(playerMotion.y<=0){playerMotion.y=0;playerMotion.velocityY=0;playerMotion.grounded=true}}
 const tileX=clamp(Math.floor(playerMotion.x+.5),0,(S.player.layer==="mine"?MINE_W:WORLD_W)-1),tileZ=clamp(Math.floor(playerMotion.z+.5),0,(S.player.layer==="mine"?MINE_H:WORLD_H)-1);
 if(tileX!==S.player.x||tileZ!==S.player.y){S.player.x=tileX;S.player.y=tileZ;if(S.player.layer==="surface")revealAround();else persistActiveMinePlayer();markDirty()}
 S.player.yaw=playerMotion.yaw;S.player.pitch=playerMotion.pitch;
 if(mineHeld){mineCooldown-=dt;if(mineCooldown<=0){mineCooldown=.62/calculateSkillBonuses(S.skills).miningSpeedMultiplier;performAdventureAction()}}
 survivalHudClock+=dt;if(survivalHudClock>.15){survivalHudClock=0;updateAdventureHud()}
}
function updateAdventureHud(){
 const target=world3d.pickTarget(190);adventureTarget=target;
 const label=$("target-label");if(label){const entryMine=target?.mineId?mineName(target.mineId):"";label.textContent=target?(target.mine?(RESOURCE[target.type]?.name||target.type)+" · "+target.depthY+"m":target.kind==="mineEntrance"?entryMine+" · 광산 입구":target.kind==="mineExit"?mineName(currentMineId())+" · 지상 출구":target.kind==="mineDescend"?mineName(currentMineId())+" · 더 깊은 광맥":target.kind==="resource"?(RESOURCE[target.type]?.name||target.type):buildingDef(target.type)?.name||"산업 시설"):"주변 탐색 중";label.classList.toggle("target-found",!!target)}
 const mode=S.player.viewMode;$("view-first")?.classList.toggle("active",mode==="first");$("view-third")?.classList.toggle("active",mode==="third");$("view-map")?.classList.toggle("active",mode==="map");
}
function persistActiveMinePlayer(){
 const mine=getMineInstance();if(!mine||S.player.layer!=="mine")return;
 mine.currentLevel=clamp(Number(S.player.mineLevel)||1,1,MINE_LEVELS);
 mine.player={x:playerMotion.x,z:playerMotion.z,yaw:playerMotion.yaw,pitch:playerMotion.pitch,level:mine.currentLevel};
}
function enterMine(mineId=PRIMARY_MINE_ID){
 if(S.player.layer==="mine")return;
 const id=S.mineInstances?.[mineId]?mineId:PRIMARY_MINE_ID,mine=getMineInstance(id);
 S.player.surfacePosition={x:S.player.x,y:S.player.y,yaw:playerMotion.yaw,pitch:playerMotion.pitch,viewMode:S.player.viewMode};
 S.player.mineId=id;S.player.layer="mine";S.player.mineLevel=clamp(Number(mine?.currentLevel)||1,1,MINE_LEVELS);S.player.viewMode="first";
 const saved=mine?.player||{x:3,z:12,yaw:0,pitch:-.06};
 playerMotion={...playerMotion,x:clamp(Number(saved.x??3),.35,MINE_W-.35),z:clamp(Number(saved.z??12),.35,MINE_H-.35),y:0,velocityY:0,grounded:true,path:[],moving:false,yaw:Number(saved.yaw)||0,pitch:clamp(Number(saved.pitch??-.06),-1.25,1.25)};
 S.player.x=clamp(Math.floor(playerMotion.x+.5),0,MINE_W-1);S.player.y=clamp(Math.floor(playerMotion.z+.5),0,MINE_H-1);
 world3d.setViewMode("first");closeControlPanel();markSceneDirty();
 toast(mineName(id)+" 진입 · "+S.player.mineLevel+"층 · 심도 "+Math.abs(mineFloorY(S.player.mineLevel))+"m");
 log(mineName(id)+" 진입 · "+S.player.mineLevel+"층");markDirty();updateAdventureHud();drawWorld();
}
function exitMine(){
 if(S.player.layer!=="mine")return;
 persistActiveMinePlayer();
 const pos=S.player.surfacePosition||{x:72,y:52,yaw:0,pitch:-.12,viewMode:"first"};
 const exitedMine=mineName(currentMineId());
 S.player.layer="surface";S.player.surfacePosition=null;S.player.x=pos.x;S.player.y=pos.y;S.player.viewMode=pos.viewMode||"first";
 playerMotion={...playerMotion,x:pos.x,z:pos.y,y:0,velocityY:0,grounded:true,path:[],moving:false,yaw:pos.yaw||0,pitch:pos.pitch??-.12};
 world3d.setViewMode(S.player.viewMode);markSceneDirty();toast(exitedMine+"에서 지상으로 귀환했습니다.");markDirty();renderAll();
}
function descendMine(){
 if(S.player.mineLevel>=MINE_LEVELS){toast("현재 도달 가능한 최심부입니다.","warn");return}
 S.player.mineLevel++;
 if(S.player.mineLevel>=3)claimSkillPoint("EXPLORATION_MINE_DEPTH_3");
 if(S.player.mineLevel>=5)claimSkillPoint("EXPLORATION_MINE_DEPTH_5");
 playerMotion={...playerMotion,x:3,z:12,y:0,velocityY:0,grounded:true,path:[],moving:false};S.player.x=3;S.player.y=12;
 persistActiveMinePlayer();
 toast(mineName(currentMineId())+" "+S.player.mineLevel+"층 · Y "+mineFloorY(S.player.mineLevel)+"m");
 log(mineName(currentMineId())+" 심층 진입 · "+S.player.mineLevel+"층 · Y="+mineFloorY(S.player.mineLevel)+"m");markSceneDirty();markDirty();drawWorld();
}
function harvestMineDeposit(node,mineId=currentMineId()){
 if(S.player.layer!=="mine"||S.activeTool!=="pickaxe"){toast("곡괭이를 장착해야 광물을 채굴할 수 있습니다.","warn");return}
 if(mineId!==currentMineId()||!node||node.amount<=0){toast("이 광맥은 현재 광산에서 채굴할 수 없습니다.","warn");return}
 const amount=Math.min(node.amount,node.type.startsWith("doronium_")?1:node.type==="diamond"?1:2),id=node.type;
 node.amount-=amount;if(node.amount<=0)markSceneDirty();
 if(RESOURCE[id]){
  const qualityValue=clamp(82+Math.floor((node.seed%1700)/100)+Math.max(0,node.level-2),80,99);
  addItem(id,amount,{quality:qualityValue,purity:Math.min(99,86+node.level*2),synthetic:false});
  S.stats.gathered[id]=(S.stats.gathered[id]||0)+amount;
  log(mineName(mineId)+" · "+RESOURCE[id].name+" 채굴 · "+amount+"개 · Y="+node.depthY+"m");
  toast(RESOURCE[id].name+" +"+amount+" · "+node.depthY+"m");playTone(480+node.level*50,.08,"triangle");
  questCheck();renderInventory();renderHud();markDirty();drawWorld();
 }
}
function selectTool(tool){if(!["axe","pickaxe"].includes(tool)||!S.tools?.[tool])return;S.activeTool=tool;document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool));const label=$("equipped-tool-label");if(label)label.textContent=tool==="axe"?"도끼 장착":"곡괭이 장착";toast(label?.textContent||"도구 변경")}
function performAdventureAction(){
 if(!adventureMode()||S.paused)return;
 const target=world3d.pickTarget(190);
 if(target?.kind==="mineEntrance"){enterMine(target.mineId||PRIMARY_MINE_ID);return}
 if(target?.kind==="mineExit"){exitMine();return}
 if(target?.kind==="mineDescend"){descendMine();return}
 if(target?.kind==="wildDori"){const node=S.nodes?.[target.x+","+target.z];toast(node?.hostile?"멍멍! 돌이가 이 숲을 지키고 있어요. 안전거리를 두고 이동해 보세요.":"돌이가 숲길을 산책하고 있어요. 꼬리를 흔들며 인사합니다.");return}
 if(target?.kind==="resource"){
  if(target.mine){const mineId=target.mineId||currentMineId(),deposit=mineId===currentMineId()?getMineDeposits(mineId)[mineDepositKey(target.level,target.x,target.z)]:null;if(deposit)harvestMineDeposit(deposit,mineId);return}
  const node=tileNode(target.x,target.z);if(!node)return;
  if(selectedLandTool){selectTile(target.x,target.z);return}
  if(selectedBuild){placeBuilding(selectedBuild,target.x,target.z);return}
  if(node.type==="relaySite"||node.type==="coreSite"){toast("이곳은 특수 시설 설치 지점입니다.");return}
  harvestNode(target.x,target.z,node);return;
 }
 if(target?.kind==="building"){
  const b=S.buildings.find(v=>v.uid===target.uid);if(!b)return;
  if(b.output&&adventureKeys.has("e")){collectOutput(b);return}
  selectedBuilding=b.uid;selectedBuild=null;changePanel("factory");renderBuildList();renderMachineDetails();openBuildingManagement(b);toast((buildingDef(b.type)?.name||"시설")+" 선택");return;
 }
 const rect=canvas.getBoundingClientRect(),cell=world3d.pickTile(rect.left+rect.width/2,rect.top+rect.height/2);
 if(cell&&selectedLandTool){selectTile(cell.x,cell.z);return}
 if(cell&&selectedBuild){if(placeBuilding(selectedBuild,cell.x,cell.z))toast("시설 설치 완료")}
 else if(cell&&adventureKeys.has("e")){const node=tileNode(cell.x,cell.z);if(node)harvestNode(cell.x,cell.z,node)}
}
function consumeFood(){
 if(availableItemCount(S,"doriMeat")<1){toast(itemCount("doriMeat")>0?"돌이 고기가 다른 공정에 예약되어 있습니다.":"먹을 돌이 고기가 없습니다.","warn");return}
 if(!takeItem("doriMeat",1)){toast("돌이 고기 차감에 실패해 회복 효과를 적용하지 않았습니다.","warn");return}
 S.survival.hunger=clamp(S.survival.hunger+38,0,100);S.survival.health=clamp(S.survival.health+5,0,100);log("돌이 고기 섭취 · 허기 회복");toast("돌이 고기 + 허기 회복");markDirty();renderInventory();renderHud()
}
function drinkWater(){
 if(availableItemCount(S,"water")<1){toast(itemCount("water")>0?"물이 다른 공정에 예약되어 있습니다.":"마실 물이 없습니다.","warn");return}
 if(!takeItem("water",1)){toast("물 차감에 실패해 회복 효과를 적용하지 않았습니다.","warn");return}
 S.survival.thirst=clamp(S.survival.thirst+42,0,100);log("식수 섭취 · 갈증 회복");toast("식수 + 갈증 회복");markDirty();renderInventory();renderHud()
}
function respawnEngineer(){
 S.player.layer="surface";S.player.mineLevel=1;S.player.surfacePosition=null;
 const lossIds=["wood","stone","ironOre","copperOre","coal","quartz","goldOre"];
 for(const id of lossIds){const loss=Math.floor(availableItemCount(S,id)*.1);if(loss>0)takeItem(id,loss)}
 playerMotion.x=72;playerMotion.z=52;playerMotion.y=0;playerMotion.velocityY=0;playerMotion.grounded=true;playerMotion.path=[];
 S.player.x=72;S.player.y=52;S.survival={health:65,hunger:65,thirst:65};
 revealAround();log("엔지니어 구조 완료 · 원자재 10% 손실","warn");toast("구조 지점에서 다시 시작합니다. 원자재 10%를 잃었습니다.","warn");markDirty();renderAll()
}
function updateSurvival(dt){
 const v=S.survival;if(!v)return;
 v.hunger=Math.max(0,v.hunger-dt*.026);
 v.thirst=Math.max(0,v.thirst-dt*.04);
 if(v.hunger<=0||v.thirst<=0)v.health=Math.max(0,v.health-dt*(v.thirst<=0?1.05:.65));
 else if(v.hunger>70&&v.thirst>70)v.health=Math.min(100,v.health+dt*.12);
 const region=S.player.layer==="surface"?regionAt(S.player.x,S.player.y):"mine";
 const heat=region==="lava",cold=region==="cold",radiation=region==="doroniumForest";
 const grid=currentPower();
 const nearClimate=type=>S.player.layer==="surface"&&S.buildings.some(b=>b.type===type&&powerRatioForBuilding(b,grid)>=.8&&Math.hypot(b.x-S.player.x,b.y-S.player.y)<=7);
 const hasCooling=nearClimate("catalog_air_conditioner"),hasHeating=nearClimate("catalog_heater"),hasVentilation=nearClimate("catalog_fan");
 const heatRate=hasCooling?.38:hasVentilation?.82:1;
 const coldRate=hasHeating?.38:hasVentilation?.84:1;
 const radiationRate=hasVentilation?.9:1;
 v.heatExposure=Math.max(0,(v.heatExposure||0)+(heat?dt*heatRate:-dt*1.7));
 v.coldExposure=Math.max(0,(v.coldExposure||0)+(cold?dt*coldRate:-dt*1.6));
 v.doroniumExposure=Math.max(0,(v.doroniumExposure||0)+(radiation?dt*radiationRate:-dt*1.4));
 if(v.heatExposure>28)v.health=Math.max(0,v.health-dt*.22);
 if(v.coldExposure>36)v.health=Math.max(0,v.health-dt*.16);
 if(v.doroniumExposure>48)v.health=Math.max(0,v.health-dt*.13);
 if(!E2E_MODE){
  const alerts=[];
  if(heat)alerts.push("용암 지대 · 내열 장비 없이 오래 머물면 화상 위험");
  if(cold)alerts.push("냉각 지대 · 방한 장비 없이 오래 머물면 빙결 위험");
  if(radiation)alerts.push("도로늄 숲 · 피폭이 누적되고 있습니다");
  const alert=$("world-alerts");if(alert)alert.textContent=alerts.join("  /  ");
 }
 if(S.player.layer==="surface"){
  let nearbyDori=null,nearest=5.5;
  for(const [key,node] of Object.entries(S.nodes||{})){
   if(node.type!=="wildDori"||!node.hostile)continue;
   const [x,z]=key.split(",").map(Number),distance=Math.hypot(S.player.x-x,S.player.y-z);
   if(distance<nearest){nearest=distance;nearbyDori=node}
  }
  if(nearbyDori){
   v.doriAttackTimer=(v.doriAttackTimer||0)+dt;
   if(v.doriAttackTimer>=3.5){
    v.doriAttackTimer=0;v.health=Math.max(0,v.health-2.5);
    if(!E2E_MODE)toast("멍멍! 돌이가 달려와 장난스럽게 들이받았습니다. 거리를 벌려 보세요.","warn");
    log("돌이 숲 조우 · 잠시 물러나 안전거리를 확보하세요.");
   }
  }else v.doriAttackTimer=0;
 }else v.doriAttackTimer=0;
 if(v.health<=0)respawnEngineer();
}
function showCrystalPreview(id){if(!RESOURCE[id]||(!id.startsWith("doronium_")&&id!=="infinity"))return;if(crystalViewer){crystalViewer.dispose();crystalViewer=null}const title=RESOURCE[id].name,body='<div class="crystal-preview-wrap"><canvas id="crystal-preview-canvas" class="crystal-preview-canvas" aria-label="'+title+' 3D 결정 모델"></canvas><div class="crystal-preview-info"><strong>'+title+'</strong><p>보유량 '+fmt(itemCount(id))+'개 · 품질 '+Math.round(quality(S,id))+' · 순도 '+Math.round(purity(S,id))+'</p><small>결정 계열마다 서로 다른 3D 형상·재질·발광 특성을 적용했습니다.</small></div></div>';showModal("도로늄 3D 결정 도감",body,[{label:"닫기",cls:"primary"}]);crystalViewer=createCrystalViewer($("crystal-preview-canvas"),id)}
function selectTile(x,y){if(S.player.layer==="mine")return;const key=surfaceKey(x,y);if(selectedLandTool==="flatten"){const n=tileNode(x,y);if(n&&["water","wood","mineEntrance","relaySite","coreSite","dori"].includes(n.type)){toast("이 지형은 평탄화할 수 없습니다.","warn");return}if(buildingAt(x,y)){toast("시설이 있는 타일은 먼저 해체해야 합니다.","warn");return}const area=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const ax=x+dx,ay=y+dz,n=tileNode(ax,ay);if(ax<0||ay<0||ax>=WORLD_W||ay>=WORLD_H||buildingAt(ax,ay)||(n&&["water","wood","mineEntrance","dori","relaySite","coreSite"].includes(n.type)))continue;area.push({x:ax,y:ay})}const targetHeight=Math.round(area.reduce((v,p)=>v+terrainHeightAt(p.x,p.y),0)/Math.max(1,area.length)/3)*3;for(const p of area)S.flattened[surfaceKey(p.x,p.y)]={height:targetHeight};markSceneDirty();log("지표 평탄화 · "+key+" · "+area.length+"타일");markDirty();drawWorld();toast("지형 평탄화 완료 · 기초 타일을 설치하세요.");return}if(selectedLandTool==="foundation"){if(!S.flattened[key]){toast("기초 타일은 평탄화된 지형에만 설치할 수 있습니다.","warn");return}if(S.foundation[key]){toast("이미 기초 타일이 설치되어 있습니다.");return}if(!hasItems({wood:2,stone:2})){toast("기초 타일에는 목재 2개와 석재 2개가 필요합니다.","warn");return}if(!takeItems({wood:2,stone:2})){toast("기초 자재 차감에 실패했습니다.","warn");return}S.foundation[key]=true;markSceneDirty();log("기초 타일 설치 · "+key);markDirty();drawWorld();toast("산업용 기초 타일 설치 완료");return}const b=buildingAt(x,y);if(b){selectedBuild=null;selectedBuilding=b.uid;changePanel("factory");renderBuildList();renderMachineDetails();approachTile(x,y);drawWorld();openBuildingManagement(b);return}if(selectedBuild){if(placeBuilding(selectedBuild,x,y))approachTile(x,y);return}const node=tileNode(x,y);if(node){approachTile(x,y,()=>{const current=tileNode(x,y);if(current)harvestNode(x,y,current)});return}selectedBuilding=null;renderMachineDetails();movePlayerTo(x,y)}
function useTreeGrowthItem(itemId){
 if(S.player.layer!=="surface"){toast("나무 성장 아이템은 지상 숲에서만 사용할 수 있습니다.","warn");return}
 const rules={treeNutrition:{restore:18,boost:0,permanent:false,label:"나무 영양제"},treeGrowthAccelerator:{restore:55,boost:600,permanent:false,label:"나무 성장 촉진제"},treePermanentGrowthCatalyst:{restore:35,boost:0,permanent:true,label:"나무 영구 성장 촉진제"}};
 const rule=rules[itemId];if(!rule||availableItemCount(S,itemId)<1){toast("사용할 아이템이 부족합니다.","warn");return}
 const treeTypes=new Set(["wood","birchTree","rubberTree","barkTree","frozenTree","fireTree"]);
 let target=null,best=9;
 for(const [key,node] of Object.entries(S.nodes||{})){
  if(!treeTypes.has(node.type))continue;
  const [x,y]=key.split(",").map(Number),distance=Math.hypot(S.player.x-x,S.player.y-y);
  if(distance>8||distance>=best)continue;
  if((node.amount||0)>=Math.max(1,node.max||1)&&!rule.permanent)continue;
  target={key,node,x,y};best=distance;
 }
 if(!target){toast("주변 8타일 안에 성장시킬 나무가 없습니다. 나무 근처에서 사용하세요.","warn");return}
 if(!takeItem(itemId,1)){toast("아이템 차감에 실패해 사용하지 않았습니다.","warn");return}
 const node=target.node,max=Math.max(1,node.max||80);
 node.amount=Math.min(max,(node.amount||0)+rule.restore);
 if(rule.boost)node.growthBoostUntil=Math.max(Number(node.growthBoostUntil)||0,S.seconds+rule.boost);
 if(rule.permanent){node.permanentGrowth=true;node.growthProgress=Math.max(0,Number(node.growthProgress)||0)}
 if(rule.boost||rule.permanent){S.treeGrowthKeys??=[];if(!S.treeGrowthKeys.includes(target.key))S.treeGrowthKeys.push(target.key)}
 markVisibilityDirty();markDirty();
 log(rule.label+" 사용 · "+(RESOURCE[node.type]?.name||({wood:"소나무",birchTree:"자작나무",rubberTree:"고무나무",barkTree:"짖음의 나무",frozenTree:"냉동 나무",fireTree:"화염 나무"})[node.type])+" 성장 지원");
 toast(rule.label+" 사용 완료 · 나무 자원 "+rule.restore+" 회복"+(rule.permanent?" · 영구 성장 활성화":""));
 renderInventory();drawWorld();
}
function updateTreeGrowth(dt){
 const keys=S.treeGrowthKeys??=[],treeTypes=new Set(["wood","birchTree","rubberTree","barkTree","frozenTree","fireTree"]);
 let changed=false;
 for(let i=keys.length-1;i>=0;i--){
  const key=keys[i],node=S.nodes?.[key];
  if(!node||!treeTypes.has(node.type)||(!node.permanentGrowth&&Number(node.growthBoostUntil)<=S.seconds)){keys.splice(i,1);continue}
  if(node.amount>=node.max)continue;
  const rate=node.permanentGrowth?0.22:0.12;
  node.growthProgress=(Number(node.growthProgress)||0)+dt*rate;
  const whole=Math.floor(node.growthProgress);
  if(whole>0){
   const before=node.amount;node.amount=Math.min(node.max,node.amount+whole);
   node.growthProgress-=node.amount-before;
   if(before<=0&&node.amount>0)changed=true;
  }
 }
 if(changed)markVisibilityDirty();
}
function harvestNode(x,y,node){
 if(S.player.layer!=="surface"){toast("지하 광물은 광산 채굴 도구로 채취하세요.");return}
 if(node.amount<=0){toast("이 자원은 고갈되었습니다.","warn");return}
 const treeTypes=["wood","dori","birchTree","rubberTree","barkTree","frozenTree","fireTree"];
 if(treeTypes.includes(node.type)&&S.activeTool!=="axe"){toast("나무를 채집하려면 도끼를 장착하세요.","warn");return}
 if(node.type==="dori"){
  if(node.cooldown>0){toast("돌이 고기 나무가 열매를 다시 키우고 있습니다. "+Math.ceil(node.cooldown)+"초 남음","warn");return}
  if(availableItemCount(S,"water")<2){toast(itemCount("water")>=2?"물이 다른 공정에 예약되어 있습니다.":"돌이 고기 수확에는 물 2L가 필요합니다.","warn");return}
  if(!takeItem("water",2)){toast("물 차감에 실패해 수확을 진행하지 않았습니다.","warn");return}
  startNodeCooldown(x,y,node,60);
  addItem("doriMeat",1,{quality:90,purity:90,synthetic:false});
  addItem("doriFur",1,{quality:92,purity:96,synthetic:false});
  S.stats.gathered.doriMeat=(S.stats.gathered.doriMeat||0)+1;
  S.stats.gathered.doriFur=(S.stats.gathered.doriFur||0)+1;
  log("돌이 고기 나무 수확 · 돌이 털 원료 확보 · 비합성");
  toast("돌이 고기 +1 · 돌이 털 +1");
  playTone(760,.12,"sine");questCheck();renderAll();drawWorld();return;
 }
 const gatherSpec={
  wood:{drops:[["wood",3]],depletion:3},
  birchTree:{drops:[["birchWood",2]],depletion:1},
  rubberTree:{drops:[["rubberWood",2],["rubberSap",1]],depletion:1},
  barkTree:{drops:[["barkWood",2]],depletion:1},
  frozenTree:{drops:[["frozenWood",2]],depletion:1},
  fireTree:{drops:[["fireWood",2]],depletion:1},
  grassPatch:{drops:[["grass",3]],depletion:1},
  heatCrystalNode:{drops:[["heatCrystal",1]],depletion:1},
  coldCrystalNode:{drops:[["coldCrystal",1]],depletion:1},
  water:{drops:[["water",5]],depletion:5},
  stone:{drops:[["stone",2]],depletion:2}
 };
 const spec=gatherSpec[node.type];
 if(!spec){toast("이 자원은 현재 방식으로 채집할 수 없습니다. 원유는 시추기를 사용하세요.","warn");return}
 const drops=spec.drops,depletion=Math.min(node.amount,spec.depletion);
 node.amount-=depletion;if(node.amount<=0)markVisibilityDirty();
 for(const[id,qty]of drops){
  addItem(id,qty,{quality:node.type==="water"?100:86,purity:node.type==="water"?100:88,synthetic:false});
  S.stats.gathered[id]=(S.stats.gathered[id]||0)+qty;
 }
 const message=drops.map(([id,qty])=>RESOURCE[id].name+" +"+qty).join(" · ");
 log(message+" 채집");toast(message);playTone(420,.07,"triangle");questCheck();renderAll();drawWorld();
}
function collectOutput(b){if(!b.output){toast("회수할 출력물이 없습니다.","warn");return}addItem(b.output.id,b.output.qty,b.output.meta,false);toast(RESOURCE[b.output.id].name+" "+fmt(b.output.qty)+"개 회수");log("출력 회수 · "+RESOURCE[b.output.id].name);clearCompletionBuffer(b);b.status="IDLE";markDirty();renderAll()}
function supplyMachine(b){const r=recipeFor(b);if(!r){toast("이 시설은 수동 투입을 지원하지 않습니다.");return}let moved=0;for(const[id,n]of Object.entries(r.inputs)){const need=Math.max(0,n-(b.input?.[id]||0));const amount=Math.min(need,availableItemCount(S,id));if(amount>0){const m=takeItemDetailed(id,amount,"machine-supply:"+String(b.uid||b.type));if(!m)continue;addInput(b,id,amount,m);moved+=amount}}if(moved){toast("원료 "+moved+"개 투입 완료");markDirty()}else toast("투입 가능한 미예약 원료가 없습니다.","warn");renderMachineDetails();renderInventory()}
function removeBuilding(b){if(b.type==="fusion"&&S.fusionJob){toast("인피니티 퓨전 진행 중에는 퓨전 설비를 해체할 수 없습니다.","warn");return false}markSceneDirty();const d=buildingDef(b.type);const refund=Math.floor(d.cost*.55);S.money+=refund;for(const[id,n]of Object.entries(d.materials||{})){addItem(id,Math.floor(n*.5),{},false)}S.buildings=S.buildings.filter(x=>x.uid!==b.uid);if(d.catalogItemId)addItem(d.catalogItemId,1,{quality:100,purity:100,synthetic:false},false);if(b.type==="relay"){const i=S.sites.relay.findIndex(p=>p.x===b.x&&p.y===b.y);if(i>=0)S.relaySites[i]=false}if(b.type==="core")S.corePlaced=false;selectedBuilding=null;log(d.name+" 해체 · "+refund+" D 환급");toast("시설 해체 · "+refund+" D 환급");markDirty();renderAll()}
function chooseVariant(b){const choices=VARIANTS.filter(id=>id!=="doronium_normal");const body='<p>이 변환 연구로에서 제조할 결정 계열을 선택하세요. 레시피마다 원료와 처리 시간이 다릅니다.</p><select id="variant-select" class="modal-select">'+choices.map(id=>'<option value="'+id+'" '+(b.variant===id?"selected":"")+'>'+RESOURCE[id].name+'</option>').join("")+'</select>';showModal("결정 변환 레시피",body,[{label:"취소",cls:"secondary"},{label:"설정",cls:"primary",action:()=>{b.variant=$("variant-select").value;markDirty();renderMachineDetails();closeModal();toast("레시피 변경 완료")}}])}
function startResearch(id){const r=RESEARCH.find(x=>x.id===id);if(!r||S.research.includes(id))return;if(!hasBuilding(S,"lab")){toast("먼저 기술 연구소를 건설하세요.","warn");return}if(r.requires&&!r.requires.every(v=>S.research.includes(v))){toast("선행 연구가 완료되지 않았습니다.","warn");return}if(S.activeResearch){toast("다른 연구가 이미 진행 중입니다.","warn");return}const missing=Object.entries(r.need||{}).filter(([item,qty])=>availableItemCount(S,item)<qty).map(([item,qty])=>{const have=availableItemCount(S,item);return (RESOURCE[item]?.name||item)+" "+fmt(qty)+"개 필요 (사용 가능 "+fmt(have)+"개, "+fmt(qty-have)+"개 부족)"});if(S.money<r.cost||missing.length){const details=missing.length?"필요 자원: "+missing.join(" / "):"필요 자원은 충분하지만 연구 자금 "+fmt(r.cost-S.money)+" D가 부족합니다.";toast("연구를 시작할 수 없습니다. "+details,"warn");showModal("연구 자원 부족",'<p>「'+r.name+'」 연구를 시작하려면 다음 조건이 필요합니다.</p><div class="research-requirements">'+researchNeedsHTML(r)+'</div><p>연구 비용 <b>'+fmt(r.cost)+' D</b> · 보유 자금 <b>'+fmt(S.money)+' D</b></p>',[{label:"확인",cls:"primary"}]);return}if(!takeItems(r.need)){toast("연구 원료 차감에 실패했습니다. 연구를 시작하지 않았습니다.","warn");return}S.money-=r.cost;S.activeResearch=id;S.researchProgress=0;log("연구 시작 · "+r.name);toast(r.name+" 연구를 시작합니다.");markDirty();renderResearch();renderHud();updateResearchCountdownDisplays()}
function tickResearch(dt,ratio){if(!S.activeResearch)return;const r=RESEARCH.find(x=>x.id===S.activeResearch);if(!r){S.activeResearch=null;return}const labs=S.buildings.filter(b=>b.type==="lab").length;if(!labs){updateResearchCountdownDisplays();return}S.researchProgress+=dt*Math.max(0,ratio)*Math.min(2,1+(labs-1)*.35)*(S.research.includes("automation")?1.15:1);if(S.researchProgress>=r.time){S.research.push(r.id);awardResearchTierSkillPoints();S.activeResearch=null;S.researchProgress=0;log("연구 완료 · "+r.name,"good");toast("기술 연구 완료 · "+r.name);$("orbit-dialogue").textContent="“"+r.name+" 연구 데이터가 연구소에 등록되었습니다.”";playTone(820,.22,"triangle");markDirty();renderResearch();renderBuildList();renderMissions();questCheck()}else updateResearchCountdownDisplays()}
function abortFusionJob(reason){const job=S.fusionJob;if(!job)return;let released=0;if(job.inputCustody==="reserved"){released=releaseFusionInputs(S,job.reservationIDs||[]);syncLegacyInventory(S)}S.fusionJob=null;const detail=released?reason+" · 예약 원료 1,500개를 창고로 반환했습니다.":reason;log("퓨전 중단 · "+detail,"warn");toast(detail,"warn");markDirty();renderFactory();renderInventory()}
function updateFusion(dt){
 if(S.factoryAutomationPaused||!S.fusionJob)return;
 const job=S.fusionJob,b=S.buildings.find(x=>x.type==="fusion");
 if(!b){abortFusionJob("퓨전 설비를 찾을 수 없어 공정이 중단되었습니다.");return}
 if(job.inputCustody==="reserved"&&!validateFusionReservations(S,VARIANTS,job.reservationIDs)){
  abortFusionJob("퓨전 입력 예약 검증에 실패했습니다. 원료를 안전하게 반환했습니다.");return
 }
 const stage=FUSION_STAGES[job.stage];
 if(!stage){abortFusionJob("퓨전 단계 데이터가 올바르지 않아 공정을 중단했습니다.");return}
 const p=currentPower(),fusionPowerRatio=powerRatioForBuilding(b,p);b.temp+=(stage.temp-b.temp)*Math.min(1,dt*.045);b.pressure+=(stage.pressure-b.pressure)*Math.min(1,dt*.06);
 const tempOK=Math.abs(b.temp-stage.temp)<=Math.max(50,stage.temp*.1),pressureOK=Math.abs(b.pressure-stage.pressure)<=Math.max(25,stage.pressure*.1);
 if(fusionPowerRatio>=.8&&p.gen>=stage.power&&tempOK&&pressureOK){job.progress+=dt*(fusionPowerRatio>=1?1:fusionPowerRatio);b.status="RUNNING"}
 else b.status=p.ratio<.8||p.gen<stage.power?"PAUSED_POWER":"CALIBRATING";
 if(job.progress>=stage.time){
  log("퓨전 단계 완료 · "+stage.name,"good");job.stage++;job.progress=0;
  if(job.stage>=FUSION_STAGES.length){
   if(job.inputCustody==="reserved"){
    const committed=commitFusionInputs(S,VARIANTS,job.reservationIDs);
    if(!committed.ok){abortFusionJob("퓨전 원료 확정에 실패했습니다. 출력 결정을 생성하지 않았습니다.");return}
    syncLegacyInventory(S);
   }
   S.fusionJob=null;S.fusionDone=true;addItem("infinity",1,{quality:100,purity:100,synthetic:false});
   log("인피니티 도로늄 결정화 성공 · 정확히 1개 출력","good");toast("인피니티 도로늄 제작 성공!");
   $("orbit-dialogue").textContent="“Infinity Doronum secured. Three stabilization relays are still required.”";
   showModal("INFINITY DORONUM 생성 완료","<p>7단계 결정화 공정이 완료되었습니다. 인피니티 도로늄 1개가 창고에 등록되었습니다.</p><p>이제 지정된 행성 에너지 노드 3곳에 릴레이를 설치하고 중앙 코어를 완성하세요.</p>",[{label:"계속 진행",cls:"primary",action:closeModal}]);
  }else toast("퓨전 "+(job.stage+1)+"/7 단계로 이동합니다.");
  markDirty();renderMissions();renderFactory();renderInventory();
 }
}
function startFusion(){
 if(S.fusionJob){toast("이미 퓨전이 진행 중입니다.");return}
 if(!S.buildings.some(b=>b.type==="fusion")){toast("인피니티 퓨전 설비가 필요합니다.","warn");return}
 if(!S.buildings.some(b=>b.type==="cooling")){toast("초전도 냉각탑을 먼저 건설하세요.","warn");return}
 const p=currentPower();
 if(p.gen<40||p.ratio<.8){toast("퓨전에 필요한 전력 40kW 이상을 확보하세요.","warn");return}
 const invalid=VARIANTS.filter(id=>availableItemCount(S,id)<100||quality(S,id)<90||purity(S,id)<90||synthetic(S,id));
 if(invalid.length){toast("재료 검증 실패 · "+invalid.map(id=>RESOURCE[id].name).slice(0,2).join(", ")+" 외 "+invalid.length+"종 부족","warn");return}
 showModal("인피니티 퓨전 시작","<p>현재 게임의 15개 결정 계열에서 각 100개, 총 1,500개를 공정에 예약합니다.</p><p>각 입력 스택은 품질 90 이상·순도 90 이상·비합성인지 다시 검사합니다. 예약 중에는 판매·투입·다른 제작에 사용할 수 없으며, 공정이 완료될 때까지 창고 수량으로 보존됩니다.</p><p>설비 제거 또는 예약 오류가 발생하면 예약 원료를 창고로 돌려보냅니다. 7단계의 이상적 가동 시간은 260초입니다.</p>",[{label:"취소",cls:"secondary"},{label:"퓨전 시작",cls:"gold",action:()=>{
  const reserved=reserveFusionInputs(S,VARIANTS);
  if(!reserved.ok){
   const message=reserved.reason==="INPUT_QUALITY_OR_PROVENANCE_REJECTED"?"실제 투입 스택의 품질·순도·합성 여부 검증에 실패했습니다.":"15종 원료를 각 100개씩 확보하거나 예약하는 데 실패했습니다.";
   toast(message,"warn");closeModal();return;
  }
  S.fusionJob={stage:0,progress:0,startedAt:S.seconds,inputCustody:"reserved",reservationIDs:reserved.reservationIDs};
  syncLegacyInventory(S);
  const b=S.buildings.find(x=>x.type==="fusion");if(b){b.temp=25;b.pressure=0}
  log("인피니티 퓨전 시작 · 1,500개 입력 원료 예약 및 잠금");toast("INFINITY FUSION STARTED");closeModal();markDirty();renderFactory();renderInventory();
 }}])
}
function installCore(b){if(!S.fusionDone||availableItemCount(S,"infinity")<1){toast("사용 가능한 인피니티 도로늄 1개가 필요합니다.","warn");return}if(!S.research.includes("planet")){toast("행성 안정화 프로토콜 연구를 완료하세요.","warn");return}if(!S.relaySites.every(Boolean)){toast("행성 안정화 릴레이 3개가 모두 필요합니다.","warn");return}if(!takeItem("infinity",1))return;S.coreInstalled=true;b.status="INSTALLED";log("인피니티 도로늄을 중앙 코어에 설치");toast("중앙 안정화 코어 설치 완료");showModal("행성 안정화 준비 완료","<p>3개 릴레이와 중앙 코어가 연결되었습니다. ORBIT의 최종 동기화 프로토콜을 실행할 수 있습니다.</p>",[{label:"계속",cls:"secondary"},{label:"행성 안정화 실행",cls:"gold",action:()=>{closeModal();finishPlanetary()}}]);markDirty();renderAll()}
function finishPlanetary(){if(!S.coreInstalled||!S.relaySites.every(Boolean)){toast("안정화 필수 조건을 충족하지 못했습니다.","warn");return}S.victory=true;S.questIndex=QUESTS.length;log("PLANETARY STABILIZATION COMPLETE","good");$("orbit-dialogue").textContent="“Energy network synchronization complete. Planetary instability: decreasing. Factory status: OPERATIONAL.”";markDirty();renderAll();showModal("PLANETARY STABILIZATION COMPLETE","<div class='ending-visual'>💠</div><h3>돌돌행성의 에너지 네트워크가 안정화되었습니다.</h3><p>공장 전체에 푸른 에너지 흐름이 연결되었습니다. 폐허에서 시작한 작은 산업 기지가 행성을 지키는 거대한 산업 네트워크로 성장했습니다.</p><p><b>DORONIUM FACTORY · INFINITE INDUSTRY</b><br>FINAL STATUS: OPERATIONAL</p>",[{label:"엔딩 보기",cls:"gold",action:closeModal}]);playTone(920,.5,"sine")}

function tickBuilding(b,dt,power){const d=buildingDef(b.type);if(!d)return;const localRatio=powerRatioForBuilding(b,power);
 if(b.type==="catalog_control_computer"){b.status=localRatio>=.8?"RUNNING":"PAUSED_POWER";return}
 if(["catalog_air_conditioner","catalog_fan","catalog_heater"].includes(b.type)){b.status=power.ratio>=.8?"RUNNING":"PAUSED_POWER";return}
 const automationControlled=d.kind==="machine"||d.kind==="reactor"||d.kind==="variant"||["catalog_resource_copier","catalog_item_copier","catalog_auto_miner","catalog_oil_drill","catalog_dori_harvester","doriFarm"].includes(b.type);
 if(S.factoryAutomationPaused&&automationControlled){b.status="PAUSED_CONTROL";return}
 if(b.type==="coalgen"){if(b.fuelTimer<=0){if(takeItem("coal",1)){b.fuelTimer=24;log("화력 발전소 석탄 투입")}else b.status="NO_INPUT"}else{b.fuelTimer=Math.max(0,b.fuelTimer-dt);b.status="RUNNING"}return}if(d.generation==="coal"||d.generation==="doronium"){if(b.fuelTimer<=0){const fuel=d.generation==="coal"?"coal":"doronium_normal";if(takeItem(fuel,1)){b.fuelTimer=d.generation==="coal"?28:45;log(d.name+" 연료 투입 · "+RESOURCE[fuel].name)}else b.status="NO_INPUT"}else{b.fuelTimer=Math.max(0,b.fuelTimer-dt);b.status="RUNNING"}return}
 if(b.type==="catalog_resource_copier"||b.type==="catalog_item_copier"){
  const ratio=power.ratio,copyID=b.copyItemId,item=RESOURCE[copyID];
  if(b.output){b.status="PAUSED_OUTPUT";return}
  if(!item){b.status="CONFIG_REQUIRED";return}
  if(b.type==="catalog_resource_copier"&&!["raw","material","rare","special","doronium","final"].includes(item.kind)){b.status="INVALID_COPY_TARGET";return}
  if(availableItemCount(S,copyID)<1){b.status="NO_INPUT";return}
  if(ratio<.8){b.status="PAUSED_POWER";return}
  b.progress=(b.progress||0)+dt*(ratio>=1?1:ratio);b.status="RUNNING";
  const duration=b.type==="catalog_resource_copier"?30:45;
  if(b.progress>=duration){
   const sourceQuality=quality(S,copyID),sourcePurity=purity(S,copyID);
   if(createOutput(b,copyID,1,{quality:Math.max(55,sourceQuality-5),purity:Math.max(50,sourcePurity-3),synthetic:true})){
    b.progress=0;b.copyCount=(b.copyCount||0)+1;
    log((d.name||"복사기")+" 생산 · "+item.name+" · 합성 복제품");
   }
  }
  return;
 }
 if(d.kind==="power"||d.kind==="utility"||b.type==="solar"||b.type==="wind"||b.type==="cooling"||b.type==="storage"||b.type==="warehouse"||b.type==="market"||isBeltType(b.type)||b.type==="relay"||b.type==="core"||b.type==="lab")return;
 const ratio=localRatio;
 if(b.output){b.status="PAUSED_OUTPUT";return}
 if(b.type==="minerIron"||b.type==="minerCopper"||b.type==="minerCoal"||d.kind==="miner"){if(ratio<.8){b.status="PAUSED_POWER";return}const node=tileNode(b.x,b.y);if(!node||node.amount<=0){b.status="DEPLETED";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=8){b.progress=0;node.amount=Math.max(0,node.amount-1);const id=d.resource;createOutput(b,id,1,{quality:86+(node.seed%12),purity:88,synthetic:false});}return}
 if(b.type==="pump"){if(ratio<.8){b.status="PAUSED_POWER";return}const node=tileNode(b.x,b.y);if(!node||node.amount<=0){b.status="DEPLETED";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=5){b.progress=0;node.amount=Math.max(0,node.amount-3);createOutput(b,"water",3,{quality:100,purity:100,synthetic:false})}return}
 if(b.type==="catalog_oil_drill"){if(ratio<.8){b.status="PAUSED_POWER";return}const node=tileNode(b.x,b.y);if(!node||node.type!=="oil"||node.amount<=0){b.status="NO_INPUT";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=12){b.progress=0;node.amount=Math.max(0,node.amount-1);createOutput(b,"crudeOil",1,{quality:90,purity:88,synthetic:false})}return}if(b.type==="catalog_auto_miner"){if(ratio<.8){b.status="PAUSED_POWER";return}const mineId=linkedMineId(b),deposits=Object.values(getMineDeposits(mineId)).filter(node=>node.amount>0).sort((a,b)=>a.level-b.level||b.amount-a.amount);const deposit=deposits[0];if(!deposit){b.status="DEPLETED";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=18){b.progress=0;deposit.amount=Math.max(0,deposit.amount-1);createOutput(b,deposit.type,1,{quality:84+Math.min(14,deposit.level*2),purity:90,synthetic:false});log(mineName(mineId)+" 자동 채굴 · "+RESOURCE[deposit.type].name+" · "+deposit.level+"층")}return}if(b.type==="doriFarm"||b.type==="catalog_dori_harvester"){if(ratio<.8){b.status="PAUSED_POWER";return}const target=findNearbyDoriNode(b.x,b.y),node=target?.node;if(!node){b.status="NO_INPUT";return}if(node.cooldown>0){b.status="GROWING";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=60){if(availableItemCount(S,"water")<2){b.status="NO_INPUT";b.progress=59;return}if(!takeItem("water",2)){b.status="NO_INPUT";return}startNodeCooldown(target.x,target.y,node,60);b.progress=0;if(createOutput(b,"doriMeat",1,{quality:S.research.includes("bio")?95:92,purity:90,synthetic:false}))addItem("doriFur",1,{quality:92,purity:96,synthetic:false})}return}
 if(d.kind==="machine"||d.kind==="reactor"||d.kind==="variant"){tickMachine(b,dt,ratio);return}
}
function recipeHasSyntheticInput(b,r){
 const reservedByStack=new Map();
 for(const reservation of Object.values(ensureItemStacks(S).reservations||{})){
  if(reservation.status!=="reserved")continue;
  for(const allocation of reservation.allocations||[])reservedByStack.set(allocation.stackID,(reservedByStack.get(allocation.stackID)||0)+allocation.quantity);
 }
 for(const[id,n]of Object.entries(r.inputs)){
  let remaining=Math.max(0,Number(n)||0);
  const buffered=Math.min(remaining,Math.max(0,Number(b.input?.[id])||0));
  if(buffered>0&&b.inputMeta?.[id]?.synthetic)return true;
  remaining-=buffered;
  for(const stack of S.runtime.itemStacks){
   if(stack.itemID!==id||remaining<=0)continue;
   const free=Math.max(0,stack.quantity-(reservedByStack.get(stack.runtimeID)||0));
   const consumed=Math.min(free,remaining);
   if(consumed>0&&stack.synthetic)return true;
   remaining-=consumed;
  }
 }
 return false;
}
function tickMachine(b,dt,ratio){
 if(S.factoryAutomationPaused){b.status="PAUSED_CONTROL";return}
 const r=recipeFor(b);if(!r){b.status="ERROR";b.errorCode="NO_RECIPE";return}
 if(b.output){b.status="PAUSED_OUTPUT";return}
 if(Number(b.condition??b.durability??100)<=0){b.condition=0;b.status="BROKEN";return}
 const power=resolveMachinePower(ratio,buildingDef(b.type)?.power||0);
 if(!b.activeMeta){
  if(!canConsumeRecipe(b,r)){b.status="WAITING_INPUT";return}
  if((b.type==="reactor"||r.requiresNonSynthetic===true)&&recipeHasSyntheticInput(b,r)){b.status="ERROR";b.errorCode="SYNTHETIC_DORONUM_INPUT";return}
  if(!power.canProgress){b.status="PAUSED_POWER";return}
  const meta=consumeRecipe(b,r);if(!meta){b.status="WAITING_INPUT";return}
  b.activeMeta=meta;b.activeRecipe=r.name;b.temp=Number.isFinite(Number(b.temp))?b.temp:25;b.pressure=Number.isFinite(Number(b.pressure))?b.pressure:0;b.progress=0;
 }
 const environment=advanceMachineEnvironment(b,r,dt,ratio);
 if(!power.canProgress){b.status="PAUSED_POWER";return}
 if(!environment.safe){b.status="COOLING";return}
 const wear=applyMachineWear(b,r,dt,ratio);
 if(wear.broken){b.status="BROKEN";b.activeFailureReason="CONDITION_DEPLETED";return}
 if(wear.maintenanceRecommended)b.maintenanceRecommended=true;
 b.progress+=dt*power.progressMultiplier*wear.progressMultiplier;
 b.status=power.status;
 if(b.progress<r.time)return;
 const id=b.type==="variantLab"?b.variant||"doronium_blue":r.output;
 const qualityOut=calculateOutputQuality({materialQuality:b.activeMeta.quality,temperatureQuality:environment.temperatureQuality,pressureQuality:environment.pressureQuality,machineConditionQuality:wear.condition,powerStability:clamp(ratio*100,0,100),recipeModifier:(Number(r.qualityModifier)||0)+(r.allowSkillQualityBonus===true?calculateSkillBonuses(S.skills).recipeQualityModifier:0),pollutionPenalty:Number(b.pollutionPenalty)||0});
 const purityOut=calculateOutputPurity({inputPurity:b.activeMeta.purity,processLoss:Number(r.purityLoss??2),purificationBonus:S.research.includes("purity")?12:0,modifier:S.research.includes("chemistry")?2:0});
 const meta={quality:qualityOut,purity:purityOut,synthetic:b.activeMeta.synthetic};
 if(createOutput(b,id,r.qty||1,meta)){b.progress=0;b.activeMeta=null;b.activeRecipe=null}
}
function logisticsDirection(b,item){
 if(b.type==="catalog_sorter"&&b.filterItemId&&item.id!==b.filterItemId)return ((b.dir||1)+1)%4;
 if(b.type==="catalog_distributor"){
  const choices=[0,1,2,3].map(offset=>((b.dir||1)+((b.distributionCursor||0)+offset))%4);
  const route=choices.find(dir=>{
   const vector=DIRS[dir],next=buildingAt(b.x+vector.x,b.y+vector.y);
   return !!next&&(isBeltType(next.type)||["storage","warehouse","market","catalog_shipping_center","catalog_quality_checker","catalog_auto_quality_checker"].includes(next.type)||["machine","reactor","variantLab"].includes(buildingDef(next.type)?.kind));
  });
  if(route!==undefined){b.distributionCursor=((choices.indexOf(route)+1)%4);return route}
 }
 return Number.isInteger(b.outputDir)?b.outputDir:(b.dir||1);
}
function ensureMineElevatorBuffer(level,mineId=PRIMARY_MINE_ID){
 const mine=getMineInstance(mineId);if(!mine)return {};
 mine.elevatorBuffers??={};const key=String(clamp(Number(level)||1,1,MINE_LEVELS));
 mine.elevatorBuffers[key]??={};return mine.elevatorBuffers[key];
}
function elevatorBufferSummary(level,mineId=PRIMARY_MINE_ID){
 const buffer=ensureMineElevatorBuffer(level,mineId);
 return Object.entries(buffer).filter(([,stack])=>Number(stack?.quantity)>0).map(([id,stack])=>({id,quantity:Number(stack.quantity)||0,quality:Number(stack.quality)||90,purity:Number(stack.purity)||90,synthetic:!!stack.synthetic}));
}
function storeInMineElevator(level,id,quantity,meta={},mineId=PRIMARY_MINE_ID){
 const buffer=ensureMineElevatorBuffer(level,mineId),existing=buffer[id]||{quantity:0,quality:90,purity:90,synthetic:false};
 const oldQuantity=Math.max(0,Number(existing.quantity)||0),incoming=Math.max(0,Number(quantity)||0),total=oldQuantity+incoming;
 if(total<=0)return false;
 buffer[id]={quantity:total,quality:(oldQuantity*existing.quality+incoming*(Number(meta.quality)||90))/total,purity:(oldQuantity*existing.purity+incoming*(Number(meta.purity)||90))/total,synthetic:!!existing.synthetic||!!meta.synthetic};
 markDirty();return true;
}
function transferElevatorBuffer(building,action){
 const mineId=linkedMineId(building),mine=mineName(mineId);
 const level=clamp(Number($("machine-lift-level")?.value||building.liftLevel||1),1,MINE_LEVELS);
 const id=$("machine-lift-item")?.value||"";
 const qty=Math.max(1,Math.floor(Number($("machine-lift-quantity")?.value)||1));
 const buffer=ensureMineElevatorBuffer(level,mineId);
 if(action==="load"){
  if(!id||availableItemCount(S,id)<qty){toast("창고에 이 아이템의 사용 가능한 수량이 부족합니다.","warn");return}
  const meta=takeItemDetailed(id,qty,"mine-elevator:"+mineId+":"+level);
  if(!meta){toast("아이템 이동 예약에 실패했습니다.","warn");return}
  storeInMineElevator(level,id,qty,meta,mineId);
  log("아이템 엘리베이터 · "+mine+" "+level+"층으로 "+(RESOURCE[id]?.name||id)+" × "+qty+" 이송");
  toast(mine+" "+level+"층 물류 버퍼에 "+(RESOURCE[id]?.name||id)+" "+qty+"개 적재");
 }else{
  const stack=buffer[id],have=Math.max(0,Number(stack?.quantity)||0),amount=Math.min(qty,have);
  if(!amount){toast("선택한 광산의 층에 가져올 아이템이 없습니다.","warn");return}
  addItem(id,amount,{quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic},false);
  stack.quantity-=amount;if(stack.quantity<=0)delete buffer[id];
  log("아이템 엘리베이터 · "+mine+" "+level+"층에서 "+(RESOURCE[id]?.name||id)+" × "+amount+" 회수");
  toast(mine+" "+level+"층에서 "+(RESOURCE[id]?.name||id)+" "+amount+"개 회수");
 }
 building.mineId=mineId;building.liftLevel=level;markDirty();renderMachineDetails();renderInventory();
}
function acceptFactoryLogisticsItem(target,item){
 const type=target.type,copy={id:item.id,qty:item.qty,meta:{...(item.meta||{})}};
 if(type==="storage"||type==="warehouse"){
  addItem(copy.id,copy.qty,copy.meta,false);log("물류 센터 회수 · "+(RESOURCE[copy.id]?.name||copy.id));return true;
 }
 if(type==="market"){
  const earned=Math.floor(copy.qty*(RESOURCE[copy.id]?.price||0)*.8);
  S.money+=earned;S.stats.sold+=copy.qty;log("산업 거래소 자동 거래 · "+fmt(earned)+" D");return true;
 }
 if(type==="catalog_shipping_center"){
  const earned=Math.floor(copy.qty*(RESOURCE[copy.id]?.price||0)*.95);
  S.money+=earned;S.stats.sold+=copy.qty;target.shipped=(target.shipped||0)+copy.qty;target.lastShipment=copy.id;
  target.status="SHIPPED";log("출하 센터 정산 · "+(RESOURCE[copy.id]?.name||copy.id)+" × "+fmt(copy.qty)+" · "+fmt(earned)+" D");return true;
 }
 if(type==="catalog_quality_checker"||type==="catalog_auto_quality_checker"){
  if(target.output)return false;
  const quality=Number(copy.meta.quality??90),purity=Number(copy.meta.purity??90);
  const threshold=type==="catalog_auto_quality_checker"?92:80;
  if(quality>=threshold&&purity>=threshold){
   target.output=copy;target.outputDir=target.dir??1;target.status="QUALITY_PASS";target.passed=(target.passed||0)+copy.qty;
   log("품질 검사 통과 · "+(RESOURCE[copy.id]?.name||copy.id)+" · 품질 "+Math.round(quality)+" / 순도 "+Math.round(purity));
  }else{
   target.rejected=(target.rejected||0)+copy.qty;target.status="QUALITY_REJECTED";
   addItem(copy.id,copy.qty,copy.meta,false);
   log("품질 검사 반려 · 창고 반환 · "+(RESOURCE[copy.id]?.name||copy.id)+" · 품질 "+Math.round(quality)+" / 순도 "+Math.round(purity),"warn");
  }
  return true;
 }
 const elevatorTypes=["catalog_item_elevator","catalog_water_elevator","catalog_maglev_elevator"];
 if(elevatorTypes.includes(type)){
  const fluidItems=new Set(["water","waterBottle","waterBucket","lavaBucket","crudeOil","oil"]);
  if(type==="catalog_water_elevator"&&!fluidItems.has(copy.id))return false;
  const level=clamp(Number(target.liftLevel)||1,1,MINE_LEVELS);
  if((target.liftDirection||"down")==="up"){
   addItem(copy.id,copy.qty,copy.meta,false);
   target.liftedUp=(target.liftedUp||0)+copy.qty;
   log("수직 엘리베이터 · 창고 방향 "+(RESOURCE[copy.id]?.name||copy.id)+" × "+copy.qty);
  }else{
   storeInMineElevator(level,copy.id,copy.qty,copy.meta,linkedMineId(target));
   target.liftedDown=(target.liftedDown||0)+copy.qty;
   log("수직 엘리베이터 · 광산 "+level+"층 "+(RESOURCE[copy.id]?.name||copy.id)+" × "+copy.qty);
  }
  target.status="ELEVATING";return true;
 }
 const routed=["catalog_sorter","catalog_merger","catalog_distributor","catalog_magnetic_inserter"];
 if(routed.includes(type)){
  if(target.output)return false;
  target.output=copy;
  target.outputDir=logisticsDirection(target,copy);
  target.status=type==="catalog_sorter"?"SORTING":type==="catalog_distributor"?"DISTRIBUTING":type==="catalog_merger"?"MERGING":type.includes("elevator")?"ELEVATING":"INSERTING";
  return true;
 }
 const kind=buildingDef(type)?.kind;
 if(["machine","reactor","variantLab"].includes(kind)||["machine","reactor","variantLab"].includes(type)){
  addInput(target,copy.id,copy.qty,copy.meta);target.status="WAITING_INPUT";return true;
 }
 return false;
}
function tickBelts(dt){
 for(const b of S.buildings){
  if(!isBeltType(b.type)||!b.item)continue;
  b.moveTimer=(b.moveTimer||0)+dt;if(b.moveTimer<.75)continue;b.moveTimer=0;
  const dir=DIRS[b.dir||1],nx=b.x+dir.x,ny=b.y+dir.y,target=buildingAt(nx,ny);
  if(target){if(acceptFactoryLogisticsItem(target,b.item)){b.item=null;markDirty()}continue}
  const next=S.buildings.find(x=>x.x===nx&&x.y===ny&&isBeltType(x.type));
  if(next&&!next.item){next.item=b.item;b.item=null;next.moveTimer=.45;markDirty()}
 }
 for(const b of S.buildings){
  if(!b.output)continue;
  const direction=Number.isInteger(b.outputDir)?b.outputDir:(b.dir||1),dir=DIRS[direction],nx=b.x+dir.x,ny=b.y+dir.y,target=buildingAt(nx,ny);
  if(!target)continue;
  if(isBeltType(target.type)&&!target.item){
   target.item={...b.output};target.moveTimer=.45;clearCompletionBuffer(b);b.status="IDLE";b.outputDir=null;markDirty();
  }else if(acceptFactoryLogisticsItem(target,b.output)){
   clearCompletionBuffer(b);if(b.status!=="QUALITY_PASS"&&b.status!=="QUALITY_REJECTED")b.status="IDLE";b.outputDir=null;markDirty();
  }
 }
}
function tick(dt){
 if(S.paused||S.victory)return;
 const context={state:S,dt,power:null};
 runCanonicalTick(context,{
  STATE_READ(){S.seconds+=dt;S.tick++;if(!E2E_MODE)updateSurvival(dt);if(S.tick%100===0)updateTreeGrowth(10);ensureCooldownIndex();for(const key of activeCooldownKeys){const node=S.nodes?.[key];if(!node||!(node.cooldown>0)){activeCooldownKeys.delete(key);continue}node.cooldown=Math.max(0,node.cooldown-dt);if(node.cooldown<=0)activeCooldownKeys.delete(key)}},
  PRODUCTION_STATE(){for(const b of S.buildings){if(b.type==="coalgen"&&b.fuelTimer<=0&&availableItemCount(S,"coal")>0&&takeItem("coal",1)){b.fuelTimer=24;b.status="RUNNING"}}},
  POWER_RESOLVE(){context.power=currentPower()},
  PRODUCTION_PROGRESS(){for(const b of S.buildings)tickBuilding(b,dt,context.power||currentPower())},
  POWER_STABILITY(){context.power=currentPower()},
  CONVEYOR_TRANSFER(){tickBelts(dt)},
  METRICS(){tickResearch(dt,(context.power||currentPower()).ratio);if(S.fusionJob)updateFusion(dt);if(S.tick%10===0){questCheck();if(!E2E_MODE){renderHud();if(activePanel==="factory")renderFactory();if(activePanel==="inventory")renderInventory();if(activePanel==="mission")renderMissions();if(activePanel==="research")renderResearch()}}},
  SAVE_SNAPSHOT_REQUEST(){if(S.tick%5===0){S.runtime.saveSnapshotRequested=true;markDirty()}else S.runtime.saveSnapshotRequested=false}
 });
}
function renderEventsSafe(){try{renderEvents()}catch{}}
function startMiningClick(x,y){const node=tileNode(x,y);if(node){harvestNode(x,y,node);return}S.player.x=x;S.player.y=y;revealAround();world3d.center(x,y);markDirty();drawWorld()}
function canvasSize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.floor(r.width*dpr),h=Math.floor(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(dpr,0,0,dpr,0,0);return {w:r.width,h:r.height}}
function tileScreen(x,y,w,h){const size=TILE*camera.zoom;return {x:(x-camera.x)*size+w/2,y:(y-camera.y)*size+h/2,size}}
function screenTile(px,py){return world3d.pickTile(px,py)||{x:-1,y:-1,z:-1}}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawTile(x,y,w,h){const p=tileScreen(x,y,w,h),s=p.size,node=tileNode(x,y),seed=(x*928371+y*192811)%17;ctx.fillStyle=seed%3===0?"#193d43":seed%3===1?"#17383c":"#183a3d";ctx.fillRect(p.x,p.y,s,s);ctx.strokeStyle="#244a4b";ctx.lineWidth=.8;ctx.strokeRect(p.x,p.y,s,s);
 if((x+y)%4===0){ctx.fillStyle="#39635a66";ctx.fillRect(p.x+s*.15,p.y+s*.22,2,2)}
 if(node?.type==="water"){ctx.fillStyle="#124b66";ctx.fillRect(p.x+2,p.y+2,s-4,s-4);ctx.fillStyle="#257c93";ctx.fillRect(p.x+7,p.y+8,s-14,s-17);ctx.fillStyle="#63c9d066";ctx.fillRect(p.x+10,p.y+12,s*.42,2)}
 if(node&&S.seen[x+","+y])drawNode(node,p.x,p.y,s);
 const b=buildingAt(x,y);if(b)drawBuilding(b,p.x,p.y,s);
 if(!S.seen[x+","+y]){ctx.fillStyle="#061320d8";ctx.fillRect(p.x,p.y,s,s)}
 if(x===S.player.x&&y===S.player.y){ctx.save();ctx.shadowColor="#f2d28a";ctx.shadowBlur=18;ctx.fillStyle="#f3d99e";ctx.beginPath();ctx.arc(p.x+s/2,p.y+s/2,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#16364a";ctx.beginPath();ctx.arc(p.x+s/2,p.y+s/2,5,0,Math.PI*2);ctx.fill();ctx.font="13px sans-serif";ctx.textAlign="center";ctx.fillText("👷",p.x+s/2,p.y+s/2+4);ctx.restore()}
 if(selectedBuilding&&b?.uid===selectedBuilding){ctx.strokeStyle="#7de5e7";ctx.lineWidth=2;ctx.strokeRect(p.x+2,p.y+2,s-4,s-4)}
 if(selectedBuild&&hoverCell?.x===x&&hoverCell?.y===y){ctx.strokeStyle="#f2d17d";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(p.x+2,p.y+2,s-4,s-4);ctx.setLineDash([])}
}
function drawNode(node,x,y,s){let icon="",label="";switch(node.type){case"wood":icon="🌲";label="목재";break;case"stone":icon="🪨";label="석재";break;case"ironOre":icon="⛏️";label="철";break;case"copperOre":icon="🟠";label="구리";break;case"coal":icon="⬛";label="석탄";break;case"water":icon="";label="수원";break;case"quartz":icon="🔹";label="석영";break;case"goldOre":icon="🟡";label="금";break;case"diamond":icon="💠";label="희귀";break;case"dori":icon="🌳";label="돌이 나무";break;case"relaySite":icon="📡";label="릴레이";break;case"coreSite":icon="◎";label="코어 부지";break}
 if(!icon)return;ctx.save();ctx.textAlign="center";ctx.shadowColor=node.type==="dori"?"#63e4bb":"#a6e6df";ctx.shadowBlur=node.type==="dori"?12:5;ctx.font=Math.round(s*.42)+"px sans-serif";ctx.fillText(icon,x+s/2,y+s*.58);ctx.shadowBlur=0;ctx.font="8px Inter, sans-serif";ctx.fillStyle="#d3e8e6";ctx.fillText(label,x+s/2,y+s*.82);if(node.cooldown>0&&node.type==="dori"){ctx.fillStyle="#081a2caa";rounded(ctx,x+s*.18,y+s*.15,s*.64,s*.18,4);ctx.fill();ctx.fillStyle="#d2b879";ctx.font="7px sans-serif";ctx.fillText(Math.ceil(node.cooldown)+"s",x+s/2,y+s*.28)}ctx.restore()}
function drawBuilding(b,x,y,s){const d=buildingDef(b.type);if(!d)return;ctx.save();const active=b.status==="RUNNING";ctx.shadowColor=active?"#4dd9e8aa":"#0008";ctx.shadowBlur=active?13:6;const grad=ctx.createLinearGradient(x,y,x+s,y+s);grad.addColorStop(0,b.type==="fusion"?"#365d78":b.type==="reactor"?"#24596a":"#29485c");grad.addColorStop(1,"#0d2235");ctx.fillStyle=grad;rounded(ctx,x+4,y+4,s-8,s-8,8);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=active?"#63d6d7":"#54748a";ctx.lineWidth=active?1.7:1;ctx.stroke();ctx.fillStyle="#cbe2eb";ctx.font=Math.round(s*.4)+"px sans-serif";ctx.textAlign="center";ctx.fillText(d.icon,x+s/2,y+s*.57);ctx.fillStyle="#d8e9ed";ctx.font="7px Inter,sans-serif";ctx.fillText(d.name.slice(0,8),x+s/2,y+s*.86);if(b.output){ctx.fillStyle="#f1c66d";ctx.beginPath();ctx.arc(x+s*.83,y+s*.18,4,0,Math.PI*2);ctx.fill()}if(active){ctx.strokeStyle="#68e3cc";ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(x+s/2,y+s/2,s*.37+Math.sin(drawTime/240)*2,0,Math.PI*2);ctx.stroke()}if(b.type==="belt"){ctx.strokeStyle="#a4d5df";ctx.lineWidth=2.5;const dir=DIRS[b.dir||1];ctx.beginPath();ctx.moveTo(x+s/2-dir.x*s*.2-dir.y*s*.2,y+s/2-dir.y*s*.2+dir.x*s*.2);ctx.lineTo(x+s/2+dir.x*s*.2+dir.y*s*.2,y+s/2+dir.y*s*.2-dir.x*s*.2);ctx.stroke();if(b.item){ctx.fillStyle="#f2cc76";ctx.beginPath();ctx.arc(x+s/2,y+s/2,5,0,Math.PI*2);ctx.fill()}}ctx.restore()}
function drawWorld(){if(adventureMode()&&(selectedBuild||selectedLandTool)){const r=canvas.getBoundingClientRect();hoverCell=world3d.pickTile(r.left+r.width/2,r.top+r.height/2)||hoverCell}const node=hoverCell?tileNode(hoverCell.x,hoverCell.y):null;let canBuildPreview=false;if(hoverCell){if(selectedLandTool==="flatten")canBuildPreview=!buildingAt(hoverCell.x,hoverCell.y)&&(!node||!["water","wood","mineEntrance","dori","relaySite","coreSite"].includes(node.type));else if(selectedLandTool==="foundation")canBuildPreview=!!S.flattened[surfaceKey(hoverCell.x,hoverCell.y)]&&!S.foundation[surfaceKey(hoverCell.x,hoverCell.y)];else if(selectedBuild){const bridge=isBridgeType(selectedBuild);canBuildPreview=!buildingAt(hoverCell.x,hoverCell.y)&&(bridge?node?.type==="water":(selectedBuild==="beltAdaptive"||hasFoundation(hoverCell.x,hoverCell.y))&&(!node||!["water","wood","mineEntrance","dori","birchTree","rubberTree","barkTree","frozenTree","fireTree","grassPatch","heatCrystalNode","coldCrystalNode","oil","relaySite","coreSite"].includes(node.type)||(selectedBuild==="beltAdaptive"&&node.type==="grassPatch")));}}world3d.render({...S,sceneRevision,visibilityRevision,playerMotion:{...playerMotion,mining:mineHeld},selectedBuilding,selectedBuild,selectedLandTool,hoverCell,canBuildPreview,buildingDefs:BUILDINGS});}
function centerCamera(){camera.x=S.player.x+.5;camera.y=S.player.y+.5;world3d.center(S.player.x,S.player.y);if(S.player.viewMode!=="map")world3d.setViewMode(S.player.viewMode);drawWorld()}
function setZoom(z){camera.zoom=clamp(z,.55,1.8);world3d.setZoom(camera.zoom);$("zoom-value").textContent=Math.round(camera.zoom*100)+"%";drawWorld()}
function showModal(title,body,buttons=[]){$("modal-card").innerHTML='<div class="modal-head"><h2>'+title+'</h2><button class="modal-close" id="modal-x">×</button></div><div class="modal-body">'+body+'</div><div class="modal-foot">'+buttons.map((b,i)=>'<button class="action-button '+(b.cls||"secondary")+'" data-modal-action="'+i+'">'+b.label+'</button>').join("")+'</div>';$("modal-overlay").classList.add("show");$("modal-x").onclick=closeModal;$("modal-card").querySelectorAll("[data-modal-action]").forEach(el=>el.onclick=()=>{const btn=buttons[Number(el.dataset.modalAction)];if(btn?.action)btn.action();else closeModal()})}
function closeModal(){if(crystalViewer){crystalViewer.dispose();crystalViewer=null}$("modal-overlay").classList.remove("show")}
function settingsModal(){const body='<div class="setting-row"><div><strong>효과음</strong><small>건설·채집·연구 알림 소리</small></div><button class="toggle '+(S.settings.sound?"on":"")+'" id="setting-sound"><i></i></button></div><div class="setting-row"><div><strong>모션 감소</strong><small>반짝임과 화면 효과를 줄입니다.</small></div><button class="toggle '+(S.settings.reducedMotion?"on":"")+'" id="setting-motion"><i></i></button></div><p>저장 방식: 로그인 상태에서는 돌이사이트 계정의 개인 클라우드에 저장됩니다. 로그아웃 상태에서는 이 브라우저에만 저장됩니다. 오프라인 생산은 진행되지 않습니다.</p><p id="account-line">계정 연결 상태 확인 중…</p>';showModal("게임 설정",body,[{label:"닫기",cls:"primary"}]);$("setting-sound").onclick=()=>{S.settings.sound=!S.settings.sound;settingsModal();markDirty()};$("setting-motion").onclick=()=>{S.settings.reducedMotion=!S.settings.reducedMotion;settingsModal();markDirty()};$("account-line").textContent=authSession?"돌이사이트 계정 클라우드 연결됨":"로그인이 필요합니다. 돌이사이트에서 로그인 후 다시 접속하세요."}
function sellItems(){const id=$("sell-resource").value,qty=Math.floor(Number($("sell-amount").value)||0);if(!id||qty<1||availableItemCount(S,id)<qty){toast(itemCount(id)>=qty?"판매 가능한 물량이 다른 공정에 예약되어 있습니다.":"판매 수량이 부족합니다.","warn");return}if(!takeItem(id,qty)){toast("판매 원료 차감에 실패했습니다. 자금은 지급되지 않았습니다.","warn");return}const earned=Math.floor(qty*RESOURCE[id].price);S.money+=earned;S.stats.sold+=qty;log(RESOURCE[id].name+" "+fmt(qty)+"개 판매 · "+fmt(earned)+" D");toast("판매 완료 · +"+fmt(earned)+" D");playTone(680,.1,"triangle");markDirty();renderAll()}
function setTabFromKey(key){const map={b:"build",o:"factory",i:"inventory",c:"catalog",t:"research",j:"mission"};if(map[key])toggleControlPanel(map[key])}
function keyboardFocusScope(){
 if($("modal-overlay")?.classList.contains("show"))return $("modal-card");
 if($("story-intro")&&!$("story-intro").hidden)return $("story-intro").querySelector(".story-intro-content");
 if(controlPanelOpen)return $("control-column");
 return null;
}
function moveKeyboardFocus(direction){
 const scope=keyboardFocusScope();if(!scope)return;
 const items=[...scope.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
  .filter(el=>el.getClientRects().length&&!el.hidden&&el.getAttribute("aria-hidden")!=="true");
 if(!items.length)return;
 const active=document.activeElement,current=items.includes(active)?active:null;
 if(!current){items[0].focus();return}
 const a=current.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;
 const vectors={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0]},[dx,dy]=vectors[direction];
 let best=null,bestScore=Infinity;
 for(const item of items){if(item===current)continue;const r=item.getBoundingClientRect(),x=r.left+r.width/2-ax,y=r.top+r.height/2-ay,primary=x*dx+y*dy;if(primary<=2)continue;const secondary=Math.abs(x*dy-y*dx);const score=primary+secondary*1.65;if(score<bestScore){best=item;bestScore=score}}
 if(!best){const index=items.indexOf(current);best=items[(index+(direction==="arrowup"||direction==="arrowleft"?items.length-1:1))%items.length]}
 best.focus({preventScroll:false});
}
function movePlayer(dx,dy){const origin=playerMotion.path.length?playerMotion.path[playerMotion.path.length-1]:{x:S.player.x,y:S.player.y};const x=clamp(origin.x+dx,0,WORLD_W-1),y=clamp(origin.y+dy,0,WORLD_H-1);if(!isWalkable(x,y)){toast("시설 또는 지형에 막혀 있습니다.","warn");return}movePlayerTo(x,y)}
function wireControls(){
 $("main-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-panel]");if(b)changePanel(b.dataset.panel)});
 $("skill-tree").addEventListener("click",e=>{const b=e.target.closest("[data-skill]");if(b)activateSkill(b.dataset.skill)});
 $("build-category").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;activeCategory=b.dataset.cat;document.querySelectorAll(".category-chip").forEach(x=>x.classList.toggle("active",x===b));renderBuildList()});
 $("build-list").addEventListener("click",e=>{const b=e.target.closest("[data-build]");if(!b)return;selectedBuild=selectedBuild===b.dataset.build?null:b.dataset.build;selectedBuilding=null;renderBuildList();drawWorld();if(selectedBuild)toast(buildingDef(selectedBuild).name+" 선택 · 월드에서 위치를 클릭")});
 $("sell-button").onclick=sellItems;$("sell-resource").onchange=updateMarketEstimate;$("sell-amount").oninput=updateMarketEstimate;
 $("panel-inventory").addEventListener("click",e=>{const use=e.target.closest("[data-use-tree-item]");if(use){useTreeGrowthItem(use.dataset.useTreeItem);return}const card=e.target.closest("[data-crystal]");if(card)showCrystalPreview(card.dataset.crystal)});
 $("catalog-search")?.addEventListener("input",renderCatalog);
 $("catalog-mode")?.addEventListener("change",renderCatalog);
 $("catalog-category")?.addEventListener("change",renderCatalog);
 $("panel-catalog")?.addEventListener("click",e=>{
  const recipe=e.target.closest("[data-catalog-recipe]");
  if(recipe){chooseCatalogRecipe(recipe.dataset.catalogRecipe);return}
  const machine=e.target.closest("[data-machine-build]");
  if(machine){
   const id=machine.dataset.machineBuild;
   if(!buildingDef(id)){toast("이 설비는 아직 건설 목록에 연결되지 않았습니다.","warn");return}
   selectedBuild=id;selectedBuilding=null;changePanel("build");renderBuildList();drawWorld();toast(buildingDef(id).name+" 선택 · 설치할 부지를 지정하세요.");
  }
 });



 $("zoom-in").onclick=()=>setZoom(camera.zoom+.1);$("zoom-out").onclick=()=>setZoom(camera.zoom-.1);$("center-view").onclick=centerCamera;
 $("overview-toggle").onclick=()=>toggleControlPanel("factory");$("clear-selection").onclick=()=>{selectedBuilding=null;renderMachineDetails();drawWorld()};
 $("pause-sim").onclick=()=>{S.paused=!S.paused;renderHud();markDirty();toast(S.paused?"시뮬레이션 일시정지":"시뮬레이션 재개")};
 $("speed-sim").onclick=()=>{S.simSpeed=S.simSpeed===1?2:S.simSpeed===2?3:1;renderHud();markDirty()};
 $("save-now").onclick=()=>saveGame(true);$("sound-toggle").onclick=()=>{S.settings.sound=!S.settings.sound;$("sound-toggle").style.color=S.settings.sound?"var(--cyan)":"var(--muted)";markDirty();toast(S.settings.sound?"효과음 켜짐":"효과음 꺼짐")};$("settings-open").onclick=settingsModal;
 $("help-toggle").onclick=()=>$("world-help").classList.toggle("hidden");$("map-toggle").onclick=()=>showModal("돌돌행성 지도","<p>현재 탐험 구역은 Factory Valley입니다. 숲·수원지·광맥·돌이 고기 숲을 탐험하고, 지도 위에 생산 시설을 직접 배치하세요.</p><p>지도 좌표는 타일당 32m입니다. 이동은 WASD 또는 빈 타일 클릭, 화면 이동은 드래그, 확대는 휠 또는 +/− 버튼입니다.</p>",[{label:"확인",cls:"primary"}]);
 const card=canvas;
 let pointer=null,mapPointer=null;const activePointers=new Map();
 const touchGeometry=()=>{const p=[...activePointers.values()];if(p.length<2)return null;return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}};
 const directionKey=(value)=>{const [dx,dy]=value.split(",").map(Number);return dx<0?"a":dx>0?"d":dy<0?"w":"s"};
 card.addEventListener("contextmenu",e=>e.preventDefault());
 card.addEventListener("pointerdown",e=>{
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(card.setPointerCapture)card.setPointerCapture(e.pointerId);
  if(adventureMode()){
   if(e.pointerType==="touch"){
    if(e.clientX>card.getBoundingClientRect().left+card.getBoundingClientRect().width*.38)lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};
   }else{
    requestDesktopImmersion();
    if(e.button===2||e.shiftKey){lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY}}
    else if(e.button===0){
     try{if(document.pointerLockElement!==card)card.requestPointerLock?.()?.catch?.(()=>{})}catch{}
     mineHeld=true;mineCooldown=0;performAdventureAction()
    }
   }
   return;
  }
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0,rotate:e.button===2||e.shiftKey};
 });
 card.addEventListener("pointermove",e=>{
  if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(adventureMode()){
   const r=card.getBoundingClientRect();hoverCell=world3d.pickTile(r.left+r.width/2,r.top+r.height/2);
   if(lookPointer?.id===e.pointerId){
    const dx=e.clientX-lookPointer.x,dy=e.clientY-lookPointer.y;playerMotion.yaw-=dx*.006;playerMotion.pitch=clamp(playerMotion.pitch-dy*.005,-1.25,1.12);lookPointer.x=e.clientX;lookPointer.y=e.clientY;
   }
   return;
  }
  if(!pointer||pointer.id!==e.pointerId)return;
  hoverCell=screenTile(e.clientX,e.clientY);const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.moved+=Math.abs(dx)+Math.abs(dy);
  if(pointer.rotate)world3d.orbit(dx,dy);else world3d.pan(dx,dy);
  pointer.lastX=e.clientX;pointer.lastY=e.clientY;drawWorld();
 });
 card.addEventListener("pointerup",e=>{
  activePointers.delete(e.pointerId);
  if(adventureMode()){
   if(lookPointer?.id===e.pointerId)lookPointer=null;
   if(e.pointerType!=="touch")mineHeld=false;
   return;
  }
  if(!pointer||pointer.id!==e.pointerId){pointer=null;return}
  if(pointer.moved<8&&!pointer.rotate){const t=screenTile(e.clientX,e.clientY);if(t.x>=0&&t.y>=0&&t.x<WORLD_W&&t.y<WORLD_H)selectTile(t.x,t.y)}
  pointer=null;
 });
 card.addEventListener("pointerleave",()=>{if(!adventureMode())hoverCell=null;drawWorld()});
 card.addEventListener("pointercancel",e=>{activePointers.delete(e.pointerId);if(pointer?.id===e.pointerId)pointer=null;if(lookPointer?.id===e.pointerId)lookPointer=null;mineHeld=false});
 card.addEventListener("wheel",e=>{e.preventDefault();if(adventureMode())setZoom(camera.zoom+(e.deltaY<0?.06:-.06));else setZoom(camera.zoom+(e.deltaY<0?.06:-.06))},{passive:false});
 document.addEventListener("mousemove",e=>{
  if(document.pointerLockElement!==card||controlPanelOpen)return;
  if(adventureMode()){
   playerMotion.yaw-=e.movementX*.0028;
   playerMotion.pitch=clamp(playerMotion.pitch-e.movementY*.0025,-1.25,1.12);
  }else world3d.orbit(e.movementX,e.movementY);
 });
 document.addEventListener("pointerlockchange",()=>{const locked=document.pointerLockElement===card;card.classList.toggle("pointer-locked",locked);document.documentElement.classList.toggle("factory-pointer-locked",locked)});
 document.addEventListener("pointerlockerror",()=>toast("마우스 잠금이 지원되지 않습니다. 드래그로 시점을 조작하세요.","warn"));
 window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase(),isJumpKey=e.code==="Space"||k===" ";
  const editing=e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement;
  if(k==="escape"){
   e.preventDefault();
   if(document.pointerLockElement===card)document.exitPointerLock();
   if($("modal-overlay").classList.contains("show")){closeModal();return}
   if(controlPanelOpen){closeControlPanel();return}
   if($("story-intro")&&!$("story-intro").hidden){$("story-skip-button")?.focus();return}
   selectedBuild=null;selectedLandTool=null;drawWorld();return;
  }
  if(editing)return;
  const scope=keyboardFocusScope();
  if(scope&&["arrowup","arrowdown","arrowleft","arrowright"].includes(k)){e.preventDefault();moveKeyboardFocus(k);return}
  if(k==="enter"||isJumpKey){
   if(scope&&e.target===document.body){e.preventDefault();scope.querySelector("button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)")?.focus();return}
  }
  if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k)||isJumpKey)e.preventDefault();
  if(!scope&&k!=="f")requestDesktopImmersion();
  if(k==="v"){setViewMode(S.player.viewMode==="first"?"third":"first");return}
  if(k==="m"){if(S.player.layer==="mine"){toast("광산 내부에서는 지도를 열 수 없습니다.");return}setViewMode(S.player.viewMode==="map"?"first":"map");return}
  if(k==="4"){selectTool("pickaxe");return}if(k==="5"){selectTool("axe");return}
  if(k==="f"){toggleFullscreen();return}
  if(k==="e"&&adventureMode()){adventureKeys.add("e");performAdventureAction();return}
  if(k==="x"){if(selectedBuilding){const b=S.buildings.find(x=>x.uid===selectedBuilding);if(b){b.dir=(b.dir+1)%4;renderMachineDetails();drawWorld();markDirty()}}else toast("시설을 선택한 뒤 X 키로 방향을 회전하세요.");return}
  if(k==="b"||k==="o"||k==="i"||k==="c"||k==="t"||k==="j"){setTabFromKey(k);return}
  if(isJumpKey&&adventureMode())adventureKeys.add(" ");
  else if(adventureMode()&&["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k))adventureKeys.add(k);
  else if(!adventureMode()&&(k==="w"||k==="arrowup"))movePlayer(0,-1);
  else if(!adventureMode()&&(k==="s"||k==="arrowdown"))movePlayer(0,1);
  else if(!adventureMode()&&(k==="a"||k==="arrowleft"))movePlayer(-1,0);
  else if(!adventureMode()&&(k==="d"||k==="arrowright"))movePlayer(1,0);
  if(isJumpKey&&!adventureMode()){S.paused=!S.paused;renderHud()}
 });
 window.addEventListener("keyup",e=>{const k=e.key.toLowerCase();adventureKeys.delete(k);if(e.code==="Space"||k===" ")adventureKeys.delete(" ")});
  // Browsers may not deliver keyup after focus changes. Never leave movement,
  // jump, or continuous mining held when the game loses focus.
  window.addEventListener("blur",clearAdventureInput);
 document.addEventListener("fullscreenchange",()=>{document.documentElement.classList.toggle("factory-fullscreen",!!document.fullscreenElement);drawWorld()});
 // A mouse click must never operate desktop menus. Keyboard-generated clicks (detail === 0)
 // and all coarse-pointer touch interactions remain available.
 document.addEventListener("click",e=>{
  if(E2E_MODE||isCoarsePointer()||e.detail===0)return;
  const control=e.target.closest?.("#game-root button,#game-root a[href],#game-root input,#game-root select,#game-root textarea,.modal-overlay button,.story-intro button");
  if(!control)return;
  e.preventDefault();e.stopImmediatePropagation();
  toast("PC 메뉴는 키보드로 조작할 수 있습니다.","warn");
 },true);
 document.querySelectorAll("[data-view-mode]").forEach(b=>b.addEventListener("click",()=>setViewMode(b.dataset.viewMode)));
 document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>selectTool(b.dataset.tool)));
 document.querySelectorAll("[data-land-tool]").forEach(b=>b.addEventListener("click",()=>{selectedLandTool=b.dataset.landTool==="none"?null:b.dataset.landTool;selectedBuild=null;closeControlPanel();toast(selectedLandTool==="flatten"?"평탄화할 타일을 선택하세요.":selectedLandTool==="foundation"?"기초 타일을 설치할 평탄화 지형을 선택하세요.":"지형 도구 해제");drawWorld()}));
 $("game-menu-toggle")?.addEventListener("click",()=>toggleControlPanel("build"));
 $("story-start-button")?.addEventListener("click",startCampaign);
 $("story-next-button")?.addEventListener("click",advancePrologue);
 $("story-skip-button")?.addEventListener("click",finishCampaignIntro);
 $("panel-close")?.addEventListener("click",closeControlPanel);
 $("mobile-hud-toggle")?.addEventListener("click",()=>{
  const root=$("game-root"),button=$("mobile-hud-toggle");
  if(!root||!button)return;
  const expanded=root.classList.toggle("mobile-hud-expanded");
  button.classList.toggle("active",expanded);
  button.setAttribute("aria-pressed",String(expanded));
  const label=expanded?"상태 정보 숨기기":"상태 정보 표시";
  button.setAttribute("aria-label",label);button.title=label;
  const text=button.querySelector("span");if(text)text.textContent=expanded?"닫기":"정보";
 });
 $("fullscreen-button")?.addEventListener("click",toggleFullscreen);
 if(isCoarsePointer()){$("fullscreen-button")?.setAttribute("title","전체 화면 · 가로 화면 (F)");}
 const bindAdventureButton=(id,action)=>{
  const button=$(id);if(!button)return;
  button.addEventListener("click",event=>{
   event.preventDefault();event.stopPropagation();
   if(document.pointerLockElement===card)document.exitPointerLock();
   action();
  });
 };
 bindAdventureButton("eat-button",consumeFood);
 bindAdventureButton("drink-button",drinkWater);
 bindAdventureButton("action-button",performAdventureAction);
 $("jump-button").addEventListener("pointerdown",e=>{e.preventDefault();adventureKeys.add(" ")});
 $("jump-button").addEventListener("pointerup",()=>adventureKeys.delete(" "));
 $("jump-button").addEventListener("pointercancel",()=>adventureKeys.delete(" "));
 document.querySelectorAll(".move-pad [data-move]").forEach(button=>{
  let pressedAt=0,activePointer=null;
  const key=directionKey(button.dataset.move);
  const [dx,dy]=button.dataset.move.split(",").map(Number);
  button.addEventListener("pointerdown",e=>{
   activePointer=e.pointerId;pressedAt=performance.now();
   try{button.setPointerCapture(e.pointerId)}catch{}
   if(adventureMode())adventureKeys.add(key);
   else movePlayer(dx,dy);
  });
  const release=e=>{
   if(activePointer!==null&&e.pointerId!==undefined&&e.pointerId!==activePointer)return;
   if(adventureMode()){
    adventureKeys.delete(key);
    if(activePointer!==null&&performance.now()-pressedAt<150){
     adventureKeys.add(key);updatePlayerMotion(.24);adventureKeys.delete(key);
    }
   }
   activePointer=null;
  };
  button.addEventListener("pointerup",release);
  button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",release);
 });
 window.addEventListener("resize",drawWorld);
}

function renderQuickObjectives(){const q=getQuest();if($("active-mission-hud")){$("active-mission-hud").innerHTML=q?'<small>ACTIVE DIRECTIVE · '+String(S.questIndex+1).padStart(2,"0")+'</small><strong>'+q.title+'</strong><span>'+q.desc+'</span>':'<small>CAMPAIGN COMPLETE</small><strong>행성 안정화 완료</strong><span>메인 스토리가 완료되었습니다.</span>'}if(!q){$("quick-objectives").innerHTML='<div class="objective-mini"><small>CAMPAIGN COMPLETE</small><strong>행성 안정화 완료</strong><div class="mini-progress"><i style="width:100%"></i></div></div>';return}const p=Math.min(q.max,q.progress(S));$("quick-objectives").innerHTML='<div class="objective-mini"><small>ACTIVE OBJECTIVE</small><strong>'+q.title+'</strong><div class="mini-progress"><i style="width:'+Math.round(p/q.max*100)+'%"></i></div></div><div class="objective-mini"><small>ORBIT DIRECTIVE</small><strong>'+q.desc+'</strong><div class="mini-progress"><i style="width:'+Math.round(p/q.max*100)+'%"></i></div></div><div class="objective-mini"><small>COMPLETION REWARD</small><strong>'+fmt(q.reward)+' D · 자금 보상</strong><div class="mini-progress"><i style="width:'+Math.round(p/q.max*100)+'%"></i></div></div>'}
function renderAll(){renderHud();renderBuildList();renderFactory();renderInventory();if(activePanel==="catalog")renderCatalog();renderResearch();renderMissions();renderQuickObjectives();drawWorld()}
function hydrateState(input){
 markSceneDirty();
 const base=freshState(),incoming=input&&typeof input==="object"?input:{};
 const migrate=Number(incoming.worldVersion||0)<3,expandSurface=Number(incoming.worldVersion||0)<5;
 const incomingPlayer={...base.player,...incoming.player};
 const mineInstances=migrateMineInstances({
  worldSeed:Number(incoming.seed)||827142,
  mineInstances:incoming.mineInstances,
  legacyMineDeposits:incoming.mineDeposits,
  legacyMineElevatorBuffers:incoming.mineElevatorBuffers
 });
 for(const entry of MINE_ENTRANCES){
  const mine=mineInstances[entry.id];
  mine.currentLevel=clamp(Number(mine.currentLevel??(entry.id===PRIMARY_MINE_ID?incomingPlayer.mineLevel:1))||1,1,MINE_LEVELS);
  mine.player=mine.player&&typeof mine.player==="object"?{...mine.player}: {x:3,z:12,yaw:0,pitch:-.06,level:mine.currentLevel};
  mine.player.x=clamp(Number(mine.player.x??3),.35,MINE_W-.35);
  mine.player.z=clamp(Number(mine.player.z??12),.35,MINE_H-.35);
  mine.player.level=mine.currentLevel;
  mine.player.yaw=Number(mine.player.yaw)||0;
  mine.player.pitch=clamp(Number(mine.player.pitch??-.06),-1.25,1.25);
 }
 const savedMineId=String(incomingPlayer.mineId||PRIMARY_MINE_ID);
 incomingPlayer.mineId=mineInstances[savedMineId]?savedMineId:PRIMARY_MINE_ID;
 if(incomingPlayer.layer==="mine"){
  const activeMine=mineInstances[incomingPlayer.mineId];
  activeMine.currentLevel=clamp(Number(incomingPlayer.mineLevel)||activeMine.currentLevel||1,1,MINE_LEVELS);
  activeMine.player={x:clamp(Number(incomingPlayer.x??3),.35,MINE_W-.35),z:clamp(Number(incomingPlayer.y??12),.35,MINE_H-.35),yaw:Number(incomingPlayer.yaw)||0,pitch:clamp(Number(incomingPlayer.pitch??-.06),-1.25,1.25),level:activeMine.currentLevel};
 }
 const buildings=Array.isArray(incoming.buildings)?incoming.buildings.map(building=>{
  if(!building||typeof building!=="object")return building;
  const linked=["catalog_auto_miner","catalog_item_elevator","catalog_water_elevator","catalog_maglev_elevator"].includes(building.type);
  return linked?{...building,mineId:mineInstances[building.mineId]?building.mineId:PRIMARY_MINE_ID}:building;
 }):[];
 const sourceNodes=migrate?base.nodes:(expandSurface?{...base.nodes,...(incoming.nodes&&typeof incoming.nodes==="object"?incoming.nodes:{})}:(incoming.nodes&&typeof incoming.nodes==="object"?incoming.nodes:base.nodes));
 const nodes=sourceNodes;
 for(const entry of MINE_ENTRANCES){
  const node=nodes[entry.x+","+entry.y];
  if(node?.type==="mineEntrance"){node.mineId=entry.id;node.mineName=entry.name;}
 }
 S={
  ...base,...incoming,worldVersion:6,
  player:{...base.player,...incomingPlayer},
  mineInstances,
  mineDeposits:undefined,mineElevatorBuffers:undefined,
  inventory:{...base.inventory,...incoming.inventory},meta:{...incoming.meta},
  tools:{...base.tools,...incoming.tools},activeTool:incoming.activeTool||"pickaxe",
  campaign:{...base.campaign,...incoming.campaign},flattened:{...incoming.flattened},foundation:{...incoming.foundation},
  buildings,nodes,sites:base.sites,
  treeGrowthKeys:Array.isArray(incoming.treeGrowthKeys)?incoming.treeGrowthKeys.filter(key=>typeof key==="string"):(incoming.nodes&&typeof incoming.nodes==="object"?Object.entries(incoming.nodes).filter(([,node])=>node&&(["wood","birchTree","rubberTree","barkTree","frozenTree","fireTree"].includes(node.type))&&(node.permanentGrowth||Number(node.growthBoostUntil)>Number(incoming.seconds||0))).map(([key])=>key):[]),
  seen:incoming.seen||{},research:Array.isArray(incoming.research)?incoming.research:[],
  stats:{...base.stats,...incoming.stats,gathered:{...base.stats.gathered,...incoming.stats?.gathered},built:{...base.stats.built,...incoming.stats?.built},produced:{...base.stats.produced,...incoming.stats?.produced}},
  settings:{...base.settings,...incoming.settings},survival:{...base.survival,...incoming.survival},
  relaySites:Array.isArray(incoming.relaySites)?incoming.relaySites:[false,false,false],
  skills:normalizeSkillState(incoming.skills)
 };
 if(!incoming.runtime)S.runtime=createRuntimeState();
 ensureItemStacks(S);reconcileSkillMilestones();
 if(migrate){
  const ox=38,oz=32;
  S.player.x=clamp(Number(incoming.player?.x??18)+ox,0,WORLD_W-1);
  S.player.y=clamp(Number(incoming.player?.y??14)+oz,0,WORLD_H-1);
  S.player.layer="surface";S.player.mineLevel=1;S.player.mineId=PRIMARY_MINE_ID;S.player.surfacePosition=null;
  for(const building of S.buildings){building.x=clamp((Number(building.x)||0)+ox,0,WORLD_W-1);building.y=clamp((Number(building.y)||0)+oz,0,WORLD_H-1);const key=surfaceKey(building.x,building.y);delete S.nodes[key];S.flattened[key]={height:terrainHeightAt(building.x,building.y)};S.foundation[key]=true;}
 }
 S.simSpeed=[1,2,3].includes(S.simSpeed)?S.simSpeed:1;
 S.player.x=clamp(Number(S.player.x??64),0,S.player.layer==="mine"?MINE_W-1:WORLD_W-1);
 S.player.y=clamp(Number(S.player.y??52),0,S.player.layer==="mine"?MINE_H-1:WORLD_H-1);
 S.paused=!!S.paused;S.tick=Number(S.tick)||0;S.seconds=Number(S.seconds)||8*3600;
 S.player.viewMode=["first","third","map"].includes(S.player.viewMode)?S.player.viewMode:"first";
 if(S.player.layer==="mine"&&S.player.viewMode==="map")S.player.viewMode="first";
 S.player.mineId=S.mineInstances[S.player.mineId]?S.player.mineId:PRIMARY_MINE_ID;
 S.player.mineLevel=clamp(Number(S.player.mineLevel)||S.mineInstances[S.player.mineId].currentLevel||1,1,MINE_LEVELS);
 S.player.yaw=Number(S.player.yaw)||0;S.player.pitch=clamp(Number(S.player.pitch??-.12),-1.25,1.25);
 S.survival.health=clamp(Number(S.survival.health??100),0,100);
 S.survival.hunger=clamp(Number(S.survival.hunger??100),0,100);
 S.survival.thirst=clamp(Number(S.survival.thirst??100),0,100);
 playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:S.player.yaw,pitch:S.player.pitch,path:[],moving:false,facing:0,onArrive:null};
 rebuildCooldownIndex();
}function loadLocal(){const candidate=readBestSave(localStorage,activeLocalKey);if(!candidate)return null;if(candidate.reason==="UNSUPPORTED_FUTURE_SCHEMA"){saveBlockedForFutureSchema=true;setSaveMessage("더 최신 버전의 저장 데이터입니다. 최신 게임 버전에서 열어 주세요.");if(!E2E_MODE)showModal("저장 데이터 버전 확인 필요","<p>이 저장 데이터는 현재 게임보다 새로운 버전에서 만들어졌습니다.</p><p>데이터를 덮어쓰지 않도록 저장을 잠갔습니다. 최신 게임 버전에서 다시 열어 주세요.</p>",[{label:"확인",cls:"primary"}]);return "future-schema-blocked"}if(!candidate.valid)return null;try{hydrateState(candidate.state);if(candidate.source!==activeLocalKey){restoreSaveCandidate(localStorage,activeLocalKey,candidate);if(!E2E_MODE)toast(candidate.source.includes("_backup_")?"이전 백업 저장 데이터에서 복구했습니다.":"임시 저장 데이터에서 복구했습니다.");}return candidate.savedAt||S.lastSavedAt||null}catch(error){console.warn("Local save candidate rejected",candidate.source,error);return null}}
function setSaveMessage(value){$("save-message").textContent=value}
function saveLocal(){if(saveBlockedForFutureSchema){setSaveMessage("최신 버전에서 생성된 저장 데이터는 이 버전에서 덮어쓸 수 없습니다.");return null}const savedAt=nowISO();S.lastSavedAt=savedAt;try{const audit=validateRuntimeState(S);if(!audit.valid)throw new Error("저장 전 인벤토리 검증 실패: "+audit.errors.join(", "));const skills=validateSkillState(S.skills);if(!skills.valid)throw new Error("저장 전 스킬 검증 실패: "+skills.errors.join(", "));const snapshot=requestSaveSnapshot(S);S.runtime.saveSnapshotRequested=false;writeSaveEnvelope(localStorage,activeLocalKey,snapshot,savedAt);return savedAt}catch(e){setSaveMessage("저장 검증 또는 저장 공간 오류");console.error(e);return null}}
async function loadCloudForUser(session){if(!cloudClient||!session?.user?.id)return false;setCloud("syncing","클라우드 확인");try{const {data,error}=await cloudClient.from("dori_cloud_storage").select("storage_value,updated_at").eq("storage_key",CLOUD_KEY).eq("is_deleted",false).maybeSingle();if(error)throw error;if(!data){cloudUpdatedAt=null;setCloud("online","계정 연결됨");return false}const envelope=data.storage_value||{};if(!envelope.state)throw new Error("저장 형식이 올바르지 않습니다.");const remoteValidation=validateSaveEnvelope(envelope);if(!remoteValidation.valid)throw new Error("클라우드 저장 데이터 검증 실패: "+remoteValidation.reason);const remoteTime=Date.parse(data.updated_at||envelope.savedAt||0),localTime=Date.parse(S.lastSavedAt||0);cloudUpdatedAt=data.updated_at||envelope.savedAt||null;if(remoteTime>localTime){hydrateState(envelope.state);S.lastSavedAt=cloudUpdatedAt;writeSaveEnvelope(localStorage,activeLocalKey,S,cloudUpdatedAt);renderAll();setViewMode(S.player.viewMode);toast("클라우드 저장 데이터를 불러왔습니다.");setCloud("online","클라우드 동기화")}else{setCloud("online","클라우드 연결됨");if(localTime>remoteTime)await saveGame(true)}return true}catch(e){if(String(e).includes("UNSUPPORTED_FUTURE_SCHEMA")){saveBlockedForFutureSchema=true;setCloud("error","최신 버전 필요");setSaveMessage("클라우드 저장 데이터가 더 최신 버전입니다. 덮어쓰기를 차단했습니다.");toast("최신 버전의 클라우드 저장 데이터가 있어 저장을 잠갔습니다.","warn");return true}console.error("Cloud load failed",e);setCloud("error","클라우드 오류");setSaveMessage("로컬 저장 사용 중");return false}}
async function initCloud(){try{const mod=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm");createClient=mod.createClient;cloudClient=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"sb-scttowfhygcpdirrekqm-auth-token"}});const {data,error}=await cloudClient.auth.getSession();if(error)throw error;authSession=data.session;if(authSession){activeLocalKey=LOCAL_KEY+"_"+authSession.user.id;saveBlockedForFutureSchema=false;const accountLocal=loadLocal();if(!accountLocal)S=freshState();const found=await loadCloudForUser(authSession);if(!found){renderAll();await saveGame(true)}}else setCloud("","로그인 필요");cloudClient.auth.onAuthStateChange((event,session)=>{queueMicrotask(async()=>{const previous=authSession?.user?.id;authSession=session;if(session?.user?.id&&session.user.id!==previous){activeLocalKey=LOCAL_KEY+"_"+session.user.id;saveBlockedForFutureSchema=false;const accountLocal=loadLocal();if(!accountLocal)S=freshState();dirty=false;const found=await loadCloudForUser(session);if(!found){renderAll();await saveGame(true)}}else if(!session){activeLocalKey=LOCAL_KEY;saveBlockedForFutureSchema=false;const guestLocal=loadLocal();if(!guestLocal)S=freshState();renderAll();setCloud("","로그인 필요");saveLocal()}else if(event==="TOKEN_REFRESHED"){setCloud("online","클라우드 연결됨")}})});return true}catch(e){console.warn("Supabase client unavailable; using local save",e);cloudClient=null;authSession=null;setCloud("error","로컬 저장");return false}}
async function saveGame(force=false){if(!force&&!dirty)return;if(cloudBusy){saveLocal();return}const savedAt=saveLocal();if(!savedAt)return;dirty=false;setSaveMessage("이 기기 저장 완료");if(!cloudClient||!authSession?.user?.id){setCloud("","로그인 필요");return}cloudBusy=true;setCloud("syncing","클라우드 저장");try{const envelope=createSaveEnvelope(requestSaveSnapshot(S),savedAt);const {error}=await cloudClient.from("dori_cloud_storage").upsert({user_id:authSession.user.id,storage_key:CLOUD_KEY,storage_value:envelope,is_deleted:false,updated_at:savedAt},{onConflict:"user_id,storage_key"});if(error)throw error;cloudUpdatedAt=savedAt;setCloud("online","모든 기기 동기화");setSaveMessage("계정 클라우드 저장 완료")}catch(e){console.error("Cloud save failed",e);setCloud("error","로컬 저장됨");setSaveMessage("클라우드 오류 · 로컬 보존");toast("클라우드 저장에 실패했습니다. 이 기기 저장은 보존했습니다.","warn")}finally{cloudBusy=false}}
async function pollCloud(){if(!cloudClient||!authSession?.user?.id||cloudBusy)return;try{const {data,error}=await cloudClient.from("dori_cloud_storage").select("storage_value,updated_at").eq("storage_key",CLOUD_KEY).eq("is_deleted",false).maybeSingle();if(error)throw error;if(!data)return;const remote=data.updated_at||data.storage_value?.savedAt;if(!remote||remote===cloudUpdatedAt)return;if(dirty){setCloud("syncing","다른 기기 변경 감지");toast("다른 기기의 저장 데이터가 있습니다. 저장 후 새로고침하면 최신 진행도를 불러옵니다.","warn");return}const envelope=data.storage_value;if(envelope?.state){const validation=validateSaveEnvelope(envelope);if(validation.reason==="UNSUPPORTED_FUTURE_SCHEMA"){saveBlockedForFutureSchema=true;setCloud("error","최신 버전 필요");setSaveMessage("더 최신 클라우드 저장 데이터가 있어 저장을 잠갔습니다.");toast("최신 버전의 클라우드 저장 데이터가 있어 저장을 잠갔습니다.","warn");return}if(validation.valid){hydrateState(envelope.state);S.lastSavedAt=remote;cloudUpdatedAt=remote;writeSaveEnvelope(localStorage,activeLocalKey,S,remote);renderAll();setViewMode(S.player.viewMode);setCloud("online","다른 기기와 동기화");toast("다른 기기의 공장 진행도를 동기화했습니다.")}}}catch(e){console.warn("Cloud polling error",e)}}
function scheduleWorldFrame(){
 if(worldFrameHandle||document.hidden)return;
 worldFrameHandle=requestAnimationFrame(animationFrame);
}
function onFactoryVisibilityChange(){
 if(document.hidden){
  clearAdventureInput();
  if(worldFrameHandle)cancelAnimationFrame(worldFrameHandle);
  worldFrameHandle=0;
  frameRenderAccumulator=0;
  if(!E2E_MODE){saveLocal();setSaveMessage("이 기기 저장 완료");}
  return;
 }
 lastFrame=performance.now();
 frameRenderAccumulator=0;
 if(!E2E_MODE)pollCloud();
 scheduleWorldFrame();
}
document.addEventListener("visibilitychange",onFactoryVisibilityChange);
function animationFrame(time){
 worldFrameHandle=0;
 if(document.hidden)return;
 const frameMs=Math.min(80,Math.max(0,time-lastFrame));lastFrame=time;drawTime=time;
 world3d.adaptPerformanceFrame?.(frameMs);
 const elapsed=frameMs/1000;
 updatePlayerMotion(elapsed);
 if(!S.paused&&!S.victory){accumulator+=elapsed*S.simSpeed;while(accumulator>=STEP){tick(STEP);accumulator-=STEP}}
 frameRenderAccumulator=Math.min(50,frameRenderAccumulator+frameMs);
 if(frameRenderAccumulator>=1000/60){frameRenderAccumulator-=1000/60;drawWorld()}
 scheduleWorldFrame();
}
function boot(){const localTime=loadLocal();playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:Number(S.player.yaw)||0,pitch:Number(S.player.pitch??-.12),path:[],moving:false,facing:0,onArrive:null};camera.x=S.player.x;camera.y=S.player.y;revealAround();wireControls();renderAll();setViewMode(S.player.viewMode);if(!E2E_MODE){initCloud();setInterval(()=>saveGame(false),12000);setInterval(()=>pollCloud(),25000);window.addEventListener("beforeunload",()=>{try{saveLocal()}catch{}});}else setCloud("online","테스트 모드");lastFrame=performance.now();scheduleWorldFrame();if(!E2E_MODE){if(Number(S.campaign?.prologueVersion||0)<2)showStoryIntro();else if(getQuest())setTimeout(()=>notifyNewMission(getQuest()),350);if(!localTime)log("공장 복구 프로토콜 시작 · ORBIT 온라인 대기")}}

boot();
if(E2E_MODE){
 window.__doroniumFactoryTest={
  snapshot:()=>structuredClone(S),
  backend:world3d.backend,
  motion:()=>({x:playerMotion.x,z:playerMotion.z,y:playerMotion.y,velocityY:playerMotion.velocityY,grounded:playerMotion.grounded,path:playerMotion.path.length,moving:playerMotion.moving,yaw:playerMotion.yaw,pitch:playerMotion.pitch}),
  heldKeys:()=>[...adventureKeys],
  holdKeyForTest:key=>adventureKeys.add(String(key).toLowerCase()),
  prepareSaveReloadTest(){
    S.money=123456;S.player.x=81;S.player.y=67;S.survival.health=84;
    playerMotion.x=81;playerMotion.z=67;
    const savedAt=saveLocal();
    return {saved:!!savedAt,money:S.money,x:S.player.x,y:S.player.y,health:S.survival.health,ironOre:itemCount("ironOre")};
  },
  viewMode:()=>S.player.viewMode,
  setViewMode:(mode)=>setViewMode(mode),
  setupMovementTest(){
    S=freshState();S.player={...S.player,x:72,y:52,layer:"surface",mineLevel:1,viewMode:"first",yaw:0,pitch:-.12};S.paused=false;
    // The fixture starts on an intentionally clear patch, so collision checks
    // do not confuse a blocked forest tile with a failed keyboard event.
    for(let y=46;y<=58;y++)for(let x=66;x<=78;x++)delete S.nodes[x+","+y];
    playerMotion={x:72,z:52,y:0,velocityY:0,grounded:true,yaw:0,pitch:-.12,path:[],moving:false,facing:0,onArrive:null};
    selectedBuild=null;selectedBuilding=null;selectedLandTool=null;clearAdventureInput();world3d.center(72,52);setViewMode("first");renderAll();
    return {x:playerMotion.x,z:playerMotion.z,viewMode:S.player.viewMode,paused:S.paused};
  },
  survival:()=>structuredClone(S.survival),
  consumeFood:()=>{consumeFood();return structuredClone(S.survival)},
  drinkWater:()=>{drinkWater();return structuredClone(S.survival)},
  setupSurvivalTest(){S=freshState();S.player={...S.player,x:72,y:52,layer:"surface",viewMode:"first",yaw:0,pitch:-.12};S.survival={health:100,hunger:50,thirst:50};S.inventory.doriMeat=2;S.inventory.water=3;S.runtime=createRuntimeState();ensureItemStacks(S);playerMotion={x:72,z:52,y:0,velocityY:0,grounded:true,yaw:0,pitch:-.12,path:[],moving:false,facing:0,onArrive:null};renderAll();return structuredClone(S)},
  survivalTick(seconds,deplete=false){if(deplete){S.survival.hunger=0;S.survival.thirst=0}updateSurvival(Math.max(0,Number(seconds)||0));return structuredClone(S.survival)},
  setupMiningTest(){
   S=freshState();S.player={...S.player,x:8,y:14,viewMode:"first",layer:"mine",mineLevel:1,yaw:0,pitch:.06};S.survival={health:100,hunger:100,thirst:100};
   const deposit=getMineDeposits(PRIMARY_MINE_ID)["1:8:12"];deposit.amount=12;S.activeTool="pickaxe";
   playerMotion={x:8,z:14,y:0,velocityY:0,grounded:true,yaw:0,pitch:.06,path:[],moving:false,facing:0,onArrive:null};
   selectedBuild=null;selectedBuilding=null;world3d.center(8,14);renderAll();return structuredClone(S)
  },
  mineTarget(){const before=itemCount("stone"),target=world3d.pickTarget(190);performAdventureAction();return {target,before,after:itemCount("stone"),node:getMineDeposits(PRIMARY_MINE_ID)["1:8:12"]?.amount}},
  selectTool:(tool)=>selectTool(tool),
  toolGuard(){this.setupMiningTest();selectTool("axe");const before=itemCount("stone");harvestMineDeposit(getMineDeposits(PRIMARY_MINE_ID)["1:8:12"],PRIMARY_MINE_ID);return {before,after:itemCount("stone"),tool:S.activeTool}},
  constructionRules(){
   S=freshState();S.player={...S.player,viewMode:"map"};S.money=1000000;S.inventory={wood:200,stone:200,ironPlate:200,ironOre:100,coal:100,water:50};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.research.push("logistics");
   const standardWithoutFoundation=placeBuilding("belt",75,50);
   const findEmptyTile=(exclude=null,requireSlope=false)=>{
    for(let y=3;y<WORLD_H-3;y++)for(let x=3;x<WORLD_W-3;x++){
     if(exclude&&x===exclude.x&&y===exclude.y)continue;
     if(tileNode(x,y)||buildingAt(x,y)||hasFoundation(x,y))continue;
     const riseX=terrainHeightAt(x+1,y)-terrainHeightAt(x-1,y),riseZ=terrainHeightAt(x,y+1)-terrainHeightAt(x,y-1);
     if(requireSlope&&Math.max(Math.abs(riseX),Math.abs(riseZ))<1)continue;
     return {x,y};
    }
    return null;
   };
   const adaptivePosition=findEmptyTile(null,true);
   const adaptiveWithoutFoundation=adaptivePosition?placeBuilding("beltAdaptive",adaptivePosition.x,adaptivePosition.y):false;
   const standardPosition=findEmptyTile(adaptivePosition,false);
   let standardWithFoundation=false;
   if(standardPosition){
    const key=surfaceKey(standardPosition.x,standardPosition.y);
    S.flattened[key]={height:terrainHeightAt(standardPosition.x,standardPosition.y)};S.foundation[key]=true;
    standardWithFoundation=placeBuilding("belt",standardPosition.x,standardPosition.y);
   }
   drawWorld();
   return {standardWithoutFoundation,adaptiveWithoutFoundation,standardWithFoundation,adaptivePosition,standardPosition,placed:S.buildings.map(b=>b.type),adaptiveBeltTilts:world3d.inspect().adaptiveBeltTilts}
  },


  move:(dx,dy)=>movePlayer(dx,dy),
  audit:()=>({
   dataValidation:DATA_VALIDATION,catalogValidation:CATALOG_VALIDATION,catalogItemCount:Object.keys(CATALOG_ITEMS).length,catalogRecipeCount:Object.keys(CATALOG_RECIPES).length,catalogMachineCount:CATALOG_MACHINES.length,runtimeValidation:validateRuntimeState(S),skillTreeValidation:validateSkillTree(),skillStateValidation:validateSkillState(S.skills),skillNodeCount:SKILL_NODES.length,skillGroupCount:SKILL_GROUPS.length,resourceCount:Object.keys(RESOURCE).length,
   variantCount:VARIANTS.length,
   uniqueVariants:new Set(VARIANTS).size,
   uniqueCrystalModels:DORONIUM_CRYSTAL_MODELS.filter(id=>id!=="infinity").length,
   uniqueCrystalShapes:new Set(VARIANTS.map(id=>DORONIUM_CRYSTAL_MODEL_SHAPES[id])).size,
   allCrystalModels:VARIANTS.every(id=>DORONIUM_CRYSTAL_MODELS.includes(id)&&!!DORONIUM_CRYSTAL_MODEL_SHAPES[id]),
   researchCount:RESEARCH.length,
   buildingCount:BUILDINGS.length,worldWidth:WORLD_W,worldHeight:WORLD_H,outerResourceCount:Object.entries(S.nodes).filter(([key,n])=>{const [x,z]=key.split(",").map(Number);return (x>=128||z>=96)&&["wood","dori","water"].includes(n.type)}).length,mineLevels:MINE_LEVELS,biomeCount:new Set(Array.from({length:WORLD_H},(_,z)=>Array.from({length:WORLD_W},(_,x)=>biomeAt(x,z))).flat()).size,terrainHeightRange:[Math.min(...Array.from({length:WORLD_H},(_,z)=>Math.min(...Array.from({length:WORLD_W},(_,x)=>terrainHeightAt(x,z))))),Math.max(...Array.from({length:WORLD_H},(_,z)=>Math.max(...Array.from({length:WORLD_W},(_,x)=>terrainHeightAt(x,z)))))],surfaceHasExposedOre:Object.values(S.nodes).some(n=>["stone","ironOre","copperOre","coal","quartz","goldOre","diamond"].includes(n.type)),
   simulationStep:STEP,
   variantRecipeCount:Object.keys(VARIANT_RECIPES).length,
   variantRecipesValid:VARIANTS.filter(id=>id!=="doronium_normal").every(id=>!!VARIANT_RECIPES[id]&&Object.keys(VARIANT_RECIPES[id].inputs).every(k=>!!RESOURCE[k])),
   fusionStageCount:FUSION_STAGES.length,
   fusionIdealDuration:FUSION_STAGES.reduce((n,x)=>n+x.time,0),
   researchGraphValid:(()=>{const ids=new Set(RESEARCH.map(r=>r.id));if(!RESEARCH.every(r=>(r.requires||[]).every(id=>ids.has(id))))return false;const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))return false;if(done.has(id))return true;visiting.add(id);const r=RESEARCH.find(v=>v.id===id);for(const dep of r?.requires||[])if(!visit(dep))return false;visiting.delete(id);done.add(id);return true}return RESEARCH.every(r=>visit(r.id))})(),
   allVariantModels:VARIANTS.every(id=>!!RESOURCE[id]),
   recipeInputsValid:Object.values(RECIPES).every(r=>Object.keys(r.inputs).every(id=>!!RESOURCE[id])),
   buildingMaterialsValid:BUILDINGS.every(b=>Object.keys(b.materials||{}).every(id=>!!RESOURCE[id]))
  }),
  saveMigrationTest(){
   const previous=structuredClone(S);
   try{
    S=freshState();
    const primary=S.mineInstances[PRIMARY_MINE_ID],newOre=Object.entries(primary.deposits).find(([,node])=>node.type==="aluminumOre");
    const preserved=primary.deposits["1:8:12"];
    if(!newOre||!preserved)throw new Error("The primary mine must include a generated aluminum vein and a legacy ore vein");
    const oldDeposits={...primary.deposits};delete oldDeposits[newOre[0]];oldDeposits["1:8:12"]={...preserved,amount:7};
    const legacyBuffers={"3":{ironOre:{quantity:4,quality:92,purity:90,synthetic:false}}};
    const legacy={...structuredClone(S),worldVersion:5,mineInstances:undefined,mineDeposits:oldDeposits,mineElevatorBuffers:legacyBuffers};
    hydrateState(legacy);
    const restored=S.mineInstances[PRIMARY_MINE_ID];
    return {newOreKey:newOre[0],newOrePresent:!!restored.deposits[newOre[0]],newOreType:restored.deposits[newOre[0]]?.type,legacyAmount:restored.deposits["1:8:12"]?.amount,legacyElevatorAmount:restored.elevatorBuffers["3"]?.ironOre?.quantity||0,mineCount:Object.keys(S.mineInstances).length,worldVersion:S.worldVersion,saveValid:validateRuntimeState(S).valid};
   }finally{S=previous;markSceneDirty();renderAll()}
  },
  mineIsolationTest(){
   const previous=structuredClone(S),previousMotion=structuredClone(playerMotion);
   try{
    S=freshState();
    const ids=MINE_ENTRANCES.map(entry=>entry.id),mineA=S.mineInstances[ids[0]],mineB=S.mineInstances[ids[1]];
    const depositA=Object.values(mineA.deposits)[0],depositB=Object.values(mineB.deposits)[0];
    if(!depositA||!depositB)throw new Error("Each mine must generate at least one deposit");
    const depositABefore=depositA.amount,depositBBefore=depositB.amount;
    depositA.amount=Math.max(0,depositA.amount-1);
    storeInMineElevator(2,"ironOre",3,{quality:92,purity:90,synthetic:false},ids[0]);
    storeInMineElevator(2,"ironOre",5,{quality:88,purity:95,synthetic:false},ids[1]);
    mineA.currentLevel=3;mineA.player={x:8,z:12,yaw:.3,pitch:-.1,level:3};
    mineB.currentLevel=1;mineB.player={x:3,z:12,yaw:0,pitch:-.06,level:1};
    enterMine(ids[0]);
    const activeA={mineId:currentMineId(),level:S.player.mineLevel,x:playerMotion.x,z:playerMotion.z};
    const sceneA=world3d.inspect();
    exitMine();
    enterMine(ids[1]);
    const activeB={mineId:currentMineId(),level:S.player.mineLevel,x:playerMotion.x,z:playerMotion.z};
    const sceneB=world3d.inspect();
    const result={
      ids,
      independentObjects:mineA!==mineB&&mineA.deposits!==mineB.deposits&&mineA.elevatorBuffers!==mineB.elevatorBuffers,
      depositAChanged:depositA.amount===Math.max(0,depositABefore-1),
      depositBUnchanged:depositB.amount===depositBBefore,
      elevatorA:mineA.elevatorBuffers["2"]?.ironOre?.quantity||0,
      elevatorB:mineB.elevatorBuffers["2"]?.ironOre?.quantity||0,
      activeA,activeB,
      sceneA:{id:sceneA.activeMineId,geology:sceneA.activeMineGeology,tunnels:sceneA.activeMineTunnelCells},
      sceneB:{id:sceneB.activeMineId,geology:sceneB.activeMineGeology,tunnels:sceneB.activeMineTunnelCells}
    };
    return result;
   }finally{S=previous;playerMotion=previousMotion;markSceneDirty();renderAll();setViewMode(S.player.viewMode)}
  },
  expandedSystemsTest(){
   const previous=structuredClone(S);
   try{
    S=freshState();S.money=100000;S.runtime=createRuntimeState();ensureItemStacks(S);
    S.nodes["10,10"]={type:"water",amount:40,max:40,cooldown:0,seed:1};S.seen["10,10"]=true;
    addItem("machine_wood_bridge",1,{quality:100,purity:100,synthetic:false},false);markSceneDirty();
    const bridgePlaced=placeBuilding("catalog_wood_bridge",10,10),bridgeWalkable=isWalkable(10,10);
    S=freshState();S.player={...S.player,x:10,y:10,layer:"surface"};S.nodes["10,10"]={type:"wood",amount:0,max:90,cooldown:0,seed:2};S.runtime=createRuntimeState();ensureItemStacks(S);
    addItem("treeNutrition",1,{quality:90,purity:90,synthetic:false},false);useTreeGrowthItem("treeNutrition");
    const treeNutrition={amount:S.nodes["10,10"].amount,remaining:itemCount("treeNutrition")};
    addItem("treeGrowthAccelerator",1,{quality:90,purity:90,synthetic:false},false);S.nodes["10,10"].amount=0;useTreeGrowthItem("treeGrowthAccelerator");
    const accelerated={amount:S.nodes["10,10"].amount,boostUntil:S.nodes["10,10"].growthBoostUntil||0};
    addItem("treePermanentGrowthCatalyst",1,{quality:90,purity:90,synthetic:false},false);S.nodes["10,10"].amount=0;useTreeGrowthItem("treePermanentGrowthCatalyst");
    const permanent={enabled:!!S.nodes["10,10"].permanentGrowth,amount:S.nodes["10,10"].amount};
    S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);
    const elevator={uid:"test-elevator",type:"catalog_item_elevator",x:5,y:5,dir:1,liftLevel:3,liftDirection:"down",input:{},output:null,status:"IDLE"};
    S.buildings=[elevator];selectedBuilding=elevator.uid;storeInMineElevator(3,"ironOre",4,{quality:92,purity:90,synthetic:false});
    renderMachineDetails();$("machine-lift-level").value="3";$("machine-lift-item").value="ironOre";$("machine-lift-quantity").value="2";
    const beforeOre=itemCount("ironOre");transferElevatorBuffer(elevator,"unload");
    const elevatorResult={before:beforeOre,after:itemCount("ironOre"),remaining:elevatorBufferSummary(3).find(x=>x.id==="ironOre")?.quantity||0};
    const fluidOnly=acceptFactoryLogisticsItem({type:"catalog_water_elevator",liftLevel:2,liftDirection:"down"},{id:"ironOre",qty:1,meta:{}});
    S=freshState();S.buildings=[
      {uid:"test-solar",type:"catalog_solar_panel",x:10,y:10,fuelTimer:0},
      {uid:"test-transformer",type:"catalog_transformer",x:20,y:10},
      {uid:"test-near-machine",type:"smelter",x:30,y:10,condition:100},
      {uid:"test-far-machine",type:"smelter",x:90,y:90,condition:100}
    ];
    const grid=currentPower();
    return {
     bridge:{placed:bridgePlaced,walkable:bridgeWalkable},
     treeNutrition,accelerated,permanent,
     elevator:elevatorResult,waterElevatorRejectsSolid:fluidOnly===false,
     transformer:{count:grid.network.transformers,connected:grid.network.connectedConsumers,disconnected:grid.network.disconnectedConsumers,near:powerRatioForBuilding(S.buildings[2],grid),far:powerRatioForBuilding(S.buildings[3],grid)}
    };
   }finally{S=previous;selectedBuilding=null;markSceneDirty();renderAll()}
  },
  power:()=>currentPower(),
  inspect3D:()=>world3d.inspect(),
  inspectPerformance:()=>world3d.inspectPerformance?.()||null,
  loadBeltVisual(id="ironOre",qty=8){
   const belt=S.buildings.find(b=>b.type==="belt");if(!belt||!RESOURCE[id])throw new Error("test belt/resource missing");
   belt.item={id,qty,meta:{quality:90,purity:90,synthetic:false}};belt.moveTimer=.1;drawWorld();return world3d.inspect();
  },
  setClock(seconds){S.seconds=Math.max(0,Number(seconds)||0);renderHud();return currentPower()},
  machinePowerGate(){
   const b=S.buildings.find(v=>v.type==="smelter");if(!b)throw new Error("test smelter missing");
   const before=itemCount("ironOre");tickMachine(b,STEP,currentPower().ratio);
   return {status:b.status,ironOreBefore:before,ironOreAfter:itemCount("ironOre")};
  },
  ledger(){
   const total=id=>S.inventory[id]||0;
   const result={ironOre:total("ironOre"),coal:total("coal"),ironPlate:total("ironPlate")};
   for(const b of S.buildings){
    result.ironOre+=(b.input?.ironOre||0)+(b.output?.id==="ironOre"?b.output.qty:0)+(b.item?.id==="ironOre"?b.item.qty:0);
    result.coal+=(b.input?.coal||0)+(b.output?.id==="coal"?b.output.qty:0)+(b.item?.id==="coal"?b.item.qty:0);
    result.ironPlate+=(b.input?.ironPlate||0)+(b.output?.id==="ironPlate"?b.output.qty:0)+(b.item?.id==="ironPlate"?b.item.qty:0);
    if(b.activeMeta&&b.type==="smelter"){result.ironOre+=2;result.coal+=1;}
   }
   return {...result,oreBalance:result.ironOre+2*result.ironPlate,coalBalance:result.coal+result.ironPlate};
  },
  interactAt(x,y){selectTile(x,y);return {selectedBuilding,path:playerMotion.path.length,player:{x:S.player.x,y:S.player.y}};},
  testPath:(x,y)=>findPlayerPath(S.player.x,S.player.y,x,y),
  runSeconds(seconds){const count=Math.floor(seconds/STEP+1e-8);for(let i=0;i<count;i++)tick(STEP);drawWorld();return {ticks:count,state:structuredClone(S),power:currentPower()}},
  setupSoak(){
   S=freshState();S.player={...S.player,x:18,y:14,viewMode:"map",layer:"surface"};S.seconds=8*3600;S.money=100000000;
   S.inventory={ironOre:50000,coal:30000};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.research=[];
   S.stats={gathered:{},built:{},produced:{},sold:0,energyProduced:0};
   selectedBuild=null;selectedBuilding=null;
   // Open a deterministic test corridor to the smelter while keeping the machine footprint blocked.
   for(let x=2;x<=18;x++){delete S.nodes[x+",14"];S.seen[x+",14"]=true;}
   for(let y=3;y<=14;y++){delete S.nodes["2,"+y];S.seen["2,"+y]=true;}
   for(let y=2;y<=14;y++){delete S.nodes["1,"+y];S.seen["1,"+y]=true;}
   S.buildings=[
    {uid:"test-solar",type:"solar",x:1,y:1,dir:1,progress:0,condition:100,status:"IDLE"},
    {uid:"test-smelter",type:"smelter",x:2,y:2,dir:1,progress:0,condition:100,input:{},inputMeta:{},output:null,activeMeta:null,temp:25,pressure:0,status:"IDLE"},
    {uid:"test-belt",type:"belt",x:3,y:2,dir:1,progress:0,condition:100,item:null,moveTimer:0,status:"IDLE"},
    {uid:"test-storage",type:"storage",x:4,y:2,dir:1,progress:0,condition:100,status:"IDLE"}
   ];
   S.fusionJob=null;S.paused=false;S.victory=false;S.tick=0;S.logs=[];
   playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:0,pitch:-.12,path:[],moving:false,facing:0,onArrive:null};
   revealAround();renderAll();return structuredClone(S)
  },
  prepareFusionTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   for(const id of VARIANTS)addItem(id,100,{quality:96,purity:95,synthetic:false},false);
   S.buildings=Array.from({length:5},(_,i)=>({uid:"test-coal-"+i,type:"coalgen",x:10+i,y:10,dir:1,progress:0,condition:100,fuelTimer:24,status:"RUNNING"}));
   S.buildings.push(
    {uid:"test-fusion",type:"fusion",x:20,y:10,dir:1,progress:0,condition:100,temp:25,pressure:0,status:"IDLE"},
    {uid:"test-cooling",type:"cooling",x:21,y:10,dir:1,progress:0,condition:100,status:"IDLE"}
   );
   S.fusionJob=null;S.fusionDone=false;S.paused=false;S.victory=false;
   selectedBuild=null;selectedBuilding="test-fusion";markSceneDirty();changePanel("factory");renderMachineDetails();renderHud();drawWorld();
   return {power:currentPower(),items:VARIANTS.length,stock:VARIANTS.map(id=>itemCount(id))};
  },
  fusionStatus(){
   return {job:S.fusionJob?structuredClone(S.fusionJob):null,stock:Object.fromEntries(VARIANTS.map(id=>[id,itemCount(id)])),available:Object.fromEntries(VARIANTS.map(id=>[id,availableItemCount(S,id)])),activeReservations:Object.keys(S.runtime.reservations||{}).length,valid:validateRuntimeState(S).valid};
  },
  attemptSpendFusionInput(){return takeItem(VARIANTS[0],1)},
  reservationGuardTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   addItem("doronium_normal",3,{quality:96,purity:95,synthetic:false},false);
   addItem("quartz",2,{quality:96,purity:95,synthetic:false},false);
   addItem("water",8,{quality:96,purity:100,synthetic:false},false);
   addItem("doriMeat",2,{quality:96,purity:95,synthetic:false},false);
   addItem("doronium_blue",100,{quality:96,purity:95,synthetic:false},false);
   addItem("wood",2,{quality:96,purity:95,synthetic:false},false);
   addItem("ironPlate",1,{quality:96,purity:95,synthetic:false},false);
   const held=reserveItemBatch(S,{doronium_normal:3,quartz:2,water:8,doriMeat:2,doronium_blue:100,wood:2,ironPlate:1},"reservation-guard-e2e");
   if(!held)throw new Error("Unable to prepare reservation-guard scenario");
   syncLegacyInventory(S);renderInventory();
   const machine={uid:"test-variant-machine",type:"variantLab",variant:"doronium_blue",input:{},inputMeta:{}};
   supplyMachine(machine);
   $("sell-resource").value="doronium_blue";$("sell-amount").value="100";
   const moneyBefore=S.money,soldBefore=S.stats.sold;sellItems();
   const moneyAfterSale=S.money,soldAfterSale=S.stats.sold;
   const survivalBefore=structuredClone(S.survival);consumeFood();drinkWater();
   S.player.layer="surface";S.activeTool="axe";
   const tree={type:"dori",amount:1,cooldown:0,seed:123};S.nodes[surfaceKey(72,52)]=tree;
   harvestNode(72,52,tree);
   const farm={uid:"test-dori-farm",type:"doriFarm",x:72,y:52,progress:59,condition:100,status:"IDLE"};
   tickBuilding(farm,1,{ratio:1});
   S.nodes={};S.money=10000;S.research.push("logistics");
   let constructionPosition=null;
   for(let y=20;y<WORLD_H-2&&!constructionPosition;y++)for(let x=20;x<WORLD_W-2;x++)if(!tileNode(x,y)&&!buildingAt(x,y)){constructionPosition={x,y};break}
   const moneyBeforeBuild=S.money,buildingsBefore=S.buildings.length;
   const reservedMaterialBuild=constructionPosition?placeBuilding("beltAdaptive",constructionPosition.x,constructionPosition.y):false;
   const construction={attempted:!!constructionPosition,placed:reservedMaterialBuild,moneyBefore:moneyBeforeBuild,moneyAfter:S.money,buildingsBefore,buildingsAfter:S.buildings.length};
   const reservationResults={
    machineInput:{...machine.input},moneyBefore,moneyAfter:moneyAfterSale,soldBefore,soldAfter:soldAfterSale,
    survivalBefore,survivalAfter:structuredClone(S.survival),
    tree:{cooldown:tree.cooldown,meat:itemCount("doriMeat")},
    farm:{status:farm.status,progress:farm.progress,meat:itemCount("doriMeat")},
    stock:{water:itemCount("water"),doriMeat:itemCount("doriMeat"),blue:itemCount("doronium_blue")},
    available:{water:availableItemCount(S,"water"),doriMeat:availableItemCount(S,"doriMeat"),blue:availableItemCount(S,"doronium_blue")},
    runtimeValid:validateRuntimeState(S).valid
   };
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   addItem("coal",1,{quality:96,purity:95,synthetic:false},false);
   const coalReservation=reserveItemStacks(S,"coal",1,"reservation-guard-e2e");
   if(!coalReservation)throw new Error("Unable to reserve coal generator test input");
   syncLegacyInventory(S);
   S.buildings=[{uid:"test-reserved-coalgen",type:"coalgen",x:12,y:12,dir:1,progress:0,condition:100,fuelTimer:0,status:"IDLE"}];
   S.paused=false;S.victory=false;tick(STEP);
   const coalGenerator={fuelTimer:S.buildings[0].fuelTimer,status:S.buildings[0].status,power:currentPower().gen,stock:itemCount("coal"),available:availableItemCount(S,"coal"),runtimeValid:validateRuntimeState(S).valid};
   return {construction,coalGenerator,...reservationResults};
  },
  researchAndFacilityPopupTest(){
   const previous=structuredClone(S),previousPanel=activePanel,previousSelectedBuilding=selectedBuilding,previousPanelOpen=controlPanelOpen;
   try{
    S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
    S.money=10000;S.buildings=[{uid:"test-research-lab",type:"lab",dir:1,condition:100,status:"IDLE",progress:0,input:{},inputMeta:{}}];
    addItem("wood",2,{quality:90,purity:90,synthetic:false},false);
    addItem("stone",5,{quality:90,purity:90,synthetic:false},false);
    S.activeResearch="survey";S.researchProgress=13;
    controlPanelOpen=true;$("control-column")?.classList.add("panel-open");$("game-menu-toggle")?.classList.add("active");
    changePanel("research");renderResearch();
    const researchText=$("research-tree").innerText;
    openBuildingManagement(S.buildings[0]);
    const popupText=$("modal-card").innerText;
    const result={
     researchText,popupText,
     countdown: $("research-countdown")?.textContent||"",
     popupCountdown:$("building-research-countdown")?.textContent||"",
     popupVisible:$("modal-overlay").classList.contains("show"),
     requirementsIncludeNames:researchText.includes("소나무")&&researchText.includes("석재"),
     shortageVisible:researchText.includes("부족 3개")
    };
    closeModal();return result;
   }finally{S=previous;selectedBuilding=previousSelectedBuilding;closeModal();controlPanelOpen=previousPanelOpen;$("control-column")?.classList.toggle("panel-open",previousPanelOpen);$("game-menu-toggle")?.classList.toggle("active",previousPanelOpen);changePanel(previousPanel);renderAll()}
  },
  syntheticReservationIsolationTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   addItem("doriMeat",10,{quality:98,purity:98,synthetic:true},false);
   const locked=reserveItemStacks(S,"doriMeat",10,"other-synthetic-process");
   if(!locked)throw new Error("Unable to reserve synthetic Dori Meat for isolation test");
   addItem("doriMeat",10,{quality:96,purity:95,synthetic:false},false);
   syncLegacyInventory(S);
   const aggregate={...S.meta.doriMeat};
   const b={uid:"test-reactor-isolation",type:"reactor",x:10,y:10,dir:1,progress:0,condition:100,input:{},inputMeta:{},output:null,activeMeta:null,temp:25,pressure:0,status:"IDLE"};
   tickMachine(b,STEP,1);
   return {
    aggregate,status:b.status,errorCode:b.errorCode||null,
    activeMeta:b.activeMeta?{...b.activeMeta}:null,
    total:itemCount("doriMeat"),available:availableItemCount(S,"doriMeat"),
    reservedStack:S.runtime.reservations[locked]?.allocations?.map(a=>S.runtime.itemStacks.find(stack=>stack.runtimeID===a.stackID)?.synthetic),
    runtimeValid:validateRuntimeState(S).valid
   };
  },
  reservationMetadataTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   addItem("doronium_normal",3,{quality:99,purity:99,synthetic:false},false);
   const held=reserveItemStacks(S,"doronium_normal",3,"high-grade-locked-stack");
   if(!held)throw new Error("Unable to reserve high-grade metadata test stack");
   addItem("doronium_normal",3,{quality:70,purity:75,synthetic:false},false);
   addItem("quartz",2,{quality:90,purity:90,synthetic:false},false);
   addItem("water",8,{quality:90,purity:100,synthetic:false},false);
   syncLegacyInventory(S);
   const aggregateMeta={...S.meta.doronium_normal};
   const machine={uid:"test-metadata-machine",type:"variantLab",variant:"doronium_blue",input:{},inputMeta:{}};
   supplyMachine(machine);
   return {
    aggregateMeta,
    suppliedMeta:{...machine.inputMeta.doronium_normal},
    reservedStack: S.runtime.reservations[held]?.allocations?.map(a=>({...a,stack:S.runtime.itemStacks.find(s=>s.runtimeID===a.stackID)?{...S.runtime.itemStacks.find(s=>s.runtimeID===a.stackID)}:null})),
    stock:itemCount("doronium_normal"),
    available:availableItemCount(S,"doronium_normal"),
    machineInput:{...machine.input},
    runtimeValid:validateRuntimeState(S).valid
   };
  },
  removeFusionMachineForRecoveryTest(){
   S.buildings=S.buildings.filter(b=>b.type!=="fusion");markSceneDirty();updateFusion(STEP);return {status:window.__doroniumFactoryTest.fusionStatus(),toast:document.querySelector("#toast-stack")?.textContent||""};
  },
  syntheticGuard(){
   S=freshState();S.inventory={doriMeat:10};S.meta={doriMeat:{quality:90,purity:90,synthetic:true}};S.runtime=createRuntimeState();ensureItemStacks(S);
   const b={uid:"test-reactor",type:"reactor",x:1,y:1,dir:1,progress:0,input:{},inputMeta:{},output:null,activeMeta:null,temp:25,pressure:0,status:"IDLE"};
   S.buildings=[b];S.paused=false;tickMachine(b,STEP,1);
   return {status:b.status,remaining:itemCount("doriMeat"),activeMeta:!!b.activeMeta}
  }
 };
}
