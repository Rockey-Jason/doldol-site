extends CharacterBody3D
class_name PlayerController

signal interact_requested(target: Object, hit_position: Vector3)

@export var walk_speed := 6.0
@export var sprint_speed := 9.0
@export var acceleration := 18.0
@export var jump_velocity := 8.5
@export var mouse_sensitivity := 0.0025
var gravity := 24.0
var camera_pivot: Node3D
var spring_arm: SpringArm3D
var camera: Camera3D
var visual: Node3D
var pitch := -0.18
var bob_time := 0.0
var interaction_range := 5.0

func _ready() -> void:
	_build_character()
	_setup_touch_controls()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _build_character() -> void:
	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.42
	capsule.height = 1.8
	collider.shape = capsule
	collider.position.y = 0.9
	add_child(collider)
	visual = Node3D.new()
	visual.name = "Visual"
	add_child(visual)
	var body_mesh := MeshInstance3D.new()
	var body := CapsuleMesh.new()
	body.radius = 0.39
	body.height = 1.45
	body_mesh.mesh = body
	body_mesh.position.y = 0.92
	body_mesh.material_override = _material(Color(0.78,0.82,0.88),0.25)
	visual.add_child(body_mesh)
	var head_mesh := MeshInstance3D.new()
	var head := SphereMesh.new()
	head.radius = 0.28
	head.height = 0.56
	head_mesh.mesh = head
	head_mesh.position = Vector3(0,1.82,0)
	head_mesh.material_override = _material(Color(0.92,0.78,0.62),0.05)
	visual.add_child(head_mesh)
	camera_pivot = Node3D.new()
	camera_pivot.position.y = 1.55
	camera_pivot.rotation.x = pitch
	add_child(camera_pivot)
	spring_arm = SpringArm3D.new()
	spring_arm.spring_length = 5.0
	spring_arm.margin = 0.18
	camera_pivot.add_child(spring_arm)
	camera = Camera3D.new()
	camera.fov = 72.0
	spring_arm.add_child(camera)
	camera.position = Vector3(0,0,0)
	camera.current = true

func _material(color: Color, metallic: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.metallic = metallic
	material.roughness = 0.55
	return material

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_rotate_camera(event.relative)
	if event is InputEventScreenDrag and event.position.x > get_viewport().get_visible_rect().size.x*0.38:
		_rotate_camera(event.relative)
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED else Input.MOUSE_MODE_CAPTURED

func _rotate_camera(relative: Vector2) -> void:
	rotate_y(-relative.x*mouse_sensitivity)
	pitch = clampf(pitch-relative.y*mouse_sensitivity,-1.05,0.5)
	camera_pivot.rotation.x = pitch

func _setup_touch_controls() -> void:
	if not DisplayServer.is_touchscreen_available():
		return
	var layer := CanvasLayer.new()
	layer.layer = 20
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	layer.add_child(root)
	_add_touch_button(root,"▲","move_forward",0.115,0.68,64,64)
	_add_touch_button(root,"◀","move_left",0.045,0.77,64,64)
	_add_touch_button(root,"▶","move_right",0.185,0.77,64,64)
	_add_touch_button(root,"▼","move_back",0.115,0.86,64,64)
	_add_touch_button(root,"E","interact",0.84,0.80,72,72)
	_add_touch_button(root,"JUMP","jump",0.88,0.66,72,56)
	_add_touch_button(root,"RUN","sprint",0.77,0.66,64,56)

func _add_touch_button(root: Control,label: String,action: String,left: float,top: float,width: float,height: float) -> void:
	var button := Button.new()
	button.text = label
	button.anchor_left = left
	button.anchor_right = left
	button.anchor_top = top
	button.anchor_bottom = top
	button.offset_left = 0.0
	button.offset_top = 0.0
	button.offset_right = width
	button.offset_bottom = height
	button.focus_mode = Control.FOCUS_NONE
	button.modulate = Color(0.82,0.94,1.0,0.82)
	button.add_theme_font_size_override("font_size",20)
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.015,0.055,0.11,0.72)
	style.border_color = Color(0.25,0.72,0.95,0.72)
	style.set_border_width_all(1)
	style.set_corner_radius_all(18)
	button.add_theme_stylebox_override("normal",style)
	button.add_theme_stylebox_override("hover",style)
	button.add_theme_stylebox_override("pressed",style)
	button.button_down.connect(func(): Input.action_press(action))
	button.button_up.connect(func(): Input.action_release(action))
	root.add_child(button)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	else:
		if Input.is_action_just_pressed("jump"):
			velocity.y = jump_velocity
	var input_vector := Input.get_vector("move_left","move_right","move_forward","move_back")
	var forward := -global_transform.basis.z
	var right := global_transform.basis.x
	var direction := (right * input_vector.x + forward * -input_vector.y).normalized()
	var speed := sprint_speed if Input.is_action_pressed("sprint") else walk_speed
	var target_velocity := direction * speed
	velocity.x = move_toward(velocity.x,target_velocity.x,acceleration*delta)
	velocity.z = move_toward(velocity.z,target_velocity.z,acceleration*delta)
	if direction.length() > 0.1:
		visual.rotation.y = lerp_angle(visual.rotation.y,atan2(direction.x,direction.z),delta*10.0)
		bob_time += delta * (12.0 if speed == sprint_speed else 8.0)
		visual.position.y = sin(bob_time) * 0.035
	else:
		visual.position.y = move_toward(visual.position.y,0.0,delta*0.2)
	move_and_slide()
	if Input.is_action_just_pressed("interact"):
		_interact()

func _interact() -> void:
	var origin := camera.global_position
	var destination := origin + -camera.global_transform.basis.z * interaction_range
	var query := PhysicsRayQueryParameters3D.create(origin,destination)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	if not result.is_empty():
		interact_requested.emit(result.collider,result.position)

func get_camera() -> Camera3D:
	return camera
