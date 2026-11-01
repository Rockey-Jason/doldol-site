extends Node
## Canonical single source of truth. All simulation changes happen on a 0.10s fixed tick.
signal inventory_changed
signal progression_changed
signal objective_changed
signal toast_requested(message: String, severity: String)
signal simulation_tick(tick_index: int)

const SAVE_VERSION := 5
const FIXED_TICK := 0.10
const DORI_TREE_CYCLE_SEC := 60.0
const DORI_TREE_WATER_L := 2
const DORI_TREE_YIELD := 1
const INFINITY_INPUT_COUNT := 100
const INFINITY_OUTPUT_COUNT := 1
const INFINITY_REQUIRED_QUALITY := 90.0
const INFINITY_REQUIRED_PURITY := 90.0

const DORONUM_IDS: Array[String] = [
	"ITEM_DORONUM_NORMAL", "ITEM_DORONUM_YELLOW", "ITEM_DORONUM_ULTRA",
	"ITEM_DORONUM_BLUE", "ITEM_DORONUM_RED", "ITEM_DORONUM_IRON",
	"ITEM_DORONUM_ORANGE", "ITEM_DORONUM_SLIGHTLY_RUSTED", "ITEM_DORONUM_RUSTED",
	"ITEM_DORONUM_TRANSLUCENT", "ITEM_DORONUM_THERMAL_CRYSTAL",
	"ITEM_DORONUM_COLD_CRYSTAL", "ITEM_DORONUM_BLACK",
	"ITEM_DORONUM_SPECIAL_EDITION", "ITEM_DORONUM_LIMITED_EDITION"
]

const ITEM_DATA := {
	"ITEM_DIRT":{"name":"Dirt","group":"Raw","price":1},
	"ITEM_SAND":{"name":"Sand","group":"Raw","price":1},
	"ITEM_STONE":{"name":"Stone","group":"Raw","price":2},
	"ITEM_GRAVEL":{"name":"Gravel","group":"Raw","price":2},
	"ITEM_COAL":{"name":"Coal","group":"Raw","price":5},
	"ITEM_IRON_ORE":{"name":"Iron Ore","group":"Ore","price":7},
	"ITEM_COPPER_ORE":{"name":"Copper Ore","group":"Ore","price":8},
	"ITEM_NICKEL_ORE":{"name":"Nickel Ore","group":"Ore","price":12},
	"ITEM_LEAD_ORE":{"name":"Lead Ore","group":"Ore","price":9},
	"ITEM_MAGNETITE":{"name":"Magnetite","group":"Ore","price":12},
	"ITEM_CHROME_ORE":{"name":"Chrome Ore","group":"Ore","price":18},
	"ITEM_GOLD_ORE":{"name":"Gold Ore","group":"Ore","price":35},
	"ITEM_ALUMINUM_ORE":{"name":"Aluminum Ore","group":"Ore","price":14},
	"ITEM_TITANIUM_ORE":{"name":"Titanium Ore","group":"Ore","price":26},
	"ITEM_NEODYMIUM_ORE":{"name":"Neodymium Ore","group":"Ore","price":44},
	"ITEM_DIAMOND":{"name":"Diamond","group":"Rare","price":100},
	"ITEM_QUARTZ":{"name":"Quartz","group":"Raw","price":8},
	"ITEM_WOOD":{"name":"Wood","group":"Raw","price":3},
	"ITEM_BIRCH_WOOD":{"name":"Birch Wood","group":"Raw","price":4},
	"ITEM_RUBBER_SAP":{"name":"Rubber Sap","group":"Fluid","price":4},
	"ITEM_GRASS":{"name":"Grass","group":"Raw","price":1},
	"ITEM_PLANT_FIBER":{"name":"Plant Fiber","group":"Raw","price":2},
	"ITEM_BARK":{"name":"Bark","group":"Raw","price":2},
	"ITEM_WATER":{"name":"Water","group":"Fluid","price":1},
	"ITEM_DORI_MEAT":{"name":"Dori Meat","group":"Bio","price":55},
	"ITEM_PLANT_ROPE":{"name":"Plant Rope","group":"Part","price":4},
	"ITEM_IRON_ORE_CONCENTRATE":{"name":"Iron Ore Concentrate","group":"Part","price":10},
	"ITEM_MOLTEN_IRON":{"name":"Molten Iron","group":"Fluid","price":9},
	"ITEM_IRON":{"name":"Iron","group":"Metal","price":14},
	"ITEM_IRON_PLATE":{"name":"Iron Plate","group":"Part","price":25},
	"ITEM_STEEL":{"name":"Steel","group":"Metal","price":35},
	"ITEM_STEEL_PLATE":{"name":"Steel Plate","group":"Part","price":55},
	"ITEM_COPPER":{"name":"Copper","group":"Metal","price":15},
	"ITEM_COPPER_WIRE":{"name":"Copper Wire","group":"Part","price":18},
	"ITEM_GEAR":{"name":"Gear","group":"Part","price":28},
	"ITEM_BEARING":{"name":"Bearing","group":"Part","price":42},
	"ITEM_RUBBER":{"name":"Rubber","group":"Part","price":16},
	"ITEM_GLASS":{"name":"Glass","group":"Part","price":12},
	"ITEM_BASIC_CIRCUIT":{"name":"Basic Circuit","group":"Electronics","price":75},
	"ITEM_MOTOR":{"name":"Motor","group":"Part","price":120},
	"ITEM_BATTERY":{"name":"Battery","group":"Electronics","price":85},
	"ITEM_TRANSFORMER":{"name":"Transformer","group":"Electronics","price":240},
	"ITEM_PETROLEUM":{"name":"Petroleum","group":"Fluid","price":13},
	"ITEM_NYLON":{"name":"Nylon","group":"Part","price":32},
	"ITEM_TITANIUM":{"name":"Titanium","group":"Metal","price":65},
	"ITEM_TITANIUM_PLATE":{"name":"Titanium Plate","group":"Part","price":90},
	"ITEM_ALUMINUM_INGOT":{"name":"Aluminum Ingot","group":"Metal","price":25},
	"ITEM_ALUMINUM_PLATE":{"name":"Aluminum Plate","group":"Part","price":35},
	"ITEM_GOLD_INGOT":{"name":"Gold Ingot","group":"Metal","price":90},
	"ITEM_NICKEL_INGOT":{"name":"Nickel Ingot","group":"Metal","price":28},
	"ITEM_NEODYMIUM_MAGNET":{"name":"Neodymium Magnet","group":"Part","price":110},
	"ITEM_SENSOR":{"name":"Sensor","group":"Electronics","price":160},
	"ITEM_ADVANCED_CIRCUIT":{"name":"Advanced Circuit","group":"Electronics","price":320},
	"ITEM_CONTROL_MODULE":{"name":"Control Module","group":"Electronics","price":440},
	"ITEM_CARBON_POWDER":{"name":"Carbon Powder","group":"Part","price":8},
	"ITEM_HEAT_CRYSTAL":{"name":"Heat Crystal","group":"Crystal","price":150},
	"ITEM_COLD_CRYSTAL":{"name":"Cold Crystal","group":"Crystal","price":150},
	"ITEM_THERMAL_CRYSTAL":{"name":"Thermal Crystal","group":"Crystal","price":220},
	"ITEM_DORONUM_COLD_CRYSTAL":{"name":"Cold Doronum Crystal","group":"Doronum","price":1900},
	"ITEM_ULTRA_DORONUM":{"name":"Ultra Doronum","group":"Doronum","price":2100},
	"ITEM_DORONUM_NORMAL":{"name":"Normal Doronum","group":"Doronum","price":1200},
	"ITEM_DORONUM_YELLOW":{"name":"Yellow Doronum","group":"Doronum","price":1500},
	"ITEM_DORONUM_BLUE":{"name":"Blue Doronum","group":"Doronum","price":1600},
	"ITEM_DORONUM_RED":{"name":"Red Doronum","group":"Doronum","price":1650},
	"ITEM_DORONUM_IRON":{"name":"Iron Doronum","group":"Doronum","price":1750},
	"ITEM_DORONUM_ORANGE":{"name":"Orange Doronum","group":"Doronum","price":1800},
	"ITEM_DORONUM_SLIGHTLY_RUSTED":{"name":"Slightly Rusted Doronum","group":"Doronum","price":1900},
	"ITEM_DORONUM_RUSTED":{"name":"Rusted Doronum","group":"Doronum","price":2000},
	"ITEM_DORONUM_TRANSLUCENT":{"name":"Translucent Doronum","group":"Doronum","price":2200},
	"ITEM_DORONUM_THERMAL_CRYSTAL":{"name":"Thermal Doronum Crystal","group":"Doronum","price":2300},
	"ITEM_DORONUM_BLACK":{"name":"Black Doronum","group":"Doronum","price":2500},
	"ITEM_DORONUM_SPECIAL_EDITION":{"name":"Special Edition Doronum","group":"Doronum","price":3400},
	"ITEM_DORONUM_LIMITED_EDITION":{"name":"Limited Edition Doronum","group":"Doronum","price":5000},
	"ITEM_DORONUM_INFINITY":{"name":"Infinity Doronum","group":"Infinity","price":1000000}
}

const RESEARCH: Array[Dictionary] = [
	{"id":"RESEARCH_BASIC_SURVIVAL","tier":0,"rp":0,"seconds":0,"requires":[],"name":"Basic Survival","unlock":["WORKBENCH","WOODEN_PICKAXE","WOODEN_AXE","WOODEN_SHOVEL"]},
	{"id":"RESEARCH_BASIC_MINING","tier":1,"rp":50,"seconds":60,"requires":["RESEARCH_BASIC_SURVIVAL"],"name":"Basic Mining","unlock":["FURNACE","ORE_SCANNER","IRON_MINE"]},
	{"id":"RESEARCH_IRON_SMELTING","tier":1,"rp":100,"seconds":120,"requires":["RESEARCH_BASIC_MINING"],"name":"Iron Smelting","unlock":["FURNACE","IRON_INGOT","IRON_PLATE"]},
	{"id":"RESEARCH_MECHANICAL_PROCESSING","tier":2,"rp":250,"seconds":180,"requires":["RESEARCH_IRON_SMELTING"],"name":"Mechanical Processing","unlock":["COMPRESSOR","ROLLING_MILL","GEAR","BEARING"]},
	{"id":"RESEARCH_STEEL","tier":2,"rp":500,"seconds":300,"requires":["RESEARCH_MECHANICAL_PROCESSING"],"name":"Steel","unlock":["STEEL","STEEL_PLATE","HEAVY_FRAME"]},
	{"id":"RESEARCH_ELECTRIC_PROCESSING","tier":3,"rp":1000,"seconds":420,"requires":["RESEARCH_MECHANICAL_PROCESSING"],"name":"Electric Processing","unlock":["GENERATOR","POWER_NETWORK","BATTERY","TRANSFORMER"]},
	{"id":"RESEARCH_OIL_CHEMISTRY","tier":3,"rp":1500,"seconds":600,"requires":["RESEARCH_ELECTRIC_PROCESSING"],"name":"Oil Chemistry","unlock":["OIL_PUMP","REFINERY","RUBBER","NYLON"]},
	{"id":"RESEARCH_HIGH_PRESSURE","tier":3,"rp":2500,"seconds":900,"requires":["RESEARCH_MECHANICAL_PROCESSING","RESEARCH_ELECTRIC_PROCESSING"],"name":"High Pressure","unlock":["PRESSURE_VESSEL","SAFETY_VALVE","HIGH_PRESSURE_PARTS"]},
	{"id":"RESEARCH_TITANIUM","tier":4,"rp":4000,"seconds":1200,"requires":["RESEARCH_HIGH_PRESSURE","RESEARCH_STEEL"],"name":"Titanium","unlock":["TITANIUM_INGOT","TITANIUM_PLATE","DEEP_MINING_FRAME"]},
	{"id":"RESEARCH_ADVANCED_CIRCUITS","tier":4,"rp":6000,"seconds":1500,"requires":["RESEARCH_ELECTRIC_PROCESSING","RESEARCH_TITANIUM"],"name":"Advanced Circuits","unlock":["ADVANCED_CIRCUIT","SENSOR","CONTROL_MODULE","QUALITY_INSPECTOR"]},
	{"id":"RESEARCH_AUTOMATION","tier":4,"rp":9000,"seconds":1800,"requires":["RESEARCH_ADVANCED_CIRCUITS","RESEARCH_MECHANICAL_PROCESSING"],"name":"Automation","unlock":["AUTO_MINER","AUTO_FURNACE","AUTO_FABRICATOR","SORTER","BLUEPRINT"]},
	{"id":"RESEARCH_DORONUM_BIOLOGY","tier":5,"rp":12000,"seconds":2400,"requires":["RESEARCH_AUTOMATION","RESEARCH_ADVANCED_CIRCUITS"],"name":"Doronum Biology","unlock":["DORI_TREE_SCANNER","BIO_HARVEST","FERTILIZER","SYNTHETIC_INSPECTOR"]},
	{"id":"RESEARCH_DORONUM_ENGINEERING","tier":5,"rp":18000,"seconds":3000,"requires":["RESEARCH_DORONUM_BIOLOGY","RESEARCH_HIGH_PRESSURE"],"name":"Doronum Engineering","unlock":["DORONUM_COMPRESSOR","DORONUM_10_TO_1"]},
	{"id":"RESEARCH_DORONUM_CRYSTAL","tier":5,"rp":25000,"seconds":3600,"requires":["RESEARCH_DORONUM_ENGINEERING","RESEARCH_TITANIUM"],"name":"Doronum Crystal","unlock":["DORONUM_VARIANTS","PURIFIER","CRYSTAL_INSPECTOR"]},
	{"id":"RESEARCH_ULTRA_MATERIAL_PROCESSING","tier":6,"rp":35000,"seconds":4200,"requires":["RESEARCH_DORONUM_CRYSTAL","RESEARCH_HIGH_PRESSURE"],"name":"Ultra Material Processing","unlock":["ULTRA_DORONUM","ULTRA_PRESS","INTERLOCKS"]},
	{"id":"RESEARCH_DORONUM_COMPRESSOR","tier":6,"rp":50000,"seconds":5400,"requires":["RESEARCH_ULTRA_MATERIAL_PROCESSING","RESEARCH_AUTOMATION"],"name":"Advanced Doronum Compressor","unlock":["AUTO_DORI_HARVESTER","ADVANCED_COMPRESSOR","COOLING_SYSTEM"]},
	{"id":"RESEARCH_DORONUM_FUSION","tier":6,"rp":75000,"seconds":7200,"requires":["RESEARCH_DORONUM_COMPRESSOR","RESEARCH_DORONUM_CRYSTAL"],"name":"Doronum Fusion","unlock":["INFINITY_FUSION_MACHINE","FIRST_FACTORY_RESONANCE_CHAMBER"]},
	{"id":"RESEARCH_INFINITY_INDUSTRY","tier":7,"rp":150000,"seconds":10800,"requires":["RESEARCH_DORONUM_FUSION","RESEARCH_DORONUM_ENGINEERING","RESEARCH_AUTOMATION"],"name":"Infinity Industry","unlock":["INFINITY_FUSION_RECIPE","STABILIZATION_RELAY","STABILIZATION_CORE"]}
]

const SKILLS: Array[Dictionary] = [
	{"id":"FIELD_SURVEYOR","branch":"Exploration","tier":1,"requires":[],"effect":"Scanner range +10%"},
	{"id":"GEOLOGICAL_READOUT","branch":"Exploration","tier":2,"requires":["FIELD_SURVEYOR"],"effect":"Narrower vein quantity estimate"},
	{"id":"SAFE_PATHFINDER","branch":"Exploration","tier":3,"requires":["FIELD_SURVEYOR","GEOLOGICAL_READOUT"],"effect":"Earlier hazard and safe-route warnings"},
	{"id":"ARCHIVE_SPECIALIST","branch":"Exploration","tier":4,"requires":["FIELD_SURVEYOR","GEOLOGICAL_READOUT","SAFE_PATHFINDER"],"effect":"Reveal related archive clue links"},
	{"id":"STEADY_SWING","branch":"Extraction","tier":1,"requires":[],"effect":"Mining speed +10%"},
	{"id":"VEIN_EFFICIENCY","branch":"Extraction","tier":2,"requires":["STEADY_SWING"],"effect":"Byproduct chance +2 percentage points"},
	{"id":"HARDPOINT_CALIBRATION","branch":"Extraction","tier":3,"requires":["STEADY_SWING","VEIN_EFFICIENCY"],"effect":"Tool wear -10%"},
	{"id":"DEEP_EXTRACTION","branch":"Extraction","tier":4,"requires":["STEADY_SWING","VEIN_EFFICIENCY","HARDPOINT_CALIBRATION"],"effect":"Deep zone scanner and miner warnings"},
	{"id":"PRECISE_ALIGNMENT","branch":"Manufacturing","tier":1,"requires":[],"effect":"Repair condition +10%"},
	{"id":"RECIPE_DISCIPLINE","branch":"Manufacturing","tier":2,"requires":["PRECISE_ALIGNMENT"],"effect":"Allowed recipe quality modifier +2"},
	{"id":"PROCESS_CONTROL","branch":"Manufacturing","tier":3,"requires":["PRECISE_ALIGNMENT","RECIPE_DISCIPLINE"],"effect":"Earlier sensor deviation detection"},
	{"id":"FAULT_DIAGNOSTICS","branch":"Manufacturing","tier":4,"requires":["PRECISE_ALIGNMENT","RECIPE_DISCIPLINE","PROCESS_CONTROL"],"effect":"More detailed failure forecasts"},
	{"id":"CONVEYOR_PLANNER","branch":"Logistics","tier":1,"requires":[],"effect":"Preview port and distance errors"},
	{"id":"BUFFER_ENGINEER","branch":"Logistics","tier":2,"requires":["CONVEYOR_PLANNER"],"effect":"Buffer building material cost -5%"},
	{"id":"BLUEPRINT_TECHNICIAN","branch":"Logistics","tier":3,"requires":["CONVEYOR_PLANNER","BUFFER_ENGINEER"],"effect":"Blueprint save and load"},
	{"id":"FLOW_OPTIMIZATION","branch":"Logistics","tier":4,"requires":["CONVEYOR_PLANNER","BUFFER_ENGINEER","BLUEPRINT_TECHNICIAN"],"effect":"Show top three throughput bottlenecks"},
	{"id":"SAMPLE_EFFICIENCY","branch":"Research & Doronum","tier":1,"requires":[],"effect":"Allowed research sample use -5%"},
	{"id":"MATERIAL_ANALYST","branch":"Research & Doronum","tier":2,"requires":["SAMPLE_EFFICIENCY"],"effect":"Detailed quality and purity sources"},
	{"id":"CRYSTAL_LATTICE","branch":"Research & Doronum","tier":3,"requires":["SAMPLE_EFFICIENCY","MATERIAL_ANALYST"],"effect":"Expanded Doronum lattice inspection"},
	{"id":"INFINITY_SAFETY","branch":"Research & Doronum","tier":4,"requires":["SAMPLE_EFFICIENCY","MATERIAL_ANALYST","CRYSTAL_LATTICE"],"effect":"Detailed Infinity preflight diagnostics"}
]

const FUSION_STAGES: Array[Dictionary] = [
	{"name":"Material Analysis","temp_c":500.0,"pressure_mpa":100.0,"power_mw":0.5,"seconds":20.0},
	{"name":"Energy Separation","temp_c":1200.0,"pressure_mpa":500.0,"power_mw":1.0,"seconds":25.0},
	{"name":"Equilibrium","temp_c":1800.0,"pressure_mpa":1000.0,"power_mw":1.5,"seconds":30.0},
	{"name":"High Pressure Compression","temp_c":2500.0,"pressure_mpa":5000.0,"power_mw":2.5,"seconds":35.0},
	{"name":"Fusion","temp_c":3500.0,"pressure_mpa":10000.0,"power_mw":3.5,"seconds":40.0},
	{"name":"Nucleus Formation","temp_c":4500.0,"pressure_mpa":15000.0,"power_mw":4.5,"seconds":50.0},
	{"name":"Infinite Crystallization","temp_c":5000.0,"pressure_mpa":20000.0,"power_mw":5.0,"seconds":60.0}
]

const MACHINE_DEFS := {
	"WORKBENCH":{"name":"Workbench","tier":0,"category":"Crafting","footprint":Vector2i(2,2),"power_kw":0,"cost":{"ITEM_WOOD":12,"ITEM_STONE":6},"recipe":"","kind":"crafting"},
	"FURNACE":{"name":"Furnace","tier":1,"category":"Processing","footprint":Vector2i(2,2),"power_kw":0,"cost":{"ITEM_STONE":12,"ITEM_CLAY":4},"recipe":"IRON_SMELTING","kind":"furnace"},
	"COMPRESSOR":{"name":"Compressor","tier":2,"category":"Processing","footprint":Vector2i(3,3),"power_kw":25,"cost":{"ITEM_IRON_PLATE":12,"ITEM_GEAR":4},"recipe":"IRON_COMPRESSION","kind":"compressor"},
	"ROLLING_MILL":{"name":"Rolling Mill","tier":2,"category":"Processing","footprint":Vector2i(3,2),"power_kw":20,"cost":{"ITEM_IRON_PLATE":8,"ITEM_GEAR":4},"recipe":"IRON_PLATE","kind":"mill"},
	"GEAR_STATION":{"name":"Gear Station","tier":2,"category":"Crafting","footprint":Vector2i(2,2),"power_kw":12,"cost":{"ITEM_IRON":6,"ITEM_IRON_PLATE":4},"recipe":"GEAR","kind":"assembler"},
	"BEARING_STATION":{"name":"Bearing Station","tier":2,"category":"Crafting","footprint":Vector2i(2,2),"power_kw":14,"cost":{"ITEM_IRON":5,"ITEM_RUBBER":2},"recipe":"BEARING","kind":"assembler"},
	"GENERATOR":{"name":"Thermal Generator","tier":3,"category":"Power","footprint":Vector2i(3,3),"power_kw":0,"cost":{"ITEM_COPPER_WIRE":10,"ITEM_GEAR":4,"ITEM_BASIC_CIRCUIT":3},"recipe":"","kind":"generator"},
	"SOLAR_PANEL":{"name":"Solar Array","tier":3,"category":"Power","footprint":Vector2i(2,3),"power_kw":0,"cost":{"ITEM_ALUMINUM_PLATE":8,"ITEM_COPPER_WIRE":6,"ITEM_GLASS":4},"recipe":"","kind":"solar"},
	"BATTERY":{"name":"Industrial Battery","tier":3,"category":"Power","footprint":Vector2i(2,2),"power_kw":2,"cost":{"ITEM_LEAD_ORE":8,"ITEM_COPPER_WIRE":6,"ITEM_RUBBER":4},"recipe":"","kind":"battery"},
	"TRANSFORMER":{"name":"Transformer","tier":3,"category":"Power","footprint":Vector2i(2,2),"power_kw":3,"cost":{"ITEM_STEEL_PLATE":8,"ITEM_COPPER_WIRE":14,"ITEM_BASIC_CIRCUIT":4},"recipe":"","kind":"transformer"},
	"CONVEYOR":{"name":"Conveyor Belt","tier":3,"category":"Logistics","footprint":Vector2i(2,1),"power_kw":1,"cost":{"ITEM_IRON_PLATE":2,"ITEM_GEAR":1},"recipe":"","kind":"conveyor"},
	"SORTER":{"name":"Sorter","tier":3,"category":"Logistics","footprint":Vector2i(2,2),"power_kw":2,"cost":{"ITEM_IRON_PLATE":4,"ITEM_BASIC_CIRCUIT":2},"recipe":"","kind":"sorter"},
	"MERGER":{"name":"Merger","tier":3,"category":"Logistics","footprint":Vector2i(2,2),"power_kw":2,"cost":{"ITEM_IRON_PLATE":4,"ITEM_GEAR":2},"recipe":"","kind":"merger"},
	"WAREHOUSE":{"name":"Warehouse","tier":3,"category":"Logistics","footprint":Vector2i(4,4),"power_kw":2,"cost":{"ITEM_STEEL_PLATE":10,"ITEM_IRON_PLATE":10,"ITEM_BASIC_CIRCUIT":2},"recipe":"","kind":"warehouse"},
	"REFINERY":{"name":"Refinery","tier":3,"category":"Processing","footprint":Vector2i(4,3),"power_kw":35,"cost":{"ITEM_STEEL_PLATE":12,"ITEM_COPPER_WIRE":12,"ITEM_GEAR":8},"recipe":"OIL_TO_PETROLEUM","kind":"refinery"},
	"PIPE_PUMP":{"name":"Industrial Pump","tier":3,"category":"Fluid","footprint":Vector2i(2,2),"power_kw":8,"cost":{"ITEM_IRON_PLATE":6,"ITEM_MOTOR":1},"recipe":"","kind":"pump"},
	"AUTO_MINER":{"name":"Auto Miner","tier":4,"category":"Mining","footprint":Vector2i(3,3),"power_kw":75,"cost":{"ITEM_MOTOR":1,"ITEM_STEEL_PLATE":10,"ITEM_TITANIUM_PLATE":5,"ITEM_ADVANCED_CIRCUIT":3,"ITEM_CONTROL_MODULE":1,"ITEM_GEAR":5,"ITEM_IRON":10,"ITEM_BATTERY":2},"recipe":"","kind":"auto_miner"},
	"AUTO_FURNACE":{"name":"Auto Furnace","tier":4,"category":"Processing","footprint":Vector2i(3,3),"power_kw":90,"cost":{"ITEM_STEEL_PLATE":20,"ITEM_MOTOR":2,"ITEM_ADVANCED_CIRCUIT":3,"ITEM_CONTROL_MODULE":2,"ITEM_COPPER_WIRE":10},"recipe":"","kind":"auto_furnace"},
	"AUTO_FABRICATOR":{"name":"Auto Fabricator","tier":4,"category":"Crafting","footprint":Vector2i(4,4),"power_kw":120,"cost":{"ITEM_STEEL_PLATE":30,"ITEM_TITANIUM_PLATE":10,"ITEM_MOTOR":4,"ITEM_ADVANCED_CIRCUIT":5,"ITEM_CONTROL_MODULE":3,"ITEM_SENSOR":4},"recipe":"","kind":"fabricator"},
	"QUALITY_INSPECTOR":{"name":"Quality Inspector","tier":4,"category":"Quality","footprint":Vector2i(2,2),"power_kw":12,"cost":{"ITEM_ALUMINUM_PLATE":8,"ITEM_GLASS":4,"ITEM_SENSOR":3,"ITEM_ADVANCED_CIRCUIT":2,"ITEM_CONTROL_MODULE":1},"recipe":"","kind":"inspector"},
	"DORI_HARVESTER":{"name":"Auto Dori Harvester","tier":6,"category":"Bio","footprint":Vector2i(3,3),"power_kw":20,"cost":{"ITEM_STEEL_PLATE":18,"ITEM_MOTOR":2,"ITEM_ADVANCED_CIRCUIT":4,"ITEM_CONTROL_MODULE":2},"recipe":"","kind":"harvester"},
	"DORONUM_COMPRESSOR":{"name":"Doronum Compressor","tier":5,"category":"Doronum","footprint":Vector2i(6,6),"power_kw":1500,"cost":{"ITEM_STEEL_PLATE":50,"ITEM_TITANIUM_PLATE":25,"ITEM_ADVANCED_CIRCUIT":20,"ITEM_CONTROL_MODULE":10,"ITEM_DORONUM_BLUE":5,"ITEM_DORONUM_RED":5,"ITEM_HEAT_CRYSTAL":10,"ITEM_COLD_CRYSTAL":10},"recipe":"DORONUM_NORMAL","kind":"doronium"},
	"ULTRA_MATERIAL_PRESS":{"name":"Ultra Material Press","tier":6,"category":"Doronum","footprint":Vector2i(5,5),"power_kw":3000,"cost":{"ITEM_STEEL_PLATE":80,"ITEM_TITANIUM_PLATE":40,"ITEM_ULTRA_DORONUM":5,"ITEM_ADVANCED_CIRCUIT":20,"ITEM_CONTROL_MODULE":10,"ITEM_THERMAL_CRYSTAL":5,"ITEM_COLD_CRYSTAL":5},"recipe":"","kind":"press"},
	"COOLING_TOWER":{"name":"Superconducting Cooling Tower","tier":6,"category":"Safety","footprint":Vector2i(4,4),"power_kw":60,"cost":{"ITEM_STEEL_PLATE":25,"ITEM_COPPER_WIRE":15,"ITEM_ADVANCED_CIRCUIT":8},"recipe":"","kind":"cooling"},
	"POWER_BUFFER":{"name":"Independent Power Buffer","tier":6,"category":"Power","footprint":Vector2i(4,3),"power_kw":10,"cost":{"ITEM_STEEL_PLATE":30,"ITEM_BATTERY":12,"ITEM_ADVANCED_CIRCUIT":8},"recipe":"","kind":"power_buffer"},
	"SHIELDING":{"name":"Isolation Shield","tier":6,"category":"Safety","footprint":Vector2i(4,4),"power_kw":10,"cost":{"ITEM_STEEL_PLATE":30,"ITEM_TITANIUM_PLATE":20,"ITEM_GLASS":10},"recipe":"","kind":"shielding"},
	"EMERGENCY_CUTOFF":{"name":"Emergency Cutoff Circuit","tier":6,"category":"Safety","footprint":Vector2i(2,2),"power_kw":2,"cost":{"ITEM_ADVANCED_CIRCUIT":8,"ITEM_CONTROL_MODULE":4,"ITEM_SENSOR":4},"recipe":"","kind":"cutoff"},
	"INFINITY_FUSION_MACHINE":{"name":"Infinity Fusion Machine","tier":7,"category":"Infinity","footprint":Vector2i(8,8),"power_kw":5000,"cost":{"ITEM_STEEL_PLATE":200,"ITEM_TITANIUM_PLATE":100,"ITEM_ULTRA_DORONUM":20,"ITEM_ADVANCED_CIRCUIT":50,"ITEM_CONTROL_MODULE":25,"ITEM_THERMAL_CRYSTAL":10,"ITEM_COLD_CRYSTAL":10,"ITEM_DORONUM_BLUE":10,"ITEM_DORONUM_IRON":10},"recipe":"INFINITY_FUSION","kind":"fusion"},
	"STABILIZATION_RELAY":{"name":"Planetary Stabilization Relay","tier":7,"category":"Infinity","footprint":Vector2i(3,3),"power_kw":20,"cost":{"ITEM_STEEL_PLATE":50,"ITEM_TITANIUM_PLATE":25,"ITEM_ADVANCED_CIRCUIT":10,"ITEM_CONTROL_MODULE":5,"ITEM_DORONUM_ORANGE":3,"ITEM_DORONUM_BLUE":2},"recipe":"","kind":"relay"},
	"STABILIZATION_CORE":{"name":"Central Stabilization Core","tier":7,"category":"Infinity","footprint":Vector2i(5,5),"power_kw":40,"cost":{"ITEM_STEEL_PLATE":100,"ITEM_TITANIUM_PLATE":50,"ITEM_ADVANCED_CIRCUIT":25,"ITEM_CONTROL_MODULE":15,"ITEM_ULTRA_DORONUM":5,"ITEM_DORONUM_TRANSLUCENT":5,"ITEM_DORONUM_BLACK":5},"recipe":"","kind":"core"}
}

const RECIPES := {
	"PLANT_ROPE":{"inputs":{"ITEM_PLANT_FIBER":3},"outputs":{"ITEM_PLANT_ROPE":1},"seconds":5,"machine":"WORKBENCH","tier":0},
	"WOODEN_PICKAXE":{"inputs":{"ITEM_WOOD":5,"ITEM_STONE":2,"ITEM_PLANT_ROPE":2},"outputs":{"ITEM_WOODEN_PICKAXE":1},"seconds":8,"machine":"WORKBENCH","tier":0},
	"WORKBENCH":{"inputs":{"ITEM_WOOD":12,"ITEM_STONE":6},"outputs":{"BUILDING_WORKBENCH":1},"seconds":10,"machine":"","tier":0},
	"IRON_SMELTING":{"inputs":{"ITEM_IRON_ORE":2,"ITEM_COAL":1},"outputs":{"ITEM_MOLTEN_IRON":1},"seconds":12,"machine":"FURNACE","tier":1,"temperature":1538.0},
	"IRON_COMPRESSION":{"inputs":{"ITEM_MOLTEN_IRON":1},"outputs":{"ITEM_IRON":1},"seconds":8,"machine":"COMPRESSOR","tier":2,"pressure":100.0},
	"IRON_PLATE":{"inputs":{"ITEM_IRON":1},"outputs":{"ITEM_IRON_PLATE":1},"seconds":8,"machine":"ROLLING_MILL","tier":2},
	"GEAR":{"inputs":{"ITEM_IRON":2,"ITEM_IRON_PLATE":1},"outputs":{"ITEM_GEAR":1},"seconds":8,"machine":"GEAR_STATION","tier":2},
	"BEARING":{"inputs":{"ITEM_IRON":1,"ITEM_RUBBER":1},"outputs":{"ITEM_BEARING":1},"seconds":10,"machine":"BEARING_STATION","tier":2},
	"COPPER_WIRE":{"inputs":{"ITEM_COPPER_ORE":1},"outputs":{"ITEM_COPPER_WIRE":2},"seconds":8,"machine":"ROLLING_MILL","tier":2},
	"BASIC_CIRCUIT":{"inputs":{"ITEM_COPPER_WIRE":4,"ITEM_QUARTZ":1,"ITEM_CARBON_POWDER":1},"outputs":{"ITEM_BASIC_CIRCUIT":1},"seconds":12,"machine":"WORKBENCH","tier":2},
	"MOTOR":{"inputs":{"ITEM_COPPER_WIRE":6,"ITEM_GEAR":2,"ITEM_BEARING":2,"ITEM_MAGNETITE":2},"outputs":{"ITEM_MOTOR":1},"seconds":20,"machine":"GEAR_STATION","tier":2},
	"STEEL":{"inputs":{"ITEM_IRON":2,"ITEM_COAL":1},"outputs":{"ITEM_STEEL":1},"seconds":16,"machine":"FURNACE","tier":2,"temperature":1650.0},
	"STEEL_PLATE":{"inputs":{"ITEM_STEEL":1},"outputs":{"ITEM_STEEL_PLATE":1},"seconds":12,"machine":"ROLLING_MILL","tier":2},
	"OIL_TO_PETROLEUM":{"inputs":{"ITEM_RUBBER_SAP":5},"outputs":{"ITEM_PETROLEUM":7},"seconds":20,"machine":"REFINERY","tier":3},
	"BATTERY":{"inputs":{"ITEM_LEAD_ORE":3,"ITEM_COPPER_WIRE":4,"ITEM_RUBBER":2},"outputs":{"ITEM_BATTERY":1},"seconds":18,"machine":"AUTO_FABRICATOR","tier":3},
	"TRANSFORMER":{"inputs":{"ITEM_BATTERY":1,"ITEM_COPPER":4,"ITEM_STEEL_PLATE":3,"ITEM_BASIC_CIRCUIT":2},"outputs":{"ITEM_TRANSFORMER":1},"seconds":25,"machine":"AUTO_FABRICATOR","tier":3},
	"ADVANCED_CIRCUIT":{"inputs":{"ITEM_BASIC_CIRCUIT":3,"ITEM_GOLD_INGOT":2,"ITEM_NICKEL_INGOT":2,"ITEM_QUARTZ":2,"ITEM_COPPER_WIRE":5},"outputs":{"ITEM_ADVANCED_CIRCUIT":1},"seconds":25,"machine":"AUTO_FABRICATOR","tier":4},
	"CONTROL_MODULE":{"inputs":{"ITEM_ADVANCED_CIRCUIT":2,"ITEM_SENSOR":2,"ITEM_BATTERY":1,"ITEM_NEODYMIUM_MAGNET":1},"outputs":{"ITEM_CONTROL_MODULE":1},"seconds":30,"machine":"AUTO_FABRICATOR","tier":4},
	"DORONUM_NORMAL":{"inputs":{"ITEM_DORI_MEAT":10},"outputs":{"ITEM_DORONUM_NORMAL":1},"seconds":20,"machine":"DORONUM_COMPRESSOR","tier":5,"temperature":900.0,"pressure":500.0,"allow_synthetic":false},
	"DORONUM_YELLOW":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_GOLD_INGOT":2,"ITEM_QUARTZ":1},"outputs":{"ITEM_DORONUM_YELLOW":1},"seconds":25,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_ULTRA":{"inputs":{"ITEM_DORONUM_NORMAL":3,"ITEM_TITANIUM_PLATE":2,"ITEM_DIAMOND":1},"outputs":{"ITEM_ULTRA_DORONUM":1},"seconds":35,"machine":"ULTRA_MATERIAL_PRESS","tier":6},
	"DORONUM_BLUE":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_COLD_CRYSTAL":2,"ITEM_WATER":4},"outputs":{"ITEM_DORONUM_BLUE":1},"seconds":25,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_RED":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_HEAT_CRYSTAL":2,"ITEM_CHROME_ORE":2},"outputs":{"ITEM_DORONUM_RED":1},"seconds":25,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_IRON":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_IRON_PLATE":4},"outputs":{"ITEM_DORONUM_IRON":1},"seconds":28,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_ORANGE":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_COPPER_WIRE":8,"ITEM_GOLD_INGOT":1},"outputs":{"ITEM_DORONUM_ORANGE":1},"seconds":28,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_SLIGHTLY_RUSTED":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_IRON_ORE":3,"ITEM_WATER":2},"outputs":{"ITEM_DORONUM_SLIGHTLY_RUSTED":1},"seconds":30,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_RUSTED":{"inputs":{"ITEM_DORONUM_SLIGHTLY_RUSTED":2,"ITEM_COAL":4,"ITEM_IRON_ORE":3},"outputs":{"ITEM_DORONUM_RUSTED":1},"seconds":32,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_TRANSLUCENT":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_QUARTZ":6,"ITEM_GLASS":2},"outputs":{"ITEM_DORONUM_TRANSLUCENT":1},"seconds":32,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_THERMAL_CRYSTAL":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_THERMAL_CRYSTAL":2,"ITEM_HEAT_CRYSTAL":1},"outputs":{"ITEM_DORONUM_THERMAL_CRYSTAL":1},"seconds":36,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_COLD_CRYSTAL":{"inputs":{"ITEM_DORONUM_NORMAL":2,"ITEM_COLD_CRYSTAL":2,"ITEM_WATER":4},"outputs":{"ITEM_DORONUM_COLD_CRYSTAL":1},"seconds":36,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_BLACK":{"inputs":{"ITEM_DORONUM_NORMAL":3,"ITEM_COAL":10,"ITEM_ADVANCED_CIRCUIT":1},"outputs":{"ITEM_DORONUM_BLACK":1},"seconds":40,"machine":"DORONUM_COMPRESSOR","tier":5},
	"DORONUM_SPECIAL_EDITION":{"inputs":{"ITEM_DORONUM_NORMAL":4,"ITEM_DIAMOND":2,"ITEM_DORONUM_TRANSLUCENT":1},"outputs":{"ITEM_DORONUM_SPECIAL_EDITION":1},"seconds":55,"machine":"ULTRA_MATERIAL_PRESS","tier":6},
	"DORONUM_LIMITED_EDITION":{"inputs":{"ITEM_DORONUM_NORMAL":5,"ITEM_GOLD_INGOT":4,"ITEM_DIAMOND":3,"ITEM_DORONUM_BLACK":1},"outputs":{"ITEM_DORONUM_LIMITED_EDITION":1},"seconds":65,"machine":"ULTRA_MATERIAL_PRESS","tier":6}
}

var inventory: Array[Dictionary] = []
var research_points: int = 0
var skill_points: int = 1
var completed_research: Array[String] = ["RESEARCH_BASIC_SURVIVAL"]
var purchased_skills: Array[String] = []
var active_research: String = ""
var research_progress: float = 0.0
var buildings: Array[Dictionary] = []
var world_state: Dictionary = {}
var story_flags: Dictionary = {}
var reward_ledger: Dictionary = {}
var fusion_job: Dictionary = {}
var relay_instances: Array[Dictionary] = []
var core_installed := false
var stabilization_state := "NOT_STARTED"
var campaign_stage := 0
var player_state := {"position": Vector3.ZERO, "health": 100.0, "stamina": 100.0, "equipped_tool":"ITEM_TOOL_HANDS"}
var currency_d := 0
var simulation_tick := 0
var paused := false
var _accumulator := 0.0
var _rng := RandomNumberGenerator.new()
var _save_timer := 0.0
var save_path := "user://doronium_factory_save_v5.json"
var mobile_move_input := Vector2.ZERO
var selected_building_type := ""
var selected_machine_id := ""

func _ready() -> void:
	_rng.seed = 827142
	load_game()
	if inventory.is_empty():
		_seed_starting_inventory()

func _process(delta: float) -> void:
	_save_timer += delta
	if _save_timer >= 30.0:
		_save_timer = 0.0
		save_game()
	if paused:
		return
	_accumulator += minf(delta, 0.25)
	var safety_steps := 0
	while _accumulator >= FIXED_TICK and safety_steps < 8:
		_accumulator -= FIXED_TICK
		simulation_tick += 1
		simulation_tick_event()
		simulation_tick.emit(simulation_tick)
		safety_steps += 1

func simulation_tick_event() -> void:
	if not active_research.is_empty():
		_advance_research(FIXED_TICK)

func _seed_starting_inventory() -> void:
	add_item("ITEM_WOOD", 10, 90.0, 90.0, false, "STARTER")
	add_item("ITEM_STONE", 6, 90.0, 90.0, false, "STARTER")
	add_item("ITEM_GRASS", 8, 90.0, 90.0, false, "STARTER")
	add_item("ITEM_PLANT_FIBER", 2, 90.0, 90.0, false, "STARTER")
	add_item("ITEM_WATER", 4, 100.0, 100.0, false, "STARTER")
	add_item("ITEM_COAL", 4, 85.0, 88.0, false, "STARTER")

func new_stack_id() -> String:
	return "STACK-" + Crypto.new().generate_random_bytes(16).hex_encode().to_upper()

func add_item(item_id: String, quantity: int, quality: float = 90.0, purity: float = 90.0, synthetic: bool = false, origin: String = "UNKNOWN") -> bool:
	if quantity <= 0 or not ITEM_DATA.has(item_id):
		return false
	var remaining := quantity
	for stack in inventory:
		if stack.item_id == item_id and stack.synthetic == synthetic and stack.origin == origin and is_equal_approx(stack.quality, quality) and is_equal_approx(stack.purity, purity) and int(stack.quantity) < 100:
			var moved := mini(remaining, 100 - int(stack.quantity))
			stack.quantity += moved
			remaining -= moved
			if remaining <= 0:
				inventory_changed.emit()
				return true
	if remaining > 0:
		inventory.append({"stack_id":new_stack_id(),"item_id":item_id,"quantity":remaining,"quality":clampf(quality,0.0,100.0),"purity":clampf(purity,0.0,100.0),"synthetic":synthetic,"origin":origin,"contamination":"NONE"})
	inventory_changed.emit()
	return true

func count_item(item_id: String) -> int:
	var total := 0
	for stack in inventory:
		if stack.item_id == item_id:
			total += int(stack.quantity)
	return total

func item_average(item_id: String) -> Dictionary:
	var q_total := 0.0
	var p_total := 0.0
	var weight := 0
	var synthetic := false
	for stack in inventory:
		if stack.item_id == item_id:
			var amount := int(stack.quantity)
			q_total += float(stack.quality) * amount
			p_total += float(stack.purity) * amount
			weight += amount
			synthetic = synthetic or bool(stack.synthetic)
	return {"quality":q_total / maxf(1.0,float(weight)),"purity":p_total / maxf(1.0,float(weight)),"synthetic":synthetic,"quantity":weight}

func can_afford(requirements: Dictionary) -> bool:
	for item_id in requirements:
		if count_item(str(item_id)) < int(requirements[item_id]):
			return false
	return true

func remove_item(item_id: String, quantity: int) -> bool:
	if quantity <= 0 or count_item(item_id) < quantity:
		return false
	var remaining := quantity
	inventory.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return str(a.stack_id) < str(b.stack_id))
	for i in range(inventory.size() - 1, -1, -1):
		var stack: Dictionary = inventory[i]
		if stack.item_id != item_id:
			continue
		var take := mini(remaining, int(stack.quantity))
		stack.quantity -= take
		remaining -= take
		if int(stack.quantity) <= 0:
			inventory.remove_at(i)
		if remaining <= 0:
			break
	inventory_changed.emit()
	return true

func craft(recipe_id: String) -> bool:
	if not RECIPES.has(recipe_id):
		toast_requested.emit("Unknown recipe: " + recipe_id, "error")
		return false
	var recipe: Dictionary = RECIPES[recipe_id]
	if int(recipe.tier) > current_tier():
		toast_requested.emit("Required Tier is not unlocked.", "warning")
		return false
	if not can_afford(recipe.inputs):
		toast_requested.emit("Not enough materials for " + recipe_id, "warning")
		return false
	if recipe.get("allow_synthetic", true) == false:
		for item_id in recipe.inputs:
			if str(item_id).begins_with("ITEM_DORI_MEAT") and item_average(str(item_id)).synthetic:
				toast_requested.emit("Synthetic Dori Meat is rejected by Doronum processing.", "error")
				return false
	var snapshot := inventory.duplicate(true)
	for item_id in recipe.inputs:
		if not remove_item(str(item_id), int(recipe.inputs[item_id])):
			inventory = snapshot
			inventory_changed.emit()
			return false
	for item_id in recipe.outputs:
		var q := 90.0
		var p := 90.0
		var synthetic := false
		for input_id in recipe.inputs:
			var avg := item_average(str(input_id))
			q = minf(q, float(avg.quality))
			p = minf(p, float(avg.purity))
			synthetic = synthetic or bool(avg.synthetic)
		if recipe.get("allow_synthetic", true) == false and synthetic:
			inventory = snapshot
			inventory_changed.emit()
			toast_requested.emit("Synthetic lineage cannot enter this recipe.", "error")
			return false
		add_item(str(item_id), int(recipe.outputs[item_id]), q, p, synthetic, "RECIPE:" + recipe_id)
	var event_id := "FIRST_RECIPE:" + recipe_id
	grant_rp_once(event_id, 50 if int(recipe.tier) <= 2 else 250)
	toast_requested.emit("Crafted " + recipe_id, "success")
	save_game()
	return true

func grant_rp_once(event_id: String, amount: int) -> bool:
	var claim_id := "RP:" + event_id
	if reward_ledger.has(claim_id):
		return false
	reward_ledger[claim_id] = {"amount":amount,"tick":simulation_tick}
	research_points += amount
	progression_changed.emit()
	return true

func grant_skill_point_once(event_id: String) -> bool:
	var claim_id := "SKILL:" + event_id
	if reward_ledger.has(claim_id):
		return false
	reward_ledger[claim_id] = {"amount":1,"tick":simulation_tick}
	skill_points += 1
	progression_changed.emit()
	return true

func current_tier() -> int:
	var highest := 0
	for research_id in completed_research:
		for research in RESEARCH:
			if research.id == research_id:
				highest = maxi(highest, int(research.tier))
	return highest

func research_state(research: Dictionary) -> String:
	if completed_research.has(str(research.id)):
		return "COMPLETED"
	for requirement in research.requires:
		if not completed_research.has(str(requirement)):
			return "LOCKED"
	return "AVAILABLE"

func start_research(research_id: String) -> bool:
	if not active_research.is_empty():
		return false
	for research in RESEARCH:
		if str(research.id) == research_id:
			if research_state(research) != "AVAILABLE":
				return false
			if research_points < int(research.rp):
				toast_requested.emit("Research Points 부족", "warning")
				return false
			if not has_machine_kind("lab"):
				toast_requested.emit("연구소를 먼저 설치하세요.", "warning")
				return false
			research_points -= int(research.rp)
			active_research = research_id
			research_progress = 0.0
			progression_changed.emit()
			save_game()
			return true
	return false

func _advance_research(delta: float) -> void:
	var found: Dictionary = {}
	for entry in RESEARCH:
		if str(entry.id) == active_research:
			found = entry
			break
	if found.is_empty():
		active_research = ""
		research_progress = 0.0
		return
	if not has_powered_machine_kind("lab"):
		return
	research_progress += delta
	if research_progress >= float(found.seconds):
		completed_research.append(active_research)
		grant_skill_point_once("TIER_UNLOCK:" + active_research)
		toast_requested.emit("RESEARCH COMPLETE · " + str(found.name), "success")
		active_research = ""
		research_progress = 0.0
		progression_changed.emit()
		save_game()

func has_machine_kind(kind: String) -> bool:
	for building in buildings:
		if str(building.get("kind","")) == kind or str(building.get("type","")) == kind:
			return true
	return false

func has_powered_machine_kind(kind: String) -> bool:
	for building in buildings:
		if str(building.get("kind","")) == kind and float(building.get("power_ratio",0.0)) >= 0.8:
			return true
	return false

func purchase_skill(skill_id: String) -> bool:
	for skill in SKILLS:
		if str(skill.id) != skill_id:
			continue
		if purchased_skills.has(skill_id) or skill_points <= 0:
			return false
		for req in skill.requires:
			if not purchased_skills.has(str(req)):
				toast_requested.emit("선행 스킬이 필요합니다.", "warning")
				return false
		skill_points -= 1
		purchased_skills.append(skill_id)
		progression_changed.emit()
		save_game()
		return true
	return false

func add_building(data: Dictionary) -> void:
	buildings.append(data)
	progress_objective("BUILDING_PLACED", str(data.get("type","")))
	save_game()

func register_world_event(event_id: String) -> bool:
	if story_flags.has(event_id):
		return false
	story_flags[event_id] = true
	objective_changed.emit()
	return true

func progress_objective(event_type: String, target_id: String, amount: int = 1) -> void:
	var event_id := "OBJECTIVE:" + event_type + ":" + target_id
	if story_flags.has(event_id):
		return
	story_flags[event_id] = amount
	objective_changed.emit()
	save_game()

func save_game() -> void:
	var payload := {
		"saveFormatVersion":SAVE_VERSION,
		"gameBuildVersion":"0.1.0",
		"canonicalDataVersion":"v4.5.0-godot-1",
		"worldGeneratorVersion":1,
		"simulationRulesVersion":1,
		"saveRevision":simulation_tick,
		"simulationTick":simulation_tick,
		"worldSeed":827142,
		"inventory":inventory,
		"researchPoints":research_points,
		"skillPoints":skill_points,
		"completedResearch":completed_research,
		"purchasedSkills":purchased_skills,
		"activeResearch":active_research,
		"researchProgress":research_progress,
		"buildings":buildings,
		"worldState":world_state,
		"storyFlags":story_flags,
		"rewardLedger":reward_ledger,
		"fusionJob":fusion_job,
		"relayInstances":relay_instances,
		"coreInstalled":core_installed,
		"stabilizationState":stabilization_state,
		"campaignStage":campaign_stage,
		"playerState":{"position_x":player_state.position.x,"position_y":player_state.position.y,"position_z":player_state.position.z,"health":player_state.health,"stamina":player_state.stamina,"equipped_tool":player_state.equipped_tool},
		"currencyD":currency_d
	}
	var text := JSON.stringify(payload)
	var checksum := text.sha256_text()
	payload["checksum"] = checksum
	var file := FileAccess.open("user://doronium_factory_save_v5.tmp", FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(payload))
	file.flush()
	file.close()
	var backup_path := "user://doronium_factory_save_v5.bak"
	var final_path := "user://doronium_factory_save_v5.json"
	if FileAccess.file_exists(final_path):
		DirAccess.copy_absolute(final_path, backup_path)
	DirAccess.rename_absolute("user://doronium_factory_save_v5.tmp", final_path)

func load_game() -> void:
	var path := "user://doronium_factory_save_v5.json"
	if not FileAccess.file_exists(path):
		return
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if typeof(parsed) != TYPE_DICTIONARY:
		toast_requested.emit("Save is damaged. Backup kept for recovery.", "error")
		return
	var version := int(parsed.get("saveFormatVersion",0))
	if version > SAVE_VERSION or version < 1:
		toast_requested.emit("Unsupported save version. Original file was not modified.", "error")
		return
	inventory.assign(parsed.get("inventory",[]))
	research_points = int(parsed.get("researchPoints",0))
	skill_points = int(parsed.get("skillPoints",1))
	completed_research.assign(parsed.get("completedResearch",["RESEARCH_BASIC_SURVIVAL"]))
	purchased_skills.assign(parsed.get("purchasedSkills",[]))
	active_research = str(parsed.get("activeResearch",""))
	research_progress = float(parsed.get("researchProgress",0.0))
	buildings.assign(parsed.get("buildings",[]))
	world_state = parsed.get("worldState",{})
	story_flags = parsed.get("storyFlags",{})
	reward_ledger = parsed.get("rewardLedger",{})
	fusion_job = parsed.get("fusionJob",{})
	relay_instances.assign(parsed.get("relayInstances",[]))
	core_installed = bool(parsed.get("coreInstalled",false))
	stabilization_state = str(parsed.get("stabilizationState","NOT_STARTED"))
	campaign_stage = int(parsed.get("campaignStage",0))
	var ps: Dictionary = parsed.get("playerState",{})
	player_state.position = Vector3(float(ps.get("position_x",0.0)),float(ps.get("position_y",0.0)),float(ps.get("position_z",0.0)))
	player_state.health = float(ps.get("health",100.0))
	player_state.stamina = float(ps.get("stamina",100.0))
	player_state.equipped_tool = str(ps.get("equipped_tool","ITEM_TOOL_HANDS"))
	currency_d = int(parsed.get("currencyD",0))
	inventory_changed.emit()
	progression_changed.emit()
	objective_changed.emit()

func toast(message: String, severity: String = "info") -> void:
	toast_requested.emit(message, severity)
