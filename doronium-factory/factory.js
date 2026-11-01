import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

/* DORONIUM FACTORY — INFINITE INDUSTRY
   Standalone Canvas game, deterministic map seed, fixed-step simulation,
   persistent browser save + authenticated per-user Supabase cloud save.
*/
const SUPABASE_URL = "https://scttowfhygcpdirrekqm.supabase.co";
const SUPABASE_KEY = "sb_publishable_-ZvJjR5oRhWxGge0l-l86g_Nv0ttZLF";
const CLOUD_KEY = "doronium_factory_infinite_industry_v1";
const LOCAL_KEY = "doronium_factory_infinite_industry_local_v1";
const WORLD_W = 36, WORLD_H = 28, TILE = 46, STEP = 1;
const $ = (id) => document.getElementById(id);
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const fmt = (n)=>Math.floor(Number(n)||0).toLocaleString("ko-KR");
const short = (n)=>{n=Number(n)||0;return n>=1e9?(n/1e9).toFixed(1)+"B":n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":fmt(n)};
const nowISO=()=>new Date().toISOString();
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
{id:"belt",name:"컨베이어 벨트",icon:"➜",cat:"logistics",cost:12,materials:{wood:1},desc:"아이템을 인접한 시설로 운송합니다. R 키로 방향을 바꾸세요.",unlock:null,kind:"belt",power:0},
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
{id:"lab",name:"기술 연구소",icon:"🔬",cat:"advanced",cost:360,materials:{ironPlate:4,wire:3},desc:"산업 회로와 자금을 사용해 신기술을 연구합니다.",unlock:"mechanical",kind:"lab",power:4},
{id:"market",name:"산업 거래소",icon:"⚖️",cat:"logistics",cost:180,materials:{wood:8,ironPlate:2},desc:"인접한 벨트의 생산품을 자동 판매합니다. 일반 거래소 가격의 80%를 지급합니다.",unlock:null,kind:"market",power:0},
{id:"reactor",name:"도로늄 압력 반응로",icon:"🔷",cat:"advanced",cost:1450,materials:{ironPlate:12,circuit:8,wire:6},desc:"비합성 돌이 고기 10개를 고온·고압 공명 공정으로 합성해 일반 도로늄 1개를 만듭니다.",unlock:"doronium",kind:"reactor",power:14,recipe:"doronium"},
{id:"variantLab",name:"결정 변환 연구로",icon:"💎",cat:"advanced",cost:2600,materials:{ironPlate:20,circuit:12,quartz:8},desc:"일반 도로늄을 14가지 특수 결정 계열로 변환합니다. 설비를 선택해 제조 레시피를 설정하세요.",unlock:"variant",kind:"variant",power:18},
{id:"cooling",name:"초전도 냉각탑",icon:"❄️",cat:"power",cost:950,materials:{ironPlate:10,circuit:4},desc:"고압 설비와 퓨전 반응로의 열을 안정화합니다.",unlock:"pressure",kind:"cooling",power:5},
{id:"fusion",name:"인피니티 퓨전 설비",icon:"🌌",cat:"advanced",cost:12000,materials:{ironPlate:100,circuit:50,quartz:30},desc:"15종의 정식 도로늄을 각 100개씩 투입해 7단계 퓨전을 수행합니다.",unlock:"fusion",kind:"fusion",power:40},
{id:"relay",name:"행성 안정화 릴레이",icon:"📡",cat:"advanced",cost:1500,materials:{ironPlate:25,circuit:15,dor oni um:0},desc:"행성 에너지 노드에 설치하는 안정화 장치입니다.",unlock:"relay",kind:"relay",power:3},
{id:"core",name:"중앙 안정화 코어",icon:"💠",cat:"advanced",cost:4800,materials:{ironPlate:45,circuit:30,doronium_special:5},desc:"인피니티 도로늄을 장착해 행성의 에너지 네트워크를 동기화합니다.",unlock:"infinity",kind:"core",power:12}
];
// Correct the relay's materials without relying on malformed external data.
BUILDINGS.find(b=>b.id==="relay").materials={ironPlate:25,circuit:15,doronium_normal:10};
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
doronium_void:{name:"공허 압축",inputs:{doronium_normal:10,dor oni um:0},time:75}
};
VARIANT_RECIPES.doronium_void.inputs={doronium_normal:10,doronium_black:2,circuit:10,coal:15};
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
{id:"resonance",name:"공명 주파수 제어",icon:"〽️",tier:3,cost:3200,need:{dor onium_normal:0},time:160,desc:"공명 반응의 안정성을 높입니다.",requires:["doronium"]},
{id:"variant",name:"결정 변환 기술",icon:"💎",tier:4,cost:4800,need:{doronium_normal:3,circuit:10},time:180,desc:"특수 도로늄 변환 연구로를 해금합니다.",requires:["resonance"]},
{id:"purity",name:"초고순도 정제",icon:"✨",tier:4,cost:6200,need:{dor onium_blue:0},time:190,desc:"고순도 도로늄 생산 보정 연구.",requires:["variant"]},
{id:"automation",name:"완전 자동화 프로토콜",icon:"🤖",tier:4,cost:7600,need:{circuit:20,ironPlate:25},time:200,desc:"자동 공급 및 기계 효율 +15%.",requires:["variant"]},
{id:"fusion",name:"인피니티 퓨전 이론",icon:"🌌",tier:5,cost:12000,need:{doronium_special:5,circuit:30},time:240,desc:"인피니티 퓨전 설비의 설계도를 해금합니다.",requires:["purity","automation"]},
{id:"relay",name:"행성 릴레이 공학",icon:"📡",tier:5,cost:16000,need:{doronium_resonant:5,circuit:35},time:260,desc:"행성 안정화 릴레이를 해금합니다.",requires:["fusion"]},
{id:"infinity",name:"무한 결정 구조",icon:"♾️",tier:6,cost:25000,need:{doronium_prismatic:10,dor oni um:0},time:300,desc:"중앙 안정화 코어와 최종 프로토콜을 해금합니다.",requires:["relay"]},
{id:"planet",name:"행성 안정화 프로토콜",icon:"🌍",tier:7,cost:40000,need:{infinity:1},time:360,desc:"행성 에너지 네트워크 최종 동기화.",requires:["infinity"]}
];
// Fix canonical ingredient keys for a few research entries.
RESEARCH.find(r=>r.id==="resonance").need={doronium_normal:2,circuit:8};
RESEARCH.find(r=>r.id==="purity").need={doronium_blue:2,circuit:12};
RESEARCH.find(r=>r.id==="infinity").need={doronium_prismatic:10,dor onium_resonant:0};
RESEARCH.find(r=>r.id==="infinity").need={doronium_prismatic:10,doronium_resonant:3};
const FUSION_STAGES=[
{name:"물질·공명 분석",temp:500,pressure:100,power:5,time:20},
{name:"에너지 분리",temp:1200,pressure:500,power:10,time:25},
{name:"분자 평형",temp:1800,pressure:1000,power:15,time:30},
{name:"초고압 압축",temp:2500,pressure:5000,power:22,powerUnused:0,time:35},
{name:"결정 융합",temp:3500,pressure:10000,power:28,time:40},
{name:"결정 핵 형성",temp:4500,pressure:15000,power:34,time:50},
{name:"인피니티 결정화",temp:5000,pressure:20000,power:40,time:60}
];
const QUESTS=[
{id:"q1",chapter:0,title:"폐허의 첫걸음",desc:"주변의 숲과 암석 지대에서 목재 10개와 석재 10개를 확보하세요.",reward:250,check:s=>s.stats.gathered.wood>=10&&s.stats.gathered.stone>=10,progress:s=>Math.min(10,s.stats.gathered.wood)+Math.min(10,s.stats.gathered.stone),max:20,orbit:"“기초 자원 확보 확인. 이곳은 아직 충분히 복구할 수 있습니다.”"},
{id:"q2",chapter:0,title:"첫 번째 전력망",desc:"태양광 발전기와 철광석 채굴기를 건설하세요.",reward:400,check:s=>hasBuilding(s,"solar")&&hasBuilding(s,"minerIron"),progress:s=>(hasBuilding(s,"solar")?1:0)+(hasBuilding(s,"minerIron")?1:0),max:2,orbit:"“전력 계통이 연결되었습니다. 산업 설비를 가동할 수 있습니다.”"},
{id:"q3",chapter:0,title:"자동화의 시작",desc:"컨베이어와 제련로를 설치하고 철판 5개를 생산하세요.",reward:650,check:s=>hasBuilding(s,"belt")&&hasBuilding(s,"smelter")&&(s.stats.produced.ironPlate||0)>=5,progress:s=>Math.min(1,s.stats.built.belt||0)+Math.min(1,s.stats.built.smelter||0)+Math.min(5,s.stats.produced.ironPlate||0),max:7,orbit:"“생산 라인에서 첫 번째 완제품이 확인되었습니다.”"},
{id:"q4",chapter:1,title:"생체 에너지의 흔적",desc:"돌이 나무 재배기를 설치하고 돌이 고기 10개를 수확하세요.",reward:900,check:s=>hasBuilding(s,"doriFarm")&&(s.stats.produced.doriMeat||0)>=10,progress:s=>Math.min(1,s.stats.built.doriFarm||0)+Math.min(10,s.stats.produced.doriMeat||0),max:11,orbit:"“분석 결과, 이 식물의 열매는 특이한 분자 에너지 구조를 가지고 있습니다.”"},
{id:"q5",chapter:2,title:"푸른 물질의 정체",desc:"도로늄 공명 이론을 연구하고 일반 도로늄을 처음 합성하세요.",reward:1600,check:s=>s.research.includes("doronium")&&(s.stats.produced.doronium_normal||0)>=1,progress:s=>(s.research.includes("doronium")?1:0)+Math.min(1,s.stats.produced.doronium_normal||0),max:2,orbit:"“Unknown material detected. Designation: DORONUM.”"},
{id:"q6",chapter:2,title:"결정의 다변화",desc:"결정 변환 연구로를 건설하고 특수 도로늄 3종을 제조하세요.",reward:2600,check:s=>hasBuilding(s,"variantLab")&&VARIANTS.filter(id=>id!=="doronium_normal"&&(s.stats.produced[id]||0)>0).length>=3,progress:s=>Math.min(3,VARIANTS.filter(id=>id!=="doronium_normal"&&(s.stats.produced[id]||0)>0).length)+(hasBuilding(s,"variantLab")?1:0),max:4,orbit:"“15개의 결정 공명 계열이 확인되었습니다. 최초 공장의 기록과 일치합니다.”"},
{id:"q7",chapter:3,title:"인피니티 프로젝트",desc:"인피니티 퓨전 이론을 연구하고 퓨전 설비를 건설하세요.",reward:6000,check:s=>s.research.includes("fusion")&&hasBuilding(s,"fusion"),progress:s=>(s.research.includes("fusion")?1:0)+(hasBuilding(s,"fusion")?1:0),max:2,orbit:"“INFINITE PROJECT identified. 행성 에너지 네트워크 자료를 복구했습니다.”"},
{id:"q8",chapter:3,title:"완벽한 재료",desc:"정식 도로늄 15종을 각각 100개씩 확보하세요. 모든 재료는 품질·순도 90 이상이어야 합니다.",reward:12000,check:s=>VARIANTS.every(id=>(s.inventory[id]||0)>=100&&quality(s,id)>=90&&purity(s,id)>=90&&!synthetic(s,id)),progress:s=>VARIANTS.filter(id=>(s.inventory[id]||0)>=100&&quality(s,id)>=90&&purity(s,id)>=90&&!synthetic(s,id)).length,max:15,orbit:"“모든 입력 결정의 순도와 품질이 기준을 통과했습니다. 퓨전을 시작할 수 있습니다.”"},
{id:"q9",chapter:4,title:"인피니티 결정화",desc:"7단계 퓨전을 완료해 인피니티 도로늄을 제작하세요.",reward:25000,check:s=>(s.inventory.infinity||0)>=1||s.fusionDone,progress:s=>s.fusionDone?1:0,max:1,orbit:"“Infinity Doronum secured. 이제 행성 안정화 장치를 구축해야 합니다.”"},
{id:"q10",chapter:4,title:"행성의 심장",desc:"3개의 릴레이와 중앙 코어를 설치하고 행성 안정화 프로토콜을 실행하세요.",reward:100000,check:s=>s.victory===true,progress:s=>(s.relaySites||[]).filter(Boolean).length+(s.coreInstalled?1:0),max:4,orbit:"“Energy network synchronization complete. Planetary instability: decreasing. Factory status: OPERATIONAL.”"}
];
function hasBuilding(s,id){return s.buildings.some(b=>b.type===id)}
function quality(s,id){return s.meta?.[id]?.quality??(s.inventory?.[id]>0?90:0)}
function purity(s,id){return s.meta?.[id]?.purity??(s.inventory?.[id]>0?90:0)}
function synthetic(s,id){return s.meta?.[id]?.synthetic??false}
function seedRand(seed){let x=seed>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function makeWorld(){const rng=seedRand(827142);const nodes={};const put=(x,y,type,amount=80)=>{nodes[x+","+y]={type,amount,max:amount,cooldown:0,seed:Math.floor(rng()*1e9)}};
 for(let x=3;x<=7;x++)for(let y=5;y<=10;y++)if(rng()>.2)put(x,y,"water",500);
 for(let x=8;x<=14;x++)for(let y=5;y<=11;y++)if(rng()>.25)put(x,y,"wood",90);
 for(let x=27;x<=31;x++)for(let y=4;y<=9;y++)if(rng()>.15)put(x,y,"dori",999999);
 for(let x=23;x<=29;x++)for(let y=13;y<=17;y++)if(rng()>.34)put(x,y,"ironOre",120);
 for(let x=4;x<=9;x++)for(let y=18;y<=23;y++)if(rng()>.32)put(x,y,"copperOre",110);
 for(let x=21;x<=26;x++)for(let y=21;y<=25;y++)if(rng()>.3)put(x,y,"coal",130);
 for(let x=15;x<=18;x++)for(let y=3;y<=6;y++)if(rng()>.4)put(x,y,"quartz",60);
 for(let x=32;x<=34;x++)for(let y=13;y<=17;y++)if(rng()>.4)put(x,y,"goldOre",35);
 put(17,2,"diamond",8);
 const sites={relay:[{x:2,y:25},{x:33,y:3},{x:33,y:25}],core:{x:18,y:14}};
 for(const p of sites.relay)nodes[p.x+","+p.y]={type:"relaySite",amount:1,max:1,cooldown:0,seed:0};
 nodes[sites.core.x+","+sites.core.y]={type:"coreSite",amount:1,max:1,cooldown:0,seed:0};
 return {nodes,sites};
}
function freshState(){
 const world=makeWorld();
 return {version:1,seed:827142,player:{x:18,y:14},money:1100,inventory:{wood:85,stone:55,ironOre:24,copperOre:18,coal:24,water:32,quartz:2},meta:{},buildings:[],nodes:world.nodes,sites:world.sites,seen:{},research:[],activeResearch:null,researchProgress:0,questIndex:0,day:1,seconds:8*3600,tick:0,simSpeed:1,paused:false,logs:[],stats:{gathered:{},built:{},produced:{},sold:0,energyProduced:0},fusionJob:null,fusionDone:false,relaySites:[false,false,false],coreInstalled:false,victory:false,settings:{sound:true,reducedMotion:false},lastSavedAt:null};
}
let S=freshState(), dirty=false, selectedBuild=null, selectedBuilding=null, activeCategory="all", activePanel="build", camera={x:18,y:14,zoom:1}, hoverCell=null, canvasRect=null, dpr=1, cloudClient=null, authSession=null, cloudUpdatedAt=null, cloudBusy=false, saveTimer=null, pollTimer=null, lastFrame=0, accumulator=0, drawTime=0, soundCtx=null;
const canvas=$("world-canvas"),ctx=canvas.getContext("2d");
const toast=(message,type="")=>{const el=document.createElement("div");el.className="toast "+type;el.textContent=message;$("toast-stack").append(el);setTimeout(()=>el.remove(),2800)};
function log(message,type="info"){S.logs.unshift({message,type,time:S.seconds});S.logs=S.logs.slice(0,18);renderEvents();dirty=true}
function markDirty(){dirty=true;$("save-message").textContent="변경 사항 저장 대기"}
function playTone(freq=520,duration=.08,kind="sine"){if(!S.settings.sound)return;try{soundCtx??=new AudioContext();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=kind;osc.frequency.value=freq;gain.gain.setValueAtTime(.035,soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration)}catch{}}
function setCloud(state,label){const el=$("cloud-state");el.className="cloud-state "+state;el.querySelector("span").textContent=label}
function itemCount(id){return Math.max(0,Number(S.inventory[id]||0))}
function addItem(id,qty,meta={}){if(!RESOURCE[id]||qty<=0)return;const old=itemCount(id),oldMeta=S.meta[id]||{quality:90,purity:90,synthetic:false};const total=old+qty;S.inventory[id]=total;S.meta[id]={quality:total?(old*oldMeta.quality+qty*(meta.quality??90))/total:90,purity:total?(old*oldMeta.purity+qty*(meta.purity??90))/total:90,synthetic:old?oldMeta.synthetic||!!meta.synthetic:!!meta.synthetic};S.stats.produced[id]=(S.stats.produced[id]||0)+qty;markDirty()}
function takeItem(id,qty){if(itemCount(id)<qty)return false;S.inventory[id]-=qty;if(S.inventory[id]<=0){delete S.inventory[id];delete S.meta[id]}markDirty();return true}
function hasItems(items){return Object.entries(items||{}).every(([id,n])=>itemCount(id)>=n)}
function takeItems(items){if(!hasItems(items))return false;for(const[id,n]of Object.entries(items||{}))takeItem(id,n);return true}
function canAfford(b){return S.money>=b.cost&&hasItems(b.materials)}
function unlockOk(b){return !b.unlock||S.research.includes(b.unlock)}
function buildingDef(id){return BUILDINGS.find(b=>b.id===id)}
function buildingAt(x,y){return S.buildings.find(b=>b.x===x&&b.y===y)}
function tileNode(x,y){return S.nodes[x+","+y]||null}
function currentPower(){const daylight=((S.seconds%86400)/86400);const sun=daylight>.25&&daylight<.78?1:.22;const weather=weatherNow();let gen=0,used=0;for(const b of S.buildings){const def=buildingDef(b.type);if(!def)continue;if(b.type==="solar")gen+=def.gen*sun*(weather==="Storm"?.45:weather==="Rain"?.72:1);else if(b.type==="wind")gen+=def.gen*(weather==="Storm"?1.4:weather==="Clear"?.9:1.05);else if(b.type==="coalgen")gen+=b.fuelTimer>0?18:0;else used+=def.power||0}return {gen,used,ratio:used===0?1:Math.min(1,gen/used),raw:gen-used}}
function weatherNow(){const day=Math.floor(S.seconds/86400);return ["Clear","Clear","Rain","Clear","Storm","Clear","Snow"][day%7]}
function revealAround(){for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){if(x*x+y*y>58)continue;const xx=S.player.x+x,yy=S.player.y+y;if(xx>=0&&yy>=0&&xx<WORLD_W&&yy<WORLD_H)S.seen[xx+","+yy]=true}}
function getQuest(){return QUESTS[Math.min(S.questIndex,QUESTS.length-1)]}
function questCheck(){const q=getQuest();if(!q||S.victory)return;const ok=q.check(S);if(ok){S.money+=q.reward;S.questIndex=Math.min(QUESTS.length,S.questIndex+1);S.chapter=Math.max(S.chapter||0,q.chapter);log("임무 완료: "+q.title,"good");toast("임무 완료 · "+q.title+"  +"+fmt(q.reward)+" D");$("orbit-dialogue").textContent=q.orbit;playTone(720,.18,"triangle");markDirty();renderMissions();renderHud()}}
function changePanel(name){activePanel=name;document.querySelectorAll(".main-tab").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));document.querySelectorAll(".panel-view").forEach(p=>p.classList.toggle("active",p.id==="panel-"+name));if(name==="inventory")renderInventory();if(name==="research")renderResearch();if(name==="mission")renderMissions();if(name==="factory")renderFactory()}
function renderHud(){const p=currentPower();$("hud-money").textContent=short(S.money)+" D";$("hud-doronium").textContent=short(VARIANTS.reduce((a,id)=>a+itemCount(id),0));$("hud-power").textContent=(p.used?Math.round(p.ratio*100):Math.round(p.gen))+"%";$("hud-tier").textContent="TIER "+Math.min(7,Math.floor(S.research.length/2));$("build-count").textContent=S.buildings.length+" / 40";$("active-machines").textContent="가동 기계 "+S.buildings.filter(b=>b.status==="RUNNING").length;$("world-population").textContent="엔지니어 1";$("system-state").textContent=p.used>p.gen?"전력 부족":S.victory?"행성 안정화 완료":"시스템 정상";$("sim-speed").textContent="시뮬레이션 "+S.simSpeed+"×";$("pause-sim").textContent=S.paused?"▶ 재개":"Ⅱ 일시정지";$("speed-sim").textContent="속도 "+S.simSpeed+"×";const day=Math.floor(S.seconds/86400)+1,sec=S.seconds%86400,h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);$("world-clock-text").textContent="DAY "+String(day).padStart(2,"0")+" · "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");$("day-icon").textContent=h>=6&&h<18?"☀":"☾";$("weather-label").textContent=({Clear:"맑음",Rain:"비",Storm:"폭풍",Snow:"눈",Heat:"폭염"})[weatherNow()]||"맑음";$("world-coordinate").textContent="SECTOR 01 / X: "+(S.player.x*32-1024)+"m · Z: "+(S.player.y*32-1024)+"m";$("region-title").innerHTML="FACTORY VALLEY <span>초기 산업 구역</span>";}
function renderBuildList(){const list=BUILDINGS.filter(b=>activeCategory==="all"||b.cat===activeCategory);$("build-list").innerHTML=list.map(b=>{const locked=!unlockOk(b),afford=canAfford(b);const material=Object.entries(b.materials||{}).map(([id,n])=>RESOURCE[id].icon+fmt(n)).join(" ");return '<button class="build-card '+(selectedBuild===b.id?"selected ":"")+(locked?"locked":"")+'" data-build="'+b.id+'"><div class="build-top"><span class="build-icon">'+b.icon+'</span><div style="min-width:0"><div class="build-name">'+b.name+'</div><div class="build-kind">'+({resource:"자원 생산",power:"전력 시설",process:"가공 설비",logistics:"물류 시설",advanced:"첨단 산업"})[b.cat]+'</div></div></div><div class="build-cost"><b>'+fmt(b.cost)+' D</b><em>'+material+'</em></div>'+(locked?'<span class="build-lock-label">🔒 연구 필요</span>':"")+'</button>'}).join("");renderBuildInspector()}
function renderBuildInspector(){const b=buildingDef(selectedBuild);const el=$("build-inspector");$("build-mode-dot").classList.toggle("build",!!b);$("build-mode-text").textContent=b?"건설 모드 · "+b.name+" / 설치할 타일을 클릭":"선택 모드 · 시설을 선택하거나 자원을 채집하세요";if(!b){el.innerHTML='<div class="inspector-empty"><span>⌖</span><strong>건설 설비를 선택하세요</strong><p>시설을 선택하면 비용과 기능을 확인할 수 있습니다.</p></div>';return}const cost='<span>'+fmt(b.cost)+' D</span>'+Object.entries(b.materials||{}).map(([id,n])=>'<span>'+RESOURCE[id].icon+" "+fmt(n)+" "+RESOURCE[id].name+"</span>").join("");el.innerHTML='<div class="inspector-title"><span class="build-icon">'+b.icon+'</span><div><strong>'+b.name+'</strong><small>'+b.desc+'</small></div></div><p class="inspector-desc">'+b.desc+'</p><div class="cost-line">'+cost+'</div><div class="inspector-actions"><button class="action-button" id="place-mode" '+(!canAfford(b)||!unlockOk(b)?"disabled":"")+'>설치할 위치 선택</button><button class="action-button secondary" id="cancel-build">취소</button></div>';$("place-mode").onclick=()=>{if(!canAfford(b)||!unlockOk(b)){toast("연구 또는 자원이 부족합니다.","warn");return}selectedBuild=b.id;renderBuildList();toast("월드에서 설치할 위치를 클릭하세요.")};$("cancel-build").onclick=()=>{selectedBuild=null;renderBuildList();drawWorld()}}
function renderInventory(){const items=Object.entries(S.inventory).filter(([id,n])=>n>0).sort((a,b)=>(RESOURCE[a[0]]?.kind||"").localeCompare(RESOURCE[b[0]]?.kind||""));const kinds=items.length;$("inventory-slots").textContent=kinds+" 종류";$("inventory-summary").innerHTML='<div><small>아이템 종류</small><strong>'+kinds+'</strong></div><div><small>총 보유 수량</small><strong>'+short(items.reduce((a,[,n])=>a+n,0))+'</strong></div><div><small>특수 결정</small><strong>'+short(VARIANTS.reduce((a,id)=>a+itemCount(id),0))+'</strong></div>';$("inventory-grid").innerHTML=items.map(([id,n])=>'<div class="inventory-item"><span class="res-icon">'+RESOURCE[id].icon+'</span><div><strong>'+RESOURCE[id].name+'</strong><small>Q '+Math.round(quality(S,id))+' · P '+Math.round(purity(S,id))+(synthetic(S,id)?" · 합성":" · 비합성")+'</small></div><b>'+fmt(n)+'</b></div>').join("")||'<div class="inspector-empty">창고가 비어 있습니다.</div>';const sel=$("sell-resource");const old=sel.value;sel.innerHTML=items.filter(([id])=>id!=="infinity").map(([id,n])=>'<option value="'+id+'">'+RESOURCE[id].icon+" "+RESOURCE[id].name+" ("+fmt(n)+")</option>").join("");if(items.some(([id])=>id===old))sel.value=old;updateMarketEstimate()}
function updateMarketEstimate(){const id=$("sell-resource").value,n=Math.max(0,Math.floor(Number($("sell-amount").value)||0));$("market-estimate").textContent="판매 예상액 "+fmt(n*(RESOURCE[id]?.price||0))+" D"}
function renderFactory(){const p=currentPower();const built=S.buildings.length;const lines=[["⚡","전력 생산",fmt(p.gen)+" kW"],["ϟ","전력 소비",fmt(p.used)+" kW"],["🏭","설비 수",built+" 개"],["💎","도로늄 생산",fmt(S.stats.produced.doronium_normal||0)+" 개"]];$("operation-cards").innerHTML=lines.map(x=>'<div class="operation-card"><small>'+x[0]+" "+x[1]+'</small><strong>'+x[2]+'</strong><em>실시간 운영 지표</em></div>').join("");renderMachineDetails();renderEvents()}
function renderMachineDetails(){const el=$("machine-details");const b=S.buildings.find(x=>x.uid===selectedBuilding);if(!b){el.innerHTML='<div class="inspector-empty"><span>⌖</span><strong>월드에서 기계를 선택하세요</strong><p>기계의 레시피, 방향, 입출력 버퍼와 상태를 확인할 수 있습니다.</p></div>';return}const d=buildingDef(b.type),recipe=RECIPES[d.recipe]||(b.type==="variantLab"?VARIANT_RECIPES[b.variant||"doronium_blue"]:null);const input=Object.entries(b.input||{}).map(([id,n])=>RESOURCE[id].icon+fmt(n)).join(" · ")||"없음";const output=b.output?RESOURCE[b.output.id]?.icon+" "+fmt(b.output.qty)+" "+(RESOURCE[b.output.id]?.name||b.output.id):"없음";const status=b.status==="RUNNING"?"가동 중":b.status==="PAUSED_POWER"?"전력 부족":b.status==="PAUSED_OUTPUT"?"출력 대기":b.status==="NO_INPUT"?"원료 부족":"대기";el.innerHTML='<div class="inspector-title"><span class="build-icon">'+d.icon+'</span><div><strong>'+d.name+'</strong><small>'+status+' · 방향 '+DIRS[b.dir||1].name+' · 내구도 '+Math.round(b.condition||100)+'%</small></div></div><div class="machine-kpi"><div><small>생산 공정</small><b>'+(recipe?.name||({miner:"자원 채굴",pump:"물 공급",doriFarm:"돌이 고기 수확",power:"전력 공급",fusion:"인피니티 퓨전"})[d.kind]||"산업 설비")+'</b></div><div><small>공정 진행률</small><b>'+Math.round((b.progress||0)/(recipe?.time||10)*100)+'%</b></div></div><div class="machine-buffer"><span>투입 버퍼</span><b>'+input+'</b></div><div class="machine-buffer"><span>출력 버퍼</span><b>'+output+'</b></div>'+(d.kind==="variant"||b.type==="variantLab"?'<div class="machine-buffer"><span>결정 레시피</span><b>'+RESOURCE[b.variant||"doronium_blue"].name+'</b></div>':"")+'<div class="machine-controls"><button class="action-button" id="machine-collect" '+(!b.output?"disabled":"")+'>출력 회수</button><button class="action-button secondary" id="machine-supply">창고에서 투입</button><button class="action-button secondary" id="machine-rotate">방향 회전</button><button class="action-button danger" id="machine-remove">해체</button>'+(b.type==="variantLab"?'<button class="action-button secondary" id="machine-recipe">레시피 변경</button>':"")+(b.type==="fusion"?'<button class="action-button gold-button" id="machine-fusion">퓨전 시작</button>':"")+(b.type==="core"?'<button class="action-button gold-button" id="machine-core">인피니티 설치</button>':"")+'</div>';$("machine-collect").onclick=()=>collectOutput(b);$("machine-supply").onclick=()=>supplyMachine(b);$("machine-rotate").onclick=()=>{b.dir=((b.dir||1)+1)%4;markDirty();renderMachineDetails();drawWorld()};$("machine-remove").onclick=()=>removeBuilding(b);if($("machine-recipe"))$("machine-recipe").onclick=()=>chooseVariant(b);if($("machine-fusion"))$("machine-fusion").onclick=startFusion;if($("machine-core"))$("machine-core").onclick=()=>installCore(b)}
function renderEvents(){const logs=S.logs||[];$("event-feed").innerHTML=logs.slice(0,7).map(e=>'<div class="event-row"><i></i><span>'+e.message+'</span><time>'+String(Math.floor(e.time%86400/3600)).padStart(2,"0")+":"+String(Math.floor(e.time%3600/60)).padStart(2,"0")+'</time></div>').join("")||'<div class="inspector-empty">아직 생산 기록이 없습니다.</div>'}
function renderResearch(){const done=S.research.length;$("research-progress-label").textContent=done+" / "+RESEARCH.length;$("research-percent").textContent=Math.round(done/RESEARCH.length*100)+"%";$("research-progress-bar").style.width=done/RESEARCH.length*100+"%";$("research-tree").innerHTML=RESEARCH.map(r=>{const complete=S.research.includes(r.id),available=!complete&&(!r.requires||r.requires.every(id=>S.research.includes(id)));const active=S.activeResearch===r.id;return '<div class="research-node '+(complete?"complete":available?"available":"")+'"><span class="research-icon">'+r.icon+'</span><div class="research-info"><strong>'+r.name+'</strong><p>'+r.desc+'</p><small>'+r.time+'초 · '+fmt(r.cost)+' D · '+Object.entries(r.need).map(([id,n])=>RESOURCE[id]?.icon+" "+fmt(n)).join(" ")+'</small></div><button class="action-button '+(complete?"secondary":available?"":"secondary")+'" data-research="'+r.id+'" '+(!available||active?"disabled":"")+'>'+(complete?"완료":active?"연구 중":available?"연구 시작":"잠김")+'</button></div>'}).join("");document.querySelectorAll("[data-research]").forEach(btn=>btn.onclick=()=>startResearch(btn.dataset.research))}
function renderMissions(){const chapters=["ACT I · THE RUINS","ACT II · HIDDEN INDUSTRY","ACT III · DORONUM TRUTH","ACT IV · INFINITE PROJECT","ACT V · LAST FACTORY"];const q=getQuest();const activeChapter=q?.chapter??4;$("orbit-level").textContent=String(Math.min(9,S.questIndex+1)).padStart(2,"0");$("story-chapters").innerHTML=chapters.map((c,i)=>'<div class="chapter-chip '+(i===activeChapter?"active":i<activeChapter?"complete":"")+'">'+c+'</div>').join("");const progress=q?Math.min(q.max,q.progress(S)):1;$("mission-list").innerHTML=QUESTS.map((m,i)=>'<div class="mission-card '+(i<S.questIndex?"completed":"")+'"><div class="mission-head"><strong>'+m.title+'</strong><span>'+(i<S.questIndex?"완료":i===S.questIndex?"진행 중":"잠김")+'</span></div><p>'+m.desc+'</p><div class="mission-reward">보상 · '+fmt(m.reward)+' D</div>'+(i===S.questIndex?'<div class="mission-progress"><i style="width:'+Math.round(progress/m.max*100)+'%"></i></div>':"")+'</div>').join("");if(q)$("orbit-dialogue").textContent=q.orbit}
function renderAll(){renderHud();renderBuildList();renderFactory();renderInventory();renderResearch();renderMissions();drawWorld()}
