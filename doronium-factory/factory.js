import { createWorld3D, createCrystalViewer, DORONIUM_CRYSTAL_MODELS, DORONIUM_CRYSTAL_MODEL_SHAPES, CANONICAL_DORONUM_CRYSTAL_MODELS } from "./world3d.js?v=20";
import { createRuntimeState, ensureItemStacks, addItemStack, allocateEntityID, syncLegacyInventory, availableItemCount, reserveItemStacks, reserveItemBatch, reserveQualifiedItemBatch, releaseItemReservation, commitItemReservations, removeItemStacks, runCanonicalTick, TICK_STAGE_ORDER, requestSaveSnapshot, calculateOutputQuality, calculateOutputPurity, accuracyQuality, validateRuntimeState } from "./simulation-core.js?v=6";
import { WORLD_W, WORLD_H, MINE_W, MINE_H, MINE_LEVELS, biomeAt, terrainHeightAt, mineFloorY, mineDepositKey, mineTunnelAt, makeMineDeposits } from "./terrain-system.js?v=4";
import { validateGameData } from "./game-data-validation.js?v=3";
import { CANONICAL_DORONUM_CATALOG, validateCanonicalDoronumCatalog, auditCanonicalDoronumIntegration, applyDoronumMigration, canonicalItemID } from "./canonical-data.js?v=3";
import { FAILURE_PROFILES } from "./failure-profiles.js?v=2";
import { buildLogisticsGraph, selectLogisticsTarget, analyzeLogisticsPressure } from "./logistics-runtime.js?v=1";
import { solvePowerNetworks } from "./network-runtime.js?v=2";
import { tickFluidNetwork, consumeFluid, FLUID_TYPES } from "./fluid-runtime.js?v=1";
import { calculateFailureRisks, calculateFailureHazard, rollMachineFailure, advanceFailureExposure, applyMachineFailure, completeMachineRepair } from "./failure-runtime.js?v=2";
import { resolveMachinePower, advanceMachineEnvironment, applyMachineWear, commitCompletionBuffer, clearCompletionBuffer } from "./production-runtime.js?v=5";
import { SKILL_NODES, SKILL_GROUPS, createSkillState, normalizeSkillState, awardSkillPoints, unlockSkill, skillNodeStatus, calculateSkillBonuses, validateSkillTree, validateSkillState } from "./skill-runtime.js?v=1";
import { createSaveEnvelope, decodeSave, readBestSave, restoreSaveCandidate, validateSaveEnvelope, writeSaveEnvelope } from "./save-store.js?v=1";
import { writeCloudSave, readCloudSaveSnapshot, replaceCloudSaveAfterExplicitConflict } from "./cloud-save-runtime.js?v=2";
import { settleInfinityFusionOutput } from "./fusion-runtime.js?v=3";
import { beginConstruction, beginBlueprintConstruction, commitConstruction, cancelConstruction, footprintCells, validateConstructionFootprint, createBlueprint, duplicateBlueprint, rotateBlueprint, validateBlueprintPlacement } from "./construction-runtime.js?v=1";
import { createContractState, PACKAGING_STAGES, startContractShipment, advancePackagingStage, dispatchContractShipment, advanceShipments, claimContractReward, cancelContractShipment } from "./contract-runtime.js?v=1";
import { createOwnershipState, addCustody, validateOwnershipState } from "./ownership-runtime.js?v=2";
let createClient = null;

/* DORONIUM FACTORY — INFINITE INDUSTRY
   Standalone Canvas game, deterministic map seed, fixed-step simulation,
   persistent browser save + authenticated per-user Supabase cloud save.
*/
const E2E_MODE = ["localhost","127.0.0.1","::1"].includes(location.hostname) && new URLSearchParams(location.search).has("e2e");
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
 "ITEM_DORONUM_NORMAL":{name:"일반 도로늄",icon:"🔷",price:900,kind:"doronium"},
 "ITEM_DORONUM_YELLOW":{name:"옐로 도로늄",icon:"🟡",price:1100,kind:"doronium"},
 "ITEM_DORONUM_ULTRA":{name:"울트라 도로늄",icon:"💠",price:3000,kind:"doronium"},
 "ITEM_DORONUM_BLUE":{name:"블루 도로늄",icon:"🟦",price:1400,kind:"doronium"},
 "ITEM_DORONUM_RED":{name:"레드 도로늄",icon:"🟥",price:1500,kind:"doronium"},
 "ITEM_DORONUM_IRON":{name:"아이언 도로늄",icon:"⚙️",price:1600,kind:"doronium"},
 "ITEM_DORONUM_ORANGE":{name:"오렌지 도로늄",icon:"🟠",price:1700,kind:"doronium"},
 "ITEM_DORONUM_SLIGHTLY_RUSTED":{name:"약간 부식된 도로늄",icon:"🪨",price:1800,kind:"doronium"},
 "ITEM_DORONUM_RUSTED":{name:"부식된 도로늄",icon:"🟤",price:1200,kind:"doronium"},
 "ITEM_DORONUM_TRANSLUCENT":{name:"반투명 도로늄",icon:"💎",price:2600,kind:"doronium"},
 "ITEM_DORONUM_THERMAL_CRYSTAL":{name:"써멀 크리스탈",icon:"🔥",price:1900,kind:"doronium"},
 "ITEM_DORONUM_COLD_CRYSTAL":{name:"콜드 크리스탈",icon:"❄️",price:1900,kind:"doronium"},
 "ITEM_DORONUM_BLACK":{name:"블랙 도로늄",icon:"⚫",price:2400,kind:"doronium"},
 "ITEM_DORONUM_SPECIAL_EDITION":{name:"스페셜 에디션 도로늄",icon:"✨",price:3200,kind:"doronium"},
 "ITEM_DORONUM_LIMITED_EDITION":{name:"리미티드 에디션 도로늄",icon:"🌟",price:5000,kind:"doronium"},
 "ITEM_DORI_MEAT":{name:"돌이 고기",icon:"🍖",price:55,kind:"special"},
 "ITEM_IRON_ORE":{name:"철광석",icon:"⛏️",price:24,kind:"raw"},"ITEM_QUARTZ":{name:"석영",icon:"💎",price:45,kind:"raw"},"ITEM_DIAMOND":{name:"다이아몬드",icon:"💎",price:180,kind:"raw"},"ITEM_COPPER_WIRE":{name:"구리 전선",icon:"〰️",price:28,kind:"part"},
 "ITEM_GOLD_INGOT":{name:"금괴",icon:"🟨",price:120,kind:"part"},
 "ITEM_COLD_CRYSTAL_RAW":{name:"원시 냉각 결정",icon:"🧊",price:70,kind:"raw"},
 "ITEM_HEAT_CRYSTAL":{name:"열 결정",icon:"🔥",price:70,kind:"raw"},
 "ITEM_CHROME_INGOT":{name:"크롬 주괴",icon:"🔩",price:140,kind:"part"},
 "ITEM_STEEL_PLATE":{name:"강철판",icon:"▰",price:55,kind:"part"},
 "ITEM_MAGNETITE":{name:"자철석",icon:"🪨",price:45,kind:"raw"},
 "ITEM_TITANIUM_PLATE":{name:"티타늄판",icon:"▱",price:180,kind:"part"},
 "ITEM_CARBON_POWDER":{name:"탄소 분말",icon:"⬛",price:35,kind:"raw"},
 titaniumOre:{name:"티타늄 광석",icon:"⛏️",price:95,kind:"raw"},chromiteOre:{name:"크로마이트 광석",icon:"🪨",price:85,kind:"raw"},
 infinity:{name:"인피니티 도로늄",icon:"💠",price:1000000,kind:"final"}
};
const VARIANTS=["ITEM_DORONUM_NORMAL","ITEM_DORONUM_YELLOW","ITEM_DORONUM_ULTRA","ITEM_DORONUM_BLUE","ITEM_DORONUM_RED","ITEM_DORONUM_IRON","ITEM_DORONUM_ORANGE","ITEM_DORONUM_SLIGHTLY_RUSTED","ITEM_DORONUM_RUSTED","ITEM_DORONUM_TRANSLUCENT","ITEM_DORONUM_THERMAL_CRYSTAL","ITEM_DORONUM_COLD_CRYSTAL","ITEM_DORONUM_BLACK","ITEM_DORONUM_SPECIAL_EDITION","ITEM_DORONUM_LIMITED_EDITION"];
const BUILDINGS=[
{id:"belt",name:"컨베이어 벨트",icon:"➜",cat:"logistics",cost:12,materials:{wood:1},desc:"평탄화한 산업 기초 타일 위에 설치하는 표준 운송 벨트입니다. X 키로 방향을 바꾸세요.",unlock:null,kind:"belt",power:0},
{id:"beltAdaptive",name:"자연 적응형 컨베이어",icon:"〰️",cat:"logistics",cost:55,materials:{wood:2,ironPlate:1},desc:"경사와 단차를 따라가며 별도 평탄화나 기초 타일 없이 설치할 수 있습니다.",unlock:"logistics",kind:"belt",power:0},
{id:"storage",name:"산업 창고",icon:"📦",cat:"logistics",cost:90,materials:{wood:6,stone:3},desc:"벨트로 전달된 아이템을 공용 창고에 보관합니다.",unlock:null,kind:"storage",power:0},
{id:"warehouse",name:"통합 물류 센터",icon:"🏬",cat:"logistics",cost:450,materials:{wood:12,ironPlate:5},desc:"인접 벨트의 생산품을 자동으로 회수하고 대량 보관합니다.",unlock:"logistics",kind:"warehouse",power:1},
{id:"solar",name:"태양광 발전기",icon:"☀️",cat:"power",cost:140,materials:{wood:8,stone:4,copperOre:2},desc:"낮에 전력을 생산합니다. 밤에는 발전량이 감소합니다.",unlock:null,kind:"power",power:0,gen:8},
{id:"wind",name:"풍력 발전기",icon:"🌬️",cat:"power",cost:280,materials:{wood:10,stone:8,ironPlate:2},desc:"날씨에 영향을 받지만 밤에도 전력을 공급합니다.",unlock:"electricity",kind:"power",power:0,gen:7},
 {id:"powerCable",name:"전력 케이블",icon:"〰️",cat:"power",cost:18,materials:{wire:2},desc:"인접 케이블과 발전·소비 설비를 연결해 독립 전력망을 구성합니다.",unlock:null,kind:"powerCable",power:0},
 {id:"transformer",name:"산업용 변압기",icon:"⚡",cat:"power",cost:480,materials:{ironPlate:8,wire:10,circuit:2},desc:"연결된 전력망의 최대 전송 용량을 3MW(3,000kW)로 제한합니다.",unlock:"electricity",kind:"transformer",power:0,throughput:30},
 {id:"battery",name:"산업용 배터리",icon:"🔋",cat:"power",cost:550,materials:{ironPlate:6,wire:4,quartz:2},desc:"120,000kJ를 저장하고 최대 800kW로 방전, 400kW로 충전합니다.",unlock:"electricity",kind:"battery",power:0,capacityKJ:120000,maxDischargeKW:8,maxChargeKW:4},

{id:"coalgen",name:"석탄 화력 발전소",icon:"♨️",cat:"power",cost:520,materials:{ironPlate:6,stone:10},desc:"석탄을 태워 안정적으로 대량의 전력을 생산합니다.",unlock:"metallurgy",kind:"power",power:0,gen:18},
{id:"pump",name:"정수 펌프",icon:"💧",cat:"resource",cost:150,materials:{wood:7,stone:5},desc:"수원지에서 물을 끌어올립니다. 물 타일 위에 설치하세요.",unlock:null,kind:"pump",power:1},
{id:"minerIron",name:"철광석 채굴기",icon:"⛏️",cat:"resource",cost:180,materials:{wood:8,stone:5,ironOre:2},desc:"철 광맥에서 철광석을 자동 채굴합니다.",unlock:null,kind:"miner",resource:"ironOre",power:2},
{id:"minerCopper",name:"구리 채굴기",icon:"🟠",cat:"resource",cost:205,materials:{wood:8,stone:5,copperOre:2},desc:"구리 광맥에서 구리 광석을 자동 채굴합니다.",unlock:"mining",kind:"miner",resource:"copperOre",power:2},
{id:"minerCoal",name:"심층 석탄 채굴기",icon:"⬛",cat:"resource",cost:240,materials:{wood:8,ironPlate:2},desc:"석탄 광맥을 자동 채굴합니다.",unlock:"mining",kind:"miner",resource:"coal",power:3},
{id:"minerAdvanced",name:"심층 특수광물 채굴기",icon:"💎",cat:"resource",cost:480,materials:{ironPlate:5,circuit:2,wire:3},desc:"냉각 결정·열 결정·자철석·티타늄·크로마이트 등 특수 광맥을 자동 채굴합니다.",unlock:"mining",kind:"miner",resource:"advanced",power:5},
{id:"mineGen",name:"광산 지열 발전기",icon:"♨️",cat:"power",cost:420,materials:{ironPlate:5,wire:3,stone:8},desc:"석탄 1개로 24초 동안 1.2MW(1,200kW)를 공급하는 지하 발전 설비입니다.",unlock:"mining",kind:"power",power:0,gen:12},
{id:"doriFarm",name:"돌이 나무 재배기",icon:"🌳",cat:"resource",cost:290,materials:{wood:8,stone:6,ironPlate:2},desc:"인접한 돌이 고기 나무를 관리합니다. 60초마다 물 2L를 사용해 열매 1개를 수확합니다.",unlock:"bio",kind:"doriFarm",power:2},
{id:"smelter",name:"고온 제련로",icon:"🔥",cat:"process",cost:280,materials:{stone:10,ironOre:6},desc:"철광석 2개와 석탄 1개를 철판 1개로 제련합니다.",unlock:null,kind:"machine",power:4,recipe:"smelt"},
{id:"goldSmelter",name:"금 주괴 제련로",icon:"🟨",cat:"process",cost:620,materials:{ironPlate:8,circuit:2},desc:"금 광석과 석탄으로 금괴를 생산합니다.",unlock:"mining",kind:"machine",power:7,recipe:"goldIngot"},
{id:"chromeSmelter",name:"크롬 합금 제련로",icon:"🔩",cat:"process",cost:760,materials:{ironPlate:10,circuit:3},desc:"크로마이트 광석을 정제해 크롬 주괴를 생산합니다.",unlock:"mining",kind:"machine",power:8,recipe:"chromeIngot"},
{id:"steelForge",name:"강철 압연 단조로",icon:"▰",cat:"process",cost:540,materials:{ironPlate:8,wire:2},desc:"철광석과 석탄을 사용해 강철판을 생산합니다.",unlock:"metallurgy",kind:"machine",power:6,recipe:"steelPlate"},
{id:"titaniumPress",name:"티타늄 고압 프레스",icon:"▱",cat:"process",cost:920,materials:{ironPlate:12,circuit:4},desc:"티타늄 광석을 고압 가공해 티타늄판을 생산합니다.",unlock:"mining",kind:"machine",power:9,recipe:"titaniumPlate"},
{id:"carbonMill",name:"탄소 분말 분쇄기",icon:"⬛",cat:"process",cost:420,materials:{ironPlate:5,wire:2},desc:"석탄을 미세 분쇄해 탄소 분말을 생산합니다.",unlock:"mining",kind:"machine",power:4,recipe:"carbonPowder"},
{id:"wiremill",name:"전선 압연기",icon:"〰️",cat:"process",cost:250,materials:{wood:8,stone:4},desc:"구리 광석 1개를 전선 2개로 가공합니다.",unlock:null,kind:"machine",power:3,recipe:"wire"},
{id:"assembler",name:"회로 조립기",icon:"▦",cat:"process",cost:430,materials:{ironPlate:4,wire:5},desc:"철판 1개와 전선 2개로 산업 회로를 조립합니다.",unlock:"mechanical",kind:"machine",power:5,recipe:"circuit"},
{id:"lab",name:"기술 연구소",icon:"🔬",cat:"advanced",cost:360,materials:{ironPlate:4,wire:3},desc:"산업 회로와 자금을 사용해 신기술을 연구합니다.",unlock:null,kind:"lab",power:4},
{id:"market",name:"산업 거래소",icon:"⚖️",cat:"logistics",cost:180,materials:{wood:8,ironPlate:2},desc:"인접한 벨트의 생산품을 자동 판매합니다. 일반 거래소 가격의 80%를 지급합니다.",unlock:null,kind:"market",power:0},
{id:"reactor",name:"도로늄 압력 반응로",icon:"🔷",cat:"advanced",cost:1450,materials:{ironPlate:12,circuit:8,wire:6},desc:"비합성 돌이 고기 10개를 고온·고압 공명 공정으로 합성해 일반 도로늄 1개를 만듭니다.",unlock:"doronium",kind:"reactor",power:14,recipe:"doronium"},
{id:"variantLab",name:"결정 변환 연구로",icon:"💎",cat:"advanced",cost:2600,materials:{ironPlate:20,circuit:12,quartz:8},desc:"일반 도로늄을 14가지 특수 결정 계열로 변환합니다. 설비를 선택해 제조 레시피를 설정하세요.",unlock:"variant",kind:"variant",power:18},
{id:"BUILDING_DORONUM_COMPRESSOR",name:"도로늄 공명 압축기",icon:"🔷",cat:"advanced",cost:3200,materials:{ironPlate:24,circuit:14,quartz:10},desc:"비합성 돌이 고기를 공명 압축해 정식 일반 도로늄을 생산합니다.",unlock:"doronium",kind:"reactor",power:14,recipe:"doronium"},
{id:"BUILDING_DORONUM_REFINEMENT_CHAMBER",name:"도로늄 정제 챔버",icon:"💎",cat:"advanced",cost:4200,materials:{ironPlate:30,circuit:18,quartz:12},desc:"옐로·블루·레드·오렌지 도로늄의 정밀 결정화 공정입니다.",unlock:"variant",kind:"variant",variantSelector:true,variantOptions:["ITEM_DORONUM_YELLOW","ITEM_DORONUM_BLUE","ITEM_DORONUM_RED","ITEM_DORONUM_ORANGE"],power:20},
{id:"BUILDING_ULTRA_MATERIAL_PRESS",name:"울트라 소재 프레스",icon:"💠",cat:"advanced",cost:5200,materials:{ironPlate:35,circuit:22,ITEM_TITANIUM_PLATE:8},desc:"냉각·검사 조건을 갖춘 초고압 울트라 도로늄 프레스입니다.",unlock:"pressure",kind:"variant",variantRecipe:"ITEM_DORONUM_ULTRA",power:24},
{id:"BUILDING_REINFORCED_DORONUM_PRESS",name:"강화 도로늄 프레스",icon:"⚙️",cat:"advanced",cost:4600,materials:{ironPlate:32,circuit:16,ITEM_STEEL_PLATE:10},desc:"고하중·마모 저항을 위한 아이언 도로늄을 생산합니다.",unlock:"metallurgy",kind:"variant",variantRecipe:"ITEM_DORONUM_IRON",power:22},
{id:"BUILDING_CONTROLLED_ATMOSPHERE_CHAMBER",name:"제어 분위기 챔버",icon:"🧪",cat:"advanced",cost:4800,materials:{ironPlate:30,circuit:18,ITEM_CHROME_INGOT:8},desc:"산화 도로늄을 제조하고 저순도 부식 결정을 정제합니다.",unlock:"chemistry",kind:"variant",variantSelector:true,variantOptions:["ITEM_DORONUM_SLIGHTLY_RUSTED","ITEM_DORONUM_RUSTED"],supportsPurification:true,power:18},
{id:"BUILDING_OPTICAL_REFINEMENT_CHAMBER",name:"광학 정제 챔버",icon:"🔬",cat:"advanced",cost:5600,materials:{ironPlate:28,circuit:24,ITEM_DIAMOND:4},desc:"광학 센서와 정밀 광전달용 반투명 도로늄을 생산합니다.",unlock:"purity",kind:"variant",variantRecipe:"ITEM_DORONUM_TRANSLUCENT",power:21},
{id:"BUILDING_THERMAL_STABILIZER",name:"열 안정화 설비",icon:"🔥",cat:"advanced",cost:5100,materials:{ironPlate:30,circuit:16,ITEM_HEAT_CRYSTAL:6},desc:"열 교환과 고온 공정을 위한 써멀 크리스탈을 생산합니다.",unlock:"pressure",kind:"variant",variantRecipe:"ITEM_DORONUM_THERMAL_CRYSTAL",power:20},
{id:"BUILDING_COOLING_STABILIZER",name:"저온 안정화 설비",icon:"❄️",cat:"advanced",cost:5100,materials:{ironPlate:30,circuit:16,ITEM_COLD_CRYSTAL_RAW:6},desc:"냉각 루프와 안전 정지를 위한 콜드 크리스탈을 생산합니다.",unlock:"pressure",kind:"variant",variantRecipe:"ITEM_DORONUM_COLD_CRYSTAL",power:20},
{id:"BUILDING_ABSORPTION_PRESS",name:"에너지 흡수 프레스",icon:"⚫",cat:"advanced",cost:6400,materials:{ironPlate:40,circuit:25,ITEM_CARBON_POWDER:10},desc:"피크 부하 흡수와 에너지 버퍼링용 블랙 도로늄을 생산합니다.",unlock:"fusion",kind:"variant",variantRecipe:"ITEM_DORONUM_BLACK",power:26},
{id:"BUILDING_SPECIAL_EDITION_LINE",name:"보안 제조 특수 배치 라인",icon:"✨",cat:"advanced",cost:8500,materials:{ironPlate:50,circuit:30,wire:20},desc:"보안 제조 계약을 완료해 스페셜 에디션 도로늄 캠페인 배치 100개를 수령합니다.",unlock:"SPECIAL_EDITION_BATCH",kind:"campaignLine",power:8},
{id:"BUILDING_FIRST_FACTORY_LEGACY_BATCH_LINE",name:"제1공장 레거시 배치 라인",icon:"🌟",cat:"advanced",cost:11000,materials:{ironPlate:65,circuit:40,wire:25},desc:"고장 난 레거시 라인을 수리한 뒤 리미티드 에디션 캠페인 배치 100개를 수령합니다.",unlock:"infinity",kind:"campaignLine",power:10},
{id:"cooling",name:"초전도 냉각탑",icon:"❄️",cat:"power",cost:950,materials:{ironPlate:10,circuit:4},desc:"고압 설비와 퓨전 반응로의 열을 안정화합니다.",unlock:"pressure",kind:"cooling",power:5},
{id:"fusion",name:"인피니티 퓨전 설비",icon:"🌌",cat:"advanced",cost:12000,materials:{ironPlate:100,circuit:50,quartz:30},desc:"최대 5MW 전력과 7단계 안전 공정을 사용해 정식 도로늄 1,500개를 융합합니다.",unlock:"fusion",kind:"fusion",power:50},
{id:"relay",name:"행성 안정화 릴레이",icon:"📡",cat:"advanced",cost:1500,materials:{ironPlate:25,circuit:15,"ITEM_DORONUM_NORMAL":10},desc:"행성 에너지 노드에 설치하는 안정화 장치입니다.",unlock:"relay",kind:"relay",power:3},
{id:"core",name:"중앙 안정화 코어",icon:"💠",cat:"advanced",cost:4800,materials:{ironPlate:45,circuit:30,"ITEM_DORONUM_SPECIAL_EDITION":5},desc:"인피니티 도로늄을 장착해 행성의 에너지 네트워크를 동기화합니다.",unlock:"infinity",kind:"core",power:12},
{id:"fluidPipe",name:"산업용 유체 파이프",icon:"━",cat:"fluid",cost:24,materials:{ironPlate:1},desc:"인접한 파이프·밸브·탱크·펌프를 연결해 압력 기반 유체를 운송합니다.",unlock:"chemistry",kind:"fluidPipe",power:0},
{id:"fluidValve",name:"유체 차단 밸브",icon:"⚙",cat:"fluid",cost:42,materials:{ironPlate:2,wire:1},desc:"열림/닫힘을 전환해 연결된 유체 경로를 제어합니다.",unlock:"chemistry",kind:"fluidValve",power:0},
{id:"fluidTank",name:"산업용 유체 탱크",icon:"▤",cat:"fluid",cost:210,materials:{ironPlate:6},desc:"최대 2,000L의 물·기름·화학 유체를 저장합니다.",unlock:"chemistry",kind:"fluidTank",power:0},
{id:"fluidPump",name:"고압 취수 펌프",icon:"💧",cat:"fluid",cost:280,materials:{ironPlate:4,wire:3},desc:"수원지에서 물을 취수해 180kPa 압력으로 파이프망에 공급합니다.",unlock:"chemistry",kind:"fluidPump",power:2}
];
// Correct the relay's materials without relying on malformed external data.

const RECIPES={
smelt:{name:"철 제련",inputs:{ironOre:2,coal:1},output:"ironPlate",qty:1,time:12,temp:1538,pressure:100},
wire:{name:"구리 전선 압연",inputs:{copperOre:1},output:"wire",qty:2,time:8,temp:250,pressure:50},
circuit:{name:"산업 회로 조립",inputs:{ironPlate:1,wire:2},output:"circuit",qty:1,time:14,temp:120,pressure:20},
doronium:{name:"도로늄 공명 합성",inputs:{"ITEM_DORI_MEAT":10},output:"ITEM_DORONUM_NORMAL",qty:1,time:42,temp:1800,pressure:1000},
 goldIngot:{name:"금괴 제련",inputs:{goldOre:2,coal:1},output:"ITEM_GOLD_INGOT",qty:1,time:30,temp:950,pressure:10},
 chromeIngot:{name:"크롬 정제",inputs:{chromiteOre:2,coal:2},output:"ITEM_CHROME_INGOT",qty:1,time:45,temp:1250,pressure:30},
 steelPlate:{name:"강철 합금",inputs:{ironOre:3,coal:2},output:"ITEM_STEEL_PLATE",qty:2,time:35,temp:1050,pressure:20},
 titaniumPlate:{name:"티타늄 압착",inputs:{titaniumOre:2,coal:1},output:"ITEM_TITANIUM_PLATE",qty:1,time:50,temp:1450,pressure:40},
 carbonPowder:{name:"탄소 미분화",inputs:{coal:3},output:"ITEM_CARBON_POWDER",qty:2,time:20,temp:500,pressure:5}
};
const VARIANT_RECIPES={
 "ITEM_DORONUM_YELLOW":{name:"옐로 결정화",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_GOLD_INGOT":2,"ITEM_QUARTZ":1},time:45,temp:700,pressure:300},
 "ITEM_DORONUM_ULTRA":{name:"울트라 고압 압축",inputs:{"ITEM_DORONUM_NORMAL":3,"ITEM_DIAMOND":1,"ITEM_TITANIUM_PLATE":2},time:90,temp:1200,pressure:1000,requiresCooling:true},
 "ITEM_DORONUM_BLUE":{name:"저온 안정 결정화",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_COLD_CRYSTAL_RAW":2,"ITEM_QUARTZ":2},time:60,temp:400,pressure:200,requiresCooling:true},
 "ITEM_DORONUM_RED":{name:"열 안정 결정화",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_HEAT_CRYSTAL":2,"ITEM_CHROME_INGOT":2},time:60,temp:1400,pressure:500},
 "ITEM_DORONUM_IRON":{name:"철 원자 격자",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_STEEL_PLATE":3,"ITEM_MAGNETITE":2},time:75,temp:900,pressure:700},
 "ITEM_DORONUM_ORANGE":{name:"전도 공명",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_COPPER_WIRE":10,"ITEM_GOLD_INGOT":1},time:55,temp:800,pressure:400},
 "ITEM_DORONUM_SLIGHTLY_RUSTED":{name:"제어 산화",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_IRON_ORE":1},fluidInputs:{WATER:1},time:40,purityLoss:0},
 "ITEM_DORONUM_RUSTED":{name:"산화 처리",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_IRON_ORE":2},fluidInputs:{WATER:3},time:60,qualityModifier:-8,purityLoss:18},
 "ITEM_DORONUM_TRANSLUCENT":{name:"광학 투명화",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_QUARTZ":4,"ITEM_DIAMOND":1},time:90,temp:650,pressure:500},
 "ITEM_DORONUM_THERMAL_CRYSTAL":{name:"열 에너지 봉인",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_HEAT_CRYSTAL":3},time:75,temp:1100,pressure:600},
 "ITEM_DORONUM_COLD_CRYSTAL":{name:"저온 위상 고정",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_COLD_CRYSTAL_RAW":3},time:75,temp:250,pressure:400},
 "ITEM_DORONUM_BLACK":{name:"에너지 흡수 결정",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_CARBON_POWDER":5,"ITEM_DIAMOND":1},time:100,temp:1000,pressure:800}
};
const PURIFICATION_RECIPES=Object.freeze({
 PURIFY_RUSTED_DORONUM:{name:"부식 도로늄 정제",inputs:{"ITEM_DORONUM_RUSTED":1,"ITEM_CARBON_POWDER":2},fluidInputs:{WATER:2},output:"ITEM_DORONUM_RUSTED",qty:1,time:90,temp:650,pressure:200,purityLoss:0,outputQualityMin:90,outputPurityMin:90}
});
const CAMPAIGN_ACQUISITIONS=Object.freeze({
 SECURITY_MANUFACTURING_CONTRACT:{contractID:"SECURITY_MANUFACTURING_CONTRACT",lineID:"BUILDING_SPECIAL_EDITION_LINE",itemID:"ITEM_DORONUM_SPECIAL_EDITION",quantity:100,researchID:"SPECIAL_EDITION_BATCH",requiresLineRepair:false},
 LIMITED_EDITION_CONTRACT:{contractID:"LIMITED_EDITION_CONTRACT",lineID:"BUILDING_FIRST_FACTORY_LEGACY_BATCH_LINE",itemID:"ITEM_DORONUM_LIMITED_EDITION",quantity:100,researchID:"infinity",requiresLineRepair:true}
});
const CANONICAL_RECIPE_REGISTRY=Object.freeze({
 RECIPE_DORONUM_COMPRESSOR_NORMAL:RECIPES.doronium,
 RECIPE_DORONUM_YELLOW:VARIANT_RECIPES.ITEM_DORONUM_YELLOW,
 RECIPE_DORONUM_ULTRA:VARIANT_RECIPES.ITEM_DORONUM_ULTRA,
 RECIPE_DORONUM_BLUE:VARIANT_RECIPES.ITEM_DORONUM_BLUE,
 RECIPE_DORONUM_RED:VARIANT_RECIPES.ITEM_DORONUM_RED,
 RECIPE_DORONUM_IRON:VARIANT_RECIPES.ITEM_DORONUM_IRON,
 RECIPE_DORONUM_ORANGE:VARIANT_RECIPES.ITEM_DORONUM_ORANGE,
 RECIPE_DORONUM_SLIGHTLY_RUSTED:VARIANT_RECIPES.ITEM_DORONUM_SLIGHTLY_RUSTED,
 RECIPE_DORONUM_RUSTED_OXIDATION:VARIANT_RECIPES.ITEM_DORONUM_RUSTED,
 RECIPE_PURIFY_RUSTED_DORONUM:PURIFICATION_RECIPES.PURIFY_RUSTED_DORONUM,
 RECIPE_DORONUM_TRANSLUCENT:VARIANT_RECIPES.ITEM_DORONUM_TRANSLUCENT,
 RECIPE_DORONUM_THERMAL_CRYSTAL:VARIANT_RECIPES.ITEM_DORONUM_THERMAL_CRYSTAL,
 RECIPE_DORONUM_COLD_CRYSTAL:VARIANT_RECIPES.ITEM_DORONUM_COLD_CRYSTAL,
 RECIPE_DORONUM_BLACK:VARIANT_RECIPES.ITEM_DORONUM_BLACK
});
const CAMPAIGN_ONLY_DORONUM_IDS=Object.freeze(["ITEM_DORONUM_SPECIAL_EDITION","ITEM_DORONUM_LIMITED_EDITION"]);

const SHIPPING_CONTRACTS=[
 {id:"IRON_PLATE_SUPPLY",title:"산업용 철판 보급",itemID:"ironPlate",quantity:4,minQuality:82,minPurity:82,reward:850,deadlineSeconds:3600,transitSeconds:300,forbidSynthetic:false,description:"품질 기준을 만족하는 철판 4개를 산업 거점으로 운송합니다."},
 {id:"CIRCUIT_SUPPLY",title:"정밀 회로 납품",itemID:"circuit",quantity:2,minQuality:88,minPurity:90,reward:2400,deadlineSeconds:5400,transitSeconds:420,forbidSynthetic:false,description:"고품질 산업 회로 2개를 안전 포장해 납품합니다."},
 {id:"DORONIUM_SAMPLE",title:"도로늄 연구 샘플",itemID:"ITEM_DORONUM_NORMAL",quantity:1,minQuality:90,minPurity:90,reward:9000,deadlineSeconds:7200,transitSeconds:600,forbidSynthetic:true,description:"비합성 일반 도로늄 샘플 1개를 격리 포장해 운송합니다."}
];
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
{id:"resonance",name:"공명 주파수 제어",icon:"〽️",tier:3,cost:3200,need:{"ITEM_DORONUM_NORMAL":2,circuit:8},time:160,desc:"공명 반응의 안정성을 높입니다.",requires:["doronium"]},
{id:"variant",name:"결정 변환 기술",icon:"💎",tier:4,cost:4800,need:{"ITEM_DORONUM_NORMAL":3,circuit:10},time:180,desc:"특수 도로늄 변환 연구로를 해금합니다.",requires:["resonance"]},
{id:"purity",name:"초고순도 정제",icon:"✨",tier:4,cost:6200,need:{"ITEM_DORONUM_BLUE":2,circuit:12},time:190,desc:"고순도 도로늄 생산 보정 연구.",requires:["variant"]},
{id:"automation",name:"완전 자동화 프로토콜",icon:"🤖",tier:4,cost:7600,need:{circuit:20,ironPlate:25},time:200,desc:"자동 공급 및 기계 효율 +15%.",requires:["variant"]},
{id:"SPECIAL_EDITION_BATCH",name:"보안 제조 특수 배치 계약",icon:"✨",tier:5,cost:10000,need:{"ITEM_DORONUM_ULTRA":5,circuit:25},time:210,desc:"보안 제조 계약과 스페셜 에디션 캠페인 생산 라인을 해금합니다.",requires:["purity","automation"]},
{id:"fusion",name:"인피니티 퓨전 이론",icon:"🌌",tier:5,cost:12000,need:{"ITEM_DORONUM_SPECIAL_EDITION":5,circuit:30},time:240,desc:"인피니티 퓨전 설비의 설계도를 해금합니다.",requires:["purity","automation","SPECIAL_EDITION_BATCH"]},
{id:"relay",name:"행성 릴레이 공학",icon:"📡",tier:5,cost:16000,need:{"ITEM_DORONUM_YELLOW":5,circuit:35},time:260,desc:"행성 안정화 릴레이를 해금합니다.",requires:["fusion"]},
{id:"infinity",name:"무한 결정 구조",icon:"♾️",tier:6,cost:25000,need:{"ITEM_DORONUM_TRANSLUCENT":10,"ITEM_DORONUM_ULTRA":3},time:300,desc:"중앙 안정화 코어와 최종 프로토콜을 해금합니다.",requires:["relay"]},
{id:"planet",name:"행성 안정화 프로토콜",icon:"🌍",tier:7,cost:40000,need:{"ITEM_DORONUM_RUSTED":3,circuit:30},time:360,desc:"행성 에너지 네트워크 최종 동기화.",requires:["infinity"]}
];
// Fix canonical ingredient keys for a few research entries.



const FUSION_STAGES=[
{name:"물질·공명 분석",temp:500,pressure:100,power:500,time:20},
{name:"에너지 분리",temp:1200,pressure:500,power:1000,time:25},
{name:"분자 평형",temp:1800,pressure:1000,power:1500,time:30},
{name:"초고압 압축",temp:2500,pressure:5000,power:2500,time:35},
{name:"결정 융합",temp:3500,pressure:10000,power:3500,time:40},
{name:"결정 핵 형성",temp:4500,pressure:15000,power:4500,time:50},
{name:"인피니티 결정화",temp:5000,pressure:20000,power:5000,time:60}
];
const DATA_VALIDATION=validateGameData({resources:RESOURCE,recipes:RECIPES,variantRecipes:VARIANT_RECIPES,buildings:BUILDINGS,research:RESEARCH});
if(!DATA_VALIDATION.valid)console.error("Doronium Factory data validation failed",DATA_VALIDATION.errors);
const CANONICAL_DORONUM_VALIDATION=validateCanonicalDoronumCatalog(CANONICAL_DORONUM_CATALOG);
if(!CANONICAL_DORONUM_VALIDATION.valid)console.error("Canonical Doronum catalog validation failed",CANONICAL_DORONUM_VALIDATION.errors);
const CANONICAL_DORONUM_INTEGRATION=auditCanonicalDoronumIntegration({catalog:CANONICAL_DORONUM_CATALOG,resources:RESOURCE,buildings:BUILDINGS,recipes:{...RECIPES,...CANONICAL_RECIPE_REGISTRY},research:RESEARCH,fluidTypes:FLUID_TYPES,modelIDs:CANONICAL_DORONUM_CRYSTAL_MODELS,campaignContractIDs:Object.keys(CAMPAIGN_ACQUISITIONS)});
const QUESTS=[
{id:"q1",chapter:0,title:"폐허의 첫걸음",desc:"숲에서 도끼로 목재 10개를 벌목하고, 첫 번째 광산에서 곡괭이로 석재 10개를 채굴하세요.",reward:250,check:s=>s.stats.gathered.wood>=10&&s.stats.gathered.stone>=10,progress:s=>Math.min(10,s.stats.gathered.wood)+Math.min(10,s.stats.gathered.stone),max:20,orbit:"“기초 자원 확보 확인. 이곳은 아직 충분히 복구할 수 있습니다.”"},
{id:"q2",chapter:0,title:"첫 번째 전력망",desc:"작업 구역을 평탄화하고 기초 타일을 설치한 뒤 태양광 발전기를 건설하세요. 광산에서 철광석 8개도 확보해야 합니다.",reward:400,check:s=>Object.keys(s.foundation||{}).length>0&&hasBuilding(s,"solar")&&(s.stats.gathered.ironOre||0)>=8,progress:s=>(Object.keys(s.foundation||{}).length>0?1:0)+(hasBuilding(s,"solar")?1:0)+Math.min(1,Math.floor((s.stats.gathered.ironOre||0)/8)),max:3,orbit:"“전력 계통이 연결되었습니다. 산업 설비를 가동할 수 있습니다.”"},
{id:"q3",chapter:0,title:"자동화의 시작",desc:"자연 적응형 또는 표준 컨베이어와 제련로를 설치하고 철판 5개를 생산하세요.",reward:650,check:s=>s.buildings.some(b=>isBeltType(b.type))&&hasBuilding(s,"smelter")&&(s.stats.produced.ironPlate||0)>=5,progress:s=>Math.min(1,s.buildings.some(b=>isBeltType(b.type))?1:0)+Math.min(1,s.stats.built.smelter||0)+Math.min(5,s.stats.produced.ironPlate||0),max:7,orbit:"“생산 라인에서 첫 번째 완제품이 확인되었습니다.”"},
{id:"q4",chapter:1,title:"생체 에너지의 흔적",desc:"돌이 나무 재배기를 설치하고 돌이 고기 10개를 수확하세요.",reward:900,check:s=>hasBuilding(s,"doriFarm")&&(s.stats.produced.ITEM_DORI_MEAT||0)>=10,progress:s=>Math.min(1,s.stats.built.doriFarm||0)+Math.min(10,s.stats.produced.doriMeat||0),max:11,orbit:"“분석 결과, 이 식물의 열매는 특이한 분자 에너지 구조를 가지고 있습니다.”"},
{id:"q5",chapter:2,title:"푸른 물질의 정체",desc:"도로늄 공명 이론을 연구하고 일반 도로늄을 처음 합성하세요.",reward:1600,check:s=>s.research.includes("doronium")&&(s.stats.produced.ITEM_DORONUM_NORMAL||0)>=1,progress:s=>(s.research.includes("doronium")?1:0)+Math.min(1,s.stats.produced.ITEM_DORONUM_NORMAL||0),max:2,orbit:"“Unknown material detected. Designation: DORONUM.”"},
{id:"q6",chapter:2,title:"결정의 다변화",desc:"결정 변환 연구로를 건설하고 특수 도로늄 3종을 제조하세요.",reward:2600,check:s=>hasBuilding(s,"variantLab")&&VARIANTS.filter(id=>id!=="ITEM_DORONUM_NORMAL"&&(s.stats.produced[id]||0)>0).length>=3,progress:s=>Math.min(3,VARIANTS.filter(id=>id!=="ITEM_DORONUM_NORMAL"&&(s.stats.produced[id]||0)>0).length)+(hasBuilding(s,"variantLab")?1:0),max:4,orbit:"“15개의 결정 공명 계열이 확인되었습니다. 최초 공장의 기록과 일치합니다.”"},
{id:"q7",chapter:3,title:"인피니티 프로젝트",desc:"인피니티 퓨전 이론을 연구하고 퓨전 설비를 건설하세요.",reward:6000,check:s=>s.research.includes("fusion")&&hasBuilding(s,"fusion"),progress:s=>(s.research.includes("fusion")?1:0)+(hasBuilding(s,"fusion")?1:0),max:2,orbit:"“INFINITE PROJECT identified. 행성 에너지 네트워크 자료를 복구했습니다.”"},
{id:"q8",chapter:3,title:"완벽한 재료",desc:"정식 도로늄 15종을 각각 100개씩 확보하세요. 모든 재료는 품질·순도 90 이상이어야 합니다.",reward:12000,check:s=>VARIANTS.every(id=>(s.inventory[id]||0)>=100&&quality(s,id)>=90&&purity(s,id)>=90&&!synthetic(s,id)),progress:s=>VARIANTS.filter(id=>(s.inventory[id]||0)>=100&&quality(s,id)>=90&&purity(s,id)>=90&&!synthetic(s,id)).length,max:15,orbit:"“모든 입력 결정의 순도와 품질이 기준을 통과했습니다. 퓨전을 시작할 수 있습니다.”"},
{id:"q9",chapter:4,title:"인피니티 결정화",desc:"7단계 퓨전을 완료해 인피니티 도로늄을 제작하세요.",reward:25000,check:s=>(s.inventory.infinity||0)>=1||s.fusionDone,progress:s=>s.fusionDone?1:0,max:1,orbit:"“Infinity Doronum secured. 이제 행성 안정화 장치를 구축해야 합니다.”"},
{id:"q10",chapter:4,title:"행성의 심장",desc:"3개의 릴레이와 중앙 코어를 설치하고 행성 안정화 프로토콜을 실행하세요.",reward:100000,check:s=>s.victory===true,progress:s=>(s.relaySites||[]).filter(Boolean).length+(s.coreInstalled?1:0),max:4,orbit:"“Energy network synchronization complete. Planetary instability: decreasing. Factory status: OPERATIONAL.”"}
];
function hasBuilding(s,id){return s.buildings.some(b=>b.type===id)}
function isBeltType(type){return type==="belt"||type==="beltAdaptive"}
function surfaceKey(x,y){return x+","+y}
function surfaceElevation(x,y){const v=S.flattened?.[surfaceKey(Math.floor(x+.5),Math.floor(y+.5))];return v&&Number.isFinite(v.height)?v.height:terrainHeightAt(x,y)}
function hasFoundation(x,y){const k=surfaceKey(x,y);return !!S.flattened?.[k]&&!!S.foundation?.[k]}
function notifyNewMission(q){if(!q||E2E_MODE)return;const el=$("mission-alert");if(!el)return;el.innerHTML='<div class="mission-alert-kicker">ORBIT · MISSION CONTROL</div><strong>신규 임무 등록</strong><span>'+q.title+'</span>';el.classList.remove("mission-alert-out","mission-alert-in");void el.offsetWidth;el.classList.add("mission-alert-in");setTimeout(()=>{el.classList.remove("mission-alert-in");el.classList.add("mission-alert-out")},1700);setTimeout(()=>el.classList.remove("mission-alert-out"),2450);setTimeout(()=>{const hud=$("active-mission-hud");if(hud){hud.innerHTML='<small>ACTIVE DIRECTIVE · '+String(S.questIndex+1).padStart(2,"0")+'</small><strong>'+q.title+'</strong><span>'+q.desc+'</span>';hud.classList.remove("mission-hud-visible");void hud.offsetWidth;hud.classList.add("mission-hud-visible")}},1850)}
function showStoryIntro(){const el=$("story-intro");if(el)el.hidden=false}
function startCampaign(){const el=$("story-intro");if(el)el.hidden=true;S.campaign??={};S.campaign.introSeen=true;markDirty();toggleFullscreen();playTone(520,.2,"sine");setTimeout(()=>notifyNewMission(getQuest()),380);toast("ORBIT 연결 완료 · 복구 프로토콜 시작")}
function toggleControlPanel(name=activePanel){const wasOpen=controlPanelOpen,previous=activePanel;if(name)changePanel(name);controlPanelOpen=!(wasOpen&&previous===name);$("control-column")?.classList.toggle("panel-open",controlPanelOpen);$("game-menu-toggle")?.classList.toggle("active",controlPanelOpen);if(controlPanelOpen&&document.pointerLockElement===canvas)document.exitPointerLock()}
function closeControlPanel(){controlPanelOpen=false;$("control-column")?.classList.remove("panel-open");$("game-menu-toggle")?.classList.remove("active")}
async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();else await document.exitFullscreen?.()}catch{toast("브라우저에서 전체 화면 전환을 허용하지 않았습니다.","warn")}}
function quality(s,id){return s.meta?.[id]?.quality??(s.inventory?.[id]>0?90:0)}
function purity(s,id){return s.meta?.[id]?.purity??(s.inventory?.[id]>0?90:0)}
function synthetic(s,id){return s.meta?.[id]?.synthetic??false}
function seedRand(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function generateWorldSeed(){if(E2E_MODE)return 827142;try{const value=new Uint32Array(1);globalThis.crypto.getRandomValues(value);return value[0]>>>0}catch{return (Date.now()^Math.floor((globalThis.performance?.now?.()||0)*100000))>>>0}}
function makeWorld(seed=827142){
 const rng=seedRand(seed),nodes={};
 const put=(x,y,type,amount=80)=>{nodes[x+","+y]={type,amount,max:amount,cooldown:0,seed:Math.floor(rng()*1e9)}};
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
 const entrances=[{x:72,y:42},{x:30,y:64},{x:108,y:56},{x:160,y:91},{x:48,y:142}];
 for(const p of entrances)nodes[p.x+","+p.y]={type:"mineEntrance",amount:1,max:1,cooldown:0,seed:0};
 const sites={relay:[{x:9,y:84},{x:118,y:12},{x:113,y:86}],core:{x:66,y:54}};
 for(const p of sites.relay)nodes[p.x+","+p.y]={type:"relaySite",amount:1,max:1,cooldown:0,seed:0};
 nodes[sites.core.x+","+sites.core.y]={type:"coreSite",amount:1,max:1,cooldown:0,seed:0};
 return {nodes,sites,mineDeposits:makeMineDeposits()};
}
function freshState(seed=generateWorldSeed()){
 const world=makeWorld(seed);
 const state={runtime:createRuntimeState(),ownershipLedger:createOwnershipState(),contractRuntime:createContractState((seed^0x4c4f4749)>>>0),constructionLedger:{},moneyReservations:{},blueprints:[],powerTopologyEnabled:false,powerTopologyLayers:{surface:false,mine:{}},version:1,worldVersion:4,seed:seed>>>0,player:{x:72,y:52,viewMode:"first",yaw:0,pitch:-0.12,layer:"surface",mineLevel:1,surfacePosition:null},survival:{health:100,hunger:100,thirst:100},tools:{axe:true,pickaxe:true},activeTool:"pickaxe",mineDeposits:world.mineDeposits,flattened:{},foundation:{},campaign:{introSeen:false},money:1100,inventory:{wood:85,stone:55,ironOre:24,copperOre:18,coal:24,water:32,quartz:2},meta:{},buildings:[],nodes:world.nodes,sites:world.sites,seen:{},research:[],activeResearch:null,researchProgress:0,questIndex:0,day:1,seconds:8*3600,tick:0,simSpeed:1,paused:false,logs:[],stats:{gathered:{},built:{},produced:{},sold:0,energyProduced:0},fusionJob:null,fusionDone:false,campaignAcquisitions:{},relaySites:[false,false,false],coreInstalled:false,victory:false,skills:createSkillState(),settings:{sound:true,reducedMotion:false},lastSavedAt:null};
 ensureItemStacks(state);return state;
}
let S=freshState(), dirty=false, sceneRevision=1, visibilityRevision=1, frameRenderAccumulator=0, selectedBuild=null, selectedBuilding=null, selectedLandTool=null, activeCategory="all", activePanel="build", controlPanelOpen=false, activeBlueprintID=null, activeBlueprintRotation=0, camera={x:72,y:52,zoom:1}, hoverCell=null, canvasRect=null, dpr=1, cloudClient=null, authSession=null, cloudUpdatedAt=null, cloudSaveRevision=0, cloudSaveConflict=null, cloudBusy=false, saveTimer=null, pollTimer=null, lastFrame=0, accumulator=0, drawTime=0, soundCtx=null, crystalViewer=null;
let activeCooldownKeys=new Set(),cooldownNodeSource=null;
let buildingIndex=new Map(),buildingIndexSource=null,buildingIndexRevision=-1,buildingIndexLength=-1;
let playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:Number(S.player.yaw)||0,pitch:Number(S.player.pitch??-.12),path:[],moving:false,facing:0,onArrive:null};
const adventureKeys=new Set();
let mineHeld=false,mineCooldown=0,lookPointer=null,survivalHudClock=0,adventureTarget=null;
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
 for(const b of buildings)buildingIndex.set((b.layer==="mine"?"M"+Number(b.mineLevel||1)+":":"S:")+surfaceKey(b.x,b.y),b);
 buildingIndexSource=buildings;buildingIndexRevision=sceneRevision;buildingIndexLength=buildings.length;
}
function playTone(freq=520,duration=.08,kind="sine"){if(!S.settings.sound)return;try{soundCtx??=new AudioContext();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=kind;osc.frequency.value=freq;gain.gain.setValueAtTime(.035,soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration)}catch{}}
function setCloud(state,label){const el=$("cloud-state");el.className="cloud-state "+state;el.querySelector("span").textContent=label}
function itemCount(id){return availableItemCount(S,canonicalItemID(id))}
function itemQuarantined(id){id=canonicalItemID(id);const stacks=(S.runtime?.itemStacks||[]).filter(s=>s.itemID===id);return stacks.length>0&&stacks.every(s=>s.quarantined===true)}
function addItem(id,qty,meta={},record=true){id=canonicalItemID(id);if(!RESOURCE[id]||qty<=0)return;ensureItemStacks(S);addItemStack(S,id,qty,meta);syncLegacyInventory(S);if(record)S.stats.produced[id]=(S.stats.produced[id]||0)+qty;markDirty()}
function takeItem(id,qty){if(itemCount(id)<qty)return false;const reservation=reserveItemStacks(S,id,qty,"direct-consume");if(!reservation)return false;const removed=commitItemReservations(S,[reservation]);if(!removed){releaseItemReservation(S,reservation);return false}syncLegacyInventory(S);markDirty();return true}
function hasItems(items){return Object.entries(items||{}).every(([id,n])=>availableItemCount(S,id)>=n)}
function takeItems(items){if(!hasItems(items))return false;const reservations=reserveItemBatch(S,items,"multi-item-transaction");if(!reservations)return false;const removed=commitItemReservations(S,reservations);if(!removed){for(const id of reservations)releaseItemReservation(S,id);return false}syncLegacyInventory(S);markDirty();return true}
function buildingMoneyCost(b){const discounted=["storage","warehouse"].includes(b.id)&&S.skills?.unlockedSkillIDs?.includes("BUFFER_ENGINEER");return discounted?Math.max(0,Math.floor(b.cost*.95)):b.cost}
function canAfford(b){return S.money>=buildingMoneyCost(b)&&hasItems(b.materials)}
function unlockOk(b){return !b.unlock||S.research.includes(b.unlock)}
function buildingDef(id){return BUILDINGS.find(b=>b.id===id)}
function buildingAt(x,y){ensureBuildingIndex();const key=(S.player.layer==="mine"?"M"+Number(S.player.mineLevel||1)+":":"S:")+surfaceKey(x,y);return buildingIndex.get(key)||null}
function tileNode(x,y){return S.nodes[x+","+y]||null}
function currentPower(){
 const daylight=(S.seconds%86400)/86400,sun=daylight>.25&&daylight<.78?1:.22,weather=weatherNow(),nodes=[],powerBuildings=[];
 for(const b of S.buildings){
  const def=buildingDef(b.type);if(!def)continue;let node=null;
  if(b.type==="powerCable"&&!b.failureRepair)node={id:b.uid,type:"CABLE",buildingType:b.type};
  else if(b.type==="transformer")node={id:b.uid,type:"TRANSFORMER",maxThroughputKW:b.failureRepair?0:(Number(def.throughput)||30)*100,buildingType:b.type};
  else if(b.type==="battery")node={id:b.uid,type:"BATTERY",energyKJ:Math.max(0,Number(b.energyKJ)||0),capacityKJ:Number(def.capacityKJ)||120000,maxDischargeKW:b.failureRepair?0:(Number(def.maxDischargeKW)||8)*100,maxChargeKW:b.failureRepair?0:(Number(def.maxChargeKW)||4)*100,priority:80,buildingType:b.type};
  else if(b.type==="solar")node={id:b.uid,type:"GENERATOR",generationKW:b.failureRepair?0:def.gen*100*sun*(weather==="Storm"?.45:weather==="Rain"?.72:1),buildingType:b.type};
  else if(b.type==="wind")node={id:b.uid,type:"GENERATOR",generationKW:b.failureRepair?0:def.gen*100*(weather==="Storm"?1.4:weather==="Clear"?.9:1.05),buildingType:b.type};
  else if(b.type==="coalgen"||b.type==="mineGen")node={id:b.uid,type:"GENERATOR",generationKW:!b.failureRepair&&b.fuelTimer>0?(Number(def.gen)|| (b.type==="mineGen"?12:18))*100:0,buildingType:b.type};
  else if((def.power||0)>0){const priority=["relay","core"].includes(b.type)?120:b.type==="cooling"?100:b.type==="fusion"?90:b.type==="lab"?60:["fluidPump"].includes(b.type)?55:["pump","doriFarm"].includes(b.type)?45:20;const fusionActive=S.fusionJob&&["RESERVED","RUNNING","PAUSED_POWER","CALIBRATING","PREFLIGHT"].includes(S.fusionJob.status||"RUNNING");const fusionStage=fusionActive&&Number.isInteger(S.fusionJob.stage)?FUSION_STAGES[S.fusionJob.stage]:null;const demandKW=b.failureRepair?0:b.type==="fusion"?(fusionStage?.power||0):def.power*100;node={id:b.uid,type:"CONSUMER",demandKW,priority,transmissionLoss:0,buildingType:b.type}}
  if(node){node.layer=b.layer||"surface";node.mineLevel=b.mineLevel||0;nodes.push(node);powerBuildings.push(b)}
 }
 const edges=[];
 const topologyEnabledFor=(node)=>{
  const layer=node.layer||"surface";
  if(!S.powerTopologyLayers||typeof S.powerTopologyLayers!=="object")return !!S.powerTopologyEnabled;
  return layer==="mine"?!!S.powerTopologyLayers.mine?.[Number(node.mineLevel)||1]:!!S.powerTopologyLayers.surface;
 };
 for(let i=0;i<powerBuildings.length;i++)for(let j=i+1;j<powerBuildings.length;j++){
  const a=powerBuildings[i],b=powerBuildings[j],sameLayer=(a.layer||"surface")===(b.layer||"surface"),sameMineLevel=(a.layer!=="mine"||Number(a.mineLevel||1)===Number(b.mineLevel||1));
  if(!sameLayer||!sameMineLevel)continue;
  const explicit=topologyEnabledFor({layer:a.layer||"surface",mineLevel:a.mineLevel||0});
  if(explicit){
   const distance=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
   if(distance===1&&(a.type==="powerCable"||b.type==="powerCable"))edges.push({id:"P:"+a.uid+":"+b.uid,from:String(a.uid),to:String(b.uid)});
  }else edges.push({id:"LEGACY:"+a.uid+":"+b.uid,from:String(a.uid),to:String(b.uid)});
 }
 const networks=solvePowerNetworks({nodes,edges,deltaSeconds:STEP}),allocations={},batteryChanges=[];
 for(const network of networks){for(const item of network.allocations)allocations[item.id]=item;for(const change of network.batteryChanges||[])batteryChanges.push(change)}
 const gen=networks.reduce((n,x)=>n+x.generationKW,0),used=networks.reduce((n,x)=>n+x.allocations.reduce((a,v)=>a+v.demandKW,0),0),delivered=networks.reduce((n,x)=>n+x.allocatedKW,0),storageDischargeKW=networks.reduce((n,x)=>n+x.storageDischargeKW,0);
 return {gen,used,delivered,ratio:used===0?1:Math.min(1,delivered/used),raw:gen+storageDischargeKW-used,allocations,networks,batteryChanges,topologyEnabled:!!S.powerTopologyEnabled,networkCount:networks.length};
}
function settlePowerStorage(power){
 for(const change of power?.batteryChanges||[]){const battery=S.buildings.find(b=>String(b.uid)===String(change.id));if(battery?.type==="battery")battery.energyKJ=Math.max(0,Number(change.afterKJ)||0)}
}
function weatherNow(){const day=Math.floor(S.seconds/86400);return ["Clear","Clear","Rain","Clear","Storm","Clear","Snow"][day%7]}
function revealAround(){if(S.player.layer==="mine")return;let changed=false;const radius=11*calculateSkillBonuses(S.skills).scannerRangeMultiplier,limit=radius*radius;for(let y=-Math.ceil(radius);y<=Math.ceil(radius);y++)for(let x=-Math.ceil(radius);x<=Math.ceil(radius);x++){if(x*x+y*y>limit)continue;const xx=S.player.x+x,yy=S.player.y+y;if(xx>=0&&yy>=0&&xx<WORLD_W&&yy<WORLD_H){const key=xx+","+yy;if(!S.seen[key]){S.seen[key]=true;changed=true}}}if(biomeAt(S.player.x,S.player.y)==="crystal")claimSkillPoint("EXPLORATION_CRYSTAL_CAVERN");if(changed)markVisibilityDirty()}
function getQuest(){return S.questIndex>=QUESTS.length?null:QUESTS[S.questIndex]}
function questCheck(){const q=getQuest();if(!q||S.victory)return;const ok=q.check(S);if(ok){S.money+=q.reward;S.questIndex=Math.min(QUESTS.length,S.questIndex+1);const oldChapter=Math.max(0,Number(S.chapter)||0);S.chapter=Math.max(oldChapter,q.chapter);for(let chapter=oldChapter+1;chapter<=Math.min(4,S.chapter);chapter++)claimSkillPoint("STORY_CHAPTER_"+chapter);log("임무 완료: "+q.title,"good");toast("임무 완료 · "+q.title+"  +"+fmt(q.reward)+" D");$("orbit-dialogue").textContent=q.orbit;playTone(720,.18,"triangle");markDirty();$("active-mission-hud")?.classList.remove("mission-hud-visible");renderMissions();renderHud();renderQuickObjectives();setTimeout(()=>notifyNewMission(getQuest()),650)}}
function changePanel(name){activePanel=name;document.querySelectorAll(".main-tab").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));document.querySelectorAll(".panel-view").forEach(p=>p.classList.toggle("active",p.id==="panel-"+name));if(name==="inventory")renderInventory();if(name==="research")renderResearch();if(name==="mission")renderMissions();if(name==="factory")renderFactory()}
function renderHud(){const p=currentPower();$("hud-money").textContent=short(S.money)+" D";$("hud-doronium").textContent=short(VARIANTS.reduce((a,id)=>a+itemCount(id),0));$("hud-power").textContent=(p.used?Math.round(p.ratio*100):Math.round(p.gen))+"%";$("hud-tier").textContent="TIER "+Math.min(7,Math.floor(S.research.length/2));$("build-count").textContent=S.buildings.length+" / "+BUILDING_LIMIT;$("active-machines").textContent="가동 기계 "+S.buildings.filter(b=>b.status==="RUNNING").length;$("world-population").textContent="엔지니어 1";$("system-state").textContent=p.used>p.gen?"전력 부족":S.victory?"행성 안정화 완료":"시스템 정상";$("sim-speed").textContent="시뮬레이션 "+S.simSpeed+"×";$("pause-sim").textContent=S.paused?"▶ 재개":"Ⅱ 일시정지";$("speed-sim").textContent="속도 "+S.simSpeed+"×";const day=Math.floor(S.seconds/86400)+1,sec=S.seconds%86400,h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);$("world-clock-text").textContent="DAY "+String(day).padStart(2,"0")+" · "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");$("day-icon").textContent=h>=6&&h<18?"☀":"☾";$("weather-label").textContent=({Clear:"맑음",Rain:"비",Storm:"폭풍",Snow:"눈",Heat:"폭염"})[weatherNow()]||"맑음";$("world-coordinate").textContent="SECTOR "+String(Math.floor(S.player.x/16)+1).padStart(2,"0")+" / X: "+(S.player.x*32-2048)+"m · Z: "+(S.player.y*32-1536)+"m";const biome=biomeAt(S.player.x,S.player.y);const biomeName=({forest:"고대 숲",meadow:"초원",wetland:"습지",desert:"붉은 사막",highlands:"고산 지대",frost:"빙설 산맥",crystal:"수정 협곡",volcanic:"화산 지대"})[biome]||"탐사 구역";$("region-title").innerHTML=biomeName+' <span>SECTOR '+String(Math.floor(S.player.x/16)+1).padStart(2,"0")+"-"+String(Math.floor(S.player.y/16)+1).padStart(2,"0")+"</span>";
 const v=S.survival||{health:100,hunger:100,thirst:100};
 for(const [key,value] of [["health",v.health],["hunger",v.hunger],["thirst",v.thirst]]){
  const fill=$(key+"-fill"),label=$(key+"-value");if(fill)fill.style.width=clamp(value,0,100)+"%";if(label)label.textContent=Math.ceil(value);
 }
 document.querySelectorAll("[data-view-mode]").forEach(b=>b.classList.toggle("active",b.dataset.viewMode===S.player.viewMode));document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===S.activeTool));if($("equipped-tool-label"))$("equipped-tool-label").textContent=S.activeTool==="axe"?"도끼 장착":"곡괭이 장착";
}
function renderBuildList(){const list=BUILDINGS.filter(b=>{const mineOnly=["minerIron","minerCopper","minerCoal","mineGen"].includes(b.id);return (S.player.layer==="mine"?mineOnly||b.id==="powerCable":!mineOnly)&&(activeCategory==="all"||b.cat===activeCategory)});$("build-list").innerHTML=list.map(b=>{const locked=!unlockOk(b),afford=canAfford(b);const material=Object.entries(b.materials||{}).map(([id,n])=>(RESOURCE[id]?.icon||"◆")+fmt(n)).join(" ");return '<button class="build-card '+(selectedBuild===b.id?"selected ":"")+(locked?"locked":"")+'" data-build="'+b.id+'"><div class="build-top"><span class="build-icon">'+b.icon+'</span><div style="min-width:0"><div class="build-name">'+b.name+'</div><div class="build-kind">'+({resource:"자원 생산",power:"전력 시설",fluid:"유체 설비",process:"가공 설비",logistics:"물류 시설",advanced:"첨단 산업"})[b.cat]+'</div></div></div><div class="build-cost"><b>'+fmt(buildingMoneyCost(b))+' D</b><em>'+material+'</em></div>'+(locked?'<span class="build-lock-label">🔒 연구 필요</span>':"")+'</button>'}).join("");renderBuildInspector();renderBlueprints()}
function renderBuildInspector(){const b=buildingDef(selectedBuild);const el=$("build-inspector");$("build-mode-dot").classList.toggle("build",!!b||!!activeBlueprintID);$("build-mode-text").textContent=activeBlueprintID?"설계도 배치 모드 · 회전 "+(activeBlueprintRotation*90)+"° / 기준 타일을 선택":b?"건설 모드 · "+b.name+" / 설치할 타일을 클릭":"선택 모드 · 시설을 선택하거나 자원을 채집하세요";if(!b){el.innerHTML='<div class="inspector-empty"><span>⌖</span><strong>건설 설비를 선택하세요</strong><p>시설을 선택하면 비용과 기능을 확인할 수 있습니다.</p></div>';return}const footprint=getBuildingFootprint(b.id),cost='<span>'+fmt(buildingMoneyCost(b))+' D</span>'+Object.entries(b.materials||{}).map(([id,n])=>'<span>'+RESOURCE[id].icon+" "+fmt(n)+" "+RESOURCE[id].name+"</span>").join("");el.innerHTML='<div class="inspector-title"><span class="build-icon">'+b.icon+'</span><div><strong>'+b.name+'</strong><small>'+b.desc+'</small></div></div><p class="inspector-desc">'+b.desc+'</p><div class="blueprint-footprint-note">설치 면적 · '+footprint.width+' × '+footprint.height+' 타일</div><div class="cost-line">'+cost+'</div><div class="inspector-actions"><button class="action-button" id="place-mode" '+(!canAfford(b)||!unlockOk(b)?"disabled":"")+'>설치할 위치 선택</button><button class="action-button secondary" id="cancel-build">취소</button></div>';$("place-mode").onclick=()=>{if(!canAfford(b)||!unlockOk(b)){toast("연구 또는 자원이 부족합니다.","warn");return}selectedBuild=b.id;renderBuildList();toast("월드에서 설치할 위치를 클릭하세요.")};$("cancel-build").onclick=()=>{selectedBuild=null;renderBuildList();drawWorld()}}
function findContractShipment(contractID){
 const rows=(S.contractRuntime?.shipments||[]).filter(s=>s.contractID===contractID);
 const active=rows.slice().reverse().find(s=>["PACKAGING","READY","IN_TRANSIT"].includes(s.status));
 if(active)return active;
 return rows.slice().reverse().find(s=>["DELIVERED","FAILED"].includes(s.status)&&!s.paid)||null;
}
function startDeliveryContract(contractID){
 const contract=SHIPPING_CONTRACTS.find(x=>x.id===contractID);if(!contract)return;
 const result=startContractShipment(S,S.contractRuntime,contract,{routeRisk:.08,insured:true,nowSeconds:S.seconds});
 if(!result.ok){toast(result.reason==="NO_QUALIFIED_CARGO"?"품질·순도·합성 조건을 만족하는 화물이 부족합니다.":"계약을 시작할 수 없습니다: "+result.reason,"warn");return}
 log("배송 계약 수락 · "+contract.title);markDirty();renderContracts();
}
function packageDeliveryContract(shipmentID){
 const result=advancePackagingStage(S,S.contractRuntime,shipmentID);
 if(!result.ok){toast(result.reason==="PACKAGING_MATERIALS_MISSING"?"포장 재료가 부족합니다. 창고에서 재료를 준비하세요.":"포장 단계를 진행할 수 없습니다.","warn");return}
 log("배송 포장 완료 · "+(PACKAGING_STAGES.find(x=>x.id===result.stage)?.name||result.stage));markDirty();renderContracts();renderInventory();
}
function dispatchDeliveryContract(shipmentID){
 const result=dispatchContractShipment(S,S.contractRuntime,shipmentID);
 if(!result.ok){toast("출고 실패 · "+result.reason,"warn");return}
 log("운송 출고 완료 · "+result.shipment.quantity+"개");markDirty();renderContracts();renderInventory();
}
function claimDeliveryContract(shipmentID){
 const result=claimContractReward(S,S.contractRuntime,shipmentID);
 if(!result.ok){toast("아직 정산할 수 없는 계약입니다.","warn");return}
 if(result.duplicate){toast("이미 지급된 계약 보상입니다.");return}
 log("배송 계약 보상 수령 · +"+fmt(result.reward)+" D","good");markDirty();renderHud();renderContracts();
}
function cancelDeliveryContract(shipmentID){
 if(!cancelContractShipment(S,S.contractRuntime,shipmentID)){toast("현재 단계에서는 계약을 취소할 수 없습니다.","warn");return}
 toast("출고 전 계약이 취소되었고 화물 예약이 해제되었습니다.");markDirty();renderContracts();renderInventory();
}
function renderContracts(){
 const host=$("contract-list");if(!host)return;
 host.innerHTML=SHIPPING_CONTRACTS.map(contract=>{
  const shipment=findContractShipment(contract.id);
  const active=!!shipment&&["PACKAGING","READY","IN_TRANSIT"].includes(shipment.status);
  const unpaid=!!shipment&&["DELIVERED","FAILED"].includes(shipment.status)&&!shipment.paid;
  const status=!shipment?"계약 대기":shipment.status==="PACKAGING"?"포장 진행":shipment.status==="READY"?"출고 대기":shipment.status==="IN_TRANSIT"?"운송 중":shipment.status==="DELIVERED"?"배송 성공":shipment.status==="FAILED"?"배송 실패":"완료";
  const requirement=(RESOURCE[contract.itemID]?.name||contract.itemID)+" "+fmt(contract.quantity)+"개 · 품질 "+contract.minQuality+ " / 순도 "+contract.minPurity;
  let actions="";
  if(!active&&!unpaid)actions='<button type="button" class="action-button gold-button" data-contract-action="accept" data-contract-id="'+contract.id+'">계약 수락</button>';
  else if(shipment.status==="PACKAGING")actions='<button type="button" class="action-button" data-contract-action="package" data-shipment-id="'+shipment.shipmentID+'">포장 단계 진행 ('+shipment.packageStage+'/5)</button><button type="button" class="action-button secondary" data-contract-action="cancel" data-shipment-id="'+shipment.shipmentID+'">취소</button>';
  else if(shipment.status==="READY")actions='<button type="button" class="action-button gold-button" data-contract-action="dispatch" data-shipment-id="'+shipment.shipmentID+'">출고 시작</button>';
  else if(shipment.status==="IN_TRANSIT")actions='<span class="contract-progress">남은 운송 '+Math.ceil(Math.max(0,shipment.transitSeconds-(shipment.transitElapsed||0)))+'초</span>';
  else if(unpaid)actions='<button type="button" class="action-button gold-button" data-contract-action="claim" data-shipment-id="'+shipment.shipmentID+'">보상 '+fmt(shipment.settlement||0)+' D 수령</button>';
  else if(shipment?.paid)actions='<span class="contract-progress">보상 수령 완료</span>';
  const progress=shipment?.status==="PACKAGING"?" · 포장 "+shipment.packageStage+"/5":shipment?.status==="IN_TRANSIT"?" · 위험도 "+Math.round(shipment.routeRisk*100)+"%":shipment?.status==="DELIVERED"?" · Q "+Math.round(shipment.finalQuality)+" / P "+Math.round(shipment.finalPurity):shipment?.status==="FAILED"?" · 보험 "+(shipment.insured?"가입":"미가입"):"";
  return '<article class="contract-card"><div class="contract-head"><div><strong>'+contract.title+'</strong><small>'+status+progress+'</small></div><b>+'+fmt(contract.reward)+' D</b></div><p>'+contract.description+'</p><div class="contract-requirement">'+requirement+'</div><div class="contract-footer"><span>마감 '+Math.round(contract.deadlineSeconds/60)+'분 · 포장 5단계</span><div class="contract-actions">'+actions+'</div></div></article>';
 }).join("");
 host.querySelectorAll("[data-contract-action]").forEach(button=>button.addEventListener("click",()=>{
  const action=button.dataset.contractAction,shipmentID=button.dataset.shipmentId,contractID=button.dataset.contractId;
  if(action==="accept")startDeliveryContract(contractID);
  else if(action==="package")packageDeliveryContract(shipmentID);
  else if(action==="dispatch")dispatchDeliveryContract(shipmentID);
  else if(action==="claim")claimDeliveryContract(shipmentID);
  else if(action==="cancel")cancelDeliveryContract(shipmentID);
 }));
}
function renderInventory(){
 const items=Object.entries(S.inventory||{}).filter(([,total])=>Number(total)>0).map(([id,total])=>[id,availableItemCount(S,id),Math.max(0,Number(total)-availableItemCount(S,id))]).sort((a,b)=>(RESOURCE[a[0]]?.kind||"").localeCompare(RESOURCE[b[0]]?.kind||""));
 const quarantined=Object.entries(S.quarantinedInventory||{}).filter(([,n])=>Number(n)>0).sort(([a],[b])=>a.localeCompare(b));
 const kinds=items.length,availableTotal=items.reduce((sum,[,available])=>sum+available,0),reservedTotal=items.reduce((sum,[,available,reserved])=>sum+reserved,0),quarantinedTotal=quarantined.reduce((sum,[,n])=>sum+Number(n||0),0);
 $("inventory-slots").textContent=kinds+" 종류";
 $("inventory-summary").innerHTML='<div><small>아이템 종류</small><strong>'+kinds+'</strong></div><div><small>사용 가능 수량</small><strong>'+short(availableTotal)+'</strong></div><div><small>작업 예약 수량</small><strong>'+short(reservedTotal)+'</strong></div><div><small>격리 보관 수량</small><strong>'+short(quarantinedTotal)+'</strong></div>';
 $("inventory-grid").innerHTML=items.map(([id,available,reserved])=>'<div class="inventory-item"><span class="res-icon">'+(RESOURCE[id]?.icon||"◈")+'</span><div><strong>'+escapeHTML(RESOURCE[id]?.name||id)+'</strong><small>사용 가능 '+fmt(available)+(reserved>0?' · 예약 '+fmt(reserved):"")+' · Q '+Math.round(quality(S,id))+' · P '+Math.round(purity(S,id))+(synthetic(S,id)?" · 합성":" · 비합성")+'</small></div><b>'+fmt(available+reserved)+'</b></div>').join("")||'<div class="inspector-empty">창고가 비어 있습니다.</div>';
 const quarantineHost=$("quarantine-grid");
 if(quarantineHost)quarantineHost.innerHTML=quarantined.map(([id,n])=>{
  const meta=S.quarantinedMeta?.[id]||{},stacks=(S.runtime?.itemStacks||[]).filter(stack=>stack.itemID===id&&stack.quarantined);
  const reasons=[...new Set(stacks.map(stack=>String(stack.quarantineReason||"정식 ID 대응 관계 미확정")))];
  return '<div class="inventory-item quarantine-item"><span class="res-icon">⚠️</span><div><strong>'+escapeHTML(RESOURCE[id]?.name||id)+'</strong><small>격리 사유 · '+escapeHTML(reasons.join(" / "))+' · Q '+Math.round(Number(meta.quality)||0)+' · P '+Math.round(Number(meta.purity)||0)+'</small></div><b>'+fmt(n)+'</b></div>';
 }).join("")||'<div class="inspector-empty">격리된 자원이 없습니다.</div>';
 $("crystal-codex").innerHTML=VARIANTS.map(id=>{
  const total=Math.max(0,Number(S.inventory[id])||0),reserved=Math.max(0,total-itemCount(id));
  return '<button class="crystal-codex-card" data-crystal="'+id+'"><span>'+RESOURCE[id].icon+'</span><strong>'+RESOURCE[id].name+'</strong><small>'+(total>0?"보유 "+fmt(total)+(reserved>0?" · 예약 "+fmt(reserved):""):"도감 미발견")+'</small></button>';
 }).join("")+'<button class="crystal-codex-card infinity-card" data-crystal="infinity"><span>💠</span><strong>인피니티 도로늄</strong><small>'+(Math.max(0,Number(S.inventory.infinity)||0)>0?"보유 "+fmt(S.inventory.infinity):"최종 결정")+'</small></button>';
 const sellable=items.filter(([id,available])=>available>0&&id!=="infinity");
 const sel=$("sell-resource"),old=sel.value;
 sel.innerHTML=sellable.map(([id,available])=>'<option value="'+id+'">'+(RESOURCE[id]?.icon||"◈")+" "+escapeHTML(RESOURCE[id]?.name||id)+" ("+fmt(available)+")</option>").join("");
 if(sellable.some(([id])=>id===old))sel.value=old;
 updateMarketEstimate();renderContracts();
}
function updateMarketEstimate(){const id=$("sell-resource").value,n=Math.max(0,Math.floor(Number($("sell-amount").value)||0));$("market-estimate").textContent="판매 예상액 "+fmt(n*(RESOURCE[id]?.price||0))+" D"}
function renderFactory(){const p=currentPower();const built=S.buildings.length;const batteries=S.buildings.filter(b=>b.type==="battery");const batteryEnergy=batteries.reduce((n,b)=>n+Math.max(0,Number(b.energyKJ)||0),0);const batteryCapacity=batteries.reduce((n,b)=>n+Math.max(0,Number(buildingDef(b.type)?.capacityKJ)||0),0);const lines=[["⚡","전력 생산",fmt(p.gen)+" kW"],["ϟ","전력 소비",fmt(p.used)+" kW"],["🔗","전력 네트워크",S.powerTopologyEnabled?String(p.networkCount||0)+"개":"기존 공유망"],["🔋","배터리 저장",fmt(batteryEnergy)+" / "+fmt(batteryCapacity)+" kJ"],["🏭","설비 수",built+" 개"],["💎","도로늄 생산",fmt(S.stats.produced.ITEM_DORONUM_NORMAL||0)+" 개"]];$("operation-cards").innerHTML=lines.map(x=>'<div class="operation-card"><small>'+x[0]+" "+x[1]+'</small><strong>'+x[2]+'</strong><em>실시간 운영 지표</em></div>').join("");renderMachineDetails();renderEvents()}
function renderMachineDetails(){const el=$("machine-details");const b=S.buildings.find(x=>x.uid===selectedBuilding);if(!b){el.innerHTML='<div class="inspector-empty"><span>⌖</span><strong>월드에서 기계를 선택하세요</strong><p>기계의 레시피, 방향, 입출력 버퍼와 상태를 확인할 수 있습니다.</p></div>';return}const d=buildingDef(b.type),recipe=RECIPES[d.recipe]||(b.type==="variantLab"?VARIANT_RECIPES[b.variant||"ITEM_DORONUM_BLUE"]:null);const input=Object.entries(b.input||{}).map(([id,n])=>RESOURCE[id].icon+fmt(n)).join(" · ")||"없음";const output=b.output?RESOURCE[b.output.id]?.icon+" "+fmt(b.output.qty)+" "+(RESOURCE[b.output.id]?.name||b.output.id):"없음";const status=b.status==="RUNNING"?"가동 중":b.status==="BROWNOUT_RUNNING"?"저전력 가동":b.status==="PAUSED_POWER"?"전력 부족":b.status==="PAUSED_OUTPUT"?"출력 대기":b.status==="WAITING_INPUT"?"원료 대기":b.status==="MAINTENANCE"?"정비 중":b.status==="BROKEN"?"고장":b.status==="COOLING"?"온도·압력 안정화":b.status==="NO_INPUT"?"원료 부족":b.status==="DEPLETED"?"광맥 고갈":b.status==="ERROR"?"오류":"대기";el.innerHTML='<div class="inspector-title"><span class="build-icon">'+d.icon+'</span><div><strong>'+d.name+'</strong><small>'+status+' · 방향 '+DIRS[b.dir||1].name+' · 내구도 '+Math.round(b.condition||100)+'%</small></div></div><div class="machine-kpi"><div><small>생산 공정</small><b>'+(recipe?.name||({miner:"자원 채굴",pump:"물 공급",doriFarm:"돌이 고기 수확",power:"전력 공급",fusion:"인피니티 퓨전"})[d.kind]||"산업 설비")+'</b></div><div><small>공정 진행률</small><b>'+Math.round((b.progress||0)/(recipe?.time||10)*100)+'%</b></div></div><div class="machine-buffer"><span>투입 버퍼</span><b>'+input+'</b></div><div class="machine-buffer"><span>출력 버퍼</span><b>'+output+'</b></div>'+(b.layer==="mine"&&d.kind==="miner"?'<div class="machine-buffer"><span>광산 층 · 광맥 잔량</span><b>'+(Number(b.mineLevel)||1)+'층 · '+Math.max(0,Number(S.mineDeposits?.[b.targetDepositKey]?.amount)||0)+'개</b></div><div class="machine-buffer"><span>드릴 내구도</span><b>'+Math.max(0,Math.round(Number(b.drillDurability)||0))+' / 1000</b></div>':"")+(b.type==="mineGen"?'<div class="machine-buffer"><span>지하 발전기 연료</span><b>'+Math.ceil(Math.max(0,Number(b.fuelTimer)||0))+'초 · '+((d.gen||12)*100)+'kW</b></div>':"")+(d.kind==="variant"||b.type==="variantLab"?'<div class="machine-buffer"><span>결정 레시피</span><b>'+RESOURCE[b.variant||"ITEM_DORONUM_BLUE"].name+'</b></div>':"")+'<div class="machine-controls"><button class="action-button" id="machine-collect" '+(!b.output?"disabled":"")+'>출력 회수</button><button class="action-button secondary" id="machine-supply">창고에서 투입</button><button class="action-button secondary" id="machine-rotate">방향 회전</button><button class="action-button danger" id="machine-remove">해체</button>'+(b.type==="fluidValve"?'<button class="action-button" id="machine-valve">'+(b.valveOpen===false?"밸브 열기":"밸브 닫기")+"</button>":"")+(Number(b.fluidAmountL)>1e-9?'<button class="action-button" id="machine-fluid-drain">유체를 연결 탱크로 배출</button>':"")+(b.failureRepair?'<button class="action-button gold-button" id="machine-repair">정비 시작 · '+fmt(b.failureRepair.repairSeconds)+'초</button>':"")+(b.type==="variantLab"?'<button class="action-button secondary" id="machine-recipe">레시피 변경</button>':"")+(b.type==="fusion"?'<button class="action-button secondary" id="machine-fusion-diagnostics">사전 진단 3종 실행</button><button class="action-button gold-button" id="machine-fusion">퓨전 시작</button>'+(S.fusionJob&&!S.fusionJob.legacyConsumedInput&&Array.isArray(S.fusionJob.reservationIDs)&&S.fusionJob.reservationIDs.length?'<button class="action-button danger" id="machine-fusion-cancel">퓨전 취소 · 원료 반환</button>':""):"")+(b.type==="core"?'<button class="action-button gold-button" id="machine-core">인피니티 설치</button>':"")+'</div>';if(b.type==="fusion"){const diagnostic=document.createElement("div");diagnostic.className="machine-buffer";const checks=S.fusionDiagnostics||{};diagnostic.textContent="사전 진단 · 전력 "+(checks.powerStability?.passed?"통과":"미실행/실패")+" · 압력 센서 "+(checks.pressureSensorCalibration?.passed?"통과":"미실행/실패")+" · 비상 냉각 "+(checks.emergencyCooling?.passed?"통과":"미실행/실패");el.append(diagnostic)}if(["fluidPipe","fluidValve","fluidTank","fluidPump"].includes(b.type)){const fluidPanel=document.createElement("div");fluidPanel.className="machine-buffer";const network=b.fluidNetworkID||"연결 대기";const amount=Math.max(0,Number(b.fluidAmountL)||0);const unit=b.type==="fluidTank"?2000:b.type==="fluidPump"?120:100;fluidPanel.textContent="유체 네트워크 · "+network+" / "+(b.fluidType||"비어 있음")+" · "+amount.toFixed(1)+" / "+unit+" L · "+Math.round(Number(b.fluidPressureKPa)||0)+" kPa";el.append(fluidPanel);if(b.fluidContaminants?.length){const warning=document.createElement("div");warning.className="machine-buffer";warning.textContent="오염 물질 · "+b.fluidContaminants.join(", ");el.append(warning)}}$("machine-collect").onclick=()=>collectOutput(b);$("machine-supply").onclick=()=>supplyMachine(b);$("machine-rotate").onclick=()=>{b.dir=((b.dir||1)+1)%4;markDirty();renderMachineDetails();drawWorld()};$("machine-remove").onclick=()=>removeBuilding(b);if($("machine-repair"))$("machine-repair").onclick=()=>repairMachine(b);if($("machine-valve"))$("machine-valve").onclick=()=>{b.valveOpen=b.valveOpen===false;markDirty();renderMachineDetails();toast(b.valveOpen?"유체 밸브를 열었습니다.":"유체 밸브를 닫았습니다.")};if($("machine-fluid-drain"))$("machine-fluid-drain").onclick=()=>drainFluidToTank(b);if($("machine-recipe"))$("machine-recipe").onclick=()=>chooseVariant(b);if($("machine-fusion-diagnostics"))$("machine-fusion-diagnostics").onclick=runFusionDiagnostics;if($("machine-fusion"))$("machine-fusion").onclick=startFusion;if($("machine-fusion-cancel"))$("machine-fusion-cancel").onclick=cancelFusion;if($("machine-core"))$("machine-core").onclick=()=>installCore(b)}
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

function renderResearch(){const done=S.research.length;$("research-progress-label").textContent=done+" / "+RESEARCH.length;$("research-percent").textContent=Math.round(done/RESEARCH.length*100)+"%";$("research-progress-bar").style.width=done/RESEARCH.length*100+"%";$("research-tree").innerHTML=RESEARCH.map(r=>{const complete=S.research.includes(r.id),available=!complete&&(!r.requires||r.requires.every(id=>S.research.includes(id)));const active=S.activeResearch===r.id;return '<div class="research-node '+(complete?"complete":available?"available":"")+'"><span class="research-icon">'+r.icon+'</span><div class="research-info"><strong>'+r.name+'</strong><p>'+r.desc+'</p><small>'+r.time+'초 · '+fmt(r.cost)+' D · '+Object.entries(r.need).map(([id,n])=>RESOURCE[id]?.icon+" "+fmt(n)).join(" ")+'</small></div><button class="action-button '+(complete?"secondary":available?"":"secondary")+'" data-research="'+r.id+'" '+(!available||active?"disabled":"")+'>'+(complete?"완료":active?"연구 중":available?"연구 시작":"잠김")+'</button></div>'}).join("");document.querySelectorAll("[data-research]").forEach(btn=>btn.onclick=()=>startResearch(btn.dataset.research));renderSkillTree()}
function renderMissions(){const chapters=["ACT I · THE RUINS","ACT II · HIDDEN INDUSTRY","ACT III · DORONUM TRUTH","ACT IV · INFINITE PROJECT","ACT V · LAST FACTORY"];const q=getQuest();const activeChapter=q?.chapter??4;$("orbit-level").textContent=String(Math.min(9,S.questIndex+1)).padStart(2,"0");$("story-chapters").innerHTML=chapters.map((c,i)=>'<div class="chapter-chip '+(i===activeChapter?"active":i<activeChapter?"complete":"")+'">'+c+'</div>').join("");const progress=q?Math.min(q.max,q.progress(S)):1;$("mission-list").innerHTML=QUESTS.map((m,i)=>'<div class="mission-card '+(i<S.questIndex?"completed":"")+'"><div class="mission-head"><strong>'+m.title+'</strong><span>'+(i<S.questIndex?"완료":i===S.questIndex?"진행 중":"잠김")+'</span></div><p>'+m.desc+'</p><div class="mission-reward">보상 · '+fmt(m.reward)+' D</div>'+(i===S.questIndex?'<div class="mission-progress"><i style="width:'+Math.round(progress/m.max*100)+'%"></i></div>':"")+'</div>').join("");if(q)$("orbit-dialogue").textContent=q.orbit}

function addInput(b,id,qty,meta={quality:90,purity:90,synthetic:false}){id=canonicalItemID(id);b.input??={};b.inputMeta??={};b.input[id]=(b.input[id]||0)+qty;const old=b.inputMeta[id]||{quality:90,purity:90,synthetic:false},before=b.input[id]-qty,total=b.input[id];b.inputMeta[id]={quality:(old.quality*before+meta.quality*qty)/total,purity:(old.purity*before+meta.purity*qty)/total,synthetic:old.synthetic||!!meta.synthetic};markDirty()}
function recipeFor(b){const d=buildingDef(b.type);if(d?.recipe)return RECIPES[d.recipe];if(d?.variantRecipe)return VARIANT_RECIPES[d.variantRecipe];if((d?.variantSelector||b.type==="variantLab")&&PURIFICATION_RECIPES[b.variant])return PURIFICATION_RECIPES[b.variant];if(d?.variantSelector)return VARIANT_RECIPES[b.variant||d.variantOptions?.[0]];if(b.type==="variantLab")return VARIANT_RECIPES[b.variant||"ITEM_DORONUM_BLUE"];return null}
function canConsumeRecipe(b,r){
 const itemsReady=Object.entries(r.inputs||{}).every(([rawID,n])=>{const id=canonicalItemID(rawID);return (b.input?.[id]||0)+availableItemCount(S,id)>=n});
 const fluidsReady=Object.entries(r.fluidInputs||{}).every(([type,n])=>b.fluidType===type&&Math.max(0,Number(b.fluidAmountL)||0)>=Number(n));
 return itemsReady&&fluidsReady;
}
function consumeRecipe(b,r){
 if(!canConsumeRecipe(b,r))return null;
 const fluidSnapshot={amountL:Number(b.fluidAmountL)||0,fluidType:b.fluidType||null};
 for(const[type,liters]of Object.entries(r.fluidInputs||{})){
  const fluidNode={amountL:Math.max(0,Number(b.fluidAmountL)||0),fluidType:b.fluidType||null};
  const consumed=consumeFluid(fluidNode,liters,type);
  if(!consumed.ok){b.fluidAmountL=fluidSnapshot.amountL;b.fluidType=fluidSnapshot.fluidType;return null}
  b.fluidAmountL=fluidNode.amountL;
  b.fluidType=fluidNode.fluidType||null;
 }
 const inventoryNeed={};
 for(const[rawID,n]of Object.entries(r.inputs||{})){const id=canonicalItemID(rawID),buffered=Math.min(n,b.input?.[id]||0),remaining=n-buffered;if(remaining>0)inventoryNeed[id]=remaining}
 const reservations=reserveItemBatch(S,inventoryNeed,"recipe:"+String(b.uid||b.type));
 if(!reservations){b.fluidAmountL=fluidSnapshot.amountL;b.fluidType=fluidSnapshot.fluidType;return null}
 const committed=reservations.length?commitItemReservations(S,reservations):[];
 if(!committed){for(const id of reservations)releaseItemReservation(S,id);b.fluidAmountL=fluidSnapshot.amountL;b.fluidType=fluidSnapshot.fluidType;return null}
 let qsum=0,psum=0,weight=0,hasSynthetic=false;const consumedInputs=[];
 const absorb=(m,itemID)=>{qsum+=m.quality*m.quantity;psum+=m.purity*m.quantity;weight+=m.quantity;hasSynthetic=hasSynthetic||m.synthetic;consumedInputs.push({itemID:String(itemID),quantity:m.quantity,quality:m.quality,purity:m.purity,synthetic:!!m.synthetic})};
 for(const[rawID,n]of Object.entries(r.inputs||{})){const id=canonicalItemID(rawID),fromBuffer=Math.min(n,b.input?.[id]||0);if(fromBuffer>0){const m=b.inputMeta?.[id]||{quality:90,purity:90,synthetic:false};absorb({...m,quantity:fromBuffer},id);b.input[id]-=fromBuffer;if(b.input[id]<=0){delete b.input[id];delete b.inputMeta[id]}}}
 for(const stack of committed)absorb(stack,stack.itemID);
 syncLegacyInventory(S);return {quality:weight?qsum/weight:90,purity:weight?psum/weight:90,synthetic:hasSynthetic,consumedInputs}
}
function rebuildOwnershipLedger(state=S){
 if(!state||typeof state!=="object")return {valid:false,errors:["missing-state"]};
 const ledger=createOwnershipState(),runtime=state.runtime||{},stacks=Array.isArray(runtime.itemStacks)?runtime.itemStacks:[];
 const reservedByStack=new Map();
 for(const reservation of Object.values(runtime.reservations||{})){
  if(reservation?.status!=="reserved")continue;
  for(const allocation of reservation.allocations||[]){
   const id=String(allocation.stackID),entry=reservedByStack.get(id)||[];
   entry.push({quantity:Math.max(0,Math.floor(Number(allocation.quantity)||0)),ownerID:String(reservation.ownerID||reservation.reservationID||"reservation"),reservationID:String(reservation.reservationID||"")});
   reservedByStack.set(id,entry);
  }
 }
 for(const stack of stacks){
  if(!stack?.runtimeID||!stack.itemID||!Number.isSafeInteger(stack.quantity)||stack.quantity<=0)continue;
  if(stack.quarantined){
   addCustody(ledger,{stackID:String(stack.runtimeID),itemID:stack.itemID,quantity:stack.quantity,ownerType:"QUARANTINE",ownerID:String(stack.quarantineReason||"legacy-quarantine"),metadata:{runtimeStackID:stack.runtimeID,quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}});
   continue;
  }
  let reserved=0;
  for(const allocation of reservedByStack.get(String(stack.runtimeID))||[]){
   if(allocation.quantity<=0)continue;
   reserved+=allocation.quantity;
   addCustody(ledger,{stackID:String(stack.runtimeID)+"@"+allocation.reservationID,itemID:stack.itemID,quantity:allocation.quantity,ownerType:"ACTIVE_JOB",ownerID:allocation.ownerID,metadata:{runtimeStackID:stack.runtimeID,reservationID:allocation.reservationID,quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}});
  }
  const free=stack.quantity-reserved;
  if(free<0)throw new Error("ownership-reservation-overflow:"+stack.runtimeID);
  if(free>0)addCustody(ledger,{stackID:reserved?String(stack.runtimeID)+"@FREE":String(stack.runtimeID),itemID:stack.itemID,quantity:free,ownerType:"PLAYER_INVENTORY",ownerID:"player",metadata:{runtimeStackID:stack.runtimeID,quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}});
 }
 for(const building of state.buildings||[]){
  const uid=String(building.uid||building.type||"unknown");
  for(const [itemID,quantity] of Object.entries(building.input||{})){
   const qty=Math.max(0,Math.floor(Number(quantity)||0));if(!qty)continue;
   addCustody(ledger,{stackID:"MACHINE_INPUT:"+uid+":"+itemID,itemID,quantity:qty,ownerType:"MACHINE_INPUT",ownerID:uid,metadata:building.inputMeta?.[itemID]||{}});
  }
  const activeInputs=Array.isArray(building.activeInputQuantities)?building.activeInputQuantities:Array.isArray(building.activeMeta?.consumedInputs)?building.activeMeta.consumedInputs:[];
  for(let i=0;i<activeInputs.length;i++){
   const input=activeInputs[i],qty=Math.max(0,Math.floor(Number(input.quantity)||0));if(!input.itemID||!qty)continue;
   addCustody(ledger,{stackID:"ACTIVE_INPUT:"+uid+":"+i+":"+input.itemID,itemID:input.itemID,quantity:qty,ownerType:"ACTIVE_JOB",ownerID:uid,metadata:{quality:input.quality,purity:input.purity,synthetic:input.synthetic}});
  }
  if(building.output&&Number(building.output.qty)>0)addCustody(ledger,{stackID:"MACHINE_OUTPUT:"+uid,itemID:building.output.id,quantity:Math.floor(building.output.qty),ownerType:"MACHINE_OUTPUT",ownerID:uid,metadata:building.output.meta||{}});
  if(building.item&&Number(building.item.qty)>0)addCustody(ledger,{stackID:"CONVEYOR:"+uid,itemID:building.item.id,quantity:Math.floor(building.item.qty),ownerType:"CONVEYOR",ownerID:uid,metadata:building.item.meta||{}});
 }
 for(const shipment of state.contractRuntime?.shipments||[]){
  for(let i=0;i<(shipment.cargo||[]).length;i++){
   const stack=shipment.cargo[i],qty=Math.max(0,Math.floor(Number(stack.quantity)||0));if(!stack.itemID||!qty)continue;
   const ownerType=shipment.status==="DELIVERED"?"WAREHOUSE":shipment.status==="FAILED"?"WORLD_DROP":"ACTIVE_JOB";
   addCustody(ledger,{stackID:"SHIPMENT:"+String(shipment.shipmentID)+":"+i,itemID:stack.itemID,quantity:qty,ownerType,ownerID:String(shipment.shipmentID),metadata:{quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic,status:shipment.status}});
  }
 }
 for(let i=0;i<(state.completionBuffer||[]).length;i++){
  const item=state.completionBuffer[i],qty=Math.max(0,Math.floor(Number(item.quantity)||0));if(!item.itemID||!qty)continue;
  addCustody(ledger,{stackID:"COMPLETION:"+String(item.completionID||i),itemID:item.itemID,quantity:qty,ownerType:"COMPLETION_BUFFER",ownerID:String(item.completionID||i),metadata:{stackID:item.stackID}});
 }
 const validation=validateOwnershipState(ledger);
 state.ownershipLedger=ledger;state.ownershipLedgerValidation=validation;
 return validation;
}
function createOutput(b,id,qty,meta){id=canonicalItemID(id);if(!commitCompletionBuffer(b,{id,qty,meta})){b.status="PAUSED_OUTPUT";return false}b.status="PAUSED_OUTPUT";S.stats.produced[id]=(S.stats.produced[id]||0)+qty;log(RESOURCE[id].name+" 생산 · "+fmt(qty)+"개");markDirty();return true}
const BUILDING_FOOTPRINTS=Object.freeze({
 storage:{width:2,height:2},warehouse:{width:3,height:2},smelter:{width:2,height:2},goldSmelter:{width:2,height:2},chromeSmelter:{width:2,height:2},steelForge:{width:2,height:2},titaniumPress:{width:2,height:2},carbonMill:{width:2,height:2},wiremill:{width:2,height:2},assembler:{width:2,height:2},lab:{width:2,height:2},
 reactor:{width:3,height:3},variantLab:{width:3,height:3},BUILDING_DORONUM_COMPRESSOR:{width:3,height:3},BUILDING_DORONUM_REFINEMENT_CHAMBER:{width:3,height:3},BUILDING_ULTRA_MATERIAL_PRESS:{width:3,height:3},BUILDING_REINFORCED_DORONUM_PRESS:{width:3,height:3},BUILDING_CONTROLLED_ATMOSPHERE_CHAMBER:{width:3,height:3},BUILDING_OPTICAL_REFINEMENT_CHAMBER:{width:3,height:3},BUILDING_THERMAL_STABILIZER:{width:2,height:2},BUILDING_COOLING_STABILIZER:{width:2,height:2},BUILDING_ABSORPTION_PRESS:{width:3,height:3},BUILDING_SPECIAL_EDITION_LINE:{width:3,height:3},BUILDING_FIRST_FACTORY_LEGACY_BATCH_LINE:{width:3,height:3},cooling:{width:2,height:2},fluidTank:{width:2,height:2},fusion:{width:4,height:4},relay:{width:2,height:2},core:{width:3,height:3},transformer:{width:2,height:2},battery:{width:2,height:2}
});
function getBuildingFootprint(type){return BUILDING_FOOTPRINTS[type]||{width:1,height:1}}
function buildingFootprintCells(b){const f=b.footprint||getBuildingFootprint(b.type);return footprintCells({x:b.x,y:b.y,width:f.width,height:f.height,rotation:b.footprintRotation??0})}
function buildingOccupiesCell(x,y){
 for(const b of S.buildings){if((S.player.layer==="mine")!==(b.layer==="mine"))continue;if(S.player.layer==="mine"&&Number(b.mineLevel||1)!==Number(S.player.mineLevel||1))continue;const cells=buildingFootprintCells(b);if(cells.some(p=>p.x===x&&p.y===y))return true}
 return false;
}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function renderBlueprints(){
 const host=$("blueprint-list");if(!host)return;
 const rows=(S.blueprints||[]).map(bp=>'<article class="blueprint-card '+(activeBlueprintID===bp.id?"active":"")+'"><div class="blueprint-title"><strong>'+escapeHTML(bp.name||"설계도")+'</strong><small>'+bp.buildings.length+'개 설비</small></div><div class="blueprint-actions"><button type="button" data-blueprint-action="place" data-blueprint-id="'+escapeHTML(bp.id)+'">배치 선택</button><button type="button" data-blueprint-action="rotate" data-blueprint-id="'+escapeHTML(bp.id)+'">90° 회전</button><button type="button" data-blueprint-action="duplicate" data-blueprint-id="'+escapeHTML(bp.id)+'">복제</button></div></article>').join("");
 host.innerHTML=rows||'<div class="blueprint-empty">저장된 설계도가 없습니다. 현재 공장을 저장해 보세요.</div>';
 host.querySelectorAll("[data-blueprint-action]").forEach(button=>button.addEventListener("click",()=>{
  const id=button.dataset.blueprintId,action=button.dataset.blueprintAction,bp=S.blueprints.find(x=>x.id===id);if(!bp)return;
  if(action==="place"){activeBlueprintID=id;activeBlueprintRotation=0;selectedBuild=null;selectedBuilding=null;renderBuildList();toast("설계도 배치 모드 · 월드에서 기준 위치를 선택하세요.")}
  else if(action==="rotate"){if(activeBlueprintID!==id){activeBlueprintID=id;activeBlueprintRotation=0}activeBlueprintRotation=(activeBlueprintRotation+1)%4;toast("설계도 회전 · "+(activeBlueprintRotation*90)+"°");renderBlueprints()}
  else if(action==="duplicate"){const copy=duplicateBlueprint(bp,{newID:allocateEntityID(S,"BP"),name:(bp.name||"설계도")+" 복제"});if(copy){S.blueprints.push(copy);markDirty();renderBlueprints();toast("설계도를 복제했습니다.")}}
 }));
}
function saveCurrentBlueprint(){
 const source=selectedBuilding?S.buildings.filter(b=>b.uid===selectedBuilding):S.buildings;
 if(!source.length){toast("먼저 저장할 시설을 건설하세요.","warn");return}
 const name=String($("blueprint-name")?.value||"").trim()||("공장 설계도 "+((S.blueprints||[]).length+1));
 const blueprint=createBlueprint(source,{name,footprintForType:getBuildingFootprint});blueprint.id=allocateEntityID(S,"BP");
 S.blueprints??=[];S.blueprints.push(blueprint);markDirty();renderBlueprints();toast("설계도 저장 완료 · "+blueprint.buildings.length+"개 설비");
}
function placeBlueprintAt(x,y){
 const source=(S.blueprints||[]).find(b=>b.id===activeBlueprintID);if(!source){activeBlueprintID=null;return false}
 if(S.player.layer==="mine"){toast("설계도는 지상 공장 구역에서만 배치할 수 있습니다.","warn");return false}
 if(S.buildings.length+source.buildings.length>BUILDING_LIMIT){toast("설계도 배치 후 시설 한도를 초과합니다.","warn");return false}
 const occupied=[];for(const b of S.buildings)occupied.push(...buildingFootprintCells(b));
 const heightAt=(cx,cy)=>{const v=S.flattened?.[surfaceKey(cx,cy)];return v&&typeof v==="object"&&Number.isFinite(v.height)?v.height:terrainHeightAt(cx,cy)};
 const catalogue=Object.fromEntries(BUILDINGS.map(d=>[d.id,{moneyCost:buildingMoneyCost(d),materials:d.materials,footprint:getBuildingFootprint(d.id),requiresFlat:d.id!=="beltAdaptive"&&!["relay","core","pump","powerCable"].includes(d.id)}]));
 const canPlaceType=(type,px,py)=>{
  const d=buildingDef(type),node=tileNode(px,py);if(!d||!unlockOk(d))return false;
  if((type==="pump"||type==="fluidPump")&&node?.type!=="water")return false;
  if(type==="relay"&&node?.type!=="relaySite")return false;
  if(type==="core"&&node?.type!=="coreSite")return false;
  if(type==="doriFarm"&&(node?.type==="dori"||!findNearbyDoriNode(px,py)))return false;
  return true;
 };
 const canOccupyCell=(type,cx,cy,def,context)=>{
  const node=tileNode(cx,cy);if(!node)return true;
  const anchor=context?.anchor||{},isAnchor=anchor.x===cx&&anchor.y===cy;
  return isAnchor&&(((type==="pump"||type==="fluidPump")&&node.type==="water")||(type==="doriFarm"&&node.type==="dori")||(type==="relay"&&node.type==="relaySite")||(type==="core"&&node.type==="coreSite"));
 };
 const transactionID=allocateEntityID(S,"BUILD");
 const reservation=beginBlueprintConstruction(S,{transactionID,blueprint:source,x,y,rotation:activeBlueprintRotation,buildingCatalog:catalogue,ownerID:"player",worldWidth:WORLD_W,worldHeight:WORLD_H,occupied,heightAt,maxSlope:0,foundation:(cx,cy)=>hasFoundation(cx,cy),isUnlocked:type=>unlockOk(buildingDef(type)),canPlaceType,canOccupyCell});
 if(!reservation.ok){toast(reservation.reason==="INSUFFICIENT_MONEY"?"설계도 설치 자금이 부족합니다.":reservation.reason==="INSUFFICIENT_MATERIALS"?"설계도 설치 재료가 부족합니다.":reservation.reason==="BUILDING_LOCKED"?"설계도에 잠긴 연구 시설이 포함되어 있습니다.":"설계도 배치 조건을 충족하지 못했습니다. "+reservation.reason,"warn");return false}
 const committed=commitConstruction(S,transactionID,(state,tx)=>{
  const uids=[];
  for(const item of tx.placements){
   const uid=allocateEntityID(state,"B");
   const b={uid,type:item.type,x:item.x,y:item.y,dir:((Number(item.dir)||1)%4+4)%4,footprint:{...item.footprint},footprintRotation:0,progress:0,elapsed:0,condition:100,input:{},inputMeta:{},output:null,outputDir:item.dir??1,status:"IDLE",autoFeed:true,variant:item.variant||"ITEM_DORONUM_BLUE",temp:25,pressure:0,fuelTimer:0,moveTimer:0};
   state.buildings.push(b);state.stats.built[item.type]=(state.stats.built[item.type]||0)+1;uids.push(uid);
   if(item.type==="relay"){const idx=state.sites.relay.findIndex(p=>p.x===item.x&&p.y===item.y);if(idx>=0)state.relaySites[idx]=true}
   if(item.type==="core")state.corePlaced=true;if(item.type==="powerCable"){state.powerTopologyLayers??={surface:false,mine:{}};state.powerTopologyLayers.surface=true;state.powerTopologyEnabled=true}
  }
  return {uids};
 });
 if(!committed.ok){cancelConstruction(S,transactionID);toast("설계도 배치에 실패했습니다. 자금과 재료는 보존했습니다.","warn");return false}
 syncLegacyInventory(S);markSceneDirty();selectedBuilding=committed.result.uids.at(-1)||null;selectedBuild=null;activeBlueprintID=null;activeBlueprintRotation=0;log("설계도 배치 완료 · "+committed.result.uids.length+"개 설비");markDirty();renderAll();questCheck();toast("설계도 배치 완료");return true;
}
function placeMineBuilding(type,x,y){
 const def=buildingDef(type),isMiner=def?.kind==="miner",supported=isMiner||type==="mineGen"||type==="powerCable";
 if(!def||!supported){toast("광산에서는 채굴기·광산 발전기·전력 케이블만 설치할 수 있습니다.","warn");return false}
 const level=clamp(Number(S.player.mineLevel)||1,1,MINE_LEVELS),px=Math.floor(Number(x)||0),py=Math.floor(Number(y)||0);
 if(px<0||py<0||px>=MINE_W||py>=MINE_H||!mineTunnelAt(px,py)){toast("광산 터널 안에 설치해야 합니다.","warn");return false}
 if(S.buildings.length>=BUILDING_LIMIT){toast("공장 시설 한도 "+BUILDING_LIMIT+"개에 도달했습니다.","warn");return false}
 const key=mineDepositKey(level,px,py),deposit=S.mineDeposits?.[key];
 if(isMiner&&(!deposit||deposit.amount<=0||(def.resource==="advanced"?!["ITEM_COLD_CRYSTAL_RAW","ITEM_HEAT_CRYSTAL","ITEM_MAGNETITE","titaniumOre","chromiteOre"].includes(deposit.type):deposit.type!==def.resource))){toast("선택한 채굴기와 일치하는 광맥이 이 위치에 없습니다.","warn");return false}
 if(!unlockOk(def)){toast("필요한 기술 연구를 먼저 완료하세요.","warn");return false}
 const footprint=getBuildingFootprint(type),occupied=[];
 for(const b of S.buildings)if(b.layer==="mine"&&Number(b.mineLevel||1)===level)occupied.push(...buildingFootprintCells(b));
 const placement=validateConstructionFootprint({x:px,y:py,...footprint,worldWidth:MINE_W,worldHeight:MINE_H,occupied,heightAt:()=>0,maxSlope:Infinity,requiresFlat:false,foundation:()=>true});
 if(!placement.valid||placement.cells.some(p=>!mineTunnelAt(p.x,p.y))){toast("설치 면적 전체가 광산 터널 안에 있어야 하며 기존 설비와 겹칠 수 없습니다.","warn");return false}
 if(isMiner&&(placement.cells.length!==1||placement.cells[0].x!==px||placement.cells[0].y!==py)){toast("채굴기는 광맥 위 1×1 타일에만 설치할 수 있습니다.","warn");return false}
 const transactionID=allocateEntityID(S,"MINEBUILD"),uid=allocateEntityID(S,"MINE");
 const reservation=beginConstruction(S,{transactionID,buildingType:type,x:px,y:py,...footprint,rotation:0,moneyCost:buildingMoneyCost(def),materials:def.materials,ownerID:"player:mine:"+level,worldWidth:MINE_W,worldHeight:MINE_H,occupied,heightAt:()=>0,maxSlope:Infinity,requiresFlat:false,foundation:()=>true});
 if(!reservation.ok){toast(reservation.reason==="INSUFFICIENT_MONEY"?"산업 자금이 부족합니다.":reservation.reason==="INSUFFICIENT_MATERIALS"?"설치 재료가 부족합니다.":"광산 설비 예약에 실패했습니다.","warn");return false}
 const committed=commitConstruction(S,transactionID,(state,tx)=>{
  const b={uid,type,x:px,y:py,layer:"mine",mineLevel:level,targetDepositKey:isMiner?key:null,dir:1,footprint:{...footprint},progress:0,condition:100,drillDurability:isMiner?1000:null,input:{},inputMeta:{},output:null,outputDir:1,status:"IDLE",fuelTimer:0,maintenanceTimer:0,byproductsProduced:0};
  state.buildings.push(b);return {uid};
 });
 if(!committed.ok){cancelConstruction(S,transactionID);toast("광산 설비 설치가 실패했습니다. 자금과 재료는 보존했습니다.","warn");return false}
 if(type==="powerCable"){S.powerTopologyLayers??={surface:false,mine:{}};S.powerTopologyLayers.mine??={};S.powerTopologyLayers.mine[level]=true;S.powerTopologyEnabled=true}
 syncLegacyInventory(S);markSceneDirty();S.stats.built[type]=(S.stats.built[type]||0)+1;selectedBuilding=uid;selectedBuild=null;
 log(def.name+" 설치 · 광산 "+level+"층");markDirty();renderAll();toast(def.name+" 설치 완료");return true;
}
function placeBuilding(type,x,y){
 if(activeBlueprintID)return placeBlueprintAt(x,y);
 const d=buildingDef(type);if(!d)return false;
 if(S.player.layer==="mine")return placeMineBuilding(type,x,y);
 if(["minerIron","minerCopper","minerCoal","mineGen"].includes(type)){toast("자동 채굴기와 광산 발전기는 지하 광산에서 설치해야 합니다.","warn");return false}
 if(S.buildings.length>=BUILDING_LIMIT){toast("공장 시설 한도 "+BUILDING_LIMIT+"개에 도달했습니다.","warn");return false}
 const footprint=getBuildingFootprint(type),rotation=0,cells=footprintCells({x,y,...footprint,rotation});
 if(cells.some(p=>buildingOccupiesCell(p.x,p.y))){toast("건설 면적이 기존 시설과 겹칩니다.","warn");return false}
 const requiresFlat=type!=="beltAdaptive"&&!["relay","core","pump","powerCable","fluidPipe","fluidValve","fluidPump"].includes(type);
 const occupied=[];
 for(const b of S.buildings)occupied.push(...buildingFootprintCells(b));
 const heightAt=(cx,cy)=>{const v=S.flattened?.[surfaceKey(cx,cy)];return v&&typeof v==="object"&&Number.isFinite(v.height)?v.height:terrainHeightAt(cx,cy)};
 const placement=validateConstructionFootprint({x,y,...footprint,rotation,worldWidth:WORLD_W,worldHeight:WORLD_H,occupied,heightAt,maxSlope:0,requiresFlat,foundation:(cx,cy)=>hasFoundation(cx,cy)});
 if(!placement.valid){
  const reason=placement.errors.some(e=>e.startsWith("FOUNDATION_REQUIRED"))?"기계 설치 면적 전체에 평탄화와 기초 타일이 필요합니다.":placement.errors.some(e=>e==="SLOPE_TOO_STEEP")?"설치 면적의 경사가 너무 가파릅니다.": "설치 면적이 월드 경계 또는 기존 시설과 겹칩니다.";
  toast(reason,"warn");return false;
 }
 for(const p of placement.cells){
  const n=tileNode(p.x,p.y),isAnchor=p.x===x&&p.y===y;
  if(n&&["water","wood","mineEntrance","dori","relaySite","coreSite"].includes(n.type)&&!(isAnchor&&["pump","fluidPump","doriFarm","relay","core"].includes(type))){toast("건설 면적 안에 사용할 수 없는 지형 또는 자원이 있습니다.","warn");return false}
 }
 const node=tileNode(x,y);
 if(type==="pump"&&node?.type!=="water"){toast("정수 펌프는 수원지 위에 설치해야 합니다.","warn");return false}
 if(type==="fluidPump"&&node?.type!=="water"){toast("고압 취수 펌프는 수원지 위에 설치해야 합니다.","warn");return false}
 if(type==="doriFarm"&&node?.type==="dori"){toast("재배기는 나무 바로 옆의 평탄한 부지에 설치하세요.","warn");return false}
 if(type==="doriFarm"&&!findNearbyDoriNode(x,y)){toast("돌이 나무 재배기는 돌이 고기 나무 주변에 설치해야 합니다.","warn");return false}
 if(type==="relay"&&node?.type!=="relaySite"){toast("행성 에너지 릴레이 설치 지점을 찾아야 합니다.","warn");return false}
 if(type==="core"&&node?.type!=="coreSite"){toast("중앙 안정화 코어는 지정된 코어 부지에 설치해야 합니다.","warn");return false}
 if(!unlockOk(d)){toast("필요한 기술 연구를 먼저 완료하세요.","warn");return false}
 const transactionID=allocateEntityID(S,"BUILD"),uid=allocateEntityID(S,"B");
 const reservation=beginConstruction(S,{transactionID,buildingType:type,x,y,...footprint,rotation,moneyCost:buildingMoneyCost(d),materials:d.materials,ownerID:"player",worldWidth:WORLD_W,worldHeight:WORLD_H,occupied,heightAt,maxSlope:0,requiresFlat,foundation:(cx,cy)=>hasFoundation(cx,cy)});
 if(!reservation.ok){toast(reservation.reason==="INSUFFICIENT_MONEY"?"산업 자금이 부족합니다.":reservation.reason==="INSUFFICIENT_MATERIALS"?"건설 재료가 부족합니다.": "건설 예약에 실패했습니다.","warn");return false}
 let built=null;
 const committed=commitConstruction(S,transactionID,(state,tx)=>{
  built={uid,type,x,y,dir:1,footprint:{...footprint},footprintRotation:rotation,progress:0,elapsed:0,condition:100,input:{},inputMeta:{},output:null,outputDir:1,status:"IDLE",autoFeed:true,variant:"ITEM_DORONUM_BLUE",temp:25,pressure:0,fuelTimer:0,moveTimer:0};
  built.uid=uid;state.buildings.push(built);return {uid};
 });
 if(!committed.ok){cancelConstruction(S,transactionID);toast("건설 트랜잭션을 커밋하지 못했습니다. 자금과 재료는 보존했습니다.","warn");return false}
 if(type==="powerCable"){S.powerTopologyLayers??={surface:false,mine:{}};S.powerTopologyLayers.surface=true;S.powerTopologyEnabled=true}syncLegacyInventory(S);
 markSceneDirty();S.stats.built[type]=(S.stats.built[type]||0)+1;
 if(type==="relay"){const index=S.sites.relay.findIndex(p=>p.x===x&&p.y===y);if(index>=0)S.relaySites[index]=true}
 if(type==="core")S.corePlaced=true;
 selectedBuilding=built.uid;selectedBuild=null;log(d.name+" 건설 완료");toast(d.name+" 설치 완료");playTone(580,.1,"triangle");markDirty();renderAll();questCheck();return true
}
function isWalkable(x,y){if(x<0||y<0||x>=WORLD_W||y>=WORLD_H||buildingOccupiesCell(x,y))return false;if(S.player.layer==="mine")return mineTunnelAt(x,y);const node=tileNode(x,y);return !node||node.amount<=0}
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
 if($("world-help"))$("world-help").innerHTML=next==="map"?"<b>조작</b><span>WASD 이동</span><span>드래그 화면 이동 · 우클릭 회전</span><span>휠 확대/축소</span>":"<b>생존 조작</b><span>WASD 이동 · Shift 달리기 · Space 점프</span><span>우클릭 드래그/Shift+드래그 시점 회전 · 화면 버튼 클릭으로 먹기/마시기/사용</span><span>V 1인칭/3인칭 · M 전략 지도</span>";
 renderHud();drawWorld();markDirty();
}
function isAdventureCellFree(x,z){
 const cx=Math.floor(x+.5),cz=Math.floor(z+.5);
 if(S.player.layer==="mine")return cx>=0&&cz>=0&&cx<MINE_W&&cz<MINE_H&&mineTunnelAt(cx,cz);
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
 if(tileX!==S.player.x||tileZ!==S.player.y){S.player.x=tileX;S.player.y=tileZ;if(S.player.layer==="surface")revealAround();markDirty()}
 S.player.yaw=playerMotion.yaw;S.player.pitch=playerMotion.pitch;
 if(mineHeld){mineCooldown-=dt;if(mineCooldown<=0){mineCooldown=.62/calculateSkillBonuses(S.skills).miningSpeedMultiplier;performAdventureAction()}}
 survivalHudClock+=dt;if(survivalHudClock>.15){survivalHudClock=0;updateAdventureHud()}
}
function updateAdventureHud(){
 const target=world3d.pickTarget(190);adventureTarget=target;
 const label=$("target-label");if(label){label.textContent=target?(target.mine?(RESOURCE[target.type]?.name||target.type)+" · "+target.depthY+"m":target.kind==="mineEntrance"?"지하 광산 입구":target.kind==="mineExit"?"지상 출구":target.kind==="mineDescend"?"더 깊은 광맥으로":target.kind==="resource"?(RESOURCE[target.type]?.name||target.type):buildingDef(target.type)?.name||"산업 시설"):"주변 탐색 중";label.classList.toggle("target-found",!!target)}
 const mode=S.player.viewMode;$("view-first")?.classList.toggle("active",mode==="first");$("view-third")?.classList.toggle("active",mode==="third");$("view-map")?.classList.toggle("active",mode==="map");
}
function enterMine(){if(S.player.layer==="mine")return;S.player.surfacePosition={x:S.player.x,y:S.player.y,yaw:playerMotion.yaw,pitch:playerMotion.pitch,viewMode:S.player.viewMode};S.player.layer="mine";S.player.mineLevel=clamp(Number(S.player.mineLevel)||1,1,MINE_LEVELS);S.player.viewMode="first";playerMotion={...playerMotion,x:3,z:12,y:0,velocityY:0,grounded:true,path:[],moving:false,yaw:0,pitch:-.06};S.player.x=3;S.player.y=12;world3d.setViewMode("first");closeControlPanel();toast("광산 진입 · 심도 "+Math.abs(mineFloorY(S.player.mineLevel))+"m");log("지하 광산 진입 · "+S.player.mineLevel+"층");markDirty();updateAdventureHud();drawWorld()}
function exitMine(){if(S.player.layer!=="mine")return;const pos=S.player.surfacePosition||{x:72,y:52,yaw:0,pitch:-.12,viewMode:"first"};S.player.layer="surface";S.player.surfacePosition=null;S.player.x=pos.x;S.player.y=pos.y;S.player.viewMode=pos.viewMode||"first";playerMotion={...playerMotion,x:pos.x,z:pos.y,y:0,velocityY:0,grounded:true,path:[],moving:false,yaw:pos.yaw||0,pitch:pos.pitch??-.12};world3d.setViewMode(S.player.viewMode);toast("지상으로 귀환했습니다.");markDirty();renderAll()}
function descendMine(){if(S.player.mineLevel>=MINE_LEVELS){toast("현재 도달 가능한 최심부입니다.","warn");return}S.player.mineLevel++;if(S.player.mineLevel>=3)claimSkillPoint("EXPLORATION_MINE_DEPTH_3");if(S.player.mineLevel>=5)claimSkillPoint("EXPLORATION_MINE_DEPTH_5");S.player.x=3;S.player.y=12;playerMotion={...playerMotion,x:3,z:12,y:0,velocityY:0,grounded:true,path:[],moving:false};toast("광산 "+S.player.mineLevel+"층 · Y "+mineFloorY(S.player.mineLevel)+"m");log("광산 심층 진입 · "+S.player.mineLevel+"층 · Y="+mineFloorY(S.player.mineLevel)+"m");markDirty();drawWorld()}
function harvestMineDeposit(node){if(S.player.layer!=="mine"||S.activeTool!=="pickaxe"){toast("곡괭이를 장착해야 광물을 채굴할 수 있습니다.","warn");return}if(node.amount<=0){toast("광맥이 고갈되었습니다.","warn");return}const amount=Math.min(node.amount,node.type.startsWith("doronium_")?1:node.type==="diamond"?1:2),id=node.type;node.amount-=amount;if(node.amount<=0)markSceneDirty();if(RESOURCE[id]){const qualityValue=clamp(82+Math.floor((node.seed%1700)/100)+Math.max(0,node.level-2),80,99);addItem(id,amount,{quality:qualityValue,purity:Math.min(99,86+node.level*2),synthetic:false});S.stats.gathered[id]=(S.stats.gathered[id]||0)+amount;log(RESOURCE[id].name+" 채굴 · "+amount+"개 · Y="+node.depthY+"m");toast(RESOURCE[id].name+" +"+amount+" · Y="+node.depthY+"m");playTone(480+node.level*50,.08,"triangle");questCheck();renderInventory();renderHud();markDirty();drawWorld()}}
function selectTool(tool){if(!["axe","pickaxe"].includes(tool)||!S.tools?.[tool])return;S.activeTool=tool;document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool));const label=$("equipped-tool-label");if(label)label.textContent=tool==="axe"?"도끼 장착":"곡괭이 장착";toast(label?.textContent||"도구 변경")}
function performAdventureAction(){
 if(!adventureMode()||S.paused)return;
 const target=world3d.pickTarget(190);
 if(target?.kind==="mineEntrance"){enterMine();return}
 if(target?.kind==="mineExit"){exitMine();return}
 if(target?.kind==="mineDescend"){descendMine();return}
 if(target?.kind==="resource"){
  if(target.mine){const deposit=S.mineDeposits?.[mineDepositKey(target.level,target.x,target.z)];if(selectedBuild){placeBuilding(selectedBuild,target.x,target.z);return}if(deposit)harvestMineDeposit(deposit);return}
  const node=tileNode(target.x,target.z);if(!node)return;
  if(selectedLandTool){selectTile(target.x,target.z);return}
  if(selectedBuild||activeBlueprintID){placeBuilding(selectedBuild,target.x,target.z);return}
  if(node.type==="relaySite"||node.type==="coreSite"){toast("이곳은 특수 시설 설치 지점입니다.");return}
  harvestNode(target.x,target.z,node);return;
 }
 if(target?.kind==="building"){
  const b=S.buildings.find(v=>v.uid===target.uid);if(!b)return;
  if(b.output&&adventureKeys.has("e")){collectOutput(b);return}
  selectedBuilding=b.uid;selectedBuild=null;changePanel("factory");renderBuildList();renderMachineDetails();toast((buildingDef(b.type)?.name||"시설")+" 선택");return;
 }
 const rect=canvas.getBoundingClientRect(),cell=world3d.pickTile(rect.left+rect.width/2,rect.top+rect.height/2);
 if(cell&&selectedLandTool){selectTile(cell.x,cell.z);return}
 if(cell&&(selectedBuild||activeBlueprintID)){if(placeBuilding(selectedBuild,cell.x,cell.z))toast("시설 설치 완료")}
 else if(cell&&adventureKeys.has("e")){const node=tileNode(cell.x,cell.z);if(node)harvestNode(cell.x,cell.z,node)}
}
function consumeFood(){
 if(itemCount("doriMeat")<1){toast("먹을 돌이 고기가 없습니다.","warn");return}
 takeItem("doriMeat",1);S.survival.hunger=clamp(S.survival.hunger+38,0,100);S.survival.health=clamp(S.survival.health+5,0,100);log("돌이 고기 섭취 · 허기 회복");toast("돌이 고기 + 허기 회복");markDirty();renderInventory();renderHud()
}
function drinkWater(){
 if(itemCount("water")<1){toast("마실 물이 없습니다.","warn");return}
 takeItem("water",1);S.survival.thirst=clamp(S.survival.thirst+42,0,100);log("식수 섭취 · 갈증 회복");toast("식수 + 갈증 회복");markDirty();renderInventory();renderHud()
}
function respawnEngineer(){
 S.player.layer="surface";S.player.mineLevel=1;S.player.surfacePosition=null;
 const lossIds=["wood","stone","ironOre","copperOre","coal","quartz","goldOre"];
 for(const id of lossIds){const loss=Math.floor(itemCount(id)*.1);if(loss>0)takeItem(id,loss)}
 playerMotion.x=72;playerMotion.z=52;playerMotion.y=0;playerMotion.velocityY=0;playerMotion.grounded=true;playerMotion.path=[];
 S.player.x=72;S.player.y=52;S.survival={health:65,hunger:65,thirst:65};
 revealAround();log("엔지니어 구조 완료 · 원자재 10% 손실","warn");toast("구조 지점에서 다시 시작합니다. 원자재 10%를 잃었습니다.","warn");markDirty();renderAll()
}
function updateSurvival(dt){
 const v=S.survival;if(!v)return;
 v.hunger=Math.max(0,v.hunger-dt*.026);v.thirst=Math.max(0,v.thirst-dt*.04);
 if(v.hunger<=0||v.thirst<=0)v.health=Math.max(0,v.health-dt*(v.thirst<=0?1.05:.65));
 else if(v.hunger>70&&v.thirst>70)v.health=Math.min(100,v.health+dt*.12);
 if(v.health<=0)respawnEngineer();
}
function showCrystalPreview(id){if(!RESOURCE[id]||(!id.startsWith("doronium_")&&id!=="infinity"))return;if(crystalViewer){crystalViewer.dispose();crystalViewer=null}const title=RESOURCE[id].name,body='<div class="crystal-preview-wrap"><canvas id="crystal-preview-canvas" class="crystal-preview-canvas" aria-label="'+title+' 3D 결정 모델"></canvas><div class="crystal-preview-info"><strong>'+title+'</strong><p>보유량 '+fmt(itemCount(id))+'개 · 품질 '+Math.round(quality(S,id))+' · 순도 '+Math.round(purity(S,id))+'</p><small>결정 계열마다 서로 다른 3D 형상·재질·발광 특성을 적용했습니다.</small></div></div>';showModal("도로늄 3D 결정 도감",body,[{label:"닫기",cls:"primary"}]);crystalViewer=createCrystalViewer($("crystal-preview-canvas"),id)}
function selectTile(x,y){if(S.player.layer==="mine")return;const key=surfaceKey(x,y);if(selectedLandTool==="flatten"){const n=tileNode(x,y);if(n&&["water","wood","mineEntrance","relaySite","coreSite","dori"].includes(n.type)){toast("이 지형은 평탄화할 수 없습니다.","warn");return}if(buildingAt(x,y)){toast("시설이 있는 타일은 먼저 해체해야 합니다.","warn");return}const area=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const ax=x+dx,ay=y+dz,n=tileNode(ax,ay);if(ax<0||ay<0||ax>=WORLD_W||ay>=WORLD_H||buildingAt(ax,ay)||(n&&["water","wood","mineEntrance","dori","relaySite","coreSite"].includes(n.type)))continue;area.push({x:ax,y:ay})}const targetHeight=Math.round(area.reduce((v,p)=>v+terrainHeightAt(p.x,p.y),0)/Math.max(1,area.length)/3)*3;for(const p of area)S.flattened[surfaceKey(p.x,p.y)]={height:targetHeight};markSceneDirty();log("지표 평탄화 · "+key+" · "+area.length+"타일");markDirty();drawWorld();toast("지형 평탄화 완료 · 기초 타일을 설치하세요.");return}if(selectedLandTool==="foundation"){if(!S.flattened[key]){toast("기초 타일은 평탄화된 지형에만 설치할 수 있습니다.","warn");return}if(S.foundation[key]){toast("이미 기초 타일이 설치되어 있습니다.");return}if(!hasItems({wood:2,stone:2})){toast("기초 타일에는 목재 2개와 석재 2개가 필요합니다.","warn");return}takeItems({wood:2,stone:2});S.foundation[key]=true;markSceneDirty();log("기초 타일 설치 · "+key);markDirty();drawWorld();toast("산업용 기초 타일 설치 완료");return}const b=buildingAt(x,y);if(b){selectedBuild=null;selectedBuilding=b.uid;changePanel("factory");renderBuildList();renderMachineDetails();approachTile(x,y);drawWorld();return}if(selectedBuild||activeBlueprintID){if(placeBuilding(selectedBuild,x,y))approachTile(x,y);return}const node=tileNode(x,y);if(node){approachTile(x,y,()=>{const current=tileNode(x,y);if(current)harvestNode(x,y,current)});return}selectedBuilding=null;renderMachineDetails();movePlayerTo(x,y)}
function harvestNode(x,y,node){if(S.player.layer!=="surface"){toast("지하 광물은 광산 채굴 도구로 채취하세요.");return}if(node.amount<=0){toast("이 자원은 고갈되었습니다.","warn");return}if(["wood","dori"].includes(node.type)&&S.activeTool!=="axe"){toast("도끼를 장착해야 나무를 벌목할 수 있습니다.","warn");return}if(node.type==="dori"){if(node.cooldown>0){toast("돌이 고기 나무가 열매를 다시 키우고 있습니다. "+Math.ceil(node.cooldown)+"초 남음","warn");return}if(itemCount("water")<2){toast("돌이 고기 수확에는 물 2L가 필요합니다.","warn");return}takeItem("water",2);startNodeCooldown(x,y,node,60);addItem("doriMeat",1,{quality:90,purity:90,synthetic:false});S.stats.gathered.ITEM_DORI_MEAT=(S.stats.gathered.ITEM_DORI_MEAT||0)+1;log("돌이 고기 열매 수확 · 비합성 원료");toast("돌이 고기 +1 · 순도 90");playTone(760,.12,"sine");questCheck();renderAll();drawWorld();return}
const map={wood:"wood",water:"water"};const id=map[node.type];if(!id)return;const amount=Math.min(node.amount,node.type==="wood"||node.type==="stone"?3:node.type==="water"?5:node.type==="diamond"?1:2);node.amount-=amount;if(node.amount<=0)markVisibilityDirty();const q=80+Math.floor((node.seed%1900)/100);addItem(id,amount,{quality:q,purity:node.type==="water"?100:85,synthetic:false});S.stats.gathered[id]=(S.stats.gathered[id]||0)+amount;log(RESOURCE[id].name+" 채집 · "+fmt(amount)+"개");toast(RESOURCE[id].name+" +"+fmt(amount));playTone(420,.07,"triangle");questCheck();renderAll();drawWorld()}
function collectOutput(b){if(!b.output){toast("회수할 출력물이 없습니다.","warn");return}addItem(b.output.id,b.output.qty,b.output.meta,false);toast(RESOURCE[b.output.id].name+" "+fmt(b.output.qty)+"개 회수");log("출력 회수 · "+RESOURCE[b.output.id].name);clearCompletionBuffer(b);b.status="IDLE";markDirty();renderAll()}
function supplyMachine(b){const r=recipeFor(b);if(!r){toast("이 시설은 수동 투입을 지원하지 않습니다.");return}let moved=0;for(const[id,n]of Object.entries(r.inputs)){const need=Math.max(0,n-(b.input?.[id]||0));const amount=Math.min(need,itemCount(id));if(amount>0){const m=S.meta[id]||{quality:90,purity:90,synthetic:false};takeItem(id,amount);addInput(b,id,amount,m);moved+=amount}}if(moved){toast("원료 "+moved+"개 투입 완료");markDirty()}else toast("투입 가능한 원료가 없습니다.","warn");renderMachineDetails();renderInventory()}
function drainFluidToTank(source){
 const amount=Math.max(0,Number(source?.fluidAmountL)||0),type=source?.fluidType;
 if(amount<=1e-9||!type){toast("배출할 유체가 없습니다.","warn");return false}
 const tank=S.buildings.find(target=>target!==source&&target.type==="fluidTank"&&target.fluidNetworkID&&target.fluidNetworkID===source.fluidNetworkID&&(!target.fluidType||target.fluidType===type)&&Math.max(0,2000-(Number(target.fluidAmountL)||0))>1e-9);
 if(!tank){toast("같은 유체망에 같은 종류를 받을 빈 탱크를 연결하고 밸브를 열어 주세요.","warn");return false}
 const moved=Math.min(amount,Math.max(0,2000-(Number(tank.fluidAmountL)||0)));
 if(!(moved>0))return false;
 tank.fluidAmountL=(Number(tank.fluidAmountL)||0)+moved;tank.fluidType=type;
 tank.fluidContaminants=[...new Set([...(tank.fluidContaminants||[]),...(source.fluidContaminants||[])])];
 source.fluidAmountL=amount-moved;if(source.fluidAmountL<=1e-9){source.fluidAmountL=0;source.fluidType=null;source.fluidContaminants=[]}
 markDirty();renderMachineDetails();toast(moved.toFixed(1)+"L를 연결된 탱크로 배출했습니다.");return true;
}
function removeBuilding(b){const d=buildingDef(b.type);if(!d)return false;const activeFusion=b.type==="fusion"&&["RESERVED","RUNNING","PAUSED_POWER","CALIBRATING","ERROR"].includes(S.fusionJob?.status);const hasBufferedFluid=Number(b.fluidAmountL)>1e-9;const hasCargo=!!b.item;if(activeFusion||hasBufferedFluid||hasCargo||b.output||Object.values(b.input||{}).some(q=>Number(q)>0)||b.failureRepair||Number(b.progress)>0){toast(activeFusion?"진행 중인 Infinity Fusion 작업이 있어 설비를 철거할 수 없습니다.":hasBufferedFluid?"유체를 먼저 배출해야 설비를 철거할 수 있습니다.":hasCargo?"컨베이어 화물을 먼저 회수해야 합니다.":"출력·입력 버퍼가 비었고 작업이 정지된 상태에서만 철거할 수 있습니다.","warn");return false}markSceneDirty();const refund=Math.floor(d.cost*.55);S.money+=refund;for(const[id,n]of Object.entries(d.materials||{})){addItem(id,Math.floor(n*.5),{},false)}S.buildings=S.buildings.filter(x=>x.uid!==b.uid);if(b.type==="relay"){const i=S.sites.relay.findIndex(p=>p.x===b.x&&p.y===b.y);if(i>=0)S.relaySites[i]=false}if(b.type==="core")S.corePlaced=false;if(b.type==="powerCable")S.powerTopologyEnabled=S.buildings.some(x=>x.type==="powerCable");selectedBuilding=null;log(d.name+" 해체 · "+refund+" D 환급");toast("시설 해체 · "+refund+" D 환급");markDirty();renderAll()}
function chooseVariant(b){const choices=[...VARIANTS.filter(id=>id!=="ITEM_DORONUM_NORMAL"&&!!VARIANT_RECIPES[id]),"PURIFY_RUSTED_DORONUM"];const body='<p>결정 생산 또는 부식 도로늄 정제를 선택하세요. 정제는 품질·순도 조건을 충족한 인피니티 원료를 만들기 위한 별도 공정입니다.</p><select id="variant-select" class="modal-select">'+choices.map(id=>'<option value="'+id+'" '+(b.variant===id?"selected":"")+'>'+(id==="PURIFY_RUSTED_DORONUM"?"부식 도로늄 정제":RESOURCE[id].name)+'</option>').join("")+'</select>';showModal("결정 변환 레시피",body,[{label:"취소",cls:"secondary"},{label:"설정",cls:"primary",action:()=>{b.variant=$("variant-select").value;markDirty();renderMachineDetails();closeModal();toast("레시피 변경 완료")}}])}
function startResearch(id){const r=RESEARCH.find(x=>x.id===id);if(!r||S.research.includes(id))return;if(!hasBuilding(S,"lab")){toast("먼저 기술 연구소를 건설하세요.","warn");return}if(r.requires&&!r.requires.every(v=>S.research.includes(v))){toast("선행 연구가 완료되지 않았습니다.","warn");return}if(S.activeResearch){toast("다른 연구가 이미 진행 중입니다.","warn");return}if(S.money<r.cost||!hasItems(r.need)){toast("연구 자원 또는 자금이 부족합니다.","warn");return}S.money-=r.cost;takeItems(r.need);S.activeResearch=id;S.researchProgress=0;log("연구 시작 · "+r.name);toast(r.name+" 연구를 시작합니다.");markDirty();renderResearch();renderHud()}
function tickResearch(dt,ratio){if(!S.activeResearch)return;const r=RESEARCH.find(x=>x.id===S.activeResearch);if(!r){S.activeResearch=null;return}const labs=S.buildings.filter(b=>b.type==="lab").length;if(!labs)return;S.researchProgress+=dt*Math.max(.0,ratio)*Math.min(2,1+(labs-1)*.35)*(S.research.includes("automation")?1.15:1);if(S.researchProgress>=r.time){S.research.push(r.id);awardResearchTierSkillPoints();S.activeResearch=null;S.researchProgress=0;log("연구 완료 · "+r.name,"good");toast("기술 연구 완료 · "+r.name);$("orbit-dialogue").textContent="“"+r.name+" 연구 데이터가 연구소에 등록되었습니다.”";playTone(820,.22,"triangle");markDirty();renderResearch();renderBuildList();renderMissions();questCheck()}}
function updateFusion(dt){
 const job=S.fusionJob;if(!job)return;if(!job.status&&Number.isInteger(job.stage)&&Number.isFinite(Number(job.progress))){job.status="RUNNING";job.legacyConsumedInput=true;job.outputIssued=false}if(!["RESERVED","RUNNING","PAUSED_POWER","CALIBRATING","ERROR"].includes(job.status))return;
 const b=S.buildings.find(x=>x.type==="fusion");
 if(!b){job.status="ERROR";job.errorCode="MACHINE_MISSING";job.lastErrorAt=S.seconds;return}
 if(job.errorCode==="MACHINE_MISSING"){delete job.errorCode;job.status="RESERVED"}
 const stage=FUSION_STAGES[job.stage];
 if(!stage){job.status="ERROR";job.errorCode="INVALID_STAGE";return}
 const reservations=job.reservationIDs||[];
 if(!job.legacyConsumedInput&&(reservations.length!==15||reservations.some(id=>!S.runtime?.reservations?.[id]||S.runtime.reservations[id].status!=="reserved"))){
  job.status="ERROR";job.errorCode="RESERVATION_LEDGER_MISMATCH";return;
 }
 const p=currentPower();b.temp+=(stage.temp-b.temp)*Math.min(1,dt*.045);b.pressure+=(stage.pressure-b.pressure)*Math.min(1,dt*.06);
 const tempOK=Math.abs(b.temp-stage.temp)<=Math.max(50,stage.temp*.1),pressureOK=Math.abs(b.pressure-stage.pressure)<=Math.max(25,stage.pressure*.1);
 const allocation=p.allocations?.[String(b.uid)]||{ratio:0,deliveredKW:0};
 if(b.failureRepair){job.status="ERROR";job.errorCode="MAINTENANCE_REQUIRED";return}
 if(job.errorCode==="MAINTENANCE_REQUIRED"&&!b.failureRepair){delete job.errorCode;job.status="RESERVED"}
 if(tickSupportFailure(b,dt,allocation.ratio,FAILURE_PROFILES.fusion)){job.status="ERROR";job.errorCode="MAINTENANCE_REQUIRED";return}
 if(allocation.ratio>=.8&&tempOK&&pressureOK){job.progress+=dt*(allocation.ratio>=1?1:allocation.ratio);job.status="RUNNING";b.status="RUNNING"}
 else{job.status=allocation.ratio<.8?"PAUSED_POWER":"CALIBRATING";b.status=job.status}
 if(job.progress<stage.time)return;
 log("퓨전 단계 완료 · "+stage.name,"good");job.stage++;job.progress=0;job.status="RUNNING";
 if(job.stage>=FUSION_STAGES.length){
  const settlement=settleInfinityFusionOutput(S,{jobID:job.jobID,outputItemID:"infinity",quality:100,purity:100});
  if(!settlement.ok){S.fusionJob.status="ERROR";S.fusionJob.errorCode=settlement.reason||"FUSION_SETTLEMENT_FAILED";S.fusionJob.lastErrorAt=S.seconds;log("인피니티 퓨전 정산 실패 · "+S.fusionJob.errorCode,"warn");markDirty();return}
  if(!settlement.duplicate){
   log("인피니티 도로늄 결정화 성공 · 원료 1,500개 소비 · 출력 1개","good");toast("인피니티 도로늄 제작 성공!");
   $("orbit-dialogue").textContent="“Infinity Doronum secured. Three stabilization relays are still required.”";
   showModal("INFINITY DORONUM 생성 완료","<p>7단계 결정화 공정이 완료되었습니다. 인피니티 도로늄 1개가 창고에 등록되었습니다.</p><p>이제 지정된 행성 에너지 노드 3곳에 릴레이를 설치하고 중앙 코어를 완성하세요.</p>",[{label:"계속 진행",cls:"primary",action:closeModal}]);
  }
 }else toast("퓨전 "+job.stage+"/7 단계 완료");
 markDirty();renderMissions();
}
function fusionPowerPreflight(){
 const prior=S.fusionJob;S.fusionJob={stage:0,status:"PREFLIGHT"};
 let power;try{power=currentPower()}finally{S.fusionJob=prior}
 const fusion=S.buildings.find(b=>b.type==="fusion"),cooling=S.buildings.filter(b=>b.type==="cooling");
 const fusionAllocation=fusion?power.allocations?.[String(fusion.uid)]:null;
 const coolingAllocations=cooling.map(b=>power.allocations?.[String(b.uid)]||null);
 const coolingReady=coolingAllocations.some(a=>a&&a.ratio>=.8);
 return {ok:!!fusion&&!!fusionAllocation&&fusionAllocation.ratio>=.8&&coolingReady,power,fusionAllocation,coolingReady};
}
function runFusionDiagnostics(){
 const fusion=S.buildings.find(b=>b.type==="fusion"),cooling=S.buildings.filter(b=>b.type==="cooling");
 if(!fusion){toast("진단 실패 · 인피니티 퓨전 설비가 없습니다.","warn");return false}
 const power=fusionPowerPreflight(),sensorHealth=Number.isFinite(Number(fusion.pressureSensorHealth))?Number(fusion.pressureSensorHealth):100,sensorOffset=Number.isFinite(Number(fusion.pressureSensorOffsetMPa))?Number(fusion.pressureSensorOffsetMPa):0;
 const pressureSensorCalibration=sensorHealth>=95&&Math.abs(sensorOffset)<=.5;
 const emergencyCooling=cooling.some(unit=>{const allocation=power.power.allocations?.[String(unit.uid)];return !!allocation&&allocation.ratio>=.8&&Number(unit.condition??100)>=80&&(Number(buildingDef(unit.type)?.power)||0)*100>=500});
 S.fusionDiagnostics={testedAt:S.seconds,powerStability:{passed:power.ok,generationKW:power.power.gen},pressureSensorCalibration:{passed:pressureSensorCalibration,sensorHealth,sensorOffsetMPa:sensorOffset},emergencyCooling:{passed:emergencyCooling},allPassed:power.ok&&pressureSensorCalibration&&emergencyCooling};
 markDirty();renderMachineDetails();
 if(S.fusionDiagnostics.allPassed){log("Infinity Fusion 사전 진단 통과 · 전력 안정성 / 압력 센서 / 비상 냉각","good");toast("사전 진단 3종 통과 · Infinity Fusion을 시작할 수 있습니다.","good");return true}
 const failed=[!power.ok?"전력 안정성":!pressureSensorCalibration?"압력 센서 교정":!emergencyCooling?"비상 냉각":""].filter(Boolean);
 toast("사전 진단 실패 · "+failed.join(", "),"warn");return false;
}
function startFusion(){
 if(S.fusionDone){toast("이 세이브에서는 인피니티 도로늄 제작이 이미 완료되었습니다.","warn");return}
 const active=!!S.fusionJob&&!["COMPLETED","CANCELLED"].includes(S.fusionJob.status);
 if(active){toast("이미 퓨전 작업이 진행 중입니다.");return}
 if(!S.buildings.some(b=>b.type==="fusion")){toast("인피니티 퓨전 설비가 필요합니다.","warn");return}
 if(!S.buildings.some(b=>b.type==="cooling")){toast("초전도 냉각탑을 먼저 건설하세요.","warn");return}
 const preflight=fusionPowerPreflight();if(!preflight.ok){toast("퓨전 전력 사전 진단 실패 · 퓨전 설비 500kW와 냉각 설비에 독립적으로 안정된 전력망을 연결하세요.","warn");return}if(!S.fusionDiagnostics?.allPassed){toast("생산 전 진단 3종(전력 안정성·압력 센서 교정·비상 냉각)을 먼저 통과하세요.","warn");return}
 const requirements=Object.fromEntries(VARIANTS.map(id=>[id,100]));
 const invalid=VARIANTS.filter(id=>{
  const stacks=(S.runtime?.itemStacks||[]).filter(stack=>stack.itemID===id&&stack.quantity>0);
  const eligible=stacks.reduce((n,stack)=>n+(Number(stack.quality)>=90&&Number(stack.purity)>=90&&!stack.synthetic?stack.quantity:0),0);
  return eligible<100;
 });
 if(invalid.length){toast("개별 스택 품질·순도·비합성 조건을 충족하지 못한 재료: "+invalid.map(id=>RESOURCE[id]?.name||id).slice(0,3).join(", ")+" 외 "+Math.max(0,invalid.length-3)+"종","warn");return}
 showModal("인피니티 퓨전 시작","<p>정식 투입 목록 15종을 각 100개씩 원자적으로 예약합니다.</p><p>각 스택은 품질 90 이상, 순도 90 이상, 비합성 조건을 개별적으로 통과해야 합니다. 7단계 공정 중 입력은 잠기며 중단·기계 철거 시에도 작업 기록과 예약을 보존합니다.</p>",[{label:"취소",cls:"secondary"},{label:"퓨전 시작",cls:"gold",action:()=>{
  const confirmPreflight=fusionPowerPreflight();if(!confirmPreflight.ok||!S.fusionDiagnostics?.allPassed){toast("확인 중 전력·냉각 또는 진단 상태가 변경되었습니다. 진단을 다시 실행하세요.","warn");return}
  const predicates=Object.fromEntries(VARIANTS.map(id=>[id,stack=>Number(stack.quality)>=90&&Number(stack.purity)>=90&&!stack.synthetic]));
  const reservationIDs=reserveQualifiedItemBatch(S,requirements,"INFINITY-FUSION:"+String(S.tick||0),predicates);
  if(!reservationIDs||reservationIDs.length!==15){toast("원료 예약에 실패했습니다. 모든 재료와 인벤토리는 그대로 보존됩니다.","warn");return}
  const b=S.buildings.find(x=>x.type==="fusion");
  S.fusionJob={jobID:"IF-"+String(S.seed||0)+"-"+String(S.tick||0),status:"RESERVED",stage:0,progress:0,startedAt:S.seconds,reservationIDs,inputQuantity:1500,outputIssued:false};
  if(b){b.temp=25;b.pressure=0;b.status="IDLE"}
  log("인피니티 퓨전 시작 · 재료 1,500개 원자적 예약");toast("INFINITY FUSION STARTED");closeModal();markDirty();renderFactory();
 }}]);
}
function cancelFusion(){
 const job=S.fusionJob;if(!job||job.legacyConsumedInput||!Array.isArray(job.reservationIDs)||!job.reservationIDs.length||["COMPLETED","CANCELLED"].includes(job.status))return false;
 for(const id of job.reservationIDs)releaseItemReservation(S,id);
 job.reservationIDs=[];job.status="CANCELLED";job.cancelledAt=S.seconds;job.cancelReason="PLAYER_CANCELLED";
 log("인피니티 퓨전 취소 · 예약 원료 전량 반환");markDirty();renderAll();toast("퓨전이 취소되었고 예약 원료가 인벤토리로 반환되었습니다.");return true;
}
function installCore(b){if(!S.fusionDone||itemCount("infinity")<1){toast("인피니티 도로늄 1개가 필요합니다.","warn");return}if(!S.research.includes("planet")){toast("행성 안정화 프로토콜 연구를 완료하세요.","warn");return}if(!S.relaySites.every(Boolean)){toast("행성 안정화 릴레이 3개가 모두 필요합니다.","warn");return}if(!takeItem("infinity",1))return;S.coreInstalled=true;b.status="INSTALLED";log("인피니티 도로늄을 중앙 코어에 설치");toast("중앙 안정화 코어 설치 완료");showModal("행성 안정화 준비 완료","<p>3개 릴레이와 중앙 코어가 연결되었습니다. ORBIT의 최종 동기화 프로토콜을 실행할 수 있습니다.</p>",[{label:"계속",cls:"secondary"},{label:"행성 안정화 실행",cls:"gold",action:()=>{closeModal();finishPlanetary()}}]);markDirty();renderAll()}
function finishPlanetary(){if(!S.coreInstalled||!S.relaySites.every(Boolean)){toast("안정화 필수 조건을 충족하지 못했습니다.","warn");return}S.victory=true;S.questIndex=QUESTS.length;log("PLANETARY STABILIZATION COMPLETE","good");$("orbit-dialogue").textContent="“Energy network synchronization complete. Planetary instability: decreasing. Factory status: OPERATIONAL.”";markDirty();renderAll();showModal("PLANETARY STABILIZATION COMPLETE","<div class='ending-visual'>💠</div><h3>돌돌행성의 에너지 네트워크가 안정화되었습니다.</h3><p>공장 전체에 푸른 에너지 흐름이 연결되었습니다. 폐허에서 시작한 작은 산업 기지가 행성을 지키는 거대한 산업 네트워크로 성장했습니다.</p><p><b>DORONIUM FACTORY · INFINITE INDUSTRY</b><br>FINAL STATUS: OPERATIONAL</p>",[{label:"엔딩 보기",cls:"gold",action:closeModal}]);playTone(920,.5,"sine")}

function tickSupportFailure(b,dt,ratio,profile=FAILURE_PROFILES[b.type]){
 if(!profile||b.failureRepair)return false;
 const temperature=Number(b.temp??b.fluidTemperatureC??25),pressure=Number(b.pressure??b.fluidPressureKPa??0);
 const targetTemperature=Number.isFinite(Number(b.targetTemperatureC))?Number(b.targetTemperatureC):temperature;
 const targetPressure=Number.isFinite(Number(b.targetPressureKPa))?Number(b.targetPressureKPa):pressure;
 const tempBand=Math.max(35,Math.abs(targetTemperature)*.15),pressureBand=Math.max(20,Math.abs(targetPressure)*.15);
 const risks=calculateFailureRisks({profile,temperature,targetTemperature,safeTemperatureMin:targetTemperature-tempBand,safeTemperatureMax:targetTemperature+tempBand,pressure,targetPressure,safePressureMin:Math.max(0,targetPressure-pressureBand),safePressureMax:targetPressure+pressureBand,powerRatio:ratio,condition:Number(b.condition??b.durability??100),actualLoad:1,nominalLoad:1});
 b.tick=Number(S.tick)||0;advanceFailureExposure(b,dt,true);
 const hazard=calculateFailureHazard(profile,risks,dt),event=rollMachineFailure(S.runtime,b,profile,hazard);
 if(event&&applyMachineFailure(b,event)){log("설비 고장 · "+(buildingDef(b.type)?.name||b.type)+" / "+event.grade.toUpperCase(),"warn");markDirty();return true}
 return false;
}
function tickBuilding(b,dt,power,context=null){const d=buildingDef(b.type);if(!d)return;
 if(b.type==="BUILDING_FIRST_FACTORY_LEGACY_BATCH_LINE"&&!b.legacyLineRepaired&&!b.failureRepair){b.condition=0;b.failureRepair={grade:"critical",broken:true,repairSeconds:120,repairCondition:85,repairMaterials:{ironPlate:20,circuit:10},residue:{type:"legacy_line_rebuild",amount:1}};b.status="BROKEN"}
 if(b.failureRepair){
  if(b.maintenanceTimer>0){b.maintenanceTimer=Math.max(0,b.maintenanceTimer-dt);b.status="MAINTENANCE";if(b.maintenanceTimer<=0&&completeMachineRepair(b)){if(b.layer==="mine"&&d.kind==="miner")b.drillDurability=1000;if(b.type==="BUILDING_FIRST_FACTORY_LEGACY_BATCH_LINE")b.legacyLineRepaired=true;log("기계 정비 완료 · "+d.name,"good");markDirty()}return}
  b.status=b.failureRepair.broken?"BROKEN":"MAINTENANCE";return;
 }
 if(b.type==="coalgen"||b.type==="mineGen"){if(tickSupportFailure(b,dt,1))return;if(b.fuelTimer<=0){if(takeItem("coal",1)){b.fuelTimer=24;log((b.type==="mineGen"?"광산 지열 발전기":"화력 발전소")+" 석탄 투입")}else b.status="NO_INPUT"}else{b.fuelTimer=Math.max(0,b.fuelTimer-dt);b.status="RUNNING"}return}
 if(["fluidPipe","fluidValve","fluidTank","fluidPump","solar","wind","storage","warehouse","market","battery","transformer","powerCable","relay","core","lab"].includes(b.type)||isBeltType(b.type)){const ratio=power.allocations?.[String(b.uid)]?.ratio??1;if(tickSupportFailure(b,dt,ratio))return;return;}
 if(b.type==="cooling"){const ratio=power.allocations?.[String(b.uid)]?.ratio??0;if(ratio<.8){b.status="PAUSED_POWER";return}if(tickSupportFailure(b,dt,ratio))return;b.status="RUNNING";return;}
 const ratio=power.allocations?.[String(b.uid)]?.ratio??((d.power||0)>0?0:1);
 if(b.output){b.status="PAUSED_OUTPUT";return}
 if(b.type==="minerIron"||b.type==="minerCopper"||b.type==="minerCoal"||d.kind==="miner"){
  if(b.layer!=="mine"){b.status="ERROR";b.errorCode="MINER_REQUIRES_MINE_LAYER";return}
  if(ratio<.8){b.status="PAUSED_POWER";return}
  if(tickSupportFailure(b,dt,ratio))return;
  const deposit=S.mineDeposits?.[b.targetDepositKey||mineDepositKey(b.mineLevel,b.x,b.y)];
  if(!deposit||(d.resource==="advanced"?!["ITEM_COLD_CRYSTAL_RAW","ITEM_HEAT_CRYSTAL","ITEM_MAGNETITE","titaniumOre","chromiteOre"].includes(deposit.type):deposit.type!==d.resource)||deposit.amount<=0){b.status="DEPLETED";return}
  if(Number(b.drillDurability??1000)<=0){if(!b.failureRepair)b.failureRepair={grade:"major",repairSeconds:30,repairCondition:100,repairMaterials:{ironPlate:2},residue:{type:"drill_bit",amount:1},broken:true};b.status="BROKEN";return}
  b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";
  if(b.progress>=8){b.progress=0;deposit.amount=Math.max(0,deposit.amount-1);b.drillDurability=Math.max(0,Number(b.drillDurability??1000)-1);const id=d.resource;createOutput(b,id,1,{quality:clamp(84+Math.floor((deposit.seed%1200)/100)+Math.max(0,deposit.level-2),80,99),purity:Math.min(99,86+deposit.level*2),synthetic:false});b.lastDepositYieldTick=Number(S.tick)||0;if((deposit.max-deposit.amount)%5===0){addItem("stone",1,{quality:82,purity:85,synthetic:false});b.byproductsProduced=(Number(b.byproductsProduced)||0)+1}if(deposit.amount<=0)b.status="DEPLETED"}
  return;
 }
 if(b.type==="pump"){if(tickSupportFailure(b,dt,ratio))return;if(ratio<.8){b.status="PAUSED_POWER";return}const node=tileNode(b.x,b.y);if(!node||node.amount<=0){b.status="DEPLETED";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=5){b.progress=0;node.amount=Math.max(0,node.amount-3);createOutput(b,"water",3,{quality:100,purity:100,synthetic:false})}return}
 if(b.type==="doriFarm"){if(tickSupportFailure(b,dt,ratio))return;if(ratio<.8){b.status="PAUSED_POWER";return}const target=findNearbyDoriNode(b.x,b.y),node=target?.node;if(!node){b.status="NO_INPUT";return}if(node.cooldown>0){b.status="GROWING";return}b.progress+=dt*(ratio>=1?1:ratio);b.status="RUNNING";if(b.progress>=60){const fluidAvailable=b.fluidType==="WATER"?Math.max(0,Number(b.fluidAmountL)||0):0;const fromFluid=Math.min(2,fluidAvailable),fromItems=2-fromFluid;if(itemCount("water")<fromItems){b.status="NO_INPUT";b.progress=59;return}if(fromFluid>0){b.fluidAmountL=fluidAvailable-fromFluid;if(b.fluidAmountL<=1e-9){b.fluidAmountL=0;b.fluidType=null}}if(fromItems>0)takeItem("water",fromItems);startNodeCooldown(target.x,target.y,node,60);b.progress=0;createOutput(b,"doriMeat",1,{quality:S.research.includes("bio")?95:92,purity:90,synthetic:false})}return}
 if(d.kind==="machine"||d.kind==="reactor"||d.kind==="variant"){if(context?.machinePipelineActive)return;tickMachine(b,dt,ratio);return}
 if(d.kind==="campaignLine"){if(tickSupportFailure(b,dt,ratio))return;b.status="IDLE";return}
}
function recipeHasSyntheticInput(b,r){for(const[rawID,n]of Object.entries(r.inputs)){const id=canonicalItemID(rawID);let remaining=n;const buffered=Math.min(remaining,b.input?.[id]||0);if(buffered&&b.inputMeta?.[id]?.synthetic)return true;remaining-=buffered;if(remaining&&S.meta[id]?.synthetic)return true}return false}
function tickMachine(b,dt,ratio){
 if(b.failureRepair){
  if(b.maintenanceTimer>0){b.maintenanceTimer=Math.max(0,b.maintenanceTimer-dt);b.status="MAINTENANCE";if(b.maintenanceTimer<=0){completeMachineRepair(b);log("기계 정비 완료 · "+(buildingDef(b.type)?.name||b.type),"good");markDirty()}return}
  b.status=b.failureRepair.broken?"BROKEN":"MAINTENANCE";return;
 }
 const r=b.activeMeta&&b.activeRecipeSnapshot?b.activeRecipeSnapshot:recipeFor(b);if(!r){b.status="ERROR";b.errorCode="NO_RECIPE";return}
 if(b.output){b.status="PAUSED_OUTPUT";return}
 if(Number(b.condition??b.durability??100)<=0){b.condition=0;b.status="BROKEN";return}
 const power=resolveMachinePower(ratio,buildingDef(b.type)?.power||0);
 if(!b.activeMeta){
  if(!canConsumeRecipe(b,r)){b.status="WAITING_INPUT";return}
  if(buildingDef(b.type)?.kind==="reactor"&&recipeHasSyntheticInput(b,r)){b.status="ERROR";b.errorCode="SYNTHETIC_DORONUM_INPUT";return}
  if(!power.canProgress){b.status="PAUSED_POWER";return}
  const meta=consumeRecipe(b,r);if(!meta){b.status="WAITING_INPUT";return}
  b.activeMeta=meta;b.activeInputQuantities=meta.consumedInputs||[];b.activeRecipe=r.name;b.activeRecipeSnapshot=structuredClone(r);b.temp=Number.isFinite(Number(b.temp))?b.temp:25;b.pressure=Number.isFinite(Number(b.pressure))?b.pressure:0;b.progress=0;
 }
 const environment=advanceMachineEnvironment(b,r,dt,ratio);
 if(!power.canProgress){b.status="PAUSED_POWER";return}
 if(!environment.safe){b.status="COOLING";return}
 const wear=applyMachineWear(b,r,dt,ratio);
 if(wear.broken){b.status="BROKEN";b.activeFailureReason="CONDITION_DEPLETED";return}
 if(wear.maintenanceRecommended)b.maintenanceRecommended=true;
 const failureProfile=FAILURE_PROFILES[b.type];
 if(failureProfile){
  b.tick=Number(S.tick)||0;
  const risks=calculateFailureRisks({profile:failureProfile,temperature:Number(b.temp),targetTemperature:environment.targetTemperature,safeTemperatureMin:environment.tempMin,safeTemperatureMax:environment.tempMax,pressure:Number(b.pressure),targetPressure:environment.targetPressure,safePressureMin:environment.pressureMin,safePressureMax:environment.pressureMax,powerRatio:ratio,condition:wear.condition,actualLoad:1,nominalLoad:1});
  advanceFailureExposure(b,dt,true);
  const hazard=calculateFailureHazard(failureProfile,risks,dt);
  const failureEvent=rollMachineFailure(S.runtime,b,failureProfile,hazard);
  if(failureEvent&&applyMachineFailure(b,failureEvent)){log("기계 고장 · "+(buildingDef(b.type)?.name||b.type)+" / "+failureEvent.grade.toUpperCase(),"warn");markDirty();return}
 }
 b.progress+=dt*power.progressMultiplier*wear.progressMultiplier;
 b.status=power.status;
 if(b.progress<r.time)return;
 const id=r.output||(b.type==="variantLab"?b.variant||"ITEM_DORONUM_BLUE":null);
 const qualityOut=Math.max(Number(r.outputQualityMin)||0,calculateOutputQuality({materialQuality:b.activeMeta.quality,temperatureQuality:environment.temperatureQuality,pressureQuality:environment.pressureQuality,machineConditionQuality:wear.condition,powerStability:clamp(ratio*100,0,100),recipeModifier:(Number(r.qualityModifier)||0)+(r.allowSkillQualityBonus===true?calculateSkillBonuses(S.skills).recipeQualityModifier:0),pollutionPenalty:Number(b.pollutionPenalty)||0}));
 const purityOut=Math.max(Number(r.outputPurityMin)||0,calculateOutputPurity({inputPurity:b.activeMeta.purity,processLoss:Number(r.purityLoss??2),purificationBonus:S.research.includes("purity")?12:0,modifier:S.research.includes("chemistry")?2:0}));
 const meta={quality:qualityOut,purity:purityOut,synthetic:b.activeMeta.synthetic};
 if(createOutput(b,id,r.qty||1,meta)){b.progress=0;b.activeMeta=null;b.activeInputQuantities=[];b.activeRecipe=null;b.activeRecipeSnapshot=null}
}
function repairMachine(b){
 if(!b?.failureRepair){toast("정비가 필요한 고장이 없습니다.");return false}
 if(b.maintenanceTimer>0){toast("이미 정비가 진행 중입니다.");return false}
 const materials=b.failureRepair.repairMaterials||{};
 if(!hasItems(materials)){toast("정비 재료가 부족합니다. 필요 재료: "+Object.entries(materials).map(([id,n])=>(RESOURCE[id]?.name||id)+" "+n).join(" · "),"warn");return false}
 if(!takeItems(materials)){toast("정비 재료 예약에 실패했습니다. 자원은 보존되었습니다.","warn");return false}
 b.maintenanceTimer=Math.max(.1,Number(b.failureRepair.repairSeconds)||1);b.status="MAINTENANCE";
 log("기계 정비 시작 · "+(buildingDef(b.type)?.name||b.type));markDirty();renderMachineDetails();return true;
}
function tickBelts(dt){
 const graph=buildLogisticsGraph(S.buildings,{conveyorTypeIDs:["belt","beltAdaptive","sorter","splitter","merger","conveyorLift","curvedConveyor","multiLaneConveyor"]});
 for(const b of S.buildings){if(!isBeltType(b.type)||!b.item)continue;
  b.logisticsNetworkID=graph.networkByID.get(String(b.uid))||null;
  b.moveTimer=(b.moveTimer||0)+dt;if(b.moveTimer<.75)continue;b.moveTimer=0;
  const route=selectLogisticsTarget(graph,b,b.item,{canAccept:()=>true});
  if(!route){const report=analyzeLogisticsPressure(graph),isDeadlocked=report.deadlocked.some(x=>x.buildingIDs.includes(String(b.uid)));b.logisticsStatus=isDeadlocked?"DEADLOCK":"BACKPRESSURE";continue}
  const target=route.target;b.logisticsStatus="MOVING";
  if(isBeltType(target.type)){target.item=b.item;b.item=null;target.moveTimer=.45;target.logisticsStatus="MOVING";markDirty();continue}
  if(target.type==="storage"||target.type==="warehouse"){addItem(b.item.id,b.item.qty,b.item.meta,false);log("물류 센터 회수 · "+(RESOURCE[b.item.id]?.name||b.item.id));b.item=null;markDirty()}
  else if(target.type==="market"){const amount=b.item.qty,earned=Math.floor(amount*(RESOURCE[b.item.id]?.price||0)*.8);S.money+=earned;S.stats.sold+=amount;b.item=null;log("자동 거래 · "+fmt(earned)+" D");markDirty()}
  else if(["machine","reactor","variantLab"].includes(buildingDef(target.type)?.kind)||["machine","reactor","variantLab"].includes(target.type)){addInput(target,b.item.id,b.item.qty,b.item.meta);b.item=null;target.status="WAITING_INPUT";markDirty()}
 }
 for(const b of S.buildings){if(!b.output)continue;
  const route=selectLogisticsTarget(graph,b,b.output,{canAccept:()=>true});if(!route)continue;
  const target=route.target;
  if(isBeltType(target.type)&&!target.item){target.item={...b.output};target.moveTimer=.45;clearCompletionBuffer(b);b.status="IDLE";markDirty()}
  else if(target.type==="storage"||target.type==="warehouse"){addItem(b.output.id,b.output.qty,b.output.meta,false);clearCompletionBuffer(b);b.status="IDLE";log("창고 자동 적재 · 생산품 회수");markDirty()}
  else if(target.type==="market"){const earned=Math.floor(b.output.qty*(RESOURCE[b.output.id]?.price||0)*.8);S.money+=earned;S.stats.sold+=b.output.qty;log("산업 거래소 자동 판매 · "+fmt(earned)+" D");clearCompletionBuffer(b);b.status="IDLE";markDirty()}
  else if(["machine","reactor","variantLab"].includes(target.type)){addInput(target,b.output.id,b.output.qty,b.output.meta);clearCompletionBuffer(b);b.status="IDLE";markDirty()}
 }
}

function tickFluidSystems(dt,power){
 const fluidTypes=new Set(["fluidPipe","fluidValve","fluidTank","fluidPump"]);
 const relevant=S.buildings.filter(b=>b.layer!=="mine"&&(fluidTypes.has(b.type)||b.type==="doriFarm"||(b.type==="variantLab"&&Object.keys(recipeFor(b)?.fluidInputs||{}).length>0)));
 if(!relevant.length)return null;
 const nodes=relevant.map(b=>{
  const type=b.type==="fluidPump"?"PUMP":b.type==="fluidTank"?"TANK":b.type==="fluidValve"?"VALVE":b.type==="doriFarm"||(b.type==="variantLab"&&Object.keys(recipeFor(b)?.fluidInputs||{}).length>0)?"CONSUMER":"PIPE";
  const capacity=b.type==="fluidTank"?2000:(b.type==="doriFarm"||b.type==="variantLab")?20:b.type==="fluidPump"?120:100;
  if(b.type==="fluidPump"){
   const ratio=power?.allocations?.[String(b.uid)]?.ratio??0,water=tileNode(b.x,b.y)?.type==="water";
   if(water&&ratio>=.8&&!b.failureRepair){b.fluidAmountL=Math.min(capacity,Math.max(0,Number(b.fluidAmountL)||0)+12*dt*Math.min(1,ratio));b.fluidType="WATER";b.status="RUNNING"}
   else if(!water)b.status="NO_INPUT";
   else b.status="PAUSED_POWER";
  }
  return {id:String(b.uid),type,amountL:Math.max(0,Number(b.fluidAmountL)||0),capacityL:capacity,fluidType:b.fluidType||null,pressureKPa:Math.max(0,Number(b.fluidPressureKPa)||0),temperatureC:Number.isFinite(Number(b.fluidTemperatureC))?Number(b.fluidTemperatureC):20,pumpHeadKPa:b.type==="fluidPump"&&!b.failureRepair?180:0,maxPressureKPa:b.type==="fluidTank"?600:350,pressureVolumeL:capacity,insulation:b.type==="fluidTank"?.5:0,thermalExchangePerSecond:.008,allowMixing:false,contaminants:Array.isArray(b.fluidContaminants)?b.fluidContaminants:[],ports:["IN","OUT"]};
 });
 const nodesByID=new Map(nodes.map(n=>[n.id,n])),positions=new Map(relevant.map(b=>[surfaceKey(b.x,b.y),b])),edges=[];
 for(const b of relevant){
  const a=nodesByID.get(String(b.uid));if(!a)continue;
  for(const [dx,dy,dir] of [[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]]){
   const target=positions.get(surfaceKey(b.x+dx,b.y+dy));if(!target||String(target.uid)<=String(b.uid))continue;
   const t=nodesByID.get(String(target.uid));if(!t)continue;
   const closed=b.failureRepair||target.failureRepair||b.type==="fluidValve"&&b.valveOpen===false||target.type==="fluidValve"&&target.valveOpen===false;
   edges.push({id:"F:"+b.uid+":"+target.uid,from:String(b.uid),to:String(target.uid),oneWay:false,open:!closed,maxFlowLps:20,conductanceLpsPerKPa:50,referencePressureKPa:100,maxPressureKPa:Math.min(a.maxPressureKPa,t.maxPressureKPa),breakOnOverpressure:false});
  }
 }
 const result=tickFluidNetwork({nodes,edges,deltaSeconds:dt,ambientTemperatureC:20});
 S.lastFluidBalance=result.massBalance;
 for(const node of nodes){const building=S.buildings.find(b=>String(b.uid)===node.id);if(!building)continue;building.fluidAmountL=Math.max(0,node.amountL);building.fluidType=node.fluidType||null;building.fluidPressureKPa=Math.max(0,node.pressureKPa||0);building.fluidTemperatureC=Number(node.temperatureC)||20;building.fluidContaminants=node.contaminants||[];building.fluidNetworkID=result.networkByID[node.id]||null;}
 return result;
}
function isProductionMachine(building){
 const kind=buildingDef(building.type)?.kind;
 return kind==="machine"||kind==="reactor"||kind==="variant";
}
function reservationIntegrityPhase(context){
 const audit=(S.tick%10===0)?validateRuntimeState(S):{valid:true,skipped:true,errors:[]};
 context.reservationAudit=audit;context.reservationBlocked=!audit.valid;
 if(!audit.valid){
  S.runtime.reservationIntegrityErrors=audit.errors.slice(0,30);
  for(const building of S.buildings)if(isProductionMachine(building)&&!building.activeMeta){building.status="ERROR";building.errorCode="ITEM_RESERVATION_INTEGRITY"}
 }else if(S.runtime.reservationIntegrityErrors?.length){S.runtime.reservationIntegrityErrors=[]}
 context.machineWork=new Map();
 for(const building of S.buildings){
  if(!isProductionMachine(building))continue;
  const work={building,recipe:null,power:null,environment:null,wear:null,blocked:false,failureEvent:null,pendingOutput:null};
  context.machineWork.set(String(building.uid),work);
  if(building.failureRepair){
   if(building.maintenanceTimer>0){
    building.maintenanceTimer=Math.max(0,Number(building.maintenanceTimer)-context.dt);building.status="MAINTENANCE";
    if(building.maintenanceTimer<=0&&completeMachineRepair(building)){
     if(building.layer==="mine"&&buildingDef(building.type)?.kind==="miner")building.drillDurability=1000;
     log("기계 정비 완료 · "+(buildingDef(building.type)?.name||building.type),"good");markDirty();
    }
   }else building.status=building.failureRepair.broken?"BROKEN":"MAINTENANCE";
   work.blocked=true;continue;
  }
  if(building.output){building.status="PAUSED_OUTPUT";work.blocked=true;continue}
  if(Number(building.condition??building.durability??100)<=0){building.condition=0;building.status="BROKEN";work.blocked=true;continue}
  work.recipe=building.activeMeta&&building.activeRecipeSnapshot?building.activeRecipeSnapshot:recipeFor(building);
  if(!work.recipe){building.status="ERROR";building.errorCode="NO_RECIPE";work.blocked=true}
  else if(building.activeMeta&&!building.activeRecipeSnapshot){building.activeRecipeSnapshot=structuredClone(work.recipe);building.activeRecipe=work.recipe.name||building.activeRecipe}
 }
}
function speedResolvePhase(context){
 const allocations=context.power?.allocations||{};
 for(const [id,work] of context.machineWork||[]){
  const b=work.building;if(work.blocked||!work.recipe)continue;
  const ratio=allocations[id]?.ratio??((buildingDef(b.type)?.power||0)>0?0:1);
  work.power=resolveMachinePower(ratio,buildingDef(b.type)?.power||0);
  if(!b.activeMeta){
   if(context.reservationBlocked){b.status="ERROR";b.errorCode="ITEM_RESERVATION_INTEGRITY";work.blocked=true;continue}
   if(buildingDef(b.type)?.kind==="reactor"&&recipeHasSyntheticInput(b,work.recipe)){b.status="ERROR";b.errorCode="SYNTHETIC_DORONUM_INPUT";work.blocked=true;continue}
   if(!canConsumeRecipe(b,work.recipe)){b.status="WAITING_INPUT";work.blocked=true;continue}
   if(!work.power.canProgress){b.status=work.power.status;work.blocked=true;continue}
   const meta=consumeRecipe(b,work.recipe);
   if(!meta){b.status="WAITING_INPUT";work.blocked=true;continue}
   b.activeMeta=meta;b.activeInputQuantities=meta.consumedInputs||[];b.activeRecipe=work.recipe.name||String(work.recipe.output||"");b.activeRecipeSnapshot=structuredClone(work.recipe);
   b.temp=Number.isFinite(Number(b.temp))?Number(b.temp):25;b.pressure=Number.isFinite(Number(b.pressure))?Number(b.pressure):0;b.progress=0;
  }
  work.recipe=b.activeRecipeSnapshot||work.recipe;
  work.inputReady=true;
 }
}
function temperatureUpdatePhase(context){
 for(const work of context.machineWork?.values()||[]){
  if(work.blocked||!work.inputReady||!work.recipe||!work.power)continue;
  work.environment=advanceMachineEnvironment(work.building,work.recipe,context.dt,work.power.ratio);
 }
}
function qualityValidationPhase(context){
 for(const work of context.machineWork?.values()||[]){
  if(work.blocked||!work.inputReady)continue;
  const meta=work.building.activeMeta;
  if(!meta||!Number.isFinite(Number(meta.quality))||!Number.isFinite(Number(meta.purity))||Number(meta.quality)<0||Number(meta.quality)>100||Number(meta.purity)<0||Number(meta.purity)>100){
   work.building.status="ERROR";work.building.errorCode="INVALID_ACTIVE_INPUT_METADATA";work.blocked=true;continue;
  }
  meta.quality=clamp(meta.quality,0,100);meta.purity=clamp(meta.purity,0,100);meta.synthetic=!!meta.synthetic;
 }
}
function machineWearPhase(context){
 for(const work of context.machineWork?.values()||[]){
  if(work.blocked||!work.inputReady||!work.power?.canProgress||!work.environment?.safe)continue;
  work.wear=applyMachineWear(work.building,work.recipe,context.dt,work.power.ratio);
  if(work.wear.broken){work.building.status="BROKEN";work.building.activeFailureReason="CONDITION_DEPLETED";work.blocked=true}
  else if(work.wear.maintenanceRecommended)work.building.maintenanceRecommended=true;
 }
}
function machineProgressPhase(context){
 for(const building of S.buildings)if(!isProductionMachine(building))tickBuilding(building,context.dt,context.power||currentPower(),context);
 for(const work of context.machineWork?.values()||[]){
  const b=work.building;
  if(work.blocked||!work.inputReady)continue;
  if(!work.power?.canProgress){b.status=work.power?.status||"PAUSED_POWER";continue}
  if(!work.environment?.safe){b.status="COOLING";continue}
  if(!work.wear||work.wear.broken)continue;
  b.progress=Math.max(0,Number(b.progress)||0)+context.dt*work.power.progressMultiplier*work.wear.progressMultiplier;
  b.status=work.power.status;
 }
}
function machineFailureCheckPhase(context){
 for(const work of context.machineWork?.values()||[]){
  const b=work.building,profile=FAILURE_PROFILES[b.type];
  if(work.blocked||!work.inputReady||!work.power?.canProgress||!work.environment?.safe||!work.wear||!profile)continue;
  b.tick=Number(S.tick)||0;advanceFailureExposure(b,context.dt,true);
  const risks=calculateFailureRisks({profile,temperature:Number(b.temp),targetTemperature:work.environment.targetTemperature,safeTemperatureMin:work.environment.tempMin,safeTemperatureMax:work.environment.tempMax,pressure:Number(b.pressure),targetPressure:work.environment.targetPressure,safePressureMin:work.environment.pressureMin,safePressureMax:work.environment.pressureMax,powerRatio:work.power.ratio,condition:work.wear.condition,actualLoad:1,nominalLoad:1});
  const hazard=calculateFailureHazard(profile,risks,context.dt);
  work.failureEvent=rollMachineFailure(S.runtime,b,profile,hazard)||null;
 }
}
function machineFailureResolutionPhase(context){
 for(const work of context.machineWork?.values()||[]){
  if(!work.failureEvent)continue;
  const b=work.building;
  if(applyMachineFailure(b,work.failureEvent)){
   work.blocked=true;b.status=b.failureRepair?.broken?"BROKEN":"MAINTENANCE";
   log("기계 고장 · "+(buildingDef(b.type)?.name||b.type)+" / "+work.failureEvent.grade.toUpperCase(),"warn");markDirty();
  }
 }
}
function outputQualityPurityPhase(context){
 for(const work of context.machineWork?.values()||[]){
  const b=work.building,r=work.recipe;
  if(work.blocked||!work.inputReady||!b.activeMeta||!r||!work.power?.canProgress||!work.environment?.safe||!work.wear||work.failureEvent)continue;
  if(Number(b.progress)<Math.max(.001,Number(r.time)||0))continue;
  const id=r.output||(b.type==="variantLab"?b.variant||"ITEM_DORONUM_BLUE":null);
  if(!id||!RESOURCE[canonicalItemID(id)]){b.status="ERROR";b.errorCode="INVALID_RECIPE_OUTPUT";work.blocked=true;continue}
  const qualityOut=Math.max(Number(r.outputQualityMin)||0,calculateOutputQuality({materialQuality:b.activeMeta.quality,temperatureQuality:work.environment.temperatureQuality,pressureQuality:work.environment.pressureQuality,machineConditionQuality:work.wear.condition,powerStability:clamp(work.power.ratio*100,0,100),recipeModifier:(Number(r.qualityModifier)||0)+(r.allowSkillQualityBonus===true?calculateSkillBonuses(S.skills).recipeQualityModifier:0),pollutionPenalty:Number(b.pollutionPenalty)||0}));
  const purityOut=Math.max(Number(r.outputPurityMin)||0,calculateOutputPurity({inputPurity:b.activeMeta.purity,processLoss:Number(r.purityLoss??2),purificationBonus:S.research.includes("purity")?12:0,modifier:S.research.includes("chemistry")?2:0}));
  work.pendingOutput={id:canonicalItemID(id),qty:r.qty||1,meta:{quality:qualityOut,purity:purityOut,synthetic:!!b.activeMeta.synthetic}};
 }
}
function completionBufferPhase(context){
 for(const work of context.machineWork?.values()||[]){
  if(!work.pendingOutput)continue;
  const b=work.building;
  if(createOutput(b,work.pendingOutput.id,work.pendingOutput.qty,work.pendingOutput.meta)){
   b.progress=0;b.activeMeta=null;b.activeInputQuantities=[];b.activeRecipe=null;b.activeRecipeSnapshot=null;b.maintenanceRecommended=false;
  }
 }
}
function tick(dt){
 if(S.paused||S.victory)return;
 const context={state:S,dt,power:null,machinePipelineActive:true,machineWork:new Map()};
 const handlers={
  STATE_READ(){S.seconds+=dt;S.tick++;if(!E2E_MODE)updateSurvival(dt);ensureCooldownIndex();for(const key of activeCooldownKeys){const node=S.nodes?.[key];if(!node||!(node.cooldown>0)){activeCooldownKeys.delete(key);continue}node.cooldown=Math.max(0,node.cooldown-dt);if(node.cooldown<=0)activeCooldownKeys.delete(key)}},
  RESERVATION_RESOLVE(){reservationIntegrityPhase(context)},
  POWER_RESOLVE(){context.power=currentPower()},
  PRODUCTION_STATE(){for(const b of S.buildings){if((b.type==="coalgen"||b.type==="mineGen")&&b.fuelTimer<=0&&itemCount("coal")>0){takeItem("coal",1);b.fuelTimer=24;b.status="RUNNING"}}},
  SPEED_RESOLVE(){speedResolvePhase(context)},
  TEMPERATURE_UPDATE(){temperatureUpdatePhase(context)},
  PRESSURE_UPDATE(){context.fluid=tickFluidSystems(dt,context.power||currentPower())},
  QUALITY(){qualityValidationPhase(context)},
  WEAR(){machineWearPhase(context)},
  POWER_STABILITY(){settlePowerStorage(context.power||currentPower())},
  PRODUCTION_PROGRESS(){machineProgressPhase(context)},
  FAILURE_CHECK(){machineFailureCheckPhase(context)},
  FAILURE_RESOLUTION(){machineFailureResolutionPhase(context)},
  OUTPUT_QUALITY_PURITY(){outputQualityPurityPhase(context)},
  COMPLETION_BUFFER(){completionBufferPhase(context)},
  CONVEYOR_TRANSFER(){tickBelts(dt)},
  METRICS(){tickResearch(dt,(context.power||currentPower()).ratio);if(S.fusionJob)updateFusion(dt);const arrived=advanceShipments(S,S.contractRuntime,dt);if(arrived.length){for(const shipment of arrived)log((shipment.status==="DELIVERED"?"배송 성공":"배송 실패")+" · "+shipment.contractID,shipment.status==="DELIVERED"?"good":"warn");markDirty()}if(S.tick%10===0){questCheck();if(!E2E_MODE){renderHud();if(activePanel==="factory")renderFactory();if(activePanel==="inventory")renderInventory();if(activePanel==="mission")renderMissions();if(activePanel==="research")renderResearch()}}},
  SAVE_SNAPSHOT_REQUEST(){if(S.tick%10===0){rebuildOwnershipLedger(S);S.runtime.saveSnapshotRequested=true;markDirty()}else S.runtime.saveSnapshotRequested=false}
 };
 const missing=TICK_STAGE_ORDER.filter(stage=>typeof handlers[stage]!=="function");
 if(missing.length)throw new Error("MISSING_TICK_STAGE_HANDLERS:"+missing.join(","));
 const trace=runCanonicalTick(context,handlers);
 context.lastStageTrace=trace;
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
function drawWorld(){if(adventureMode()&&(selectedBuild||selectedLandTool)){const r=canvas.getBoundingClientRect();hoverCell=world3d.pickTile(r.left+r.width/2,r.top+r.height/2)||hoverCell}const node=hoverCell?tileNode(hoverCell.x,hoverCell.y):null;let canBuildPreview=false;if(hoverCell){if(selectedLandTool==="flatten")canBuildPreview=!buildingAt(hoverCell.x,hoverCell.y)&&(!node||!["water","wood","mineEntrance","dori","relaySite","coreSite"].includes(node.type));else if(selectedLandTool==="foundation")canBuildPreview=!!S.flattened[surfaceKey(hoverCell.x,hoverCell.y)]&&!S.foundation[surfaceKey(hoverCell.x,hoverCell.y)];else if(selectedBuild)canBuildPreview=!buildingAt(hoverCell.x,hoverCell.y)&&(selectedBuild==="beltAdaptive"||hasFoundation(hoverCell.x,hoverCell.y))&&(!node||!["water","wood","mineEntrance","dori","relaySite","coreSite"].includes(node.type));}world3d.render({...S,sceneRevision,visibilityRevision,playerMotion:{...playerMotion,mining:mineHeld},selectedBuilding,selectedBuild,selectedLandTool,hoverCell,canBuildPreview,buildingDefs:BUILDINGS});}
function centerCamera(){camera.x=S.player.x+.5;camera.y=S.player.y+.5;world3d.center(S.player.x,S.player.y);if(S.player.viewMode!=="map")world3d.setViewMode(S.player.viewMode);drawWorld()}
function setZoom(z){camera.zoom=clamp(z,.55,1.8);world3d.setZoom(camera.zoom);$("zoom-value").textContent=Math.round(camera.zoom*100)+"%";drawWorld()}
function showModal(title,body,buttons=[]){$("modal-card").innerHTML='<div class="modal-head"><h2>'+title+'</h2><button class="modal-close" id="modal-x">×</button></div><div class="modal-body">'+body+'</div><div class="modal-foot">'+buttons.map((b,i)=>'<button class="action-button '+(b.cls||"secondary")+'" data-modal-action="'+i+'">'+b.label+'</button>').join("")+'</div>';$("modal-overlay").classList.add("show");$("modal-x").onclick=closeModal;$("modal-card").querySelectorAll("[data-modal-action]").forEach(el=>el.onclick=()=>{const btn=buttons[Number(el.dataset.modalAction)];if(btn?.action)btn.action();else closeModal()})}
function closeModal(){if(crystalViewer){crystalViewer.dispose();crystalViewer=null}$("modal-overlay").classList.remove("show")}
function settingsModal(){
 const backups=listConflictBackups();
 const backupSection='<div class="backup-panel"><div class="subheading"><h3>충돌 백업</h3><span class="muted-small">'+backups.length+' SAVED</span></div><p>클라우드 충돌 해결 과정에서 보존한 이전 진행도를 복원할 수 있습니다.</p>'+(backups.map(item=>'<div class="backup-row"><div><strong>'+escapeHTML(item.label||"save")+'</strong><small>'+escapeHTML(item.savedAt||"")+'</small></div><button type="button" class="action-button secondary" data-conflict-backup="'+escapeHTML(item.key)+'">복원</button></div>').join("")||'<div class="backup-empty">복원 가능한 충돌 백업이 없습니다.</div>')+'</div>';
 const body='<div class="setting-row"><div><strong>효과음</strong><small>건설·채집·연구 알림 소리</small></div><button class="toggle '+(S.settings.sound?"on":"")+'" id="setting-sound"><i></i></button></div><div class="setting-row"><div><strong>모션 감소</strong><small>반짝임과 화면 효과를 줄입니다.</small></div><button class="toggle '+(S.settings.reducedMotion?"on":"")+'" id="setting-motion"><i></i></button></div><p>저장 방식: 로그인 상태에서는 돌이사이트 계정의 개인 클라우드에 저장됩니다. 로그아웃 상태에서는 이 브라우저에만 저장됩니다. 오프라인 생산은 진행되지 않습니다.</p><p id="account-line">계정 연결 상태 확인 중…</p>'+backupSection;
 showModal("게임 설정",body,[{label:"닫기",cls:"primary"}]);
 $("setting-sound").onclick=()=>{S.settings.sound=!S.settings.sound;settingsModal();markDirty()};
 $("setting-motion").onclick=()=>{S.settings.reducedMotion=!S.settings.reducedMotion;settingsModal();markDirty()};
 $("account-line").textContent=authSession?"돌이사이트 계정 클라우드 연결됨":"로그인이 필요합니다. 돌이사이트에서 로그인 후 다시 접속하세요.";
 document.querySelectorAll("[data-conflict-backup]").forEach(button=>button.addEventListener("click",()=>restoreConflictBackup(button.dataset.conflictBackup)));
}
function sellItems(){const id=$("sell-resource").value,qty=Math.floor(Number($("sell-amount").value)||0);if(!id||qty<1||itemCount(id)<qty){toast("판매 수량이 부족합니다.","warn");return}takeItem(id,qty);const earned=Math.floor(qty*RESOURCE[id].price);S.money+=earned;S.stats.sold+=qty;log(RESOURCE[id].name+" "+fmt(qty)+"개 판매 · "+fmt(earned)+" D");toast("판매 완료 · +"+fmt(earned)+" D");playTone(680,.1,"triangle");markDirty();renderAll()}
function setTabFromKey(key){const map={b:"build",o:"factory",i:"inventory",t:"research",j:"mission"};if(map[key])toggleControlPanel(map[key])}
function movePlayer(dx,dy){const origin=playerMotion.path.length?playerMotion.path[playerMotion.path.length-1]:{x:S.player.x,y:S.player.y};const x=clamp(origin.x+dx,0,WORLD_W-1),y=clamp(origin.y+dy,0,WORLD_H-1);if(!isWalkable(x,y)){toast("시설 또는 지형에 막혀 있습니다.","warn");return}movePlayerTo(x,y)}
function wireControls(){
 $("main-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-panel]");if(b)changePanel(b.dataset.panel)});
 $("skill-tree").addEventListener("click",e=>{const b=e.target.closest("[data-skill]");if(b)activateSkill(b.dataset.skill)});
 $("build-category").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;activeCategory=b.dataset.cat;document.querySelectorAll(".category-chip").forEach(x=>x.classList.toggle("active",x===b));renderBuildList()});
 $("build-list").addEventListener("click",e=>{const b=e.target.closest("[data-build]");if(!b)return;selectedBuild=selectedBuild===b.dataset.build?null:b.dataset.build;selectedBuilding=null;renderBuildList();drawWorld();if(selectedBuild)toast(buildingDef(selectedBuild).name+" 선택 · 월드에서 위치를 클릭")});
 $("sell-button").onclick=sellItems;$("sell-resource").onchange=updateMarketEstimate;$("sell-amount").oninput=updateMarketEstimate;
 $("panel-inventory").addEventListener("click",e=>{const card=e.target.closest("[data-crystal]");if(card)showCrystalPreview(card.dataset.crystal)});


 $("zoom-in").onclick=()=>setZoom(camera.zoom+.1);$("zoom-out").onclick=()=>setZoom(camera.zoom-.1);$("center-view").onclick=centerCamera;
 $("overview-toggle").onclick=()=>toggleControlPanel("factory");$("clear-selection").onclick=()=>{selectedBuilding=null;renderMachineDetails();drawWorld()};
 $("pause-sim").onclick=()=>{S.paused=!S.paused;renderHud();markDirty();toast(S.paused?"시뮬레이션 일시정지":"시뮬레이션 재개")};
 $("speed-sim").onclick=()=>{S.simSpeed=S.simSpeed===1?2:S.simSpeed===2?3:1;renderHud();markDirty()};
 $("blueprint-save").onclick=saveCurrentBlueprint;$("save-now").onclick=()=>saveGame(true);$("sound-toggle").onclick=()=>{S.settings.sound=!S.settings.sound;$("sound-toggle").style.color=S.settings.sound?"var(--cyan)":"var(--muted)";markDirty();toast(S.settings.sound?"효과음 켜짐":"효과음 꺼짐")};$("settings-open").onclick=settingsModal;
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
   }else if(e.button===2||e.shiftKey){lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY}}
   else if(e.button===0){mineHeld=true;mineCooldown=0;performAdventureAction()}
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
  if(!adventureMode()||document.pointerLockElement!==card)return;
  playerMotion.yaw-=e.movementX*.0025;playerMotion.pitch=clamp(playerMotion.pitch-e.movementY*.0025,-1.25,1.12);
 });
 document.addEventListener("pointerlockchange",()=>{card.classList.toggle("pointer-locked",document.pointerLockElement===card)});
 document.addEventListener("pointerlockerror",()=>toast("마우스 잠금이 지원되지 않습니다. 드래그로 시점을 조작하세요.","warn"));
 window.addEventListener("keydown",e=>{
  if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||$("modal-overlay").classList.contains("show"))return;
  const k=e.key.toLowerCase();
  if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," ","shift"].includes(k))e.preventDefault();
  if(k==="v"){setViewMode(S.player.viewMode==="first"?"third":"first");return}
  if(k==="m"){if(S.player.layer==="mine"){toast("광산 내부에서는 지도를 열 수 없습니다.");return}setViewMode(S.player.viewMode==="map"?"first":"map");return}
  
  if(k==="4"){selectTool("pickaxe");return}if(k==="5"){selectTool("axe");return}
  if(k==="f"){toggleFullscreen();return}
  if(k==="e"&&adventureMode()){adventureKeys.add("e");performAdventureAction();return}
  if(k==="x"){if(selectedBuilding){const b=S.buildings.find(x=>x.uid===selectedBuilding);if(b){b.dir=(b.dir+1)%4;renderMachineDetails();drawWorld();markDirty()}}else toast("시설을 선택한 뒤 X 키로 방향을 회전하세요.");return}
  if(k==="escape"){if(document.pointerLockElement===card)document.exitPointerLock();if(controlPanelOpen){closeControlPanel();return}selectedBuild=null;selectedLandTool=null;drawWorld();return}
  if(k==="b"||k==="o"||k==="i"||k==="t"||k==="j")setTabFromKey(k);
  if(k===" "&&adventureMode())adventureKeys.add(" ");
  else if(adventureMode()&&["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k))adventureKeys.add(k);
  else if(!adventureMode()&&(k==="w"||k==="arrowup"))movePlayer(0,-1);
  else if(!adventureMode()&&(k==="s"||k==="arrowdown"))movePlayer(0,1);
  else if(!adventureMode()&&(k==="a"||k==="arrowleft"))movePlayer(-1,0);
  else if(!adventureMode()&&(k==="d"||k==="arrowright"))movePlayer(1,0);
  if(k===" "&&!adventureMode()){S.paused=!S.paused;renderHud()}
 });
 window.addEventListener("keyup",e=>{const k=e.key.toLowerCase();adventureKeys.delete(k);if(k===" ")adventureKeys.delete(" ")});
 document.querySelectorAll("[data-view-mode]").forEach(b=>b.addEventListener("click",()=>setViewMode(b.dataset.viewMode)));
 document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>selectTool(b.dataset.tool)));
 document.querySelectorAll("[data-land-tool]").forEach(b=>b.addEventListener("click",()=>{selectedLandTool=b.dataset.landTool==="none"?null:b.dataset.landTool;selectedBuild=null;closeControlPanel();toast(selectedLandTool==="flatten"?"평탄화할 타일을 선택하세요.":selectedLandTool==="foundation"?"기초 타일을 설치할 평탄화 지형을 선택하세요.":"지형 도구 해제");drawWorld()}));
 $("game-menu-toggle")?.addEventListener("click",()=>toggleControlPanel("build"));
 $("story-start-button")?.addEventListener("click",startCampaign);
 $("panel-close")?.addEventListener("click",closeControlPanel);
 $("fullscreen-button")?.addEventListener("click",toggleFullscreen);
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
function renderAll(){renderHud();renderBuildList();renderFactory();renderInventory();renderResearch();renderMissions();renderQuickObjectives();drawWorld()}
function hydrateState(input){markSceneDirty();const base=freshState(),incoming=input&&typeof input==="object"?input:{},migrate=Number(incoming.worldVersion||0)<3,expandSurface=Number(incoming.worldVersion||0)<4;
 S={...base,...incoming,worldVersion:4,player:{...base.player,...incoming.player},inventory:{...base.inventory,...incoming.inventory},meta:{...incoming.meta},tools:{...base.tools,...incoming.tools},activeTool:incoming.activeTool||"pickaxe",campaign:{...base.campaign,...incoming.campaign},campaignAcquisitions:{...base.campaignAcquisitions,...incoming.campaignAcquisitions},flattened:{...incoming.flattened},foundation:{...incoming.foundation},mineDeposits:incoming.mineDeposits&&Object.keys(incoming.mineDeposits).length?incoming.mineDeposits:base.mineDeposits,buildings:Array.isArray(incoming.buildings)?incoming.buildings:[],nodes:migrate?base.nodes:(expandSurface?{...base.nodes,...(incoming.nodes&&typeof incoming.nodes==="object"?incoming.nodes:{})}:(incoming.nodes&&typeof incoming.nodes==="object"?incoming.nodes:base.nodes)),sites:base.sites,seen:incoming.seen||{},research:Array.isArray(incoming.research)?incoming.research:[],stats:{...base.stats,...incoming.stats,gathered:{...base.stats.gathered,...incoming.stats?.gathered},built:{...base.stats.built,...incoming.stats?.built},produced:{...base.stats.produced,...incoming.stats?.produced}},settings:{...base.settings,...incoming.settings},survival:{...base.survival,...incoming.survival},relaySites:Array.isArray(incoming.relaySites)?incoming.relaySites:[false,false,false],skills:normalizeSkillState(incoming.skills),contractRuntime:incoming.contractRuntime&&Array.isArray(incoming.contractRuntime.shipments)?incoming.contractRuntime:base.contractRuntime,constructionLedger:incoming.constructionLedger&&typeof incoming.constructionLedger==="object"?incoming.constructionLedger:{},moneyReservations:incoming.moneyReservations&&typeof incoming.moneyReservations==="object"?incoming.moneyReservations:{},blueprints:Array.isArray(incoming.blueprints)?incoming.blueprints.filter(b=>b&&b.version===1&&Array.isArray(b.buildings)):[],powerTopologyEnabled:incoming.powerTopologyEnabled===true,powerTopologyLayers:incoming.powerTopologyLayers&&typeof incoming.powerTopologyLayers==="object"?incoming.powerTopologyLayers:{surface:incoming.powerTopologyEnabled===true,mine:{}}};
 if(!incoming.runtime)S.runtime=createRuntimeState();
 ensureItemStacks(S);applyDoronumMigration(S);syncLegacyInventory(S);rebuildOwnershipLedger(S);if(!S.contractRuntime||!Array.isArray(S.contractRuntime.shipments))S.contractRuntime=createContractState((Number(S.seed)^0x4c4f4749)>>>0);if(!S.contractRuntime.claims||typeof S.contractRuntime.claims!=="object")S.contractRuntime.claims={};reconcileSkillMilestones();
 if(migrate){const ox=38,oz=32;S.player.x=clamp(Number(incoming.player?.x??18)+ox,0,WORLD_W-1);S.player.y=clamp(Number(incoming.player?.y??14)+oz,0,WORLD_H-1);S.player.layer="surface";S.player.mineLevel=1;S.player.surfacePosition=null;for(const b of S.buildings){b.x=clamp((Number(b.x)||0)+ox,0,WORLD_W-1);b.y=clamp((Number(b.y)||0)+oz,0,WORLD_H-1);const k=surfaceKey(b.x,b.y);delete S.nodes[k];S.flattened[k]={height:terrainHeightAt(b.x,b.y)};S.foundation[k]=true}S.player.x=clamp(S.player.x,1,WORLD_W-2);S.player.y=clamp(S.player.y,1,WORLD_H-2)}
 S.simSpeed=[1,2,3].includes(S.simSpeed)?S.simSpeed:1;S.player.x=clamp(Number(S.player.x??64),0,S.player.layer==="mine"?MINE_W-1:WORLD_W-1);S.player.y=clamp(Number(S.player.y??52),0,S.player.layer==="mine"?MINE_H-1:WORLD_H-1);S.paused=!!S.paused;S.tick=Number(S.tick)||0;S.seconds=Number(S.seconds)||8*3600;S.player.viewMode=["first","third","map"].includes(S.player.viewMode)?S.player.viewMode:"first";if(S.player.layer==="mine"&&S.player.viewMode==="map")S.player.viewMode="first";S.player.mineLevel=clamp(Number(S.player.mineLevel)||1,1,MINE_LEVELS);S.player.yaw=Number(S.player.yaw)||0;S.player.pitch=clamp(Number(S.player.pitch??-.12),-1.25,1.25);S.survival.health=clamp(Number(S.survival.health??100),0,100);S.survival.hunger=clamp(Number(S.survival.hunger??100),0,100);S.survival.thirst=clamp(Number(S.survival.thirst??100),0,100);playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:S.player.yaw,pitch:S.player.pitch,path:[],moving:false,facing:0,onArrive:null};rebuildCooldownIndex();}
function loadLocal(){const candidate=readBestSave(localStorage,activeLocalKey);if(!candidate)return null;if(candidate.reason==="UNSUPPORTED_FUTURE_SCHEMA"){saveBlockedForFutureSchema=true;setSaveMessage("더 최신 버전의 저장 데이터입니다. 최신 게임 버전에서 열어 주세요.");if(!E2E_MODE)showModal("저장 데이터 버전 확인 필요","<p>이 저장 데이터는 현재 게임보다 새로운 버전에서 만들어졌습니다.</p><p>데이터를 덮어쓰지 않도록 저장을 잠갔습니다. 최신 게임 버전에서 다시 열어 주세요.</p>",[{label:"확인",cls:"primary"}]);return "future-schema-blocked"}if(!candidate.valid)return null;try{hydrateState(candidate.state);if(candidate.source!==activeLocalKey){restoreSaveCandidate(localStorage,activeLocalKey,candidate);if(!E2E_MODE)toast(candidate.source.includes("_backup_")?"이전 백업 저장 데이터에서 복구했습니다.":"임시 저장 데이터에서 복구했습니다.");}return candidate.savedAt||S.lastSavedAt||null}catch(error){console.warn("Local save candidate rejected",candidate.source,error);return null}}
function setSaveMessage(value){$("save-message").textContent=value}
function saveLocal(){if(saveBlockedForFutureSchema){setSaveMessage("최신 버전에서 생성된 저장 데이터는 이 버전에서 덮어쓸 수 없습니다.");return null}const savedAt=nowISO();S.lastSavedAt=savedAt;try{const audit=validateRuntimeState(S);if(!audit.valid)throw new Error("저장 전 인벤토리 검증 실패: "+audit.errors.join(", "));const skills=validateSkillState(S.skills);if(!skills.valid)throw new Error("저장 전 스킬 검증 실패: "+skills.errors.join(", "));const snapshot=requestSaveSnapshot(S);S.runtime.saveSnapshotRequested=false;writeSaveEnvelope(localStorage,activeLocalKey,snapshot,savedAt);return savedAt}catch(e){setSaveMessage("저장 검증 또는 저장 공간 오류");console.error(e);return null}}
async function loadCloudForUser(session){if(!cloudClient||!session?.user?.id)return false;setCloud("syncing","클라우드 확인");try{const {data,error}=await cloudClient.from("dori_cloud_storage").select("storage_value,updated_at,save_revision").eq("storage_key",CLOUD_KEY).eq("is_deleted",false).maybeSingle();if(error)throw error;if(!data){cloudUpdatedAt=null;cloudSaveRevision=0;setCloud("online","계정 연결됨");return false}const envelope=data.storage_value||{};if(!envelope.state)throw new Error("저장 형식이 올바르지 않습니다.");const remoteValidation=validateSaveEnvelope(envelope);if(!remoteValidation.valid)throw new Error("클라우드 저장 데이터 검증 실패: "+remoteValidation.reason);const remoteTime=Date.parse(data.updated_at||envelope.savedAt||0),localTime=Date.parse(S.lastSavedAt||0);cloudUpdatedAt=data.updated_at||envelope.savedAt||null;cloudSaveRevision=Math.max(0,Number(data.save_revision)||0);if(remoteTime>localTime){hydrateState(envelope.state);S.lastSavedAt=cloudUpdatedAt;writeSaveEnvelope(localStorage,activeLocalKey,S,cloudUpdatedAt);renderAll();setViewMode(S.player.viewMode);toast("클라우드 저장 데이터를 불러왔습니다.");setCloud("online","클라우드 동기화")}else{setCloud("online","클라우드 연결됨");if(localTime>remoteTime){cloudSaveConflict={expectedRevision:cloudSaveRevision,remoteRevision:cloudSaveRevision,remoteUpdatedAt:cloudUpdatedAt,detectedAt:nowISO(),localSavedAt:S.lastSavedAt,reason:"LOCAL_NEWER_THAN_CLOUD"};dirty=true;setCloud("error","저장 충돌");setSaveMessage("기기와 클라우드 저장 시간이 다릅니다. 자동 덮어쓰기를 차단했습니다.");if(!E2E_MODE)showCloudSaveConflict()}}return true}catch(e){if(String(e).includes("UNSUPPORTED_FUTURE_SCHEMA")){saveBlockedForFutureSchema=true;setCloud("error","최신 버전 필요");setSaveMessage("클라우드 저장 데이터가 더 최신 버전입니다. 덮어쓰기를 차단했습니다.");toast("최신 버전의 클라우드 저장 데이터가 있어 저장을 잠갔습니다.","warn");return true}console.error("Cloud load failed",e);setCloud("error","클라우드 오류");setSaveMessage("로컬 저장 사용 중");return false}}
async function initCloud(){try{const mod=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm");createClient=mod.createClient;cloudClient=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"sb-scttowfhygcpdirrekqm-auth-token"}});const {data,error}=await cloudClient.auth.getSession();if(error)throw error;authSession=data.session;if(authSession){activeLocalKey=LOCAL_KEY+"_"+authSession.user.id;cloudSaveRevision=0;cloudUpdatedAt=null;cloudSaveConflict=null;saveBlockedForFutureSchema=false;const accountLocal=loadLocal();if(!accountLocal)S=freshState();const found=await loadCloudForUser(authSession);if(!found){renderAll();await saveGame(true)}}else setCloud("","로그인 필요");cloudClient.auth.onAuthStateChange((event,session)=>{queueMicrotask(async()=>{const previous=authSession?.user?.id;authSession=session;if(session?.user?.id&&session.user.id!==previous){activeLocalKey=LOCAL_KEY+"_"+session.user.id;cloudSaveRevision=0;cloudUpdatedAt=null;cloudSaveConflict=null;saveBlockedForFutureSchema=false;const accountLocal=loadLocal();if(!accountLocal)S=freshState();dirty=false;const found=await loadCloudForUser(session);if(!found){renderAll();await saveGame(true)}}else if(!session){activeLocalKey=LOCAL_KEY;cloudSaveRevision=0;cloudUpdatedAt=null;cloudSaveConflict=null;saveBlockedForFutureSchema=false;const guestLocal=loadLocal();if(!guestLocal)S=freshState();renderAll();setCloud("","로그인 필요");saveLocal()}else if(event==="TOKEN_REFRESHED"){setCloud("online","클라우드 연결됨")}})});return true}catch(e){console.warn("Supabase client unavailable; using local save",e);cloudClient=null;authSession=null;setCloud("error","로컬 저장");return false}}
function listConflictBackups(){
 try{
  const value=JSON.parse(localStorage.getItem(activeLocalKey+"_conflict_backups")||"[]");
  return Array.isArray(value)?value.filter(item=>item&&typeof item.key==="string"&&item.key.startsWith(activeLocalKey+"_conflict_")).slice(0,12):[];
 }catch{return []}
}
function saveConflictBackup(state,label){
 const key=activeLocalKey+"_conflict_"+label+"_"+Date.now();
 const savedAt=nowISO();writeSaveEnvelope(localStorage,key,state,savedAt);
 try{
  const entries=listConflictBackups().filter(item=>item.key!==key);
  entries.unshift({key,label:String(label),savedAt});
  localStorage.setItem(activeLocalKey+"_conflict_backups",JSON.stringify(entries.slice(0,12)));
 }catch(error){console.warn("Conflict backup index could not be updated",error)}
 return {key,savedAt};
}
function restoreConflictBackup(key){
 const entry=listConflictBackups().find(item=>item.key===key);if(!entry)return false;
 const raw=localStorage.getItem(key);if(!raw){toast("선택한 충돌 백업 파일을 찾을 수 없습니다.","warn");return false}
 const candidate=decodeSave(raw);if(!candidate.valid){toast("충돌 백업 검증 실패 · "+candidate.reason,"warn");return false}
 try{
  saveConflictBackup(requestSaveSnapshot(S),"pre_restore");
  hydrateState(candidate.state);S.lastSavedAt=candidate.savedAt||nowISO();
  writeSaveEnvelope(localStorage,activeLocalKey,requestSaveSnapshot(S),S.lastSavedAt);
  dirty=true;closeModal();renderAll();setViewMode(S.player.viewMode);
  if(cloudSaveConflict){setCloud("error","저장 충돌 해결 필요");setSaveMessage("충돌 백업 복원됨 · 클라우드 동기화 잠금 유지")}
  else{setSaveMessage("충돌 백업 복원됨 · 클라우드 동기화 대기");setCloud(cloudClient?"syncing":"",cloudClient?"백업 복원됨":"로그인 필요")}
  toast("충돌 백업을 복원했습니다. 기존 현재 상태도 별도 백업에 보존했습니다.");
  return true;
 }catch(error){console.error("Conflict backup restore failed",error);toast("백업 복원 실패 · 기존 진행도는 보존했습니다.","warn");return false}
}
function showCloudSaveConflict(){
 if(!cloudSaveConflict||$("modal-overlay")?.classList.contains("show"))return;
 const remoteRevision=Math.max(0,Number(cloudSaveConflict.remoteRevision)||0);
 showModal("클라우드 저장 충돌",`<p>다른 기기에서 더 최신 저장이 발견되었습니다. 이 기기의 진행도와 클라우드 진행도는 모두 보존되어 있습니다.</p><p>충돌이 해결될 때까지 자동 클라우드 덮어쓰기는 잠겨 있습니다.</p><div class="cloud-conflict-details"><div><small>이 기기의 기준 Revision</small><strong>R${Math.max(0,Number(cloudSaveConflict.expectedRevision)||0)}</strong></div><div><small>현재 클라우드 Revision</small><strong>R${remoteRevision}</strong></div></div><p>원격 진행도를 불러오거나, 이 기기의 진행도로 최신 원격 Revision에 명시적으로 저장할 수 있습니다. 선택 전 양쪽 사본을 보존합니다.</p>`,[
  {label:"클라우드 최신본 불러오기",cls:"secondary",action:()=>{void resolveCloudSaveConflict("REMOTE")}},
  {label:"이 기기 진행도로 덮어쓰기",cls:"gold",action:()=>{void resolveCloudSaveConflict("LOCAL")}},
  {label:"나중에 해결",cls:"secondary",action:closeModal}
 ]);
}
async function resolveCloudSaveConflict(choice){
 if(!cloudSaveConflict||cloudBusy||!cloudClient||!authSession?.user?.id)return false;
 cloudBusy=true;setCloud("syncing","저장 충돌 해결 중");
 try{
  if(choice==="REMOTE"){
   const remote=await readCloudSaveSnapshot(cloudClient,{storageKey:CLOUD_KEY});
   if(!remote.exists||!remote.envelope?.state)throw new Error("REMOTE_SAVE_NOT_FOUND");
   const validation=validateSaveEnvelope(remote.envelope);
   if(!validation.valid)throw new Error("REMOTE_SAVE_INVALID:"+validation.reason);
   const localState=requestSaveSnapshot(S);
   const backup=saveConflictBackup(localState,"local");
   hydrateState(remote.envelope.state);S.lastSavedAt=remote.updatedAt||remote.envelope.savedAt||nowISO();
   writeSaveEnvelope(localStorage,activeLocalKey,requestSaveSnapshot(S),S.lastSavedAt);
   cloudSaveRevision=remote.revision;cloudUpdatedAt=remote.updatedAt;cloudSaveConflict=null;dirty=false;
   closeModal();renderAll();setViewMode(S.player.viewMode);
   setCloud("online","클라우드 최신본 사용");setSaveMessage("클라우드 최신본 불러옴 · 로컬 백업 보존");
   toast("클라우드 최신본을 불러왔습니다. 이전 기기 진행도는 별도 백업에 보존했습니다.");
   log("클라우드 충돌 해결 · 원격 저장본 선택 · 로컬 백업 "+backup.key);
   return true;
  }
  if(choice==="LOCAL"){
   rebuildOwnershipLedger(S);
   const savedAt=nowISO(),localEnvelope=createSaveEnvelope(requestSaveSnapshot(S),savedAt);
   const result=await replaceCloudSaveAfterExplicitConflict(cloudClient,{storageKey:CLOUD_KEY,userId:authSession.user.id,value:localEnvelope});
   if(!result.saved){
    cloudSaveConflict={...cloudSaveConflict,remoteRevision:result.revision,remoteUpdatedAt:result.updatedAt,expectedRevision:cloudSaveRevision};
    dirty=true;setCloud("error","저장 충돌 재발");setSaveMessage("클라우드가 다시 변경되었습니다. 두 저장본을 보존했습니다.");
    toast("덮어쓰기 중 다른 기기에서 다시 저장되었습니다. 아무 데이터도 덮어쓰지 않았습니다.","warn");
    closeModal();showCloudSaveConflict();return false;
   }
   if(result.previous?.exists&&result.previous.envelope?.state)saveConflictBackup(result.previous.envelope.state,"cloud");
   cloudSaveRevision=result.revision;cloudUpdatedAt=result.updatedAt||savedAt;cloudSaveConflict=null;dirty=false;
   S.lastSavedAt=savedAt;writeSaveEnvelope(localStorage,activeLocalKey,requestSaveSnapshot(S),savedAt);
   closeModal();setCloud("online","모든 기기 동기화");setSaveMessage("충돌 해결 완료 · 클라우드 R"+cloudSaveRevision);
   toast("이 기기의 진행도를 최신 클라우드 Revision에 저장했습니다. 이전 클라우드 사본도 백업했습니다.");
   log("클라우드 충돌 해결 · 로컬 저장본 선택 · R"+cloudSaveRevision);
   return true;
  }
  throw new Error("INVALID_CONFLICT_RESOLUTION");
 }catch(error){
  console.error("Cloud conflict resolution failed",error);
  dirty=true;setCloud("error","충돌 해결 실패");setSaveMessage("충돌 해결 실패 · 로컬 및 클라우드 저장 보존");
  toast("충돌 해결에 실패했습니다. 양쪽 저장 데이터는 유지됩니다.","warn");return false;
 }finally{cloudBusy=false}
}
async function saveGame(force=false){
 if(!force&&!dirty)return;
 rebuildOwnershipLedger(S);
 if(cloudBusy){saveLocal();return}
 const savedAt=saveLocal();if(!savedAt)return;
 if(cloudSaveConflict){
  dirty=true;setCloud("error","저장 충돌 해결 필요");setSaveMessage("이 기기의 저장은 보존 중 · 충돌 해결 후 클라우드 동기화");
  return;
 }
 dirty=false;setSaveMessage("이 기기 저장 완료");
 if(!cloudClient||!authSession?.user?.id){setCloud("","로그인 필요");return}
 cloudBusy=true;setCloud("syncing","클라우드 저장");
 try{
  const envelope=createSaveEnvelope(requestSaveSnapshot(S),savedAt);
  const expectedRevision=cloudSaveRevision;
  const result=await writeCloudSave(cloudClient,{storageKey:CLOUD_KEY,userId:authSession.user.id,value:envelope,expectedRevision});
  if(!result.saved){
   dirty=true;
   cloudSaveConflict={expectedRevision,remoteRevision:Math.max(0,Number(result.revision)||0),remoteUpdatedAt:result.updatedAt||null,detectedAt:nowISO(),localSavedAt:savedAt};
   setCloud("error","저장 충돌");setSaveMessage("다른 기기의 최신 저장 감지 · 두 사본 보존");
   toast("저장 충돌이 감지되었습니다. 자동 덮어쓰기를 잠갔습니다.","warn");
   showCloudSaveConflict();
   return;
  }
  cloudSaveRevision=result.revision;cloudUpdatedAt=result.updatedAt||savedAt;setCloud("online","모든 기기 동기화");setSaveMessage("계정 클라우드 저장 완료 · R"+cloudSaveRevision);
 }catch(error){
  dirty=true;console.error("Cloud save failed",error);setCloud("error","로컬 저장됨");setSaveMessage("클라우드 오류 · 로컬 보존");toast("클라우드 저장에 실패했습니다. 이 기기 저장은 보존했습니다.","warn");
 }finally{cloudBusy=false}
 if(cloudSaveConflict)showCloudSaveConflict();
}
async function pollCloud(){if(!cloudClient||!authSession?.user?.id||cloudBusy||cloudSaveConflict)return;try{const {data,error}=await cloudClient.from("dori_cloud_storage").select("storage_value,updated_at,save_revision").eq("storage_key",CLOUD_KEY).eq("is_deleted",false).maybeSingle();if(error)throw error;if(!data)return;const remote=data.updated_at||data.storage_value?.savedAt;const remoteRevision=Math.max(0,Number(data.save_revision)||0);if(remoteRevision===cloudSaveRevision&&remote===cloudUpdatedAt)return;if(dirty){setCloud("syncing","다른 기기 변경 감지");toast("다른 기기의 저장 데이터가 있습니다. 저장 후 새로고침하면 최신 진행도를 불러옵니다.","warn");return}const envelope=data.storage_value;if(envelope?.state){const validation=validateSaveEnvelope(envelope);if(validation.reason==="UNSUPPORTED_FUTURE_SCHEMA"){saveBlockedForFutureSchema=true;setCloud("error","최신 버전 필요");setSaveMessage("더 최신 클라우드 저장 데이터가 있어 저장을 잠갔습니다.");toast("최신 버전의 클라우드 저장 데이터가 있어 저장을 잠갔습니다.","warn");return}if(validation.valid){hydrateState(envelope.state);S.lastSavedAt=remote;cloudUpdatedAt=remote;cloudSaveRevision=remoteRevision;writeSaveEnvelope(localStorage,activeLocalKey,S,remote);renderAll();setViewMode(S.player.viewMode);setCloud("online","다른 기기와 동기화");toast("다른 기기의 공장 진행도를 동기화했습니다.")}}}catch(e){console.warn("Cloud polling error",e)}}
function animationFrame(time){
 if(document.hidden){lastFrame=time;frameRenderAccumulator=0;requestAnimationFrame(animationFrame);return}
 const frameMs=Math.min(80,Math.max(0,time-lastFrame));lastFrame=time;drawTime=time;
 world3d.adaptPerformanceFrame?.(frameMs);
 const elapsed=frameMs/1000;
 updatePlayerMotion(elapsed);
 if(!S.paused&&!S.victory){accumulator+=elapsed*S.simSpeed;while(accumulator>=STEP){tick(STEP);accumulator-=STEP}}
 frameRenderAccumulator=Math.min(50,frameRenderAccumulator+frameMs);
 if(frameRenderAccumulator>=1000/60){frameRenderAccumulator-=1000/60;drawWorld()}
 requestAnimationFrame(animationFrame);
}
function boot(){const localTime=loadLocal();playerMotion={x:S.player.x,z:S.player.y,y:0,velocityY:0,grounded:true,yaw:Number(S.player.yaw)||0,pitch:Number(S.player.pitch??-.12),path:[],moving:false,facing:0,onArrive:null};camera.x=S.player.x;camera.y=S.player.y;revealAround();wireControls();renderAll();setViewMode(S.player.viewMode);if(!E2E_MODE){initCloud();setInterval(()=>saveGame(false),12000);setInterval(()=>pollCloud(),25000);window.addEventListener("beforeunload",()=>{try{saveLocal()}catch{}});document.addEventListener("visibilitychange",()=>{if(document.hidden){saveLocal();setSaveMessage("이 기기 저장 완료")}else{lastFrame=performance.now();pollCloud()}})}else setCloud("online","테스트 모드");lastFrame=performance.now();requestAnimationFrame(animationFrame);if(!E2E_MODE){if(!S.campaign.introSeen)showStoryIntro();else if(getQuest())setTimeout(()=>notifyNewMission(getQuest()),350);if(!localTime)log("공장 복구 프로토콜 시작 · ORBIT 온라인 대기")}}

boot();
if(E2E_MODE){
 window.__doroniumFactoryTest={
  snapshot:()=>structuredClone(S),
  backend:world3d.backend,
  motion:()=>({x:playerMotion.x,z:playerMotion.z,path:playerMotion.path.length,moving:playerMotion.moving}),
  viewMode:()=>S.player.viewMode,
  setViewMode:(mode)=>setViewMode(mode),
  move3D(key,seconds=.3){adventureKeys.add(key);updatePlayerMotion(seconds);adventureKeys.delete(key);return {x:playerMotion.x,z:playerMotion.z,viewMode:S.player.viewMode}},
  survival:()=>structuredClone(S.survival),
  consumeFood:()=>{consumeFood();return structuredClone(S.survival)},
  drinkWater:()=>{drinkWater();return structuredClone(S.survival)},
  setupSurvivalTest(){S=freshState();S.player={...S.player,x:72,y:52,layer:"surface",viewMode:"first",yaw:0,pitch:-.12};S.survival={health:100,hunger:50,thirst:50};S.inventory.doriMeat=2;S.inventory.water=3;S.runtime=createRuntimeState();ensureItemStacks(S);playerMotion={x:72,z:52,y:0,velocityY:0,grounded:true,yaw:0,pitch:-.12,path:[],moving:false,facing:0,onArrive:null};renderAll();return structuredClone(S)},
  survivalTick(seconds,deplete=false){if(deplete){S.survival.hunger=0;S.survival.thirst=0}updateSurvival(Math.max(0,Number(seconds)||0));return structuredClone(S.survival)},
  setupMiningTest(){
   S=freshState();S.player={...S.player,x:8,y:14,viewMode:"first",layer:"mine",mineLevel:1,yaw:0,pitch:.06};S.survival={health:100,hunger:100,thirst:100};
   const deposit=S.mineDeposits["1:8:12"];deposit.amount=12;S.activeTool="pickaxe";
   playerMotion={x:8,z:14,y:0,velocityY:0,grounded:true,yaw:0,pitch:.06,path:[],moving:false,facing:0,onArrive:null};
   selectedBuild=null;selectedBuilding=null;world3d.center(8,14);renderAll();return structuredClone(S)
  },
  mineTarget(){const before=itemCount("stone"),target=world3d.pickTarget(190);performAdventureAction();return {target,before,after:itemCount("stone"),node:S.mineDeposits["1:8:12"]?.amount}},
  selectTool:(tool)=>selectTool(tool),
  toolGuard(){this.setupMiningTest();selectTool("axe");const before=itemCount("stone");harvestMineDeposit(S.mineDeposits["1:8:12"]);return {before,after:itemCount("stone"),tool:S.activeTool}},
  constructionRules(){
   S=freshState();S.player={...S.player,viewMode:"map"};S.money=1000000;S.inventory={wood:200,stone:200,ironPlate:200,ironOre:100,coal:100,water:50};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.research.push("logistics");
   const standardWithoutFoundation=placeBuilding("belt",75,50);
   const adaptiveWithoutFoundation=placeBuilding("beltAdaptive",76,50);
   S.flattened["77,50"]={height:terrainHeightAt(77,50)};S.foundation["77,50"]=true;
   const standardWithFoundation=placeBuilding("belt",77,50);
   drawWorld();
   return {standardWithoutFoundation,adaptiveWithoutFoundation,standardWithFoundation,placed:S.buildings.map(b=>b.type),adaptiveBeltTilts:world3d.inspect().adaptiveBeltTilts}
  },
  setupPowerTopologyTest(){
   S=freshState();S.player={...S.player,viewMode:"map"};S.seconds=8*3600;S.money=1000000;S.runtime=createRuntimeState();ensureItemStacks(S);S.powerTopologyEnabled=true;S.powerTopologyLayers={surface:true,mine:{}};S.buildings=[
    {uid:"P-GEN",type:"solar",x:1,y:1,dir:1,status:"IDLE"},
    {uid:"P-CABLE-1",type:"powerCable",x:2,y:1,dir:1,status:"IDLE"},
    {uid:"P-CABLE-2",type:"powerCable",x:3,y:1,dir:1,status:"IDLE"},
    {uid:"P-SMELTER-1",type:"smelter",x:4,y:1,dir:1,condition:100,progress:0,input:{},inputMeta:{},status:"IDLE"},
    {uid:"P-BATTERY",type:"battery",x:2,y:2,dir:1,energyKJ:0,status:"IDLE"},
    {uid:"P-SMELTER-2",type:"smelter",x:10,y:10,dir:1,condition:100,progress:0,input:{},inputMeta:{},status:"IDLE"}
   ];
   const power=currentPower();return {power,near:power.allocations["P-SMELTER-1"],far:power.allocations["P-SMELTER-2"],batteryBefore:S.buildings.find(b=>b.uid==="P-BATTERY").energyKJ}
  },
  powerTopologyTick(){tick(STEP);const power=currentPower();return {power,near:power.allocations["P-SMELTER-1"],far:power.allocations["P-SMELTER-2"],battery:S.buildings.find(b=>b.uid==="P-BATTERY").energyKJ,farStatus:S.buildings.find(b=>b.uid==="P-SMELTER-2").status}},
  runRustedPurificationTest(){
   S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);S.buildings=[];S.research=[];
   addItemStack(S,"ITEM_DORONUM_RUSTED",1,{quality:58,purity:42,synthetic:false});
   addItemStack(S,"ITEM_CARBON_POWDER",2,{quality:95,purity:95,synthetic:false});
   const machine={uid:"RUSTED-PURIFIER-E2E",type:"variantLab",variant:"PURIFY_RUSTED_DORONUM",x:20,y:20,dir:1,condition:100,status:"IDLE",input:{},inputMeta:{},output:null,progress:0,temp:25,pressure:0,fluidAmountL:2,fluidType:"WATER"};
   S.buildings.push(machine);
   for(let i=0;i<1400&&!machine.output;i++)tickBuilding(machine,STEP,1);
   return {output:machine.output?structuredClone(machine.output):null,fluidAmountL:machine.fluidAmountL,fluidType:machine.fluidType,rustedRemaining:availableItemCount(S,"ITEM_DORONUM_RUSTED"),carbonRemaining:availableItemCount(S,"ITEM_CARBON_POWDER"),status:machine.status};
  },
  setupFluidRecipeConsumerTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.buildings=[];
   addItemStack(S,"ITEM_DORONUM_NORMAL",1,{quality:95,purity:95,synthetic:false});
   addItemStack(S,"ITEM_IRON_ORE",1,{quality:95,purity:95,synthetic:false});
   const generator={uid:"FLUID-RECIPE-GENERATOR",type:"coalgen",x:19,y:20,dir:1,fuelTimer:24,status:"RUNNING",condition:100};
   const machine={uid:"FLUID-RECIPE-CONSUMER",type:"variantLab",variant:"ITEM_DORONUM_SLIGHTLY_RUSTED",x:20,y:20,dir:1,condition:100,status:"IDLE",input:{},inputMeta:{},output:null,progress:0,temp:25,pressure:0,fluidAmountL:1,fluidType:"WATER"};
   S.buildings.push(generator,machine);tick(STEP);
   return {status:machine.status,fluidAmountL:machine.fluidAmountL,fluidType:machine.fluidType,progress:machine.progress,normalRemaining:availableItemCount(S,"ITEM_DORONUM_NORMAL"),ironOreRemaining:availableItemCount(S,"ITEM_IRON_ORE"),activeMeta:!!machine.activeMeta,tickStages:S.runtime.lastTickStages};
  },
  setupReservedInventoryTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   addItemStack(S,"ironOre",10,{quality:95,purity:96,synthetic:false});
   const reservation=reserveItemStacks(S,"ironOre",7,"INVENTORY-LOCK-TEST");
   syncLegacyInventory(S);renderInventory();
   return {reservation,total:S.inventory.ITEM_IRON_ORE,available:itemCount("ironOre"),reserved:S.inventory.ITEM_IRON_ORE-itemCount("ironOre")};
  },
  setupQuarantineInventoryTest(){
   S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);
   addItemStack(S,"ITEM_DORONUM_NORMAL",3,{quality:95,purity:96,synthetic:false});
   addItemStack(S,"doronium_void",5,{quality:82,purity:88,synthetic:false});
   const legacy=S.runtime.itemStacks.find(stack=>stack.itemID==="doronium_void");
   legacy.quarantined=true;legacy.quarantineReason="canonical-equivalence-not-defined";legacy.sourceItemID="doronium_void";
   syncLegacyInventory(S);renderInventory();
   return {tradable:structuredClone(S.inventory),quarantined:structuredClone(S.quarantinedInventory),quarantineMeta:structuredClone(S.quarantinedMeta)};
  },
  async runCloudConflictGuardTest(){
   const old={state:S,playerMotion,cloudClient,authSession,cloudSaveRevision,cloudSaveConflict,dirty,activeLocalKey,cloudBusy};
   let rpcCalls=0;S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   cloudClient={rpc:async()=>{rpcCalls++;return {data:[{saved:true,revision:99}],error:null}}};
   authSession={user:{id:"cloud-conflict-e2e"}};
   activeLocalKey=LOCAL_KEY+"_cloud-conflict-e2e";cloudSaveRevision=7;cloudBusy=false;
   cloudSaveConflict={expectedRevision:7,remoteRevision:8,remoteUpdatedAt:"2026-11-05T00:00:00Z",detectedAt:nowISO()};
   dirty=true;await saveGame(true);
   const result={rpcCalls,revision:cloudSaveRevision,conflictLocked:!!cloudSaveConflict,dirty,saveMessage:$("save-message").textContent};
   S=old.state;playerMotion=old.playerMotion;cloudClient=old.cloudClient;authSession=old.authSession;cloudSaveRevision=old.cloudSaveRevision;cloudSaveConflict=old.cloudSaveConflict;dirty=old.dirty;activeLocalKey=old.activeLocalKey;cloudBusy=old.cloudBusy;
   return result;
  },
  runTickStageCoverageTest(){
   const oldState=S,oldMotion=playerMotion;
   S=freshState();S.buildings=[];S.runtime=createRuntimeState();ensureItemStacks(S);S.paused=false;S.victory=false;
   tick(STEP);
   const stages=structuredClone(S.runtime.lastTickStages||[]),tickNumber=S.tick;
   S=oldState;playerMotion=oldMotion;
   return {stages,tickNumber,count:stages.length,missing:TICK_STAGE_ORDER.filter(stage=>!stages.includes(stage)),expected:TICK_STAGE_ORDER};
  },
  setupOwnershipLedgerTest(){
   S=freshState();S.inventory={};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.buildings=[];S.contractRuntime=createContractState(456);
   addItemStack(S,"ironOre",10,{quality:96,purity:97,synthetic:false});
   const reservation=reserveItemStacks(S,"ironOre",3,"OWNERSHIP-TEST-JOB");
   S.buildings=[
    {uid:"OWN-MACHINE",type:"smelter",input:{coal:2},inputMeta:{coal:{quality:90,purity:92,synthetic:false}},activeInputQuantities:[{itemID:"ITEM_IRON_ORE",quantity:1,quality:96,purity:97,synthetic:false}],output:{id:"ironPlate",qty:2,meta:{quality:95,purity:96,synthetic:false}}},
    {uid:"OWN-BELT",type:"belt",item:{id:"circuit",qty:4,meta:{quality:94,purity:95,synthetic:false}}}
   ];
   S.contractRuntime.shipments=[{shipmentID:"OWN-SHIP",status:"IN_TRANSIT",cargo:[{itemID:"wood",quantity:5,quality:90,purity:91,synthetic:false}]}];
   S.completionBuffer=[{completionID:"OWN-COMPLETE",itemID:"infinity",quantity:1}];
   const validation=rebuildOwnershipLedger(S);
   return {reservation,validation,ownership:structuredClone(S.ownershipLedger),itemTotals:validation.itemTotals};
  },
  setupFluidNetworkTest(){
   S=freshState();S.player={...S.player,viewMode:"map",layer:"surface"};S.seconds=8*3600;S.runtime=createRuntimeState();ensureItemStacks(S);S.powerTopologyEnabled=false;
   S.nodes["15,15"]={type:"water",amount:0,seed:123};
   S.buildings=[
    {uid:"F-GEN",type:"solar",x:10,y:10,dir:1,status:"IDLE"},
    {uid:"F-PUMP",type:"fluidPump",x:15,y:15,layer:"surface",fluidAmountL:0,fluidType:null,status:"IDLE"},
    {uid:"F-PIPE-1",type:"fluidPipe",x:16,y:15,layer:"surface",fluidAmountL:0,fluidType:null,status:"IDLE"},
    {uid:"F-VALVE",type:"fluidValve",x:17,y:15,layer:"surface",valveOpen:false,fluidAmountL:0,fluidType:null,status:"IDLE"},
    {uid:"F-PIPE-2",type:"fluidPipe",x:18,y:15,layer:"surface",fluidAmountL:0,fluidType:null,status:"IDLE"},
    {uid:"F-TANK",type:"fluidTank",x:19,y:15,layer:"surface",fluidAmountL:0,fluidType:null,status:"IDLE"}
   ];
   return {power:currentPower(),types:S.buildings.filter(b=>b.type.startsWith("fluid")).map(b=>b.type)};
  },
  runFluidDrainTest(){
   const pipe=S.buildings.find(b=>b.uid==="F-PIPE-1"),tank=S.buildings.find(b=>b.uid==="F-TANK");
   if(!pipe||!tank)return {ok:false,reason:"FLUID_TEST_NODES_MISSING"};
   pipe.fluidNetworkID=tank.fluidNetworkID="E2E-FLUID-DRAIN";pipe.fluidType=tank.fluidType="WATER";pipe.fluidAmountL=10;tank.fluidAmountL=5;
   const before=pipe.fluidAmountL+tank.fluidAmountL,drained=drainFluidToTank(pipe),after=pipe.fluidAmountL+tank.fluidAmountL;
   return {ok:drained&&pipe.fluidAmountL===0&&tank.fluidAmountL===15&&Math.abs(before-after)<1e-9,pipeLiters:pipe.fluidAmountL,tankLiters:tank.fluidAmountL,before,after};
  },
  runFluidNetworkTest(openValve=false,steps=12){
   const valve=S.buildings.find(b=>b.type==="fluidValve");if(valve)valve.valveOpen=!!openValve;
   for(let i=0;i<steps;i++)tick(STEP);
   const get=id=>S.buildings.find(b=>b.uid===id);
   return {tankLiters:get("F-TANK")?.fluidAmountL||0,pipeOneLiters:get("F-PIPE-1")?.fluidAmountL||0,pipeTwoLiters:get("F-PIPE-2")?.fluidAmountL||0,valveOpen:!!valve?.valveOpen,pumpPower:currentPower().allocations["F-PUMP"]?.status||"NO_POWER",massBalance:S.lastFluidBalance,networkIDs:S.buildings.filter(b=>b.type.startsWith("fluid")).map(b=>b.fluidNetworkID)};
  },
  runFusionDiagnosticsTest(powered=true){
   S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);S.fusionDiagnostics=null;
   S.buildings=powered?[
    {uid:"FD-GEN",type:"coalgen",x:1,y:1,dir:1,fuelTimer:24,status:"RUNNING",condition:100},
    {uid:"FD-COOL",type:"cooling",x:2,y:1,dir:1,status:"IDLE",condition:100},
    {uid:"FD-FUSION",type:"fusion",x:3,y:1,dir:1,status:"IDLE",condition:100,pressureSensorHealth:100,pressureSensorOffsetMPa:0,temp:25,pressure:0}
   ]:[{uid:"FD-COOL",type:"cooling",x:2,y:1,dir:1,status:"IDLE",condition:100},{uid:"FD-FUSION",type:"fusion",x:3,y:1,dir:1,status:"IDLE",condition:100,pressureSensorHealth:100,pressureSensorOffsetMPa:0,temp:25,pressure:0}];
   const passed=runFusionDiagnostics();
   return {passed,diagnostics:structuredClone(S.fusionDiagnostics),reservations:Object.keys(S.runtime.reservations||{}).length};
  },
  runFusionSettlementTest(){
   S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);
   for(const id of VARIANTS)addItemStack(S,id,100,{quality:95,purity:95,synthetic:false});
   syncLegacyInventory(S);
   const requirements=Object.fromEntries(VARIANTS.map(id=>[id,100]));
   const predicates=Object.fromEntries(VARIANTS.map(id=>[id,stack=>Number(stack.quality)>=90&&Number(stack.purity)>=90&&!stack.synthetic]));
   const reservationIDs=reserveQualifiedItemBatch(S,requirements,"LIVE-FUSION-E2E",predicates);
   if(!reservationIDs||reservationIDs.length!==15)return {ok:false,reason:"RESERVATION_FAILED"};
   S.fusionJob={jobID:"LIVE-FUSION-E2E",status:"RUNNING",stage:7,progress:0,reservationIDs,inputQuantity:1500,legacyConsumedInput:false,outputIssued:false};
   const first=settleInfinityFusionOutput(S,{jobID:S.fusionJob.jobID,outputItemID:"infinity",quality:100,purity:100});
   const second=settleInfinityFusionOutput(S,{jobID:S.fusionJob.jobID,outputItemID:"infinity",quality:100,purity:100});
   return {ok:first.ok&&second.ok&&second.duplicate&&S.fusionDone&&S.fusionJob.status==="COMPLETED",first,second,fusionDone:S.fusionDone,jobStatus:S.fusionJob.status,outputCount:availableItemCount(S,"infinity"),outputStackID:S.fusionJob.outputStackID,reservationsRemaining:Object.values(S.runtime.reservations).filter(x=>x.status==="reserved").length,inputsRemaining:VARIANTS.reduce((n,id)=>n+availableItemCount(S,id),0),settlement:Object.values(S.fusionSettlements||{})[0]||null,produced:S.stats.produced.infinity};
  },
  runFusionReservationCancelTest(){
   S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);
   for(const id of VARIANTS)addItemStack(S,id,100,{quality:95,purity:95,synthetic:false});
   syncLegacyInventory(S);
   const requirements=Object.fromEntries(VARIANTS.map(id=>[id,100]));
   const predicates=Object.fromEntries(VARIANTS.map(id=>[id,stack=>Number(stack.quality)>=90&&Number(stack.purity)>=90&&!stack.synthetic]));
   const reservationIDs=reserveQualifiedItemBatch(S,requirements,"E2E-FUSION-CANCEL",predicates);
   if(!reservationIDs||reservationIDs.length!==15)return {ok:false,reason:"RESERVATION_FAILED"};
   S.fusionJob={status:"RUNNING",stage:0,progress:4,reservationIDs,inputQuantity:1500,outputIssued:false};
   const locked=VARIANTS.every(id=>availableItemCount(S,id)===0);
   const cancelled=cancelFusion();
   const returned=VARIANTS.every(id=>availableItemCount(S,id)===100);
   const secondCancel=cancelFusion();
   return {ok:locked&&cancelled&&returned&&!secondCancel,reservationCount:reservationIDs.length,locked,returned,secondCancel,remainingReservations:Object.keys(S.runtime.reservations||{}).length,totalAvailable:VARIANTS.reduce((n,id)=>n+availableItemCount(S,id),0)};
  },
  setupMiningAutomationTest(){
   S=freshState();S.player={...S.player,layer:"mine",mineLevel:1,viewMode:"first",x:3,y:12};playerMotion={...playerMotion,x:3,z:12,y:0,velocityY:0,grounded:true,path:[]};S.money=1000000;S.inventory={coal:20,ironPlate:10,wood:50,stone:50,wire:10,ironOre:20};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.mineDeposits=makeMineDeposits();S.powerTopologyEnabled=false;S.research.push("mining");playerMotion={...playerMotion,x:3,z:12,y:0,velocityY:0,grounded:true,path:[],yaw:0,pitch:-.06};
   const generator=placeMineBuilding("mineGen",11,15),miner=placeMineBuilding("minerIron",12,15);
   return {generator,miner,buildings:S.buildings.map(b=>({uid:b.uid,type:b.type,layer:b.layer,mineLevel:b.mineLevel})),deposit:S.mineDeposits[mineDepositKey(1,12,15)]};
  },
  setupAdvancedMiningTest(){
   S=freshState();S.player={...S.player,layer:"mine",mineLevel:2,viewMode:"first",x:29,y:8};S.money=1000000;S.inventory={coal:20,ironPlate:20,wood:50,stone:50,wire:20,circuit:10};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);S.mineDeposits=makeMineDeposits();S.powerTopologyEnabled=false;S.research.push("mining");
   const deposit=Object.values(S.mineDeposits).find(d=>d.type==="ITEM_COLD_CRYSTAL_RAW");
   const generator=placeMineBuilding("mineGen",31,12),miner=placeMineBuilding("minerAdvanced",deposit.x,deposit.z);
   return {generator,miner,deposit:structuredClone(deposit),placed:S.buildings.map(b=>b.type)};
  },
  runAdvancedMiningTest(){
   for(let i=0;i<81;i++)tick(STEP);
   const miner=S.buildings.find(b=>b.type==="minerAdvanced"),deposit=S.mineDeposits[miner?.targetDepositKey];
   return {output:miner?.output?structuredClone(miner.output):null,depositAmount:deposit?.amount,drillDurability:miner?.drillDurability,power:currentPower().allocations?.[String(miner?.uid)]||null};
  },
  runRawMaterialProductionTest(){
   const cases=[
    {type:"goldSmelter",inputs:{goldOre:2,coal:1},output:"ITEM_GOLD_INGOT"},
    {type:"chromeSmelter",inputs:{chromiteOre:2,coal:2},output:"ITEM_CHROME_INGOT"},
    {type:"steelForge",inputs:{ironOre:3,coal:2},output:"ITEM_STEEL_PLATE"},
    {type:"titaniumPress",inputs:{titaniumOre:2,coal:1},output:"ITEM_TITANIUM_PLATE"},
    {type:"carbonMill",inputs:{coal:3},output:"ITEM_CARBON_POWDER"}
   ];
   const results=[];
   for(const entry of cases){
    S=freshState();S.runtime=createRuntimeState();ensureItemStacks(S);S.buildings=[];
    for(const[id,qty]of Object.entries(entry.inputs))addItemStack(S,id,qty,{quality:95,purity:95,synthetic:false});
    const b={uid:"RAW-"+entry.type,type:entry.type,x:10,y:10,dir:1,condition:100,status:"IDLE",input:{},inputMeta:{},output:null,progress:0,temp:25,pressure:0};
    S.buildings.push(b);
    for(let i=0;i<900&&!b.output;i++)tickBuilding(b,STEP,1);
    results.push({type:entry.type,expected:entry.output,actual:b.output?.id||null,quantity:b.output?.qty||0});
   }
   return results;
  },
  runMiningAutomationTest(){
   for(let i=0;i<81;i++)tick(STEP);
   const miner=S.buildings.find(b=>b.type==="minerIron"),deposit=S.mineDeposits[mineDepositKey(1,12,15)];
   return {output:miner?.output?structuredClone(miner.output):null,depositAmount:deposit?.amount,drillDurability:miner?.drillDurability,power:currentPower().allocations?.[String(miner?.uid)]||null,generatorFuel:S.buildings.find(b=>b.type==="mineGen")?.fuelTimer||0};
  },
  runDrillRepairTest(){
   const miner=S.buildings.find(b=>b.type==="minerIron");if(!miner)return {ok:false,reason:"MINER_MISSING"};
   if(miner.output)collectOutput(miner);
   miner.drillDurability=0;tick(STEP);
   const started=!!miner.failureRepair&&repairMachine(miner);
   if(!started)return {ok:false,reason:"REPAIR_START_FAILED"};
   for(let i=0;i<310&&miner.failureRepair;i++)tick(STEP);
   return {ok:miner.status==="IDLE"&&miner.drillDurability===1000,status:miner.status,drillDurability:miner.drillDurability,ironPlate:itemCount("ironPlate")};
  },
  setupBlueprintTest(){
   S=freshState();S.player={...S.player,viewMode:"map",layer:"surface"};S.money=1000000;S.inventory={wood:200};S.meta={};S.runtime=createRuntimeState();ensureItemStacks(S);
   S.buildings=[{uid:"bp-seed-a",type:"belt",x:10,y:10,dir:1,footprint:{width:1,height:1},condition:100,status:"IDLE"},{uid:"bp-seed-b",type:"belt",x:11,y:10,dir:1,footprint:{width:1,height:1},condition:100,status:"IDLE"}];
   for(const key of ["20,20","20,21"]){S.nodes[key]=undefined;S.flattened[key]={height:0};S.foundation[key]=true}
   delete S.nodes["20,20"];delete S.nodes["20,21"];S.blueprints=[];activeBlueprintID=null;activeBlueprintRotation=0;selectedBuild=null;selectedBuilding=null;markSceneDirty();renderAll();return structuredClone(S)
  },
  blueprintPlaceAt(x,y){const ok=placeBlueprintAt(Number(x),Number(y));return {ok,blueprints:structuredClone(S.blueprints),buildings:structuredClone(S.buildings),money:S.money,inventory:structuredClone(S.inventory)}},
  blueprintState:()=>({blueprints:structuredClone(S.blueprints||[]),activeBlueprintID,activeBlueprintRotation}),
  move:(dx,dy)=>movePlayer(dx,dy),
  audit:()=>({
   dataValidation:DATA_VALIDATION,canonicalDoronumValidation:CANONICAL_DORONUM_VALIDATION,canonicalDoronumIntegration:CANONICAL_DORONUM_INTEGRATION,runtimeValidation:validateRuntimeState(S),ownershipValidation:rebuildOwnershipLedger(S),skillTreeValidation:validateSkillTree(),skillStateValidation:validateSkillState(S.skills),skillNodeCount:SKILL_NODES.length,skillGroupCount:SKILL_GROUPS.length,resourceCount:Object.keys(RESOURCE).length,
   variantCount:VARIANTS.length,
   uniqueVariants:new Set(VARIANTS).size,
   uniqueCrystalModels:DORONIUM_CRYSTAL_MODELS.filter(id=>id!=="infinity").length,
   uniqueCrystalShapes:new Set(VARIANTS.map(id=>DORONIUM_CRYSTAL_MODEL_SHAPES[id])).size,
   allCrystalModels:VARIANTS.every(id=>DORONIUM_CRYSTAL_MODELS.includes(id)&&!!DORONIUM_CRYSTAL_MODEL_SHAPES[id]),
   canonicalCrystalModelCount:CANONICAL_DORONUM_CRYSTAL_MODELS.length,canonicalCrystalModelShapes:new Set(CANONICAL_DORONUM_CRYSTAL_MODELS.map(id=>DORONIUM_CRYSTAL_MODEL_SHAPES[id])).size,allCanonicalCrystalModels:CANONICAL_DORONUM_CRYSTAL_MODELS.every(id=>!!DORONIUM_CRYSTAL_MODEL_SHAPES[id]),
   researchCount:RESEARCH.length,
   buildingCount:BUILDINGS.length,buildingIDs:BUILDINGS.map(b=>b.id),worldWidth:WORLD_W,worldHeight:WORLD_H,outerResourceCount:Object.entries(S.nodes).filter(([key,n])=>{const [x,z]=key.split(",").map(Number);return (x>=128||z>=96)&&["wood","dori","water"].includes(n.type)}).length,mineLevels:MINE_LEVELS,biomeCount:new Set(Array.from({length:WORLD_H},(_,z)=>Array.from({length:WORLD_W},(_,x)=>biomeAt(x,z))).flat()).size,terrainHeightRange:[Math.min(...Array.from({length:WORLD_H},(_,z)=>Math.min(...Array.from({length:WORLD_W},(_,x)=>terrainHeightAt(x,z))))),Math.max(...Array.from({length:WORLD_H},(_,z)=>Math.max(...Array.from({length:WORLD_W},(_,x)=>terrainHeightAt(x,z)))))],surfaceHasExposedOre:Object.values(S.nodes).some(n=>["stone","ironOre","copperOre","coal","quartz","goldOre","diamond"].includes(n.type)),
   simulationStep:STEP,
   variantRecipeCount:Object.keys(VARIANT_RECIPES).length,
   variantRecipesValid:VARIANTS.filter(id=>id!=="ITEM_DORONUM_NORMAL"&&!CAMPAIGN_ONLY_DORONUM_IDS.includes(id)).every(id=>!!VARIANT_RECIPES[id]&&Object.keys(VARIANT_RECIPES[id].inputs).every(k=>!!RESOURCE[k])),
   fusionStageCount:FUSION_STAGES.length,
   fusionIdealDuration:FUSION_STAGES.reduce((n,x)=>n+x.time,0),
   researchGraphValid:(()=>{const ids=new Set(RESEARCH.map(r=>r.id));if(!RESEARCH.every(r=>(r.requires||[]).every(id=>ids.has(id))))return false;const visiting=new Set(),done=new Set();function visit(id){if(visiting.has(id))return false;if(done.has(id))return true;visiting.add(id);const r=RESEARCH.find(v=>v.id===id);for(const dep of r?.requires||[])if(!visit(dep))return false;visiting.delete(id);done.add(id);return true}return RESEARCH.every(r=>visit(r.id))})(),
   allVariantModels:VARIANTS.every(id=>!!RESOURCE[id]),
   recipeInputsValid:Object.values(RECIPES).every(r=>Object.keys(r.inputs).every(id=>!!RESOURCE[id])),
   buildingMaterialsValid:BUILDINGS.every(b=>Object.keys(b.materials||{}).every(id=>!!RESOURCE[id]))
  }),
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
  syntheticGuard(){
   S=freshState();S.inventory={doriMeat:10};S.meta={doriMeat:{quality:90,purity:90,synthetic:true}};S.runtime=createRuntimeState();ensureItemStacks(S);
   const b={uid:"test-reactor",type:"reactor",x:1,y:1,dir:1,progress:0,input:{},inputMeta:{},output:null,activeMeta:null,temp:25,pressure:0,status:"IDLE"};
   S.buildings=[b];S.paused=false;tickMachine(b,STEP,1);
   return {status:b.status,remaining:itemCount("doriMeat"),activeMeta:!!b.activeMeta}
  }
 };
}
