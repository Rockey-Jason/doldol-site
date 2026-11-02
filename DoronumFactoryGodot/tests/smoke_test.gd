extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var data_errors := GameData.validate_canonical_data()
	if not data_errors.is_empty():
		for error in data_errors:
			push_error("CANONICAL DATA · "+error)
	assert(data_errors.is_empty(),"Canonical data validator must pass")

	var expected_ids := [
		"ITEM_DORONUM_NORMAL","ITEM_DORONUM_YELLOW","ITEM_DORONUM_ULTRA",
		"ITEM_DORONUM_BLUE","ITEM_DORONUM_RED","ITEM_DORONUM_IRON",
		"ITEM_DORONUM_ORANGE","ITEM_DORONUM_SLIGHTLY_RUSTED","ITEM_DORONUM_RUSTED",
		"ITEM_DORONUM_TRANSLUCENT","ITEM_DORONUM_THERMAL_CRYSTAL",
		"ITEM_DORONUM_COLD_CRYSTAL","ITEM_DORONUM_BLACK",
		"ITEM_DORONUM_SPECIAL_EDITION","ITEM_DORONUM_LIMITED_EDITION"
	]
	assert(GameData.DORONUM_IDS==expected_ids,"Canonical 15-item Infinity manifest mismatch")
	assert(GameData.RESEARCH.size()==18,"Research count must remain exactly 18")
	assert(GameData.SKILLS.size()==20,"Skill tree must contain exactly 20 nodes")
	assert(GameData.VARIANT_RECIPES.size()==14,"There must be fourteen Doronum variants beyond Normal")
	assert(GameData.FUSION_STAGES.size()==7,"Infinity Fusion must have seven stages")
	var ideal_seconds := 0.0
	for stage in GameData.FUSION_STAGES:
		ideal_seconds += float(stage.seconds)
	assert(is_equal_approx(ideal_seconds,260.0),"Ideal fusion process must total 260 seconds")
	assert(is_equal_approx(GameData.WORLD_SIZE,2048.0),"World dimensions must be 2048m square")
	assert(GameData.recipe_definition("RECIPE_DORONUM_NORMAL").allow_synthetic==false,"Synthetic Dori Meat must be rejected")

	var simulation := FactorySimulation.new()
	assert(is_equal_approx(simulation._score_process_accuracy(101.0,100.0),100.0),"Temperature/pressure score 1% boundary")
	assert(is_equal_approx(simulation._score_process_accuracy(103.0,100.0),95.0),"Temperature/pressure score 3% boundary")
	assert(is_equal_approx(simulation._score_process_accuracy(105.0,100.0),85.0),"Temperature/pressure score 5% boundary")
	assert(is_equal_approx(simulation._score_process_accuracy(110.0,100.0),70.0),"Temperature/pressure score 10% boundary")
	assert(is_equal_approx(simulation._score_process_accuracy(120.0,100.0),50.0),"Safe-band score above 10%")
	assert(is_equal_approx(simulation._score_process_accuracy(1.0,0.0,1.0),100.0),"Zero-target absolute tolerance")
	assert(is_equal_approx(simulation._score_process_accuracy(3.0,0.0,1.0),95.0),"Zero-target 3x tolerance")
	assert(is_equal_approx(simulation._score_process_accuracy(5.0,0.0,1.0),85.0),"Zero-target 5x tolerance")
	assert(is_equal_approx(simulation._score_process_accuracy(10.0,0.0,1.0),70.0),"Zero-target 10x tolerance")
	assert(is_equal_approx(simulation._score_process_accuracy(15.0,0.0,1.0),50.0),"Zero-target safe band")
	assert(is_equal_approx(FactorySimulation.calculate_progress_delta(0.1,0.7999),0.0),"Power below 0.80 must pause production")
	assert(is_equal_approx(FactorySimulation.calculate_progress_delta(0.1,0.80),0.08),"Power 0.80 must progress proportionally")
	assert(is_equal_approx(FactorySimulation.calculate_progress_delta(0.1,0.9999),0.09999),"Brownout progress must remain proportional")
	assert(is_equal_approx(FactorySimulation.calculate_progress_delta(0.1,1.0),0.1),"Power 1.0 must progress at full rate")
	assert(is_equal_approx(FactorySimulation.calculate_progress_delta(0.1,1.5),0.1),"Power ratio must cap at 1.0")

	var state := GameState.new()
	state.save_blocked = true
	state.simulation_paused = true
	state.add_item("ITEM_GRASS",3,92.0,90.0,false,"TEST_MANUAL_CRAFT")
	assert(state.craft_manual("RECIPE_GRASS_TO_FIBER"),"Manual craft should succeed with valid declared profile")
	var fiber_stack: Dictionary = state.inventory.filter(func(stack): return stack.item_id=="ITEM_PLANT_FIBER")[0]
	assert(is_equal_approx(float(fiber_stack.quality),96.8),"Manual Quality must use the weighted quality formula")
	assert(is_equal_approx(float(fiber_stack.purity),90.0),"Manual Purity must use the independent weighted input formula")

	state.add_item("ITEM_WOOD",1,90.0,90.0,false,"TEST_ATOMIC")
	var failed_transaction: Array[Dictionary] = state.consume_items_with_lots({"ITEM_WOOD":1,"ITEM_STONE":1},true)
	assert(failed_transaction.is_empty(),"Failed multi-item transaction must return no lots")
	assert(state.count_item("ITEM_WOOD")==1,"Failed multi-item transaction must restore all input quantities")

	var duplicate_payload := {
		"inventory":[{"stack_id":"STACK-DUPLICATE","item_id":"ITEM_WOOD","quantity":1,"quality":90.0,"purity":90.0,"synthetic":false}],
		"buildings":[{"id":"WAREHOUSE","instance_id":"WH-TEST","storage":[{"stack_id":"STACK-DUPLICATE","item_id":"ITEM_STONE","quantity":1,"quality":90.0,"purity":90.0,"synthetic":false}]}]
	}
	var duplicate_errors := state.validate_save_payload(duplicate_payload)
	assert(not duplicate_errors.is_empty(),"Duplicate StackID across owners must fail validation")

	var old_payload := {
		"version":2,"world_seed":GameData.WORLD_SEED,"next_stack_id":1,
		"buildings":[{"id":"WAREHOUSE","instance_id":"WH-MIGRATION","input":[{"item_id":"ITEM_WOOD","quantity":1,"quality":90.0,"purity":90.0,"synthetic":false}]}]
	}
	var migrated := state._migrate_save_payload(old_payload,2)
	assert(int(migrated.version)==GameData.SAVE_VERSION,"Legacy save should migrate to current schema")
	assert(migrated.buildings[0].has("storage"),"Migrated warehouse must gain a storage owner")
	assert(not str(migrated.buildings[0].input[0].stack_id).is_empty(),"Migrated machine lots need stable StackIDs")

	var backlog_state := GameState.new()
	backlog_state.save_blocked = true
	var backlog_simulation := FactorySimulation.new()
	backlog_simulation.bind_state(backlog_state,null)
	backlog_simulation.tick(2.0)
	assert(backlog_simulation.tick_number==10,"Catch-up is capped at ten fixed ticks per rendered frame")
	assert(backlog_simulation.accumulator>=0.99,"Unprocessed catch-up backlog must not be silently discarded")

	var fusion_state := GameState.new()
	fusion_state.save_blocked = true
	fusion_state.simulation_paused = true
	fusion_state.research_completed.append("RESEARCH_INFINITY_INDUSTRY")
	fusion_state.story_flags["STORY_INCIDENT_RECONSTRUCTED"] = true
	fusion_state.story_flags["ORBIT_04"] = true
	fusion_state.story_flags["ARCHIVE_RESTORED"] = true
	fusion_state.story_flags["COOLING_CORE_RESTORED"] = true
	fusion_state.story_flags["RESONANCE_CHAMBER_RESTORED"] = true
	for key in fusion_state.fusion_diagnostics:
		fusion_state.fusion_diagnostics[key] = true
	fusion_state.power_state["fusion_buffer_kwh"] = 400.0
	for building_id in ["INFINITY_FUSION_MACHINE","FUSION_POWER_BUFFER","FUSION_CONTAINMENT_SHIELD","EMERGENCY_COOLING_SYSTEM","PRESSURE_CALIBRATION_RIG","COOLING_STABILIZER"]:
		fusion_state.buildings.append({
			"id":building_id,"instance_id":"TEST-"+building_id,"condition":100.0,
			"position":Vector3.ZERO,"input":[],"output":[],"storage":[],"state":"IDLE"
		})
	for item_id in GameData.DORONUM_IDS:
		fusion_state.add_item(item_id,100,90.0,90.0,false,"TEST_NATURAL")
	assert(fusion_state.fusion_preflight().is_empty(),"A valid 15x100 manifest must pass preflight")
	assert(fusion_state.start_infinity_fusion(),"Valid fusion must start")
	for item_id in GameData.DORONUM_IDS:
		assert(fusion_state.count_item(item_id)==0,"All 1500 units must move into job custody")
	assert(fusion_state.fusion.custody.size()==15,"Fusion custody must own exactly fifteen input lots")
	assert(fusion_state._fusion_job_validation_errors().is_empty(),"Persisted manifest and custody must match exactly")
	var original_manifest: Array = fusion_state.fusion.manifest.duplicate(true)
	fusion_state.fusion.manifest[0].quantity = 99
	assert(not fusion_state._fusion_job_validation_errors().is_empty(),"Tampered manifest must fail its checksum")
	fusion_state._tick_fusion(0.1)
	assert(fusion_state.fusion.state=="ERROR_INVALID_MANIFEST","Tampered manifest must block fusion production")
	fusion_state.fusion.manifest = original_manifest
	fusion_state.fusion.state = "RUNNING"
	fusion_state.fusion.state = "FAILED_MINOR"
	assert(fusion_state.recover_fusion_failure(),"Failure recovery must return escrow")
	for item_id in GameData.DORONUM_IDS:
		assert(fusion_state.count_item(item_id)==100,"Recovery must restore exact quantities")
	var normal_stack: Dictionary = fusion_state.inventory.filter(func(stack): return stack.item_id==GameData.DORONUM_IDS[0])[0]
	normal_stack.quality = 89.99
	assert(not fusion_state.fusion_preflight().is_empty(),"89.99 Quality must fail preflight")
	normal_stack.quality = 90.0
	assert(fusion_state.fusion_preflight().is_empty(),"90.00 Quality must pass preflight")
	assert(fusion_state.start_infinity_fusion(),"A recovered job may be restarted")
	var completed_job_id := str(fusion_state.fusion.job_id)
	fusion_state.fusion.stage = 7
	fusion_state.fusion.output_committed = true
	fusion_state.fusion.state = "COMPLETED"
	fusion_state.fusion.custody = []
	fusion_state.fusion.reserved_inputs = 0
	fusion_state.fusion.output_buffer = {
		"stack_id":"STACK-TEST-INFINITY","item_id":"ITEM_DORONUM_INFINITY","quantity":1,
		"quality":95.0,"purity":95.0,"synthetic":false,"provenance":"TEST_FUSION"
	}
	fusion_state._event_ids["FUSION_OUTPUT:"+completed_job_id] = true
	assert(fusion_state._fusion_job_validation_errors().is_empty(),"Single committed Infinity output must pass integrity validation")
	assert(fusion_state.collect_infinity_output(),"Infinity output should collect once")
	assert(not fusion_state.collect_infinity_output(),"Infinity output must not collect twice")
	assert(fusion_state.count_item("ITEM_DORONUM_INFINITY")==1,"Exactly one Infinity item should be owned after collection")
	assert(fusion_state._fusion_job_validation_errors().is_empty(),"Collected output must retain a valid one-time event ledger")
	print("DORONUM FACTORY SMOKE TESTS: PASS")
	quit(0)
