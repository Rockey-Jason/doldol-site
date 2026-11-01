extends CanvasLayer
class_name GameUI

signal build_selected(building_id: String)

var game: GameState
var main_game: Node
var root: Control
var content_box: VBoxContainer
var status_label: Label
var objective_label: Label
var current_tab := "BUILD"
var toast_label: Label
var build_mode_label: Label
var _last_toast := ""

func setup(state: GameState, owner_game: Node) -> void:
	game = state
	main_game = owner_game
	_build_ui()
	game.notification.connect(_on_notification)
	game.state_changed.connect(_refresh)
	_refresh()

func _build_ui() -> void:
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	var header := PanelContainer.new()
	header.position = Vector2(18,18)
	header.size = Vector2(470,116)
	header.add_theme_stylebox_override("panel",_panel_style(Color(0.025,0.055,0.105,0.94),Color(0.17,0.72,0.83)))
	root.add_child(header)
	var head_v := VBoxContainer.new()
	header.add_child(head_v)
	var title := Label.new()
	title.text = "DORONUM FACTORY   /   INFINITE INDUSTRY"
	title.add_theme_font_size_override("font_size",17)
	title.add_theme_color_override("font_color",Color(0.73,0.95,1.0))
	head_v.add_child(title)
	objective_label = Label.new()
	objective_label.add_theme_font_size_override("font_size",13)
	objective_label.add_theme_color_override("font_color",Color(0.89,0.93,0.98))
	head_v.add_child(objective_label)
	status_label = Label.new()
	status_label.add_theme_font_size_override("font_size",12)
	status_label.add_theme_color_override("font_color",Color(0.45,0.84,0.91))
	head_v.add_child(status_label)
	var panel := PanelContainer.new()
	panel.position = Vector2(18,152)
	panel.size = Vector2(470,650)
	panel.add_theme_stylebox_override("panel",_panel_style(Color(0.025,0.055,0.105,0.92),Color(0.10,0.32,0.48)))
	root.add_child(panel)
	var panel_v := VBoxContainer.new()
	panel_v.add_theme_constant_override("separation",8)
	panel.add_child(panel_v)
	var tabs := GridContainer.new()
	tabs.columns = 4
	panel_v.add_child(tabs)
	for tab in ["BUILD","CRAFT","INVENTORY","RESEARCH","SKILLS","FACTORY","STORY","FUSION","MAP"]:
		var button := Button.new()
		button.text = tab
		button.custom_minimum_size = Vector2(105,34)
		button.pressed.connect(_select_tab.bind(tab))
		_style_button(button)
		tabs.add_child(button)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel_v.add_child(scroll)
	content_box = VBoxContainer.new()
	content_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content_box.add_theme_constant_override("separation",7)
	scroll.add_child(content_box)
	var footer := HBoxContainer.new()
	panel_v.add_child(footer)
	var save_button := Button.new()
	save_button.text = "SAVE"
	save_button.pressed.connect(game.save_game)
	_style_button(save_button)
	footer.add_child(save_button)
	var close_button := Button.new()
	close_button.text = "HIDE  [H]"
	close_button.pressed.connect(func(): panel.visible = not panel.visible)
	_style_button(close_button)
	footer.add_child(close_button)
	toast_label = Label.new()
	toast_label.position = Vector2(510,28)
	toast_label.size = Vector2(650,40)
	toast_label.add_theme_font_size_override("font_size",16)
	toast_label.add_theme_color_override("font_color",Color(0.48,0.94,1.0))
	root.add_child(toast_label)
	build_mode_label = Label.new()
	build_mode_label.position = Vector2(510,72)
	build_mode_label.size = Vector2(550,28)
	build_mode_label.add_theme_color_override("font_color",Color(1.0,0.77,0.35))
	root.add_child(build_mode_label)
	var controls := Label.new()
	controls.text = "WASD 이동 · SHIFT 달리기 · SPACE 점프 · E 상호작용 · B 건설 · I 인벤토리 · F 공장 · ESC 마우스"
	controls.position = Vector2(18,860)
	controls.size = Vector2(1000,26)
	controls.add_theme_font_size_override("font_size",12)
	controls.add_theme_color_override("font_color",Color(0.72,0.79,0.88))
	root.add_child(controls)

func _process(_delta: float) -> void:
	if game == null:
		return
	status_label.text = "POWER  %.0f / %.0f kW     RP  %d     BUILDS  %d     TIER  %d" % [
		game.total_power_generated-game.total_power_used,game.total_power_generated,
		game.research_points,game.buildings.size(),_current_tier()
	]
	if not game.active_research.is_empty():
		var research := GameData.research_definition(game.active_research)
		var pct := 100.0 if float(research.time) <= 0.0 else 100.0*game.research_progress/float(research.time)
		status_label.text += "     RESEARCH %.0f%%" % pct

func _panel_style(background: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(10)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style

func _style_button(button: Button) -> void:
	button.add_theme_font_size_override("font_size",13)
	button.add_theme_color_override("font_color",Color(0.88,0.95,1.0))
	button.add_theme_stylebox_override("normal",_panel_style(Color(0.05,0.12,0.20),Color(0.14,0.42,0.55)))
	button.add_theme_stylebox_override("hover",_panel_style(Color(0.08,0.22,0.31),Color(0.30,0.80,0.91)))
	button.add_theme_stylebox_override("pressed",_panel_style(Color(0.04,0.30,0.39),Color(0.42,0.91,1.0)))

func _select_tab(tab: String) -> void:
	current_tab = tab
	_refresh()

func _refresh() -> void:
	if content_box == null or game == null:
		return
	for child in content_box.get_children():
		child.queue_free()
	match current_tab:
		"BUILD": _draw_build()
		"CRAFT": _draw_craft()
		"INVENTORY": _draw_inventory()
		"RESEARCH": _draw_research()
		"SKILLS": _draw_skills()
		"FACTORY": _draw_factory()
		"STORY": _draw_story()
		"FUSION": _draw_fusion()
		"MAP": _draw_map()
	objective_label.text = _current_objective()

func _heading(text: String) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size",16)
	label.add_theme_color_override("font_color",Color(0.48,0.88,0.98))
	content_box.add_child(label)

func _label(text: String, color: Color = Color(0.83,0.88,0.95)) -> void:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size",13)
	label.add_theme_color_override("font_color",color)
	content_box.add_child(label)

func _button(text: String, callback: Callable, disabled: bool = false) -> void:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 34
	button.disabled = disabled
	button.pressed.connect(callback)
	_style_button(button)
	content_box.add_child(button)

func _draw_build() -> void:
	_heading("CONSTRUCTION  /  1m GRID")
	_label("설비를 선택한 다음 월드에서 클릭해 설치해. 건설 비용은 설치 시 한 번만 차감돼.")
	for definition in GameData.BUILDINGS:
		var unlocked := _building_unlocked(str(definition.id))
		var affordable := game.can_afford(definition.cost)
		var cost_parts: Array[String] = []
		for item_id in definition.cost:
			cost_parts.append("%s ×%d" % [GameData.item_name(item_id),int(definition.cost[item_id])])
		_button("%s  ·  %s" % [definition.name," / ".join(cost_parts)],func(): build_selected.emit(str(definition.id)),not unlocked or not affordable)

func _draw_craft() -> void:
	_heading("MANUAL CRAFTING")
	_label("손 제작 및 작업대 레시피. 재료가 부족하면 제작은 커밋되지 않아.")
	for recipe_id in GameData.MANUAL_RECIPES:
		var recipe: Dictionary = GameData.MANUAL_RECIPES[recipe_id]
		var parts: Array[String] = []
		for item_id in recipe.inputs:
			parts.append("%s ×%d" % [GameData.item_name(item_id),int(recipe.inputs[item_id])])
		var possible := game.can_afford(recipe.inputs)
		_button("%s  ←  %s" % [recipe.name," + ".join(parts)],func(): game.craft_manual(recipe_id),not possible)

func _draw_inventory() -> void:
	_heading("INVENTORY  /  QUALITY · PURITY · LINEAGE")
	_label("장착 도구: %s  ·  Condition %.0f%%" % [GameData.item_name(game.equipped_tool),game.equipped_tool_condition])
	_button("장착 · 손",func(): game.equip_tool("ITEM_TOOL_HANDS");_refresh())
	_button("도구 수리",func(): game.repair_equipped_tool();_refresh(),game.equipped_tool=="ITEM_TOOL_HANDS" or game.equipped_tool_condition>=100.0)
	for tool_id in ["ITEM_WOODEN_PICKAXE","ITEM_WOODEN_AXE","ITEM_IRON_PICKAXE","ITEM_STEEL_PICKAXE","ITEM_DORONUM_PICKAXE"]:
		if game.count_item(tool_id)>0:
			_button("장착 · "+GameData.item_name(tool_id),func(): game.equip_tool(tool_id);_refresh())
	for stack in game.inventory:
		_label("%s ×%d   Q %.2f / P %.2f   %s\n%s" % [
			GameData.item_name(stack.item_id),int(stack.quantity),float(stack.quality),float(stack.purity),
			"SYNTHETIC" if stack.synthetic else "NATURAL",str(stack.provenance)
		])

func _draw_research() -> void:
	_heading("RESEARCH GRAPH  /  18 NODES")
	_label("연구소 전력이 확보된 상태에서만 진행돼. 반복 생산으로 RP를 무한 획득하지 않아.")
	_label("RESEARCH POINTS  ·  %d RP  ·  분석 샘플 %d개" % [game.research_points,game.count_item("ITEM_RESEARCH_SAMPLE")])
	_button("ANALYZE UNIQUE RESEARCH SAMPLE  ·  +1,000 RP",game.analyze_research_sample,game.count_item("ITEM_RESEARCH_SAMPLE")<=0)
	_button("ANALYZE RESEARCH BATCH  ·  20,000 RP",game.analyze_research_sample_batch,game.count_item("ITEM_RESEARCH_SAMPLE")<(19 if game.has_skill("SAMPLE_EFFICIENCY") else 20))
	for definition in GameData.RESEARCH:
		var done: bool = definition.id in game.research_completed
		var prereq_ok := true
		for prereq in definition.requires:
			if prereq not in game.research_completed:
				prereq_ok = false
		var state_text := "COMPLETE" if done else ("RUNNING" if game.active_research==definition.id else ("AVAILABLE" if prereq_ok else "LOCKED"))
		var text := "T%d  %s  ·  %s  ·  %d RP / %ds" % [int(definition.tier),definition.name,state_text,int(definition.rp),int(definition.time)]
		_button(text,func(): game.start_research(str(definition.id)),done or not prereq_ok or not game.active_research.is_empty() or game.research_points<int(definition.rp))

func _draw_skills() -> void:
	_heading("ENGINEER SPECIALIZATION  /  20 NODES")
	_label("SKILL POINTS  ·  %d available  ·  %d / 20 unlocked" % [game.skill_points,game.skills_unlocked.size()])
	_label("반복 채굴/생산으로 포인트를 얻을 수 없어. 메인 스토리, 최초 탐험, Tier 도달로 총 15점을 받아.")
	for branch in ["EXPLORATION","EXTRACTION","MANUFACTURING","LOGISTICS","RESEARCH_DORONUM"]:
		_heading(branch.replace("_"," "))
		for skill in GameData.SKILLS:
			if skill.branch!=branch:
				continue
			var unlocked: bool = skill.id in game.skills_unlocked
			var prerequisites_met := true
			for prerequisite in skill.requires:
				if prerequisite not in game.skills_unlocked:
					prerequisites_met = false
			var status := "UNLOCKED" if unlocked else ("AVAILABLE" if prerequisites_met and game.skill_points>0 else "LOCKED")
			_label("T%d  %s  ·  %s" % [int(skill.tier),skill.name,status])
			_label(str(skill.effect))
			var missing := []
			for prerequisite in skill.requires:
				if prerequisite not in game.skills_unlocked:
					missing.append(str(prerequisite))
			_button("UNLOCK · "+str(skill.name),func(): game.unlock_skill(str(skill.id)),unlocked or not prerequisites_met or game.skill_points<=0)
	_heading("SKILL RESET")
	var terminal_ready := game.buildings.any(func(m): return m.id=="SKILL_RESPEC_TERMINAL" and float(m.condition)>0.0)
	_button("USE ONE-TIME FREE RESPEC",game.respec_skill_tree,not terminal_ready or game.skill_respec_used)

func _draw_factory() -> void:
	_heading("FACTORY OVERVIEW")
	if game.has_skill("FLOW_OPTIMIZATION"):
		var bottlenecks: Array[String] = []
		for machine in game.buildings:
			if str(machine.get("state","")) in ["PAUSED_OUTPUT","WAITING_INPUT","PAUSED_POWER","BLOCKED_STORY","SUPPLY_CAP_REACHED","BROWNOUT_RUNNING"]:
				var definition: Dictionary = GameData.building_definition(str(machine.id))
				bottlenecks.append("%s · %s" % [str(definition.get("name",machine.id)),str(machine.state)])
		_label("FLOW OPTIMIZATION · TOP BOTTLENECKS")
		for index in range(mini(3,bottlenecks.size())):
			_label("%d. %s" % [index+1,bottlenecks[index]])
		if bottlenecks.is_empty():
			_label("현재 감지된 생산 병목 없음")
	_label("발전 %.0f kW  ·  소비 %.0f kW  ·  가동 가능 %.0f kW" % [
		game.total_power_generated,game.total_power_used,game.total_power_generated-game.total_power_used
	])
	if game.buildings.is_empty():
		_label("아직 설치된 설비가 없어.")
	for machine in game.buildings:
		_label("%s  ·  %s  ·  %.0f°C  ·  %.0f MPa" % [
			machine.id,machine.state,float(machine.temperature),float(machine.pressure)
		])
		if machine.output.size()>0:
			_button("출력 회수 · "+str(machine.output.size())+" batch",func(): game.collect_machine_output(str(machine.instance_id)))
		for recipe_id in GameData.RECIPES:
			var recipe: Dictionary = GameData.RECIPES[recipe_id]
			if recipe.machine == machine.id:
				_button("레시피 설정 · "+str(recipe.name),func(): game.set_machine_recipe(str(machine.instance_id),str(recipe_id)))
		for output_id in GameData.VARIANT_RECIPES:
			var variant_recipe_id := "RECIPE_"+str(output_id).replace("ITEM_","")
			var variant_recipe: Dictionary = GameData.recipe_definition(variant_recipe_id)
			if not variant_recipe.is_empty() and variant_recipe.machine == machine.id:
				_button("도로늄 레시피 · "+str(variant_recipe.name),func(): game.set_machine_recipe(str(machine.instance_id),variant_recipe_id))

func _draw_story() -> void:
	_heading("ORBIT  /  STORY ARCHIVE")
	for chapter in GameData.STORY_CHAPTERS:
		var complete := bool(game.story_flags.get(chapter.flag,false))
		_label(("%s  ✓" if complete else "%s  ·  ACTIVE") % chapter.title)
		_label(chapter.objective)
	_heading("BLUE FURNACE INCIDENT · EVIDENCE")
	for lore_id in ["LORE_INCIDENT_SAFETY_OVERRIDE","LORE_INCIDENT_POWER_OSCILLATION","LORE_INCIDENT_COOLING_FAILURE","LORE_INCIDENT_ARCHIVE_EDIT"]:
		_button("기록 복구 · "+lore_id,func(): game.find_lore(lore_id),lore_id in game.lore_found)
	_heading("FIRST FACTORY")
	for flag in ["ARCHIVE_RESTORED","COOLING_CORE_RESTORED","RESONANCE_CHAMBER_RESTORED"]:
		_label(("RESTORED  ·  " if bool(game.story_flags.get(flag,false)) else "UNRESTORED  ·  ")+flag+"  ·  interact with its physical POI")
	_button("SPECIAL EDITION · ARCHIVE PATTERN CONTRACT",game.claim_special_edition_batch_contract,bool(game._event_ids.has("CONTRACT:SPECIAL_EDITION_PATTERN_BATCH")))
	_button("LIMITED EDITION · LEGACY BATCH CONTRACT",game.claim_limited_edition_batch_contract,bool(game._event_ids.has("CONTRACT:LIMITED_EDITION_SEALS")))

func _draw_fusion() -> void:
	_heading("INFINITY FUSION  /  7 STAGES")
	_label("정확한 canonical ID 15종 × 100개 = 1,500개. 각 스택 비합성·Quality ≥90·Purity ≥90.")
	for item_id in GameData.DORONUM_IDS:
		_label("%s  %d / 100" % [GameData.item_name(item_id),game.count_item(item_id)])
	_heading("FINAL SAFETY DIAGNOSTICS")
	_label("Fusion Buffer  %.1f / 500 kWh" % float(game.power_state.get("fusion_buffer_kwh",0.0)))
	_label("독립 버퍼는 발전소의 잉여 전력으로 충전돼. 최종 진단에는 400kWh 이상이 필요해.")
	for diagnostic in ["power_stability","pressure_calibration","emergency_cooling"]:
		var passed := bool(game.fusion_diagnostics.get(diagnostic,false))
		_button("%s  ·  %s" % [diagnostic.to_upper(),"PASSED" if passed else "RUN TEST"],func(): game.run_fusion_diagnostic(diagnostic),passed)
	_heading("PRE-FLIGHT DIAGNOSTICS")
	var errors := game.fusion_preflight()
	if game.fusion.is_empty():
		for error in errors:
			_label("BLOCKED  ·  "+error,Color(1.0,0.64,0.38))
		_button("START INFINITY FUSION",game.start_infinity_fusion,not errors.is_empty())
	else:
		var stage_index := mini(int(game.fusion.stage),GameData.FUSION_STAGES.size()-1)
		var stage: Dictionary = GameData.FUSION_STAGES[stage_index]
		_label("STATE  "+str(game.fusion.state))
		_label("STAGE %d/7  ·  %s" % [stage_index+1,stage.name])
		_label("TEMP %.1f / %.0f°C" % [float(game.fusion.temperature),float(stage.temperature)])
		_label("PRESSURE %.1f / %.0f MPa" % [float(game.fusion.pressure),float(stage.pressure)])
		_label("POWER %.1f MW" % (float(stage.power)/1000.0))
		_label("STAGE PROGRESS %.1f / %.0f sec" % [float(game.fusion.stage_progress),float(stage.seconds)])
		for key in ["power","cooling","shield","emergency"]:
			var toggle := CheckButton.new()
			toggle.text = "INTERLOCK · "+key.to_upper()
			toggle.button_pressed = bool(game.fusion.interlocks.get(key,false))
			toggle.toggled.connect(func(value): game.set_fusion_interlock(key,value))
			content_box.add_child(toggle)
		if str(game.fusion.state).begins_with("FAILED"):
			_button("SAFE RECOVERY · RETURN ALL RESERVED INPUTS",game.recover_fusion_failure)
		elif game.fusion.state == "COMPLETED":
			_label("INFINITY DORONUM ×1 COMMITTED · OUTPUT BUFFER",Color(0.42,0.94,1.0))
			_button("COLLECT INFINITY DORONUM",game.collect_infinity_output,game.fusion.get("output_buffer",{}).is_empty())
	_heading("PLANETARY STABILIZATION")
	_label("Infinity 제작은 엔딩이 아니야. Relay 3개 → Core 설치 → 안정화 3단계가 필요해.")
	for i in range(3):
		var active := i < game.relays.size() and bool(game.relays[i].active)
		_button("RELAY %d  ·  %s" % [i+1,"ACTIVE" if active else "ACTIVATE"],func(): game.activate_relay(i),active or not bool(game.story_flags.get("INFINITY_CRAFTED",false)))
	_button("INSTALL INFINITY CORE",game.install_infinity_core,game.core_installed or game.relays.size()<3 or game.count_item("ITEM_INFINITY_DORONUM")<1)
	_label("STABILIZATION PHASE %d / 3  ·  %.1f sec" % [game.stabilization_phase,game.stabilization_progress])
	_button("START / RESUME STABILIZATION",game.start_stabilization_phase,not game.core_installed or game.ending_complete or game.stabilization_running)

func _draw_map() -> void:
	_heading("PLANET MAP  /  SEED %d" % game.world_seed)
	_label("월드 경계: X/Z ±1024m · 총 2048m × 2048m")
	for place in ["Dori Forest · West","Beach · South","Shipping Port · South","Oil Field · South-East","Mine Entrance · East","Quartz Canyon · North-East","Lava Zone · North-East","Frozen Zone · North-West","Research Station · East","Abandoned First Factory · North","Old Reactor"]:
		_label("◇  "+place)
	_button("FIRST FACTORY · ARCHIVE RECORD",func(): game.find_lore("FIRST_FACTORY_ARCHIVE"))

func _building_unlocked(building_id: String) -> bool:
	for definition in GameData.RESEARCH:
		if building_id in definition.unlocks and definition.id not in game.research_completed:
			return false
	return true

func _current_tier() -> int:
	var tier := 0
	for definition in GameData.RESEARCH:
		if definition.id in game.research_completed:
			tier = maxi(tier,int(definition.tier))
	return tier

func _current_objective() -> String:
	if game.ending_complete:
		return "INFINITE INDUSTRY MODE · Expand, optimize, automate."
	for chapter in GameData.STORY_CHAPTERS:
		if not bool(game.story_flags.get(chapter.flag,false)):
			return "OBJECTIVE  /  "+str(chapter.title)+" — "+str(chapter.objective)
	return "OBJECTIVE  /  Free play"

func _on_notification(message: String) -> void:
	toast_label.text = message
	_last_toast = message

func set_build_mode(active: bool, building_id: String = "") -> void:
	build_mode_label.text = "BUILD MODE  ·  "+building_id+"  ·  click ground to place" if active else ""

func open_tab(tab: String) -> void:
	_select_tab(tab)
	root.get_child(1).visible = true

func toggle_panel() -> void:
	root.get_child(1).visible = not root.get_child(1).visible
