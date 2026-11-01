extends Node
class_name GameState

signal state_changed
signal notification(text: String)
signal fusion_stage_changed(stage: int)
signal ending_started

const SAVE_PATH := "user://doronium_factory_save.json"
var world_seed: int = GameData.WORLD_SEED
var player_position := Vector3(0, 0, 0)
var equipped_tool := "ITEM_TOOL_HANDS"
var inventory: Array[Dictionary] = []
var buildings: Array[Dictionary] = []
var discovered_nodes: Dictionary = {}
var resource_depletion: Dictionary = {}
var tree_states: Dictionary = {}
var research_completed: Array[String] = ["RESEARCH_BASIC_SURVIVAL"]
var active_research := ""
var research_progress := 0.0
var research_points := 0
var story_flags: Dictionary = {}
var lore_found: Array[String] = []
var machines: Array[Dictionary] = []
var fusion: Dictionary = {}
var relays: Array[Dictionary] = []
var core_installed := false
var stabilization_phase := 0
var stabilization_progress := 0.0
var stabilization_running := false
var ending_complete := false
var post_endgame := false
var production_history: Array[Dictionary] = []
var research_point_ledger: Array[Dictionary] = []
var skill_points := 1
var skills_unlocked: Array[String] = []
var skill_point_ledger: Array[Dictionary] = []
var skill_respec_used := false
var total_power_generated := 0.0
var total_power_used := 0.0
var power_state := {"starter_fuel_timer":0.0,"world_time":0.25,"fusion_buffer_kwh":0.0,"fusion_power_ratio":0.0}
var simulation_paused := false
var _event_ids: Dictionary = {}
var _next_stack_id := 1
var save_loaded := false
var save_blocked := false
var save_id := ""
var save_revision := 0
var simulation_tick: int = 0
var fusion_diagnostics := {"power_stability":false,"pressure_calibration":false,"emergency_cooling":false}

func _ready() -> void:
	load_game()
	if not save_loaded:
		_grant_starter_kit()
		state_changed.emit()

func advance_fixed_tick(dt: float) -> void:
	simulation_tick += 1
	_tick_research(dt)
	_tick_fusion(dt)
	_tick_planetary_stabilization(dt)

func _grant_starter_kit() -> void:
	add_item("ITEM_WOOD", 12, 92.0, 90.0, false, "STARTER")
	add_item("ITEM_STONE", 8, 92.0, 90.0, false, "STARTER")
	add_item("ITEM_GRASS", 8, 90.0, 90.0, false, "STARTER")
	add_item("ITEM_PLANT_ROPE",3,90.0,90.0,false,"STARTER")
	add_item("ITEM_WATER", 10, 100.0, 100.0, false, "STARTER")
	add_item("ITEM_COAL", 6, 90.0, 90.0, false, "STARTER")
	research_points = 50
	skill_points = 1
	_event_ids["SKILL_POINT:START"] = true
	skill_point_ledger.append({"claim_id":"SKILL_POINT:START","amount":1,"source":"START"})
	story_flags["PROLOGUE_COMPLETE"] = true

func add_item(item_id: String, quantity: int, quality: float = 90.0, purity: float = 90.0, synthetic: bool = false, provenance: String = "UNKNOWN") -> void:
	if quantity <= 0:
		return
	inventory.append({
		"stack_id": _new_stack_id(), "item_id": item_id, "quantity": quantity,
		"quality": clampf(quality, 0.0, 100.0), "purity": clampf(purity, 0.0, 100.0),
		"synthetic": synthetic, "provenance": provenance, "reserved": 0
	})
	notification.emit("+%d %s" % [quantity, GameData.item_name(item_id)])
	state_changed.emit()

func _new_stack_id() -> String:
	var id := "DF-%d-%08d" % [world_seed, _next_stack_id]
	_next_stack_id += 1
	return id

func count_item(item_id: String) -> int:
	var total := 0
	for stack in inventory:
		if stack.item_id == item_id:
			total += int(stack.quantity) - int(stack.get("reserved", 0))
	return total

func can_afford(cost: Dictionary) -> bool:
	for item_id in cost:
		if count_item(item_id) < int(cost[item_id]):
			return false
	return true

func consume_items(cost: Dictionary) -> bool:
	if not can_afford(cost):
		return false
	var remaining := cost.duplicate(true)
	for stack in inventory:
		var id: String = stack.item_id
		if not remaining.has(id):
			continue
		var take := mini(int(stack.quantity) - int(stack.get("reserved", 0)), int(remaining[id]))
		stack.quantity -= take
		remaining[id] -= take
		if remaining[id] <= 0:
			remaining.erase(id)
		if remaining.is_empty():
			break
	inventory = inventory.filter(func(s): return int(s.quantity) > 0)
	state_changed.emit()
	return remaining.is_empty()

func craft_manual(recipe_id: String) -> bool:
	var recipe: Dictionary = GameData.MANUAL_RECIPES.get(recipe_id,{})
	if recipe.is_empty():
		return false
	var lots := consume_items_with_lots(recipe.inputs,true)
	if lots.is_empty():
		notification.emit("재료가 부족해.")
		return false
	var quality_sum := 0.0
	var purity_sum := 0.0
	var quantity_sum := 0
	var synthetic := false
	for lot in lots:
		var quantity := int(lot.quantity)
		quality_sum += float(lot.quality)*quantity
		purity_sum += float(lot.purity)*quantity
		quantity_sum += quantity
		synthetic = synthetic or bool(lot.synthetic)
	var material_quality := 90.0 if quantity_sum<=0 else quality_sum/quantity_sum
	var material_purity := 90.0 if quantity_sum<=0 else purity_sum/quantity_sum
	var output_quality := clampf(material_quality*0.40+100.0*0.60,0.0,100.0)
	for output_id in recipe.outputs:
		add_item(output_id,int(recipe.outputs[output_id]),output_quality,material_purity,synthetic,"MANUAL_RECIPE:"+recipe_id)
	claim_recipe_research_reward(recipe_id)
	return true

func consume_items_with_lots(cost: Dictionary, allow_synthetic: bool = true) -> Array[Dictionary]:
	var snapshot: Array[Dictionary] = inventory.duplicate(true)
	var consumed: Array[Dictionary] = []
	for item_id in cost:
		var remaining := int(cost[item_id])
		if remaining <= 0:
			inventory = snapshot
			return []
		for stack in inventory:
			if stack.item_id != item_id or (not allow_synthetic and bool(stack.synthetic)):
				continue
			var available := int(stack.quantity)-int(stack.get("reserved",0))
			var take := mini(remaining,available)
			if take <= 0:
				continue
			var lot: Dictionary = stack.duplicate(true)
			lot.quantity = take
			consumed.append(lot)
			stack.quantity -= take
			remaining -= take
			if remaining == 0:
				break
		if remaining > 0:
			inventory = snapshot
			return []
	inventory = inventory.filter(func(s): return int(s.quantity)>0)
	state_changed.emit()
	return consumed

func build(building_id: String, world_position: Vector3, rotation_y: float = 0.0) -> bool:
	var definition: Dictionary = GameData.building_definition(building_id)
	if definition.is_empty():
		return false
	if not _is_unlocked(building_id):
		notification.emit("아직 해금되지 않은 설비야.")
		return false
	if absf(world_position.x)>GameData.WORLD_LIMIT or absf(world_position.z)>GameData.WORLD_LIMIT:
		notification.emit("건설 가능 구역 밖이야.")
		return false
	if building_id=="STABILIZATION_RELAY" and relays.size()>=3:
		notification.emit("행성 안정화 릴레이는 정확히 3개만 설치할 수 있어.")
		return false
	if building_id=="STABILIZATION_CORE" and buildings.any(func(m): return m.id=="STABILIZATION_CORE"):
		notification.emit("Stabilization Core는 하나만 설치할 수 있어.")
		return false
	for existing in buildings:
		if Vector2(existing.position.x,existing.position.z).distance_to(Vector2(world_position.x,world_position.z))<3.0:
			notification.emit("다른 설비와 설치 공간이 겹쳐.")
			return false
	var build_cost: Dictionary = definition.cost.duplicate(true)
	if has_skill("BUFFER_ENGINEER") and building_id in ["WAREHOUSE","FUSION_POWER_BUFFER"]:
		for item_id in build_cost:
			build_cost[item_id] = int(ceil(float(build_cost[item_id])*0.95))
	if not consume_items(build_cost):
		notification.emit("건설 재료가 부족해.")
		return false
	var instance := {
		"id": building_id, "instance_id": _new_stack_id(), "position": world_position,
		"rotation": rotation_y, "condition": 100.0, "state": "IDLE",
		"recipe": "", "progress": 0.0, "temperature": 20.0, "pressure": 0.0,
		"input": [], "output": [], "target": "", "buffer_limit": 1
	}
	buildings.append(instance)
	if building_id == "STABILIZATION_RELAY":
		relays.append({"instance_id": instance.instance_id, "position": world_position, "active": false})
	notification.emit("설치 완료 · " + str(definition.name))
	state_changed.emit()
	return true

func _is_unlocked(building_id: String) -> bool:
	for research in GameData.RESEARCH:
		if building_id in research.unlocks and research.id not in research_completed:
			return false
	return true

func apply_world_state(planet: PlanetWorld) -> void:
	for node in planet.resources:
		if not is_instance_valid(node):
			continue
		var node_id := str(node.get_meta("node_id",""))
		if resource_depletion.has(node_id):
			var remaining := int(resource_depletion[node_id])
			node.set_meta("quantity",remaining)
			if remaining<=0:
				node.queue_free()
	for tree in planet.dori_trees:
		if not is_instance_valid(tree):
			continue
		var tree_id := str(tree.get_meta("node_id",""))
		if not tree_states.has(tree_id):
			continue
		var state: Dictionary = tree_states[tree_id]
		for key in ["growth","water","mature","cycle","purity"]:
			if state.has(key):
				tree.set_meta(key,state[key])
		var fruit := tree.get_node_or_null("DoriMeatFruit")
		if fruit:
			fruit.visible = bool(tree.get_meta("mature",false))

func sync_world_state(planet: PlanetWorld) -> void:
	for node in planet.resources:
		if not is_instance_valid(node):
			continue
		resource_depletion[str(node.get_meta("node_id",""))] = int(node.get_meta("quantity",0))
	for tree in planet.dori_trees:
		if not is_instance_valid(tree):
			continue
		var tree_id := str(tree.get_meta("node_id",""))
		tree_states[tree_id] = {
			"growth":float(tree.get_meta("growth",0.0)),
			"water":float(tree.get_meta("water",0.0)),
			"mature":bool(tree.get_meta("mature",false)),
			"cycle":int(tree.get_meta("cycle",0)),
			"purity":float(tree.get_meta("purity",90.0))
		}

func discover_resource(node_id: String, item_id: String) -> void:
	if discovered_nodes.has(node_id):
		return
	discovered_nodes[node_id] = true
	var tier := "GENERAL"
	var reward := 100
	if item_id in ["ITEM_IRON_ORE","ITEM_COPPER_ORE","ITEM_QUARTZ","ITEM_GOLD_ORE","ITEM_COAL"]:
		tier = "ADVANCED"
		reward = 250
	if item_id in ["ITEM_DIAMOND","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE","ITEM_MAGNETITE","ITEM_HEAT_CRYSTAL","ITEM_COLD_CRYSTAL","ITEM_CHROME_ORE","ITEM_NICKEL_ORE","ITEM_LEAD_ORE"]:
		tier = "RARE"
		reward = 500
		grant_skill_point("RARE_SCAN","RARE_RESOURCE_SCAN")
	_claim_once("SCAN:"+str(world_seed)+":"+item_id+":"+tier,"RESOURCE_SCANNED",reward)
	notification.emit("자원 스캔 · "+GameData.item_name(item_id))

func harvest_dori_tree(tree_id: String, mature: bool) -> bool:
	if not mature:
		notification.emit("나무가 아직 자라는 중이야.")
		return false
	add_item("ITEM_DORI_MEAT",1,92.0,90.0,false,"DORI_TREE:"+tree_id)
	claim_research_sample(tree_id,"ITEM_DORI_MEAT")
	_claim_once("FIRST_DORI_MEAT_HARVEST","DORI_TREE_HARVEST",1000)
	grant_skill_point("DORI_TREE_DISCOVERED","DORI_TREE_DISCOVERY")
	return true

func _claim_once(event_id: String, kind: String, rp: int = 0) -> void:
	if _event_ids.has(event_id):
		return
	_event_ids[event_id] = true
	if rp>0:
		research_points += rp
		research_point_ledger.append({"source_id":kind,"event_id":event_id,"claim_id":event_id,"amount":rp,"created_at_tick":simulation_tick})
		state_changed.emit()

func grant_skill_point(claim_id: String,source: String) -> bool:
	var event_id := "SKILL_POINT:"+claim_id
	if _event_ids.has(event_id):
		return false
	_event_ids[event_id] = true
	skill_points += 1
	skill_point_ledger.append({"claim_id":event_id,"amount":1,"source":source,"created_at_tick":simulation_tick})
	notification.emit("Skill Point +1 · "+source)
	save_game()
	state_changed.emit()
	return true

func unlock_skill(skill_id: String) -> bool:
	if skill_id in skills_unlocked:
		return false
	var definition: Dictionary = GameData.SKILLS.filter(func(s): return s.id==skill_id).front() if GameData.SKILLS.any(func(s): return s.id==skill_id) else {}
	if definition.is_empty():
		return false
	for prerequisite in definition.requires:
		if prerequisite not in skills_unlocked:
			notification.emit("선행 스킬이 필요해 · "+str(prerequisite))
			return false
	if skill_points<1:
		notification.emit("Skill Point가 부족해.")
		return false
	skill_points -= 1
	skills_unlocked.append(skill_id)
	skill_point_ledger.append({"claim_id":"SKILL_BUY:"+skill_id,"amount":-1,"source":"SKILL_PURCHASE","created_at_tick":simulation_tick})
	notification.emit("스킬 해금 · "+str(definition.name))
	save_game()
	state_changed.emit()
	return true

func has_skill(skill_id: String) -> bool:
	return skill_id in skills_unlocked

func respec_skill_tree() -> bool:
	if skill_respec_used or not research_completed.has("RESEARCH_INFINITY_INDUSTRY") or not buildings.any(func(m): return m.id=="SKILL_RESPEC_TERMINAL" and float(m.condition)>0.0):
		notification.emit("스킬 초기화에는 Skill Respec Terminal과 Infinity Industry 연구가 필요해.")
		return false
	skill_points += skills_unlocked.size()
	skills_unlocked.clear()
	skill_respec_used = true
	notification.emit("스킬 초기화 완료 · 남은 재분배 기회 0회")
	save_game()
	state_changed.emit()
	return true

func claim_research_sample(node_id: String,item_id: String) -> bool:
	var token_id := "RESEARCH_SAMPLE:"+str(world_seed)+":"+node_id
	if _event_ids.has(token_id):
		return false
	_event_ids[token_id] = true
	add_item("ITEM_RESEARCH_SAMPLE",1,90.0,90.0,false,token_id+":"+item_id)
	return true

func analyze_research_sample() -> bool:
	var lots := consume_items_with_lots({"ITEM_RESEARCH_SAMPLE":1},false)
	if lots.is_empty():
		notification.emit("분석할 연구 샘플이 없어.")
		return false
	var sample: Dictionary = lots[0]
	var event_id := "RESEARCH_SAMPLE_ANALYSIS:"+str(sample.get("stack_id",""))
	if _event_ids.has(event_id):
		notification.emit("이미 분석한 연구 샘플이야.")
		return false
	_claim_once(event_id,"RESEARCH_SAMPLE_ANALYSIS",1000)
	notification.emit("연구 샘플 분석 완료 · +1,000 RP")
	save_game()
	return true

func claim_recipe_research_reward(recipe_id: String) -> void:
	var reward := 100
	if recipe_id.contains("DORONUM"):
		reward = 1500
	elif recipe_id in ["RECIPE_ADVANCED_CIRCUIT","RECIPE_CONTROL_MODULE","RECIPE_MOTOR","RECIPE_BATTERY","RECIPE_STEEL","RECIPE_TITANIUM_INGOT"]:
		reward = 1000
	elif recipe_id in ["RECIPE_IRON_ORE_TO_MOLTEN_IRON","RECIPE_COPPER_SMELT","RECIPE_GOLD_INGOT","RECIPE_CHROME_INGOT","RECIPE_NICKEL_INGOT","RECIPE_LEAD_INGOT"]:
		reward = 250
	else:
		reward = 100
	_claim_once("FIRST_RECIPE:"+recipe_id,"FIRST_RECIPE_SUCCESS",reward)

func claim_special_edition_batch_contract() -> bool:
	if not bool(story_flags.get("ARCHIVE_RESTORED",false)) or "RESEARCH_DORONUM_CRYSTAL" not in research_completed:
		notification.emit("특별판 배치 계약 · First Factory Archive와 Doronum Crystal 연구가 필요해.")
		return false
	var event_id := "CONTRACT:SPECIAL_EDITION_PATTERN_BATCH"
	if _event_ids.has(event_id):
		notification.emit("특별판 패턴 계약은 이미 수령했어.")
		return false
	add_item("ITEM_ARCHIVE_PATTERN",100,100.0,100.0,false,"FIRST_FACTORY_ARCHIVE_CONTRACT")
	_event_ids[event_id] = true
	story_flags["SPECIAL_EDITION_BATCH_RESEARCHED"] = true
	notification.emit("특별판 배치 계약 완료 · Archive Pattern 100개 지급")
	save_game()
	return true

func claim_limited_edition_batch_contract() -> bool:
	if not bool(story_flags.get("ACT_V_COMPLETE",false)) or "RESEARCH_DORONUM_FUSION" not in research_completed:
		notification.emit("Legacy Batch 계약 · First Factory 복구와 Doronum Fusion 연구가 필요해.")
		return false
	var event_id := "CONTRACT:LIMITED_EDITION_SEALS"
	if _event_ids.has(event_id):
		notification.emit("Limited Edition 계약은 이미 완료했어.")
		return false
	var payment := {"ITEM_ADVANCED_CIRCUIT":50,"ITEM_STEEL_PLATE":50}
	if not consume_items(payment):
		notification.emit("Limited Edition 계약 납품 부족 · Advanced Circuit 50, Steel Plate 50")
		return false
	add_item("ITEM_CONTRACT_SEAL",100,100.0,100.0,false,"LEGACY_BATCH_CONTRACT")
	_event_ids[event_id] = true
	story_flags["LIMITED_EDITION_CONTRACT_ACTIVE"] = true
	notification.emit("Legacy Batch 계약 완료 · Contract Seal 100개 지급")
	save_game()
	return true

func start_research(research_id: String) -> bool:
	var definition: Dictionary = GameData.research_definition(research_id)
	if definition.is_empty() or research_id in research_completed or not active_research.is_empty():
		return false
	for prerequisite in definition.requires:
		if prerequisite not in research_completed:
			notification.emit("선행 연구가 필요해: " + str(prerequisite))
			return false
	if research_points < int(definition.rp):
		notification.emit("연구 포인트가 부족해.")
		return false
	var lab_exists := buildings.any(func(machine): return machine.id == "RESEARCH_LAB" and float(machine.condition) > 0.0)
	if not lab_exists:
		notification.emit("연구를 진행할 연구소를 먼저 건설해야 해.")
		return false
	if definition.power > 0.0 and total_power_generated < float(definition.power):
		notification.emit("연구소 전력 부족 · 필요 %.0f kW" % float(definition.power))
		return false
	research_points -= int(definition.rp)
	research_point_ledger.append({"source_id":"RESEARCH_COST","event_id":"RESEARCH_COST:"+research_id,"claim_id":"RESEARCH_COST:"+research_id,"amount":-int(definition.rp),"created_at_tick":simulation_tick})
	active_research = research_id
	research_progress = 0.0
	notification.emit("연구 시작 · " + str(definition.name))
	state_changed.emit()
	return true

func _tick_research(dt: float) -> void:
	if active_research.is_empty():
		return
	var definition: Dictionary = GameData.research_definition(active_research)
	if total_power_generated - total_power_used < float(definition.power):
		return
	research_progress += dt
	if research_progress >= float(definition.time):
		research_completed.append(active_research)
		var completed_tier := int(definition.tier)
		if completed_tier>=1:
			grant_skill_point("TIER:"+str(completed_tier),"TIER_"+str(completed_tier)+"_REACHED")
		notification.emit("연구 완료 · " + str(definition.name))
		if active_research == "RESEARCH_DORONUM_FUSION" and bool(story_flags.get("STORY_INCIDENT_RECONSTRUCTED",false)) and bool(story_flags.get("ACT_V_COMPLETE",false)):
			story_flags["ORBIT_04"] = true
		_claim_once("RESEARCH:" + active_research, "RESEARCH_COMPLETE", 0)
		state_changed.emit()
		active_research = ""
		research_progress = 0.0

func collect_machine_output(instance_id: String) -> bool:
	for machine in buildings:
		if machine.instance_id != instance_id or machine.output.is_empty():
			continue
		for stack in machine.output:
			add_item(stack.item_id, stack.quantity, stack.quality, stack.purity, stack.synthetic, stack.provenance)
		machine.output.clear()
		machine.state = "IDLE"
		state_changed.emit()
		return true
	return false

func supply_machine(instance_id: String, item_id: String, quantity: int) -> bool:
	if quantity <= 0 or count_item(item_id) < quantity:
		return false
	for machine in buildings:
		if machine.instance_id != instance_id:
			continue
		if not consume_items({item_id:quantity}):
			return false
		machine.input.append({"item_id":item_id,"quantity":quantity,"quality":90.0,"purity":90.0,"synthetic":false,"provenance":"PLAYER_SUPPLY"})
		notification.emit("기계 투입 · %s ×%d" % [GameData.item_name(item_id),quantity])
		return true
	return false

func set_machine_recipe(instance_id: String, recipe_id: String) -> bool:
	var recipe: Dictionary = GameData.recipe_definition(recipe_id)
	if recipe.is_empty():
		return false
	if recipe.has("story") and not bool(story_flags.get(str(recipe.story),false)):
		notification.emit("스토리/계약 조건 미완료 · "+str(recipe.story))
		return false
	if int(recipe.get("supply_cap",0))>0:
		var supply_key := "DORONUM_SUPPLY:"+str(recipe.outputs.keys()[0] if recipe.has("outputs") else recipe_id)
		if int(story_flags.get(supply_key,0))>=int(recipe.supply_cap):
			notification.emit("해당 한정 배치의 생산 상한에 도달했어.")
			return false
	for machine in buildings:
		if machine.instance_id == instance_id and machine.id == recipe.machine:
			machine.recipe = recipe_id
			machine.progress = 0.0
			machine.job_started = false
			notification.emit("레시피 설정 · " + str(recipe.name))
			return true
	return false

func fusion_preflight() -> Array[String]:
	var errors: Array[String] = []
	if "RESEARCH_INFINITY_INDUSTRY" not in research_completed:
		errors.append("Infinity Industry 연구가 필요해.")
	if not buildings.any(func(m): return m.id=="INFINITY_FUSION_MACHINE" and float(m.condition)>0.0):
		errors.append("정상 상태의 Infinity Fusion Machine이 없어.")
	if not fusion.is_empty():
		errors.append("이미 퓨전 작업이 진행 중이거나 결과가 있어.")
	if not bool(story_flags.get("STORY_INCIDENT_RECONSTRUCTED",false)):
		errors.append("BLUE FURNACE INCIDENT 기록 4개를 모두 복구해야 해.")
	if not bool(story_flags.get("ORBIT_04",false)):
		errors.append("ORBIT 04 권한과 INFINITE PROJECT 기록이 필요해.")
	for flag in ["ARCHIVE_RESTORED","COOLING_CORE_RESTORED","RESONANCE_CHAMBER_RESTORED"]:
		if not bool(story_flags.get(flag,false)):
			errors.append("FIRST FACTORY 복구 필요 · "+flag)
	for diagnostic in fusion_diagnostics:
		if not bool(fusion_diagnostics[diagnostic]):
			errors.append("최종 진단 미완료 · "+diagnostic)
	for required_building in ["FUSION_POWER_BUFFER","FUSION_CONTAINMENT_SHIELD","EMERGENCY_COOLING_SYSTEM","PRESSURE_CALIBRATION_RIG","COOLING_STABILIZER"]:
		if not buildings.any(func(m): return m.id==required_building and float(m.condition)>0.0):
			errors.append("최종 안전 설비 누락 · "+required_building)
	if float(power_state.get("fusion_buffer_kwh",0.0)) < 400.0:
		errors.append("독립 전력 버퍼 충전 부족 · 400kWh 이상 필요 (현재 %.1fkWh)" % float(power_state.get("fusion_buffer_kwh",0.0)))
	for item_id in GameData.DORONUM_IDS:
		var total := 0
		for stack in inventory:
			if stack.item_id != item_id or bool(stack.synthetic) or float(stack.quality)<90.0 or float(stack.purity)<90.0:
				continue
			total += int(stack.quantity)-int(stack.get("reserved",0))
		if total < 100:
			errors.append("%s: 유효한 비합성 Q/P≥90 재료 %d/100 부족" % [GameData.item_name(item_id),total])
	return errors

func start_infinity_fusion() -> bool:
	var errors := fusion_preflight()
	if not errors.is_empty():
		notification.emit("퓨전 시작 불가 · "+errors[0])
		return false
	var snapshot: Array[Dictionary] = inventory.duplicate(true)
	var custody: Array[Dictionary] = []
	var material_quality_sum := 0.0
	var input_purity_sum := 0.0
	var manifest: Array[Dictionary] = []
	for item_id in GameData.DORONUM_IDS:
		var remaining := 100
		for stack in inventory:
			if stack.item_id != item_id or bool(stack.synthetic) or float(stack.quality)<90.0 or float(stack.purity)<90.0:
				continue
			var take := mini(remaining,int(stack.quantity)-int(stack.get("reserved",0)))
			if take <= 0:
				continue
			var reserved_stack: Dictionary = stack.duplicate(true)
			reserved_stack.quantity = take
			custody.append(reserved_stack)
			manifest.append({"stack_id":str(stack.stack_id),"item_id":item_id,"quantity":take,"quality":float(stack.quality),"purity":float(stack.purity),"synthetic":false,"provenance":str(stack.provenance)})
			material_quality_sum += float(stack.quality)*take
			input_purity_sum += float(stack.purity)*take
			stack.quantity -= take
			remaining -= take
			if remaining == 0:
				break
		if remaining > 0:
			inventory = snapshot
			notification.emit("원자 예약 실패 · 모든 재료가 원래 상태로 복구됐어.")
			return false
	inventory = inventory.filter(func(s): return int(s.quantity)>0)
	var job_id := "FUSION-"+_new_stack_id()
	fusion = {
		"job_id":job_id,"manifest":manifest,"manifest_checksum":hash(JSON.stringify(manifest)),
		"stage":0,"stage_progress":0.0,"temperature":20.0,"pressure":0.0,
		"failure_exposure":0.0,"rng_index":0,"hazard_multiplier":1.0,"output_committed":false,
		"reserved_inputs":1500,"custody":custody,"state":"RUNNING",
		"input_material_quality":material_quality_sum/1500.0,
		"input_purity":input_purity_sum/1500.0,
		"temperature_quality_sum":0.0,"pressure_quality_sum":0.0,"condition_quality_sum":0.0,
		"progress_sample_seconds":0.0,"power_ratio_sum":0.0,"power_ratio_square_sum":0.0,"power_sample_count":0,
		"purity_loss":0.0,"purification_bonus":0.0,"output_purity_modifier":0.0,
		"recovery_ratio":1.0,"failure_loss_manifest":[],
		"interlocks":{"power":true,"cooling":true,"shield":true,"emergency":true}
	}
	_event_ids["FUSION_START:"+job_id] = true
	notification.emit("Infinity Fusion 시작 · 정확한 15종 × 100개 원자 예약 완료")
	save_game()
	return true

func _fusion_process_score(actual: float,target: float) -> float:
	var deviation := absf(actual-target)/maxf(0.0001,absf(target))*100.0
	if deviation<=1.0: return 100.0
	if deviation<=3.0: return 95.0
	if deviation<=5.0: return 85.0
	if deviation<=10.0: return 70.0
	return 50.0

func _fusion_power_stability() -> float:
	var count := int(fusion.get("power_sample_count",0))
	if count<=0:
		return 0.0
	var mean := float(fusion.power_ratio_sum)/count
	var mean_square := float(fusion.power_ratio_square_sum)/count
	var deviation := sqrt(maxf(0.0,mean_square-mean*mean))
	return clampf(100.0*mean-50.0*deviation,0.0,100.0)

func _tick_fusion(dt: float) -> void:
	if fusion.is_empty() or str(fusion.get("state","")).begins_with("FAILED") or bool(fusion.get("output_committed",false)):
		return
	var stage_index := int(fusion.get("stage",0))
	if stage_index<0 or stage_index>=GameData.FUSION_STAGES.size():
		fusion.state = "ERROR_INVALID_STAGE"
		notification.emit("Fusion 오류 · 잘못된 단계 인덱스. 출력은 생성하지 않았어.")
		return
	var stage_data: Dictionary = GameData.FUSION_STAGES[stage_index]
	var ratio := clampf(float(power_state.get("fusion_power_ratio",0.0)),0.0,1.0)
	if ratio<0.8 or not _fusion_interlocks_valid():
		fusion.state = "PAUSED_SAFETY" if not _fusion_interlocks_valid() else "PAUSED_POWER"
		return
	fusion.state = "RUNNING" if ratio>=1.0 else "BROWNOUT_RUNNING"
	var temperature_target := float(stage_data.temperature)
	var pressure_target := float(stage_data.pressure)
	fusion.temperature = move_toward(float(fusion.temperature),temperature_target,180.0*dt)
	fusion.pressure = move_toward(float(fusion.pressure),pressure_target,600.0*dt)
	var temperature_ok := absf(float(fusion.temperature)-temperature_target)<=maxf(5.0,temperature_target*0.10)
	var pressure_ok := absf(float(fusion.pressure)-pressure_target)<=maxf(1.0,pressure_target*0.10)
	if not temperature_ok or not pressure_ok:
		fusion.state = "RAMPING"
		return
	var progress_delta := dt*ratio
	fusion.stage_progress += progress_delta
	fusion.failure_exposure += dt
	fusion.temperature_quality_sum += _fusion_process_score(float(fusion.temperature),temperature_target)*progress_delta
	fusion.pressure_quality_sum += _fusion_process_score(float(fusion.pressure),pressure_target)*progress_delta
	var fusion_machine := buildings.filter(func(m): return m.id=="INFINITY_FUSION_MACHINE")
	var condition := 0.0 if fusion_machine.is_empty() else clampf(float(fusion_machine[0].condition),0.0,100.0)
	fusion.condition_quality_sum += condition*progress_delta
	fusion.progress_sample_seconds += progress_delta
	fusion.power_ratio_sum += ratio
	fusion.power_ratio_square_sum += ratio*ratio
	fusion.power_sample_count += 1
	fusion.rng_index += 1
	var chance := 1.0-pow(0.99,dt/260.0)
	if _deterministic_unit(int(fusion.rng_index))<chance:
		var severity_roll := _deterministic_unit(int(fusion.rng_index)+900000)
		var severity := "FAILED_MINOR" if severity_roll<0.30 else ("FAILED_MAJOR" if severity_roll<0.75 else "FAILED_CRITICAL")
		var recovery_ratio := 1.0 if severity=="FAILED_MINOR" else (0.95 if severity=="FAILED_MAJOR" else 0.80)
		fusion.state = severity
		fusion.recovery_ratio = recovery_ratio
		fusion.failure_event_id = "FUSION-FAIL-"+str(fusion.rng_index)
		var loss_manifest: Array[Dictionary] = []
		for lot in fusion.custody:
			var returned := int(floor(float(lot.quantity)*recovery_ratio))
			var lost := int(lot.quantity)-returned
			if lost>0:
				loss_manifest.append({"item_id":lot.item_id,"quantity":lost,"source_stack_id":lot.stack_id})
		fusion.failure_loss_manifest = loss_manifest
		for machine in buildings:
			if machine.id=="INFINITY_FUSION_MACHINE":
				machine.condition = maxf(0.0,float(machine.condition)-(5.0 if severity=="FAILED_MINOR" else (20.0 if severity=="FAILED_MAJOR" else 40.0)))
		notification.emit("퓨전 이상 감지 · %s · 회수 가능 비율 %.0f%%. 손실 내역을 저장했어." % [severity,recovery_ratio*100.0])
		save_game()
		return
	if fusion.stage_progress>=float(stage_data.seconds):
		fusion.stage += 1
		fusion.stage_progress = 0.0
		fusion_stage_changed.emit(int(fusion.stage))
		save_game()
		if int(fusion.stage)>=GameData.FUSION_STAGES.size():
			var elapsed := maxf(0.0001,float(fusion.progress_sample_seconds))
			var temperature_quality := float(fusion.temperature_quality_sum)/elapsed
			var pressure_quality := float(fusion.pressure_quality_sum)/elapsed
			var condition_quality := float(fusion.condition_quality_sum)/elapsed
			var power_stability := _fusion_power_stability()
			var raw_quality := float(fusion.input_material_quality)*0.40+temperature_quality*0.20+pressure_quality*0.20+condition_quality*0.10+power_stability*0.10
			var output_quality := clampf(raw_quality,0.0,100.0)
			var output_purity := clampf(float(fusion.input_purity)-float(fusion.purity_loss)+float(fusion.purification_bonus)+float(fusion.output_purity_modifier),0.0,100.0)
			fusion.output_committed = true
			fusion.state = "COMPLETED"
			fusion.output_buffer = {"item_id":"ITEM_DORONUM_INFINITY","quantity":1,"quality":output_quality,"purity":output_purity,"synthetic":false,"provenance":"INFINITY_FUSION:"+str(fusion.job_id)}
			fusion.custody = []
			fusion.reserved_inputs = 0
			story_flags["INFINITY_CRAFTED"] = true
			_event_ids["FUSION_OUTPUT:"+str(fusion.job_id)] = true
			notification.emit("INFINITY DORONUM ×1 · Q %.2f / P %.2f · 생산 완료" % [output_quality,output_purity])
			save_game()

func collect_infinity_output() -> bool:
	if fusion.is_empty() or not bool(fusion.get("output_committed",false)) or fusion.get("output_buffer",{}).is_empty():
		return false
	var payload: Dictionary = fusion.output_buffer
	var event_id := "FUSION_COLLECT:"+str(fusion.get("job_id",""))
	if _event_ids.has(event_id):
		return false
	add_item(str(payload.item_id),int(payload.quantity),float(payload.quality),float(payload.purity),bool(payload.synthetic),str(payload.provenance))
	_event_ids[event_id] = true
	fusion.output_buffer = {}
	save_game()
	return true

func run_fusion_diagnostic(diagnostic_id: String) -> bool:
	if not fusion_diagnostics.has(diagnostic_id) or bool(fusion_diagnostics[diagnostic_id]):
		return false
	match diagnostic_id:
		"power_stability":
			if not buildings.any(func(m): return m.id=="FUSION_POWER_BUFFER" and float(m.condition)>0.0) or float(power_state.get("fusion_buffer_kwh",0.0))<400.0:
				notification.emit("전력 안정성 검사 실패 · 독립 버퍼 400kWh 이상 충전이 필요해.")
				return false
		"pressure_calibration":
			if "RESEARCH_HIGH_PRESSURE" not in research_completed or not buildings.any(func(m): return m.id=="PRESSURE_CALIBRATION_RIG" and float(m.condition)>0.0):
				notification.emit("압력 센서 교정 실패 · 고압 연구와 압력 교정 장치가 필요해.")
				return false
		"emergency_cooling":
			if not buildings.any(func(m): return m.id=="EMERGENCY_COOLING_SYSTEM" and float(m.condition)>0.0) or count_item("ITEM_COLD_CRYSTAL")<1:
				notification.emit("비상 냉각 검사 실패 · 비상 냉각 시스템과 Cold Crystal이 필요해.")
				return false
	fusion_diagnostics[diagnostic_id] = true
	notification.emit("퓨전 안전 진단 통과 · "+diagnostic_id)
	save_game()
	state_changed.emit()
	return true

func _deterministic_unit(index: int) -> float:
	var value := sin(float(world_seed)*0.000013+float(index)*12.9898)*43758.5453
	return value-floorf(value)

func _fusion_interlocks_valid() -> bool:
	if fusion.is_empty():
		return false
	var requirements := {
		"power":"FUSION_POWER_BUFFER",
		"cooling":"COOLING_STABILIZER",
		"shield":"FUSION_CONTAINMENT_SHIELD",
		"emergency":"EMERGENCY_COOLING_SYSTEM"
	}
	for key in requirements:
		if not bool(fusion.interlocks.get(key,false)):
			return false
		if not buildings.any(func(m): return m.id==requirements[key] and float(m.condition)>0.0):
			return false
	return true

func set_fusion_interlock(key: String,enabled: bool) -> void:
	if fusion.is_empty() or not fusion.interlocks.has(key):
		return
	var requirements := {"power":"FUSION_POWER_BUFFER","cooling":"COOLING_STABILIZER","shield":"FUSION_CONTAINMENT_SHIELD","emergency":"EMERGENCY_COOLING_SYSTEM"}
	if enabled and (not requirements.has(key) or not buildings.any(func(m): return m.id==requirements[key] and float(m.condition)>0.0)):
		notification.emit("안전 인터록 연결 실패 · "+key)
		return
	fusion.interlocks[key] = enabled
	if not enabled:
		fusion.state = "PAUSED_SAFETY"
	save_game()

func activate_relay(index: int) -> bool:
	if not bool(story_flags.get("INFINITY_CRAFTED",false)) or index<0 or index>=3 or index>=relays.size():
		return false
	var active_count := relays.filter(func(r): return bool(r.active)).size()
	if relays[index].active:
		return false
	if active_count>=3 or total_power_generated-total_power_used<100.0:
		notification.emit("릴레이 활성화 실패 · 전력 100kW와 고유 릴레이가 필요해.")
		return false
	var relay_machine := buildings.filter(func(m): return m.instance_id==relays[index].instance_id and m.id=="STABILIZATION_RELAY" and float(m.condition)>0.0)
	if relay_machine.is_empty():
		return false
	relays[index].active = true
	story_flags["RELAY_%d_ACTIVE" % (index+1)] = true
	notification.emit("행성 에너지 릴레이 %d/3 활성화" % (index+1))
	save_game()
	state_changed.emit()
	return true

func install_infinity_core() -> bool:
	if not bool(story_flags.get("INFINITY_CRAFTED",false)) or core_installed or count_item("ITEM_DORONUM_INFINITY")<1:
		return false
	if relays.size()!=3 or not buildings.any(func(m): return m.id=="STABILIZATION_CORE" and float(m.condition)>0.0):
		notification.emit("Stabilization Core와 정확히 3개의 Relay를 설치해야 해.")
		return false
	if not relays.all(func(r): return bool(r.active)):
		notification.emit("3개 Relay를 모두 활성화해야 해.")
		return false
	if not consume_items({"ITEM_DORONUM_INFINITY":1}):
		return false
	core_installed = true
	stabilization_phase = 1
	stabilization_progress = 0.0
	stabilization_running = false
	story_flags["CORE_INSTALLED"] = true
	notification.emit("Infinity Doronum이 Stabilization Core에 설치됐어.")
	save_game()
	return true

func start_stabilization_phase() -> bool:
	if not core_installed or ending_complete or stabilization_phase<1 or stabilization_phase>3:
		return false
	if not bool(story_flags.get("ORBIT_04",false)) or relays.size()!=3 or not relays.all(func(r): return bool(r.active)):
		notification.emit("ORBIT 04와 세 릴레이 동기화가 필요해.")
		return false
	if total_power_generated<total_power_used:
		notification.emit("행성 안정화 전력 부족 · Relay/Core 800kW 부하를 감당할 발전량이 필요해.")
		return false
	stabilization_running = true
	notification.emit("행성 안정화 동기화 시작 · Phase %d" % stabilization_phase)
	save_game()
	return true

func _tick_planetary_stabilization(dt: float) -> void:
	if not stabilization_running or ending_complete:
		return
	if not core_installed or relays.size()!=3 or not relays.all(func(r): return bool(r.active)) or total_power_generated<total_power_used:
		stabilization_running = false
		notification.emit("행성 안정화 일시 정지 · 전력/릴레이/코어 인터록 확인")
		return
	var durations := [60.0,90.0,120.0]
	stabilization_progress += dt
	if stabilization_progress<durations[stabilization_phase-1]:
		return
	stabilization_progress = 0.0
	stabilization_running = false
	story_flags["STABILIZATION_PHASE_%d" % stabilization_phase] = true
	stabilization_phase += 1
	if stabilization_phase>3:
		ending_complete = true
		post_endgame = true
		story_flags["PLANETARY_STABILIZATION_COMPLETE"] = true
		notification.emit("ORBIT: Energy network synchronization complete. Planetary instability decreasing. Factory operational.")
		ending_started.emit()
	else:
		notification.emit("행성 안정화 동기화 완료 · 다음 Phase %d" % stabilization_phase)
	save_game()
	state_changed.emit()

func complete_stabilization_phase() -> bool:
	return start_stabilization_phase()

func recover_fusion_failure() -> bool:
	if fusion.is_empty() or not str(fusion.get("state","")).begins_with("FAILED"):
		return false
	var custody: Array = fusion.get("custody",[])
	var return_ratio := clampf(float(fusion.get("recovery_ratio",1.0)),0.0,1.0)
	var total_lost := 0
	for reserved_stack in custody:
		var return_quantity := int(floor(float(reserved_stack.quantity)*return_ratio))
		var lost_quantity := int(reserved_stack.quantity)-return_quantity
		total_lost += lost_quantity
		if return_quantity<=0:
			continue
		var existing_index := -1
		for index in range(inventory.size()):
			if str(inventory[index].get("stack_id",""))==str(reserved_stack.get("stack_id","")):
				existing_index = index
				break
		if existing_index>=0:
			inventory[existing_index].quantity = int(inventory[existing_index].quantity)+return_quantity
		else:
			var restored: Dictionary = reserved_stack.duplicate(true)
			restored.quantity = return_quantity
			inventory.append(restored)
	if total_lost>0:
		add_item("ITEM_DORONUM_RESIDUE",total_lost,50.0,0.0,false,"FUSION_FAILURE:"+str(fusion.get("failure_event_id","")))
	_event_ids["FUSION_RECOVERY:"+str(fusion.get("failure_event_id",""))] = true
	fusion.clear()
	notification.emit("퓨전 안전 복구 완료 · %.0f%% 재료 회수 / 손실 %d개는 Doronum Residue로 기록했어." % [return_ratio*100.0,total_lost])
	save_game()
	state_changed.emit()
	return true

func _consume_quality_lots(item_id: String, quantity: int, min_quality: float, min_purity: float) -> bool:
	var remaining := quantity
	for stack in inventory:
		if stack.item_id != item_id or stack.synthetic or stack.quality < min_quality or stack.purity < min_purity:
			continue
		var take := mini(remaining, int(stack.quantity) - int(stack.get("reserved", 0)))
		stack.quantity -= take
		remaining -= take
		if remaining == 0:
			break
	if remaining > 0:
		return false
	inventory = inventory.filter(func(s): return s.quantity > 0)
	return true

func find_lore(lore_id: String) -> void:
	if lore_id in lore_found:
		return
	lore_found.append(lore_id)
	var reward := 500
	if lore_id.contains("INCIDENT"):
		reward = 2500
	elif lore_id.contains("FIRST_FACTORY") or lore_id.contains("INFINITY"):
		reward = 10000
	_claim_once("LORE:"+lore_id,"LORE_RESTORED",reward)
	notification.emit("기록 복구 · "+lore_id+" · +%d RP" % reward)
	var required := ["LORE_INCIDENT_SAFETY_OVERRIDE","LORE_INCIDENT_POWER_OSCILLATION","LORE_INCIDENT_COOLING_FAILURE","LORE_INCIDENT_ARCHIVE_EDIT"]
	if required.all(func(id): return id in lore_found):
		story_flags["STORY_INCIDENT_RECONSTRUCTED"] = true
		grant_skill_point("INCIDENT_RECONSTRUCTED","INCIDENT_RECONSTRUCTION")
		notification.emit("BLUE FURNACE INCIDENT 재구성 완료")

func save_game() -> void:
	if save_blocked:
		return
	save_revision += 1
	if save_id.is_empty():
		save_id = "DF-SAVE-%d" % world_seed
	var data := {
		"version":GameData.SAVE_VERSION,"build_version":"0.2.0","canonical_data_version":1,
		"world_generator_version":1,"simulation_rules_version":1,"save_id":save_id,
		"save_revision":save_revision,"simulation_tick":simulation_tick,"world_seed":world_seed,
		"player_position":[player_position.x,player_position.y,player_position.z],"equipped_tool":equipped_tool,
		"inventory":inventory,"buildings":buildings,"discovered_nodes":discovered_nodes,"resource_depletion":resource_depletion,"tree_states":tree_states,
		"research_completed":research_completed,"active_research":active_research,"research_progress":research_progress,
		"research_points":research_points,"story_flags":story_flags,"lore_found":lore_found,
		"fusion":fusion,"fusion_diagnostics":fusion_diagnostics,"relays":relays,
		"core_installed":core_installed,"stabilization_phase":stabilization_phase,
		"ending_complete":ending_complete,"post_endgame":post_endgame,
		"production_history":production_history,"research_point_ledger":research_point_ledger,"skill_points":skill_points,"skills_unlocked":skills_unlocked,"skill_point_ledger":skill_point_ledger,"skill_respec_used":skill_respec_used,"power_state":power_state,"stabilization_progress":stabilization_progress,"stabilization_running":stabilization_running,"event_ids":_event_ids,"next_stack_id":_next_stack_id
	}
	data["checksum"] = hash(JSON.stringify(data))
	var temporary_path := SAVE_PATH + ".tmp"
	var file := FileAccess.open(temporary_path,FileAccess.WRITE)
	if file == null:
		notification.emit("저장 실패 · 임시 파일을 열 수 없어.")
		return
	file.store_string(JSON.stringify(data))
	file.flush()
	file.close()
	var absolute_temp := ProjectSettings.globalize_path(temporary_path)
	var absolute_save := ProjectSettings.globalize_path(SAVE_PATH)
	var absolute_backup := ProjectSettings.globalize_path(SAVE_PATH+".bak")
	if FileAccess.file_exists(SAVE_PATH):
		if not _read_save_file(SAVE_PATH).is_empty():
			DirAccess.copy_absolute(absolute_save,absolute_backup)
		DirAccess.remove_absolute(absolute_save)
	var error := DirAccess.rename_absolute(absolute_temp,absolute_save)
	if error != OK:
		notification.emit("저장 교체 실패 · 백업 파일은 보존했어.")

func _read_save_file(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path,FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return {}
	if parsed.has("checksum"):
		var checksum := int(parsed.checksum)
		var clean: Dictionary = parsed.duplicate(true)
		clean.erase("checksum")
		if hash(JSON.stringify(clean)) != checksum:
			return {}
	return parsed

func load_game() -> void:
	var parsed := _read_save_file(SAVE_PATH)
	if parsed.is_empty():
		parsed = _read_save_file(SAVE_PATH+".bak")
		if not parsed.is_empty():
			notification.emit("기본 저장을 읽지 못해 백업에서 복구했어.")
	if parsed.is_empty():
		if FileAccess.file_exists(SAVE_PATH):
			save_blocked = true
			notification.emit("저장 데이터와 백업이 손상됐어. 원본 파일을 보호하기 위해 저장을 중지했어.")
		return
	var loaded_version := int(parsed.get("version",0))
	if loaded_version > GameData.SAVE_VERSION:
		save_blocked = true
		notification.emit("이 저장은 더 최신 버전이야. 덮어쓰지 않을게.")
		return
	if loaded_version<1:
		save_blocked = true
		notification.emit("저장 버전이 유효하지 않아. 원본을 보호했어.")
		return
	save_loaded = true
	if loaded_version==1:
		parsed["version"] = GameData.SAVE_VERSION
		parsed["canonical_data_version"] = 1
		parsed["world_generator_version"] = 1
		parsed["simulation_rules_version"] = 1
		parsed["save_id"] = "DF-SAVE-%d" % int(parsed.get("world_seed",GameData.WORLD_SEED))
		parsed["save_revision"] = 0
		parsed["simulation_tick"] = 0
	world_seed = int(parsed.get("world_seed", GameData.WORLD_SEED))
	save_id = str(parsed.get("save_id","DF-SAVE-%d" % world_seed))
	save_revision = int(parsed.get("save_revision",0))
	simulation_tick = int(parsed.get("simulation_tick",0))
	equipped_tool = str(parsed.get("equipped_tool","ITEM_TOOL_HANDS"))
	player_position = Vector3(parsed.get("player_position", [0,0,0])[0], parsed.get("player_position", [0,0,0])[1], parsed.get("player_position", [0,0,0])[2])
	inventory.assign(parsed.get("inventory", []))
	buildings.assign(parsed.get("buildings", []))
	discovered_nodes = parsed.get("discovered_nodes", {})
	resource_depletion = parsed.get("resource_depletion",{})
	tree_states = parsed.get("tree_states",{})
	research_completed.assign(parsed.get("research_completed", ["RESEARCH_BASIC_SURVIVAL"]))
	active_research = str(parsed.get("active_research", ""))
	research_progress = float(parsed.get("research_progress", 0.0))
	research_points = int(parsed.get("research_points", 0))
	story_flags = parsed.get("story_flags", {})
	lore_found.assign(parsed.get("lore_found", []))
	fusion = parsed.get("fusion", {})
	fusion_diagnostics = parsed.get("fusion_diagnostics",{"power_stability":false,"pressure_calibration":false,"emergency_cooling":false})
	relays.assign(parsed.get("relays", []))
	core_installed = bool(parsed.get("core_installed", false))
	stabilization_phase = int(parsed.get("stabilization_phase", 0))
	ending_complete = bool(parsed.get("ending_complete", false))
	post_endgame = bool(parsed.get("post_endgame", false))
	production_history.assign(parsed.get("production_history", []))
	research_point_ledger.assign(parsed.get("research_point_ledger", []))
	skill_points = int(parsed.get("skill_points",1))
	skills_unlocked.assign(parsed.get("skills_unlocked",[]))
	skill_point_ledger.assign(parsed.get("skill_point_ledger",[]))
	skill_respec_used = bool(parsed.get("skill_respec_used",false))
	power_state = parsed.get("power_state",{"starter_fuel_timer":0.0,"world_time":0.25,"fusion_buffer_kwh":0.0,"fusion_power_ratio":0.0})
	stabilization_progress = float(parsed.get("stabilization_progress",0.0))
	stabilization_running = bool(parsed.get("stabilization_running",false))
	_event_ids = parsed.get("event_ids", {})
	_next_stack_id = int(parsed.get("next_stack_id", 1))
