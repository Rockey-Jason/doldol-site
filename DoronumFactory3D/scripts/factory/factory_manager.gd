extends Node3D
class_name FactoryManager3D

signal machine_selected(machine_id: String)
signal building_placed(machine_type: String, instance_id: String)
signal power_summary_changed(generation_kw: float, consumption_kw: float, ratio: float)

const MACHINE_SCRIPT = preload("res://scripts/factory/factory_machine.gd")
const GRID_SIZE := 2.0
const BELT_STEP_SEC := 1.15
const AUTO_MINER_CYCLE_SEC := 8.0

var world_generator: WorldGenerator3D
var selected_building_type := ""
var selected_machine_id := ""
var machines: Dictionary = {}
var _records: Dictionary = {}
var _power_generation_kw := 0.0
var _power_consumption_kw := 0.0
var _power_ratio := 1.0
var _last_power_update := 0
var _elapsed_game_seconds := 8.0*3600.0
var _network_dirty := true
var _machine_preview: MeshInstance3D
var _preview_material: StandardMaterial3D

func _ready() -> void:
	add_to_group("factory_manager")
	GameState.simulation_tick.connect(_on_simulation_tick)
	for record in GameState.buildings:
		_spawn_machine(record)

func setup(p_world: WorldGenerator3D) -> void:
	world_generator = p_world
	_update_machine_positions()

func begin_build(machine_type: String) -> bool:
	if not GameState.MACHINE_DEFS.has(machine_type):
		GameState.toast("Unknown machine blueprint: "+machine_type,"error")
		return false
	var data: Dictionary = GameState.MACHINE_DEFS[machine_type]
	if int(data.get("tier",0)) > GameState.current_tier():
		GameState.toast("기술 Tier %d가 필요합니다." % int(data.get("tier",0)),"warning")
		return false
	selected_building_type = machine_type
	_create_preview()
	GameState.toast("배치할 위치를 3D 월드에서 탭하세요: "+str(data.name),"info")
	return true

func cancel_build() -> void:
	selected_building_type = ""
	if is_instance_valid(_machine_preview):
		_machine_preview.queue_free()
	_machine_preview = null

func update_preview(world_position: Vector3, valid: bool) -> void:
	if not is_instance_valid(_machine_preview):
		return
	_machine_preview.global_position = _snap_position(world_position,selected_building_type)
	_preview_material.albedo_color = Color(0.12,0.82,0.56,0.35) if valid else Color(0.95,0.2,0.15,0.35)
	_preview_material.emission = Color(0.02,0.25,0.12) if valid else Color(0.25,0.015,0.01)

func _create_preview() -> void:
	if is_instance_valid(_machine_preview):
		_machine_preview.queue_free()
	var data: Dictionary = GameState.MACHINE_DEFS[selected_building_type]
	_machine_preview = MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(float(data.footprint.x),0.15,float(data.footprint.y))
	_machine_preview.mesh = mesh
	_preview_material = StandardMaterial3D.new()
	_preview_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_preview_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_preview_material.albedo_color = Color(0.12,0.82,0.56,0.35)
	_preview_material.emission_enabled = true
	_machine_preview.material_override = _preview_material
	_machine_preview.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_machine_preview)

func _snap_position(world_position: Vector3, machine_type: String) -> Vector3:
	var data: Dictionary = GameState.MACHINE_DEFS.get(machine_type,{})
	var half_x := float(data.get("footprint",Vector2i(2,2)).x)*0.5
	var half_z := float(data.get("footprint",Vector2i(2,2)).y)*0.5
	var x := roundf(world_position.x/GRID_SIZE)*GRID_SIZE
	var z := roundf(world_position.z/GRID_SIZE)*GRID_SIZE
	var y := world_generator.height_at(x,z) if world_generator else world_position.y
	return Vector3(x,y,z)

func can_place(machine_type: String, world_position: Vector3) -> bool:
	if not GameState.MACHINE_DEFS.has(machine_type):
		return false
	var data: Dictionary = GameState.MACHINE_DEFS[machine_type]
	if int(data.get("tier",0)) > GameState.current_tier():
		return false
	var cost: Dictionary = data.get("cost",{})
	if not GameState.can_afford(cost):
		return false
	var snap := _snap_position(world_position,machine_type)
	var footprint: Vector2i = data.get("footprint",Vector2i(2,2))
	var half_x := float(footprint.x)*0.5
	var half_z := float(footprint.y)*0.5
	if absf(snap.x) > 1024.0-half_x or absf(snap.z) > 1024.0-half_z:
		return false
	for record in _records.values():
		var other_type := str(record.get("type",""))
		var other_data: Dictionary = GameState.MACHINE_DEFS.get(other_type,{})
		var other_size: Vector2i = other_data.get("footprint",Vector2i(2,2))
		var other_pos: Vector3 = record.get("position",Vector3.ZERO)
		if absf(snap.x-other_pos.x) < (half_x+float(other_size.x)*0.5+0.4) and absf(snap.z-other_pos.z) < (half_z+float(other_size.y)*0.5+0.4):
			return false
	return true

func place_selected(world_position: Vector3) -> bool:
	if selected_building_type.is_empty():
		return false
	if not can_place(selected_building_type,world_position):
		GameState.toast("배치 불가 · 공간, 연구 또는 건설 재료를 확인하세요.","warning")
		return false
	var machine_type := selected_building_type
	var data: Dictionary = GameState.MACHINE_DEFS[machine_type]
	var snap := _snap_position(world_position,machine_type)
	for item_id in data.cost:
		if not GameState.remove_item(str(item_id),int(data.cost[item_id])):
			GameState.toast("재료 예약 중 오류가 발생했습니다. 배치가 취소되었습니다.","error")
			return false
	var instance_id := "MACHINE-%s-%06d" % [str(Time.get_unix_time_from_system()),GameState.buildings.size()+1]
	var record := {
		"instance_id":instance_id,
		"type":machine_type,
		"kind":str(data.get("kind","machine")),
		"position":snap,
		"rotation_y":0.0,
		"status":"IDLE",
		"condition":100.0,
		"input_buffer":{},
		"output_buffer":{},
		"active_job":{},
		"fuel_seconds":0.0,
		"progress":0.0,
		"temperature_c":20.0,
		"pressure_mpa":0.0,
		"power_ratio":1.0,
		"belt_payload":{},
		"belt_timer":0.0,
		"variant_recipe":"DORONUM_BLUE",
		"network_id":"POWER_MAIN"
	}
	GameState.add_building(record)
	_records[instance_id] = record
	_spawn_machine(record)
	cancel_build()
	_network_dirty = true
	building_placed.emit(machine_type,instance_id)
	GameState.progress_objective("BUILDING_PLACED",machine_type)
	GameState.toast(str(data.name)+" 설치 완료","success")
	GameState.save_game()
	return true

func _spawn_machine(record: Dictionary) -> void:
	var machine: FactoryMachine3D = MACHINE_SCRIPT.new()
	machine.configure(record,self)
	add_child(machine)
	machines[str(record.instance_id)] = machine
	_records[str(record.instance_id)] = record
	if record.get("type","") == "STABILIZATION_RELAY":
		GameState.relay_instances.append({"instance_id":record.instance_id,"position":record.position,"active":true,"power_ratio":0.0})
	if record.get("type","") == "STABILIZATION_CORE":
		GameState.story_flags["CORE_MACHINE_PLACED"] = true

func _update_machine_positions() -> void:
	for record in _records.values():
		var machine: FactoryMachine3D = machines.get(str(record.instance_id))
		if machine:
			machine.position = record.position

func select_machine(machine_id: String) -> void:
	selected_machine_id = machine_id
	machine_selected.emit(machine_id)

func get_selected_record() -> Dictionary:
	return _records.get(selected_machine_id,{})

func selected_machine_action(action: String, argument: String = "") -> void:
	if not _records.has(selected_machine_id):
		return
	var record: Dictionary = _records[selected_machine_id]
	match action:
		"collect":
			_collect_output(record)
		"supply":
			_supply_from_inventory(record)
		"rotate":
			record.rotation_y = fposmod(float(record.rotation_y)+PI*0.5,TAU)
			var machine: FactoryMachine3D = machines.get(selected_machine_id)
			if machine:
				machine.rotation.y = float(record.rotation_y)
		"remove":
			_remove_machine(record)
		"recipe":
			if GameState.RECIPES.has(argument):
				record.recipe_id = argument
		"repair":
			_repair_machine(record)
		"fuel":
			_fuel_generator(record)
		"fusion_start":
			start_infinity_fusion()
		"core_install":
			install_infinity_core()

func _collect_output(record: Dictionary) -> void:
	var buffer: Dictionary = record.get("output_buffer",{})
	if buffer.is_empty():
		GameState.toast("회수할 생산품이 없습니다.","warning")
		return
	for item_id in buffer:
		var payload: Dictionary = buffer[item_id]
		GameState.add_item(str(item_id),int(payload.get("quantity",0)),float(payload.get("quality",90.0)),float(payload.get("purity",90.0)),bool(payload.get("synthetic",false)),str(payload.get("origin","FACTORY_OUTPUT")))
	record.output_buffer = {}
	record.status = "IDLE"
	GameState.progress_objective("MACHINE_OUTPUT_COLLECTED",str(record.type))
	GameState.save_game()
	_refresh_machine(record)

func _supply_from_inventory(record: Dictionary) -> void:
	var recipe_id := str(record.get("recipe_id",GameState.MACHINE_DEFS.get(record.type,{}).get("recipe","")))
	if not GameState.RECIPES.has(recipe_id):
		GameState.toast("이 설비에는 수동 원료 투입 레시피가 없습니다.","warning")
		return
	var recipe: Dictionary = GameState.RECIPES[recipe_id]
	var remaining: Dictionary = record.get("input_buffer",{})
	var moved := 0
	for item_id in recipe.inputs:
		var need := int(recipe.inputs[item_id])-int(remaining.get(item_id,0))
		var available := mini(need,GameState.count_item(str(item_id)))
		if available > 0 and GameState.remove_item(str(item_id),available):
			remaining[item_id] = int(remaining.get(item_id,0))+available
			moved += available
	record.input_buffer = remaining
	GameState.toast("원료 %d개 투입" % moved if moved > 0 else "투입 가능한 원료가 없습니다.","success" if moved>0 else "warning")
	GameState.save_game()
	_refresh_machine(record)

func _fuel_generator(record: Dictionary) -> void:
	if str(record.type) not in ["GENERATOR","AUTO_FURNACE"]:
		return
	if GameState.remove_item("ITEM_COAL",1):
		record.fuel_seconds = float(record.get("fuel_seconds",0.0))+45.0
		GameState.toast("연료 45초분 투입","success")
		GameState.save_game()
	else:
		GameState.toast("석탄이 부족합니다.","warning")

func _repair_machine(record: Dictionary) -> void:
	if not GameState.remove_item("ITEM_IRON_PLATE",2):
		GameState.toast("수리에는 철판 2개가 필요합니다.","warning")
		return
	record.condition = 100.0
	if record.status == "BROKEN":
		record.status = "IDLE"
	GameState.toast("시설 수리 완료","success")
	_refresh_machine(record)

func _remove_machine(record: Dictionary) -> void:
	if not record.get("active_job",{}).is_empty():
		GameState.toast("가동 중인 작업을 먼저 정지하세요.","warning")
		return
	var machine_type := str(record.type)
	var data: Dictionary = GameState.MACHINE_DEFS.get(machine_type,{})
	var instance_id := str(record.instance_id)
	var machine: Node = machines.get(instance_id)
	if machine:
		machine.queue_free()
	machines.erase(instance_id)
	_records.erase(instance_id)
	GameState.buildings.erase(record)
	for item_id in data.get("cost",{}):
		GameState.add_item(str(item_id),int(floor(float(data.cost[item_id])*0.5)),90,90,false,"BUILDING_REFUND")
	GameState.save_game()
	GameState.toast("시설 해체 · 건설 재료 50% 환급","success")

func _refresh_machine(record: Dictionary) -> void:
	var machine: FactoryMachine3D = machines.get(str(record.instance_id))
	if machine:
		machine.set_runtime_state(record)

func _on_simulation_tick(tick_index: int) -> void:
	_elapsed_game_seconds += GameState.FIXED_TICK
	_allocate_power()
	_tick_machines()
	_tick_conveyors()
	_tick_fusion()
	if tick_index % 10 == 0:
		GameState.save_game()

func _allocate_power() -> void:
	var daylight := fposmod(_elapsed_game_seconds,86400.0)/86400.0
	var sun_multiplier := 1.0 if daylight > 0.25 and daylight < 0.78 else 0.18
	var generation := 0.0
	var requests: Array[Dictionary] = []
	for record in _records.values():
		var kind := str(record.get("kind",""))
		if kind == "solar":
			generation += 90.0*sun_multiplier
		elif kind == "generator":
			if float(record.get("fuel_seconds",0.0)) > 0.0:
				generation += 600.0
		elif kind == "power_buffer":
			pass
		else:
			var definition: Dictionary = GameState.MACHINE_DEFS.get(str(record.type),{})
			var required := float(definition.get("power_kw",0.0))
			if required > 0.0:
				var priority := 0
				if kind in ["cooling","cutoff","shielding"]:
					priority = 0
				elif kind in ["fusion","doronium","lab","core"]:
					priority = 1
				elif kind in ["auto_miner","fabricator","auto_furnace","miner"]:
					priority = 2
				else:
					priority = 3
				requests.append({"record":record,"required":required,"priority":priority})
	requests.sort_custom(func(a: Dictionary,b: Dictionary) -> bool:
		if int(a.priority) == int(b.priority):
			return str(a.record.instance_id) < str(b.record.instance_id)
		return int(a.priority) < int(b.priority))
	var remaining := generation
	var consumption := 0.0
	for request in requests:
		var record: Dictionary = request.record
		var required := float(request.required)
		var allocated := minf(required,remaining)
		var ratio := allocated/required if required > 0.0 else 1.0
		record.power_ratio = ratio
		remaining -= allocated
		consumption += allocated
	_update_power_stats(generation,consumption)

func _update_power_stats(generation: float, consumption: float) -> void:
	_power_generation_kw = generation
	_power_consumption_kw = consumption
	_power_ratio = 1.0 if consumption <= 0.0 else minf(1.0,generation/consumption)
	power_summary_changed.emit(generation,consumption,_power_ratio)

func _tick_machines() -> void:
	for record in _records.values():
		var type := str(record.type)
		var kind := str(record.kind)
		if kind == "generator":
			record.fuel_seconds = maxf(0.0,float(record.get("fuel_seconds",0.0))-GameState.FIXED_TICK)
			continue
		if kind in ["conveyor","solar","battery","transformer","power_buffer","relay","core","cooling","cutoff","shielding","lab","warehouse","sorter","merger","pump"]:
			if kind == "core" and GameState.core_installed:
				record.status = "STANDBY"
			continue
		if float(record.get("condition",100.0)) <= 0.0:
			record.status = "BROKEN"
			continue
		if not record.get("output_buffer",{}).is_empty():
			record.status = "PAUSED_OUTPUT"
			continue
		if kind == "auto_miner" or kind == "miner":
			_tick_auto_miner(record)
			continue
		var recipe_id := str(record.get("recipe_id",GameState.MACHINE_DEFS.get(type,{}).get("recipe","")))
		if recipe_id.is_empty() or not GameState.RECIPES.has(recipe_id):
			record.status = "IDLE"
			continue
		_tick_recipe_machine(record,recipe_id)

func _tick_recipe_machine(record: Dictionary, recipe_id: String) -> void:
	var recipe: Dictionary = GameState.RECIPES[recipe_id]
	var job: Dictionary = record.get("active_job",{})
	if job.is_empty():
		var buffer: Dictionary = record.get("input_buffer",{})
		for item_id in recipe.inputs:
			if int(buffer.get(item_id,0))+GameState.count_item(str(item_id)) < int(recipe.inputs[item_id]):
				record.status = "WAITING_INPUT"
				return
		var captured_quality := 90.0
		var captured_purity := 90.0
		var captured_synthetic := false
		var reserved: Dictionary = {}
		for item_id in recipe.inputs:
			var needed := int(recipe.inputs[item_id])
			var from_buffer := mini(needed,int(buffer.get(item_id,0)))
			if from_buffer > 0:
				buffer[item_id] = int(buffer[item_id])-from_buffer
				needed -= from_buffer
			if needed > 0:
				if GameState.count_item(str(item_id)) < needed:
					record.status = "WAITING_INPUT"
					return
				var average: Dictionary = GameState.item_average(str(item_id))
				captured_quality = minf(captured_quality,float(average.quality))
				captured_purity = minf(captured_purity,float(average.purity))
				captured_synthetic = captured_synthetic or bool(average.synthetic)
				reserved[item_id] = needed
		if recipe.get("allow_synthetic",true) == false and captured_synthetic:
			record.status = "REJECTED_SYNTHETIC"
			GameState.toast("합성 돌이 고기는 도로늄 공정에 투입할 수 없습니다.","error")
			return
		for item_id in reserved:
			GameState.remove_item(str(item_id),int(reserved[item_id]))
		record.input_buffer = buffer
		job = {"recipe_id":recipe_id,"elapsed":0.0,"reserved":reserved,"quality":captured_quality,"purity":captured_purity,"synthetic":captured_synthetic,"temperature_c":20.0,"pressure_mpa":0.0}
		record.active_job = job
	var required_kw := float(GameState.MACHINE_DEFS.get(str(record.type),{}).get("power_kw",0.0))
	var power_ratio := float(record.get("power_ratio",1.0)) if required_kw > 0.0 else 1.0
	if power_ratio < 0.8:
		record.status = "PAUSED_POWER"
		return
	var temp_target := float(recipe.get("temperature",0.0))
	var pressure_target := float(recipe.get("pressure",0.0))
	job.temperature_c = move_toward(float(job.temperature_c),temp_target if temp_target>0 else 20.0,18.0)
	job.pressure_mpa = move_toward(float(job.pressure_mpa),pressure_target,10.0)
	var temp_safe := temp_target <= 0.0 or absf(float(job.temperature_c)-temp_target) <= maxf(10.0,temp_target*0.1)
	var pressure_safe := pressure_target <= 0.0 or absf(float(job.pressure_mpa)-pressure_target) <= maxf(5.0,pressure_target*0.1)
	if not temp_safe or not pressure_safe:
		record.status = "CALIBRATING"
		record.active_job = job
		return
	job.elapsed = float(job.elapsed)+GameState.FIXED_TICK*power_ratio
	record.progress = float(job.elapsed)
	record.temperature_c = float(job.temperature_c)
	record.pressure_mpa = float(job.pressure_mpa)
	record.status = "BROWNOUT_RUNNING" if power_ratio < 1.0 else "RUNNING"
	if float(job.elapsed) >= float(recipe.seconds):
		var output_payload: Dictionary = {}
		for item_id in recipe.outputs:
			output_payload[str(item_id)] = {"quantity":int(recipe.outputs[item_id]),"quality":clampf(float(job.quality),0,100),"purity":clampf(float(job.purity),0,100),"synthetic":bool(job.synthetic),"origin":"RECIPE:"+recipe_id}
		record.output_buffer = output_payload
		record.active_job = {}
		record.progress = 0.0
		record.status = "PAUSED_OUTPUT"
		GameState.grant_rp_once("FIRST_PRODUCTION:"+recipe_id,25 if int(recipe.tier)<=2 else 100)
		GameState.progress_objective("RECIPE_PRODUCED",recipe_id)
		GameState.save_game()

func _tick_auto_miner(record: Dictionary) -> void:
	var definition: Dictionary = GameState.MACHINE_DEFS.get(str(record.type),{})
	var required := float(definition.get("power_kw",0.0))
	var ratio := float(record.get("power_ratio",1.0)) if required>0 else 1.0
	if ratio < 0.8:
		record.status = "PAUSED_POWER"
		return
	record.progress = float(record.get("progress",0.0))+GameState.FIXED_TICK*ratio
	if float(record.progress) < AUTO_MINER_CYCLE_SEC:
		record.status = "RUNNING"
		return
	record.progress = 0.0
	var nearest: ResourceNode3D
	var nearest_distance := 5.0
	for node in get_tree().get_nodes_in_group("resource_nodes"):
		if node is ResourceNode3D:
			var distance := node.global_position.distance_to(record.position)
			if distance < nearest_distance and not node.depleted and node.item_id in ["ITEM_IRON_ORE","ITEM_COPPER_ORE","ITEM_COAL","ITEM_QUARTZ","ITEM_GOLD_ORE","ITEM_NICKEL_ORE","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE"]:
				nearest = node
				nearest_distance = distance
	if nearest == null:
		record.status = "WAITING_ORE"
		return
	var item_id := nearest.item_id
	nearest.remaining -= 1
	if nearest.remaining <= 0:
		nearest.depleted = true
		nearest.get_node_or_null("ResourceVisual")?.hide()
	var payload := {"quantity":1,"quality":nearest.node_quality,"purity":nearest.node_purity,"synthetic":false,"origin":"AUTO_MINER:"+nearest.node_id}
	record.output_buffer = {item_id:payload}
	record.status = "PAUSED_OUTPUT"

func _tick_conveyors() -> void:
	for record in _records.values():
		if str(record.kind) != "conveyor":
			continue
		var payload: Dictionary = record.get("belt_payload",{})
		if payload.is_empty():
			var producer := _nearest_output_machine(record)
			if producer != null:
				var buffer: Dictionary = producer.output_buffer
				if not buffer.is_empty():
					var first_id := str(buffer.keys()[0])
					payload = buffer[first_id]
					record.belt_payload = {first_id:payload}
					producer.output_buffer = {}
					producer.status = "IDLE"
		if payload.is_empty():
			continue
		record.belt_timer = float(record.get("belt_timer",0.0))+GameState.FIXED_TICK
		if float(record.belt_timer) < BELT_STEP_SEC:
			continue
		record.belt_timer = 0.0
		var direction: Vector3 = record.get("belt_direction",Vector3.RIGHT)
		var next_pos: Vector3 = record.position+direction*GRID_SIZE*0.5
		var receiver := _nearest_input_machine_at(next_pos,record)
		if receiver != null:
			var item_id := str(record.belt_payload.keys()[0])
			var accepted: Dictionary = receiver.input_buffer
			accepted[item_id] = int(accepted.get(item_id,0))+int(record.belt_payload[item_id].quantity)
			receiver.input_buffer = accepted
			record.belt_payload = {}
			continue
		var next_belt := _nearest_belt_at(next_pos,record)
		if next_belt != null and next_belt.belt_payload.is_empty():
			next_belt.belt_payload = record.belt_payload
			record.belt_payload = {}
	_update_machine_visuals()

func _nearest_output_machine(conveyor: Dictionary) -> Dictionary:
	var best: Dictionary = {}
	var distance := 2.5
	for other in _records.values():
		if other == conveyor or str(other.kind) == "conveyor":
			continue
		var d: float = Vector2(other.position.x,other.position.z).distance_to(Vector2(conveyor.position.x,conveyor.position.z))
		if d < distance and not other.get("output_buffer",{}).is_empty():
			best = other
			distance = d
	return best if not best.is_empty() else {}

func _nearest_input_machine_at(world_position: Vector3, conveyor: Dictionary) -> Dictionary:
	var best: Dictionary = {}
	var distance := 1.8
	for other in _records.values():
		if other == conveyor or str(other.kind) == "conveyor":
			continue
		var d: float = Vector2(other.position.x,other.position.z).distance_to(Vector2(world_position.x,world_position.z))
		if d < distance and GameState.RECIPES.has(str(GameState.MACHINE_DEFS.get(str(other.type),{}).get("recipe",""))):
			best = other
			distance = d
	return best

func _nearest_belt_at(world_position: Vector3, conveyor: Dictionary) -> Dictionary:
	var best: Dictionary = {}
	var distance := 1.8
	for other in _records.values():
		if other == conveyor or str(other.kind) != "conveyor":
			continue
		var d: float = Vector2(other.position.x,other.position.z).distance_to(Vector2(world_position.x,world_position.z))
		if d < distance:
			best = other
			distance = d
	return best

func _update_machine_visuals() -> void:
	for machine_id in machines:
		var machine: FactoryMachine3D = machines[machine_id]
		if _records.has(machine_id):
			machine.set_runtime_state(_records[machine_id])

func get_power_stats() -> Dictionary:
	return {"generation_kw":_power_generation_kw,"consumption_kw":_power_consumption_kw,"ratio":_power_ratio}

func get_machine_inventory(machine_id: String) -> Dictionary:
	return _records.get(machine_id,{})

func buildable_machine_ids() -> Array[String]:
	var result: Array[String] = []
	for type in GameState.MACHINE_DEFS:
		var data: Dictionary = GameState.MACHINE_DEFS[type]
		if int(data.get("tier",0)) <= GameState.current_tier():
			result.append(str(type))
	return result

