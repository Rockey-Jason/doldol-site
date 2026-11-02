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
var equipped_tool_condition := 100.0
var tool_conditions: Dictionary = {}
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
var blueprints: Dictionary = {}
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

func equip_tool(tool_id: String) -> bool:
	if tool_id=="ITEM_TOOL_HANDS":
		equipped_tool = tool_id
		equipped_tool_condition = 100.0
		save_game()
		state_changed.emit()
		return true
	if count_item(tool_id)<=0:
		return false
	equipped_tool = tool_id
	equipped_tool_condition = float(tool_conditions.get(tool_id,100.0))
	notification.emit("도구 장착 · "+GameData.item_name(tool_id))
	save_game()
	state_changed.emit()
	return true

func apply_tool_wear() -> void:
	if equipped_tool=="ITEM_TOOL_HANDS":
		return
	var wear := 1.0*(0.90 if has_skill("HARDPOINT_CALIBRATION") else 1.0)
	equipped_tool_condition = maxf(0.0,equipped_tool_condition-wear)
	tool_conditions[equipped_tool] = equipped_tool_condition
	if equipped_tool_condition<=0.0:
		var broken_tool := equipped_tool
		consume_items({broken_tool:1})
		tool_conditions.erase(broken_tool)
		equipped_tool = "ITEM_TOOL_HANDS"
		equipped_tool_condition = 100.0
		notification.emit("도구 파손 · "+GameData.item_name(broken_tool)+"이 부서졌어.")
	save_game()

func repair_equipped_tool() -> bool:
	if equipped_tool=="ITEM_TOOL_HANDS" or equipped_tool_condition>=100.0:
		return false
	var repair_material := "ITEM_STEEL_PLATE" if equipped_tool in ["ITEM_STEEL_PICKAXE","ITEM_DORONUM_PICKAXE"] else "ITEM_IRON_PLATE"
	if not consume_items({repair_material:1}):
		notification.emit("도구 수리 재료 부족 · "+GameData.item_name(repair_material))
		return false
	var repair_amount := 50.0*(1.10 if has_skill("PRECISE_ALIGNMENT") else 1.0)
	equipped_tool_condition = minf(100.0,equipped_tool_condition+repair_amount)
	tool_conditions[equipped_tool] = equipped_tool_condition
	notification.emit("도구 정비 완료 · Condition %.0f%%" % equipped_tool_condition)
	save_game()
	state_changed.emit()
	return true

func add_item(item_id: String, quantity: int, quality: float = 90.0, purity: float = 90.0, synthetic: bool = false, provenance: String = "UNKNOWN") -> void:
	if quantity<=0:
		return
	if not GameData.ITEMS.has(item_id) and item_id not in GameData.DORONUM_IDS:
		notification.emit("아이템 데이터 오류 · 알 수 없는 ID "+item_id)
		return
	if not is_finite(quality) or not is_finite(purity) or quality<0.0 or quality>100.0 or purity<0.0 or purity>100.0:
		notification.emit("아이템 데이터 오류 · Quality/Purity는 유한한 0–100 값이어야 해.")
		return
	inventory.append({
		"stack_id":_new_stack_id(),"item_id":item_id,"quantity":quantity,
		"quality":quality,"purity":purity,"synthetic":synthetic,
		"provenance":provenance,"reserved":0
	})
	notification.emit("+%d %s" % [quantity, GameData.item_name(item_id)])
	state_changed.emit()

func _new_stack_id() -> String:
	var random_bytes := Crypto.new().generate_random_bytes(16)
	_next_stack_id += 1
	return "STACK-"+random_bytes.hex_encode().to_upper()

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
	var profile: Dictionary = recipe.get("quality_profile",{})
	for score_key in ["temperature_quality","pressure_quality","machine_condition_quality","power_stability"]:
		if not profile.has(score_key) or not is_finite(float(profile[score_key])) or float(profile[score_key])<0.0 or float(profile[score_key])>100.0:
			notification.emit("수동 제작 QualityProfile 오류 · "+score_key)
			return false
	var modifier := float(profile.get("recipe_quality_modifier",0.0))
	var pollution := float(profile.get("pollution_penalty",0.0))
	if not is_finite(modifier) or modifier < -20.0 or modifier > 20.0 or not is_finite(pollution) or pollution<0.0 or pollution>100.0:
		notification.emit("수동 제작 QualityProfile 범위 오류")
		return false
	var material_weights: Dictionary = recipe.get("material_weights",{})
	var purity_weights: Dictionary = recipe.get("purity_weights",{})
	var declared_material_weight := 0.0
	var declared_purity_weight := 0.0
	for item_id in recipe.inputs:
		if not material_weights.has(item_id) or not purity_weights.has(item_id):
			notification.emit("수동 제작 Weight 누락 · "+str(item_id))
			return false
		var material_weight := float(material_weights[item_id])
		var purity_weight := float(purity_weights[item_id])
		if not is_finite(material_weight) or material_weight<0.0 or not is_finite(purity_weight) or purity_weight<0.0:
			notification.emit("수동 제작 Weight 데이터 오류 · "+str(item_id))
			return false
		declared_material_weight += int(recipe.inputs[item_id])*material_weight
		declared_purity_weight += int(recipe.inputs[item_id])*purity_weight
	if declared_material_weight<=0.0 and not recipe.has("base_material_quality"):
		notification.emit("BaseMaterialQuality가 없어 제작을 중단했어.")
		return false
	if declared_purity_weight<=0.0 and not recipe.has("base_output_purity"):
		notification.emit("BaseOutputPurity가 없어 제작을 중단했어.")
		return false
	var lots: Array[Dictionary] = consume_items_with_lots(recipe.inputs,true)
	if lots.is_empty():
		notification.emit("재료가 부족해.")
		return false
	var material_total := 0.0
	var material_weight_sum := 0.0
	var purity_total := 0.0
	var purity_weight_sum := 0.0
	var synthetic := false
	for lot in lots:
		var item_id := str(lot.item_id)
		var quantity := int(lot.quantity)
		var material_weight := float(material_weights.get(item_id,-1.0))
		var purity_weight := float(purity_weights.get(item_id,-1.0))
		material_total += float(lot.quality)*quantity*material_weight
		material_weight_sum += quantity*material_weight
		purity_total += float(lot.purity)*quantity*purity_weight
		purity_weight_sum += quantity*purity_weight
		synthetic = synthetic or bool(lot.synthetic)
	var material_quality := float(recipe.get("base_material_quality",0.0)) if material_weight_sum<=0.0 else material_total/material_weight_sum
	var output_purity_input := float(recipe.get("base_output_purity",0.0)) if purity_weight_sum<=0.0 else purity_total/purity_weight_sum
	var raw_quality := material_quality*0.40+float(profile.temperature_quality)*0.20+float(profile.pressure_quality)*0.20+float(profile.machine_condition_quality)*0.10+float(profile.power_stability)*0.10+modifier
	var output_quality := clampf(raw_quality-pollution,0.0,100.0)
	var output_purity := clampf(output_purity_input-float(recipe.get("purity_loss",0.0))+float(recipe.get("purification_bonus",0.0))+float(recipe.get("output_purity_modifier",0.0)),0.0,100.0)
	for output_id in recipe.outputs:
		add_item(output_id,int(recipe.outputs[output_id]),output_quality,output_purity,synthetic,"MANUAL_RECIPE:"+recipe_id)
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
		"input": [], "output": [], "storage": [], "target": "", "buffer_limit": 1
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

func save_factory_blueprint(slot: String) -> bool:
	if not has_skill("BLUEPRINT_TECHNICIAN"):
		notification.emit("Blueprint Technician 스킬이 필요해.")
		return false
	if buildings.is_empty():
		notification.emit("저장할 설비가 없어.")
		return false
	var center := Vector3.ZERO
	var count := 0
	for building in buildings:
		if building.id in ["STABILIZATION_RELAY","STABILIZATION_CORE"]:
			continue
		center += building.position
		count += 1
	if count<=0:
		return false
	center /= float(count)
	var entries: Array[Dictionary] = []
	for building in buildings:
		if building.id in ["STABILIZATION_RELAY","STABILIZATION_CORE"]:
			continue
		entries.append({
			"id":str(building.id),
			"offset":building.position-center,
			"rotation_y":float(building.get("rotation_y",0.0)),
			"recipe":str(building.get("recipe",""))
		})
	blueprints[slot] = {"slot":slot,"created_tick":simulation_tick,"buildings":entries}
	save_game()
	notification.emit("Factory Blueprint 저장 · Slot "+slot+" · %d 설비" % entries.size())
	state_changed.emit()
	return true

func place_factory_blueprint(slot: String,origin: Vector3) -> bool:
	if not has_skill("BLUEPRINT_TECHNICIAN"):
		notification.emit("Blueprint Technician 스킬이 필요해.")
		return false
	if not blueprints.has(slot):
		notification.emit("Blueprint Slot "+slot+" 비어 있어.")
		return false
	var entries: Array = blueprints[slot].get("buildings",[])
	if entries.is_empty():
		return false
	var placements: Array[Dictionary] = []
	var total_cost: Dictionary = {}
	for entry in entries:
		var building_id := str(entry.id)
		var definition: Dictionary = GameData.building_definition(building_id)
		if definition.is_empty() or not _is_unlocked(building_id):
			notification.emit("Blueprint 배치 중단 · 해금되지 않은 설비 "+building_id)
			return false
		var position: Vector3 = origin+entry.offset
		position.y = 0.0
		if absf(position.x)>GameData.WORLD_LIMIT or absf(position.z)>GameData.WORLD_LIMIT:
			notification.emit("Blueprint이 월드 경계를 벗어나.")
			return false
		for existing in buildings:
			if Vector2(existing.position.x,existing.position.z).distance_to(Vector2(position.x,position.z))<3.0:
				notification.emit("Blueprint 공간 충돌 · 재료는 소비되지 않았어.")
				return false
		for placed in placements:
			if Vector2(placed.position.x,placed.position.z).distance_to(Vector2(position.x,position.z))<3.0:
				notification.emit("Blueprint 내부 설비 간격 충돌 · 재료는 소비되지 않았어.")
				return false
		placements.append({"id":building_id,"position":position,"rotation_y":float(entry.get("rotation_y",0.0)),"recipe":str(entry.get("recipe",""))})
		for item_id in definition.cost:
			var amount := int(definition.cost[item_id])
			if has_skill("BUFFER_ENGINEER") and building_id in ["WAREHOUSE","FUSION_POWER_BUFFER"]:
				amount = int(ceil(float(amount)*0.95))
			total_cost[item_id] = int(total_cost.get(item_id,0))+amount
	if not consume_items(total_cost):
		notification.emit("Blueprint 건설 재료 부족 · 전체 배치는 취소됐어.")
		return false
	for placement in placements:
		var instance_id := _new_stack_id()
		var building := {
			"id":placement.id,"instance_id":instance_id,"position":placement.position,
			"rotation_y":placement.rotation_y,"condition":100.0,"input":[],"output":[],"storage":[],
			"state":"IDLE","recipe":""
		}
		buildings.append(building)
		if not str(placement.recipe).is_empty():
			var recipe: Dictionary = GameData.recipe_definition(str(placement.recipe))
			if not recipe.is_empty() and recipe.machine==placement.id and (not recipe.has("story") or bool(story_flags.get(str(recipe.story),false))):
				building.recipe = str(placement.recipe)
	notification.emit("Blueprint 배치 완료 · %d 설비" % placements.size())
	save_game()
	state_changed.emit()
	return true

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

func analyze_research_sample_batch() -> bool:
	var efficient := has_skill("SAMPLE_EFFICIENCY")
	var consume_count := 19 if efficient else 20
	if count_item("ITEM_RESEARCH_SAMPLE")<consume_count:
		notification.emit("연구 샘플 %d개가 필요해." % consume_count)
		return false
	var lots: Array[Dictionary] = consume_items_with_lots({"ITEM_RESEARCH_SAMPLE":consume_count},false)
	if lots.size()!=consume_count:
		notification.emit("샘플 분석 예약 실패 · 재료는 보존됐어.")
		return false
	for sample in lots:
		_claim_once("RESEARCH_SAMPLE_ANALYSIS:"+str(sample.get("stack_id","")),"RESEARCH_SAMPLE_ANALYSIS",1000)
	if efficient:
		_claim_once("RESEARCH_SAMPLE_EFFICIENCY_BONUS:"+str(lots[0].get("stack_id","")),"SAMPLE_EFFICIENCY_BONUS",1000)
	notification.emit("연구 샘플 배치 분석 · %d개 소비 / %d RP 지급" % [consume_count,consume_count*1000+(1000 if efficient else 0)])
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
	_claim_once("CONTRACT_REWARD:SPECIAL_EDITION_PATTERN_BATCH","CONTRACT_REWARD",15000)
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
	_claim_once("CONTRACT_REWARD:LIMITED_EDITION_SEALS","CONTRACT_REWARD",25000)
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
	if definition.power > 0.0 and maxf(0.0,total_power_generated-total_power_used) < float(definition.power):
		notification.emit("연구소 전력 부족 · 다른 부하를 제외한 가용 전력 %.0f / %.0f kW" % [maxf(0.0,total_power_generated-total_power_used),float(definition.power)])
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
	var lab_power_ratio := clampf(float(power_state.get("research_power_ratio",0.0)),0.0,1.0)
	if lab_power_ratio < 1.0:
		story_flags["RESEARCH_PAUSED_POWER"] = true
		return
	story_flags["RESEARCH_PAUSED_POWER"] = false
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
		if machine.instance_id!=instance_id or machine.output.is_empty():
			continue
		var pending: Array[Dictionary] = []
		var pending_ids: Dictionary = {}
		for stack in machine.output:
			var transferred: Dictionary = stack.duplicate(true)
			if str(transferred.get("stack_id","")).is_empty():
				transferred["stack_id"] = _new_stack_id()
			var stack_id := str(transferred.stack_id)
			if pending_ids.has(stack_id) or inventory.any(func(existing): return str(existing.get("stack_id",""))==stack_id):
				notification.emit("출력 회수 중복 방지 · StackID 충돌 · 원본 출력은 보존됐어.")
				return false
			pending_ids[stack_id] = true
			pending.append(transferred)
		for transferred in pending:
			inventory.append(transferred)
			notification.emit("+%d %s" % [int(transferred.quantity),GameData.item_name(str(transferred.item_id))])
		machine.output.clear()
		machine.state = "IDLE"
		state_changed.emit()
		save_game()
		return true
	return false

func supply_machine(instance_id: String,item_id: String,quantity: int) -> bool:
	if quantity<=0 or count_item(item_id)<quantity:
		return false
	for machine in buildings:
		if machine.instance_id!=instance_id:
			continue
		var lots: Array[Dictionary] = consume_items_with_lots({item_id:quantity},true)
		if lots.is_empty():
			return false
		for lot in lots:
			var transferred: Dictionary = lot.duplicate(true)
			transferred["provenance"] = str(transferred.get("provenance","UNKNOWN"))+" -> MACHINE:"+instance_id
			machine.input.append(transferred)
		notification.emit("기계 투입 · %s ×%d · 원본 Quality/Purity/Lineage 유지" % [GameData.item_name(item_id),quantity])
		save_game()
		return true
	return false

func supply_machine_inputs(instance_id: String) -> bool:
	for machine in buildings:
		if machine.instance_id!=instance_id:
			continue
		var recipe: Dictionary = GameData.recipe_definition(str(machine.get("recipe","")))
		if recipe.is_empty():
			notification.emit("먼저 기계 레시피를 선택해야 해.")
			return false
		var missing: Dictionary = {}
		for item_id in recipe.inputs:
			var buffered := 0
			for stack in machine.get("input",[]):
				if stack.item_id==item_id:
					buffered += int(stack.quantity)
			var amount := maxi(0,int(recipe.inputs[item_id])-buffered)
			if amount>0:
				missing[item_id] = amount
		if missing.is_empty():
			notification.emit("현재 레시피의 입력 버퍼가 이미 충족됐어.")
			return false
		if machine.get("input",[]).size()+missing.size()>24:
			notification.emit("기계 입력 버퍼가 가득 찼어.")
			return false
		var lots: Array[Dictionary] = consume_items_with_lots(missing,bool(recipe.get("allow_synthetic",true)))
		if lots.is_empty():
			notification.emit("재료 부족 또는 합성 원료 제한 · 입력은 전혀 소비되지 않았어.")
			return false
		for lot in lots:
			var transferred: Dictionary = lot.duplicate(true)
			transferred["provenance"] = str(transferred.get("provenance","UNKNOWN"))+" -> MACHINE:"+instance_id
			machine.input.append(transferred)
		notification.emit("기계 입력 완료 · %d개 Stack / 레시피 재료 원자 투입" % lots.size())
		save_game()
		state_changed.emit()
		return true
	return false

func collect_warehouse_item(instance_id: String,stack_id: String) -> bool:
	for machine in buildings:
		if machine.instance_id!=instance_id or machine.id!="WAREHOUSE":
			continue
		for index in range(machine.get("storage",[]).size()):
			var stack: Dictionary = machine.storage[index]
			if str(stack.get("stack_id",""))!=stack_id:
				continue
			if inventory.any(func(existing): return str(existing.get("stack_id",""))==stack_id):
				notification.emit("창고 회수 중복 방지 · StackID 충돌")
				return false
			inventory.append(stack.duplicate(true))
			machine.storage.remove_at(index)
			notification.emit("창고 출고 · %s ×%d" % [GameData.item_name(str(stack.item_id)),int(stack.quantity)])
			save_game()
			state_changed.emit()
			return true
	return false

func repair_machine(instance_id: String) -> bool:
	for machine in buildings:
		if machine.instance_id!=instance_id or float(machine.get("condition",100.0))>=100.0:
			continue
		var high_tier := int(GameData.building_definition(str(machine.id)).get("tier",0))>=5
		var cost := {"ITEM_STEEL_PLATE":5,"ITEM_ADVANCED_CIRCUIT":2} if high_tier else {"ITEM_IRON_PLATE":2,"ITEM_GEAR":1}
		if not consume_items(cost):
			notification.emit("설비 정비 재료 부족 · "+("Steel Plate 5 + Advanced Circuit 2" if high_tier else "Iron Plate 2 + Gear 1"))
			return false
		machine.condition = minf(100.0,maxf(30.0,float(machine.condition))+50.0)
		machine.failure_cooldown = 0.0
		machine.state = "RECOVERING"
		notification.emit("설비 정비 완료 · %s · Condition %.1f%%" % [str(machine.id),float(machine.condition)])
		save_game()
		state_changed.emit()
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
	if not bool(story_flags.get("ACT_VI_COMPLETE",false)):
		errors.append("ACT VI 최종 공장 라인과 안전 검증을 완료해야 해.")
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
			if stack.item_id != item_id or bool(stack.synthetic) or not is_finite(float(stack.quality)) or not is_finite(float(stack.purity)) or float(stack.quality)<90.0 or float(stack.quality)>100.0 or float(stack.purity)<90.0 or float(stack.purity)>100.0:
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
			if stack.item_id != item_id or bool(stack.synthetic) or not is_finite(float(stack.quality)) or not is_finite(float(stack.purity)) or float(stack.quality)<90.0 or float(stack.quality)>100.0 or float(stack.purity)<90.0 or float(stack.purity)>100.0:
				continue
			var take := mini(remaining,int(stack.quantity)-int(stack.get("reserved",0)))
			if take <= 0:
				continue
			var reserved_stack: Dictionary = stack.duplicate(true)
			reserved_stack.quantity = take
			reserved_stack["reserved"] = 0
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

func _fusion_job_validation_errors() -> Array[String]:
	var errors: Array[String] = []
	if fusion.is_empty():
		return errors
	var job_id := str(fusion.get("job_id",""))
	var manifest: Array = fusion.get("manifest",[])
	var custody: Array = fusion.get("custody",[])
	var manifest_checksum := int(fusion.get("manifest_checksum",-1))
	if job_id.is_empty() or manifest.is_empty():
		errors.append("Fusion job identity or manifest is missing.")
	if manifest_checksum!=hash(JSON.stringify(manifest)):
		errors.append("Fusion manifest checksum mismatch.")
	var manifest_by_stack: Dictionary = {}
	var item_totals: Dictionary = {}
	var total_quantity := 0
	for lot in manifest:
		if not lot is Dictionary:
			errors.append("Fusion manifest lot is not a dictionary.")
			continue
		var stack_id := str(lot.get("stack_id",""))
		var item_id := str(lot.get("item_id",""))
		var quantity := int(lot.get("quantity",0))
		var quality := float(lot.get("quality",-1.0))
		var purity := float(lot.get("purity",-1.0))
		if stack_id.is_empty() or manifest_by_stack.has(stack_id):
			errors.append("Fusion manifest StackID is missing or duplicated · "+stack_id)
		manifest_by_stack[stack_id] = lot
		if item_id not in GameData.DORONUM_IDS:
			errors.append("Fusion manifest contains non-canonical ItemID · "+item_id)
		if quantity<=0 or not is_finite(quality) or not is_finite(purity) or quality<90.0 or purity<90.0 or quality>100.0 or purity>100.0 or bool(lot.get("synthetic",true)):
			errors.append("Fusion manifest lot fails quantity/Quality/Purity/lineage gate · "+stack_id)
		item_totals[item_id] = int(item_totals.get(item_id,0))+quantity
		total_quantity += quantity
	for item_id in GameData.DORONUM_IDS:
		if int(item_totals.get(item_id,0))!=100:
			errors.append("Fusion manifest requires exactly 100 units · "+str(item_id))
	if total_quantity!=1500:
		errors.append("Fusion manifest total must equal 1500 units.")
	var output_committed := bool(fusion.get("output_committed",false))
	var reserved_inputs := int(fusion.get("reserved_inputs",0))
	if not output_committed:
		if reserved_inputs!=1500 or custody.size()!=manifest.size():
			errors.append("Fusion custody count or reserved quantity does not match the manifest.")
		var custody_by_stack: Dictionary = {}
		for lot in custody:
			if not lot is Dictionary:
				errors.append("Fusion custody lot is not a dictionary.")
				continue
			var stack_id := str(lot.get("stack_id",""))
			if stack_id.is_empty() or custody_by_stack.has(stack_id):
				errors.append("Fusion custody StackID is missing or duplicated · "+stack_id)
			custody_by_stack[stack_id] = lot
		for stack_id in manifest_by_stack:
			if not custody_by_stack.has(stack_id):
				errors.append("Fusion custody lost manifest lot · "+stack_id)
				continue
			var manifest_lot: Dictionary = manifest_by_stack[stack_id]
			var custody_lot: Dictionary = custody_by_stack[stack_id]
			for field in ["item_id","quantity","quality","purity","synthetic","provenance"]:
				if custody_lot.get(field)!=manifest_lot.get(field):
					errors.append("Fusion custody lot diverged from manifest · "+stack_id+" · "+field)
	else:
		if reserved_inputs!=0 or not custody.is_empty():
			errors.append("Committed Fusion output still owns reserved inputs.")
		var output_buffer: Dictionary = fusion.get("output_buffer",{})
		var collect_event := "FUSION_COLLECT:"+job_id
		if output_buffer.is_empty():
			if not _event_ids.has(collect_event):
				errors.append("Committed Infinity output is missing and has no collection event.")
		else:
			var output_id := str(output_buffer.get("stack_id",""))
			if output_id.is_empty() or manifest_by_stack.has(output_id):
				errors.append("Infinity output StackID is invalid or duplicates an input lot.")
			if str(output_buffer.get("item_id",""))!="ITEM_DORONUM_INFINITY" or int(output_buffer.get("quantity",0))!=1 or bool(output_buffer.get("synthetic",true)):
				errors.append("Infinity output payload is not exactly one natural Infinity item.")
			var output_quality := float(output_buffer.get("quality",-1.0))
			var output_purity := float(output_buffer.get("purity",-1.0))
			if not is_finite(output_quality) or not is_finite(output_purity) or output_quality<0.0 or output_quality>100.0 or output_purity<0.0 or output_purity>100.0:
				errors.append("Infinity output Quality/Purity is invalid.")
		if not _event_ids.has("FUSION_OUTPUT:"+job_id):
			errors.append("Committed Infinity output lacks its one-time commit event.")
	var stage_index := int(fusion.get("stage",-1))
	if not output_committed and (stage_index<0 or stage_index>=GameData.FUSION_STAGES.size()):
		errors.append("Fusion stage index is outside the seven-stage process.")
	if not is_finite(float(fusion.get("stage_progress",-1.0))) or float(fusion.get("stage_progress",-1.0))<0.0:
		errors.append("Fusion stage progress is invalid.")
	return errors

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
		return clampf(100.0*float(power_state.get("fusion_power_ratio",0.0)),0.0,100.0)
	var mean := float(fusion.power_ratio_sum)/count
	var mean_square := float(fusion.power_ratio_square_sum)/count
	var deviation := sqrt(maxf(0.0,mean_square-mean*mean))
	return clampf(100.0*mean-50.0*deviation,0.0,100.0)

func _tick_fusion(dt: float) -> void:
	if fusion.is_empty():
		return
	if str(fusion.get("state","")).begins_with("ERROR_INVALID_MANIFEST"):
		return
	var manifest_errors := _fusion_job_validation_errors()
	if not manifest_errors.is_empty():
		fusion.state = "ERROR_INVALID_MANIFEST"
		save_blocked = true
		notification.emit("Fusion manifest integrity failure · output blocked · original save protected · "+manifest_errors[0])
		return
	if str(fusion.get("state","")).begins_with("FAILED") or bool(fusion.get("output_committed",false)):
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
	var progress_delta := FactorySimulation.calculate_progress_delta(dt,ratio)
	fusion.stage_progress += progress_delta
	var fusion_machine_for_risk := buildings.filter(func(m): return m.id=="INFINITY_FUSION_MACHINE")
	var machine_condition_for_risk := 0.0 if fusion_machine_for_risk.is_empty() else clampf(float(fusion_machine_for_risk[0].condition),0.0,100.0)
	var temperature_deviation := absf(float(fusion.temperature)-temperature_target)/maxf(0.0001,absf(temperature_target))*100.0
	var pressure_deviation := absf(float(fusion.pressure)-pressure_target)/maxf(0.0001,absf(pressure_target))*100.0
	var temperature_risk := clampf((temperature_deviation-1.0)/9.0,0.0,1.0)
	var pressure_risk := clampf((pressure_deviation-1.0)/9.0,0.0,1.0)
	var power_risk := 1.0-ratio
	var wear_risk := 1.0-machine_condition_for_risk/100.0
	var load_risk := 0.0
	var failure_profile: Dictionary = GameData.INFINITY_FAILURE_PROFILE
	var hazard_multiplier := 1.0
	hazard_multiplier += temperature_risk*float(failure_profile.temperature_weight)
	hazard_multiplier += pressure_risk*float(failure_profile.pressure_weight)
	hazard_multiplier += power_risk*float(failure_profile.power_weight)
	hazard_multiplier += wear_risk*float(failure_profile.wear_weight)
	hazard_multiplier += load_risk*float(failure_profile.load_weight)
	fusion.hazard_multiplier = hazard_multiplier
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
	var base_probability := float(failure_profile.base_failure_probability)
	var reference_duration := float(failure_profile.reference_duration_seconds)
	var base_hazard_rate := -log(1.0-base_probability)/reference_duration
	var tick_failure_probability := 1.0-exp(-base_hazard_rate*hazard_multiplier*dt)
	if _deterministic_unit(int(fusion.rng_index))<tick_failure_probability:
		var severity_roll := _deterministic_unit(int(fusion.rng_index)+900000)
		var minor_limit := float(failure_profile.minor_probability)
		var major_limit := minor_limit+float(failure_profile.major_probability)
		var severity := "FAILED_MINOR" if severity_roll<minor_limit else ("FAILED_MAJOR" if severity_roll<major_limit else "FAILED_CRITICAL")
		var recovery_ratio := 1.0 if severity=="FAILED_MINOR" else (0.95 if severity=="FAILED_MAJOR" else 0.80)
		fusion.state = severity
		fusion.recovery_ratio = recovery_ratio
		fusion.failure_event_id = "FUSION-FAIL-"+str(fusion.rng_index)
		_event_ids["FUSION_FAILURE:"+str(fusion.failure_event_id)] = true
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
			fusion.output_buffer = {"stack_id":_new_stack_id(),"item_id":"ITEM_DORONUM_INFINITY","quantity":1,"quality":output_quality,"purity":output_purity,"synthetic":false,"provenance":"INFINITY_FUSION:"+str(fusion.job_id)}
			fusion.custody = []
			fusion.reserved_inputs = 0
			story_flags["INFINITY_CRAFTED"] = true
			_event_ids["FUSION_OUTPUT:"+str(fusion.job_id)] = true
			notification.emit("INFINITY DORONUM ×1 · Q %.2f / P %.2f · 생산 완료" % [output_quality,output_purity])
			save_game()

func collect_infinity_output() -> bool:
	if fusion.is_empty() or not bool(fusion.get("output_committed",false)) or fusion.get("output_buffer",{}).is_empty():
		return false
	if not _fusion_job_validation_errors().is_empty():
		notification.emit("Infinity 회수 차단 · Fusion manifest integrity failure")
		return false
	var payload: Dictionary = fusion.output_buffer.duplicate(true)
	var event_id := "FUSION_COLLECT:"+str(fusion.get("job_id",""))
	var stack_id := str(payload.get("stack_id",""))
	if _event_ids.has(event_id) or stack_id.is_empty():
		return false
	if inventory.any(func(stack): return str(stack.get("stack_id",""))==stack_id):
		notification.emit("Infinity 회수 중복 방지 · 이미 소유한 StackID")
		return false
	inventory.append(payload)
	_event_ids[event_id] = true
	fusion.output_buffer = {}
	notification.emit("Infinity Doronum ×1 회수 완료")
	save_game()
	state_changed.emit()
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
	_event_ids["RELAY_ACTIVATE:"+str(relays[index].instance_id)] = true
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
	_event_ids["CORE_INSTALL:"+str(fusion.get("job_id",""))] = true
	notification.emit("Infinity Doronum이 Stabilization Core에 설치됐어.")
	save_game()
	return true

func _stabilization_hardware_valid() -> bool:
	if not core_installed or relays.size()!=3:
		return false
	var core_machines := buildings.filter(func(m): return m.id=="STABILIZATION_CORE" and float(m.condition)>0.0)
	if core_machines.size()!=1:
		return false
	var seen_relays: Dictionary = {}
	for relay in relays:
		var instance_id := str(relay.get("instance_id",""))
		if instance_id.is_empty() or seen_relays.has(instance_id) or not bool(relay.get("active",false)):
			return false
		seen_relays[instance_id] = true
		var relay_machines := buildings.filter(func(m): return m.instance_id==instance_id and m.id=="STABILIZATION_RELAY" and float(m.condition)>0.0)
		if relay_machines.size()!=1:
			return false
	return true

func start_stabilization_phase() -> bool:
	if not core_installed or ending_complete or stabilization_phase<1 or stabilization_phase>3 or stabilization_running:
		return false
	if not bool(story_flags.get("ORBIT_04",false)) or not _stabilization_hardware_valid():
		notification.emit("ORBIT 04, 정상 Core와 세 개의 고유 활성 Relay가 필요해.")
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
	if stabilization_phase<1 or stabilization_phase>3:
		stabilization_running = false
		notification.emit("행성 안정화 오류 · 유효하지 않은 Phase")
		return
	if not _stabilization_hardware_valid() or total_power_generated<total_power_used:
		stabilization_running = false
		notification.emit("행성 안정화 일시 정지 · 전력/Relay/Core 물리 상태 확인")
		return
	var durations := [60.0,90.0,120.0]
	stabilization_progress += dt
	if stabilization_progress<durations[stabilization_phase-1]:
		return
	stabilization_progress = 0.0
	stabilization_running = false
	story_flags["STABILIZATION_PHASE_%d" % stabilization_phase] = true
	_event_ids["STABILIZATION_PHASE_COMPLETE:"+str(stabilization_phase)] = true
	stabilization_phase += 1
	if stabilization_phase>3:
		ending_complete = true
		post_endgame = true
		story_flags["PLANETARY_STABILIZATION_COMPLETE"] = true
		_event_ids["PLANETARY_ENDING:"+str(world_seed)] = true
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
	save_game()
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
	var buildings_data: Array[Dictionary] = []
	for building in buildings:
		var serialized_building: Dictionary = building.duplicate(true)
		var building_position: Vector3 = building.get("position",Vector3.ZERO)
		serialized_building["position"] = [building_position.x,building_position.y,building_position.z]
		buildings_data.append(serialized_building)
	var relays_data: Array[Dictionary] = []
	for relay in relays:
		var serialized_relay: Dictionary = relay.duplicate(true)
		var relay_position: Vector3 = relay.get("position",Vector3.ZERO)
		serialized_relay["position"] = [relay_position.x,relay_position.y,relay_position.z]
		relays_data.append(serialized_relay)
	var blueprints_data: Dictionary = blueprints.duplicate(true)
	for slot in blueprints_data:
		var blueprint: Dictionary = blueprints_data[slot]
		var entries: Array = blueprint.get("buildings",[])
		for entry in entries:
			var offset_value: Variant = entry.get("offset",Vector3.ZERO)
			if offset_value is Vector3:
				entry["offset"] = [offset_value.x,offset_value.y,offset_value.z]
		blueprint["buildings"] = entries
		blueprints_data[slot] = blueprint
	var data := {
		"version":GameData.SAVE_VERSION,"build_version":"0.2.0","canonical_data_version":1,
		"world_generator_version":1,"simulation_rules_version":1,"save_id":save_id,
		"save_revision":save_revision,"simulation_tick":simulation_tick,"world_seed":world_seed,
		"player_position":[player_position.x,player_position.y,player_position.z],"equipped_tool":equipped_tool,"equipped_tool_condition":equipped_tool_condition,"tool_conditions":tool_conditions,
		"inventory":inventory,"buildings":buildings_data,"discovered_nodes":discovered_nodes,"resource_depletion":resource_depletion,"tree_states":tree_states,
		"research_completed":research_completed,"active_research":active_research,"research_progress":research_progress,
		"research_points":research_points,"story_flags":story_flags,"lore_found":lore_found,
		"fusion":fusion,"fusion_diagnostics":fusion_diagnostics,"relays":relays_data,
		"core_installed":core_installed,"stabilization_phase":stabilization_phase,
		"ending_complete":ending_complete,"post_endgame":post_endgame,
		"production_history":production_history,"research_point_ledger":research_point_ledger,"skill_points":skill_points,"skills_unlocked":skills_unlocked,"skill_point_ledger":skill_point_ledger,"skill_respec_used":skill_respec_used,"blueprints":blueprints_data,"power_state":power_state,"stabilization_progress":stabilization_progress,"stabilization_running":stabilization_running,"event_ids":_event_ids,"next_stack_id":_next_stack_id
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

func _validate_save_stack(stack: Variant,owner_name: String,seen_stack_ids: Dictionary,errors: Array[String]) -> void:
	if not stack is Dictionary:
		errors.append(owner_name+" entry is not a dictionary.")
		return
	var stack_id := str(stack.get("stack_id",""))
	var item_id := str(stack.get("item_id",""))
	var quantity := int(stack.get("quantity",0))
	var quality := float(stack.get("quality",-1.0))
	var purity := float(stack.get("purity",-1.0))
	var reserved := int(stack.get("reserved",0))
	if stack_id.is_empty() or seen_stack_ids.has(stack_id):
		errors.append("Missing or duplicate StackID · "+owner_name+" · "+stack_id)
	seen_stack_ids[stack_id] = owner_name
	if not GameData.ITEMS.has(item_id) and item_id not in GameData.DORONUM_IDS:
		errors.append("Unknown critical ItemID · "+item_id)
	if quantity<=0 or reserved<0 or reserved>quantity:
		errors.append("Invalid quantity/reservation · "+stack_id)
	if not is_finite(quality) or not is_finite(purity) or quality<0.0 or quality>100.0 or purity<0.0 or purity>100.0:
		errors.append("Invalid Quality/Purity · "+stack_id)

func validate_save_payload(parsed: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	var seen_stack_ids: Dictionary = {}
	for stack in parsed.get("inventory",[]):
		_validate_save_stack(stack,"INVENTORY",seen_stack_ids,errors)
	var seen_building_ids: Dictionary = {}
	for building in parsed.get("buildings",[]):
		if not building is Dictionary:
			errors.append("Building entry is not a dictionary.")
			continue
		var building_id := str(building.get("id",""))
		var instance_id := str(building.get("instance_id",""))
		if GameData.building_definition(building_id).is_empty():
			errors.append("Unknown critical BuildingID · "+building_id)
		if instance_id.is_empty() or seen_building_ids.has(instance_id):
			errors.append("Missing or duplicate Building InstanceID · "+instance_id)
		seen_building_ids[instance_id] = true
		for field in ["input","output","storage","job_inputs"]:
			for stack in building.get(field,[]):
				_validate_save_stack(stack,str(building_id)+"/"+field,seen_stack_ids,errors)
	var fusion_data: Dictionary = parsed.get("fusion",{})
	for stack in fusion_data.get("custody",[]):
		_validate_save_stack(stack,"FUSION_CUSTODY",seen_stack_ids,errors)
	var fusion_output: Dictionary = fusion_data.get("output_buffer",{})
	if not fusion_output.is_empty():
		_validate_save_stack(fusion_output,"FUSION_OUTPUT",seen_stack_ids,errors)
	return errors

func _migrate_save_payload(source: Dictionary,from_version: int) -> Dictionary:
	var migrated: Dictionary = source.duplicate(true)
	_next_stack_id = maxi(1,int(migrated.get("next_stack_id",1)))
	var owner_fields := ["input","output","storage","job_inputs"]
	for building in migrated.get("buildings",[]):
		if not building is Dictionary:
			continue
		if not building.has("storage"):
			building["storage"] = []
		for field in owner_fields:
			var lots: Array = building.get(field,[])
			for lot in lots:
				if not lot is Dictionary:
					continue
				if str(lot.get("stack_id","")).is_empty():
					lot["stack_id"] = _new_stack_id()
				lot["reserved"] = int(lot.get("reserved",0))
			building[field] = lots
	var fusion_data: Dictionary = migrated.get("fusion",{})
	var custody: Array = fusion_data.get("custody",[])
	for lot in custody:
		if lot is Dictionary:
			if str(lot.get("stack_id","")).is_empty():
				lot["stack_id"] = _new_stack_id()
			lot["reserved"] = 0
	fusion_data["custody"] = custody
	var output_buffer: Dictionary = fusion_data.get("output_buffer",{})
	if not output_buffer.is_empty() and str(output_buffer.get("stack_id","")).is_empty():
		output_buffer["stack_id"] = _new_stack_id()
	fusion_data["output_buffer"] = output_buffer
	migrated["fusion"] = fusion_data
	migrated["version"] = GameData.SAVE_VERSION
	migrated["next_stack_id"] = _next_stack_id
	migrated["save_revision"] = int(migrated.get("save_revision",0))+1
	migrated.erase("checksum")
	migrated["migration_from_version"] = from_version
	return migrated

func load_game() -> void:
	var parsed := _read_save_file(SAVE_PATH)
	if parsed.is_empty():
		parsed = _read_save_file(SAVE_PATH+".bak")
		if not parsed.is_empty():
			notification.emit("기본 저장을 읽지 못해 백업에서 복구했어.")
	if parsed.is_empty():
		if FileAccess.file_exists(SAVE_PATH):
			save_blocked = true
			save_loaded = true
			notification.emit("저장 데이터와 백업이 손상됐어. 원본 파일을 보호하기 위해 저장을 중지했어.")
		return
	var loaded_version := int(parsed.get("version",0))
	if loaded_version > GameData.SAVE_VERSION:
		save_loaded = true
		save_blocked = true
		notification.emit("이 저장은 더 최신 버전이야. 덮어쓰지 않을게.")
		return
	if loaded_version<1:
		save_loaded = true
		save_blocked = true
		notification.emit("저장 버전이 유효하지 않아. 원본을 보호했어.")
		return
	save_loaded = true
	if loaded_version<GameData.SAVE_VERSION:
		if loaded_version==1:
			parsed["canonical_data_version"] = int(parsed.get("canonical_data_version",1))
			parsed["world_generator_version"] = int(parsed.get("world_generator_version",1))
			parsed["simulation_rules_version"] = int(parsed.get("simulation_rules_version",1))
			parsed["save_id"] = str(parsed.get("save_id","DF-SAVE-%d" % int(parsed.get("world_seed",GameData.WORLD_SEED))))
			parsed["save_revision"] = int(parsed.get("save_revision",0))
			parsed["simulation_tick"] = int(parsed.get("simulation_tick",0))
		parsed = _migrate_save_payload(parsed,loaded_version)
	var payload_errors := validate_save_payload(parsed)
	if not payload_errors.is_empty():
		save_blocked = true
		save_loaded = true
		notification.emit("저장 검증 실패 · 원본 보호: "+payload_errors[0])
		return
	world_seed = int(parsed.get("world_seed", GameData.WORLD_SEED))
	save_id = str(parsed.get("save_id","DF-SAVE-%d" % world_seed))
	save_revision = int(parsed.get("save_revision",0))
	simulation_tick = int(parsed.get("simulation_tick",0))
	equipped_tool = str(parsed.get("equipped_tool","ITEM_TOOL_HANDS"))
	equipped_tool_condition = float(parsed.get("equipped_tool_condition",100.0))
	tool_conditions = parsed.get("tool_conditions",{})
	if equipped_tool!="ITEM_TOOL_HANDS":
		equipped_tool_condition = float(tool_conditions.get(equipped_tool,equipped_tool_condition))
	player_position = Vector3(parsed.get("player_position", [0,0,0])[0], parsed.get("player_position", [0,0,0])[1], parsed.get("player_position", [0,0,0])[2])
	inventory.assign(parsed.get("inventory", []))
	buildings.clear()
	for raw_building in parsed.get("buildings",[]):
		var loaded_building: Dictionary = raw_building.duplicate(true)
		var position_value: Variant = loaded_building.get("position",[0.0,0.0,0.0])
		if position_value is Array and position_value.size()>=3:
			loaded_building["position"] = Vector3(float(position_value[0]),float(position_value[1]),float(position_value[2]))
		buildings.append(loaded_building)
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
	relays.clear()
	for raw_relay in parsed.get("relays",[]):
		var loaded_relay: Dictionary = raw_relay.duplicate(true)
		var relay_position: Variant = loaded_relay.get("position",[0.0,0.0,0.0])
		if relay_position is Array and relay_position.size()>=3:
			loaded_relay["position"] = Vector3(float(relay_position[0]),float(relay_position[1]),float(relay_position[2]))
		relays.append(loaded_relay)
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
	blueprints = parsed.get("blueprints",{})
	for slot in blueprints:
		var blueprint: Dictionary = blueprints[slot]
		var entries: Array = blueprint.get("buildings",[])
		for entry in entries:
			var offset_value: Variant = entry.get("offset",[0.0,0.0,0.0])
			if offset_value is Array and offset_value.size()>=3:
				entry["offset"] = Vector3(float(offset_value[0]),float(offset_value[1]),float(offset_value[2]))
		blueprint["buildings"] = entries
		blueprints[slot] = blueprint
	power_state = parsed.get("power_state",{"starter_fuel_timer":0.0,"world_time":0.25,"fusion_buffer_kwh":0.0,"fusion_power_ratio":0.0})
	stabilization_progress = float(parsed.get("stabilization_progress",0.0))
	stabilization_running = bool(parsed.get("stabilization_running",false))
	_event_ids = parsed.get("event_ids", {})
	_next_stack_id = int(parsed.get("next_stack_id", 1))
	var loaded_fusion_errors := _fusion_job_validation_errors()
	if not loaded_fusion_errors.is_empty():
		save_blocked = true
		notification.emit("저장된 Infinity Fusion 데이터 무결성 오류 · 원본 저장을 보호하고 생산을 중지했어. "+loaded_fusion_errors[0])
