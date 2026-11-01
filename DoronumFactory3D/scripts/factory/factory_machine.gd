extends StaticBody3D
class_name FactoryMachine3D

signal selected(machine_id: String)

var machine_id := ""
var machine_type := ""
var machine_state: Dictionary = {}
var manager: FactoryManager3D
var visual_time := 0.0
var _moving_parts: Array[Node3D] = []
var _status_lamp: MeshInstance3D
var _body_material: StandardMaterial3D
var _belt_items: Array[MeshInstance3D] = []
var _ports: Dictionary = {}

func configure(record: Dictionary, owner_manager: FactoryManager3D) -> void:
	machine_state = record
	machine_id = str(record.get("instance_id",""))
	machine_type = str(record.get("type",""))
	manager = owner_manager
	name = machine_id
	_build_machine_model()
	position = record.get("position",Vector3.ZERO)
	rotation.y = float(record.get("rotation_y",0.0))
	_update_status_visual()

func _process(delta: float) -> void:
	visual_time += delta
	if _moving_parts.is_empty():
		return
	for i in range(_moving_parts.size()):
		var part := _moving_parts[i]
		if machine_state.get("status","IDLE") == "RUNNING":
			part.rotate_y(delta*(1.5+float(i%3)*0.35))
		if machine_type == "INFINITY_FUSION_MACHINE" and machine_state.get("status","") == "RUNNING":
			part.rotate_y(delta*(0.4+float(i)*0.14))
	if _status_lamp:
		var active := str(machine_state.get("status","")) == "RUNNING"
		_status_lamp.material_override.emission_energy_multiplier = 1.2+sin(visual_time*5.0)*0.25 if active else 0.25

func _build_machine_model() -> void:
	_body_material = StandardMaterial3D.new()
	_body_material.albedo_color = _base_color()
	_body_material.metallic = 0.68
	_body_material.roughness = 0.32
	var dark := StandardMaterial3D.new()
	dark.albedo_color = Color(0.055,0.095,0.12)
	dark.metallic = 0.78
	dark.roughness = 0.3
	var accent := StandardMaterial3D.new()
	accent.albedo_color = Color(0.12,0.55,0.64)
	accent.metallic = 0.46
	accent.emission_enabled = true
	accent.emission = Color(0.015,0.14,0.18)
	var footprint: Vector2i = GameState.MACHINE_DEFS.get(machine_type,{}).get("footprint",Vector2i(2,2))
	var width := float(footprint.x)
	var depth := float(footprint.y)
	_add_box(Vector3(0,0.22,0),Vector3(width,0.42,depth),dark)
	_add_box(Vector3(0,0.46,0),Vector3(width*0.86,0.18,depth*0.86),_body_material)
	_create_bolts(width,depth)
	match str(GameState.MACHINE_DEFS.get(machine_type,{}).get("kind","machine")):
		"conveyor":
			_build_conveyor(width,depth,dark,accent)
		"generator","solar","battery","transformer","power_buffer":
			_build_power_plant(width,depth,dark,accent)
		"furnace":
			_build_furnace(width,depth,dark,accent)
		"compressor","dor onium","doronium","press","fusion":
			_build_pressure_machine(width,depth,dark,accent)
		"lab":
			_build_lab(width,depth,dark,accent)
		"cooling":
			_build_cooling_tower(width,depth,dark,accent)
		"relay","core":
			_build_relay_core(width,depth,dark,accent)
		"auto_miner","harvester":
			_build_extractor(width,depth,dark,accent)
		_:
			_build_assembler(width,depth,dark,accent)
	_build_status_light(Vector3(width*0.34,1.55,-depth*0.34))
	_create_ports(width,depth)

func _base_color() -> Color:
	var kind := str(GameState.MACHINE_DEFS.get(machine_type,{}).get("kind",""))
	if kind in ["doronium","fusion","relay","core"]:
		return Color(0.13,0.28,0.36)
	if kind in ["power","generator","solar","battery","transformer"]:
		return Color(0.22,0.3,0.34)
	return Color(0.22,0.28,0.31)

func _add_box(pos: Vector3, size: Vector3, material: Material, parent: Node3D = null) -> MeshInstance3D:
	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	mesh_instance.position = pos
	if parent == null:
		add_child(mesh_instance)
	else:
		parent.add_child(mesh_instance)
	return mesh_instance

func _add_cylinder(pos: Vector3, radius: float, height_value: float, material: Material, parent: Node3D = null) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height_value
	mesh.radial_segments = 20
	part.mesh = mesh
	part.material_override = material
	part.position = pos
	if parent == null:
		add_child(part)
	else:
		parent.add_child(part)
	return part

func _create_bolts(width: float, depth: float) -> void:
	var bolt_material := StandardMaterial3D.new()
	bolt_material.albedo_color = Color(0.49,0.62,0.66)
	bolt_material.metallic = 0.85
	for x_sign in [-1.0,1.0]:
		for z_sign in [-1.0,1.0]:
			var bolt := _add_cylinder(Vector3(x_sign*(width*0.42),0.49,z_sign*(depth*0.42)),0.055,0.06,bolt_material)
			bolt.rotation.x = PI*0.5

func _build_conveyor(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_box(Vector3(0,0.73,0),Vector3(width*0.9,0.22,depth*0.58),dark)
	var roller_count := maxi(3,int(width*3.0))
	for i in range(roller_count):
		var x := -width*0.4+float(i)*width*0.8/float(roller_count-1)
		var roller := _add_cylinder(Vector3(x,0.88,0),depth*0.34,0.09,accent)
		roller.rotation.z = PI*0.5
		_moving_parts.append(roller)
	for side in [-1.0,1.0]:
		_add_box(Vector3(0,1.02,side*depth*0.3),Vector3(width*0.9,0.13,0.08),accent)

func _build_power_plant(width: float, depth: float, dark: Material, accent: Material) -> void:
	if machine_type == "SOLAR_PANEL":
		for i in range(3):
			var panel := _add_box(Vector3(0,1.0+float(i)*0.06,-depth*0.25+float(i)*depth*0.25),Vector3(width*0.76,0.08,depth*0.2),accent)
			panel.rotation.x = -0.18
	else:
		_add_box(Vector3(0,1.0,0),Vector3(width*0.55,0.85,depth*0.55),dark)
		var turbine := _add_cylinder(Vector3(0,1.55,0),minf(width,depth)*0.25,0.22,accent)
		_moving_parts.append(turbine)
		for i in range(3):
			var blade := _add_box(Vector3(0,2.18,0),Vector3(0.18,0.95,0.08),accent)
			blade.rotation.y = float(i)*TAU/3.0
			blade.rotation.x = -0.45
			_moving_parts.append(blade)

func _build_furnace(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_box(Vector3(0,1.1,0),Vector3(width*0.66,1.1,depth*0.66),dark)
	_add_box(Vector3(0,0.9,-depth*0.34),Vector3(width*0.44,0.52,0.07),accent)
	var chimney := _add_cylinder(Vector3(width*0.25,1.8,-depth*0.2),0.22,1.2,dark)
	_moving_parts.append(chimney)

func _build_pressure_machine(width: float, depth: float, dark: Material, accent: Material) -> void:
	var height_value := 1.7 if machine_type != "INFINITY_FUSION_MACHINE" else 3.5
	_add_cylinder(Vector3(0,1.0,0),minf(width,depth)*0.34,1.0,dark)
	for ring_index in range(3 if machine_type == "INFINITY_FUSION_MACHINE" else 2):
		var ring := MeshInstance3D.new()
		var torus := TorusMesh.new()
		torus.inner_radius = minf(width,depth)*(0.23+float(ring_index)*0.075)
		torus.outer_radius = torus.inner_radius+0.08
		ring.mesh = torus
		ring.position.y = height_value+float(ring_index)*0.36
		ring.material_override = accent
		add_child(ring)
		_moving_parts.append(ring)
	var core := _add_cylinder(Vector3(0,height_value,0),0.55,1.0,accent)
	core.scale = Vector3(1.0,1.0,1.0)
	_moving_parts.append(core)
	for side in range(4):
		var pillar := _add_box(Vector3(cos(float(side)*PI*0.5)*width*0.36,height_value*0.52,sin(float(side)*PI*0.5)*depth*0.36),Vector3(0.22,height_value,0.22),dark)
		_moving_parts.append(pillar)
	var shield := _add_cylinder(Vector3(0,height_value+0.65,0),minf(width,depth)*0.37,0.08,accent)
	shield.transparency = 0.55

func _build_lab(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_box(Vector3(0,1.0,0),Vector3(width*0.66,1.0,depth*0.66),dark)
	for i in range(3):
		var tube := _add_cylinder(Vector3(-width*0.23+float(i)*width*0.23,1.65,0),0.13,0.8,accent)
		tube.rotation.x = 0.1
		_moving_parts.append(tube)

func _build_cooling_tower(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_cylinder(Vector3(0,1.3,0),minf(width,depth)*0.35,2.0,dark)
	for i in range(3):
		var ring := _add_cylinder(Vector3(0,0.72+float(i)*0.45,0),minf(width,depth)*(0.34-float(i)*0.04),0.08,accent)
		_moving_parts.append(ring)

func _build_relay_core(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_cylinder(Vector3(0,1.1,0),minf(width,depth)*0.28,1.7,dark)
	var crystal := MeshInstance3D.new()
	var mesh := PrismMesh.new()
	mesh.size = Vector3(0.85,1.6,0.85)
	crystal.mesh = mesh
	crystal.position.y = 2.2
	crystal.material_override = accent
	add_child(crystal)
	_moving_parts.append(crystal)

func _build_extractor(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_box(Vector3(0,1.0,0),Vector3(width*0.62,1.0,depth*0.62),dark)
	var drill := _add_cylinder(Vector3(0,0.25,0),0.28,1.4,accent)
	_moving_parts.append(drill)
	for i in range(4):
		var arm := _add_box(Vector3(cos(float(i)*PI/2)*width*0.35,1.0,sin(float(i)*PI/2)*depth*0.35),Vector3(0.13,1.3,0.13),accent)
		_moving_parts.append(arm)

func _build_assembler(width: float, depth: float, dark: Material, accent: Material) -> void:
	_add_box(Vector3(0,1.0,0),Vector3(width*0.62,1.0,depth*0.62),dark)
	for i in range(2):
		var piston := _add_cylinder(Vector3(-width*0.22+float(i)*width*0.44,1.65,0),0.12,0.85,accent)
		_moving_parts.append(piston)
	var head := _add_box(Vector3(0,2.05,0),Vector3(width*0.45,0.18,depth*0.28),accent)
	_moving_parts.append(head)

func _create_ports(width: float, depth: float) -> void:
	var input_port := Marker3D.new()
	input_port.name = "InputPort"
	input_port.position = Vector3(-width*0.5,0.75,0)
	add_child(input_port)
	var output_port := Marker3D.new()
	output_port.name = "OutputPort"
	output_port.position = Vector3(width*0.5,0.75,0)
	add_child(output_port)
	var power_port := Marker3D.new()
	power_port.name = "PowerPort"
	power_port.position = Vector3(0,0.3,depth*0.5)
	add_child(power_port)
	_ports = {"input":input_port,"output":output_port,"power":power_port}

func _build_status_light(pos: Vector3) -> void:
	_status_lamp = MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.09
	mesh.height = 0.18
	_status_lamp.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.emission_enabled = true
	mat.emission = Color(0.15,0.8,0.45)
	mat.emission_energy_multiplier = 0.3
	_status_lamp.material_override = mat
	_status_lamp.position = pos
	add_child(_status_lamp)

func _update_status_visual() -> void:
	if not is_instance_valid(_status_lamp):
		return
	var status := str(machine_state.get("status","IDLE"))
	var color := Color(0.18,0.75,0.42)
	match status:
		"RUNNING","BROWNOUT_RUNNING":
			color = Color(0.16,0.95,0.72)
		"PAUSED_POWER","WAITING_INPUT","PAUSED_OUTPUT":
			color = Color(1.0,0.62,0.16)
		"BROKEN","FAILED","FAULT":
			color = Color(1.0,0.16,0.13)
	var mat := _status_lamp.material_override as StandardMaterial3D
	mat.emission = color

func set_runtime_state(data: Dictionary) -> void:
	machine_state = data
	_update_status_visual()

func get_input_port() -> Vector3:
	return _ports.input.global_position if _ports.has("input") else global_position

func get_output_port() -> Vector3:
	return _ports.output.global_position if _ports.has("output") else global_position

func interact(_player: Node) -> void:
	selected.emit(machine_id)
	if manager:
		manager.select_machine(machine_id)

