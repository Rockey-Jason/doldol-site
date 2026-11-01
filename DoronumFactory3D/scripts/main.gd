extends Node3D

const WORLD_SCRIPT = preload("res://scripts/world/world_generator.gd")
const PLAYER_SCRIPT = preload("res://scripts/player/player_controller.gd")
const FACTORY_SCRIPT = preload("res://scripts/factory/factory_manager.gd")
const STORY_SCRIPT = preload("res://scripts/story/story_manager.gd")
const HUD_SCRIPT = preload("res://scripts/ui/game_hud.gd")
const CONTRACT_SCRIPT = preload("res://scripts/contracts/contract_manager.gd")

var world: WorldGenerator3D
var player: PlayerController3D
var factory: FactoryManager3D
var story: StoryManager3D
var hud: GameHUD3D
var contracts: ContractManager3D
var world_environment: WorldEnvironment
var sun: DirectionalLight3D
var _time_of_day := 0.31

func _ready() -> void:
	_build_environment()
	_build_world()
	_build_factory()
	_build_player()
	_build_story()
	_build_contracts()
	_build_hud()
	_connect_events()
	GameState.toast("DORONUM FACTORY · 돌돌행성 복구 작전이 시작되었습니다.","success")
	story.dialogue_changed.emit("ORBIT","Factory status: UNKNOWN. Recovery Engineer, please reconnect the field network.")
	story.evaluate_progression()

func _build_environment() -> void:
	world_environment = WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.035,0.08,0.13)
	sky_material.sky_horizon_color = Color(0.31,0.4,0.43)
	sky_material.ground_bottom_color = Color(0.035,0.055,0.058)
	sky_material.ground_horizon_color = Color(0.24,0.3,0.29)
	sky_material.sun_angle_max = 18.0
	sky.sky_material = sky_material
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.ambient_light_energy = 0.62
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.glow_enabled = true
	environment.glow_intensity = 0.38
	environment.glow_strength = 0.72
	environment.volumetric_fog_enabled = false
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.23,0.34,0.36)
	environment.fog_density = 0.0009
	world_environment.environment = environment
	add_child(world_environment)

	sun = DirectionalLight3D.new()
	sun.name = "DoldolSun"
	sun.rotation_degrees = Vector3(-48.0,-32.0,0.0)
	sun.light_color = Color(1.0,0.87,0.7)
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 180.0
	add_child(sun)

	var fill := DirectionalLight3D.new()
	fill.name = "AtmosphereFill"
	fill.rotation_degrees = Vector3(-18.0,142.0,0.0)
	fill.light_color = Color(0.35,0.59,0.75)
	fill.light_energy = 0.24
	fill.shadow_enabled = false
	add_child(fill)

func _build_world() -> void:
	world = WORLD_SCRIPT.new()
	world.name = "DoldolPlanet"
	add_child(world)
	world.generate(827142)

func _build_factory() -> void:
	factory = FACTORY_SCRIPT.new()
	factory.name = "FactoryManager"
	add_child(factory)
	factory.setup(world)

func _build_player() -> void:
	player = PLAYER_SCRIPT.new()
	player.name = "RecoveryEngineer"
	player.position = Vector3(0.0,world.height_at(0.0,0.0)+0.05,0.0)
	player.collision_layer = 1
	player.collision_mask = 3
	player.set_factory_manager(factory)
	add_child(player)

func _build_story() -> void:
	story = STORY_SCRIPT.new()
	story.name = "StoryManager"
	add_child(story)

func _build_contracts() -> void:
	contracts = CONTRACT_SCRIPT.new()
	contracts.name = "ContractManager"
	add_child(contracts)

func _build_hud() -> void:
	hud = HUD_SCRIPT.new()
	hud.name = "GameHUD"
	hud.setup(player,factory,story,contracts)
	add_child(hud)

func _connect_events() -> void:
	factory.building_placed.connect(_on_building_placed)

func _process(delta: float) -> void:
	_time_of_day = fposmod(_time_of_day + delta/1800.0,1.0)
	var daylight := maxf(0.0,sin((_time_of_day-0.25)*TAU))
	sun.light_energy = lerpf(0.09,1.2,daylight)
	sun.rotation_degrees.x = lerpf(-7.0,-76.0,_time_of_day)

func _on_building_placed(machine_type: String,instance_id: String) -> void:
	if machine_type == "WORKBENCH":
		GameState.story_flags["WORKBENCH_PLACED"] = true
		story.evaluate_progression()
	if machine_type == "STABILIZATION_RELAY":
		GameState.story_flags["RELAY_PLACED:"+instance_id] = true
		story.evaluate_progression()
	if machine_type == "STABILIZATION_CORE":
		GameState.story_flags["CORE_MACHINE_PLACED"] = true
		story.evaluate_progression()
