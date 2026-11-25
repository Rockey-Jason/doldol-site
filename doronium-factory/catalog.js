/* Doronium Factory — canonical expansion catalogue.
   Existing save IDs stay intact; this registry adds the requested materials,
   production recipes, packaging chains and placeable machine items. */

const itemRows = [
  ["wood","소나무","🌲","raw",5],["birchWood","자작나무","🌳","raw",24],
  ["rubberWood","고무나무","🌳","raw",30],["barkWood","짖음의 나무","🌲","raw",42],
  ["frozenWood","냉동 나무","🌲","raw",48],["fireWood","화염 나무","🌲","raw",48],
  ["rubberSap","고무 수액","🟠","material",36],["doriFur","돌이 털","🧶","special",80],
  ["treeNutrition","나무 영양제","🌱","special",32],["treeGrowthAccelerator","나무 성장 촉진제","🌿","special",120],["treePermanentGrowthCatalyst","나무 영구 성장 촉진제","🌳","special",800],
  ["doriMeat","돌이 고기(하급)","🍖","special",100],["enchantedDoriMeat","돌이 털 인챈트 고기","✨","special",250],
  ["sand","모래","🏖️","raw",4],["glass","유리","🔹","material",18],
  ["moltenGlass","녹은 유리","🫧","material",24],["moltenReinforcedGlass","녹은 강화 유리","🫧","material",44],
  ["reinforcedGlass","강화 유리","💠","material",52],["dirt","흙","🟤","raw",2],
  ["clay","진흙","🟫","material",6],["sandstone","사암","🪨","material",16],
  ["obsidian","흑요석","⬛","rare",110],["granite","화강암","🪨","raw",14],
  ["marble","대리석","⬜","raw",38],["ironOre","철광석","⛏️","raw",8],
  ["iron","철","⚙️","material",18],["moltenIron","녹은 철","🔥","material",20],
  ["copperOre","구리 광석","🟠","raw",9],["copper","구리","🟠","material",22],
  ["moltenCopper","녹은 구리","🔥","material",24],["nickelOre","니켈 광석","🟢","raw",24],
  ["nickel","니켈","🟢","material",50],["moltenNickel","녹은 니켈","🔥","material",54],
  ["leadOre","납 광석","⚫","raw",13],["lead","납","⚫","material",25],
  ["moltenLead","녹은 납","🔥","material",28],["chromiumOre","크롬 광석","🩶","raw",35],
  ["chromium","크롬","🩶","material",72],["moltenChromium","녹은 크롬","🔥","material",78],
  ["goldOre","금 광석","🟡","raw",24],["gold","금","🪙","rare",100],
  ["moltenGold","녹은 금","🔥","material",105],["titaniumOre","티타늄 광석","🔩","rare",58],
  ["titanium","티타늄","🔩","material",130],["moltenTitanium","녹은 티타늄","🔥","material",138],
  ["diamondOre","다이아몬드 광석","💎","rare",90],["diamond","다이아몬드","💎","rare",180],
  ["moltenDiamond","녹은 다이아몬드","💠","rare",210],["neodymiumOre","네오디움 광석","🟣","rare",75],
  ["neodymium","네오디움","🟣","rare",170],["moltenNeodymium","녹은 네오디움","🔥","rare",185],
  ["aluminumOre","알루미늄 광석","🪨","raw",28],["moltenAluminum","녹은 알루미늄","🔥","material",34],["aluminum","알루미늄","🔩","material",42],["aluminumPlate","알루미늄판","▰","part",58],
  ["magnetite","자철석","🧲","raw",34],["moltenMagnetite","녹은 자철석","🔥","material",42],
  ["moltenMagnet","녹은 자석","🧲","material",65],["magnet","자석","🧲","part",80],["moltenNeodymiumMagnet","녹은 네오디움 자석","🔥","rare",230],["neodymiumMagnet","네오디움 자석","🧲","rare",320],
  ["moltenStainlessSteel","녹은 스테인리스강","🔥","material",100],["stainlessSteel","스테인리스강","🩶","material",125],
  ["moltenReinforcedIron","녹은 강화된 철","🔥","material",44],["reinforcedIron","강화된 철","⚙️","material",56],
  ["moltenSteel","녹은 강철","🔥","material",48],["steel","강철","🔩","material",75],
  ["steelPlate","강철판","▰","part",98],["titaniumPlate","티타늄판","▰","part",165],
  ["carbonPowder","카본 가루","⚫","material",15],["carbon","카본","⚫","material",42],
  ["coal","석탄","⬛","raw",6],["quartz","석영","🔹","raw",16],
  ["silicon","규소","🧪","material",28],["heatCrystal","열 결정체","🔥","rare",95],
  ["coldCrystal","냉 결정체","❄️","rare",95],["rubber","고무","🟠","material",28],
  ["moltenRubber","녹은 고무","🫧","material",24],["crudeOil","원유","🛢️","raw",24],
  ["oil","석유","🛢️","material",45],["ironPlate","철판","▰","part",25],
  ["grass","풀","🌱","raw",2],["plantFiber","식물 섬유","🌾","material",8],
  ["plantCord","식물성 끈","🪢","part",13],["nylon","나일론","🧵","material",24],
  ["nylonCord","나일론 끈","🪢","part",36],["steelWire","강철 와이어","〰️","part",50],
  ["emptyBottle","빈 물병","🍾","part",14],["waterBottle","물병","🧴","material",20],
  ["bread","빵","🍞","food",1000],["steak","스테이크","🥩","food",10000],
  ["woodFence","나무 울타리","🪵","building",32],["ironFence","철 울타리","⛓️","building",80],
  ["steelFence","강철 울타리","⛓️","building",140],["doroniumFence","도로늄 울타리","🔷","building",420],
  ["woodBucket","나무 양동이","🪣","tool",22],["ironBucket","철 양동이","🪣","tool",65],
  ["woodSword","목검","🗡️","equipment",18],["ironSword","철 검","🗡️","equipment",72],
  ["steelSword","강철 검","🗡️","equipment",125],["titaniumSword","티타늄 검","🗡️","equipment",230],
  ["obsidianSword","흑요석 검","🗡️","equipment",260],["doroniumSword","도로늄 검","🔷","equipment",800],
  ["woodPickaxe","나무 곡괭이","⛏️","tool",24],["ironPickaxe","철 곡괭이","⛏️","tool",90],
  ["steelPickaxe","강철 곡괭이","⛏️","tool",150],["doroniumPickaxe","도로늄 곡괭이","🔷","tool",950],
  ["woodAxe","나무 도끼","🪓","tool",24],["woodShovel","나무 삽","🪏","tool",20],["ironShovel","철 삽","🪏","tool",75],["steelShovel","강철 삽","🪏","tool",135],["doroniumShovel","도로늄 삽","🪏","tool",900],["ironAxe","철 도끼","🪓","tool",90],
  ["steelAxe","강철 도끼","🪓","tool",150],["doroniumAxe","도로늄 도끼","🔷","tool",950],
  ["oldAxe","낡은 도끼","🪓","tool",1],["bow","활","🏹","equipment",28],
  ["woodArrow","나무 화살","➶","ammo",4],["ironArrow","철 화살","➶","ammo",12],
  ["doroniumArrow","도로늄 화살","➶","ammo",90],
  ["ironHelmet","철 투구","🪖","armor",130],["titaniumHelmet","티타늄 투구","🪖","armor",280],
  ["doroniumHelmet","도로늄 투구","🔷","armor",900],["ironChestplate","철 흉갑","🛡️","armor",200],
  ["titaniumChestplate","티타늄 흉갑","🛡️","armor",420],["doroniumChestplate","도로늄 흉갑","🔷","armor",1400],
  ["ironLeggings","철 바지","🦿","armor",175],["titaniumLeggings","티타늄 바지","🦿","armor",360],
  ["doroniumLeggings","도로늄 바지","🔷","armor",1200],["ironBoots","철 신발","🥾","armor",105],
  ["titaniumBoots","티타늄 신발","🥾","armor",220],["doroniumBoots","도로늄 신발","🔷","armor",700],
  ["woodShield","방패","🛡️","equipment",26],["ironShield","철 방패","🛡️","equipment",115],
  ["titaniumShield","티타늄 방패","🛡️","equipment",260],["doroniumShield","도로늄 방패","🔷","equipment",950],
  ["receiver","수신기","📡","part",115],["transmitter","송신기","📶","part",115],
  ["gear","기어","⚙️","part",18],["steelGear","강철 기어","⚙️","part",48],
  ["bearing","베어링","⚙️","part",28],["motor","모터","⚡","part",90],
  ["piston","피스톤","↕️","part",32],["ironScrew","철 나사","🔩","part",3],
  ["steelScrew","강철 나사","🔩","part",8],["wire","전선","〰️","part",18],
  ["copperWire","구리 전선","〰️","part",18],["insulatedWire","절연 전선","〰️","part",34],
  ["sensor","센서","📟","part",65],["led","LED","💡","part",18],
  ["basicCircuit","기본 회로","▦","part",85],["midCircuit","중급 회로","▦","part",180],
  ["advancedCircuit","고급 회로","▦","part",420],["controlModule","제어 모듈","🧠","part",650],
  ["battery","배터리","🔋","part",70],["largeBattery","대형 배터리","🔋","part",260],
  ["transformer","변압기","⚡","part",360],["concrete","콘크리트","🧱","material",24],
  ["brick","벽돌","🧱","material",8],["lavaBucket","용암 양동이","🪣","fluid",60],
  ["waterBucket","물 양동이","🪣","fluid",18],
  ["doronium_normal","도로늄(일반)","🔷","doronium",900],
  ["doronium_blue","블루 도로늄(중급)","🟦","doronium",1400],
  ["doronium_red","레드 도로늄(중급)","🟥","doronium",1500],
  ["doronium_iron","아이언 도로늄(초급)","⚙️","doronium",1600],
  ["doronium_orange","오렌지 도로늄(일반)","🟠","doronium",1700],
  ["doronium_slightly_rusted","약간 녹슨 도로늄(초급)","🟤","doronium",1350],
  ["doronium_rusted","녹슨 도로늄(하급)","🟫","doronium",1100],
  ["doronium_translucent","반투명 도로늄(중급)","💎","doronium",2200],
  ["doronium_thermal_crystal","열 도로늄 결정체(중급)","🔥","doronium",2600],
  ["doronium_cold_crystal","냉 도로늄 결정체(중급)","❄️","doronium",2600],
  ["doronium_black","블랙 도로늄(일반)","⚫","doronium",2400],
  ["doronium_yellow","황다도로늄(고급)","🟡","doronium",4200],
  ["doronium_ultra","울트라 도로늄(최고급)","💠","doronium",9800],
  ["specialDoronium","스페셜 도로늄","✨","doronium",12000],
  ["doronium_special_edition","도로늄 스페셜 에디션(최고급)","🌟","doronium",18000],
  ["limitedDoronium","리미티드 도로늄","💎","doronium",20000],
  ["doronium_limited_edition","도로늄 리미티드 에디션(최고급)","👑","doronium",30000],
  ["infinity","인피니티 도로늄(인피니티)","♾️","final",1000000]
];

const itemMap = Object.fromEntries(itemRows.map(([id,name,icon,kind,price]) => [
  id,{name,icon,kind,price,description:name}
]));

const machineRows = [
  ["machine_compressor","압축기","⏣","compressor","compressor",4],
  ["machine_high_pressure_compressor","초고압 압축기","⏣","highPressureCompressor","high_pressure_compressor",12],
  ["machine_ultra_compressor","초고온 & 초고압 압축기","⏣","ultraCompressor","ultra_compressor",22],
  ["machine_furnace","용광로","🔥","furnace","furnace",8],
  ["machine_electric_furnace","전기로","⚡","electricFurnace","electric_furnace",12],
  ["machine_doronium_furnace","도로늄 전기로","🔷","doroniumFurnace","doronium_electric_furnace",24],
  ["machine_wiremill","와이어 가공기","〰️","wiremill","wiremill",4],
  ["machine_oil_drill","원유 시추기","🛢️","oilDrill","oil_drill",8],
  ["machine_rolling_mill","압연기","⚙️","rollingMill","rolling_mill",9],
  ["machine_refinery","정제기","🛢️","refinery","refinery",10],
  ["machine_auto_crafter","자동 제작기","🤖","autoCrafting","auto_crafting",14],
  ["machine_auto_miner","자동 채굴기","⛏️","autoMiner","auto_miner",16],
  ["machine_auto_furnace","자동 용광로","🔥","autoFurnace","auto_furnace",15],
  ["machine_auto_electric_furnace","자동 전기로","⚡","autoElectricFurnace","auto_electric_furnace",20],
  ["machine_packager_1","1차 포장기","📦","packaging1","packager_1",7],
  ["machine_packager_2","2차 포장기","📦","packaging2","packager_2",9],
  ["machine_packager_3","3차 포장기","🚚","packaging3","packager_3",12],
  ["machine_storage","저장 창고","📦","storage","storage",0],
  ["machine_conveyor","컨테이너 벨트","➜","conveyor","conveyor",0],
  ["machine_maglev_conveyor","자기부상 컨테이너 벨트","〰️","maglevConveyor","maglev_conveyor",1],
  ["machine_rapid_cooler","급속 냉각기","❄️","cooler","rapid_cooler",10],
  ["machine_dori_harvester","자동 도로늄 수확기","🌳","doriHarvester","dori_harvester",8],
  ["machine_carbon_extractor","탄소 추출기","⚫","carbonExtractor","carbon_extractor",8],
  ["machine_wood_bridge","외나무다리","🌉","bridge","wood_bridge",0],
  ["machine_iron_bridge","철다리","🌉","bridge","iron_bridge",0],
  ["machine_concrete_bridge","콘크리트 다리","🌉","bridge","concrete_bridge",0],
  ["machine_air_conditioner","에어컨","❄️","climate","air_conditioner",2],
  ["machine_fan","환풍기","🌀","climate","fan",1],
  ["machine_heater","히터","♨️","climate","heater",2],
  ["machine_control_computer","통제 컴퓨터","🖥️","control","control_computer",4],
  ["machine_solar_panel","태양광 패널","☀️","power","solar_panel",0],
  ["machine_wind_turbine","풍력 발전기","🌬️","power","wind_turbine",0],
  ["machine_thermal_generator","화력 발전기","♨️","power","thermal_generator",0],
  ["machine_doronium_generator","도로늄 발전기","🔷","power","doronium_generator",0],
  ["machine_shape_converter","형태 변환기","💠","shapeConverter","shape_converter",14],
  ["machine_magnetic_inserter","자성 삽입기","🧲","magneticInserter","magnetic_inserter",10],
  ["machine_item_elevator","아이템 엘리베이터","↕️","elevator","item_elevator",3],
  ["machine_water_elevator","물 아이템 엘리베이터","💧","elevator","water_elevator",4],
  ["machine_maglev_elevator","자기부상 아이템 엘리베이터","↕️","elevator","maglev_elevator",6],
  ["machine_sorter","아이템 분류기","⇄","sorter","sorter",3],
  ["machine_merger","아이템 합류기","⇉","merger","merger",2],
  ["machine_distributor","아이템 분배기","⇶","distributor","distributor",3],
  ["machine_transformer","변압기","⚡","power","transformer",0],
  ["machine_shipping_center","출하 센터","🚚","shipping","shipping_center",6],
  ["machine_quality_checker","품질 검사기","🔍","quality","quality_checker",2],
  ["machine_auto_quality_checker","자동 품질 검사기","🔍","quality","auto_quality_checker",5],
  ["machine_doronium_compressor","도로늄 압축기","🔷","doroniumCompressor","doronium_compressor",26],
  ["machine_doronium_fusion","도로늄 융합기","♾️","doroniumFusion","doronium_fusion",40],
  ["machine_resource_copier","자원 복사기","🧬","resourceCopier","resource_copier",10],
  ["machine_item_copier","아이템 복사기","🧬","itemCopier","item_copier",14]
];
for (const [id,name,icon] of machineRows) {
  if (!itemMap[id]) itemMap[id]={name,icon,kind:"machine",price:0,description:name+" 설비 아이템"};
}
export const CATALOG_MACHINES = machineRows.map(([itemId,name,icon,station,recipeStation,power]) => ({
  id:"catalog_"+itemId.replace(/^machine_/,""),
  name,icon,cat:station==="power"?"power":station==="storage"||station==="conveyor"||station==="maglevConveyor"||station==="sorter"||station==="merger"||station==="distributor"||station==="elevator"||station==="shipping"?"logistics":"process",
  cost:0,materials:{},desc:name+" · 제작 도감에서 제작한 설비 아이템을 설치해 사용합니다.",
  kind:station==="power"?"power":station==="doriHarvester"?"doriFarm":station==="storage"?"storage":station==="conveyor"||station==="maglevConveyor"?"belt":["bridge","climate","control","elevator","sorter","merger","distributor","shipping","quality","magneticInserter"].includes(station)?"utility":"machine",
  power,station,itemId,catalogItemId:itemId,catalogStation:recipeStation
}));

const R=[];
function addRecipe(id,name,station,inputs,output,qty=1,time=12,temp=25,pressure=0,extra={}) {
  R.push([id,{id,name,station,inputs,output,qty,time,temp,pressure,
    usesTemperature:temp!==null,usesPressure:pressure!==null,
    temperatureTolerance:Math.max(5,Math.abs(temp||0)*.08),
    pressureTolerance:Math.max(5,Math.abs(pressure||0)*.08),
    ...extra}]);
}

/* Core materials and metallurgical chain */
addRecipe("glass_from_sand","유리 소성","furnace",{sand:1},"glass",1,16,1200,5);
addRecipe("molten_glass","유리 용융","electric_furnace",{glass:1},"moltenGlass",1,12,1500,10);
addRecipe("molten_reinforced_glass","강화 유리 용융","electric_furnace",{glass:1,carbon:1},"moltenReinforcedGlass",1,20,1650,20);
addRecipe("reinforced_glass","강화 유리 급속 냉각","rapid_cooler",{moltenReinforcedGlass:1},"reinforcedGlass",1,8,80,0);
addRecipe("clay_from_dirt","진흙 혼합","crafting",{waterBottle:1,dirt:1},"clay",1,5,null,null);
addRecipe("sandstone_compression","사암 압축","compressor",{sand:3},"sandstone",1,18,100,180,{temperatureTolerance:200,pressureTolerance:120});
addRecipe("obsidian_mix","흑요석 혼합","crafting",{waterBucket:1,lavaBucket:1},"obsidian",1,12,null,null);
addRecipe("molten_iron","철광석 용융","furnace",{ironOre:1},"moltenIron",1,14,1538,100,{temperatureTolerance:120,pressureTolerance:100});
addRecipe("iron_cooling","철 급속 냉각","rapid_cooler",{moltenIron:1},"iron",1,8,80,0);
addRecipe("molten_copper","구리 용융","furnace",{copperOre:1},"moltenCopper",1,12,1085,50,{temperatureTolerance:90,pressureTolerance:50});
addRecipe("copper_cooling","구리 냉각","rapid_cooler",{moltenCopper:1},"copper",1,8,80,0);
addRecipe("molten_nickel","니켈 용융","electric_furnace",{nickelOre:1},"moltenNickel",1,16,1455,100);
addRecipe("nickel_cooling","니켈 냉각","rapid_cooler",{moltenNickel:1},"nickel",1,8,80,0);
addRecipe("molten_lead","납 용융","furnace",{leadOre:1},"moltenLead",1,10,327,10);
addRecipe("lead_cooling","납 냉각","rapid_cooler",{moltenLead:1},"lead",1,7,80,0);
addRecipe("molten_chromium","크롬 용융","electric_furnace",{chromiumOre:1},"moltenChromium",1,20,1907,300);
addRecipe("chromium_cooling","크롬 냉각","rapid_cooler",{moltenChromium:1},"chromium",1,9,80,0);
addRecipe("molten_aluminum","알루미늄 용융","electric_furnace",{aluminumOre:1},"moltenAluminum",1,10,700,25,{temperatureTolerance:80,pressureTolerance:25});
addRecipe("aluminum_cooling","알루미늄 냉각","rapid_cooler",{moltenAluminum:1},"aluminum",1,7,80,0);
addRecipe("aluminum_plate","알루미늄판 압연","rolling_mill",{aluminum:1},"aluminumPlate",1,7,260,30);
addRecipe("molten_gold","금 용융","furnace",{goldOre:1},"moltenGold",1,12,1064,50);
addRecipe("gold_cooling","금 냉각","rapid_cooler",{moltenGold:1},"gold",1,7,80,0);
addRecipe("molten_titanium","티타늄 광석 용융","electric_furnace",{titaniumOre:1},"moltenTitanium",1,20,1850,800);
addRecipe("titanium_compression","티타늄 성형 압축","high_pressure_compressor",{moltenTitanium:1},"titanium",1,22,1850,800);
addRecipe("molten_diamond","다이아몬드 초고온 용융","doronium_electric_furnace",{diamondOre:1},"moltenDiamond",1,40,4200,12000);
addRecipe("diamond_cooling","다이아몬드 결정화","rapid_cooler",{moltenDiamond:1},"diamond",1,16,100,0);
addRecipe("molten_neodymium","네오디움 용융","doronium_electric_furnace",{neodymiumOre:1},"moltenNeodymium",1,34,2300,900);
addRecipe("neodymium_cooling","네오디움 냉각","rapid_cooler",{moltenNeodymium:1},"neodymium",1,12,90,0);
addRecipe("magnetite_melt","자철석 용융","electric_furnace",{magnetite:5,iron:2},"moltenMagnet",1,18,1250,250);
addRecipe("magnet_melt","자석 재용융","electric_furnace",{magnet:1},"moltenMagnet",1,12,1200,200);
addRecipe("magnet_cooling","자석 냉각","rapid_cooler",{moltenMagnet:1},"magnet",1,9,80,0);
addRecipe("neodymium_magnet_melt","네오디움 자석 합금 용융","doronium_electric_furnace",{neodymium:3,moltenMagnet:1},"moltenNeodymiumMagnet",1,34,1250,1200);
addRecipe("neodymium_magnet_cooling","네오디움 자석 급속 냉각","rapid_cooler",{moltenNeodymiumMagnet:1},"neodymiumMagnet",1,12,90,0);
addRecipe("stainless_melt","스테인리스강 합금","electric_furnace",{iron:5,chromium:2,nickel:1},"moltenStainlessSteel",1,26,1550,300);
addRecipe("stainless_cooling","스테인리스강 냉각","rapid_cooler",{moltenStainlessSteel:1},"stainlessSteel",1,10,90,0);
addRecipe("reinforced_iron_melt","강화된 철 합금","furnace",{iron:5,carbon:1},"moltenReinforcedIron",1,18,1550,100);
addRecipe("reinforced_iron_cooling","강화된 철 냉각","rapid_cooler",{moltenReinforcedIron:1},"reinforcedIron",1,9,90,0);
addRecipe("molten_steel","강철 용융","furnace",{iron:5,coal:2},"moltenSteel",1,24,1550,100);
addRecipe("steel_compression","강철 열압축","high_pressure_compressor",{moltenSteel:1},"steel",1,22,1550,600);
addRecipe("carbon_powder","탄소 추출","carbon_extractor",{coal:1},"carbonPowder",1,8,null,null);
addRecipe("carbon_compression","카본 초고압 성형","ultra_compressor",{carbonPowder:3},"carbon",1,24,2000,1800);
addRecipe("rubber_from_sap","고무 수액 열처리","furnace",{rubberSap:5},"moltenRubber",1,12,220,1);
addRecipe("rubber_from_oil","석유 고무 합성","electric_furnace",{oil:2},"moltenRubber",1,12,220,1);
addRecipe("rubber_cooling","고무 냉각","rapid_cooler",{moltenRubber:1},"rubber",1,6,40,0);
addRecipe("oil_refining","원유 정제","refinery",{crudeOil:1},"oil",1,18,350,30);
addRecipe("iron_plate","철판 압연","rolling_mill",{iron:1},"ironPlate",1,8,350,50);
addRecipe("steel_plate","강철판 압연","rolling_mill",{steel:1},"steelPlate",1,11,450,100);
addRecipe("titanium_plate","티타늄판 압연","rolling_mill",{titanium:1},"titaniumPlate",1,14,650,200);
addRecipe("plant_fiber","식물 섬유 가공","crafting",{grass:3},"plantFiber",1,5,null,null);
addRecipe("plant_cord","식물성 끈 꼬기","crafting",{plantFiber:2},"plantCord",1,4,null,null);
addRecipe("nylon","나일론 합성","electric_furnace",{oil:2},"nylon",1,12,280,5);
addRecipe("nylon_cord","나일론 끈 제작","crafting",{nylon:2},"nylonCord",1,5,null,null);
addRecipe("steel_wire","강철 와이어 인발","wiremill",{steelPlate:1},"steelWire",1,8,160,20);
addRecipe("empty_bottle","빈 물병 성형","furnace",{glass:3},"emptyBottle",1,8,650,0);
addRecipe("fill_water_bottle","물병 채우기","crafting",{emptyBottle:1,water:1},"waterBottle",1,3,null,null);

/* Woodworking, tools, equipment and electronics */
addRecipe("wood_fence","나무 울타리","crafting",{wood:4,plantCord:2},"woodFence",1,6,null,null);
addRecipe("iron_fence","철 울타리","crafting",{iron:4,ironScrew:4},"ironFence",1,9,null,null);
addRecipe("steel_fence","강철 울타리","crafting",{steel:4,steelScrew:4},"steelFence",1,12,null,null);
addRecipe("doronium_fence","도로늄 울타리","crafting",{doronium_normal:4,steelScrew:4},"doroniumFence",1,16,null,null);
addRecipe("wood_bucket","나무 양동이","crafting",{wood:3,plantCord:1},"woodBucket",1,5,null,null);
addRecipe("iron_bucket","철 양동이","crafting",{ironPlate:3},"ironBucket",1,7,null,null);
addRecipe("wood_sword","목검 제작","crafting",{wood:2,plantCord:1},"woodSword",1,6,null,null);
addRecipe("iron_sword","철 검 제작","crafting",{iron:2,wood:1},"ironSword",1,8,null,null);
addRecipe("steel_sword","강철 검 제작","crafting",{steel:2,wood:1},"steelSword",1,10,null,null);
addRecipe("titanium_sword","티타늄 검 제작","crafting",{titanium:2,wood:1},"titaniumSword",1,13,null,null);
addRecipe("obsidian_sword","흑요석 검 제작","crafting",{obsidian:2,wood:1},"obsidianSword",1,14,null,null);
addRecipe("doronium_sword","도로늄 검 제작","crafting",{doronium_normal:2,wood:1},"doroniumSword",1,18,null,null);
addRecipe("wood_pickaxe","나무 곡괭이","crafting",{wood:3,plantCord:2},"woodPickaxe",1,7,null,null);
addRecipe("iron_pickaxe","철 곡괭이","crafting",{iron:3,wood:2},"ironPickaxe",1,9,null,null);
addRecipe("steel_pickaxe","강철 곡괭이","crafting",{steel:3,wood:2},"steelPickaxe",1,11,null,null);
addRecipe("doronium_pickaxe","도로늄 곡괭이","crafting",{doronium_normal:3,wood:2},"doroniumPickaxe",1,18,null,null);
addRecipe("wood_axe","나무 도끼","crafting",{wood:3,plantCord:2},"woodAxe",1,7,null,null);
addRecipe("wood_shovel","나무 삽","crafting",{wood:2,ironScrew:1},"woodShovel",1,5,null,null);
addRecipe("iron_shovel","철 삽","crafting",{iron:3,wood:2,ironScrew:2},"ironShovel",1,8,null,null);
addRecipe("steel_shovel","강철 삽","crafting",{steel:3,wood:2,steelScrew:2},"steelShovel",1,10,null,null);
addRecipe("doronium_shovel","도로늄 삽","crafting",{doronium_normal:3,wood:2,steelScrew:2},"doroniumShovel",1,16,null,null);
addRecipe("iron_axe","철 도끼","crafting",{iron:3,wood:2},"ironAxe",1,9,null,null);
addRecipe("steel_axe","강철 도끼","crafting",{steel:3,wood:2},"steelAxe",1,11,null,null);
addRecipe("doronium_axe","도로늄 도끼","crafting",{doronium_normal:3,wood:2},"doroniumAxe",1,18,null,null);
addRecipe("bow","활 제작","crafting",{wood:3,plantCord:2},"bow",1,8,null,null);
addRecipe("wood_arrow","나무 화살","crafting",{wood:1,plantCord:1},"woodArrow",1,3,null,null);
addRecipe("iron_arrow","철 화살","crafting",{iron:1,plantCord:1},"ironArrow",1,4,null,null);
addRecipe("doronium_arrow","도로늄 화살","crafting",{doronium_normal:1,plantCord:1},"doroniumArrow",1,6,null,null);
addRecipe("iron_helmet","철 투구","crafting",{iron:5},"ironHelmet",1,10,null,null);
addRecipe("titanium_helmet","티타늄 투구","crafting",{titanium:5},"titaniumHelmet",1,13,null,null);
addRecipe("doronium_helmet","도로늄 투구","crafting",{doronium_normal:5},"doroniumHelmet",1,18,null,null);
addRecipe("iron_chestplate","철 흉갑","crafting",{iron:8},"ironChestplate",1,14,null,null);
addRecipe("titanium_chestplate","티타늄 흉갑","crafting",{titanium:8},"titaniumChestplate",1,18,null,null);
addRecipe("doronium_chestplate","도로늄 흉갑","crafting",{doronium_normal:8},"doroniumChestplate",1,24,null,null);
addRecipe("iron_leggings","철 바지","crafting",{iron:7},"ironLeggings",1,12,null,null);
addRecipe("titanium_leggings","티타늄 바지","crafting",{titanium:7},"titaniumLeggings",1,16,null,null);
addRecipe("doronium_leggings","도로늄 바지","crafting",{doronium_normal:7},"doroniumLeggings",1,22,null,null);
addRecipe("iron_boots","철 신발","crafting",{iron:4},"ironBoots",1,8,null,null);
addRecipe("titanium_boots","티타늄 신발","crafting",{titanium:4},"titaniumBoots",1,12,null,null);
addRecipe("doronium_boots","도로늄 신발","crafting",{doronium_normal:4},"doroniumBoots",1,16,null,null);
addRecipe("wood_shield","방패 제작","crafting",{wood:6,plantCord:1},"woodShield",1,7,null,null);
addRecipe("iron_shield","철 방패","crafting",{iron:6,wood:2},"ironShield",1,10,null,null);
addRecipe("titanium_shield","티타늄 방패","crafting",{titanium:6,wood:2},"titaniumShield",1,14,null,null);
addRecipe("doronium_shield","도로늄 방패","crafting",{doronium_normal:6,wood:2},"doroniumShield",1,20,null,null);
addRecipe("iron_screw","철 나사","crafting",{iron:1},"ironScrew",1,2,null,null);
addRecipe("steel_screw","강철 나사","crafting",{steel:1},"steelScrew",1,2,null,null);
addRecipe("wire","전선 인발","wiremill",{copper:1},"wire",1,3,120,0);
addRecipe("copper_wire","구리 전선 인발","wiremill",{copper:1},"copperWire",1,3,120,0);
addRecipe("insulated_wire","절연 전선 피복","wiremill",{copperWire:2,rubber:1},"insulatedWire",1,5,90,0);
addRecipe("gear","기어 절삭","crafting",{iron:3,ironPlate:2},"gear",1,6,null,null);
addRecipe("steel_gear","강철 기어 절삭","crafting",{steel:3,steelPlate:2},"steelGear",1,8,null,null);
addRecipe("bearing","베어링 조립","crafting",{iron:2,steel:1,rubber:2},"bearing",1,7,null,null);
addRecipe("motor","모터 조립","crafting",{copper:5,iron:5,neodymium:2,bearing:2,wire:5},"motor",1,16,null,null);
addRecipe("piston","피스톤 조립","crafting",{iron:5,ironPlate:3,gear:2,steel:2,rubber:2},"piston",1,12,null,null);
addRecipe("sensor","센서 조립","crafting",{copper:3,iron:2,quartz:2,basicCircuit:2,led:1},"sensor",1,9,null,null);
addRecipe("led","LED 조립","crafting",{copper:1,glass:1,quartz:1,wire:2},"led",1,5,null,null);
addRecipe("basic_circuit","기본 회로","crafting",{copper:3,carbon:1,quartz:1,wire:2},"basicCircuit",1,8,null,null);
addRecipe("mid_circuit","중급 회로","crafting",{copper:5,carbon:2,quartz:3,nickel:2,basicCircuit:2,wire:4},"midCircuit",1,12,null,null);
addRecipe("advanced_circuit","고급 회로","auto_crafting",{copper:8,gold:3,carbon:4,quartz:5,nickel:3,midCircuit:3,wire:6,diamond:1},"advancedCircuit",1,18,null,null);
addRecipe("control_module","제어 모듈","auto_crafting",{advancedCircuit:3,titaniumPlate:5,gold:2,sensor:3,battery:2,neodymium:2},"controlModule",1,22,null,null);
addRecipe("battery","배터리 조립","crafting",{lead:5,copper:3,carbon:2,rubber:2},"battery",1,10,null,null);
addRecipe("large_battery","대형 배터리 조립","auto_crafting",{lead:15,copper:10,carbon:8,rubber:5,battery:3,midCircuit:2},"largeBattery",1,18,null,null);
addRecipe("transformer","변압기 조립","auto_crafting",{copper:15,iron:10,steelPlate:5,wire:10,insulatedWire:5,midCircuit:3,largeBattery:1},"transformer",1,20,null,null);
addRecipe("receiver","수신기 조립","crafting",{copperWire:8,ironPlate:5,basicCircuit:2,ironScrew:10},"receiver",1,12,null,null);
addRecipe("transmitter","송신기 조립","crafting",{copperWire:8,ironPlate:5,basicCircuit:2,ironScrew:10},"transmitter",1,12,null,null);

addRecipe("tree_nutrition","나무 영양제 혼합","crafting",{grass:10,dirt:5,waterBottle:3,plantFiber:5},"treeNutrition",1,10,null,null);
addRecipe("tree_growth_accelerator","나무 성장 촉진제 합성","crafting",{treeNutrition:3,grass:15,plantFiber:10,clay:5,copper:2},"treeGrowthAccelerator",1,18,null,null);
addRecipe("tree_permanent_growth","나무 영구 성장 촉진제 합성","auto_crafting",{treeGrowthAccelerator:5,barkWood:10,plantFiber:20,advancedCircuit:3,controlModule:2,coldCrystal:2,heatCrystal:2},"treePermanentGrowthCatalyst",1,55,null,null);

/* Doronium origin story and the requested progression chain */
addRecipe("dori_hair_enchantment","돌이 털 인챈트","crafting",{doriMeat:1,doriFur:1},"enchantedDoriMeat",1,8,null,null);
addRecipe("basic_doronium","돌이 고기 압축","compressor",{doriMeat:1},"doronium_normal",1,18,1000,180,{requiresNonSynthetic:true});
addRecipe("doronium_10_to_1","돌이 털 인챈트 고기 10:1 압축","doronium_compressor",{enchantedDoriMeat:10},"doronium_normal",1,24,1000,180,{requiresNonSynthetic:true});
addRecipe("yellow_doronium","황다도로늄 합성","ultra_compressor",{gold:1,diamond:1,doriMeat:3},"doronium_yellow",1,36,2000,1800,{requiresNonSynthetic:true});
addRecipe("ultra_doronium","울트라 도로늄 합성","ultra_compressor",{obsidian:5,diamond:9,coldCrystal:1,heatCrystal:1,doriMeat:10},"doronium_ultra",1,55,4200,12000,{requiresNonSynthetic:true});
addRecipe("blue_doronium","블루 도로늄 초저온 결정화","rapid_cooler",{doronium_normal:1,coldCrystal:1},"doronium_blue",1,16,-120,0);
addRecipe("red_doronium","레드 도로늄 초고온 압축","ultra_compressor",{doronium_normal:1,heatCrystal:2},"doronium_red",1,20,2500,1600);
addRecipe("iron_doronium","아이언 도로늄 합성","compressor",{iron:1,doronium_normal:2},"doronium_iron",1,18,350,400);
addRecipe("orange_doronium","오렌지 도로늄 합성","compressor",{copper:1,doronium_normal:2},"doronium_orange",1,18,350,400);
addRecipe("slightly_rusted_doronium","약간 녹슨 도로늄","crafting",{doronium_orange:1,water:1},"doronium_slightly_rusted",1,8,null,null);
addRecipe("rusted_doronium","녹슨 도로늄","crafting",{doronium_slightly_rusted:1,water:1},"doronium_rusted",1,8,null,null);
addRecipe("translucent_doronium","반투명 도로늄 압축","high_pressure_compressor",{water:5,doronium_normal:1,diamond:3},"doronium_translucent",1,32,900,1200);
addRecipe("thermal_doronium_crystal","열 도로늄 결정체","high_pressure_compressor",{doronium_normal:3,heatCrystal:10},"doronium_thermal_crystal",1,30,1100,1200);
addRecipe("cold_doronium_crystal","냉 도로늄 결정체","high_pressure_compressor",{doronium_normal:3,coldCrystal:10},"doronium_cold_crystal",1,30,-80,1200);
addRecipe("black_doronium_coal","블랙 도로늄 · 석탄 경로","crafting",{coal:2,doronium_normal:1},"doronium_black",1,10,null,null);
addRecipe("black_doronium_oil","블랙 도로늄 · 석유 경로","crafting",{oil:2,doronium_normal:1},"doronium_black",1,10,null,null);
addRecipe("special_doronium","스페셜 도로늄 합성","doronium_compressor",{marble:2,doriMeat:20,gold:7,diamond:1,obsidian:3,heatCrystal:5,coldCrystal:5},"specialDoronium",1,70,2300,1800,{requiresNonSynthetic:true});
addRecipe("special_edition","스페셜 에디션 형태 변환","shape_converter",{specialDoronium:1},"doronium_special_edition",1,45,1200,900);
addRecipe("limited_doronium","리미티드 도로늄 합성","doronium_compressor",{obsidian:10,diamond:20,heatCrystal:10,coldCrystal:10,doriMeat:30,gold:5},"limitedDoronium",1,90,2600,2500,{requiresNonSynthetic:true});
addRecipe("limited_edition","리미티드 에디션 형태 변환","shape_converter",{limitedDoronium:1},"doronium_limited_edition",1,55,1500,1200);

/* Craftable machine items: exact material bills from the supplied specification. */
const machineRecipes = [
  ["machine_compressor","압축기 제작","crafting",{ironPlate:20,iron:15,gear:6,piston:2,motor:1,basicCircuit:2},45],
  ["machine_high_pressure_compressor","초고압 압축기 제작","auto_crafting",{steelPlate:30,steel:20,steelGear:10,piston:5,motor:3,midCircuit:4,sensor:2,insulatedWire:8},75],
  ["machine_ultra_compressor","초고온 & 초고압 압축기 제작","auto_crafting",{titaniumPlate:40,steelPlate:35,titanium:20,steelGear:15,piston:8,motor:6,advancedCircuit:6,controlModule:3,sensor:5,insulatedWire:15,largeBattery:2},110],
  ["machine_furnace","용광로 제작","crafting",{ironPlate:10,steelPlate:5,brick:20,carbon:5,gear:4},45],
  ["machine_electric_furnace","전기로 제작","crafting",{ironPlate:15,copper:10,steelPlate:10,carbon:8,basicCircuit:5,battery:2,gear:6},55],
  ["machine_doronium_furnace","도로늄 전기로 제작","auto_crafting",{steelPlate:25,titaniumPlate:15,copper:15,carbon:15,advancedCircuit:10,controlModule:5,largeBattery:3,doronium_normal:10},95],
  ["machine_wiremill","와이어 가공기 제작","crafting",{ironPlate:20,steelPlate:10,gear:6,motor:2,piston:2,basicCircuit:2,sensor:1},48],
  ["machine_oil_drill","원유 시추기 제작","auto_crafting",{steelPlate:35,steel:25,steelGear:12,piston:6,motor:4,midCircuit:3,sensor:4,steelWire:15},90],
  ["machine_rolling_mill","압연기 제작","auto_crafting",{steelPlate:30,steelGear:10,bearing:8,motor:4,piston:4,midCircuit:3,insulatedWire:10},82],
  ["machine_refinery","정제기 제작","auto_crafting",{steelPlate:40,titaniumPlate:15,steelGear:10,bearing:8,motor:5,midCircuit:5,sensor:5,controlModule:1,insulatedWire:15},95],
  ["machine_auto_crafter","자동 제작기 제작","crafting",{steelPlate:45,steelGear:12,bearing:8,piston:6,motor:6,midCircuit:6,sensor:5,controlModule:2,insulatedWire:20},100],
  ["machine_auto_miner","자동 채굴기 제작","auto_crafting",{steelPlate:50,titaniumPlate:20,steelGear:15,bearing:10,piston:8,motor:8,midCircuit:8,sensor:8,controlModule:3,insulatedWire:25,largeBattery:1},115],
  ["machine_auto_furnace","자동 용광로 제작","auto_crafting",{steelPlate:60,titaniumPlate:20,steelGear:15,bearing:10,motor:6,advancedCircuit:6,sensor:8,controlModule:3,insulatedWire:25,largeBattery:2},120],
  ["machine_auto_electric_furnace","자동 전기로 제작","auto_crafting",{titaniumPlate:70,steelPlate:30,titanium:20,steelGear:15,bearing:12,motor:8,advancedCircuit:8,sensor:10,controlModule:4,insulatedWire:30,largeBattery:3,transformer:2},145],
  ["machine_resource_copier","자원 복사기 제작","auto_crafting",{steelPlate:20,titaniumPlate:10,advancedCircuit:5,sensor:5,controlModule:3,diamond:5,largeBattery:2},92],
  ["machine_item_copier","아이템 복사기 제작","auto_crafting",{titaniumPlate:25,steelGear:10,advancedCircuit:10,controlModule:5,sensor:10,diamond:10,largeBattery:5,doronium_normal:5},120],
  ["machine_packager_1","1차 포장기 제작","crafting",{steelPlate:20,gear:6,motor:2,sensor:2,basicCircuit:2},36],
  ["machine_packager_2","2차 포장기 제작","auto_crafting",{steelPlate:30,steelGear:8,motor:3,midCircuit:3,sensor:4,insulatedWire:8},52],
  ["machine_packager_3","3차 포장기 제작","auto_crafting",{titaniumPlate:25,steelPlate:20,controlModule:2,sensor:8,advancedCircuit:4,insulatedWire:14},75],
  ["machine_storage","저장 창고 제작","crafting",{wood:20,ironPlate:10,ironScrew:20},30],
  ["machine_conveyor","컨테이너 벨트 제작","crafting",{ironPlate:15,ironScrew:20,gear:4,motor:1},24],
  ["machine_maglev_conveyor","자기부상 컨테이너 벨트 제작","auto_crafting",{steelPlate:25,neodymium:6,steelGear:6,motor:2,midCircuit:2,insulatedWire:8},55],
  ["machine_maglev_conveyor","자기부상 컨테이너 벨트 제작","auto_crafting",{steelPlate:25,neodymium:6,steelGear:6,motor:2,midCircuit:2,insulatedWire:8},55],
  ["machine_rapid_cooler","급속 냉각기 제작","auto_crafting",{titaniumPlate:30,steelPlate:20,coldCrystal:10,motor:4,bearing:6,midCircuit:4,sensor:4,insulatedWire:15,largeBattery:1},90],
  ["machine_dori_harvester","자동 도로늄 수확기 제작","auto_crafting",{steelPlate:40,titaniumPlate:30,steelGear:12,piston:6,motor:6,advancedCircuit:5,sensor:8,controlModule:3,insulatedWire:20,largeBattery:2},105],
  ["machine_carbon_extractor","탄소 추출기 제작","auto_crafting",{steelPlate:30,steelGear:8,piston:4,motor:4,midCircuit:4,sensor:3,insulatedWire:12},72],
  ["machine_wood_bridge","외나무다리 제작","crafting",{wood:10},12],
  ["machine_iron_bridge","철다리 제작","crafting",{ironPlate:20,ironScrew:20},24],
  ["machine_concrete_bridge","콘크리트 다리 제작","crafting",{concrete:30,ironPlate:15,ironScrew:25},40],
  ["machine_air_conditioner","에어컨 제작","crafting",{ironPlate:10,copper:5,motor:2,wire:5},25],
  ["machine_fan","환풍기 제작","crafting",{ironPlate:8,iron:5,motor:1,wire:3},18],
  ["machine_heater","히터 제작","crafting",{ironPlate:10,iron:8,motor:1,wire:5},22],
  ["machine_control_computer","통제 컴퓨터 제작","auto_crafting",{steelPlate:15,midCircuit:5,advancedCircuit:3,sensor:5,controlModule:2,wire:10},70],
  ["machine_solar_panel","태양광 패널 제작","crafting",{glass:10,silicon:8,copperWire:10,ironPlate:5,wire:10},35],
  ["machine_wind_turbine","풍력 발전기 제작","crafting",{steelPlate:20,steelGear:8,motor:2,bearing:4,wire:10,copperWire:5},42],
  ["machine_thermal_generator","화력 발전기 제작","auto_crafting",{steelPlate:30,steelGear:10,motor:3,piston:3,copperWire:10,midCircuit:3},58],
  ["machine_doronium_generator","도로늄 발전기 제작","auto_crafting",{titaniumPlate:40,doronium_normal:10,steelGear:12,motor:5,bearing:8,advancedCircuit:5,controlModule:3,copperWire:20,largeBattery:2},100],
  ["machine_shape_converter","형태 변환기 제작","auto_crafting",{titaniumPlate:30,steelPlate:40,steelGear:15,piston:8,motor:6,advancedCircuit:8,controlModule:4,sensor:8,insulatedWire:25,largeBattery:3,diamond:5},110],
  ["machine_magnetic_inserter","자성 삽입기 제작","auto_crafting",{titaniumPlate:35,steelPlate:30,neodymium:30,steelGear:12,bearing:8,motor:5,advancedCircuit:7,controlModule:4,sensor:6,insulatedWire:20,largeBattery:3},105],
  ["machine_item_elevator","아이템 엘리베이터 제작","crafting",{ironPlate:10,steel:5,motor:1,piston:2,gear:4,basicCircuit:2},35],
  ["machine_water_elevator","물 아이템 엘리베이터 제작","crafting",{steelPlate:15,rubber:5,motor:2,piston:3,bearing:3,midCircuit:3,waterBottle:5},45],
  ["machine_maglev_elevator","자기부상 아이템 엘리베이터 제작","auto_crafting",{titaniumPlate:20,neodymium:10,motor:4,bearing:6,advancedCircuit:5,controlModule:2,largeBattery:2},68],
  ["machine_sorter","아이템 분류기 제작","crafting",{ironPlate:8,gear:4,sensor:2,motor:1,basicCircuit:2},28],
  ["machine_merger","아이템 합류기 제작","crafting",{ironPlate:6,gear:3,motor:1,basicCircuit:1},22],
  ["machine_distributor","아이템 분배기 제작","crafting",{ironPlate:8,gear:4,motor:2,sensor:2,basicCircuit:2},30],
  ["machine_transformer","변압기 제작","auto_crafting",{copper:15,iron:10,steelPlate:5,wire:10,insulatedWire:5,midCircuit:3,largeBattery:1},52],
  ["machine_shipping_center","출하 센터 제작","auto_crafting",{steelPlate:20,ironPlate:15,gear:10,motor:3,sensor:5,midCircuit:5,controlModule:2},62],
  ["machine_quality_checker","품질 검사기 제작","crafting",{ironPlate:10,glass:5,sensor:5,led:3,midCircuit:3},32],
  ["machine_auto_quality_checker","자동 품질 검사기 제작","auto_crafting",{steelPlate:20,titaniumPlate:10,sensor:10,led:5,advancedCircuit:5,controlModule:3,motor:2},60],
  ["machine_doronium_compressor","도로늄 압축기 제작","auto_crafting",{doronium_normal:30,titaniumPlate:25,steelPlate:30,machine_high_pressure_compressor:2,machine_ultra_compressor:1,advancedCircuit:15,controlModule:8,largeBattery:5,transformer:3,diamond:15},145],
  ["machine_doronium_fusion","도로늄 융합기 제작","auto_crafting",{machine_doronium_compressor:1,machine_doronium_furnace:2,machine_ultra_compressor:3,titaniumPlate:40,advancedCircuit:20,controlModule:15,largeBattery:10,transformer:5,diamond:30,obsidian:30,gold:20,doronium_thermal_crystal:10,doronium_cold_crystal:10,doronium_ultra:5},240]
];
for (const [id,name,station,inputs,time] of machineRecipes) {
  const output=id;
  addRecipe("craft_"+id,name,station,inputs,output,1,time,null,null);
}

/* Three-stage packaging chains with tier-compatible cushions, boxes and crates. */
const packageTargets = [
  ["doriMeat","돌이 고기(하급)","low"],["doronium_normal","도로늄(일반)","normal"],
  ["doronium_blue","블루 도로늄","mid"],["doronium_red","레드 도로늄","mid"],
  ["doronium_iron","아이언 도로늄","mid"],["doronium_orange","오렌지 도로늄","normal"],
  ["doronium_slightly_rusted","약간 녹슨 도로늄","mid"],["doronium_rusted","녹슨 도로늄","low"],
  ["doronium_translucent","반투명 도로늄","high"],["doronium_thermal_crystal","열 도로늄 결정체","high"],
  ["doronium_cold_crystal","냉 도로늄 결정체","high"],["doronium_black","블랙 도로늄","normal"],
  ["doronium_yellow","황다도로늄","top"],["doronium_ultra","울트라 도로늄","omega"],
  ["doronium_special_edition","도로늄 스페셜 에디션","special"],
  ["doronium_limited_edition","도로늄 리미티드 에디션","limited"],["infinity","인피니티 도로늄","omega"]
];
for (const [id,name,tier] of packageTargets) {
  const p1="pack1_"+id,p2="pack2_"+id,p3="pack3_"+id;
  const t1=tier==="low"||tier==="normal"?{rubber:4}:
    tier==="mid"||tier==="high"?{barkWood:5}:
    (tier==="top"||tier==="special"||tier==="limited")?{barkWood:2,plantFiber:4,nylonCord:2,basicCircuit:1}:
    {barkWood:3,carbon:2,advancedCircuit:1,controlModule:1,insulatedWire:2};
  const t2=tier==="low"||tier==="normal"?{wood:10,iron:2}:
    tier==="mid"||tier==="high"?{barkWood:13}:
    tier==="top"?{marble:20}:
    tier==="special"?{marble:15,obsidian:2,gold:5,diamond:3}:
    tier==="limited"?{obsidian:15,gold:5}:{diamond:10,coldCrystal:5,heatCrystal:5};
  const t3=tier==="low"||tier==="normal"?{wood:20}:
    tier==="mid"?{ironPlate:20}:
    tier==="high"?{titaniumPlate:15}:
    tier==="top"?{controlModule:1,sensor:3,titaniumPlate:15}:
    tier==="special"?{controlModule:3,sensor:10,obsidian:15,gold:3}:
    tier==="limited"?{controlModule:5,sensor:30,obsidian:5,gold:5,diamond:10}:
    {controlModule:7,sensor:50,coldCrystal:10,heatCrystal:10,diamond:5};
  itemMap[p1]={name:"1차 포장된 "+name,icon:"📦",kind:"packaged",price:(itemMap[id]?.price||100)*1.05};
  itemMap[p2]={name:"2차 포장된 "+name,icon:"📦",kind:"packaged",price:(itemMap[id]?.price||100)*1.1};
  itemMap[p3]={name:"3차 포장된 "+name,icon:"🚚",kind:"packaged",price:(itemMap[id]?.price||100)*1.2};
  addRecipe("package1_"+id,"1차 포장 · "+name,"packager_1",{[id]:1,...t1},p1,1,8,null,null);
  addRecipe("package2_"+id,"2차 포장 · "+name,"packager_2",{[p1]:1,...t2},p2,1,12,null,null);
  addRecipe("package3_"+id,"3차 포장 · "+name,"packager_3",{[p2]:1,...t3},p3,1,16,null,null);
}

/* Explicit user-spec process windows. The optimum remains the target value;
   the safe min/max values determine whether a batch may progress. */
const recipeBands = {
  sandstone_compression:[20,300,100,300],
  steel_compression:[1300,1800,100,1200],
  titanium_compression:[1700,2200,200,1500],
  carbon_compression:[1500,2500,1000,2500],
  molten_iron:[1450,1700,0,500],
  molten_gold:[950,1200,0,300],
  molten_diamond:[3500,5000,8000,15000],
  molten_neodymium:[1800,2800,300,1800],
  neodymium_magnet_melt:[1100,1500,500,2000],
  molten_copper:[1000,1300,0,300],
  molten_nickel:[1400,1700,0,500],
  molten_lead:[300,500,0,200],
  molten_chromium:[1800,2100,100,700],
  rubber_from_sap:[150,350,0,50],
  rubber_from_oil:[150,350,0,50]
};
for(const [id,band] of Object.entries(recipeBands)){
  const recipe=R.find(([recipeId])=>recipeId===id)?.[1];
  if(recipe){
    recipe.safeTemperatureMin=band[0];recipe.safeTemperatureMax=band[1];
    recipe.safePressureMin=band[2];recipe.safePressureMax=band[3];
  }
}
const multiStationRecipes = {
  molten_glass:["furnace","electric_furnace","doronium_electric_furnace"],
  molten_reinforced_glass:["furnace","electric_furnace","doronium_electric_furnace"],
  molten_iron:["furnace","electric_furnace","doronium_electric_furnace"],
  molten_copper:["furnace","electric_furnace","doronium_electric_furnace"],
  molten_lead:["furnace","electric_furnace","doronium_electric_furnace"],
  molten_gold:["furnace","electric_furnace","doronium_electric_furnace"],
  molten_nickel:["electric_furnace","doronium_electric_furnace"],
  molten_chromium:["electric_furnace","doronium_electric_furnace"],
  molten_titanium:["electric_furnace","doronium_electric_furnace"],
  molten_steel:["furnace","electric_furnace","doronium_electric_furnace"],
  stainless_melt:["furnace","electric_furnace","doronium_electric_furnace"],
  reinforced_iron_melt:["furnace","electric_furnace","doronium_electric_furnace"],
  rubber_from_sap:["furnace","electric_furnace","doronium_electric_furnace"],
  rubber_from_oil:["furnace","electric_furnace","doronium_electric_furnace"],
  nylon:["electric_furnace","doronium_electric_furnace"],
  magnet_melt:["electric_furnace","doronium_electric_furnace"],
  neodymium_magnet_melt:["doronium_electric_furnace"]
};
for(const [id,stations] of Object.entries(multiStationRecipes)){
  const recipe=R.find(([recipeId])=>recipeId===id)?.[1];
  if(recipe)recipe.stations=stations;
}

export const CATALOG_ITEMS = itemMap;
export const CATALOG_RECIPES = Object.fromEntries(R);
export const CATALOG_ITEM_ROWS = itemRows;
export const CATALOG_MACHINE_ROWS = machineRows;
export const CATALOG_PACKAGE_TARGETS = packageTargets;
export function validateCatalog() {
  const errors=[];
  for (const [id,recipe] of Object.entries(CATALOG_RECIPES)) {
    for (const [ingredient,quantity] of Object.entries(recipe.inputs||{})) {
      if (!CATALOG_ITEMS[ingredient] && ![
        "wood","stone","water","ironOre","copperOre","coal","quartz","goldOre","diamond","ironPlate","wire","circuit","doriMeat",
        "doronium_normal","doronium_blue","doronium_red","doronium_iron","doronium_orange","doronium_thermal","doronium_cold",
        "doronium_black","doronium_clear","doronium_special","doronium_limited","doronium_crystal","doronium_resonant",
        "doronium_prismatic","doronium_void","infinity"
      ].includes(ingredient)) errors.push("unknown-input:"+id+":"+ingredient);
      if (!Number.isInteger(quantity) || quantity<=0) errors.push("invalid-quantity:"+id+":"+ingredient);
    }
    if (!CATALOG_ITEMS[recipe.output] && ![
      "wood","stone","water","ironOre","copperOre","coal","quartz","goldOre","diamond","ironPlate","wire","circuit","doriMeat",
      "doronium_normal","doronium_blue","doronium_red","doronium_iron","doronium_orange","doronium_thermal","doronium_cold",
      "doronium_black","doronium_clear","doronium_special","doronium_limited","doronium_crystal","doronium_resonant",
      "doronium_prismatic","doronium_void","infinity"
    ].includes(recipe.output)) errors.push("unknown-output:"+id+":"+recipe.output);
  }
  return {valid:errors.length===0,errors,itemCount:Object.keys(CATALOG_ITEMS).length,recipeCount:Object.keys(CATALOG_RECIPES).length,machineCount:CATALOG_MACHINES.length};
}
