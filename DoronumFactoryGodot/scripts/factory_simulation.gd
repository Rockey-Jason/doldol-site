extends Node
class_name FactorySimulation

var game: GameState
var last_power_ratio := 1.0
var total_generation := 0.0
var total_consumption := 0.0
var tick_number := 0

func bind_state(state: GameState) -> void:
	game = state

func tick(dt: float) -> void:
	if game == null:
		return
	tick_number += 1
	total_generation = 250.0
	total_consumption = 0.0
	for machine in game.buildings:
		match machine.id:
			"GENERATOR": total_generation += 250.0
			"SOLAR_PANEL": total_generation += 80.0
			"WIND_TURBINE": total_generation += 100.0
	for machine in game.buildings:
		if machine.id == "RESEARCH_LAB" and not game.active_research.is_empty():
			total_consumption += 25.0
		elif machine.id == "INFINITY_FUSION_MACHINE" and not game.fusion.is_empty():
			total_consumption += float(GameData.FUSION_STAGES[int(game.fusion.stage)].power)
		elif not str(machine.get("recipe", "")).is_empty():
			var recipe: Dictionary = GameData.recipe_definition(machine.recipe, {})
			total_consumption += float(recipe.get("power", 10.0))
	game.total_power_generated = total_generation
	game.total_power_used = total_consumption
	last_power_ratio = 1.0 if total_consumption <= 0.0 else minf(1.0, total_generation / total_consumption)
	for machine in game.buildings:
		_tick_machine(machine, dt)
	_tick_conveyors(dt)
	if tick_number % 50 == 0:
		game.save_game()

func _tick_machine(machine: Dictionary, dt: float) -> void:
	if machine.id in ["GENERATOR", "SOLAR_PANEL", "WIND_TURBINE", "CONVEYOR", "WAREHOUSE", "STABILIZATION_RELAY", "STABILIZATION_CORE"]:
		return
	if machine.get("output", []).size() > 0:
		machine.state = "PAUSED_OUTPUT"
		return
	var recipe_id := str(machine.get("recipe", ""))
	if recipe_id.is_empty():
		machine.state = "IDLE"
		return
	var recipe: Dictionary = GameData.recipe_definition(recipe_id, {})
	if recipe.is_empty() or recipe.machine != machine.id:
		machine.state = "INVALID_RECIPE"
		return
	if not machine.get("job_started", false):
		if not game.can_afford(recipe.inputs):
			machine.state = "WAITING_INPUT"
			return
		if not game.consume_items(recipe.inputs):
			machine.state = "WAITING_INPUT"
			return
		machine.job_started = true
		machine.progress = 0.0
		machine.state = "STARTING"
	if last_power_ratio < 0.8:
		machine.state = "PAUSED_POWER"
		return
	machine.state = "RUNNING" if last_power_ratio >= 1.0 else "BROWNOUT_RUNNING"
	var progress_ratio := minf(1.0, last_power_ratio)
	machine.progress += dt * progress_ratio
	var target_temperature := float(recipe.get("temperature", 20.0))
	var target_pressure := float(recipe.get("pressure", 0.0))
	machine.temperature = move_toward(float(machine.temperature), target_temperature, float(recipe.get("heat_rate", 120.0)) * dt)
	machine.pressure = move_toward(float(machine.pressure), target_pressure, float(recipe.get("pressure_rate", 50.0)) * dt)
	var temp_tolerance := float(recipe.get("temperature_tolerance", 0.1))
	var pressure_tolerance := float(recipe.get("pressure_tolerance", 0.1))
	var temp_ok := absf(float(machine.temperature) - target_temperature) <= maxf(5.0, absf(target_temperature) * temp_tolerance)
	var pressure_ok := absf(float(machine.pressure) - target_pressure) <= maxf(1.0, absf(target_pressure) * pressure_tolerance)
	if not temp_ok or not pressure_ok:
		machine.state = "RAMPING"
		return
	if machine.progress < float(recipe.seconds):
		return
	var q := 90.0
	var p := 90.0
	var synthetic := false
	for output_id in recipe.outputs:
		machine.output.append({
			"item_id":output_id,"quantity":int(recipe.outputs[output_id]),
			"quality":q,"purity":p,"synthetic":synthetic,
			"provenance":"MACHINE:"+str(machine.instance_id)+":"+recipe_id
		})
	machine.state = "PAUSED_OUTPUT"
	machine.progress = 0.0
	machine.job_started = false
	game.production_history.append({"machine":machine.instance_id,"recipe":recipe_id,"tick":tick_number})
	if game.production_history.size() > 1000:
		game.production_history.pop_front()
	game.state_changed.emit()

func _tick_conveyors(dt: float) -> void:
	for belt in game.buildings:
		if belt.id != "CONVEYOR":
			continue
		if belt.get("payload", {}).is_empty():
			continue
		belt.transfer_progress = float(belt.get("transfer_progress", 0.0)) + dt
		if belt.transfer_progress < 1.0:
			continue
		var target_id := str(belt.get("target", ""))
		for target in game.buildings:
			if target.instance_id != target_id:
				continue
			if target.output.size() < int(target.get("buffer_limit", 1)):
				target.output.append(belt.payload.duplicate(true))
				belt.payload = {}
				belt.transfer_progress = 0.0
			break
