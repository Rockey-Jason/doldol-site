extends RefCounted
class_name GameData

const SAVE_VERSION := 1
const WORLD_SEED := 827142
const WORLD_SIZE := 2048.0
const WORLD_LIMIT := 1024.0
const SIM_TICK := 0.10
const DORONUM_IDS := [
	"ITEM_DORONUM_NORMAL", "ITEM_DORONUM_YELLOW", "ITEM_DORONUM_ULTRA",
	"ITEM_DORONUM_BLUE", "ITEM_DORONUM_RED", "ITEM_DORONUM_IRON",
	"ITEM_DORONUM_ORANGE", "ITEM_DORONUM_SLIGHTLY_RUSTED", "ITEM_DORONUM_RUSTED",
	"ITEM_DORONUM_TRANSLUCENT", "ITEM_DORONUM_THERMAL_CRYSTAL",
	"ITEM_DORONUM_COLD_CRYSTAL", "ITEM_DORONUM_BLACK",
	"ITEM_DORONUM_SPECIAL_EDITION", "ITEM_DORONUM_LIMITED_EDITION"
]
const FUSION_STAGES := [
	{"name":"Material / Resonance Analysis","temperature":500.0,"pressure":100.0,"power":500.0,"seconds":20.0},
	{"name":"Energy / Molecular Separation","temperature":1200.0,"pressure":500.0,"power":1000.0,"seconds":25.0},
	{"name":"Equilibrium","temperature":1800.0,"pressure":1000.0,"power":1500.0,"seconds":30.0},
	{"name":"High Pressure Compression","temperature":2500.0,"pressure":5000.0,"power":2500.0,"seconds":35.0},
	{"name":"Fusion","temperature":3500.0,"pressure":10000.0,"power":3500.0,"seconds":40.0},
	{"name":"Nucleus Formation","temperature":4500.0,"pressure":15000.0,"power":4500.0,"seconds":50.0},
	{"name":"Infinite Crystallization","temperature":5000.0,"pressure":20000.0,"power":5000.0,"seconds":60.0}
]
const RESEARCH := [
	{"id":"RESEARCH_BASIC_SURVIVAL","name":"Basic Survival","tier":0,"rp":0,"time":0.0,"requires":[],"power":0.0,"unlocks":["WORKBENCH","WOODEN_TOOLS"]},
	{"id":"RESEARCH_BASIC_MINING","name":"Basic Mining","tier":1,"rp":50,"time":60.0,"requires":["RESEARCH_BASIC_SURVIVAL"],"power":25.0,"unlocks":["FURNACE","MINING_TOOLS"]},
	{"id":"RESEARCH_IRON_SMELTING","name":"Iron Smelting","tier":1,"rp":100,"time":120.0,"requires":["RESEARCH_BASIC_MINING"],"power":25.0,"unlocks":["IRON_SMELTING","COMPRESSOR"]},
	{"id":"RESEARCH_MECHANICAL_PROCESSING","name":"Mechanical Processing","tier":2,"rp":250,"time":180.0,"requires":["RESEARCH_IRON_SMELTING"],"power":25.0,"unlocks":["ROLLING_MILL","GEAR_STATION","BEARING_STATION"]},
	{"id":"RESEARCH_STEEL","name":"Steel","tier":2,"rp":500,"time":300.0,"requires":["RESEARCH_MECHANICAL_PROCESSING"],"power":100.0,"unlocks":["STEEL_PROCESSING"]},
	{"id":"RESEARCH_ELECTRIC_PROCESSING","name":"Electric Processing","tier":2,"rp":1000,"time":420.0,"requires":["RESEARCH_MECHANICAL_PROCESSING"],"power":100.0,"unlocks":["GENERATOR","SOLAR_PANEL","BATTERY","RESEARCH_LAB"]},
	{"id":"RESEARCH_OIL_CHEMISTRY","name":"Oil Chemistry","tier":3,"rp":1500,"time":600.0,"requires":["RESEARCH_ELECTRIC_PROCESSING"],"power":100.0,"unlocks":["REFINERY","PIPES"]},
	{"id":"RESEARCH_HIGH_PRESSURE","name":"High Pressure","tier":3,"rp":2500,"time":900.0,"requires":["RESEARCH_MECHANICAL_PROCESSING","RESEARCH_ELECTRIC_PROCESSING"],"power":100.0,"unlocks":["HIGH_PRESSURE_SYSTEMS"]},
	{"id":"RESEARCH_TITANIUM","name":"Titanium","tier":4,"rp":4000,"time":1200.0,"requires":["RESEARCH_HIGH_PRESSURE","RESEARCH_STEEL"],"power":250.0,"unlocks":["TITANIUM_PROCESSING"]},
	{"id":"RESEARCH_ADVANCED_CIRCUITS","name":"Advanced Circuits","tier":4,"rp":6000,"time":1500.0,"requires":["RESEARCH_ELECTRIC_PROCESSING","RESEARCH_TITANIUM"],"power":250.0,"unlocks":["ADVANCED_CIRCUITS","CONTROL_MODULE"]},
	{"id":"RESEARCH_AUTOMATION","name":"Automation","tier":4,"rp":9000,"time":1800.0,"requires":["RESEARCH_ADVANCED_CIRCUITS","RESEARCH_MECHANICAL_PROCESSING"],"power":250.0,"unlocks":["AUTO_MINER","CONVEYOR","SORTER","WAREHOUSE"]},
	{"id":"RESEARCH_DORONUM_BIOLOGY","name":"Doronum Biology","tier":5,"rp":12000,"time":2400.0,"requires":["RESEARCH_AUTOMATION","RESEARCH_ADVANCED_CIRCUITS"],"power":250.0,"unlocks":["DORI_MEAT_TREE","DORI_MEAT_HARVEST"]},
	{"id":"RESEARCH_DORONUM_ENGINEERING","name":"Doronum Engineering","tier":5,"rp":18000,"time":3000.0,"requires":["RESEARCH_DORONUM_BIOLOGY","RESEARCH_HIGH_PRESSURE"],"power":250.0,"unlocks":["DORONUM_COMPRESSOR"]},
	{"id":"RESEARCH_DORONUM_CRYSTAL","name":"Doronum Crystal","tier":5,"rp":25000,"time":3600.0,"requires":["RESEARCH_DORONUM_ENGINEERING","RESEARCH_TITANIUM"],"power":250.0,"unlocks":["DORONUM_VARIANTS"]},
	{"id":"RESEARCH_ULTRA_MATERIAL_PROCESSING","name":"Ultra Material Processing","tier":6,"rp":35000,"time":4200.0,"requires":["RESEARCH_DORONUM_CRYSTAL","RESEARCH_HIGH_PRESSURE"],"power":250.0,"unlocks":["ULTRA_MATERIAL_PRESS","DORONUM_PURIFIER"]},
	{"id":"RESEARCH_DORONUM_COMPRESSOR","name":"Doronum Compressor","tier":6,"rp":50000,"time":5400.0,"requires":["RESEARCH_ULTRA_MATERIAL_PROCESSING","RESEARCH_AUTOMATION"],"power":250.0,"unlocks":["FUSION_SAFETY"]},
	{"id":"RESEARCH_DORONUM_FUSION","name":"Doronum Fusion","tier":6,"rp":75000,"time":7200.0,"requires":["RESEARCH_DORONUM_COMPRESSOR","RESEARCH_DORONUM_CRYSTAL"],"power":250.0,"unlocks":["INFINITY_FUSION_MACHINE","ISOLATION_TRANSPORT"]},
	{"id":"RESEARCH_INFINITY_INDUSTRY","name":"Infinity Industry","tier":7,"rp":150000,"time":10800.0,"requires":["RESEARCH_DORONUM_FUSION","RESEARCH_DORONUM_BIOLOGY","RESEARCH_AUTOMATION"],"power":250.0,"unlocks":["STABILIZATION_RELAY","STABILIZATION_CORE"]}
]
const BUILDINGS := [
	{"id":"WORKBENCH","name":"Workbench","cost":{"ITEM_WOOD":10,"ITEM_STONE":4,"ITEM_PLANT_ROPE":2},"tier":0,"power":0.0,"size":Vector2i(2,2)},
	{"id":"FURNACE","name":"Furnace","cost":{"ITEM_STONE":12,"ITEM_IRON_ORE":4},"tier":1,"power":0.0,"size":Vector2i(2,2)},
	{"id":"COMPRESSOR","name":"Compressor","cost":{"ITEM_IRON_PLATE":8,"ITEM_GEAR":4},"tier":1,"power":0.0,"size":Vector2i(2,2)},
	{"id":"ROLLING_MILL","name":"Rolling Mill","cost":{"ITEM_IRON_PLATE":12,"ITEM_GEAR":4},"tier":2,"power":20.0,"size":Vector2i(3,2)},
	{"id":"GENERATOR","name":"Thermal Generator","cost":{"ITEM_STEEL_PLATE":12,"ITEM_COPPER_WIRE":10,"ITEM_GEAR":4},"tier":3,"power":-250.0,"size":Vector2i(3,3)},
	{"id":"RESEARCH_LAB","name":"Research Lab","cost":{"ITEM_IRON_PLATE":12,"ITEM_BASIC_CIRCUIT":4},"tier":2,"power":25.0,"size":Vector2i(3,3)},
	{"id":"AUTO_MINER","name":"Auto Miner","cost":{"ITEM_MOTOR":1,"ITEM_STEEL_PLATE":10,"ITEM_TITANIUM_PLATE":5,"ITEM_ADVANCED_CIRCUIT":3,"ITEM_CONTROL_MODULE":1,"ITEM_GEAR":5,"ITEM_IRON":10,"ITEM_BATTERY":2},"tier":4,"power":40.0,"size":Vector2i(3,3)},
	{"id":"CONVEYOR","name":"Conveyor","cost":{"ITEM_IRON_PLATE":2,"ITEM_GEAR":1,"ITEM_RUBBER":1},"tier":4,"power":1.0,"size":Vector2i(1,1)},
	{"id":"WAREHOUSE","name":"Warehouse","cost":{"ITEM_STEEL_PLATE":10,"ITEM_IRON_PLATE":10,"ITEM_BASIC_CIRCUIT":2},"tier":4,"power":5.0,"size":Vector2i(3,3)},
	{"id":"DORONUM_COMPRESSOR","name":"Doronum Compressor","cost":{"ITEM_STEEL_PLATE":50,"ITEM_TITANIUM_PLATE":25,"ITEM_ADVANCED_CIRCUIT":20,"ITEM_CONTROL_MODULE":10,"ITEM_DORONUM_BLUE":5,"ITEM_DORONUM_RED":5,"ITEM_HEAT_CRYSTAL":10,"ITEM_COLD_CRYSTAL":10},"tier":6,"power":750.0,"size":Vector2i(4,4)},
	{"id":"ULTRA_MATERIAL_PRESS","name":"Ultra Material Press","cost":{"ITEM_STEEL_PLATE":80,"ITEM_TITANIUM_PLATE":40,"ITEM_DORONUM_ULTRA":5,"ITEM_ADVANCED_CIRCUIT":20,"ITEM_CONTROL_MODULE":10,"ITEM_DORONUM_THERMAL_CRYSTAL":5,"ITEM_DORONUM_COLD_CRYSTAL":5},"tier":6,"power":1500.0,"size":Vector2i(4,4)},
	{"id":"INFINITY_FUSION_MACHINE","name":"Infinity Fusion Machine","cost":{"ITEM_STEEL_PLATE":200,"ITEM_TITANIUM_PLATE":100,"ITEM_DORONUM_ULTRA":20,"ITEM_ADVANCED_CIRCUIT":50,"ITEM_CONTROL_MODULE":25,"ITEM_DORONUM_THERMAL_CRYSTAL":10,"ITEM_DORONUM_COLD_CRYSTAL":10,"ITEM_DORONUM_BLUE":10,"ITEM_DORONUM_IRON":10},"tier":7,"power":5000.0,"size":Vector2i(8,8)},
	{"id":"STABILIZATION_RELAY","name":"Stabilization Relay","cost":{"ITEM_STEEL_PLATE":50,"ITEM_TITANIUM_PLATE":25,"ITEM_ADVANCED_CIRCUIT":10,"ITEM_CONTROL_MODULE":5,"ITEM_DORONUM_ORANGE":3,"ITEM_DORONUM_BLUE":2},"tier":7,"power":100.0,"size":Vector2i(2,2)},
	{"id":"STABILIZATION_CORE","name":"Stabilization Core","cost":{"ITEM_STEEL_PLATE":100,"ITEM_TITANIUM_PLATE":50,"ITEM_ADVANCED_CIRCUIT":25,"ITEM_CONTROL_MODULE":15,"ITEM_DORONUM_ULTRA":5,"ITEM_DORONUM_TRANSLUCENT":5,"ITEM_DORONUM_BLACK":5},"tier":7,"power":500.0,"size":Vector2i(4,4)}
]
const VARIANT_RECIPES := {
	"ITEM_DORONUM_YELLOW":{"name":"Yellow Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_GOLD_INGOT":2,"ITEM_QUARTZ":1},"machine":"DORONUM_REFINEMENT_CHAMBER","seconds":45.0,"temperature":700.0,"pressure":300.0},
	"ITEM_DORONUM_ULTRA":{"name":"Ultra Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_DORONUM_YELLOW":1,"ITEM_DIAMOND":2},"machine":"ULTRA_MATERIAL_PRESS","seconds":90.0,"temperature":1600.0,"pressure":1200.0},
	"ITEM_DORONUM_BLUE":{"name":"Blue Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_COLD_CRYSTAL":3},"machine":"COOLING_STABILIZER","seconds":75.0,"temperature":-120.0,"pressure":350.0},
	"ITEM_DORONUM_RED":{"name":"Red Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_HEAT_CRYSTAL":3},"machine":"THERMAL_STABILIZER","seconds":75.0,"temperature":1400.0,"pressure":600.0},
	"ITEM_DORONUM_IRON":{"name":"Iron Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_STEEL_PLATE":3,"ITEM_MAGNETITE":2},"machine":"REINFORCED_DORONUM_PRESS","seconds":75.0,"temperature":900.0,"pressure":700.0},
	"ITEM_DORONUM_ORANGE":{"name":"Orange Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_COPPER_WIRE":10,"ITEM_GOLD_INGOT":1},"machine":"DORONUM_REFINEMENT_CHAMBER","seconds":55.0,"temperature":800.0,"pressure":400.0},
	"ITEM_DORONUM_SLIGHTLY_RUSTED":{"name":"Slightly Rusted Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_IRON_ORE":1,"ITEM_WATER":1},"machine":"CONTROLLED_ATMOSPHERE_CHAMBER","seconds":45.0,"temperature":350.0,"pressure":120.0},
	"ITEM_DORONUM_RUSTED":{"name":"Rusted Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_IRON_ORE":2,"ITEM_WATER":3},"machine":"CONTROLLED_ATMOSPHERE_CHAMBER","seconds":60.0,"temperature":500.0,"pressure":180.0},
	"ITEM_DORONUM_TRANSLUCENT":{"name":"Translucent Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_QUARTZ":4,"ITEM_DIAMOND":1},"machine":"OPTICAL_REFINEMENT_CHAMBER","seconds":90.0,"temperature":650.0,"pressure":500.0},
	"ITEM_DORONUM_THERMAL_CRYSTAL":{"name":"Thermal Crystal","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_HEAT_CRYSTAL":3},"machine":"THERMAL_STABILIZER","seconds":75.0,"temperature":1200.0,"pressure":600.0},
	"ITEM_DORONUM_COLD_CRYSTAL":{"name":"Cold Crystal","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_COLD_CRYSTAL":3},"machine":"COOLING_STABILIZER","seconds":75.0,"temperature":-160.0,"pressure":400.0},
	"ITEM_DORONUM_BLACK":{"name":"Black Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_CARBON_POWDER":5,"ITEM_DIAMOND":1},"machine":"ABSORPTION_PRESS","seconds":100.0,"temperature":1000.0,"pressure":800.0},
	"ITEM_DORONUM_SPECIAL_EDITION":{"name":"Special Edition Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_DORONUM_YELLOW":1,"ITEM_ADVANCED_CIRCUIT":5,"ITEM_ARCHIVE_PATTERN":1},"machine":"SEALED_PRECISION_CHAMBER","seconds":120.0,"temperature":900.0,"pressure":1000.0,"story":"SPECIAL_EDITION_BATCH_RESEARCHED"},
	"ITEM_DORONUM_LIMITED_EDITION":{"name":"Limited Edition Doronum","inputs":{"ITEM_DORONUM_NORMAL":1,"ITEM_DORONUM_ULTRA":1,"ITEM_DORONUM_TRANSLUCENT":1,"ITEM_CONTRACT_SEAL":1},"machine":"LEGACY_BATCH_LINE","seconds":180.0,"temperature":1100.0,"pressure":1500.0,"story":"LIMITED_EDITION_CONTRACT_ACTIVE"}
}
const STORY_CHAPTERS := [
	{"id":"PROLOGUE","title":"The Arrival","objective":"Scan the abandoned site and recover the first terminal.","flag":"PROLOGUE_COMPLETE"},
	{"id":"ACT_I","title":"The Ruins","objective":"Gather wood and stone, craft tools and restore the furnace.","flag":"ACT_I_COMPLETE"},
	{"id":"ACT_II","title":"The Hidden Industry","objective":"Build a powered production line and automate ore processing.","flag":"ACT_II_COMPLETE"},
	{"id":"ACT_III","title":"The Doronum Truth","objective":"Find a Dori Meat Tree and produce natural Doronum.","flag":"ACT_III_COMPLETE"},
	{"id":"ACT_IV","title":"The Blue Furnace Incident","objective":"Recover four records and reconstruct the incident.","flag":"STORY_INCIDENT_RECONSTRUCTED"},
	{"id":"ACT_V","title":"The Infinite Project","objective":"Restore the First Factory archive, cooling core and resonance chamber.","flag":"ACT_V_COMPLETE"},
	{"id":"ACT_VI","title":"The Last Factory","objective":"Build the final line and pass three safety diagnostics.","flag":"ACT_VI_COMPLETE"},
	{"id":"FINAL","title":"Planetary Stabilization","objective":"Install three relays, the Infinity Core and stabilize the planet.","flag":"PLANETARY_STABILIZATION_COMPLETE"}
]
const ITEMS := {
	"ITEM_WOOD":{"name":"Wood","category":"Resource"},"ITEM_STONE":{"name":"Stone","category":"Resource"},
	"ITEM_GRASS":{"name":"Grass","category":"Resource"},"ITEM_PLANT_FIBER":{"name":"Plant Fiber","category":"Material"},
	"ITEM_PLANT_ROPE":{"name":"Plant Rope","category":"Material"},"ITEM_IRON_ORE":{"name":"Iron Ore","category":"Ore"},
	"ITEM_COPPER_ORE":{"name":"Copper Ore","category":"Ore"},"ITEM_COAL":{"name":"Coal","category":"Ore"},
	"ITEM_QUARTZ":{"name":"Quartz","category":"Ore"},"ITEM_GOLD_ORE":{"name":"Gold Ore","category":"Ore"},
	"ITEM_DIAMOND":{"name":"Diamond","category":"Ore"},"ITEM_WATER":{"name":"Water","category":"Fluid"},
	"ITEM_IRON":{"name":"Iron","category":"Material"},"ITEM_MOLTEN_IRON":{"name":"Molten Iron","category":"Fluid"},
	"ITEM_IRON_PLATE":{"name":"Iron Plate","category":"Material"},"ITEM_GEAR":{"name":"Gear","category":"Component"},
	"ITEM_COPPER":{"name":"Copper","category":"Material"},"ITEM_COPPER_WIRE":{"name":"Copper Wire","category":"Component"},
	"ITEM_CARBON_POWDER":{"name":"Carbon Powder","category":"Material"},"ITEM_STEEL":{"name":"Steel","category":"Material"},
	"ITEM_STEEL_PLATE":{"name":"Steel Plate","category":"Material"},"ITEM_BEARING":{"name":"Bearing","category":"Component"},
	"ITEM_BASIC_CIRCUIT":{"name":"Basic Circuit","category":"Component"},"ITEM_ADVANCED_CIRCUIT":{"name":"Advanced Circuit","category":"Component"},
	"ITEM_CONTROL_MODULE":{"name":"Control Module","category":"Component"},"ITEM_MOTOR":{"name":"Motor","category":"Component"},
	"ITEM_BATTERY":{"name":"Battery","category":"Component"},"ITEM_RUBBER":{"name":"Rubber","category":"Material"},
	"ITEM_TITANIUM_PLATE":{"name":"Titanium Plate","category":"Material"},"ITEM_GOLD_INGOT":{"name":"Gold Ingot","category":"Material"},
	"ITEM_MAGNETITE":{"name":"Magnetite","category":"Ore"},"ITEM_HEAT_CRYSTAL":{"name":"Heat Crystal","category":"Crystal"},
	"ITEM_COLD_CRYSTAL":{"name":"Cold Crystal","category":"Crystal"},"ITEM_DORI_MEAT":{"name":"Dori Meat","category":"Biological"},
	"ITEM_INFINITY_DORONUM":{"name":"Infinity Doronum","category":"Endgame"}
}
for item_id in DORONUM_IDS:
	ITEMS[item_id] = {"name":item_id.replace("ITEM_DORONUM_","").replace("_"," ").capitalize(),"category":"Doronum"}
