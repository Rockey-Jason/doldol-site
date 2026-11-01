extends Node
class_name StoryManager3D

signal dialogue_changed(speaker: String, line: String)
signal act_changed(act_number: int, title: String)
signal quest_changed(title: String, description: String, progress: float)
signal chapter_music_requested(chapter: int)

const ACTS: Array[Dictionary] = [
	{"number":1,"title":"ACT I — THE RUINS","objective":"Collect wood and stone, craft a workbench, and reconnect ORBIT.","condition":"STARTER_RESOURCES"},
	{"number":2,"title":"ACT II — THE HIDDEN INDUSTRY","objective":"Build an iron production line and restore the research lab.","condition":"IRON_AUTOMATION"},
	{"number":3,"title":"ACT III — THE DORONUM TRUTH","objective":"Find the Dori Meat Tree and discover that Doronum is manufactured, not mined.","condition":"DORONUM_DISCOVERY"},
	{"number":4,"title":"ACT IV — THE INFINITE PROJECT","objective":"Restore the First Factory archive, cooling core, and resonance chamber.","condition":"INFINITE_PROJECT"},
	{"number":5,"title":"ACT V — THE LAST FACTORY","objective":"Build the complete high-pressure and Doronum industry.","condition":"LAST_FACTORY"},
	{"number":6,"title":"ACT VI — FINAL PREPARATION","objective":"Prove power stability, pressure calibration, and emergency cooling.","condition":"FUSION_PREFLIGHT"},
	{"number":7,"title":"FINAL — PLANETARY STABILIZATION","objective":"Create Infinity Doronum, install three Relays and the Core, then synchronize the planet.","condition":"PLANETARY_STABILIZATION"}
]
const QUESTS: Array[Dictionary] = [
	{"id":"Q01","act":1,"title":"A Small Beginning","description":"Collect 12 Wood and 6 Stone.","event":"STARTER_RESOURCES","reward_rp":0},
	{"id":"Q02","act":1,"title":"The First Workbench","description":"Craft and place a Workbench, then make a Wooden Pickaxe.","event":"WORKBENCH_AND_PICKAXE","reward_rp":50},
	{"id":"Q03","act":2,"title":"First Metal","description":"Build a Furnace and produce Iron from Iron Ore.","event":"FIRST_IRON","reward_rp":100},
	{"id":"Q04","act":2,"title":"Mechanical Industry","description":"Build a Compressor, Rolling Mill and Gear Station.","event":"MECHANICAL_LINE","reward_rp":250},
	{"id":"Q05","act":2,"title":"Automated Extraction","description":"Build an Auto Miner, Conveyor and Warehouse.","event":"AUTO_MINING_LINE","reward_rp":500},
	{"id":"Q06","act":3,"title":"A Different Kind of Harvest","description":"Discover a Dori Meat Tree and harvest natural Dori Meat.","event":"DORI_MEAT_DISCOVERED","reward_rp":500},
	{"id":"Q07","act":3,"title":"The Blue Substance","description":"Produce the first non-synthetic Normal Doronum.","event":"FIRST_DORONUM","reward_rp":1000},
	{"id":"Q08","act":4,"title":"The Old Archive","description":"Recover the First Factory archive records.","event":"LORE:FIRST_FACTORY_ARCHIVE","reward_rp":1500},
	{"id":"Q09","act":4,"title":"Cooling Core Restored","description":"Restore the First Factory cooling core.","event":"LORE:FIRST_FACTORY_COOLING_CORE","reward_rp":1500},
	{"id":"Q10","act":4,"title":"Resonance Chamber","description":"Restore the First Factory resonance chamber.","event":"LORE:FIRST_FACTORY_RESONANCE_CHAMBER","reward_rp":2000},
	{"id":"Q11","act":5,"title":"The Doronum Industry","description":"Unlock all fifteen canonical Doronum production chains.","event":"DORONUM_INDUSTRY","reward_rp":2500},
	{"id":"Q12","act":5,"title":"Infinity Project","description":"Recover the Infinite Project plans and complete Infinity Industry research.","event":"INFINITY_PROJECT_REVEALED","reward_rp":3000},
	{"id":"Q13","act":6,"title":"Power Stability Test","description":"Hold the required 5MW+ safety load without brownout for 30 seconds.","event":"PREFLIGHT_POWER","reward_rp":2500},
	{"id":"Q14","act":6,"title":"Pressure Sensor Calibration","description":"Calibrate the seven-stage pressure sensor chain.","event":"PREFLIGHT_PRESSURE","reward_rp":2500},
	{"id":"Q15","act":6,"title":"Emergency Cooling Test","description":"Run the emergency cooling system under a simulated full load.","event":"PREFLIGHT_COOLING","reward_rp":2500},
	{"id":"Q16","act":7,"title":"The Infinite Crystal","description":"Create and inspect exactly one Infinity Doronum.","event":"INFINITY_OUTPUT_INSPECTED","reward_rp":5000},
	{"id":"Q17","act":7,"title":"Three Relays","description":"Install three independent planetary stabilization relays.","event":"THREE_RELAYS_ACTIVE","reward_rp":5000},
	{"id":"Q18","act":7,"title":"The Planet's Heart","description":"Install Infinity Doronum into the Central Stabilization Core.","event":"CORE_INFINITY_INSTALLED","reward_rp":5000},
	{"id":"Q19","act":7,"title":"Planetary Stabilization","description":"Complete synchronized network activation.","event":"PLANETARY_STABILIZATION_COMPLETE","reward_rp":10000}
]

var current_act := 1
var current_quest_index := 0
var orbit_name := "ORBIT"
var orbit_status := "PARTIALLY RESTORED"
var last_dialogue := "“Factory status: UNKNOWN. 복구 엔지니어, 시스템 연결을 시도합니다.”"
var lore_records: Array[String] = []
var _skill_point_milestones := ["ACT_I_COMPLETE","ACT_II_COMPLETE","ACT_III_COMPLETE","ACT_IV_COMPLETE","ACT_V_COMPLETE","ACT_VI_COMPLETE","FIRST_FACTORY_ARCHIVE","FIRST_DORONUM_RECORD","INFINITY_PROJECT_REVEALED"]

func _ready() -> void:
	add_to_group("story_manager")
	current_act = int(GameState.story_flags.get("CURRENT_ACT",1))
	current_quest_index = int(GameState.story_flags.get("CURRENT_QUEST",0))
	lore_records.assign(GameState.story_flags.get("LORE_RECORDS",[]))
	GameState.objective_changed.connect(evaluate_progression)
	GameState.progression_changed.connect(evaluate_progression)
	GameState.toast_requested.connect(_on_toast_requested)
	_present_current_quest()
	evaluate_progression()

func evaluate_progression() -> void:
	_check_story_flags()
	while current_quest_index < QUESTS.size():
		var quest: Dictionary = QUESTS[current_quest_index]
		var event_id := str(quest.event)
		if not GameState.story_flags.has(event_id):
			break
		_complete_quest(quest)
		current_quest_index += 1
		GameState.story_flags["CURRENT_QUEST"] = current_quest_index
		_present_current_quest()
	if current_quest_index >= QUESTS.size():
		GameState.story_flags["CAMPAIGN_COMPLETE"] = true
		orbit_status = "PLANET STABLE · FACTORY OPERATIONAL"
	GameState.save_game()

func _check_story_flags() -> void:
	var gathered_wood := GameState.count_item("ITEM_WOOD")
	var gathered_stone := GameState.count_item("ITEM_STONE")
	if gathered_wood >= 12 and gathered_stone >= 6:
		GameState.story_flags["STARTER_RESOURCES"] = true
	if GameState.has_machine_kind("WORKBENCH") and GameState.count_item("ITEM_WOODEN_PICKAXE") > 0:
		GameState.story_flags["WORKBENCH_AND_PICKAXE"] = true
	if GameState.story_flags.get("FIRST_IRON",false) == false and int(GameState.story_flags.get("OBJECTIVE:RECIPE_PRODUCED:IRON_SMELTING",0)) > 0:
		GameState.story_flags["FIRST_IRON"] = true
	if GameState.has_machine_kind("AUTO_MINER") and GameState.has_machine_kind("WAREHOUSE") and GameState.has_machine_kind("CONVEYOR"):
		GameState.story_flags["AUTO_MINING_LINE"] = true
	if GameState.story_flags.has("FIRST_DORONUM_OUTPUT"):
		GameState.story_flags["FIRST_DORONUM"] = true
	if lore_records.size() >= 3:
		GameState.story_flags["INFINITY_PROJECT_REVEALED"] = true

func _complete_quest(quest: Dictionary) -> void:
	var quest_id := str(quest.id)
	var claim_id := "QUEST_REWARD:"+quest_id
	if GameState.reward_ledger.has(claim_id):
		return
	GameState.reward_ledger[claim_id] = {"tick":GameState.simulation_tick,"rp":int(quest.reward_rp)}
	if int(quest.reward_rp)>0:
		GameState.research_points += int(quest.reward_rp)
	if quest_id in ["Q02","Q05","Q10","Q15"]:
		GameState.grant_skill_point_once("STORY_MILESTONE:"+quest_id)
	var next_act := int(quest.act)
	if next_act > current_act:
		current_act = next_act
		GameState.story_flags["CURRENT_ACT"] = current_act
		act_changed.emit(current_act,str(ACTS[current_act-1].title))
		chapter_music_requested.emit(mini(8,current_act))
	last_dialogue = _orbit_quest_line(quest)
	dialogue_changed.emit(orbit_name,last_dialogue)
	GameState.toast("임무 완료 · "+str(quest.title),"success")
	GameState.objective_changed.emit()
	GameState.save_game()

func _orbit_quest_line(quest: Dictionary) -> String:
	match str(quest.id):
		"Q01": return "“기초 자원 확보 확인. 이 지역은 아직 복구할 수 있습니다.”"
		"Q03": return "“첫 금속 생산을 확인했습니다. 산업 구동을 위한 기반이 마련되었습니다.”"
		"Q07": return "“이 물질은 광물이 아닙니다. 돌이 고기의 생체 구조가 재배열된 결과입니다.”"
		"Q08": return "“FIRST DORONUM FACTORY의 기록이 복구되었습니다. 30년 전 BLUE FURNACE INCIDENT…”"
		"Q10": return "“세 구역의 기록이 연결되었습니다. INFINITE PROJECT의 목적을 확인했습니다.”"
		"Q12": return "“Infinity Doronum은 행성 에너지 네트워크의 위상 차이를 안정화하기 위한 매개체입니다.”"
		"Q19": return "“The planet is stable. The factory remains operational.”"
	return "“%s 완료. 다음 산업 목표를 확인했습니다.”" % str(quest.title)

func _present_current_quest() -> void:
	if current_quest_index >= QUESTS.size():
		quest_changed.emit("INFINITE INDUSTRY MODE","행성은 안정되었습니다. 공장을 확장하고 최적화하세요.",1.0)
		return
	var quest: Dictionary = QUESTS[current_quest_index]
	var progress := float(GameState.story_flags.get(str(quest.event)+":PROGRESS",0.0))
	quest_changed.emit(str(quest.title),str(quest.description),progress)

func notify_lore(event_id: String, title: String, orbit_line: String) -> void:
	if lore_records.has(event_id):
		return
	lore_records.append(event_id)
	GameState.story_flags["LORE_RECORDS"] = lore_records
	GameState.story_flags["LORE:"+event_id] = true
	if event_id == "DORI_MEAT_TREE_DISCOVERED":
		GameState.story_flags["DORI_MEAT_DISCOVERED"] = true
		GameState.grant_skill_point_once("KEY_MILESTONE:DORI_TREE")
	elif event_id == "INFINITY_PROJECT_REVEALED":
		GameState.grant_skill_point_once("KEY_MILESTONE:INFINITY_PROJECT")
	GameState.grant_rp_once("LORE:"+event_id,500)
	last_dialogue = "“"+orbit_line+"”"
	dialogue_changed.emit(orbit_name,last_dialogue)
	GameState.toast("기록 복구 · "+title,"success")
	GameState.objective_changed.emit()
	evaluate_progression()

func on_first_doronum_created() -> void:
	GameState.story_flags["FIRST_DORONUM_OUTPUT"] = true
	GameState.grant_skill_point_once("KEY_MILESTONE:FIRST_DORONUM")
	GameState.register_world_event("ORBIT_DORONUM_DISCOVERY")
	last_dialogue = "“Unknown material detected. Designation: DORONUM. It is manufactured, not mined.”"
	dialogue_changed.emit(orbit_name,last_dialogue)
	evaluate_progression()

func on_infinity_project_revealed() -> void:
	if GameState.register_world_event("INFINITY_PROJECT_REVEALED"):
		last_dialogue = "“INFINITE PROJECT identified. The original factory attempted to stabilize the planetary energy network.”"
		dialogue_changed.emit(orbit_name,last_dialogue)
		GameState.grant_skill_point_once("INFINITY_PROJECT_REVEALED")
	evaluate_progression()

func _on_toast_requested(_message: String, _severity: String) -> void:
	# Game events remain the source of truth; toast presentation is handled by GameHUD.
	pass

