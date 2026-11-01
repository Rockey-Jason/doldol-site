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
var ending_complete := false
var post_endgame := false
var production_history: Array[Dictionary] = []
var total_power_generated := 250.0
var total_power_used := 0.0
var simulation_paused := false
var _event_ids: Dictionary = {}
var _next_stack_id := 1
var save_loaded := false
var save_blocked := false
var fusion_diagnostics := {"power_stability":false,"pressure_calibration":false,"emergency_cooling":false}

func _ready() -> void:
	load_game()
	if not save_loaded:
		_grant_starter_kit()
		state_changed.emit()

func advance_fixed_tick(dt: float) -> void:
	_tick_research(dt)
	_tick_fusion(dt)

func _grant_starter_kit() -> void:
	add_item("ITEM_WOOD", 12, 92.0, 90.0, false, "STARTER")
	add_item("ITEM_STONE", 8, 92.0, 90.0, false, "STARTER")
	add_item("ITEM_GRASS", 8, 90.0, 90.0, false, "STARTER")
	add_item("ITEM_WATER", 10, 100.0, 100.0, false, "STARTER")
	add_item("ITEM_COAL", 6, 90.0, 90.0, false, "STARTER")
	research_points = 50
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
	_claim_once("FIRST_RECIPE:"+recipe_id,"RECIPE_CRAFTED",10)
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
	if absf(world_position.x) > GameData.WORLD_LIMIT or absf(world_position.z) > GameData.WORLD_LIMIT:
		notification.emit("건설 가능 구역 밖이야.")
		return false
	if not consume_items(definition.cost):
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

func discover_resource(node_id: String, item_id: String) -> void:
	if discovered_nodes.has(node_id):
		return
	discovered_nodes[node_id] = true
	_claim_once("SCAN:" + node_id, "RESOURCE_SCANNED", 10)
	notification.emit("자원 스캔 · " + GameData.item_name(item_id))

func harvest_dori_tree(tree_id: String, mature: bool) -> bool:
	if not mature:
		notification.emit("나무가 아직 자라는 중이야.")
		return false
	add_item("ITEM_DORI_MEAT", 1, 92.0, 90.0, false, "DORI_TREE:" + tree_id)
	_claim_once("TREE_HARVEST:" + tree_id, "DORI_TREE_HARVEST", 15)
	return true

func _claim_once(event_id: String, _kind: String, rp: int = 0) -> void:
	if _event_ids.has(event_id):
		return
	_event_ids[event_id] = true
	research_points += rp

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
	active_research = research_id
	research_progress = 0.0
	notification.emit("연구 시작 · " + str(definition.name))
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
	var recipe: Dictionary = GameData.recipe_definition(recipe_id, {})
	if recipe.is_empty():
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
	var fusion_machine := false
	for machine in buildings:
		if machine.id == "INFINITY_FUSION_MACHINE" and machine.condition > 0.0:
			fusion_machine = true
	if not fusion_machine:
		errors.append("Infinity Fusion Machine이 없어.")
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
	for item_id in GameData.DORONUM_IDS:
		var stacks := inventory.filter(func(s): return s.item_id == item_id)
		var total := 0
		for stack in stacks:
			if stack.synthetic or float(stack.quality) < 90.0 or float(stack.purity) < 90.0:
				continue
			total += int(stack.quantity) - int(stack.get("reserved", 0))
		if total < 100:
			errors.append("%s: 유효한 비합성 Q/P≥90 재료 %d/100 부족" % [GameData.item_name(item_id), total])
	return errors

func start_infinity_fusion() -> bool:
	var errors := fusion_preflight()
	if not errors.is_empty():
		notification.emit("퓨전 시작 불가 · " + errors[0])
		return false
	var snapshot := inventory.duplicate(true)
	var custody: Array[Dictionary] = []
	for item_id in GameData.DORONUM_IDS:
		var remaining := 100
		for stack in inventory:
			if stack.item_id != item_id or stack.synthetic or float(stack.quality) < 90.0 or float(stack.purity) < 90.0:
				continue
			var take := mini(remaining, int(stack.quantity) - int(stack.get("reserved",0)))
			if take <= 0:
				continue
			var reserved_stack := stack.duplicate(true)
			reserved_stack.quantity = take
			custody.append(reserved_stack)
			stack.quantity -= take
			remaining -= take
			if remaining == 0:
				break
		if remaining > 0:
			inventory = snapshot
			notification.emit("원자 예약 실패 · 모든 재료가 원래 상태로 복구됐어.")
			return false
	inventory = inventory.filter(func(s): return int(s.quantity) > 0)
	fusion = {
		"stage":0,"stage_progress":0.0,"temperature":20.0,"pressure":0.0,
		"failure_exposure":0.0,"rng_index":0,"hazard_multiplier":1.0,"output_committed":false,
		"reserved_inputs":1500,"custody":custody,"state":"RUNNING",
		"interlocks":{"power":true,"cooling":true,"shield":true,"emergency":true}
	}
	notification.emit("Infinity Fusion 시작 · 정확한 15종 × 100개 예약 완료")
	save_game()
	return true

func recover_fusion_failure() -> bool:
	if fusion.is_empty() or not str(fusion.get("state","")).begins_with("FAILED"):
		return false
	var custody: Array = fusion.get("custody",[])
	for reserved_stack in custody:
		if not inventory.any(func(s): return s.stack_id == reserved_stack.stack_id):
			inventory.append(reserved_stack.duplicate(true))
	fusion.clear()
	notification.emit("퓨전 안전 복구 완료 · 예약 재료를 전량 반환했어.")
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

func _tick_fusion(dt: float) -> void:
	if fusion.is_empty() or str(fusion.get("state","")).begins_with("FAILED") or fusion.output_committed:
		return
	var stage_data: Dictionary = GameData.FUSION_STAGES[int(fusion.stage)]
	var power := float(stage_data.power)
	var available := maxf(0.0,total_power_generated - total_power_used)
	var ratio := 1.0 if power <= 0.0 else minf(1.0, available / power)
	if ratio < 0.8 or not _fusion_interlocks_valid():
		fusion.state = "PAUSED_SAFETY" if not _fusion_interlocks_valid() else "PAUSED_POWER"
		return
	fusion.state = "RUNNING"
	fusion.temperature = move_toward(float(fusion.temperature), float(stage_data.temperature), 180.0 * dt)
	fusion.pressure = move_toward(float(fusion.pressure), float(stage_data.pressure), 600.0 * dt)
	var temp_ok := absf(float(fusion.temperature) - float(stage_data.temperature)) <= maxf(5.0, float(stage_data.temperature) * 0.10)
	var pressure_ok := absf(float(fusion.pressure) - float(stage_data.pressure)) <= maxf(1.0, float(stage_data.pressure) * 0.10)
	if temp_ok and pressure_ok:
		fusion.stage_progress += dt * minf(1.0, ratio)
		fusion.failure_exposure += dt
		fusion.rng_index += 1
		var chance := minf(1.0,1.0 - pow(0.99, (dt / 260.0) * float(fusion.get("hazard_multiplier",1.0))))
		if _deterministic_unit(int(fusion.rng_index)) < chance:
			var severity_roll := _deterministic_unit(int(fusion.rng_index) + 900000)
			var severity := "FAILED_MINOR" if severity_roll < 0.30 else ("FAILED_MAJOR" if severity_roll < 0.75 else "FAILED_CRITICAL")
			fusion.state = severity
			fusion.failure_event_id = "FUSION-FAIL-" + str(fusion.rng_index)
			for machine in buildings:
				if machine.id == "INFINITY_FUSION_MACHINE":
					machine.condition = maxf(0.0,float(machine.condition) - (5.0 if severity=="FAILED_MINOR" else (20.0 if severity=="FAILED_MAJOR" else 40.0)))
			notification.emit("퓨전 이상 감지 · %s · 안전 정지. 예약 입력은 복구 가능해." % severity)
			save_game()
			return
	if fusion.stage_progress >= float(stage_data.seconds):
		fusion.stage += 1
		fusion.stage_progress = 0.0
		fusion.temperature = 20.0 if fusion.stage >= GameData.FUSION_STAGES.size() else fusion.temperature
		fusion_stage_changed.emit(int(fusion.stage))
		save_game()
		if fusion.stage >= GameData.FUSION_STAGES.size():
			fusion.output_committed = true
			fusion.state = "COMPLETED"
			fusion.output_buffer = {"item_id":"ITEM_INFINITY_DORONUM","quantity":1,"quality":100.0,"purity":100.0,"synthetic":false,"provenance":"INFINITY_FUSION"}
			fusion.custody = []
			fusion.reserved_inputs = 0
			story_flags["INFINITY_CRAFTED"] = true
			notification.emit("INFINITY DORONUM ×1 · 생산 완료")
			save_game()


func collect_infinity_output() -> bool:
	if fusion.is_empty() or not bool(fusion.get("output_committed",false)) or fusion.get("output_buffer",{}).is_empty():
		return false
	var payload: Dictionary = fusion.output_buffer
	add_item(str(payload.item_id),int(payload.quantity),float(payload.quality),float(payload.purity),bool(payload.synthetic),str(payload.provenance))
	fusion.output_buffer = {}
	save_game()
	return true

func run_fusion_diagnostic(diagnostic_id: String) -> bool:
	if not fusion_diagnostics.has(diagnostic_id) or bool(fusion_diagnostics[diagnostic_id]):
		return false
	match diagnostic_id:
		"power_stability":
			if total_power_generated < 5000.0:
				notification.emit("전력 안정성 검사 실패 · 5MW 전력 공급이 필요해.")
				return false
		"pressure_calibration":
			if "RESEARCH_HIGH_PRESSURE" not in research_completed or not buildings.any(func(m): return m.id == "ADVANCED_ASSEMBLER"):
				notification.emit("압력 센서 교정 실패 · 고압 연구와 고급 조립기가 필요해.")
				return false
		"emergency_cooling":
			if not buildings.any(func(m): return m.id == "COOLING_STABILIZER") or count_item("ITEM_COLD_CRYSTAL") < 1:
				notification.emit("비상 냉각 검사 실패 · 냉각 안정기와 Cold Crystal이 필요해.")
				return false
	fusion_diagnostics[diagnostic_id] = true
	notification.emit("퓨전 안전 진단 통과 · "+diagnostic_id)
	save_game()
	state_changed.emit()
	return true

func _deterministic_unit(index: int) -> float:
	var value := sin(float(world_seed) * 0.000013 + float(index) * 12.9898) * 43758.5453
	return value - floorf(value)

func _fusion_interlocks_valid() -> bool:
	if fusion.is_empty():
		return false
	for key in ["power","cooling","shield","emergency"]:
		if not bool(fusion.interlocks.get(key, false)):
			return false
	return true

func set_fusion_interlock(key: String, enabled: bool) -> void:
	if fusion.is_empty() or not fusion.interlocks.has(key):
		return
	fusion.interlocks[key] = enabled
	if not enabled:
		fusion.state = "PAUSED_SAFETY"

func activate_relay(index: int) -> bool:
	if not bool(story_flags.get("INFINITY_CRAFTED", false)) or index < 0 or index >= 3 or index >= relays.size():
		return false
	relays[index].active = true
	story_flags["RELAY_%d_ACTIVE" % (index + 1)] = true
	notification.emit("행성 에너지 릴레이 %d/3 활성화" % (index + 1))
	return true

func install_infinity_core() -> bool:
	if not bool(story_flags.get("INFINITY_CRAFTED", false)) or core_installed or count_item("ITEM_INFINITY_DORONUM") < 1:
		return false
	if relays.size() < 3:
		return false
	for relay in relays:
		if not relay.active:
			return false
	if not consume_items({"ITEM_INFINITY_DORONUM":1}):
		return false
	core_installed = true
	stabilization_phase = 1
	story_flags["CORE_INSTALLED"] = true
	notification.emit("Infinity Doronum이 Stabilization Core에 설치됐어.")
	return true

func complete_stabilization_phase() -> bool:
	if not core_installed or stabilization_phase < 1 or stabilization_phase > 3:
		return false
	stabilization_phase += 1
	if stabilization_phase > 3:
		ending_complete = true
		post_endgame = true
		story_flags["PLANETARY_STABILIZATION_COMPLETE"] = true
		notification.emit("ORBIT: The planet is stable. The factory remains operational.")
		ending_started.emit()
	else:
		notification.emit("행성 안정화 동기화 %d/3" % stabilization_phase)
	return true

func find_lore(lore_id: String) -> void:
	if lore_id in lore_found:
		return
	lore_found.append(lore_id)
	research_points += 100
	notification.emit("기록 복구 · " + lore_id)
	var required := ["LORE_INCIDENT_SAFETY_OVERRIDE","LORE_INCIDENT_POWER_OSCILLATION","LORE_INCIDENT_COOLING_FAILURE","LORE_INCIDENT_ARCHIVE_EDIT"]
	if required.all(func(id): return id in lore_found):
		story_flags["STORY_INCIDENT_RECONSTRUCTED"] = true
		notification.emit("BLUE FURNACE INCIDENT 재구성 완료")

func save_game() -> void:
	if save_blocked:
		return
	var data := {
		"version":GameData.SAVE_VERSION,"world_seed":world_seed,
		"player_position":[player_position.x,player_position.y,player_position.z],"equipped_tool":equipped_tool,
		"inventory":inventory,"buildings":buildings,"discovered_nodes":discovered_nodes,
		"research_completed":research_completed,"active_research":active_research,"research_progress":research_progress,
		"research_points":research_points,"story_flags":story_flags,"lore_found":lore_found,
		"fusion":fusion,"fusion_diagnostics":fusion_diagnostics,"relays":relays,
		"core_installed":core_installed,"stabilization_phase":stabilization_phase,
		"ending_complete":ending_complete,"post_endgame":post_endgame,
		"production_history":production_history,"event_ids":_event_ids,"next_stack_id":_next_stack_id
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
	save_loaded = true
	if int(parsed.get("version", 0)) > GameData.SAVE_VERSION:
		save_blocked = true
		notification.emit("이 저장은 더 최신 버전이야. 덮어쓰지 않을게.")
		return
	world_seed = int(parsed.get("world_seed", GameData.WORLD_SEED))
	equipped_tool = str(parsed.get("equipped_tool","ITEM_TOOL_HANDS"))
	player_position = Vector3(parsed.get("player_position", [0,0,0])[0], parsed.get("player_position", [0,0,0])[1], parsed.get("player_position", [0,0,0])[2])
	inventory.assign(parsed.get("inventory", []))
	buildings.assign(parsed.get("buildings", []))
	discovered_nodes = parsed.get("discovered_nodes", {})
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
	_event_ids = parsed.get("event_ids", {})
	_next_stack_id = int(parsed.get("next_stack_id", 1))
