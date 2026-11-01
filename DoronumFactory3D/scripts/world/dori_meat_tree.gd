extends StaticBody3D
class_name DoriMeatTree3D

@export var tree_id := "DORI_TREE_0001"
var cycle_progress := 0.0
var mature := true
var _fruit_nodes: Array[MeshInstance3D] = []
var _glow: OmniLight3D

func _ready() -> void:
	_build_tree()
	_restore()
	GameState.tick_advanced.connect(_on_simulation_tick)

func _build_tree() -> void:
	var trunk := MeshInstance3D.new()
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.35
	trunk_mesh.bottom_radius = 0.7
	trunk_mesh.height = 5.2
	trunk.mesh = trunk_mesh
	var bark := StandardMaterial3D.new()
	bark.albedo_color = Color(0.25,0.14,0.09)
	bark.roughness = 0.95
	trunk.material_override = bark
	trunk.position.y = 2.6
	add_child(trunk)
	for i in range(7):
		var branch := MeshInstance3D.new()
		var branch_mesh := CylinderMesh.new()
		branch_mesh.top_radius = 0.1
		branch_mesh.bottom_radius = 0.2
		branch_mesh.height = 2.4
		branch.mesh = branch_mesh
		branch.material_override = bark
		branch.position = Vector3(sin(float(i)*0.9)*1.0,4.0,cos(float(i)*0.9)*1.0)
		branch.rotation.z = sin(float(i))*0.45
		branch.rotation.x = cos(float(i))*0.45
		add_child(branch)
	for i in range(9):
		var leaf := MeshInstance3D.new()
		var mesh := SphereMesh.new()
		mesh.radius = 1.05
		mesh.height = 1.3
		leaf.mesh = mesh
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.16,0.38,0.22)
		mat.roughness = 0.85
		leaf.material_override = mat
		leaf.position = Vector3(sin(float(i)*2.4)*1.5,4.5+sin(float(i)*1.3)*0.7,cos(float(i)*2.4)*1.5)
		add_child(leaf)
		var fruit := MeshInstance3D.new()
		var fruit_mesh := SphereMesh.new()
		fruit_mesh.radius = 0.22
		fruit_mesh.height = 0.4
		fruit.mesh = fruit_mesh
		var fruit_mat := StandardMaterial3D.new()
		fruit_mat.albedo_color = Color(0.75,0.24,0.25)
		fruit_mat.emission_enabled = true
		fruit_mat.emission = Color(0.18,0.035,0.045)
		fruit.material_override = fruit_mat
		fruit.position = leaf.position + Vector3(0,-0.55,0)
		_fruit_nodes.append(fruit)
		add_child(fruit)
	_glow = OmniLight3D.new()
	_glow.light_color = Color(0.18,0.65,0.8)
	_glow.light_energy = 0.45
	_glow.omni_range = 6.0
	_glow.position.y = 4.0
	add_child(_glow)
	var collision := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.8
	capsule.height = 5.2
	collision.shape = capsule
	collision.position.y = 2.6
	add_child(collision)

func _restore() -> void:
	var tree_data: Dictionary = GameState.world_state.get("dori_trees",{}).get(tree_id,{})
	cycle_progress = float(tree_data.get("cycle_progress",0.0))
	mature = bool(tree_data.get("mature",true))
	_set_fruit_visibility()

func _on_simulation_tick(_tick: int) -> void:
	if mature:
		return
	cycle_progress += GameState.FIXED_TICK
	if cycle_progress >= GameState.DORI_TREE_CYCLE_SEC:
		cycle_progress = 0.0
		mature = true
		_set_fruit_visibility()
		GameState.toast("돌이 고기 나무의 열매가 다시 성숙했습니다.","success")
	_save_state(false)

func interact(_player: Node) -> void:
	if not mature:
		GameState.toast("열매가 자라는 중입니다. %.0f초 남음." % (GameState.DORI_TREE_CYCLE_SEC-cycle_progress),"warning")
		return
	if GameState.count_item("ITEM_WATER") < GameState.DORI_TREE_WATER_L:
		GameState.toast("수확에는 물 2L가 필요합니다.","warning")
		return
	if not GameState.remove_item("ITEM_WATER",GameState.DORI_TREE_WATER_L):
		return
	mature = false
	cycle_progress = 0.0
	GameState.add_item("ITEM_DORI_MEAT",GameState.DORI_TREE_YIELD,92.0,90.0,false,"DORI_TREE:" + tree_id)
	var claim := "DORI_HARVEST:" + tree_id + ":" + str(GameState.simulation_tick)
	GameState.register_world_event(claim)
	GameState.progress_objective("DORI_MEAT_HARVESTED",tree_id)
	_set_fruit_visibility()
	GameState.toast("비합성 돌이 고기 +1  · 순도 90","success")
	_save_state(true)

func _set_fruit_visibility() -> void:
	for fruit in _fruit_nodes:
		fruit.visible = mature
	_glow.light_energy = 0.8 if mature else 0.18

func _save_state(force: bool) -> void:
	var trees: Dictionary = GameState.world_state.get("dori_trees",{})
	trees[tree_id] = {"cycle_progress":cycle_progress,"mature":mature,"cycle_id":int(GameState.world_state.get("tree_cycle_"+tree_id,0))}
	GameState.world_state["dori_trees"] = trees
	if force:
		GameState.save_game()

