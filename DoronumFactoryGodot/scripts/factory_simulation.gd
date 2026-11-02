extends Node
class_name FactorySimulation

var game: GameState
var world: PlanetWorld
var last_power_ratio := 1.0
var total_generation := 0.0
var total_consumption := 0.0
var tick_number := 0
var accumulator := 0.0

func bind_state(state: GameState, planet: PlanetWorld = null) -> void:
	game = state
	world = planet

func tick(delta: float) -> void:
	if game == null or game.simulation_paused:
		return
	accumulator += maxf(0.0,delta)
	var steps := 0
	while accumulator >= GameData.SIM_TICK and steps < 10:
		accumulator -= GameData.SIM_TICK
		_fixed_tick(GameData.SIM_TICK)
		steps += 1

func _fixed_tick(dt: float) -> void:
	tick_number += 1
	total_generation = 0.0
	total_consumption = 0.0
	var starter_timer := float(game.power_state.get("starter_fuel_timer",0.0))
	if starter_timer <= 0.0:
		if game.consume_items({"ITEM_COAL":1}):
			starter_timer = 60.0
	if starter_timer > 0.0:
		total_generation += 250.0
		starter_timer = maxf(0.0,starter_timer-dt)
	game.power_state["starter_fuel_timer"] = starter_timer
	var world_time := fposmod(float(game.power_state.get("world_time",0.25))+dt/900.0,1.0)
	game.power_state["world_time"] = world_time
	var daylight := maxf(0.0,sin(world_time*TAU))
	for machine in game.buildings:
		match machine.id:
			"GENERATOR":
				var fuel_timer := float(machine.get("fuel_timer",0.0))
				if fuel_timer <= 0.0 and game.consume_items({"ITEM_COAL":1}):
					fuel_timer = 60.0
				if fuel_timer > 0.0:
					total_generation += 250.0
					fuel_timer = maxf(0.0,fuel_timer-dt)
				machine.fuel_timer = fuel_timer
			"SOLAR_PANEL": total_generation += 80.0*daylight
			"WIND_TURBINE": total_generation += 100.0*(0.65+0.35*sin(world_time*TAU*2.7))
	for machine in game.buildings:
		if machine.id in ["GENERATOR","SOLAR_PANEL","WIND_TURBINE","INFINITY_FUSION_MACHINE"]:
			continue
		if machine.id=="RESEARCH_LAB":
			if not game.active_research.is_empty():
				total_consumption += 25.0
			continue
		if machine.id=="STABILIZATION_RELAY":
			if game.relays.any(func(r): return r.instance_id==machine.instance_id and bool(r.active)):
				total_consumption += 100.0
			continue
		if machine.id=="STABILIZATION_CORE":
			if game.core_installed:
				total_consumption += 500.0
			continue
		var definition: Dictionary = GameData.building_definition(str(machine.id))
		var idle_power := maxf(0.0,float(definition.get("power",0.0)))
		var recipe_id := str(machine.get("recipe",""))
		if not recipe_id.is_empty():
			var recipe: Dictionary = GameData.recipe_definition(recipe_id)
			total_consumption += maxf(idle_power,float(recipe.get("power",0.0)))
		else:
			total_consumption += idle_power
	var base_consumption := total_consumption
	var surplus := maxf(0.0,total_generation-base_consumption)
	var has_buffer: bool = game.buildings.any(func(m): return m.id=="FUSION_POWER_BUFFER" and float(m.condition)>0.0)
	var buffer_kwh := float(game.power_state.get("fusion_buffer_kwh",0.0))
	var fusion_request := 0.0
	var fusion_active: bool = not game.fusion.is_empty() and not bool(game.fusion.get("output_committed",false)) and not str(game.fusion.get("state","")).begins_with("FAILED")
	if fusion_active:
		var stage_index := int(game.fusion.get("stage",0))
		if stage_index>=0 and stage_index<GameData.FUSION_STAGES.size():
			fusion_request = float(GameData.FUSION_STAGES[stage_index].power)
	var direct_fusion_power := minf(surplus,fusion_request)
	var battery_fusion_power := 0.0
	if fusion_request>direct_fusion_power and has_buffer and dt>0.0:
		battery_fusion_power = minf(5000.0,minf(fusion_request-direct_fusion_power,buffer_kwh*3600.0/dt))
		buffer_kwh -= battery_fusion_power*dt/3600.0
	var remaining_surplus := maxf(0.0,surplus-direct_fusion_power)
	if has_buffer and not fusion_active:
		var charge_kw := minf(5000.0,remaining_surplus)
		buffer_kwh = minf(500.0,buffer_kwh+charge_kw*dt/3600.0)
	game.power_state["fusion_buffer_kwh"] = clampf(buffer_kwh,0.0,500.0)
	game.power_state["fusion_power_ratio"] = 0.0 if fusion_request<=0.0 else clampf((direct_fusion_power+battery_fusion_power)/fusion_request,0.0,1.0)
	game.total_power_generated = total_generation
	game.total_power_used = base_consumption+direct_fusion_power+battery_fusion_power
	last_power_ratio = 1.0 if base_consumption<=0.0 else minf(1.0,total_generation/base_consumption)
	game.power_state["research_power_ratio"] = last_power_ratio
	for machine in game.buildings:
		_tick_machine(machine, dt)
	_tick_conveyors(dt)
	if world != null:
		world.advance_simulation(dt)
	game.advance_fixed_tick(dt)
	if tick_number % 50 == 0:
		if world != null:
			game.sync_world_state(world)
		game.save_game()

func _tick_machine(machine: Dictionary, dt: float) -> void:
	if machine.id == "AUTO_MINER":
		_tick_auto_miner(machine,dt)
		return
	if machine.id == "WATER_PUMP":
		_tick_water_pump(machine,dt)
		return
	if machine.id == "DORI_MEAT_HARVESTER":
		_tick_dori_harvester(machine,dt)
		return
	if machine.id in ["GENERATOR","SOLAR_PANEL","WIND_TURBINE","CONVEYOR","WAREHOUSE","STABILIZATION_RELAY","STABILIZATION_CORE","INFINITY_FUSION_MACHINE"]:
		return
	if float(machine.get("condition",100.0))<=0.0:
		machine.condition = 0.0
		machine.state = "BROKEN"
		return
	var cooldown := float(machine.get("failure_cooldown",0.0))
	if cooldown>0.0:
		machine.failure_cooldown = maxf(0.0,cooldown-dt)
		machine.state = "COOLING_DOWN"
		return
	if machine.get("output",[]).size()>0:
		machine.state = "PAUSED_OUTPUT"
		return
	var recipe_id := str(machine.get("recipe",""))
	if recipe_id.is_empty():
		machine.state = "IDLE"
		return
	var recipe: Dictionary = GameData.recipe_definition(recipe_id)
	if recipe.is_empty() or recipe.machine!=machine.id:
		machine.state = "INVALID_RECIPE"
		return
	if recipe.has("story") and not bool(game.story_flags.get(str(recipe.story),false)):
		machine.state = "BLOCKED_STORY"
		return
	if int(recipe.get("supply_cap",0))>0:
		var output_id := str(recipe.outputs.keys()[0])
		var supply_key := "DORONUM_SUPPLY:"+output_id
		if int(game.story_flags.get(supply_key,0))>=int(recipe.supply_cap):
			machine.state = "SUPPLY_CAP_REACHED"
			return
	if not machine.get("job_started",false):
		if not _consume_machine_inputs(machine,recipe.inputs,bool(recipe.get("allow_synthetic",true))):
			machine.state = "WAITING_INPUT"
			return
		machine.job_started = true
		machine.progress = 0.0
		machine.temperature_quality_sum = 0.0
		machine.pressure_quality_sum = 0.0
		machine.condition_quality_sum = 0.0
		machine.progress_sample_seconds = 0.0
		machine.power_ratio_sum = 0.0
		machine.power_ratio_square_sum = 0.0
		machine.power_sample_count = 0
		machine.failure_exposure = 0.0
		machine.failure_rng_index = 0
		machine.state = "STARTING"
	if last_power_ratio<0.8:
		machine.state = "PAUSED_POWER"
		return
	machine.state = "RUNNING" if last_power_ratio>=1.0 else "BROWNOUT_RUNNING"
	var progress_ratio := minf(1.0,last_power_ratio)
	var condition_before_tick := clampf(float(machine.condition),0.0,100.0)
	var speed_multiplier := 0.8 if condition_before_tick<=10.0 else 1.0
	var target_temperature := float(recipe.get("temperature",20.0))
	var target_pressure := float(recipe.get("pressure",0.0))
	machine.temperature = move_toward(float(machine.temperature),target_temperature,float(recipe.get("heat_rate",120.0))*dt)
	machine.pressure = move_toward(float(machine.pressure),target_pressure,float(recipe.get("pressure_rate",50.0))*dt)
	var temp_tolerance := float(recipe.get("temperature_tolerance",0.1))
	var pressure_tolerance := float(recipe.get("pressure_tolerance",0.1))
	var temp_ok := target_temperature==0.0 or absf(float(machine.temperature)-target_temperature)<=maxf(5.0,absf(target_temperature)*temp_tolerance)
	var pressure_ok := target_pressure==0.0 or absf(float(machine.pressure)-target_pressure)<=maxf(1.0,absf(target_pressure)*pressure_tolerance)
	if not temp_ok or not pressure_ok:
		machine.state = "RAMPING"
		return
	var progress_delta := dt*progress_ratio*speed_multiplier
	machine.progress += progress_delta
	machine.temperature_quality_sum += _score_process_accuracy(float(machine.temperature),target_temperature,float(recipe.get("temperature_absolute_tolerance",1.0)))*progress_delta
	machine.pressure_quality_sum += _score_process_accuracy(float(machine.pressure),target_pressure,float(recipe.get("pressure_absolute_tolerance",1.0)))*progress_delta
	machine.condition_quality_sum += condition_before_tick*progress_delta
	machine.progress_sample_seconds += progress_delta
	machine.power_ratio_sum += progress_ratio
	machine.power_ratio_square_sum += progress_ratio*progress_ratio
	machine.power_sample_count += 1

	var temp_deviation := 0.0 if absf(target_temperature)<=0.0001 else absf(float(machine.temperature)-target_temperature)/absf(target_temperature)*100.0
	var pressure_deviation := 0.0 if absf(target_pressure)<=0.0001 else absf(float(machine.pressure)-target_pressure)/absf(target_pressure)*100.0
	var temperature_risk := clampf((temp_deviation-1.0)/9.0,0.0,1.0)
	var pressure_risk := clampf((pressure_deviation-1.0)/9.0,0.0,1.0)
	var power_risk := 1.0-progress_ratio
	var wear_risk := 1.0-condition_before_tick/100.0
	var load_ratio := float(machine.get("load_ratio",1.0))
	var load_risk := clampf(maxf(0.0,load_ratio-1.0),0.0,1.0)
	var profile: Dictionary = GameData.DEFAULT_MACHINE_FAILURE_PROFILE
	var hazard_multiplier := 1.0
	hazard_multiplier += temperature_risk*float(profile.temperature_weight)
	hazard_multiplier += pressure_risk*float(profile.pressure_weight)
	hazard_multiplier += power_risk*float(profile.power_weight)
	hazard_multiplier += wear_risk*float(profile.wear_weight)
	hazard_multiplier += load_risk*float(profile.load_weight)
	machine.hazard_multiplier = hazard_multiplier

	var stress_multiplier := hazard_multiplier
	var base_wear := float(recipe.get("base_wear_per_second",profile.base_wear_per_second))
	machine.condition = maxf(0.0,condition_before_tick-base_wear*dt*stress_multiplier)
	machine.failure_exposure = float(machine.get("failure_exposure",0.0))+dt
	machine.failure_rng_index = int(machine.get("failure_rng_index",0))+1
	var base_failure_probability := float(recipe.get("base_failure_probability",profile.base_failure_probability))
	var reference_duration := float(recipe.get("reference_duration_seconds",profile.reference_duration_seconds))
	var base_hazard_rate := -log(1.0-base_failure_probability)/reference_duration
	var failure_probability := 1.0-exp(-base_hazard_rate*hazard_multiplier*dt)
	var failure_roll := game._deterministic_unit(hash(str(machine.instance_id))+int(machine.failure_rng_index))
	if failure_roll<failure_probability:
		var severity_roll := game._deterministic_unit(hash(str(machine.instance_id))+int(machine.failure_rng_index)+900000)
		var minor_probability := float(profile.minor_probability)
		var major_probability := minor_probability+float(profile.major_probability)
		var severity := "FAILED_MINOR" if severity_roll<minor_probability else ("FAILED_MAJOR" if severity_roll<major_probability else "FAILED_CRITICAL")
		var cooldown_seconds := 2.0 if severity=="FAILED_MINOR" else (8.0 if severity=="FAILED_MAJOR" else 20.0)
		var condition_damage := 1.0 if severity=="FAILED_MINOR" else (8.0 if severity=="FAILED_MAJOR" else 20.0)
		var progress_loss := 0.5 if severity=="FAILED_MINOR" else (3.0 if severity=="FAILED_MAJOR" else 10.0)
		machine.failure_event_id = "MACHINE-FAIL-"+str(machine.instance_id)+"-"+str(machine.failure_rng_index)
		machine.failure_cooldown = cooldown_seconds
		machine.condition = maxf(0.0,float(machine.condition)-condition_damage)
		machine.progress = maxf(0.0,float(machine.progress)-progress_loss)
		machine.state = "BROKEN" if float(machine.condition)<=0.0 else severity
		game.notification.emit("설비 이상 · %s · %s · 진행도 %.1f초 후퇴 / Condition %.1f%%" % [str(machine.id),severity,progress_loss,float(machine.condition)])
		game.state_changed.emit()
		return
	if float(machine.condition)<=0.0:
		machine.state = "BROKEN"
		game.notification.emit("설비 파손 · %s · 정비가 필요해." % str(machine.id))
		return
	if machine.progress<float(recipe.seconds):
		return
	var material_quality := _calculate_material_quality(machine,recipe)
	var temp_quality := float(machine.temperature_quality_sum)/maxf(0.0001,float(machine.progress_sample_seconds))
	var pressure_quality := float(machine.pressure_quality_sum)/maxf(0.0001,float(machine.progress_sample_seconds))
	var condition_quality := float(machine.condition_quality_sum)/maxf(0.0001,float(machine.progress_sample_seconds))
	var power_stability := _calculate_power_stability(machine)
	var skill_quality_bonus := 2.0 if game.has_skill("RECIPE_DISCIPLINE") and bool(recipe.get("allow_skill_quality_bonus",false)) else 0.0
	var raw_quality := material_quality*0.40+temp_quality*0.20+pressure_quality*0.20+condition_quality*0.10+power_stability*0.10+float(recipe.get("quality_modifier",0.0))+skill_quality_bonus
	var quality := clampf(raw_quality-float(recipe.get("pollution_penalty",0.0)),0.0,100.0)
	var purity := _calculate_output_purity(machine,recipe)
	var synthetic := false
	for input_lot in machine.get("job_inputs",[]):
		synthetic = synthetic or bool(input_lot.synthetic)
	for output_id in recipe.outputs:
		if int(recipe.get("supply_cap",0))>0:
			var supply_key := "DORONUM_SUPPLY:"+str(output_id)
			game.story_flags[supply_key] = int(game.story_flags.get(supply_key,0))+int(recipe.outputs[output_id])
		machine.output.append({
			"stack_id":game._new_stack_id(),"item_id":output_id,"quantity":int(recipe.outputs[output_id]),
			"quality":quality,"purity":purity,"synthetic":synthetic,
			"provenance":"MACHINE:"+str(machine.instance_id)+":"+recipe_id
		})
	machine.state = "PAUSED_OUTPUT"
	machine.progress = 0.0
	machine.job_started = false
	machine.job_inputs = []
	machine.cycles = int(machine.get("cycles",0))+1
	game.claim_recipe_research_reward(recipe_id)
	game.production_history.append({"machine":machine.instance_id,"recipe":recipe_id,"tick":tick_number})
	if game.production_history.size()>1000:
		game.production_history.pop_front()
	game.state_changed.emit()

func _consume_machine_inputs(machine: Dictionary, inputs: Dictionary, allow_synthetic: bool = true) -> bool:
	var buffer_snapshot: Array = machine.input.duplicate(true)
	var inventory_snapshot: Array[Dictionary] = game.inventory.duplicate(true)
	var consumed: Array[Dictionary] = []
	for item_id in inputs:
		var remaining := int(inputs[item_id])
		for stack in machine.input:
			if stack.item_id != item_id or remaining <= 0 or (not allow_synthetic and bool(stack.synthetic)):
				continue
			var take := mini(remaining,int(stack.quantity))
			if take <= 0:
				continue
			var lot: Dictionary = stack.duplicate(true)
			lot.quantity = take
			consumed.append(lot)
			stack.quantity -= take
			remaining -= take
		machine.input = machine.input.filter(func(s): return int(s.quantity)>0)
		if remaining > 0:
			var inventory_lots: Array[Dictionary] = game.consume_items_with_lots({item_id:remaining},allow_synthetic)
			if inventory_lots.is_empty():
				machine.input = buffer_snapshot
				game.inventory = inventory_snapshot
				return false
			consumed.append_array(inventory_lots)
	machine.job_inputs = consumed
	return true

func _score_process_accuracy(actual: float,target: float,absolute_tolerance: float = 1.0) -> float:
	var deviation := 0.0
	if absf(target)<=0.0001:
		if not is_finite(absolute_tolerance) or absolute_tolerance<=0.0:
			return 0.0
		deviation = absf(actual-target)/absolute_tolerance
	else:
		deviation = absf(actual-target)/absf(target)*100.0
	if deviation <= 1.0: return 100.0
	if deviation <= 3.0: return 95.0
	if deviation <= 5.0: return 85.0
	if deviation <= 10.0: return 70.0
	return 50.0

func _calculate_material_quality(machine: Dictionary, recipe: Dictionary) -> float:
	var total := 0.0
	var weight_sum := 0.0
	var weights: Dictionary = recipe.get("material_weights",{})
	for stack in machine.get("job_inputs",[]):
		var weight := float(weights.get(stack.item_id,1.0))
		total += float(stack.quality)*int(stack.quantity)*weight
		weight_sum += int(stack.quantity)*weight
	if weight_sum <= 0.0:
		return float(recipe.get("base_material_quality",0.0))
	return total/weight_sum

func _calculate_output_purity(machine: Dictionary, recipe: Dictionary) -> float:
	var total := 0.0
	var weight_sum := 0.0
	var weights: Dictionary = recipe.get("purity_weights",{})
	for stack in machine.get("job_inputs",[]):
		var weight := float(weights.get(stack.item_id,1.0))
		total += float(stack.purity)*int(stack.quantity)*weight
		weight_sum += int(stack.quantity)*weight
	if weight_sum <= 0.0:
		return float(recipe.get("base_output_purity",0.0))
	return clampf(total/weight_sum-float(recipe.get("purity_loss",0.0))+float(recipe.get("purification_bonus",0.0))+float(recipe.get("output_purity_modifier",0.0)),0.0,100.0)

func _calculate_power_stability(machine: Dictionary) -> float:
	var count := int(machine.get("power_sample_count",0))
	if count <= 0:
		return 100.0
	var mean := float(machine.get("power_ratio_sum",0.0))/count
	var mean_square := float(machine.get("power_ratio_square_sum",0.0))/count
	var deviation := sqrt(maxf(0.0,mean_square-mean*mean))
	return clampf(100.0*mean-50.0*deviation,0.0,100.0)

func _tick_auto_miner(machine: Dictionary, dt: float) -> void:
	if not machine.output.is_empty():
		machine.state = "PAUSED_OUTPUT"
		return
	if last_power_ratio < 0.8:
		machine.state = "PAUSED_POWER"
		return
	if world == null:
		machine.state = "WAITING_WORLD"
		return
	var target: Area3D = null
	var target_id := str(machine.get("target",""))
	for node in world.resources:
		if not is_instance_valid(node) or int(node.get_meta("quantity",0)) <= 0:
			continue
		if str(node.get_meta("node_id","")) == target_id:
			target = node
			break
	if target == null:
		var candidates: Array[Area3D] = []
		for node in world.resources:
			if not is_instance_valid(node) or int(node.get_meta("quantity",0)) <= 0:
				continue
			var item_id := str(node.get_meta("resource_id",""))
			if item_id not in ["ITEM_IRON_ORE","ITEM_COPPER_ORE","ITEM_COAL","ITEM_QUARTZ","ITEM_GOLD_ORE","ITEM_DIAMOND","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE","ITEM_MAGNETITE"]:
				continue
			candidates.append(node)
		candidates.sort_custom(func(a,b):
			return a.global_position.distance_squared_to(machine.position) < b.global_position.distance_squared_to(machine.position)
		)
		if not candidates.is_empty():
			target = candidates[0]
			machine.target = str(target.get_meta("node_id",""))
	if target == null:
		machine.state = "WAITING_ORE"
		return
	machine.mining_progress = float(machine.get("mining_progress",0.0)) + dt * minf(1.0,last_power_ratio)
	machine.state = "MINING"
	if machine.mining_progress < 8.0:
		return
	machine.mining_progress = 0.0
	var item_id := str(target.get_meta("resource_id"))
	var remaining := int(target.get_meta("quantity",0))
	var stack := {
		"item_id":item_id,"quantity":1,"quality":float(target.get_meta("quality",90.0)),
		"purity":float(target.get_meta("purity",90.0)),"synthetic":false,
		"provenance":"AUTO_MINER:"+str(target.get_meta("node_id"))
	}
	machine.output.append(stack)
	var byproduct_chance := 0.05+(0.02 if game.has_skill("VEIN_EFFICIENCY") else 0.0)
	if game._deterministic_unit(int(game.world_seed+hash(str(target.get_meta("node_id","")))+remaining))<byproduct_chance:
		machine.output.append({"item_id":"ITEM_MINERAL_RESIDUE","quantity":1,"quality":float(stack.quality),"purity":float(stack.purity),"synthetic":false,"provenance":"AUTO_MINER_BYPRODUCT:"+str(target.get_meta("node_id",""))})
	target.set_meta("quantity",remaining-1)
	game.resource_depletion[str(target.get_meta("node_id",""))] = remaining-1
	game.discover_resource(str(target.get_meta("node_id")),item_id)
	if remaining-1 <= 0:
		target.queue_free()
	machine.cycles = int(machine.get("cycles",0))+1
	game.story_flags["AUTOMATION_CYCLES"] = int(game.story_flags.get("AUTOMATION_CYCLES",0))+1
	machine.state = "PAUSED_OUTPUT"

func _tick_water_pump(machine: Dictionary, dt: float) -> void:
	if not machine.output.is_empty():
		machine.state = "PAUSED_OUTPUT"
		return
	if last_power_ratio < 0.8 or world == null:
		machine.state = "PAUSED_POWER"
		return
	var water_node: Area3D = null
	for node in world.resources:
		if is_instance_valid(node) and node.get_meta("resource_id","")=="ITEM_WATER" and int(node.get_meta("quantity",0))>=2:
			if node.global_position.distance_to(machine.position) <= 24.0:
				water_node = node
				break
	if water_node == null:
		machine.state = "WAITING_WATER_SOURCE"
		return
	machine.progress = float(machine.get("progress",0.0))+dt*minf(1.0,last_power_ratio)
	machine.state = "PUMPING"
	if machine.progress < 5.0:
		return
	machine.progress = 0.0
	water_node.set_meta("quantity",int(water_node.get_meta("quantity"))-2)
	machine.output.append({"item_id":"ITEM_WATER","quantity":2,"quality":100.0,"purity":100.0,"synthetic":false,"provenance":"WATER_PUMP:"+str(machine.instance_id)})
	machine.state = "PAUSED_OUTPUT"

func _tick_dori_harvester(machine: Dictionary, dt: float) -> void:
	if not machine.output.is_empty():
		machine.state = "PAUSED_OUTPUT"
		return
	if last_power_ratio < 0.8 or world == null:
		machine.state = "PAUSED_POWER"
		return
	var tree: Area3D = null
	var target_id := str(machine.get("target",""))
	for candidate in world.dori_trees:
		if not is_instance_valid(candidate):
			continue
		if str(candidate.get_meta("node_id","")) == target_id:
			tree = candidate
			break
	if tree == null:
		var trees := world.dori_trees.filter(func(t): return is_instance_valid(t))
		trees.sort_custom(func(a,b):
			return a.global_position.distance_squared_to(machine.position) < b.global_position.distance_squared_to(machine.position)
		)
		if not trees.is_empty():
			tree = trees[0]
			machine.target = str(tree.get_meta("node_id",""))
	if tree == null:
		machine.state = "WAITING_TREE"
		return
	if bool(tree.get_meta("mature",false)):
		machine.output.append({"item_id":"ITEM_DORI_MEAT","quantity":1,"quality":92.0,"purity":float(tree.get_meta("purity",90.0)),"synthetic":false,"provenance":"DORI_TREE:"+str(tree.get_meta("node_id"))})
		tree.set_meta("mature",false)
		tree.set_meta("growth",0.0)
		tree.set_meta("water",0.0)
		tree.set_meta("cycle",int(tree.get_meta("cycle",0))+1)
		machine.state = "PAUSED_OUTPUT"
		game.story_flags["DORI_MEAT_DISCOVERED"] = true
		return
	if float(tree.get_meta("water",0.0)) < 2.0:
		if not _consume_machine_inputs(machine,{"ITEM_WATER":2}):
			machine.state = "WAITING_WATER"
			return
		tree.set_meta("water",2.0)
		tree.set_meta("growth",0.0)
	machine.state = "GROWING_TREE"

func _tick_conveyors(dt: float) -> void:
	for belt in game.buildings:
		if belt.id != "CONVEYOR":
			continue
		if belt.get("payload",{}).is_empty():
			var sources: Array[Dictionary] = []
			for source in game.buildings:
				if source.instance_id == belt.instance_id or source.output.is_empty():
					continue
				if Vector2(source.position.x,source.position.z).distance_to(Vector2(belt.position.x,belt.position.z)) <= 5.0:
					sources.append(source)
			sources.sort_custom(func(a,b):
				return Vector2(a.position.x,a.position.z).distance_squared_to(Vector2(belt.position.x,belt.position.z)) < Vector2(b.position.x,b.position.z).distance_squared_to(Vector2(belt.position.x,belt.position.z))
			)
			if not sources.is_empty():
				var source: Dictionary = sources[0]
				belt.payload = source.output.pop_front()
				belt.source = source.instance_id
				belt.state = "TRANSPORTING"
		if belt.get("payload",{}).is_empty():
			continue
		belt.transfer_progress = float(belt.get("transfer_progress",0.0))+dt
		if belt.transfer_progress < 1.0:
			continue
		var payload: Dictionary = belt.payload
		var target_id := str(belt.get("target",""))
		var target: Dictionary = {}
		if not target_id.is_empty():
			for candidate in game.buildings:
				if candidate.instance_id == target_id:
					target = candidate
					break
		if target.is_empty():
			var candidates: Array[Dictionary] = []
			for candidate in game.buildings:
				if candidate.instance_id == belt.instance_id or candidate.instance_id == str(belt.get("source","")):
					continue
				if Vector2(candidate.position.x,candidate.position.z).distance_to(Vector2(belt.position.x,belt.position.z)) > 6.0:
					continue
				if candidate.id == "WAREHOUSE":
					candidates.append(candidate)
					continue
				var recipe: Dictionary = GameData.recipe_definition(str(candidate.get("recipe","")))
				if recipe.get("inputs",{}).has(str(payload.item_id)):
					candidates.append(candidate)
			candidates.sort_custom(func(a,b):
				return Vector2(a.position.x,a.position.z).distance_squared_to(Vector2(belt.position.x,belt.position.z)) < Vector2(b.position.x,b.position.z).distance_squared_to(Vector2(belt.position.x,belt.position.z))
			)
			if not candidates.is_empty():
				target = candidates[0]
		if target.is_empty():
			belt.state = "JAMMED_NO_ROUTE"
			continue
		if target.id=="WAREHOUSE":
			var warehouse_storage: Array = target.get("storage",[])
			if warehouse_storage.size()>=100:
				belt.state = "JAMMED_TARGET_FULL"
				continue
			warehouse_storage.append(payload.duplicate(true))
			target.storage = warehouse_storage
		else:
			if target.input.size()>=24:
				belt.state = "JAMMED_TARGET_FULL"
				continue
			target.input.append(payload.duplicate(true))
		belt.payload = {}
		belt.transfer_progress = 0.0
		belt.state = "IDLE"
