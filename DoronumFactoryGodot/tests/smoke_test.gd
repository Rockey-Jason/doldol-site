extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var expected_ids := [
		"ITEM_DORONUM_NORMAL","ITEM_DORONUM_YELLOW","ITEM_DORONUM_ULTRA",
		"ITEM_DORONUM_BLUE","ITEM_DORONUM_RED","ITEM_DORONUM_IRON",
		"ITEM_DORONUM_ORANGE","ITEM_DORONUM_SLIGHTLY_RUSTED","ITEM_DORONUM_RUSTED",
		"ITEM_DORONUM_TRANSLUCENT","ITEM_DORONUM_THERMAL_CRYSTAL",
		"ITEM_DORONUM_COLD_CRYSTAL","ITEM_DORONUM_BLACK",
		"ITEM_DORONUM_SPECIAL_EDITION","ITEM_DORONUM_LIMITED_EDITION"
	]
	assert(GameData.DORONUM_IDS == expected_ids,"Canonical 15-item Infinity manifest mismatch")
	assert(GameData.RESEARCH.size() == 18,"Research count must remain exactly 18")
	assert(GameData.FUSION_STAGES.size() == 7,"Infinity Fusion must have seven stages")
	var ideal_seconds := 0.0
	for stage in GameData.FUSION_STAGES:
		ideal_seconds += float(stage.seconds)
	assert(is_equal_approx(ideal_seconds,260.0),"Ideal fusion process must total 260 seconds")
	assert(is_equal_approx(GameData.WORLD_SIZE,2048.0),"World dimensions must be 2048m square")
	assert(GameData.recipe_definition("RECIPE_DORONUM_NORMAL").allow_synthetic == false,"Synthetic Dori Meat must be rejected")
	var state := GameState.new()
	root.add_child(state)
	state.simulation_paused = true
	state.research_completed.append("RESEARCH_INFINITY_INDUSTRY")
	state.story_flags["STORY_INCIDENT_RECONSTRUCTED"] = true
	state.story_flags["ORBIT_04"] = true
	state.story_flags["ARCHIVE_RESTORED"] = true
	state.story_flags["COOLING_CORE_RESTORED"] = true
	state.story_flags["RESONANCE_CHAMBER_RESTORED"] = true
	for key in state.fusion_diagnostics:
		state.fusion_diagnostics[key] = true
	state.buildings.append({
		"id":"INFINITY_FUSION_MACHINE","instance_id":"TEST-FUSION","condition":100.0,
		"position":Vector3.ZERO,"input":[],"output":[],"state":"IDLE"
	})
	for item_id in GameData.DORONUM_IDS:
		state.add_item(item_id,100,90.0,90.0,false,"TEST_NATURAL")
	assert(state.fusion_preflight().is_empty(),"A valid 15x100 manifest must pass preflight")
	assert(state.start_infinity_fusion(),"Valid fusion must start")
	for item_id in GameData.DORONUM_IDS:
		assert(state.count_item(item_id)==0,"All 1500 units must move into job custody")
	state.fusion.state = "FAILED_MINOR"
	assert(state.recover_fusion_failure(),"Failure recovery must return escrow")
	for item_id in GameData.DORONUM_IDS:
		assert(state.count_item(item_id)==100,"Recovery must restore exact quantities")
	for stack in state.inventory:
		if stack.item_id == GameData.DORONUM_IDS[0]:
			stack.quality = 89.99
			break
	assert(not state.fusion_preflight().is_empty(),"89.99 Quality must fail preflight")
	print("DORONUM FACTORY SMOKE TESTS: PASS")
	quit(0)
