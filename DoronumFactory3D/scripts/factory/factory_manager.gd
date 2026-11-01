extends Node3D
class_name FactoryManager3D

signal machine_selected(machine_id: String)
signal building_placed(machine_type: String, instance_id: String)
signal power_summary_changed(generation_kw: float, consumption_kw: float, ratio: float)

const MACHINE_SCRIPT = preload("res://scripts/factory/factory_machine.gd")
const GRID_SIZE := 2.0
const BELT_STEP_SEC := 1.15
const AUTO_MINER_CYCLE_SEC := 8.0
const POWER_BUFFER_CAPACITY_KJ := 1800000.0
const POWER_BUFFER_MAX_DISCHARGE_KW := 5000.0
const POWER_BUFFER_MAX_CHARGE_KW := 5000.0
const MACHINE_IDLE_POWER_KW := 1.0
const RELAY_SITE_XZ := [Vector2(-900,900),Vector2(920,-860),Vector2(930,900)]

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
	if int(data.get("tier",0)) > GameState.current_tier() or not GameState.machine_unlocks_met(machine_type):
		return false
	var cost: Dictionary = data.get("cost",{})
	if not GameState.can_afford(cost):
		return false
	var snap := _snap_position(world_position,machine_type)
	if machine_type == "AUTO_MINER":
		var has_vein := false
		for node in get_tree().get_nodes_in_group("resource_nodes"):
			if node is ResourceNode3D and not node.depleted and node.item_id in ["ITEM_IRON_ORE","ITEM_COPPER_ORE","ITEM_COAL","ITEM_QUARTZ","ITEM_GOLD_ORE","ITEM_NICKEL_ORE","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE"]:
				if node.global_position.distance_to(snap) <= 5.0:
					has_vein = true
					break
		if not has_vein:
			return false
	if machine_type == "STABILIZATION_RELAY":
		var on_site := false
		for site_position in RELAY_SITE_XZ:
			if Vector2(snap.x,snap.z).distance_to(site_position)<=18.0:
				on_site = true
		if not on_site:
			return false
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
		"input_meta":{},
		"active_job":{},
		"fuel_seconds":0.0,
		"progress":0.0,
		"temperature_c":20.0,
		"pressure_mpa":0.0,
		"power_ratio":1.0,
		"belt_payload":{},
		"belt_timer":0.0,
		"energy_kj":0.0,
		"failure_events":0,
		"belt_timer":0.0,
		"variant_recipe":"DORONUM_BLUE",
		"sensor_calibrated":false,
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
		var exists := false
		for relay in GameState.relay_instances:
			if str(relay.get("instance_id","")) == str(record.instance_id):
				exists = true
		if not exists:
			var site_index := -1
			for i in range(RELAY_SITE_XZ.size()):
				if Vector2(record.position.x,record.position.z).distance_to(RELAY_SITE_XZ[i])<=18.0:
					site_index = i
			GameState.relay_instances.append({"instance_id":record.instance_id,"site_id":site_index,"position":record.position,"active":true,"power_ratio":0.0})
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
		if str(item_id)=="ITEM_DORONUM_INFINITY":
			GameState.story_flags["INFINITY_OUTPUT_INSPECTED"]=true
			GameState.story_flags["INFINITY_OUTPUT_READY"]=false
			GameState.toast("Infinity Doronum 검사 완료 · 행성 코어에 설치할 수 있습니다.","success")
			get_tree().call_group("story_manager","evaluate_progression")
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
	var buffer: Dictionary = record.get("input_buffer",{})
	var metadata: Dictionary = record.get("input_meta",{})
	var moved := 0
	for item_id in recipe.inputs:
		var needed := max(0,int(recipe.inputs[item_id])-int(buffer.get(item_id,0)))
		var available := mini(needed,GameState.count_item(str(item_id)))
		if available <= 0:
			continue
		var average: Dictionary = GameState.item_average(str(item_id))
		if not GameState.remove_item(str(item_id),available):
			continue
		var previous: Dictionary = metadata.get(item_id,{"quantity":0,"quality":90.0,"purity":90.0,"synthetic":false})
		var old_qty := int(previous.get("quantity",0))
		var new_qty := old_qty+available
		metadata[item_id] = {
			"quantity":new_qty,
			"quality":(float(previous.get("quality",90.0))*old_qty+float(average.quality)*available)/float(new_qty),
			"purity":(float(previous.get("purity",90.0))*old_qty+float(average.purity)*available)/float(new_qty),
			"synthetic":bool(previous.get("synthetic",false)) or bool(average.synthetic)
		}
		buffer[item_id] = int(buffer.get(item_id,0))+available
		moved += available
	record.input_buffer = buffer
	record.input_meta = metadata
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
	_update_relay_objectives()
	_tick_machines()
	_tick_conveyors()
	_tick_preflight()
	_tick_fusion()
	_tick_stabilization()
	if tick_index % 10 == 0:
		GameState.save_game()
func _allocate_power() -> void:
	var daylight := fposmod(_elapsed_game_seconds,86400.0)/86400.0
	var sun_multiplier := 1.0 if daylight > 0.25 and daylight < 0.78 else 0.18
	var generation := 0.0
	var requests: Array[Dictionary] = []
	var batteries: Array[Dictionary] = []
	for record in _records.values():
		var kind := str(record.get("kind",""))
		if kind == "solar":
			generation += 90.0*sun_multiplier
			continue
		if kind == "wind":
			var wind_factor := 0.65+0.35*sin(_elapsed_game_seconds*0.013)
			generation += 180.0*clampf(wind_factor,0.2,1.0)
			continue
		if kind == "generator":
			if float(record.get("fuel_seconds",0.0)) > 0.0:
				generation += 600.0
			continue
		if kind in ["battery","power_buffer"]:
			batteries.append(record)
			continue
		var definition: Dictionary = GameState.MACHINE_DEFS.get(str(record.type),{})
		var idle_kw := float(definition.get("idle_power_kw",MACHINE_IDLE_POWER_KW))
		var process_kw := float(definition.get("power_kw",0.0))
		var job_active := not record.get("active_job",{}).is_empty()
		if kind == "lab":
			job_active = GameState.active_research != ""
		if kind == "fusion" and bool(GameState.fusion_job.get("running",false)):
			var stage_index := int(GameState.fusion_job.get("stage_index",0))
			process_kw = float(GameState.FUSION_STAGES[stage_index].power_mw)*1000.0
			job_active = true
		var required := idle_kw+(process_kw if job_active else 0.0)
		if kind in ["cooling","cutoff","shielding"] or (kind == "core" and GameState.stabilization_state == "STABILIZING"):
			required = maxf(required,process_kw)
		if required <= 0.0:
			record.power_ratio = 1.0
			continue
		var priority := 3
		if kind in ["cooling","cutoff","shielding"]:
			priority = 0
		elif kind in ["fusion","doronium","lab","core","relay","purifier"]:
			priority = 1
		elif kind in ["auto_miner","fabricator","auto_furnace","miner"]:
			priority = 2
		requests.append({"record":record,"required":required,"priority":priority})
	requests.sort_custom(func(a: Dictionary,b: Dictionary) -> bool:
		if int(a.priority) == int(b.priority):
			return str(a.record.instance_id) < str(b.record.instance_id)
		return int(a.priority) < int(b.priority))
	var total_requested := 0.0
	for request in requests:
		total_requested += float(request.required)
	var discharge_need := maxf(0.0,total_requested-generation)
	var discharge_available := 0.0
	for battery in batteries:
		var max_kw := POWER_BUFFER_MAX_DISCHARGE_KW if str(battery.kind)=="power_buffer" else 500.0
		var energy_kw := float(battery.get("energy_kj",0.0))/GameState.FIXED_TICK
		var discharge_kw := minf(max_kw,energy_kw)
		var used := minf(discharge_kw,discharge_need-discharge_available)
		if used > 0.0:
			battery.energy_kj = maxf(0.0,float(battery.get("energy_kj",0.0))-used*GameState.FIXED_TICK)
			discharge_available += used
		if discharge_available >= discharge_need:
			break
	var available_supply := generation+discharge_available
	var remaining := available_supply
	var consumption := 0.0
	for priority in range(4):
		var group: Array[Dictionary] = []
		var group_need := 0.0
		for request in requests:
			if int(request.priority)==priority:
				group.append(request)
				group_need += float(request.required)
		if group.is_empty():
			continue
		var group_ratio := 1.0 if group_need <= 0.0 else minf(1.0,remaining/group_need)
		for request in group:
			var record: Dictionary = request.record
			var required := float(request.required)
			var allocated := required*group_ratio
			record.power_ratio = clampf(allocated/required,0.0,1.0)
			consumption += allocated
			remaining -= allocated
	_update_power_stats(available_supply,consumption,total_requested)
	var surplus := maxf(0.0,generation-consumption)
	for battery in batteries:
		if surplus <= 0.0:
			break
		var is_buffer := str(battery.kind)=="power_buffer"
		var capacity := POWER_BUFFER_CAPACITY_KJ if is_buffer else 200000.0
		var max_charge := POWER_BUFFER_MAX_CHARGE_KW if is_buffer else 500.0
		var room_kw := (capacity-float(battery.get("energy_kj",0.0)))/GameState.FIXED_TICK
		var charge_kw := minf(surplus,minf(max_charge,room_kw))
		if charge_kw > 0.0:
			battery.energy_kj = minf(capacity,float(battery.get("energy_kj",0.0))+charge_kw*GameState.FIXED_TICK)
			surplus -= charge_kw
func _update_power_stats(generation: float, consumption: float, requested: float) -> void:
	_power_generation_kw = generation
	_power_consumption_kw = consumption
	_power_ratio = 1.0 if requested <= 0.0 else clampf(generation/requested,0.0,1.0)
	power_summary_changed.emit(generation,consumption,_power_ratio)
func _tick_machines() -> void:
	for record in _records.values():
		var type := str(record.type)
		var kind := str(record.kind)
		if kind == "generator":
			if float(record.get("fuel_seconds",0.0)) <= 0.0 and GameState.count_item("ITEM_COAL") > 0:
				if GameState.remove_item("ITEM_COAL",1):
					record.fuel_seconds = 45.0
			else:
				record.fuel_seconds = maxf(0.0,float(record.get("fuel_seconds",0.0))-GameState.FIXED_TICK)
			continue
		if kind in ["solar","wind","battery","transformer","power_buffer","power_pole","relay","core","cooling","cutoff","shielding","lab","research_analyzer","warehouse","sorter","merger","pump","water_tank","pipe","valve"]:
			if kind == "relay":
				record.status = "ONLINE" if float(record.get("power_ratio",0.0)) >= 0.8 else "PAUSED_POWER"
			if kind == "core" and GameState.core_installed:
				record.status = "STANDBY"
			continue
		if float(record.get("cooldown_seconds",0.0)) > 0.0:
			record.cooldown_seconds = maxf(0.0,float(record.cooldown_seconds)-GameState.FIXED_TICK)
			record.status = "COOLING"
			continue
		if float(record.get("condition",100.0)) <= 0.0:
			record.status = "BROKEN"
			continue
		if not record.get("output_buffer",{}).is_empty():
			record.status = "PAUSED_OUTPUT"
			continue
		if kind in ["auto_miner","miner"]:
			_tick_auto_miner(record)
			continue
		if kind == "water_pump":
			_tick_water_pump(record)
			continue
		var recipe_id := str(record.get("recipe_id",GameState.MACHINE_DEFS.get(type,{}).get("recipe","")))
		if recipe_id.is_empty() or not GameState.RECIPES.has(recipe_id):
			record.status = "IDLE"
			continue
		_tick_recipe_machine(record,recipe_id)
func _tick_recipe_machine(record: Dictionary, recipe_id: String) -> void:
	var recipe: Dictionary = GameState.RECIPES[recipe_id]
	if not str(recipe.get("requires_story","")).is_empty() and not bool(GameState.story_flags.get(str(recipe.requires_story),false)):
		record.status = "LOCKED_STORY"
		return
	var job: Dictionary = record.get("active_job",{})
	var buffer: Dictionary = record.get("input_buffer",{})
	var metadata: Dictionary = record.get("input_meta",{})
	if job.is_empty():
		for item_id in recipe.inputs:
			var buffered := int(buffer.get(item_id,0))
			var needed := int(recipe.inputs[item_id])
			if buffered+GameState.count_item(str(item_id)) < needed:
				record.status = "WAITING_INPUT"
				return
		var quality_sum := 0.0
		var purity_sum := 0.0
		var total_weight := 0.0
		var synthetic := false
		var consumed: Dictionary = {}
		var reserved: Dictionary = {}
		for item_id in recipe.inputs:
			var needed := int(recipe.inputs[item_id])
			var from_buffer := mini(needed,int(buffer.get(item_id,0)))
			if from_buffer > 0:
				var meta_entry: Dictionary = metadata.get(item_id,{"quantity":from_buffer,"quality":90.0,"purity":90.0,"synthetic":false})
				var meta_qty := maxf(1.0,float(meta_entry.get("quantity",from_buffer)))
				var take_quality := float(meta_entry.get("quality",90.0))
				var take_purity := float(meta_entry.get("purity",90.0))
				var take_synthetic := bool(meta_entry.get("synthetic",false))
				var weight := float(from_buffer)*float(recipe.get("material_weights",{}).get(item_id,1.0))
				quality_sum += take_quality*weight
				purity_sum += take_purity*float(from_buffer)*float(recipe.get("purity_weights",{}).get(item_id,1.0))
				total_weight += weight
				consumed[item_id] = from_buffer
				buffer[item_id] = int(buffer.get(item_id,0))-from_buffer
				meta_entry.quantity = maxi(0,int(meta_entry.get("quantity",0))-from_buffer)
				if int(meta_entry.quantity) <= 0:
					metadata.erase(item_id)
				else:
					metadata[item_id] = meta_entry
				synthetic = synthetic or take_synthetic
				needed -= from_buffer
			if needed > 0:
				var avg: Dictionary = GameState.item_average(str(item_id))
				var weight_inventory := float(needed)*float(recipe.get("material_weights",{}).get(item_id,1.0))
				quality_sum += float(avg.quality)*weight_inventory
				purity_sum += float(avg.purity)*float(needed)*float(recipe.get("purity_weights",{}).get(item_id,1.0))
				total_weight += weight_inventory
				synthetic = synthetic or bool(avg.synthetic)
				consumed[item_id] = int(consumed.get(item_id,0))+needed
				reserved[item_id] = needed
		if recipe.get("allow_synthetic",true) == false and synthetic:
			record.status = "REJECTED_SYNTHETIC"
			GameState.toast("Synthetic lineage cannot enter this recipe.","error")
			return
		var snapshot := GameState.inventory.duplicate(true)
		for item_id in reserved:
			if not GameState.remove_item(str(item_id),int(reserved[item_id])):
				GameState.inventory = snapshot
				record.status = "ERROR"
				record.last_error = "Atomic input reservation failed"
				return
		record.input_buffer = buffer
		record.input_meta = metadata
		var material_quality := quality_sum/maxf(0.0001,total_weight)
		var purity_weight := 0.0
		for item_id in recipe.inputs:
			purity_weight += float(recipe.inputs[item_id])*float(recipe.get("purity_weights",{}).get(item_id,1.0))
		var material_purity := purity_sum/maxf(0.0001,purity_weight)
		job = {
			"recipe_id":recipe_id,"elapsed":0.0,"reserved":consumed,
			"material_quality":material_quality,"input_purity":material_purity,
			"synthetic":synthetic,"temperature_c":20.0,"pressure_mpa":0.0,
			"quality_temp_sum":0.0,"quality_pressure_sum":0.0,"quality_condition_sum":0.0,
			"quality_time":0.0,"power_samples":[],"failure_exposure":0.0
		}
		record.active_job = job
	var definition: Dictionary = GameState.MACHINE_DEFS.get(str(record.type),{})
	var required_kw := float(definition.get("power_kw",0.0))
	var power_ratio := float(record.get("power_ratio",1.0)) if required_kw>0.0 else 1.0
	if power_ratio < 0.8:
		record.status = "PAUSED_POWER"
		return
	var temp_target := float(recipe.get("temperature",0.0))
	var pressure_target := float(recipe.get("pressure",0.0))
	var effective_delta := GameState.FIXED_TICK*power_ratio
	var temp_rate := float(recipe.get("temperature_rate",maxf(20.0,temp_target*0.8)))
	var pressure_rate := float(recipe.get("pressure_rate",maxf(10.0,pressure_target*0.8)))
	job.temperature_c = move_toward(float(job.temperature_c),temp_target if temp_target>0.0 else 20.0,temp_rate*effective_delta)
	job.pressure_mpa = move_toward(float(job.pressure_mpa),pressure_target,pressure_rate*effective_delta)
	var temp_safe := temp_target<=0.0 or absf(float(job.temperature_c)-temp_target)<=maxf(10.0,temp_target*0.1)
	var pressure_safe := pressure_target<=0.0 or absf(float(job.pressure_mpa)-pressure_target)<=maxf(5.0,pressure_target*0.1)
	if not temp_safe or not pressure_safe:
		record.status = "CALIBRATING"
		record.active_job = job
		return
	var condition := float(record.get("condition",100.0))
	var condition_speed := 0.8 if condition<=10.0 else 1.0
	var progress_delta := effective_delta*condition_speed
	job.elapsed = float(job.elapsed)+progress_delta
	record.progress = float(job.elapsed)
	record.temperature_c = float(job.temperature_c)
	record.pressure_mpa = float(job.pressure_mpa)
	record.status = "BROWNOUT_RUNNING" if power_ratio<1.0 else "RUNNING"
	var t_score := _process_score(float(job.temperature_c),temp_target)
	var p_score := _process_score(float(job.pressure_mpa),pressure_target)
	job.quality_temp_sum = float(job.quality_temp_sum)+t_score*progress_delta
	job.quality_pressure_sum = float(job.quality_pressure_sum)+p_score*progress_delta
	job.quality_condition_sum = float(job.quality_condition_sum)+condition*progress_delta
	job.quality_time = float(job.quality_time)+progress_delta
	var samples: Array = job.get("power_samples",[])
	samples.append(power_ratio)
	if samples.size()>2000:
		samples.pop_front()
	job.power_samples = samples
	_apply_machine_wear_and_failure(record,job,recipe,power_ratio,progress_delta)
	if not record.get("active_job",{}).is_empty() and float(job.elapsed)>=float(recipe.seconds):
		var time_weight := maxf(0.0001,float(job.quality_time))
		var mean_power := 0.0
		for sample in samples:
			mean_power += float(sample)
		mean_power /= maxf(1.0,float(samples.size()))
		var variance := 0.0
		for sample in samples:
			variance += pow(float(sample)-mean_power,2.0)
		variance /= maxf(1.0,float(samples.size()))
		var stability := clampf(100.0*mean_power-50.0*sqrt(variance),0.0,100.0)
		var raw_quality := float(job.material_quality)*0.40+(float(job.quality_temp_sum)/time_weight)*0.20+(float(job.quality_pressure_sum)/time_weight)*0.20+(float(job.quality_condition_sum)/time_weight)*0.10+stability*0.10+float(recipe.get("quality_modifier",0.0))
		var output_quality := clampf(raw_quality-float(recipe.get("pollution_penalty",0.0)),0.0,100.0)
		var output_purity := clampf(float(job.input_purity)-float(recipe.get("process_purity_loss",0.0))+float(recipe.get("purification_bonus",recipe.get("purity_bonus",0.0)))+float(recipe.get("output_purity_modifier",0.0)),0.0,100.0)
		var output_payload: Dictionary = {}
		for item_id in recipe.outputs:
			output_payload[str(item_id)] = {"quantity":int(recipe.outputs[item_id]),"quality":output_quality,"purity":output_purity,"synthetic":bool(job.synthetic),"origin":"RECIPE:"+recipe_id}
		record.output_buffer = output_payload
		record.active_job = {}
		record.progress = 0.0
		record.status = "PAUSED_OUTPUT"
		GameState.grant_rp_once("FIRST_PRODUCTION:"+recipe_id,25 if int(recipe.tier)<=2 else 100)
		GameState.progress_objective("RECIPE_PRODUCED",recipe_id)
		if recipe_id == "DORONUM_NORMAL" and get_tree().has_node("/root/DoronumFactory3D/StoryManager"):
			get_tree().call_group("story_manager","on_first_doronum_created")
		GameState.save_game()

func _process_score(actual: float,target: float) -> float:
	if is_zero_approx(target):
		return 100.0
	var deviation := absf(actual-target)/absf(target)*100.0
	if deviation<=1.0:return 100.0
	if deviation<=3.0:return 95.0
	if deviation<=5.0:return 85.0
	if deviation<=10.0:return 70.0
	return 50.0

func _apply_machine_wear_and_failure(record: Dictionary,job: Dictionary,recipe: Dictionary,power_ratio: float,active_delta: float) -> void:
	var condition := float(record.get("condition",100.0))
	var temp_target := float(recipe.get("temperature",0.0))
	var pressure_target := float(recipe.get("pressure",0.0))
	var temp_risk := 0.0 if temp_target<=0.0 else clampf(absf(float(job.temperature_c)-temp_target)/maxf(1.0,temp_target*0.1),0.0,1.0)
	var pressure_risk := 0.0 if pressure_target<=0.0 else clampf(absf(float(job.pressure_mpa)-pressure_target)/maxf(1.0,pressure_target*0.1),0.0,1.0)
	var power_risk := 1.0-clampf(power_ratio,0.0,1.0)
	var wear_risk := 1.0-clampf(condition/100.0,0.0,1.0)
	var stress := 1.0+temp_risk*0.4+pressure_risk*0.5+power_risk*0.5+wear_risk
	var wear_rate := float(recipe.get("base_wear_per_second",0.002))
	if condition<=10.0:
		stress *= 2.0
	record.condition = maxf(0.0,condition-wear_rate*active_delta*stress)
	var base_probability := float(recipe.get("base_failure_probability",0.0))
	if base_probability<=0.0 or base_probability>=1.0:
		return
	var reference_duration := maxf(1.0,float(recipe.get("failure_reference_seconds",maxf(60.0,float(recipe.seconds)))))
	var base_hazard := -log(1.0-base_probability)/reference_duration
	var multiplier := 1.0+temp_risk*0.8+pressure_risk*1.0+power_risk*0.8+wear_risk*0.8
	if condition<=10.0:multiplier *= 2.0
	var probability := 1.0-exp(-base_hazard*multiplier*active_delta)
	var rng := RandomNumberGenerator.new()
	rng.seed = absi(hash(str(record.instance_id)+str(GameState.simulation_tick)+str(job.recipe_id)))
	if rng.randf()<probability:
		_resolve_machine_failure(record,job,recipe,rng)

func _resolve_machine_failure(record: Dictionary,job: Dictionary,recipe: Dictionary,rng: RandomNumberGenerator) -> void:
	var kind := "BASIC"
	if str(record.kind) in ["doronium","press","purifier"]:kind = "HIGH_PRESSURE"
	if str(record.kind) in ["fusion"]:kind = "INFINITY"
	var roll := rng.randf()*100.0
	var severity := "MINOR"
	if kind=="BASIC":
		severity = "MINOR" if roll<70.0 else "MAJOR" if roll<95.0 else "CRITICAL"
	elif kind=="HIGH_PRESSURE":
		severity = "MINOR" if roll<55.0 else "MAJOR" if roll<90.0 else "CRITICAL"
	elif kind=="INFINITY":
		severity = "MINOR" if roll<30.0 else "MAJOR" if roll<75.0 else "CRITICAL"
	var salvage_ratio := 1.0
	if severity=="MINOR":
		record.condition = maxf(0.0,float(record.condition)-2.0)
		job.elapsed = maxf(0.0,float(job.elapsed)-2.0)
		record.pollution = float(record.get("pollution",0.0))+1.0
	elif severity=="MAJOR":
		salvage_ratio = 0.5
		record.condition = maxf(0.0,float(record.condition)-20.0)
		record.cooldown_seconds = 15.0
		record.status = "COOLING"
		record.active_job = {}
	else:
		salvage_ratio = 0.75
		record.condition = 0.0
		record.status = "BROKEN"
		record.active_job = {}
	for item_id in job.get("reserved",{}):
		var quantity := int(floor(float(job.reserved[item_id])*salvage_ratio))
		if quantity>0:
			GameState.add_item(str(item_id),quantity,float(job.get("material_quality",90.0)),float(job.get("input_purity",90.0)),bool(job.get("synthetic",false)),"FAILURE_SALVAGE")
	record.failure_events = int(record.get("failure_events",0))+1
	record.last_failure = {"event_id":"FAILURE:"+str(record.instance_id)+":"+str(GameState.simulation_tick),"severity":severity,"salvage_ratio":salvage_ratio}
	GameState.toast("기계 고장 · %s · 회수율 %d%%" % [severity,int(salvage_ratio*100.0)],"error" if severity=="CRITICAL" else "warning")
	GameState.save_game()
func _tick_auto_miner(record: Dictionary) -> void:
	var definition: Dictionary = GameState.MACHINE_DEFS.get(str(record.type),{})
	var required := float(definition.get("power_kw",0.0))
	var ratio := float(record.get("power_ratio",1.0)) if required>0.0 else 1.0
	if ratio<0.8:
		record.status = "PAUSED_POWER"
		return
	record.progress = float(record.get("progress",0.0))+GameState.FIXED_TICK*ratio
	if float(record.progress)<AUTO_MINER_CYCLE_SEC:
		record.status = "RUNNING"
		return
	record.progress = 0.0
	var nearest: ResourceNode3D
	var nearest_distance := 5.0
	for node in get_tree().get_nodes_in_group("resource_nodes"):
		if node is ResourceNode3D:
			var distance := node.global_position.distance_to(record.position)
			if distance<nearest_distance and not node.depleted and node.item_id in ["ITEM_IRON_ORE","ITEM_COPPER_ORE","ITEM_COAL","ITEM_QUARTZ","ITEM_GOLD_ORE","ITEM_NICKEL_ORE","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE"]:
				nearest = node
				nearest_distance = distance
	if nearest == null:
		record.status = "WAITING_ORE"
		return
	var item_id := nearest.item_id
	nearest.remaining -= 1
	if nearest.remaining<=0:
		nearest.depleted = true
		var visual := nearest.get_node_or_null("ResourceVisual")
		if visual:
			visual.hide()
		var collider := nearest.get_node_or_null("CollisionShape3D") as CollisionShape3D
		if collider:
			collider.disabled = true
	var payload := {"quantity":1,"quality":nearest.node_quality,"purity":nearest.node_purity,"synthetic":false,"origin":"AUTO_MINER:"+nearest.node_id}
	record.output_buffer = {item_id:payload}
	record.status = "PAUSED_OUTPUT"
	var node_state: Dictionary = GameState.world_state.get("resource_nodes",{})
	node_state[nearest.node_id] = nearest.remaining
	GameState.world_state["resource_nodes"] = node_state
	GameState.save_game()
func _tick_conveyors() -> void:
	for record in _records.values():
		if str(record.kind)!="conveyor":
			continue
		var payload: Dictionary = record.get("belt_payload",{})
		var direction := Vector3(sin(float(record.get("rotation_y",0.0))),0.0,cos(float(record.get("rotation_y",0.0))))
		if payload.is_empty():
			var producer := _nearest_output_machine(record)
			if not producer.is_empty():
				var producer_buffer: Dictionary = producer.output_buffer
				if not producer_buffer.is_empty():
					var first_id := str(producer_buffer.keys()[0])
					payload = producer_buffer[first_id]
					record.belt_payload = {first_id:payload}
					producer_buffer.erase(first_id)
					producer.output_buffer = producer_buffer
					producer.status = "IDLE" if producer_buffer.is_empty() else "PAUSED_OUTPUT"
		if payload.is_empty():
			var empty_machine: FactoryMachine3D = machines.get(str(record.instance_id))
			if empty_machine: empty_machine.set_belt_payload({})
			continue
		record.belt_timer = float(record.get("belt_timer",0.0))+GameState.FIXED_TICK
		var belt_progress := clampf(float(record.belt_timer)/BELT_STEP_SEC,0.0,1.0)
		var belt_visual: FactoryMachine3D = machines.get(str(record.instance_id))
		if belt_visual: belt_visual.set_belt_payload(payload,belt_progress)
		if float(record.belt_timer)<BELT_STEP_SEC:
			continue
		var next_pos: Vector3 = record.position+direction*GRID_SIZE
		var receiver := _nearest_input_machine_at(next_pos,record)
		if not receiver.is_empty():
			var item_id := str(record.belt_payload.keys()[0])
			var accepted: Dictionary = receiver.input_buffer
			var target_recipe := GameState.RECIPES.get(str(receiver.get("recipe_id",GameState.MACHINE_DEFS.get(str(receiver.type),{}).get("recipe",""))),{})
			if target_recipe.is_empty() or not target_recipe.get("inputs",{}).has(item_id):
				record.status = "BLOCKED_ROUTE"
				continue
			var quantity := int(record.belt_payload[item_id].quantity)
			accepted[item_id] = int(accepted.get(item_id,0))+quantity
			receiver.input_buffer = accepted
			var receiver_meta: Dictionary = receiver.get("input_meta",{})
			receiver_meta[item_id] = record.belt_payload[item_id]
			receiver.input_meta = receiver_meta
			record.belt_payload = {}
			record.belt_timer = 0.0
			if belt_visual: belt_visual.set_belt_payload({})
			continue
		var next_belt := _nearest_belt_at(next_pos,record)
		if not next_belt.is_empty() and next_belt.get("belt_payload",{}).is_empty():
			next_belt.belt_payload = record.belt_payload
			next_belt.belt_timer = 0.0
			record.belt_payload = {}
			record.belt_timer = 0.0
			if belt_visual: belt_visual.set_belt_payload({})
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


func _update_relay_objectives() -> void:
	var sites: Dictionary = {}
	for record in _records.values():
		if str(record.type)!="STABILIZATION_RELAY" or float(record.get("power_ratio",0.0))<0.8:
			continue
		for i in range(RELAY_SITE_XZ.size()):
			if Vector2(record.position.x,record.position.z).distance_to(RELAY_SITE_XZ[i])<=18.0:
				sites[i]=true
	if sites.size()>=3 and not bool(GameState.story_flags.get("THREE_RELAYS_ACTIVE",false)):
		GameState.story_flags["THREE_RELAYS_ACTIVE"]=true
		GameState.toast("세 행성 에너지 노드에 안정화 릴레이 연결 완료","success")
		get_tree().call_group("story_manager","evaluate_progression")

func fuel_all_generators(fuel_seconds: float = 300.0) -> void:
	var required_per_generator := int(ceil(fuel_seconds/45.0))
	var generators: Array[Dictionary] = []
	for record in _records.values():
		if str(record.kind)=="generator":
			generators.append(record)
	var needed := generators.size()*required_per_generator
	if GameState.count_item("ITEM_COAL") < needed:
		GameState.toast("연료 부족 · 석탄 %d개가 필요합니다." % needed,"warning")
		return
	for record in generators:
		record.fuel_seconds = float(record.get("fuel_seconds",0.0))+fuel_seconds
		GameState.remove_item("ITEM_COAL",required_per_generator)
	GameState.toast("발전기 %d대에 연료 %d초분 투입" % [generators.size(),int(fuel_seconds)],"success")
	GameState.save_game()

func run_preflight_test(test_id: String) -> bool:
	var tests: Dictionary = GameState.story_flags.get("FUSION_PREFLIGHT",{})
	var existing: Dictionary = tests.get(test_id,{})
	if bool(existing.get("passed",false)):
		GameState.toast("이 진단 시험은 이미 통과했습니다.","info")
		return true
	if not GameState.has_machine_kind("fusion"):
		GameState.toast("Infinity Fusion Machine이 필요합니다.","warning")
		return false
	match test_id:
		"power":
			if _power_generation_kw<5000.0:
				GameState.toast("전력 안정성 시험에는 5MW 이상의 발전 공급이 필요합니다.","warning")
				return false
			GameState.story_flags["FUSION_PREFLIGHT_RUNNING"] = {"test":"power","ticks":0}
			GameState.toast("5MW 전력 안정성 시험 시작 · 30초","info")
			return true
		"pressure":
			if GameState.count_item("ITEM_SENSOR")<7:
				GameState.toast("압력 교정에는 Sensor 7개가 필요합니다.","warning")
				return false
			if not GameState.remove_item("ITEM_SENSOR",7):
				return false
			tests["pressure"] = {"passed":true,"completed_tick":GameState.simulation_tick,"channels":7}
			GameState.story_flags["FUSION_PREFLIGHT"] = tests
			GameState.story_flags["PREFLIGHT_PRESSURE"] = true
			GameState.toast("7채널 압력 센서 교정 완료","success")
			GameState.save_game()
			return true
		"cooling":
			for required_kind in ["cooling","power_buffer","shielding","cutoff"]:
				if not GameState.has_machine_kind(required_kind):
					GameState.toast("필수 안전 설비가 없습니다: "+required_kind,"warning")
					return false
			if GameState.count_item("ITEM_WATER")<20:
				GameState.toast("비상 냉각 시험에는 Water 20L가 필요합니다.","warning")
				return false
			if not GameState.remove_item("ITEM_WATER",20):
				return false
			GameState.story_flags["FUSION_PREFLIGHT_RUNNING"] = {"test":"cooling","ticks":0}
			GameState.toast("비상 냉각 시스템 부하 시험 시작 · 20초","info")
			return true
	GameState.toast("알 수 없는 진단 시험입니다.","error")
	return false

func _tick_preflight() -> void:
	var active: Dictionary = GameState.story_flags.get("FUSION_PREFLIGHT_RUNNING",{})
	if active.is_empty():
		return
	var test_id := str(active.get("test",""))
	var ticks := int(active.get("ticks",0))
	if test_id=="power":
		if _power_generation_kw>=5000.0 and _power_ratio>=0.95:
			ticks += 1
		else:
			ticks = 0
		active["ticks"] = ticks
		GameState.story_flags["FUSION_PREFLIGHT_RUNNING"] = active
		if ticks>=300:
			_complete_preflight("power",{"stable_ticks":ticks,"supply_kw":_power_generation_kw})
	elif test_id=="cooling":
		if _power_ratio<0.8:
			GameState.toast("냉각 시험 중 전력 부족으로 시험이 중단되었습니다.","warning")
			GameState.story_flags.erase("FUSION_PREFLIGHT_RUNNING")
			return
		ticks += 1
		active["ticks"] = ticks
		GameState.story_flags["FUSION_PREFLIGHT_RUNNING"] = active
		if ticks>=200:
			_complete_preflight("cooling",{"cooling_ticks":ticks,"water_l":20})

func _complete_preflight(test_id: String, details: Dictionary) -> void:
	var tests: Dictionary = GameState.story_flags.get("FUSION_PREFLIGHT",{})
	tests[test_id] = {"passed":true,"completed_tick":GameState.simulation_tick,"details":details}
	GameState.story_flags["FUSION_PREFLIGHT"] = tests
	GameState.story_flags["PREFLIGHT_"+test_id.to_upper()] = true
	GameState.story_flags.erase("FUSION_PREFLIGHT_RUNNING")
	GameState.toast("진단 시험 통과 · "+test_id.to_upper(),"success")
	GameState.save_game()
	get_tree().call_group("story_manager","evaluate_progression")

func start_infinity_fusion() -> bool:
	var errors: Array[String] = []
	var fusion_record: Dictionary = {}
	for record in _records.values():
		if str(record.type)=="INFINITY_FUSION_MACHINE":
			fusion_record = record
			break
	if fusion_record.is_empty():errors.append("Infinity Fusion Machine 미설치")
	if not GameState.completed_research.has("RESEARCH_INFINITY_INDUSTRY"):errors.append("RESEARCH_INFINITY_INDUSTRY 연구 미완료")
	for machine_type in ["POWER_BUFFER","COOLING_TOWER","SHIELDING","EMERGENCY_CUTOFF"]:
		if not GameState.has_machine_kind(str(GameState.MACHINE_DEFS.get(machine_type,{}).get("kind",machine_type.to_lower()))):
			var found := false
			for record in _records.values():
				if str(record.type)==machine_type:found=true
			if not found:errors.append(str(GameState.MACHINE_DEFS.get(machine_type,{}).get("name",machine_type))+" 미설치")
	var tests: Dictionary = GameState.story_flags.get("FUSION_PREFLIGHT",{})
	for test_id in ["power","pressure","cooling"]:
		if not bool(tests.get(test_id,{}).get("passed",false)):
			errors.append("사전 진단 "+test_id+" 미통과")
	if float(fusion_record.get("condition",100.0))<80.0:errors.append("Fusion Machine Condition 80 미만")
	var power_buffer: Dictionary = {}
	for record in _records.values():
		if str(record.type)=="POWER_BUFFER":power_buffer=record
	if float(power_buffer.get("energy_kj",0.0))<300000.0:errors.append("독립 전력 버퍼 에너지 300,000kJ 미달")
	for item_id in GameState.DORONUM_IDS:
		if GameState.count_item(item_id)<GameState.INFINITY_INPUT_COUNT:
			errors.append(str(GameState.ITEM_DATA.get(item_id,{}).get("name",item_id))+": 100개 부족")
			continue
		var average: Dictionary = GameState.item_average(item_id)
		if float(average.quality)<GameState.INFINITY_REQUIRED_QUALITY:errors.append(item_id+" Quality 90 미달")
		if float(average.purity)<GameState.INFINITY_REQUIRED_PURITY:errors.append(item_id+" Purity 90 미달")
		if bool(average.synthetic):errors.append(item_id+" Synthetic 원료 포함")
	if not errors.is_empty():
		GameState.toast("퓨전 시작 불가 · "+str(errors.size())+"개 조건 미충족","error")
		GameState.story_flags["FUSION_PREFLIGHT_ERRORS"] = errors
		GameState.save_game()
		return false
	if bool(GameState.fusion_job.get("running",false)) or bool(GameState.fusion_job.get("completed",false)):
		GameState.toast("퓨전 작업이 이미 시작되었거나 완료되었습니다.","warning")
		return false
	var snapshot := GameState.inventory.duplicate(true)
	var manifest: Dictionary = {}
	for item_id in GameState.DORONUM_IDS:
		var average: Dictionary = GameState.item_average(item_id)
		manifest[item_id] = {"quantity":100,"quality":average.quality,"purity":average.purity,"synthetic":false}
	for item_id in GameState.DORONUM_IDS:
		if not GameState.remove_item(item_id,100):
			GameState.inventory = snapshot
			GameState.inventory_changed.emit()
			GameState.toast("입력 예약 트랜잭션 실패 · 재료를 되돌렸습니다.","error")
			return false
	GameState.fusion_job = {
		"job_id":"INFINITY-"+str(GameState.simulation_tick),
		"running":true,"completed":false,"stage_index":0,"stage_progress":0.0,
		"temperature_c":20.0,"pressure_mpa":0.0,"input_manifest":manifest,
		"failure_exposure":0.0,"cooldown_seconds":0.0,"output_committed":false,
		"power_samples":[],"temp_score_sum":0.0,"pressure_score_sum":0.0,
		"condition_score_sum":0.0,"quality_time":0.0
	}
	fusion_record.active_job = {"recipe_id":"INFINITY_FUSION","elapsed":0.0}
	fusion_record.status = "RUNNING"
	GameState.story_flags["INFINITY_FUSION_STARTED"] = true
	GameState.story_flags.erase("FUSION_PREFLIGHT_ERRORS")
	GameState.toast("INFINITY FUSION 시작 · 7단계 · 이상적 작동 시간 260초","success")
	GameState.progression_changed.emit()
	GameState.save_game()
	return true

func _resolve_fusion_failure(job: Dictionary, fusion_record: Dictionary, rng: RandomNumberGenerator) -> void:
	var roll := rng.randf()*100.0
	var severity := "MINOR" if roll<30.0 else "MAJOR" if roll<75.0 else "CRITICAL"
	if severity=="MINOR":
		job.stage_progress = maxf(0.0,float(job.stage_progress)-2.0)
		fusion_record.condition = maxf(0.0,float(fusion_record.get("condition",100.0))-3.0)
		GameState.toast("Fusion Minor Failure · 공정 진행도가 일부 감소했습니다.","warning")
	elif severity=="MAJOR":
		job.stage_progress = maxf(0.0,float(job.stage_progress)-8.0)
		job.cooldown_seconds = 30.0
		fusion_record.condition = maxf(0.0,float(fusion_record.get("condition",100.0))-20.0)
		fusion_record.status = "COOLING"
		GameState.toast("Fusion Major Failure · 냉각 및 설비 점검이 필요합니다.","error")
	else:
		var manifest: Dictionary = job.get("input_manifest",{})
		for item_id in manifest:
			var payload: Dictionary = manifest[item_id]
			var salvage := int(floor(float(payload.get("quantity",0))*0.75))
			if salvage>0:
				GameState.add_item(str(item_id),salvage,float(payload.get("quality",90.0)),float(payload.get("purity",90.0)),false,"INFINITY_FAILURE_SALVAGE")
		fusion_record.condition = 0.0
		fusion_record.status = "BROKEN"
		job.running = false
		job.failed = true
		job.failure_severity = "CRITICAL"
		GameState.story_flags["INFINITY_FUSION_FAILED"] = true
		GameState.toast("Fusion Critical Failure · 75% 재료 회수 · 설비 수리 후 재도전할 수 있습니다.","error")
	GameState.fusion_job = job
	GameState.save_game()

func _tick_fusion() -> void:
	if not bool(GameState.fusion_job.get("running",false)):
		return
	var job: Dictionary = GameState.fusion_job
	var stage_index := int(job.get("stage_index",0))
	if stage_index<0 or stage_index>=GameState.FUSION_STAGES.size():
		GameState.toast("Fusion stage index 오류 · 작업을 안전 정지했습니다.","error")
		job.running = false
		job.error = "INVALID_STAGE"
		GameState.fusion_job = job
		return
	var stage: Dictionary = GameState.FUSION_STAGES[stage_index]
	var fusion_record: Dictionary = {}
	for record in _records.values():
		if str(record.type)=="INFINITY_FUSION_MACHINE":
			fusion_record=record
			break
	if fusion_record.is_empty():
		job.running = false
		job.error = "FUSION_MACHINE_MISSING"
		GameState.fusion_job = job
		return
	var ratio := float(fusion_record.get("power_ratio",0.0))
	if ratio<0.8:
		fusion_record.status = "PAUSED_POWER"
		return
	if float(job.get("cooldown_seconds",0.0))>0.0:
		job.cooldown_seconds = maxf(0.0,float(job.cooldown_seconds)-GameState.FIXED_TICK)
		fusion_record.status = "COOLING"
		return
	var delta := GameState.FIXED_TICK*ratio
	var target_temp := float(stage.temp_c)
	var target_pressure := float(stage.pressure_mpa)
	job.temperature_c = move_toward(float(job.temperature_c),target_temp,1200.0*delta)
	job.pressure_mpa = move_toward(float(job.pressure_mpa),target_pressure,8000.0*delta)
	var temp_ok := absf(float(job.temperature_c)-target_temp)<=target_temp*0.1
	var pressure_ok := absf(float(job.pressure_mpa)-target_pressure)<=target_pressure*0.1
	fusion_record.temperature_c = job.temperature_c
	fusion_record.pressure_mpa = job.pressure_mpa
	fusion_record.stage_index = stage_index
	fusion_record.status = "CALIBRATING" if not temp_ok or not pressure_ok else ("BROWNOUT_RUNNING" if ratio<1.0 else "RUNNING")
	if not temp_ok or not pressure_ok:
		GameState.fusion_job=job
		return
	job.stage_progress = float(job.get("stage_progress",0.0))+delta
	var condition := float(fusion_record.get("condition",100.0))
	var samples: Array = job.get("power_samples",[])
	samples.append(ratio)
	job.power_samples=samples
	job.temp_score_sum = float(job.get("temp_score_sum",0.0))+_process_score(float(job.temperature_c),target_temp)*delta
	job.pressure_score_sum = float(job.get("pressure_score_sum",0.0))+_process_score(float(job.pressure_mpa),target_pressure)*delta
	job.condition_score_sum = float(job.get("condition_score_sum",0.0))+condition*delta
	job.quality_time = float(job.get("quality_time",0.0))+delta
	job.failure_exposure = float(job.get("failure_exposure",0.0))+delta
	fusion_record.progress = float(job.stage_progress)
	var fusion_base_hazard := -log(1.0-0.01)/260.0
	var temp_risk := clampf(absf(float(job.temperature_c)-target_temp)/maxf(1.0,target_temp*0.1),0.0,1.0)
	var pressure_risk := clampf(absf(float(job.pressure_mpa)-target_pressure)/maxf(1.0,target_pressure*0.1),0.0,1.0)
	var power_risk := 1.0-clampf(ratio,0.0,1.0)
	var wear_risk := 1.0-clampf(condition/100.0,0.0,1.0)
	var hazard_multiplier := 1.0+temp_risk*0.8+pressure_risk+power_risk*0.8+wear_risk*0.8
	if condition<=10.0:
		hazard_multiplier*=2.0
	var tick_failure_probability := 1.0-exp(-fusion_base_hazard*hazard_multiplier*delta)
	var failure_rng := RandomNumberGenerator.new()
	failure_rng.seed = absi(hash(str(job.get("job_id","INFINITY"))+str(GameState.simulation_tick)))
	if failure_rng.randf()<tick_failure_probability:
		_resolve_fusion_failure(job,fusion_record,failure_rng)
		return
	if float(job.stage_progress)>=float(stage.seconds):
		GameState.story_flags["FUSION_STAGE_"+str(stage_index+1)+"_COMPLETE"] = true
		job.stage_index = stage_index+1
		job.stage_progress = 0.0
		job.temperature_c = float(stage.temp_c)
		job.pressure_mpa = float(stage.pressure_mpa)
		GameState.toast("Fusion Stage %d / 7 완료 · %s" % [stage_index+1,str(stage.name)],"success")
		if int(job.stage_index)>=7:
			_commit_infinity_output(fusion_record,job)
	GameState.fusion_job=job
	if GameState.simulation_tick%10==0:GameState.save_game()

func _commit_infinity_output(fusion_record: Dictionary,job: Dictionary) -> void:
	if bool(job.get("output_committed",false)):
		return
	var time_weight := maxf(0.0001,float(job.get("quality_time",0.0)))
	var samples: Array = job.get("power_samples",[])
	var mean := 0.0
	for value in samples:mean+=float(value)
	mean/=maxf(1.0,float(samples.size()))
	var variance := 0.0
	for value in samples:variance+=pow(float(value)-mean,2.0)
	variance/=maxf(1.0,float(samples.size()))
	var power_score := clampf(100.0*mean-50.0*sqrt(variance),0.0,100.0)
	var manifest: Dictionary = job.get("input_manifest",{})
	var material_q := 0.0
	var total_q_weight := 0.0
	var material_p := 0.0
	var total_p_weight := 0.0
	for item_id in GameState.DORONUM_IDS:
		var payload: Dictionary = manifest.get(item_id,{})
		material_q += float(payload.get("quality",0.0))*100.0
		material_p += float(payload.get("purity",0.0))*100.0
		total_q_weight += 100.0
		total_p_weight += 100.0
	material_q/=maxf(1.0,total_q_weight)
	material_p/=maxf(1.0,total_p_weight)
	var quality := clampf(material_q*0.4+(float(job.temp_score_sum)/time_weight)*0.2+(float(job.pressure_score_sum)/time_weight)*0.2+(float(job.condition_score_sum)/time_weight)*0.1+power_score*0.1,0,100)
	var purity := clampf(material_p,0,100)
	fusion_record.output_buffer = {"ITEM_DORONUM_INFINITY":{"quantity":1,"quality":quality,"purity":purity,"synthetic":false,"origin":"INFINITY_FUSION"}}
	fusion_record.active_job = {}
	fusion_record.status = "PAUSED_OUTPUT"
	fusion_record.progress = 0.0
	job.running=false
	job.completed=true
	job.output_committed=true
	job.completed_tick=GameState.simulation_tick
	job.result_quality=quality
	job.result_purity=purity
	GameState.fusion_job=job
	GameState.story_flags["INFINITY_CRAFTED"] = true
	GameState.story_flags["INFINITY_OUTPUT_READY"] = true
	GameState.toast("INFINITY DORONUM 생성 완료 · 출력 버퍼에서 직접 회수하세요.","success")
	GameState.progression_changed.emit()
	GameState.save_game()

func install_infinity_core() -> bool:
	if GameState.core_installed:
		GameState.toast("Infinity Doronum은 이미 Core에 설치되어 있습니다.","info")
		return true
	if GameState.count_item("ITEM_DORONUM_INFINITY")<1:
		GameState.toast("Infinity Doronum ×1을 인벤토리에 회수해야 합니다.","warning")
		return false
	var relays: Array = []
	var active_sites: Dictionary = {}
	for record in _records.values():
		if str(record.type)=="STABILIZATION_RELAY" and float(record.get("power_ratio",0.0))>=0.8:
			for site_index in range(RELAY_SITE_XZ.size()):
				if Vector2(record.position.x,record.position.z).distance_to(RELAY_SITE_XZ[site_index])<=18.0:
					active_sites[site_index]=true
			relays.append(record)
	if active_sites.size()<3:
		GameState.toast("행성 에너지 노드의 안정화 릴레이 3개가 모두 가동 중이어야 합니다.","warning")
		return false
	var core: Dictionary = {}
	for record in _records.values():
		if str(record.type)=="STABILIZATION_CORE":
			core=record
	if core.is_empty():
		GameState.toast("Central Stabilization Core를 설치하세요.","warning")
		return false
	if not GameState.remove_item("ITEM_DORONUM_INFINITY",1):
		return false
	GameState.core_installed=true
	GameState.stabilization_state="STABILIZING"
	GameState.story_flags["CORE_INFINITY_INSTALLED"]=true
	GameState.story_flags["STABILIZATION_PROGRESS"]=0.0
	core.status="SYNCHRONIZING"
	GameState.toast("Infinity Doronum 설치 완료 · ORBIT 행성 동기화 시작","success")
	GameState.save_game()
	return true

func _tick_stabilization() -> void:
	if GameState.stabilization_state not in ["STABILIZING","PAUSED_RELAY"]:
		return
	var active_sites: Dictionary = {}
	for relay in _records.values():
		if str(relay.type)=="STABILIZATION_RELAY" and float(relay.get("power_ratio",0.0))>=0.8:
			for i in range(RELAY_SITE_XZ.size()):
				if Vector2(relay.position.x,relay.position.z).distance_to(RELAY_SITE_XZ[i])<=18.0:
					active_sites[i]=true
	if active_sites.size()<3:
		GameState.stabilization_state="PAUSED_RELAY"
		return
	GameState.stabilization_state="STABILIZING"
	GameState.story_flags["THREE_RELAYS_ACTIVE"]=true
	var progress := float(GameState.story_flags.get("STABILIZATION_PROGRESS",0.0))+GameState.FIXED_TICK
	GameState.story_flags["STABILIZATION_PROGRESS"]=progress
	if progress>=60.0:
		GameState.stabilization_state="COMPLETED"
		GameState.story_flags["PLANETARY_STABILIZATION_COMPLETE"]=true
		GameState.story_flags["CAMPAIGN_COMPLETE"]=true
		GameState.story_flags["INFINITE_INDUSTRY_MODE"]=true
		GameState.grant_skill_point_once("ENDING:PLANETARY_STABILIZATION")
		GameState.toast("THE PLANET IS STABLE · THE FACTORY REMAINS OPERATIONAL","success")
		get_tree().call_group("story_manager","evaluate_progression")
	if GameState.simulation_tick%10==0:
		GameState.save_game()
func buildable_machine_ids() -> Array[String]:
	var result: Array[String] = []
	for type in GameState.MACHINE_DEFS:
		var data: Dictionary = GameState.MACHINE_DEFS[type]
		if int(data.get("tier",0)) <= GameState.current_tier():
			result.append(str(type))
	return result

