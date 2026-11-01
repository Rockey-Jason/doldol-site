extends Node3D
class_name WorldGenerator3D

const WORLD_SIZE := 2048.0
const GRID_SEGMENTS := 128
const RESOURCE_NODE_SCRIPT = preload("res://scripts/world/resource_node.gd")
const DORI_TREE_SCRIPT = preload("res://scripts/world/dori_meat_tree.gd")
var world_seed := 827142
var _noise := FastNoiseLite.new()
var _terrain_collision: StaticBody3D

func generate(seed_value: int = 827142) -> void:
	world_seed = seed_value
	_noise.seed = seed_value
	_noise.frequency = 0.0018
	_noise.fractal_octaves = 4
	_create_terrain()
	_create_biome_markers()
	_scatter_starting_resources()
	_create_resource_deposits()
	_create_dori_forest()
	_create_first_factory_poi()
	_create_relay_sites()

func height_at(x: float, z: float) -> float:
	var broad := _noise.get_noise_2d(x,z) * 5.0
	var ridges := absf(_noise.get_noise_2d(x*2.5,z*2.5)) * 2.3
	return broad + ridges - 1.0

func _create_terrain() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var step := WORLD_SIZE / float(GRID_SEGMENTS)
	for z in range(GRID_SEGMENTS):
		for x in range(GRID_SEGMENTS):
			var x0 := -WORLD_SIZE*0.5 + float(x)*step
			var x1 := x0 + step
			var z0 := -WORLD_SIZE*0.5 + float(z)*step
			var z1 := z0 + step
			var a := Vector3(x0,height_at(x0,z0),z0)
			var b := Vector3(x1,height_at(x1,z0),z0)
			var c := Vector3(x1,height_at(x1,z1),z1)
			var d := Vector3(x0,height_at(x0,z1),z1)
			var center := (a+b+c+d)*0.25
			var color := _ground_color(center.x,center.z,center.y)
			_add_triangle(st,a,b,c,color)
			_add_triangle(st,a,c,d,color)
	st.generate_normals()
	var mesh := st.commit()
	var surface := MeshInstance3D.new()
	surface.name = "DoldolPlanetTerrain"
	surface.mesh = mesh
	var material := StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.roughness = 1.0
	material.metallic = 0.0
	material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	surface.material_override = material
	add_child(surface)
	_terrain_collision = StaticBody3D.new()
	_terrain_collision.name = "TerrainCollision"
	var collision := CollisionShape3D.new()
	collision.shape = mesh.create_trimesh_shape()
	_terrain_collision.add_child(collision)
	add_child(_terrain_collision)

func _add_triangle(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, color: Color) -> void:
	st.set_color(color); st.add_vertex(a)
	st.set_color(color); st.add_vertex(b)
	st.set_color(color); st.add_vertex(c)

func _ground_color(x: float, z: float, y: float) -> Color:
	if x > 560.0 and z > 240.0:
		return Color(0.28,0.34,0.32) # volcanic/industrial basalt
	if z < -620.0:
		return Color(0.62,0.69,0.7) # frozen northern shelf
	if x < -530.0:
		return Color(0.62,0.51,0.33) # dry basin
	if y > 5.0:
		return Color(0.3,0.39,0.29)
	return Color(0.17,0.29,0.21)

func _create_biome_markers() -> void:
	_add_biome_ring(Vector3(0,0,0),Vector3(560,0,560),Color(0.11,0.27,0.18,0.18),"FOREST VALLEY")
	_add_biome_ring(Vector3(-740,0,100),Vector3(340,0,500),Color(0.72,0.57,0.34,0.15),"DRY BASIN")
	_add_biome_ring(Vector3(0,0,-760),Vector3(500,0,420),Color(0.64,0.78,0.86,0.18),"FROST SHELF")
	_add_biome_ring(Vector3(700,0,620),Vector3(430,0,380),Color(0.45,0.18,0.1,0.16),"VOLCANIC RIDGE")

func _add_biome_ring(pos: Vector3, scale_value: Vector3, color: Color, label_text: String) -> void:
	var ring := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 1.0
	mesh.bottom_radius = 1.0
	mesh.height = 0.15
	ring.mesh = mesh
	ring.position = pos + Vector3(0,0.1,0)
	ring.scale = scale_value
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	ring.material_override = mat
	add_child(ring)

func _spawn_node(p_id: String, item_id: String, pos: Vector3, amount: int, quality: float, purity: float, hardness: float, power: int) -> void:
	var node: ResourceNode3D = RESOURCE_NODE_SCRIPT.new()
	node.configure(p_id,item_id,amount,quality,purity,hardness,power)
	node.position = pos
	add_child(node)

func _scatter_starting_resources() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = world_seed
	for i in range(35):
		var x := rng.randf_range(-180.0,180.0)
		var z := rng.randf_range(-150.0,180.0)
		_spawn_node("WOOD_%03d" % i,"ITEM_WOOD",Vector3(x,height_at(x,z),z),6,90.0,90.0,0.4,0)
	for i in range(22):
		var x := rng.randf_range(-95.0,95.0)
		var z := rng.randf_range(-95.0,95.0)
		_spawn_node("STONE_%03d" % i,"ITEM_STONE",Vector3(x,height_at(x,z),z),8,90.0,90.0,0.7,0)
	for i in range(50):
		var x := rng.randf_range(-100.0,100.0)
		var z := rng.randf_range(40.0,160.0)
		_spawn_node("GRASS_%03d" % i,"ITEM_GRASS",Vector3(x,height_at(x,z),z),2,90.0,95.0,0.1,0)

func _create_resource_deposits() -> void:
	var deposits := [
		{"id":"IRON","item":"ITEM_IRON_ORE","center":Vector2(170,-60),"count":18,"radius":55.0,"amount":120,"quality":86.0,"hardness":1.3,"power":10},
		{"id":"COPPER","item":"ITEM_COPPER_ORE","center":Vector2(-170,-100),"count":16,"radius":58.0,"amount":100,"quality":88.0,"hardness":1.2,"power":10},
		{"id":"COAL","item":"ITEM_COAL","center":Vector2(220,190),"count":20,"radius":70.0,"amount":150,"quality":84.0,"hardness":1.1,"power":8},
		{"id":"QUARTZ","item":"ITEM_QUARTZ","center":Vector2(320,-240),"count":12,"radius":44.0,"amount":70,"quality":92.0,"hardness":1.8,"power":25},
		{"id":"GOLD","item":"ITEM_GOLD_ORE","center":Vector2(-760,110),"count":10,"radius":46.0,"amount":45,"quality":94.0,"hardness":2.1,"power":25},
		{"id":"NICKEL","item":"ITEM_NICKEL_ORE","center":Vector2(570,-480),"count":10,"radius":55.0,"amount":90,"quality":90.0,"hardness":2.2,"power":25},
		{"id":"TITANIUM","item":"ITEM_TITANIUM_ORE","center":Vector2(720,520),"count":8,"radius":62.0,"amount":60,"quality":96.0,"hardness":3.2,"power":50},
		{"id":"DIAMOND","item":"ITEM_DIAMOND","center":Vector2(420,-650),"count":5,"radius":32.0,"amount":12,"quality":98.0,"hardness":4.0,"power":50},
		{"id":"NEODYMIUM","item":"ITEM_NEODYMIUM_ORE","center":Vector2(850,-40),"count":8,"radius":48.0,"amount":40,"quality":96.0,"hardness":3.0,"power":50}
	]
	var rng := RandomNumberGenerator.new()
	rng.seed = world_seed + 7001
	for deposit in deposits:
		for i in range(int(deposit.count)):
			var angle := rng.randf_range(0.0,TAU)
			var radius := sqrt(rng.randf()) * float(deposit.radius)
			var x := float(deposit.center.x) + cos(angle)*radius
			var z := float(deposit.center.y) + sin(angle)*radius
			var y := height_at(x,z)
			var q := float(deposit.quality) + rng.randf_range(-3.0,3.0)
			_spawn_node(str(deposit.id)+"_%02d" % i,str(deposit.item),Vector3(x,y,z),int(deposit.amount),q,88.0,float(deposit.hardness),int(deposit.power))
	# IMPORTANT: no Doronum resource deposit exists anywhere in the world data.

func _create_dori_forest() -> void:
	var dori_positions := [Vector2(310,250),Vector2(340,220),Vector2(380,270),Vector2(420,230),Vector2(455,295)]
	for i in range(dori_positions.size()):
		var p: Vector2 = dori_positions[i]
		var tree: DoriMeatTree3D = DORI_TREE_SCRIPT.new()
		tree.tree_id = "DORI_TREE_%03d" % i
		tree.position = Vector3(p.x,height_at(p.x,p.y),p.y)
		add_child(tree)

func _create_first_factory_poi() -> void:
	var poi := Node3D.new()
	poi.name = "FIRST_DORONUM_FACTORY"
	poi.position = Vector3(460,height_at(460,-410),-410)
	add_child(poi)
	var main_structure := _make_industrial_structure(Vector3(38,18,26),Color(0.11,0.19,0.24),Color(0.18,0.65,0.76))
	main_structure.position.y = 9.0
	poi.add_child(main_structure)
	_add_poi_sign(poi,"FIRST DORONUM FACTORY","BLUE FURNACE INCIDENT · 30 YEARS AGO")
	for i in range(3):
		var beacon := OmniLight3D.new()
		beacon.light_color = Color(0.1,0.8,1.0)
		beacon.light_energy = 1.3
		beacon.omni_range = 18.0
		beacon.position = Vector3(-14.0+14.0*i,4.0,13.0)
		poi.add_child(beacon)
	for room in ["ARCHIVE","COOLING CORE","RESONANCE CHAMBER"]:
		GameState.story_flags["POI_LOCKED_"+room] = true

func _make_industrial_structure(size_value: Vector3, color: Color, emissive: Color) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size_value
	mesh.mesh = box
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.metallic = 0.68
	mat.roughness = 0.35
	mat.emission_enabled = true
	mat.emission = emissive * 0.18
	mesh.material_override = mat
	return mesh

func _add_poi_sign(parent: Node3D, title_text: String, subtitle: String) -> void:
	var sign := Label3D.new()
	sign.text = title_text + "\n" + subtitle
	sign.font_size = 36
	sign.modulate = Color(0.65,0.92,1.0)
	sign.outline_size = 8
	sign.position = Vector3(0,17,0)
	parent.add_child(sign)

func _create_relay_sites() -> void:
	var locations := [Vector3(-900,0,900),Vector3(920,0,-860),Vector3(930,0,900)]
	for i in range(locations.size()):
		var site := Node3D.new()
		site.name = "RELAY_SITE_%d" % (i+1)
		var x := locations[i].x
		var z := locations[i].z
		site.position = Vector3(x,height_at(x,z),z)
		var marker := MeshInstance3D.new()
		var pillar := CylinderMesh.new()
		pillar.top_radius = 2.0
		pillar.bottom_radius = 2.8
		pillar.height = 4.0
		marker.mesh = pillar
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.12,0.31,0.38)
		mat.metallic = 0.6
		mat.emission_enabled = true
		mat.emission = Color(0.02,0.22,0.3)
		marker.material_override = mat
		marker.position.y = 2.0
		site.add_child(marker)
		var label := Label3D.new()
		label.text = "PLANETARY RELAY %d" % (i+1)
		label.font_size = 28
		label.modulate = Color(0.5,0.9,1.0)
		label.position.y = 6.0
		site.add_child(label)
		add_child(site)
		site.add_to_group("relay_sites")
