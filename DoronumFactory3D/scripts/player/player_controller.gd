extends CharacterBody3D
class_name PlayerController3D

signal interaction_target_changed(target: Node3D)
signal player_interacted(target: Node)

@export var walk_speed := 7.0
@export var sprint_speed := 11.0
@export var acceleration := 26.0
@export var jump_velocity := 7.5
@export var mouse_sensitivity := 0.0024
@export var touch_sensitivity := 0.004
@export var camera_distance := 6.2
@export var camera_height := 1.65
@export var interaction_distance := 5.0

var camera_yaw := 0.0
var camera_pitch := -0.24
var move_touch := Vector2.ZERO
var look_touch := Vector2.ZERO
var is_sprinting := false
var _camera_pivot: Node3D
var _camera: Camera3D
var _spring_arm: SpringArm3D
var _mesh_root: Node3D
var _interact_cooldown := 0.0
var factory_manager: FactoryManager3D
var _current_target: Node3D
var _touch_look_active := false
var _touch_look_last := Vector2.ZERO

func _ready() -> void:
	add_to_group("player")
	_build_character()
	_create_camera()
	_setup_input_actions()
	global_position = GameState.player_state.get("position", Vector3(0,0.2,0))
	collision_layer = 1
	collision_mask = 3
	_spring_arm.collision_mask = 3
	GameState.tick_advanced.connect(_on_simulation_tick)

func _build_character() -> void:
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.42
	capsule.height = 1.8
	var collider := CollisionShape3D.new()
	collider.shape = capsule
	collider.position.y = 0.9
	add_child(collider)

	_mesh_root = Node3D.new()
	_mesh_root.name = "RecoveryEngineerModel"
	add_child(_mesh_root)
	var suit := StandardMaterial3D.new()
	suit.albedo_color = Color(0.83,0.57,0.22)
	suit.metallic = 0.15
	suit.roughness = 0.68
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.08,0.16,0.2)
	dark.roughness = 0.82
	var helmet_mat := StandardMaterial3D.new()
	helmet_mat.albedo_color = Color(0.85,0.9,0.84)
	helmet_mat.metallic = 0.16
	var visor := StandardMaterial3D.new()
	visor.albedo_color = Color(0.07,0.38,0.47)
	visor.metallic = 0.72
	visor.roughness = 0.18
	visor.emission_enabled = true
	visor.emission = Color(0.01,0.12,0.16)

	_add_capsule_part(Vector3(0,1.05,0),Vector3(0.58,0.74,0.34),suit)
	_add_sphere_part(Vector3(0,1.62,0),Vector3(0.3,0.31,0.3),helmet_mat)
	_add_box_part(Vector3(0,1.64,-0.21),Vector3(0.37,0.15,0.08),visor)
	_add_box_part(Vector3(-0.22,0.58,0),Vector3(0.22,0.75,0.25),dark)
	_add_box_part(Vector3(0.22,0.58,0),Vector3(0.22,0.75,0.25),dark)
	_add_box_part(Vector3(-0.43,1.08,0),Vector3(0.19,0.62,0.22),dark)
	_add_box_part(Vector3(0.43,1.08,0),Vector3(0.19,0.62,0.22),dark)
	_add_box_part(Vector3(-0.22,0.18,-0.04),Vector3(0.32,0.16,0.42),suit)
	_add_box_part(Vector3(0.22,0.18,-0.04),Vector3(0.32,0.16,0.42),suit)
	var pack := _add_box_part(Vector3(0,1.12,0.25),Vector3(0.45,0.6,0.22),dark)
	pack.name = "LifeSupportPack"

func _add_box_part(pos: Vector3, size: Vector3, material: Material) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	part.mesh = mesh
	part.material_override = material
	part.position = pos
	_mesh_root.add_child(part)
	return part

func _add_sphere_part(pos: Vector3, size: Vector3, material: Material) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	part.mesh = mesh
	part.scale = size
	part.material_override = material
	part.position = pos
	_mesh_root.add_child(part)
	return part

func _add_capsule_part(pos: Vector3, size: Vector3, material: Material) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	part.mesh = mesh
	part.scale = size
	part.material_override = material
	part.position = pos
	_mesh_root.add_child(part)
	return part

func _create_camera() -> void:
	_camera_pivot = Node3D.new()
	_camera_pivot.name = "CameraPivot"
	_camera_pivot.position.y = camera_height
	add_child(_camera_pivot)
	_spring_arm = SpringArm3D.new()
	_spring_arm.spring_length = camera_distance
	_spring_arm.margin = 0.18
	_spring_arm.collision_mask = 1
	_camera_pivot.add_child(_spring_arm)
	var arm_shape := SphereShape3D.new()
	arm_shape.radius = 0.22
	_spring_arm.shape = arm_shape
	_camera = Camera3D.new()
	_camera.name = "ThirdPersonCamera"
	_camera.current = true
	_camera.fov = 73.0
	_spring_arm.add_child(_camera)
	_update_camera_rotation()

func _setup_input_actions() -> void:
	_add_key_action("move_forward",KEY_W)
	_add_key_action("move_back",KEY_S)
	_add_key_action("move_left",KEY_A)
	_add_key_action("move_right",KEY_D)
	_add_key_action("jump",KEY_SPACE)
	_add_key_action("sprint",KEY_SHIFT)
	_add_key_action("interact",KEY_E)
	_add_key_action("toggle_build",KEY_B)
	_add_key_action("toggle_inventory",KEY_I)
	_add_key_action("toggle_research",KEY_T)
	_add_key_action("toggle_missions",KEY_M)

func _add_key_action(action_name: String, keycode: Key) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	var event := InputEventKey.new()
	event.physical_keycode = keycode
	var already_exists := false
	for existing in InputMap.action_get_events(action_name):
		if existing is InputEventKey and existing.physical_keycode == keycode:
			already_exists = true
	if not already_exists:
		InputMap.action_add_event(action_name,event)

func _physics_process(delta: float) -> void:
	_interact_cooldown = maxf(0.0,_interact_cooldown-delta)
	var keyboard := Input.get_vector("move_left","move_right","move_forward","move_back")
	var movement := keyboard
	if move_touch.length() > 0.08:
		movement = move_touch.limit_length(1.0)
	var basis := _camera_pivot.global_basis
	var forward := -basis.z
	var right := basis.x
	forward.y = 0.0
	right.y = 0.0
	forward = forward.normalized()
	right = right.normalized()
	var direction := right * movement.x + forward * -movement.y
	direction.y = 0.0
	direction = direction.normalized()
	var target_speed := sprint_speed if (Input.is_action_pressed("sprint") or is_sprinting) else walk_speed
	var horizontal := Vector3(velocity.x,0,velocity.z)
	var target_velocity := direction * target_speed
	horizontal = horizontal.move_toward(target_velocity,acceleration*delta)
	velocity.x = horizontal.x
	velocity.z = horizontal.z
	if not is_on_floor():
		velocity += get_gravity()*delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = jump_velocity
	elif velocity.y < 0.0:
		velocity.y = -0.15
	move_and_slide()
	if direction.length() > 0.08:
		var target_angle := atan2(direction.x,direction.z)
		_mesh_root.rotation.y = lerp_angle(_mesh_root.rotation.y,target_angle,delta*10.0)
		var stride := sin(Time.get_ticks_msec()*0.012)*0.045*minf(direction.length(),1.0)
		_mesh_root.position.y = stride
	else:
		_mesh_root.position.y = move_toward(_mesh_root.position.y,0.0,delta*0.2)
	GameState.player_state["position"] = global_position
	_update_interaction_target()
	_update_build_preview()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		elif event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
				_interact()
			else:
				_interact()
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_spring_arm.spring_length = clampf(_spring_arm.spring_length-0.5,2.5,10.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_spring_arm.spring_length = clampf(_spring_arm.spring_length+0.5,2.5,10.0)
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_rotate_camera(event.relative,mouse_sensitivity)
	if event is InputEventScreenTouch:
		if event.pressed and event.position.x > get_viewport().get_visible_rect().size.x*0.45:
			_touch_look_active = true
			_touch_look_last = event.position
		elif not event.pressed:
			_touch_look_active = false
	if event is InputEventScreenDrag and _touch_look_active:
		var delta: Vector2 = event.position-_touch_look_last
		_touch_look_last = event.position
		_rotate_camera(delta,touch_sensitivity)
	if event.is_action_pressed("interact"):
		_interact()
	if event.is_action_pressed("toggle_build"):
		get_tree().call_group("game_hud","toggle_panel","build")
	if event.is_action_pressed("toggle_inventory"):
		get_tree().call_group("game_hud","toggle_panel","inventory")
	if event.is_action_pressed("toggle_research"):
		get_tree().call_group("game_hud","toggle_panel","research")
	if event.is_action_pressed("toggle_missions"):
		get_tree().call_group("game_hud","toggle_panel","missions")
	if event.is_action_pressed("ui_cancel"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			get_tree().call_group("game_hud","toggle_pause")

func _rotate_camera(delta: Vector2, sensitivity: float) -> void:
	camera_yaw -= delta.x*sensitivity
	camera_pitch = clampf(camera_pitch-delta.y*sensitivity,-0.8,0.24)
	_update_camera_rotation()

func _update_camera_rotation() -> void:
	if _camera_pivot:
		_camera_pivot.rotation = Vector3(camera_pitch,camera_yaw,0.0)

func _update_interaction_target() -> void:
	var hit := _raycast_target()
	var candidate: Node3D = hit.get("collider") as Node3D if not hit.is_empty() else null
	if candidate != _current_target:
		_current_target = candidate
		interaction_target_changed.emit(candidate)

func _raycast_target() -> Dictionary:
	if not is_inside_tree() or _camera == null:
		return {}
	var origin := _camera.global_position
	var direction := -_camera.global_basis.z
	var query := PhysicsRayQueryParameters3D.create(origin,origin+direction*interaction_distance)
	query.exclude = [get_rid()]
	query.collision_mask = 1
	return get_world_3d().direct_space_state.intersect_ray(query)

func _interact() -> void:
	if _interact_cooldown > 0.0:
		return
	if factory_manager and not factory_manager.selected_building_type.is_empty():
		var ground_hit := _raycast_floor()
		if not ground_hit.is_empty():
			factory_manager.place_selected(ground_hit.position)
			_interact_cooldown = 0.25
		else:
			GameState.toast("설치 가능한 지면을 조준하세요.","warning")
		return
	var hit := _raycast_target()
	if hit.is_empty():
		return
	var target := hit.collider as Node
	if target and target.has_method("interact"):
		target.interact(self)
		player_interacted.emit(target)
		_interact_cooldown = 0.22

func interact_from_ui() -> void:
	_interact()

func set_factory_manager(manager: FactoryManager3D) -> void:
	factory_manager = manager

func _raycast_floor() -> Dictionary:
	if _camera == null:
		return {}
	var origin := _camera.global_position
	var direction := -_camera.global_basis.z
	var query := PhysicsRayQueryParameters3D.create(origin,origin+direction*5000.0)
	query.exclude = [get_rid()]
	query.collision_mask = 2
	return get_world_3d().direct_space_state.intersect_ray(query)

func _update_build_preview() -> void:
	if factory_manager == null or factory_manager.selected_building_type.is_empty():
		return
	var hit := _raycast_floor()
	if hit.is_empty():
		return
	var valid := factory_manager.can_place(factory_manager.selected_building_type,hit.position)
	factory_manager.update_preview(hit.position,valid)

func set_mobile_move(value: Vector2) -> void:
	move_touch = value.limit_length(1.0)

func set_mobile_look(value: Vector2) -> void:
	_rotate_camera(value,touch_sensitivity)

func set_mobile_sprint(active: bool) -> void:
	is_sprinting = active

func _on_simulation_tick(_tick_index: int) -> void:
	pass
