extends Node3D

var game: GameState
var world: PlanetWorld
var player: PlayerController
var simulation: FactorySimulation
var hud: GameUI
var selected_building := ""
var build_mode := false
var machine_visuals: Dictionary = {}
var elapsed := 0.0
var next_mining_time := 0.0

func _ready() -> void:
	_setup_input()
	_setup_environment()
	game = GameState.new()
	game.name = "GameState"
	add_child(game)
	world = PlanetWorld.new()
	world.name = "Planet"
	add_child(world)
	world.generate(game.world_seed)
	game.apply_world_state(world)
	simulation = FactorySimulation.new()
	simulation.name = "FactorySimulation"
	simulation.bind_state(game,world)
	add_child(simulation)
	player = PlayerController.new()
	player.name = "Player"
	add_child(player)
	player.global_position = game.player_position if game.player_position.length() > 0.1 else Vector3(0,height_at(0,0)+1.2,0)
	if game.has_skill("FIELD_SURVEYOR"):
		player.interaction_range *= 1.10
	player.interact_requested.connect(_on_player_interact)
	hud = GameUI.new()
	hud.name = "HUD"
	add_child(hud)
	hud.setup(game,self)
	hud.build_selected.connect(_select_building)
	for building in game.buildings:
		_spawn_building_visual(building)
	game.ending_started.connect(_play_ending)
	game.notification.emit("ORBIT online · Recovery engineer detected.")
	_update_tree_visuals()

func _setup_input() -> void:
	_add_key_action("move_forward",KEY_W)
	_add_key_action("move_back",KEY_S)
	_add_key_action("move_left",KEY_A)
	_add_key_action("move_right",KEY_D)
	_add_key_action("jump",KEY_SPACE)
	_add_key_action("sprint",KEY_SHIFT)
	_add_key_action("interact",KEY_E)
	_add_key_action("build_mode",KEY_B)
	_add_key_action("inventory",KEY_I)
	_add_key_action("factory_overview",KEY_F)
	_add_key_action("pause_game",KEY_ESCAPE)

func _add_key_action(action: String, key: Key) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	var event := InputEventKey.new()
	event.physical_keycode = key
	if not InputMap.action_has_event(action,event):
		InputMap.action_add_event(action,event)

func _setup_environment() -> void:
	var environment := Environment.new()
	environment.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.015,0.045,0.105)
	sky_material.sky_horizon_color = Color(0.16,0.26,0.37)
	sky_material.ground_bottom_color = Color(0.025,0.045,0.07)
	sky_material.ground_horizon_color = Color(0.15,0.19,0.22)
	sky.sky_material = sky_material
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.ambient_light_energy = 0.55
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.glow_enabled = true
	environment.glow_intensity = 0.55
	environment.glow_strength = 0.65
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.22,0.32,0.42)
	environment.fog_density = 0.0012
	var world_environment := WorldEnvironment.new()
	world_environment.environment = environment
	add_child(world_environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-48,-32,0)
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 180.0
	add_child(sun)

func _sync_building_visuals() -> void:
	for building in game.buildings:
		var instance_id := str(building.get("instance_id",""))
		if not machine_visuals.has(instance_id):
			_spawn_building_visual(building)

func _process(delta: float) -> void:
	_sync_building_visuals()
	elapsed += delta
	if simulation != null:
		simulation.tick(delta)
	if world != null and int(elapsed*2.0) != int((elapsed-delta)*2.0):
		_update_tree_visuals()
	if player != null:
		game.player_position = player.global_position
		if game.has_skill("FIELD_SURVEYOR"):
			player.interaction_range = 5.5
	_animate_buildings(delta)
	_update_story_progress()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_B:
				build_mode = not build_mode
				hud.set_build_mode(build_mode,selected_building)
				if build_mode and selected_building.is_empty():
					hud.open_tab("BUILD")
			KEY_I:
				hud.open_tab("INVENTORY")
			KEY_F:
				hud.open_tab("FACTORY")
			KEY_H:
				hud.toggle_panel()
			KEY_ESCAPE:
				if game.fusion.is_empty():
					game.simulation_paused = not game.simulation_paused
					game.notification.emit("일시 정지" if game.simulation_paused else "시뮬레이션 재개")
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if build_mode and not selected_building.is_empty() and Input.mouse_mode == Input.MOUSE_MODE_VISIBLE:
			_try_place_building()
	if event is InputEventScreenTouch and event.pressed:
		if build_mode and not selected_building.is_empty():
			_try_place_building()

func _select_building(building_id: String) -> void:
	selected_building = building_id
	build_mode = true
	hud.set_build_mode(true,building_id)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	game.notification.emit("건설 선택 · "+building_id+" · 설치할 지면을 클릭해.")

func _try_place_building() -> void:
	var camera := player.get_camera()
	var origin := camera.project_ray_origin(get_viewport().get_mouse_position())
	var direction := camera.project_ray_normal(get_viewport().get_mouse_position())
	var query := PhysicsRayQueryParameters3D.create(origin,origin+direction*250.0)
	query.exclude = [player.get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty() or hit.collider.name != "TerrainCollision":
		game.notification.emit("평탄한 지면을 선택해.")
		return
	var point: Vector3 = hit.position
	point.x = roundf(point.x)
	point.z = roundf(point.z)
	point.y = world.height_at(point.x,point.z)
	for existing in game.buildings:
		var existing_pos: Vector3 = existing.position
		if Vector2(existing_pos.x,existing_pos.z).distance_to(Vector2(point.x,point.z)) < 3.0:
			game.notification.emit("설비 사이 공간이 부족해.")
			return
	if selected_building=="CONVEYOR" and game.has_skill("CONVEYOR_PLANNER"):
		var has_port: bool = game.buildings.any(func(b): return Vector2(b.position.x-point.x,b.position.z-point.z).length()<=4.5)
		if not has_port:
			game.notification.emit("Conveyor Planner · 연결 가능한 기계/벨트 포트가 4.5m 안에 없어.")
			return
	if game.build(selected_building,point,player.rotation.y):
		_spawn_building_visual(game.buildings.back())
		build_mode = false
		selected_building = ""
		hud.set_build_mode(false)
		game.save_game()

func _spawn_building_visual(data: Dictionary) -> void:
	if machine_visuals.has(data.instance_id):
		return
	var root := Node3D.new()
	root.name = "Building_"+str(data.instance_id)
	root.position = data.position
	root.rotation.y = float(data.rotation)
	world.add_child(root)
	var base := MeshInstance3D.new()
	var box := BoxMesh.new()
	var size: Vector2i = GameData.building_definition(str(data.id)).get("size",Vector2i(2,2))
	box.size = Vector3(maxf(1.0,float(size.x)),2.0,maxf(1.0,float(size.y)))
	base.mesh = box
	base.position.y = 1.0
	var material := StandardMaterial3D.new()
	material.albedo_color = _building_color(str(data.id))
	material.metallic = 0.72
	material.roughness = 0.28
	material.emission_enabled = data.id in ["DORONUM_COMPRESSOR","INFINITY_FUSION_MACHINE","STABILIZATION_CORE","STABILIZATION_RELAY"]
	material.emission = Color(0.02,0.22,0.36) if data.id != "INFINITY_FUSION_MACHINE" else Color(0.08,0.52,0.85)
	material.emission_energy_multiplier = 0.7
	base.material_override = material
	root.add_child(base)
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.8
	torus.outer_radius = 0.95
	ring.mesh = torus
	ring.position.y = 2.2
	ring.material_override = material
	root.add_child(ring)
	var interaction := Area3D.new()
	interaction.name = "MachineInteraction"
	interaction.collision_layer = 8
	interaction.set_meta("machine_instance_id",data.instance_id)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(maxf(2.0,float(size.x)),4.0,maxf(2.0,float(size.y)))
	collision.shape = shape
	collision.position.y = 1.5
	interaction.add_child(collision)
	root.add_child(interaction)
	machine_visuals[data.instance_id] = {"root":root,"ring":ring,"data":data}

func _building_color(building_id: String) -> Color:
	if building_id.contains("DORONUM") or building_id.contains("INFINITY"):
		return Color(0.10,0.27,0.39)
	if building_id.contains("RESEARCH"):
		return Color(0.16,0.28,0.46)
	if building_id.contains("GENERATOR") or building_id.contains("SOLAR") or building_id.contains("WIND"):
		return Color(0.43,0.38,0.20)
	if building_id.contains("RELAY") or building_id.contains("CORE"):
		return Color(0.12,0.36,0.48)
	return Color(0.28,0.34,0.41)

func _animate_buildings(delta: float) -> void:
	for key in machine_visuals:
		var visual: Dictionary = machine_visuals[key]
		var data: Dictionary = visual.data
		var ring: MeshInstance3D = visual.ring
		if data.state in ["RUNNING","BROWNOUT_RUNNING","RAMPING"]:
			ring.rotate_y(delta*1.5)
		else:
			ring.rotate_y(delta*0.08)
		if data.state == "BROKEN":
			visual.root.scale = Vector3.ONE * (1.0 + sin(elapsed*8.0)*0.01)

func _on_player_interact(target: Object, hit_position: Vector3) -> void:
	if not target is Node:
		return
	var node := target as Node
	if node.has_meta("resource_id"):
		if elapsed<next_mining_time:
			return
		next_mining_time = elapsed+(0.36 if game.has_skill("STEADY_SWING") else 0.40)
		var resource_id := str(node.get_meta("resource_id"))
		var node_id := str(node.get_meta("node_id",""))
		if resource_id == "ITEM_DORI_MEAT":
			_interact_tree(node)
			return
		var required_power := 1
		if resource_id.contains("ORE") or resource_id in ["ITEM_COAL","ITEM_QUARTZ","ITEM_MAGNETITE"]:
			required_power = 10
		if resource_id in ["ITEM_DIAMOND","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE"]:
			required_power = 25
		var tool_power := 1
		match game.equipped_tool:
			"ITEM_WOODEN_PICKAXE","ITEM_WOODEN_AXE": tool_power = 10
			"ITEM_IRON_PICKAXE": tool_power = 25
			"ITEM_STEEL_PICKAXE": tool_power = 50
			"ITEM_DORONUM_PICKAXE": tool_power = 120
		if tool_power < required_power:
			game.notification.emit("도구 채굴력 부족 · 필요한 채굴력 %d" % required_power)
			return
		var quantity := int(node.get_meta("quantity",0))
		if quantity <= 0:
			node.queue_free()
			return
		var quality := float(node.get_meta("quality",90.0))
		var purity := float(node.get_meta("purity",90.0))
		game.add_item(resource_id,1,quality,purity,false,"WORLD_NODE:"+node_id)
		game.discover_resource(node_id,resource_id)
		game.claim_research_sample(node_id,resource_id)
		game.apply_tool_wear()
		var base_byproduct_chance := 0.05
		if game.has_skill("VEIN_EFFICIENCY"):
			base_byproduct_chance += 0.02
		if game._deterministic_unit(int(game.world_seed+hash(node_id)+quantity))<base_byproduct_chance:
			game.add_item("ITEM_MINERAL_RESIDUE",1,quality,purity,false,"MINING_BYPRODUCT:"+node_id+":"+str(quantity))
		node.set_meta("quantity",quantity-1)
		game.resource_depletion[node_id] = quantity-1
		if game.has_skill("GEOLOGICAL_READOUT"):
			game.notification.emit("광맥 잔량 · %d" % (quantity-1))
		if game.has_skill("DEEP_EXTRACTION") and resource_id in ["ITEM_DIAMOND","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE"]:
			game.notification.emit("심부 광맥 경고 · 고강도 채굴 대상")
		if quantity-1 <= 0:
			node.queue_free()
		game.save_game()
		return
	if node.has_meta("machine_instance_id"):
		var instance_id := str(node.get_meta("machine_instance_id"))
		for machine in game.buildings:
			if machine.instance_id == instance_id and machine.output.size()>0:
				game.collect_machine_output(instance_id)
				return
		hud.open_tab("FACTORY")
		return
	if node.has_meta("lore_id"):
		game.find_lore(str(node.get_meta("lore_id")))
		return
	if node.has_meta("restore_flag"):
		var restore_flag := str(node.get_meta("restore_flag"))
		if bool(game.story_flags.get(restore_flag,false)):
			game.notification.emit("이미 복구한 First Factory 설비야.")
			return
		var required_research := {
			"ARCHIVE_RESTORED":"RESEARCH_ADVANCED_CIRCUITS",
			"COOLING_CORE_RESTORED":"RESEARCH_HIGH_PRESSURE",
			"RESONANCE_CHAMBER_RESTORED":"RESEARCH_DORONUM_CRYSTAL"
		}
		var required_id := str(required_research.get(restore_flag,""))
		if not required_id.is_empty() and required_id not in game.research_completed:
			game.notification.emit("복구 조건 미완료 · "+required_id+" 연구가 필요해.")
			return
		game.story_flags[restore_flag] = true
		game._claim_once("FIRST_FACTORY_RESTORE:"+restore_flag,"FIRST_FACTORY_RESTORE",10000)
		game.notification.emit("First Factory 복구 · "+restore_flag+" · +10,000 RP")
		var restored := ["ARCHIVE_RESTORED","COOLING_CORE_RESTORED","RESONANCE_CHAMBER_RESTORED"]
		if restored.all(func(flag): return bool(game.story_flags.get(flag,false))):
			game.story_flags["ACT_V_COMPLETE"] = true
			game.grant_skill_point("ACT_V_COMPLETE","ACT_V_MISSION")
			game.notification.emit("FIRST FACTORY · Archive / Cooling / Resonance restored")
		game.save_game()
		game.state_changed.emit()
		return
	if node.has_meta("poi_name"):
		var poi := str(node.get_meta("poi_name"))
		game.notification.emit("관심 지점 발견 · "+poi)
		if poi == "Abandoned First Factory":
			game.find_lore("FIRST_FACTORY_ARCHIVE")
			game.story_flags["FIRST_FACTORY_FOUND"] = true
		game.save_game()
		return

func _interact_tree(tree: Node) -> void:
	if bool(tree.get_meta("mature",false)):
		game.add_item("ITEM_DORI_MEAT",1,92.0,float(tree.get_meta("purity",90.0)),false,"DORI_TREE:"+str(tree.get_meta("node_id")))
		tree.set_meta("mature",false)
		tree.set_meta("growth",0.0)
		tree.set_meta("water",0.0)
		tree.set_meta("cycle",int(tree.get_meta("cycle",0))+1)
		game.claim_research_sample(str(tree.get_meta("node_id")),"ITEM_DORI_MEAT")
		game._claim_once("FIRST_DORI_MEAT_HARVEST","TREE_HARVEST",1000)
		game.grant_skill_point("DORI_TREE_DISCOVERED","DORI_TREE_DISCOVERY")
		game.story_flags["DORI_MEAT_DISCOVERED"] = true
		game.sync_world_state(world)
		game.save_game()
		_update_tree_visuals()
		return
	var water := float(tree.get_meta("water",0.0))
	if water < 2.0 and game.count_item("ITEM_WATER") >= 2:
		if game.consume_items({"ITEM_WATER":2}):
			tree.set_meta("water",2.0)
			tree.set_meta("growth",0.0)
			game.sync_world_state(world)
			game.save_game()
			game.notification.emit("돌이 고기 나무에 물 2L 공급 · 성장 60초")
	else:
		game.notification.emit("돌이 고기 나무는 물 2L가 필요하고 60초 동안 자라야 해.")

func _update_tree_visuals() -> void:
	if world == null:
		return
	for tree in world.dori_trees:
		if not is_instance_valid(tree):
			continue
		var fruit := tree.get_node_or_null("DoriMeatFruit")
		if fruit:
			fruit.visible = bool(tree.get_meta("mature",false))
		var growth := float(tree.get_meta("growth",0.0))
		var water := float(tree.get_meta("water",0.0))
		if not bool(tree.get_meta("mature",false)) and water >= 2.0:
			tree.set_meta("growth",minf(60.0,growth))

func _update_story_progress() -> void:
	if not bool(game.story_flags.get("ACT_I_COMPLETE",false)):
		var has_workbench := game.buildings.any(func(b): return b.id=="WORKBENCH")
		var has_furnace := game.buildings.any(func(b): return b.id=="FURNACE")
		if has_workbench and has_furnace and game.equipped_tool!="ITEM_TOOL_HANDS":
			game.story_flags["ACT_I_COMPLETE"] = true
			game.grant_skill_point("ACT_I_COMPLETE","ACT_I_MISSION")
			game.notification.emit("ACT I complete · The Ruins")
	if int(game.story_flags.get("AUTOMATION_CYCLES",0)) >= 5 and not bool(game.story_flags.get("ACT_II_COMPLETE",false)):
		game.story_flags["ACT_II_COMPLETE"] = true
		game.grant_skill_point("ACT_II_COMPLETE","ACT_II_MISSION")
		game.notification.emit("ACT II complete · The Hidden Industry")
	if bool(game.story_flags.get("STORY_INCIDENT_RECONSTRUCTED",false)) and bool(game.story_flags.get("ACT_V_COMPLETE",false)) and "RESEARCH_DORONUM_FUSION" in game.research_completed:
		game.story_flags["ORBIT_04"] = true
	if game.fusion_diagnostics.values().all(func(value): return bool(value)):
		game.story_flags["ACT_VI_COMPLETE"] = true
		game.grant_skill_point("ACT_VI_COMPLETE","ACT_VI_MISSION")

func _play_ending() -> void:
	game.simulation_paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var overlay := ColorRect.new()
	overlay.color = Color(0.005,0.015,0.04,0.96)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.add_child(overlay)
	var label := Label.new()
	label.text = "ORBIT\n\nThe planet is stable.\nThe factory remains operational.\n\nDORONUM FACTORY\nINFINITE INDUSTRY MODE"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.add_theme_font_size_override("font_size",30)
	label.add_theme_color_override("font_color",Color(0.58,0.91,1.0))
	overlay.add_child(label)
	var continue_button := Button.new()
	continue_button.text = "CONTINUE · INFINITE INDUSTRY MODE"
	continue_button.custom_minimum_size = Vector2(420,56)
	continue_button.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	continue_button.position = Vector2(-210,-110)
	continue_button.pressed.connect(func():
		overlay.queue_free()
		game.simulation_paused = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		game.save_game()
	)
	overlay.add_child(continue_button)
	game.save_game()

func height_at(x: float, z: float) -> float:
	return world.height_at(x,z)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if game:
			game.player_position = player.global_position if player else game.player_position
			game.save_game()
