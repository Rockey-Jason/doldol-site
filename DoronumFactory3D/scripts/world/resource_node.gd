extends StaticBody3D
class_name ResourceNode3D

var node_id := ""
var item_id := "ITEM_STONE"
var remaining := 40
var max_amount := 40
var node_quality := 90.0
var node_purity := 90.0
var hardness := 1.0
var mining_power_required := 0
var depleted := false
var _visual_root: Node3D

func configure(p_id: String, p_item: String, p_amount: int, p_quality: float, p_purity: float, p_hardness: float = 1.0, p_power: int = 0) -> void:
	node_id = p_id
	add_to_group("resource_nodes")
	item_id = p_item
	remaining = p_amount
	max_amount = p_amount
	node_quality = p_quality
	node_purity = p_purity
	hardness = p_hardness
	mining_power_required = p_power
	_build_visual()
	_restore_world_state()

func _build_visual() -> void:
	_visual_root = Node3D.new()
	_visual_root.name = "ResourceVisual"
	add_child(_visual_root)
	var body_mesh := MeshInstance3D.new()
	var material := StandardMaterial3D.new()
	material.roughness = 0.93
	match item_id:
		"ITEM_WOOD":
			var trunk := CylinderMesh.new()
			trunk.top_radius = 0.24
			trunk.bottom_radius = 0.4
			trunk.height = 2.5
			body_mesh.mesh = trunk
			material.albedo_color = Color(0.27,0.15,0.085)
		"ITEM_COAL":
			body_mesh.mesh = _rock_mesh(1.15, 1.0, 0.85)
			material.albedo_color = Color(0.085,0.105,0.12)
			material.metallic = 0.22
		"ITEM_IRON_ORE":
			body_mesh.mesh = _rock_mesh(1.2, 0.9, 1.05)
			material.albedo_color = Color(0.42,0.26,0.2)
			material.metallic = 0.3
		"ITEM_COPPER_ORE":
			body_mesh.mesh = _rock_mesh(1.05, 0.8, 0.95)
			material.albedo_color = Color(0.68,0.34,0.17)
			material.metallic = 0.42
		"ITEM_QUARTZ":
			body_mesh.mesh = _crystal_mesh(1.6)
			material.albedo_color = Color(0.55,0.82,0.88)
			material.emission_enabled = true
			material.emission = Color(0.08,0.32,0.4)
		"ITEM_GOLD_ORE":
			body_mesh.mesh = _rock_mesh(1.0, 0.9, 0.8)
			material.albedo_color = Color(0.85,0.62,0.18)
			material.metallic = 0.72
		"ITEM_DIAMOND":
			body_mesh.mesh = _crystal_mesh(1.7)
			material.albedo_color = Color(0.38,0.9,0.96)
			material.emission_enabled = true
			material.emission = Color(0.1,0.55,0.85)
		"ITEM_WATER":
			var water_mesh := CylinderMesh.new()
			water_mesh.top_radius = 0.38
			water_mesh.bottom_radius = 0.45
			water_mesh.height = 1.3
			body_mesh.mesh = water_mesh
			material.albedo_color = Color(0.12,0.55,0.76,0.8)
			material.emission_enabled = true
			material.emission = Color(0.02,0.12,0.2)
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		"ITEM_RUBBER_SAP":
			body_mesh.mesh = _crystal_mesh(1.0)
			material.albedo_color = Color(0.92,0.7,0.25)
			material.emission_enabled = true
			material.emission = Color(0.14,0.06,0.0)
		"ITEM_HEAT_CRYSTAL":
			body_mesh.mesh = _crystal_mesh(1.35)
			material.albedo_color = Color(0.95,0.3,0.12)
			material.emission_enabled = true
			material.emission = Color(0.48,0.06,0.01)
		"ITEM_COLD_CRYSTAL":
			body_mesh.mesh = _crystal_mesh(1.35)
			material.albedo_color = Color(0.38,0.86,1.0)
			material.emission_enabled = true
			material.emission = Color(0.08,0.3,0.65)
		"ITEM_STONE", _:
			body_mesh.mesh = _rock_mesh(1.1, 0.7, 0.95)
			material.albedo_color = Color(0.36,0.43,0.44)
	body_mesh.material_override = material
	body_mesh.scale = Vector3(1.0, 0.75, 0.95) if item_id != "ITEM_QUARTZ" and item_id != "ITEM_DIAMOND" else Vector3.ONE
	body_mesh.position.y = 0.65
	_visual_root.add_child(body_mesh)
	var collision := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = 0.95
	collision.shape = sphere
	collision.position.y = 0.65
	add_child(collision)
	if item_id == "ITEM_WOOD":
		for i in range(3):
			var canopy := MeshInstance3D.new()
			var leaf := SphereMesh.new()
			leaf.radius = 0.95
			leaf.height = 1.8
			canopy.mesh = leaf
			var green := StandardMaterial3D.new()
			green.albedo_color = [Color(0.12,0.29,0.17),Color(0.17,0.37,0.2),Color(0.2,0.4,0.22)][i]
			green.roughness = 1.0
			canopy.material_override = green
			canopy.position = Vector3(sin(float(i)*2.1)*0.55,2.0+float(i)*0.25,cos(float(i)*2.1)*0.5)
			_visual_root.add_child(canopy)

func _rock_mesh(sx: float, sy: float, sz: float) -> Mesh:
	var mesh := SphereMesh.new()
	mesh.radius = 0.7
	mesh.height = 1.3
	return mesh

func _crystal_mesh(height: float) -> Mesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var points := [Vector3(0,0,0),Vector3(0.35,0,0),Vector3(0,0,0.35),Vector3(0.15,height,0.13),Vector3(-0.25,0,0.1)]
	var faces := [[0,1,3],[1,2,3],[2,0,3],[0,4,3],[4,2,3]]
	for face in faces:
		st.add_vertex(points[face[0]])
		st.add_vertex(points[face[1]])
		st.add_vertex(points[face[2]])
	st.generate_normals()
	return st.commit()

func _restore_world_state() -> void:
	var saved: Dictionary = GameState.world_state.get("resource_nodes",{})
	if saved.has(node_id):
		remaining = int(saved[node_id])
		depleted = remaining <= 0
		_visual_root.visible = not depleted

func interact(_player: Node) -> void:
	if depleted or remaining <= 0:
		GameState.toast("이 광맥은 고갈되었습니다.", "warning")
		return
	var tool_id := str(GameState.player_state.get("equipped_tool","ITEM_TOOL_HANDS"))
	var power := {"ITEM_TOOL_HANDS":1,"ITEM_WOODEN_PICKAXE":10,"ITEM_IRON_PICKAXE":25,"ITEM_STEEL_PICKAXE":50,"ITEM_DORONUM_PICKAXE":120}.get(tool_id,1)
	if int(power) < mining_power_required:
		GameState.toast("더 강한 채굴 도구가 필요합니다. 요구 Mining Power: %d" % mining_power_required,"warning")
		return
	if item_id in ["ITEM_IRON_ORE","ITEM_COPPER_ORE","ITEM_COAL","ITEM_QUARTZ","ITEM_GOLD_ORE","ITEM_DIAMOND","ITEM_STONE"] and not ["ITEM_WOODEN_PICKAXE","ITEM_IRON_PICKAXE","ITEM_STEEL_PICKAXE","ITEM_DORONUM_PICKAXE"].has(tool_id):
		GameState.toast("채굴하려면 곡괭이를 장착해야 합니다.","warning")
		return
	var yield_amount := 1
	if tool_id == "ITEM_IRON_PICKAXE" or tool_id == "ITEM_STEEL_PICKAXE" or tool_id == "ITEM_DORONUM_PICKAXE":
		yield_amount = 2 if item_id != "ITEM_DIAMOND" else 1
	yield_amount = mini(yield_amount,remaining)
	remaining -= yield_amount
	GameState.add_item(item_id,yield_amount,node_quality,node_purity,false,"VEIN:" + node_id)
	GameState.grant_rp_once("FIRST_RESOURCE_SCAN:"+node_id,10)
	GameState.progress_objective("RESOURCE_GATHERED",item_id,yield_amount)
	var debris_roll := int(hash(node_id + str(GameState.simulation_tick))) % 100
	if debris_roll < 10 and item_id not in ["ITEM_WOOD","ITEM_DIAMOND"]:
		GameState.add_item("ITEM_GRAVEL",1,85.0,90.0,false,"MINING_BYPRODUCT")
	if remaining <= 0:
		depleted = true
		_visual_root.visible = false
	var node_state: Dictionary = GameState.world_state.get("resource_nodes",{})
	node_state[node_id] = remaining
	GameState.world_state["resource_nodes"] = node_state
	GameState.grant_rp_once("FIRST_RESOURCE_SCAN:"+node_id,10)
	GameState.toast("%s +%d  · 남은 매장량 %d" % [GameState.ITEM_DATA.get(item_id,{}).get("name",item_id),yield_amount,remaining],"success")
	GameState.save_game()

