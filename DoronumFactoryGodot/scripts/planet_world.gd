extends Node3D
class_name PlanetWorld

signal resource_spawned(node: Area3D)

var noise := FastNoiseLite.new()
var rng := RandomNumberGenerator.new()
var resources: Array[Area3D] = []
var dori_trees: Array[Area3D] = []
var terrain_material: StandardMaterial3D
var world_seed := GameData.WORLD_SEED

func generate(seed_value: int = GameData.WORLD_SEED) -> void:
	world_seed = seed_value
	rng.seed = seed_value
	noise.seed = seed_value
	noise.frequency = 0.0028
	noise.fractal_octaves = 4
	noise.fractal_gain = 0.48
	_build_terrain()
	_build_biome_regions()
	_spawn_resources()
	_spawn_dori_forest()
	_spawn_points_of_interest()

func advance_simulation(delta: float) -> void:
	for tree in dori_trees:
		if not is_instance_valid(tree) or bool(tree.get_meta("mature",false)):
			continue
		if float(tree.get_meta("water",0.0)) < 2.0:
			continue
		var growth := float(tree.get_meta("growth",0.0)) + delta
		tree.set_meta("growth",growth)
		if growth >= 60.0:
			tree.set_meta("growth",60.0)
			tree.set_meta("mature",true)
			var fruit := tree.get_node_or_null("DoriMeatFruit")
			if fruit:
				fruit.visible = true

func height_at(x: float, z: float) -> float:
	var broad := noise.get_noise_2d(x,z) * 12.0
	var ridge_noise := noise.get_noise_2d(x*0.45+1700.0,z*0.45-800.0)
	var ridge := (1.0-absf(ridge_noise))*5.0
	return broad + ridge

func _build_terrain() -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var segments := 96
	var step := GameData.WORLD_SIZE / float(segments)
	for z in range(segments):
		for x in range(segments):
			var x0 := -GameData.WORLD_LIMIT + x*step
			var x1 := x0 + step
			var z0 := -GameData.WORLD_LIMIT + z*step
			var z1 := z0 + step
			var a := Vector3(x0,height_at(x0,z0),z0)
			var b := Vector3(x1,height_at(x1,z0),z0)
			var c := Vector3(x1,height_at(x1,z1),z1)
			var d := Vector3(x0,height_at(x0,z1),z1)
			surface.set_uv(Vector2(float(x)/segments,float(z)/segments)); surface.add_vertex(a)
			surface.set_uv(Vector2(float(x+1)/segments,float(z)/segments)); surface.add_vertex(b)
			surface.set_uv(Vector2(float(x+1)/segments,float(z+1)/segments)); surface.add_vertex(c)
			surface.set_uv(Vector2(float(x)/segments,float(z)/segments)); surface.add_vertex(a)
			surface.set_uv(Vector2(float(x+1)/segments,float(z+1)/segments)); surface.add_vertex(c)
			surface.set_uv(Vector2(float(x)/segments,float(z+1)/segments)); surface.add_vertex(d)
	surface.generate_normals()
	var mesh := surface.commit()
	var ground := MeshInstance3D.new()
	ground.name = "ProceduralTerrain"
	ground.mesh = mesh
	terrain_material = StandardMaterial3D.new()
	terrain_material.albedo_color = Color(0.18,0.25,0.20)
	terrain_material.roughness = 0.94
	ground.material_override = terrain_material
	add_child(ground)
	var body := StaticBody3D.new()
	body.name = "TerrainCollision"
	var collision := CollisionShape3D.new()
	var shape := ConcavePolygonShape3D.new()
	shape.set_faces(mesh.get_faces())
	collision.shape = shape
	body.add_child(collision)
	add_child(body)

func _build_biome_regions() -> void:
	_add_biome_disc("Dori Forest",Vector3(-420,0,-180),130.0,Color(0.10,0.22,0.15))
	_add_biome_disc("Quartz Canyon",Vector3(480,0,-380),150.0,Color(0.32,0.34,0.39))
	_add_biome_disc("Lava Zone",Vector3(570,0,360),130.0,Color(0.23,0.12,0.10))
	_add_biome_disc("Frozen Zone",Vector3(-500,0,480),145.0,Color(0.42,0.56,0.66))
	_add_biome_disc("Oil Field",Vector3(180,0,530),120.0,Color(0.22,0.19,0.13))

func _add_biome_disc(label: String, position: Vector3, radius: float, color: Color) -> void:
	var marker := MeshInstance3D.new()
	marker.name = label.replace(" ","")
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = 0.15
	marker.mesh = mesh
	marker.position = Vector3(position.x,height_at(position.x,position.z)+0.03,position.z)
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 1.0
	marker.material_override = material
	add_child(marker)

func _spawn_resources() -> void:
	var deposits := [
		["WOOD","ITEM_WOOD",Vector2(60,30),38,12,Color(0.34,0.18,0.09)],
		["STONE","ITEM_STONE",Vector2(-35,60),34,18,Color(0.40,0.43,0.48)],
		["GRASS","ITEM_GRASS",Vector2(80,-50),45,22,Color(0.20,0.43,0.17)],
		["IRON","ITEM_IRON_ORE",Vector2(-280,120),36,80,Color(0.53,0.39,0.30)],
		["COPPER","ITEM_COPPER_ORE",Vector2(280,120),30,75,Color(0.79,0.34,0.17)],
		["COAL","ITEM_COAL",Vector2(120,-300),30,90,Color(0.09,0.12,0.16)],
		["QUARTZ","ITEM_QUARTZ",Vector2(480,-380),26,60,Color(0.55,0.78,0.88)],
		["GOLD","ITEM_GOLD_ORE",Vector2(-480,350),18,40,Color(0.88,0.67,0.20)],
		["DIAMOND","ITEM_DIAMOND",Vector2(620,-300),12,20,Color(0.28,0.86,0.96)],
		["TITANIUM","ITEM_TITANIUM_ORE",Vector2(640,500),20,35,Color(0.53,0.63,0.72)],
		["NEODYMIUM","ITEM_NEODYMIUM_ORE",Vector2(-650,-450),16,28,Color(0.49,0.36,0.73)],
		["MAGNETITE","ITEM_MAGNETITE",Vector2(220,620),18,32,Color(0.25,0.28,0.33)],
		["HEAT","ITEM_HEAT_CRYSTAL",Vector2(570,350),16,18,Color(0.95,0.29,0.10)],
		["COLD","ITEM_COLD_CRYSTAL",Vector2(-500,480),16,18,Color(0.24,0.68,0.98)]
	]
	for deposit in deposits:
		var center: Vector2 = deposit[2]
		for i in range(int(deposit[3])):
			var angle := rng.randf_range(0.0,TAU)
			var distance := sqrt(rng.randf()) * 95.0
			var x := center.x + cos(angle)*distance
			var z := center.y + sin(angle)*distance
			_spawn_resource(str(deposit[0])+"-"+str(i),str(deposit[1]),Vector3(x,height_at(x,z)+0.8,z),int(deposit[4]),deposit[5])

func _spawn_resource(node_id: String, item_id: String, position: Vector3, quantity: int, color: Color) -> void:
	var area := Area3D.new()
	area.name = node_id
	area.position = position
	area.collision_layer = 2
	area.collision_mask = 0
	area.set_meta("node_id",node_id)
	area.set_meta("resource_id",item_id)
	area.set_meta("quantity",quantity)
	area.set_meta("quality",rng.randf_range(82.0,98.0))
	area.set_meta("purity",rng.randf_range(78.0,96.0))
	area.set_meta("synthetic",false)
	area.set_meta("mining_power_required",25 if item_id in ["ITEM_DIAMOND","ITEM_TITANIUM_ORE","ITEM_NEODYMIUM_ORE"] else (10 if item_id.contains("ORE") or item_id in ["ITEM_COAL","ITEM_QUARTZ","ITEM_MAGNETITE"] else 1))
	var collision := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = 1.6
	collision.shape = sphere
	area.add_child(collision)
	var visual := MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 1.0
	mesh.height = 1.8
	visual.mesh = mesh
	visual.material_override = _material(color,0.28,0.35)
	area.add_child(visual)
	add_child(area)
	resources.append(area)
	resource_spawned.emit(area)

func _spawn_dori_forest() -> void:
	for i in range(18):
		var angle := rng.randf_range(0.0,TAU)
		var radius := rng.randf_range(25.0,115.0)
		var x := -420.0 + cos(angle)*radius
		var z := -180.0 + sin(angle)*radius
		_spawn_tree("DORI-TREE-%02d" % i,Vector3(x,height_at(x,z),z))

func _spawn_tree(tree_id: String, position: Vector3) -> void:
	var tree := Area3D.new()
	tree.name = tree_id
	tree.position = position
	tree.collision_layer = 4
	tree.set_meta("node_id",tree_id)
	tree.set_meta("resource_id","ITEM_DORI_MEAT")
	tree.set_meta("quantity",1)
	tree.set_meta("growth",0.0)
	tree.set_meta("water",0.0)
	tree.set_meta("mature",false)
	tree.set_meta("purity",90.0)
	tree.set_meta("cycle",0)
	var collision := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 3.0
	collision.shape = shape
	tree.add_child(collision)
	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.45
	trunk_mesh.bottom_radius = 0.7
	trunk_mesh.height = 4.5
	trunk.mesh = trunk_mesh
	trunk.position.y = 2.1
	trunk.material_override = _material(Color(0.27,0.16,0.10),0.0,0.9)
	tree.add_child(trunk)
	var crown := MeshInstance3D.new()
	var crown_mesh := SphereMesh.new()
	crown_mesh.radius = 2.1
	crown_mesh.height = 3.5
	crown.mesh = crown_mesh
	crown.position.y = 5.1
	crown.material_override = _material(Color(0.16,0.35,0.20),0.0,0.85)
	tree.add_child(crown)
	var fruit := MeshInstance3D.new()
	var fruit_mesh := SphereMesh.new()
	fruit_mesh.radius = 0.32
	fruit.mesh = fruit_mesh
	fruit.position = Vector3(0.8,4.8,1.0)
	fruit.visible = false
	fruit.material_override = _material(Color(0.08,0.65,0.95),0.65,0.15)
	fruit.name = "DoriMeatFruit"
	tree.add_child(fruit)
	add_child(tree)
	dori_trees.append(tree)

func _spawn_points_of_interest() -> void:
	var pois := [
		["Abandoned First Factory",Vector2(0,-720),Color(0.20,0.28,0.35)],
		["Old Reactor",Vector2(720,40),Color(0.13,0.52,0.68)],
		["Research Station",Vector2(300,-580),Color(0.25,0.52,0.65)],
		["Mine Entrance",Vector2(650,500),Color(0.36,0.30,0.23)],
		["Shipping Port",Vector2(-80,850),Color(0.34,0.42,0.50)],
		["First Factory Archive",Vector2(-760,-120),Color(0.12,0.48,0.65)]
	]
	_spawn_lore_site("IncidentSafetyRecord","Incident · Safety Override",Vector2(-760,-720),"LORE_INCIDENT_SAFETY_OVERRIDE")
	_spawn_lore_site("IncidentPowerRecord","Incident · Power Oscillation",Vector2(-650,-650),"LORE_INCIDENT_POWER_OSCILLATION")
	_spawn_lore_site("IncidentCoolingRecord","Incident · Cooling Failure",Vector2(-560,-760),"LORE_INCIDENT_COOLING_FAILURE")
	_spawn_lore_site("IncidentAuditRecord","Incident · Archive Edit",Vector2(-820,-610),"LORE_INCIDENT_ARCHIVE_EDIT")
	_spawn_lore_site("ArchiveControl","First Factory · Archive",Vector2(-720,-690),"","ARCHIVE_RESTORED")
	_spawn_lore_site("CoolingControl","First Factory · Cooling Core",Vector2(-650,-790),"","COOLING_CORE_RESTORED")
	_spawn_lore_site("ResonanceControl","First Factory · Resonance Chamber",Vector2(-840,-760),"","RESONANCE_CHAMBER_RESTORED")
	for poi in pois:
		var marker := Node3D.new()
		marker.name = str(poi[0]).replace(" ","")
		marker.position = Vector3(poi[1].x,height_at(poi[1].x,poi[1].y),poi[1].y)
		marker.set_meta("poi_name",str(poi[0]))
		var tower := MeshInstance3D.new()
		var mesh := BoxMesh.new()
		mesh.size = Vector3(8,18,8)
		tower.mesh = mesh
		tower.position.y = 9
		tower.material_override = _material(poi[2],0.65,0.35)
		marker.add_child(tower)
		var interact := Area3D.new()
		interact.collision_layer = 16
		interact.set_meta("poi_name",str(poi[0]))
		var collider := CollisionShape3D.new()
		var collider_shape := SphereShape3D.new()
		collider_shape.radius = 12.0
		collider.shape = collider_shape
		collider.position.y = 6.0
		interact.add_child(collider)
		marker.add_child(interact)
		add_child(marker)


func _spawn_lore_site(site_id: String, title: String, position: Vector2, lore_id: String = "", restore_flag: String = "") -> void:
	var site := Node3D.new()
	site.name = site_id
	site.position = Vector3(position.x,height_at(position.x,position.y),position.y)
	site.set_meta("poi_name",title)
	if not lore_id.is_empty():
		site.set_meta("lore_id",lore_id)
	if not restore_flag.is_empty():
		site.set_meta("restore_flag",restore_flag)
	var beacon := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 0.7
	mesh.bottom_radius = 1.4
	mesh.height = 7.0
	beacon.mesh = mesh
	beacon.position.y = 3.5
	beacon.material_override = _material(Color(0.12,0.55,0.75),0.72,0.22)
	site.add_child(beacon)
	var area := Area3D.new()
	area.set_meta("poi_name",title)
	if not lore_id.is_empty():
		area.set_meta("lore_id",lore_id)
	if not restore_flag.is_empty():
		area.set_meta("restore_flag",restore_flag)
	var collider := CollisionShape3D.new()
	var shape := SphereShape3D.new()
	shape.radius = 9.0
	collider.shape = shape
	collider.position.y = 3.0
	area.add_child(collider)
	site.add_child(area)
	add_child(site)


func _material(color: Color, metallic: float, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.metallic = metallic
	material.roughness = roughness
	return material
