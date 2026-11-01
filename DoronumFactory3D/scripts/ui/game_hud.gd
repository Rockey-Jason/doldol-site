extends CanvasLayer
class_name GameHUD3D

var player: PlayerController3D
var factory: FactoryManager3D
var story: StoryManager3D
var contracts: ContractManager3D
var current_panel := "build"
var panel_open := true
var selected_tab := "build"
var _panel: PanelContainer
var _panel_content: VBoxContainer
var _top_status: HBoxContainer
var _toast_stack: VBoxContainer
var _quest_title: Label
var _quest_desc: Label
var _orbit_label: Label
var _mobile_joystick: Control
var _joystick_origin := Vector2.ZERO
var _joystick_touch_id := -1
var _right_touch_id := -1
var _right_last := Vector2.ZERO
var _joystick_knob: ColorRect
var _mobile_interact: Button
var _machine_detail_id := ""

const TAB_META := [
	{"id":"build","text":"건설","icon":"▦"},
	{"id":"craft","text":"제작","icon":"⚒"},
	{"id":"inventory","text":"창고","icon":"▤"},
	{"id":"research","text":"연구","icon":"⌬"},
	{"id":"skills","text":"스킬","icon":"✧"},
	{"id":"missions","text":"임무","icon":"◈"},
	{"id":"contracts","text":"계약","icon":"⇧"}
]

func setup(p_player: PlayerController3D,p_factory: FactoryManager3D,p_story: StoryManager3D,p_contracts: ContractManager3D) -> void:
	player = p_player
	factory = p_factory
	story = p_story
	contracts = p_contracts

func _ready() -> void:
	add_to_group("game_hud")
	_build_interface()
	GameState.inventory_changed.connect(refresh_top)
	GameState.progression_changed.connect(refresh_top)
	GameState.objective_changed.connect(_refresh_current_panel)
	GameState.toast_requested.connect(show_toast)
	factory.machine_selected.connect(_on_machine_selected)
	factory.building_placed.connect(_on_building_placed)
	factory.power_summary_changed.connect(_on_power_changed)
	story.dialogue_changed.connect(_on_dialogue_changed)
	story.quest_changed.connect(_on_quest_changed)
	contracts.contracts_changed.connect(_on_contracts_changed)
	_refresh_current_panel()
	refresh_top()

func _build_interface() -> void:
	var root := Control.new()
	root.name = "HUDRoot"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	_top_status = HBoxContainer.new()
	_top_status.anchor_left = 0.0
	_top_status.anchor_right = 1.0
	_top_status.offset_left = 16
	_top_status.offset_right = -16
	_top_status.offset_top = 12
	_top_status.offset_bottom = 62
	_top_status.add_theme_constant_override("separation",10)
	root.add_child(_top_status)
	_build_top_bar()

	var tab_row := HBoxContainer.new()
	tab_row.anchor_left = 0.0
	tab_row.offset_left = 16
	tab_row.anchor_top = 0.0
	tab_row.offset_top = 76
	tab_row.offset_bottom = 122
	tab_row.add_theme_constant_override("separation",6)
	root.add_child(tab_row)
	for meta in TAB_META:
		var tab := _button(str(meta.icon)+"  "+str(meta.text),Color(0.07,0.15,0.21),Color(0.72,0.9,0.93))
		tab.custom_minimum_size = Vector2(98,42)
		tab.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		tab.pressed.connect(func(): toggle_panel(str(meta.id)))
		tab_row.add_child(tab)

	_panel = PanelContainer.new()
	_panel.anchor_left = 1.0
	_panel.anchor_right = 1.0
	_panel.anchor_top = 0.0
	_panel.anchor_bottom = 1.0
	_panel.offset_left = -408
	_panel.offset_right = -16
	_panel.offset_top = 134
	_panel.offset_bottom = -94
	_panel.add_theme_stylebox_override("panel",_panel_style(Color(0.035,0.075,0.105,0.96),Color(0.18,0.36,0.44,0.95),16))
	root.add_child(_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left",14)
	margin.add_theme_constant_override("margin_right",14)
	margin.add_theme_constant_override("margin_top",12)
	margin.add_theme_constant_override("margin_bottom",12)
	_panel.add_child(margin)
	_panel_content = VBoxContainer.new()
	_panel_content.add_theme_constant_override("separation",10)
	margin.add_child(_panel_content)

	var bottom_hint := Label.new()
	bottom_hint.text = "WASD 이동  ·  마우스 우클릭 회전 / 휠 줌  ·  E 상호작용  ·  B 건설  ·  I 창고  ·  T 연구  ·  M 임무"
	bottom_hint.anchor_left = 0.0
	bottom_hint.anchor_right = 1.0
	bottom_hint.anchor_top = 1.0
	bottom_hint.anchor_bottom = 1.0
	bottom_hint.offset_left = 16
	bottom_hint.offset_right = -16
	bottom_hint.offset_top = -64
	bottom_hint.offset_bottom = -36
	bottom_hint.add_theme_font_size_override("font_size",11)
	bottom_hint.add_theme_color_override("font_color",Color(0.67,0.79,0.82))
	root.add_child(bottom_hint)

	_quest_title = Label.new()
	_quest_title.position = Vector2(18,132)
	_quest_title.add_theme_font_size_override("font_size",14)
	_quest_title.add_theme_color_override("font_color",Color(0.95,0.82,0.53))
	root.add_child(_quest_title)
	_quest_desc = Label.new()
	_quest_desc.position = Vector2(18,154)
	_quest_desc.custom_minimum_size = Vector2(360,38)
	_quest_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_quest_desc.add_theme_font_size_override("font_size",11)
	_quest_desc.add_theme_color_override("font_color",Color(0.8,0.87,0.87))
	root.add_child(_quest_desc)

	_orbit_label = Label.new()
	_orbit_label.anchor_left = 0.0
	_orbit_label.anchor_right = 0.48
	_orbit_label.anchor_top = 1.0
	_orbit_label.anchor_bottom = 1.0
	_orbit_label.offset_left = 18
	_orbit_label.offset_right = 0
	_orbit_label.offset_top = -112
	_orbit_label.offset_bottom = -72
	_orbit_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_orbit_label.add_theme_font_size_override("font_size",11)
	_orbit_label.add_theme_color_override("font_color",Color(0.53,0.83,0.86))
	root.add_child(_orbit_label)

	_toast_stack = VBoxContainer.new()
	_toast_stack.anchor_left = 0.5
	_toast_stack.anchor_right = 0.5
	_toast_stack.anchor_top = 0.0
	_toast_stack.anchor_bottom = 0.0
	_toast_stack.offset_left = -170
	_toast_stack.offset_right = 170
	_toast_stack.offset_top = 72
	_toast_stack.offset_bottom = 240
	_toast_stack.add_theme_constant_override("separation",5)
	root.add_child(_toast_stack)

	_build_mobile_controls(root)
	apply_responsive_layout()
	get_viewport().size_changed.connect(apply_responsive_layout)

func _build_top_bar() -> void:
	var panel := PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_theme_stylebox_override("panel",_panel_style(Color(0.035,0.075,0.105,0.91),Color(0.16,0.31,0.39,0.85),12))
	_top_status.add_child(panel)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",20)
	row.add_theme_constant_override("margin_left",14)
	panel.add_child(row)
	var brand := Label.new()
	brand.text = "DORONUM FACTORY  /  INFINITE INDUSTRY"
	brand.add_theme_font_size_override("font_size",14)
	brand.add_theme_color_override("font_color",Color(0.75,0.96,0.96))
	brand.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(brand)
	for key in ["wood","stone","iron","doronum","money","power","research","tier"]:
		var label := Label.new()
		label.name = "Status_"+key
		label.add_theme_font_size_override("font_size",12)
		label.add_theme_color_override("font_color",Color(0.91,0.82,0.58) if key=="money" or key=="doronum" else Color(0.78,0.88,0.9))
		row.add_child(label)
	_refresh_top_row(row)

func _refresh_top_row(row: HBoxContainer) -> void:
	for key in ["wood","stone","iron","doronum","money","power","research","tier"]:
		var label := row.get_node_or_null("Status_"+key) as Label
		if not label:
			continue
		match key:
			"wood": label.text = "🪵 %s" % GameState.count_item("ITEM_WOOD")
			"stone": label.text = "◈ %s" % GameState.count_item("ITEM_STONE")
			"iron": label.text = "Fe %s" % GameState.count_item("ITEM_IRON")
			"doronum": label.text = "⬡ %s" % _total_doronum()
			"money": label.text = "D %s" % GameState.currency_d
			"power":
				var p := factory.get_power_stats()
				label.text = "⚡ %s/%s kW" % [snappedf(float(p.generation_kw),1.0),snappedf(float(p.consumption_kw),1.0)]
			"research": label.text = "RP %s" % GameState.research_points
			"tier": label.text = "TIER %d" % GameState.current_tier()

func refresh_top() -> void:
	if is_instance_valid(_top_status) and _top_status.get_child_count()>0:
		var panel := _top_status.get_child(0)
		var row := panel.get_child(0) as HBoxContainer
		if row:
			_refresh_top_row(row)

func _total_doronum() -> int:
	var total := 0
	for item_id in GameState.DORONUM_IDS:
		total += GameState.count_item(item_id)
	return total

func toggle_panel(panel_id: String) -> void:
	if panel_id == "pause":
		toggle_pause()
		return
	if selected_tab == panel_id and panel_open:
		panel_open = false
	else:
		selected_tab = panel_id
		panel_open = true
	_refresh_current_panel()
	apply_responsive_layout()

func toggle_pause() -> void:
	GameState.paused = not GameState.paused
	show_toast("시뮬레이션 일시정지" if GameState.paused else "시뮬레이션 재개","info")

func _refresh_current_panel() -> void:
	if not is_instance_valid(_panel_content):
		return
	for child in _panel_content.get_children():
		child.queue_free()
	_panel.visible = panel_open
	if not panel_open:
		return
	match selected_tab:
		"build": _render_build_panel()
		"craft": _render_craft_panel()
		"inventory": _render_inventory_panel()
		"research": _render_research_panel()
		"skills": _render_skill_panel()
		"missions": _render_missions_panel(),
		"contracts": _render_contracts_panel()
		"machine": _render_machine_panel()

func _render_build_panel() -> void:
	_add_panel_heading("BUILD NETWORK","설비를 골라 3D 월드의 바닥을 탭해 설치합니다.")
	var list := ScrollContainer.new()
	list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(list)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation",7)
	grid.add_theme_constant_override("v_separation",7)
	list.add_child(grid)
	for machine_type in GameState.MACHINE_DEFS:
		var data: Dictionary = GameState.MACHINE_DEFS[machine_type]
		if int(data.get("tier",0)) > GameState.current_tier():
			continue
		var afford := GameState.can_afford(data.get("cost",{})) and GameState.machine_unlocks_met(str(machine_type))
		var button := _button("%s\n%s\nTier %d · %dm×%dm" % [str(data.name),_cost_text(data.cost),int(data.tier),int(data.footprint.x)*2,int(data.footprint.y)*2],Color(0.08,0.16,0.22),Color(0.84,0.92,0.92))
		button.custom_minimum_size = Vector2(170,82)
		button.disabled = not afford
		button.pressed.connect(func(): factory.begin_build(str(machine_type)))
		grid.add_child(button)
	var cancel := _button("배치 취소  ·  ESC",Color(0.22,0.1,0.11),Color(1.0,0.76,0.72))
	cancel.pressed.connect(factory.cancel_build)
	_panel_content.add_child(cancel)

func _render_craft_panel() -> void:
	_add_panel_heading("WORKSHOP & RECIPES","레시피를 해금하고 실제 설비에서 생산합니다.")
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation",7)
	scroll.add_child(list)
	for recipe_id in GameState.RECIPES:
		var recipe: Dictionary = GameState.RECIPES[recipe_id]
		var inputs := _cost_text(recipe.inputs)
		var outputs := _cost_text(recipe.outputs)
		var machine_name := str(recipe.machine) if not str(recipe.machine).is_empty() else "수동 제작"
		var button := _button("%s  ·  %s\n%s  →  %s\n%s · %ds" % [str(recipe_id),machine_name,inputs,outputs,str(recipe.get("tier",0)),int(recipe.seconds)],Color(0.08,0.16,0.22),Color(0.86,0.94,0.94))
		button.custom_minimum_size = Vector2(330,67)
		button.pressed.connect(func(): _craft_recipe(str(recipe_id)))
		list.add_child(button)

func _craft_recipe(recipe_id: String) -> void:
	var recipe: Dictionary = GameState.RECIPES.get(recipe_id,{})
	if not recipe.is_empty() and not str(recipe.get("machine","")).is_empty():
		show_toast("이 레시피는 %s에서 실행해야 합니다. 설비를 선택하고 레시피를 지정하세요." % str(recipe.machine),"warning")
		return
	GameState.craft(recipe_id)
	_refresh_current_panel()
	refresh_top()

func _render_inventory_panel() -> void:
	_add_panel_heading("WAREHOUSE / ITEM STACKS","아이템별 수량, 품질, 순도, 합성 계보를 확인합니다.")
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	var stacks: Array[Dictionary] = GameState.inventory.duplicate(true)
	stacks.sort_custom(func(a: Dictionary,b: Dictionary) -> bool:
		return str(a.item_id) < str(b.item_id))
	for stack in stacks:
		var data: Dictionary = GameState.ITEM_DATA.get(str(stack.item_id),{"name":str(stack.item_id)})
		var text := "%s  ×%d\nQ %.1f  ·  P %.1f  ·  %s\n%s" % [str(data.name),int(stack.quantity),float(stack.quality),float(stack.purity),"SYNTHETIC" if bool(stack.synthetic) else "NATURAL",str(stack.origin)]
		var label := _text_card(text)
		list.add_child(label)
	var tool_box := _button("나무 곡괭이 장착" if GameState.player_state.equipped_tool != "ITEM_WOODEN_PICKAXE" else "나무 곡괭이 장착 중",Color(0.13,0.25,0.29),Color(0.9,0.95,0.9))
	tool_box.disabled = GameState.count_item("ITEM_WOODEN_PICKAXE") <= 0
	tool_box.pressed.connect(func():
		GameState.player_state.equipped_tool = "ITEM_WOODEN_PICKAXE"
		show_toast("Wooden Pickaxe 장착 완료","success")
	)
	_panel_content.add_child(tool_box)

func _render_research_panel() -> void:
	_add_panel_heading("RESEARCH TREE","18개의 정식 연구. 선행 조건과 RP를 충족해야 시작할 수 있습니다.")
	var meter := _text_card("RESEARCH POINTS  %d RP\nCOMPLETED  %d / 18" % [GameState.research_points,GameState.completed_research.size()])
	_panel_content.add_child(meter)
	if not GameState.active_research.is_empty():
		_panel_content.add_child(_text_card("진행 중: "+GameState.active_research+"  ·  %.1f초" % GameState.research_progress))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(scroll)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation",6)
	scroll.add_child(list)
	for research in GameState.RESEARCH:
		var state := GameState.research_state(research)
		var text := "TIER %d · %s\n%d RP · %d SEC · %s" % [int(research.tier),str(research.name),int(research.rp),int(research.seconds),state]
		var button := _button(text,Color(0.08,0.16,0.22),Color(0.86,0.93,0.94))
		button.custom_minimum_size = Vector2(330,58)
		button.disabled = state != "AVAILABLE" or not GameState.active_research.is_empty()
		button.pressed.connect(func(): GameState.start_research(str(research.id)); _refresh_current_panel())
		list.add_child(button)

func _render_skill_panel() -> void:
	_add_panel_heading("SKILL TREE · 20 NODES","탐험·채굴·제조·물류·연구 5개 분야. 총 15 포인트.")
	var points := _text_card("AVAILABLE SKILL POINTS  %d / 15" % GameState.skill_points)
	_panel_content.add_child(points)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(scroll)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation",7)
	scroll.add_child(list)
	var branches := ["Exploration","Extraction","Manufacturing","Logistics","Research & Doronum"]
	for branch in branches:
		var header := Label.new()
		header.text = branch.to_upper()
		header.add_theme_font_size_override("font_size",12)
		header.add_theme_color_override("font_color",Color(0.9,0.76,0.47))
		list.add_child(header)
		for skill in GameState.SKILLS:
			if str(skill.branch) != branch:
				continue
			var owned := GameState.purchased_skills.has(str(skill.id))
			var available := true
			for prerequisite in skill.requires:
				if not GameState.purchased_skills.has(str(prerequisite)):
					available = false
			var button := _button("%s\n%s\n%s" % [str(skill.id),str(skill.effect),"PURCHASED" if owned else "AVAILABLE" if available else "LOCKED"],Color(0.08,0.16,0.22),Color(0.84,0.93,0.94))
			button.custom_minimum_size = Vector2(330,59)
			button.disabled = owned or not available or GameState.skill_points <= 0
			button.pressed.connect(func(): GameState.purchase_skill(str(skill.id)); _refresh_current_panel())
			list.add_child(button)

func _render_missions_panel() -> void:
	_add_panel_heading("ORBIT MISSION CONTROL","30년 전 BLUE FURNACE INCIDENT의 진실을 밝혀내세요.")
	_panel_content.add_child(_text_card("ACT %d  ·  %s" % [story.current_act,story.ACTS[story.current_act-1].title]))
	_panel_content.add_child(_text_card("ORBIT  ·  "+story.orbit_status+"\n"+story.last_dialogue))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(scroll)
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation",6)
	scroll.add_child(list)
	for i in range(story.QUESTS.size()):
		var quest: Dictionary = story.QUESTS[i]
		var complete := GameState.story_flags.has(str(quest.event))
		var state := "완료" if complete else "진행 중" if i == story.current_quest_index else "잠김"
		list.add_child(_text_card("%s  ·  %s\n%s\n%s" % [str(quest.id),str(quest.title),str(quest.description),state]))

func _render_contracts_panel() -> void:
	_add_panel_heading("CONTRACTS & SHIPPING","자격 조건을 확인하고, 품질·순도를 검사한 뒤 포장·출하합니다.")
	var summary := _text_card("출하 계약은 예약 → 포장 → 운송 → 배송 순서로 진행됩니다. 같은 계약 보상은 한 번만 정산됩니다.")
	_panel_content.add_child(summary)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_panel_content.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation",8)
	scroll.add_child(list)
	for contract in contracts.list_contracts():
		var status_text := str(contract.state)
		var remaining := float(contract.get("remaining_seconds",0.0))
		var detail := "%s  ·  %s\n%s\n요구품: %s\n최소 Quality %.0f / Purity %.0f\n보상: %s · %d RP · %d D\n포장: %s · 상태: %s" % [
			str(contract.category),str(contract.title),str(contract.description),
			_cost_text(contract.inputs),float(contract.minimum_quality),float(contract.minimum_purity),
			_cost_text(contract.rewards),int(contract.rp),int(contract.currency_d),str(contract.packing),status_text
		]
		if status_text == "IN_TRANSIT":
			detail += "\n운송 잔여 시간: %.1f초" % remaining
		var card := _text_card(detail)
		list.add_child(card)
		if status_text == "NOT_SHIPPED":
			var accept := _button("계약 수락",Color(0.12,0.23,0.24),Color(0.83,0.95,0.92))
			accept.disabled = not bool(contract.prerequisites_met)
			accept.pressed.connect(func(): contracts.accept_contract(str(contract.id)); _refresh_current_panel())
			list.add_child(accept)
		elif status_text == "RESERVED":
			var ship := _button("품질 검사 · 포장 및 출하",Color(0.2,0.17,0.09),Color(0.98,0.86,0.6))
			ship.pressed.connect(func(): contracts.pack_and_ship(str(contract.id)); _refresh_current_panel())
			list.add_child(ship)
		elif status_text == "DELIVERED":
			var delivered := Label.new()
			delivered.text = "✓ 정산 완료 · 재접속해도 보상은 중복 지급되지 않습니다."
			delivered.add_theme_color_override("font_color",Color(0.52,0.86,0.69))
			delivered.add_theme_font_size_override("font_size",10)
			list.add_child(delivered)

func _render_machine_panel() -> void:
	_add_panel_heading("MACHINE OPERATIONS","선택 시설의 생산 버퍼와 상태를 제어합니다.")
	var record := factory.get_selected_record()
	if record.is_empty():
		_panel_content.add_child(_text_card("월드에서 설비를 선택하세요."))
		return
	_panel_content.add_child(_text_card("%s\n%s  ·  POWER %.0f%%\nQ %.1f / P %.1f" % [str(GameState.MACHINE_DEFS.get(str(record.type),{}).get("name",record.type)),str(record.get("status","IDLE")),float(record.get("power_ratio",1.0))*100.0,float(record.get("quality",0.0)),float(record.get("purity",0.0))]))
	_panel_content.add_child(_text_card("INPUT BUFFER\n%s\nOUTPUT BUFFER\n%s" % [str(record.get("input_buffer",{})),str(record.get("output_buffer",{}))]))
	var recipe_selector := OptionButton.new()
	recipe_selector.add_item("레시피 선택")
	var selected_recipe_index := 0
	var item_index := 1
	for recipe_id in GameState.RECIPES:
		var recipe: Dictionary = GameState.RECIPES[recipe_id]
		if str(recipe.get("machine","")) != str(record.type):
			continue
		if int(recipe.get("tier",0)) > GameState.current_tier():
			continue
		recipe_selector.add_item(str(recipe_id))
		if str(record.get("recipe_id","")) == str(recipe_id):
			selected_recipe_index = item_index
		item_index += 1
	if selected_recipe_index > 0:
		recipe_selector.select(selected_recipe_index)
	recipe_selector.item_selected.connect(func(index: int):
		if index <= 0:
			return
		factory.selected_machine_action("recipe",recipe_selector.get_item_text(index))
		_refresh_current_panel()
	)
	_panel_content.add_child(recipe_selector)
	var actions := [
		["supply","창고에서 원료 투입"],
		["collect","출력 버퍼 회수"],
		["rotate","방향 90° 회전"],
		["fuel","석탄 1개 연료 투입"],
		["repair","철판 2개로 수리"],
		["remove","시설 해체 · 50% 환급"]
	]
	for action in actions:
		var button := _button(str(action[1]),Color(0.09,0.18,0.23),Color(0.88,0.93,0.94))
		button.pressed.connect(func(): factory.selected_machine_action(str(action[0])); _refresh_current_panel())
		_panel_content.add_child(button)
	if str(record.type) == "GENERATOR":
		var fuel_all := _button("전체 발전기 연료 300초분 충전",Color(0.18,0.2,0.1),Color(0.94,0.9,0.63))
		fuel_all.pressed.connect(func(): factory.fuel_all_generators(300.0); refresh_top())
		_panel_content.add_child(fuel_all)
	if str(record.type) == "INFINITY_FUSION_MACHINE":
		_panel_content.add_child(_text_card("INFINITY FUSION · 7 STAGES / 260s IDEAL\nStage %d / 7 · %.1fs\nTemperature %.0f°C · Pressure %.0fMPa" % [int(GameState.fusion_job.get("stage_index",0))+1,float(GameState.fusion_job.get("stage_progress",0.0)),float(GameState.fusion_job.get("temperature_c",20.0)),float(GameState.fusion_job.get("pressure_mpa",0.0))]))
		for test_id in ["power","pressure","cooling"]:
			var test_label: String = str({"power":"5MW 전력 안정성 시험 · 30초","pressure":"압력 센서 7채널 교정","cooling":"비상 냉각 부하 시험 · 20초"}.get(test_id,test_id))
			var tests: Dictionary = GameState.story_flags.get("FUSION_PREFLIGHT",{})
			var passed := bool(tests.get(test_id,{}).get("passed",false))
			var running: Dictionary = GameState.story_flags.get("FUSION_PREFLIGHT_RUNNING",{})
			var test_button := _button(("✓ " if passed else "○ ")+test_label,Color(0.12,0.2,0.19),Color(0.82,0.95,0.86))
			test_button.disabled = passed or (not running.is_empty())
			test_button.pressed.connect(func(): factory.run_preflight_test(test_id); _refresh_current_panel())
			_panel_content.add_child(test_button)
		var fusion := _button("INFINITY FUSION START · 15 × 100",Color(0.28,0.22,0.1),Color(1.0,0.85,0.51))
		fusion.disabled = bool(GameState.fusion_job.get("running",false)) or bool(GameState.fusion_job.get("completed",false))
		fusion.pressed.connect(func(): factory.start_infinity_fusion(); _refresh_current_panel())
		_panel_content.add_child(fusion)
	if str(record.type) == "STABILIZATION_CORE":
		var core := _button("인피니티 도로늄 설치",Color(0.1,0.24,0.27),Color(0.6,0.95,0.94))
		core.pressed.connect(func(): factory.install_infinity_core())
		_panel_content.add_child(core)

func _add_panel_heading(kicker: String, description: String) -> void:
	var kicker_label := Label.new()
	kicker_label.text = kicker
	kicker_label.add_theme_font_size_override("font_size",10)
	kicker_label.add_theme_color_override("font_color",Color(0.43,0.79,0.84))
	_panel_content.add_child(kicker_label)
	var desc := Label.new()
	desc.text = description
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.add_theme_font_size_override("font_size",11)
	desc.add_theme_color_override("font_color",Color(0.72,0.84,0.86))
	_panel_content.add_child(desc)

func _cost_text(cost: Dictionary) -> String:
	var chunks: Array[String] = []
	for item_id in cost:
		var data: Dictionary = GameState.ITEM_DATA.get(str(item_id),{"name":str(item_id)})
		chunks.append("%s×%d" % [str(data.name),int(cost[item_id])])
	return " · ".join(chunks)

func _button(text_value: String, background: Color, foreground: Color) -> Button:
	var button := Button.new()
	button.text = text_value
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.add_theme_font_size_override("font_size",11)
	button.add_theme_color_override("font_color",foreground)
	button.add_theme_color_override("font_hover_color",Color.WHITE)
	button.add_theme_color_override("font_disabled_color",Color(0.35,0.43,0.45))
	button.add_theme_stylebox_override("normal",_panel_style(background,Color(0.2,0.4,0.46,0.8),9))
	button.add_theme_stylebox_override("hover",_panel_style(background.lightened(0.18),Color(0.35,0.74,0.8),9))
	button.add_theme_stylebox_override("pressed",_panel_style(background.darkened(0.12),Color(0.64,0.87,0.82),9))
	button.add_theme_stylebox_override("disabled",_panel_style(Color(0.05,0.09,0.12),Color(0.1,0.19,0.22),9))
	return button

func _text_card(text_value: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel",_panel_style(Color(0.07,0.13,0.18),Color(0.16,0.31,0.38),8))
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left",10)
	margin.add_theme_constant_override("margin_right",10)
	margin.add_theme_constant_override("margin_top",8)
	margin.add_theme_constant_override("margin_bottom",8)
	panel.add_child(margin)
	var label := Label.new()
	label.text = text_value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size",10)
	label.add_theme_color_override("font_color",Color(0.84,0.91,0.92))
	margin.add_child(label)
	return panel

func _panel_style(background: Color, border: Color, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 6
	style.content_margin_right = 6
	style.content_margin_top = 4
	style.content_margin_bottom = 4
	return style

func _build_mobile_controls(root: Control) -> void:
	_mobile_joystick = Control.new()
	_mobile_joystick.name = "MobileTouchControls"
	_mobile_joystick.anchor_left = 0.0
	_mobile_joystick.anchor_right = 0.0
	_mobile_joystick.anchor_top = 1.0
	_mobile_joystick.anchor_bottom = 1.0
	_mobile_joystick.offset_left = 18
	_mobile_joystick.offset_right = 188
	_mobile_joystick.offset_top = -205
	_mobile_joystick.offset_bottom = -18
	_mobile_joystick.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_mobile_joystick)
	var base := ColorRect.new()
	base.color = Color(0.08,0.18,0.22,0.48)
	base.size = Vector2(150,150)
	base.position = Vector2(0,0)
	base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mobile_joystick.add_child(base)
	_joystick_knob = ColorRect.new()
	_joystick_knob.color = Color(0.48,0.8,0.82,0.75)
	_joystick_knob.size = Vector2(58,58)
	_joystick_knob.position = Vector2(46,46)
	_joystick_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mobile_joystick.add_child(_joystick_knob)
	_mobile_interact = _button("E",Color(0.1,0.28,0.3),Color(0.9,1,1))
	_mobile_interact.anchor_left = 1.0
	_mobile_interact.anchor_right = 1.0
	_mobile_interact.anchor_top = 1.0
	_mobile_interact.anchor_bottom = 1.0
	_mobile_interact.offset_left = -100
	_mobile_interact.offset_right = -22
	_mobile_interact.offset_top = -116
	_mobile_interact.offset_bottom = -38
	_mobile_interact.pressed.connect(func(): player.interact_from_ui())
	root.add_child(_mobile_interact)
	_mobile_joystick.set_process_input(true)

func _input(event: InputEvent) -> void:
	if not _mobile_joystick or not _mobile_joystick.is_visible_in_tree():
		return
	if event is InputEventScreenTouch:
		if event.pressed and event.position.x < get_viewport().get_visible_rect().size.x*0.42 and event.position.y > get_viewport().get_visible_rect().size.y*0.55:
			_joystick_touch_id = event.index
			_joystick_origin = event.position
			_set_joystick(Vector2.ZERO)
			get_viewport().set_input_as_handled()
		elif event.pressed and event.position.x > get_viewport().get_visible_rect().size.x*0.6:
			_right_touch_id = event.index
			_right_last = event.position
		elif not event.pressed and event.index == _joystick_touch_id:
			_joystick_touch_id = -1
			_set_joystick(Vector2.ZERO)
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == _right_touch_id:
			_right_touch_id = -1
	if event is InputEventScreenDrag:
		if event.index == _joystick_touch_id:
			_set_joystick((event.position-_joystick_origin)/58.0)
			get_viewport().set_input_as_handled()
		elif event.index == _right_touch_id:
			player.set_mobile_look(event.relative)
			_right_last = event.position

func _set_joystick(value: Vector2) -> void:
	var limited := value.limit_length(1.0)
	player.set_mobile_move(limited)
	_joystick_knob.position = Vector2(46,46)+limited*40.0

func apply_responsive_layout() -> void:
	if not is_instance_valid(_panel):
		return
	var size := get_viewport().get_visible_rect().size
	var mobile := size.x < 850.0
	if mobile:
		_panel.offset_left = -minf(355.0,size.x*0.94)
		_panel.offset_right = -8
		_panel.offset_top = 132
		_panel.offset_bottom = -230
		_mobile_joystick.visible = true
		_mobile_interact.visible = true
		_quest_title.position = Vector2(18,128)
		_quest_desc.position = Vector2(18,149)
		_quest_desc.custom_minimum_size.x = size.x*0.78
		_orbit_label.anchor_right = 0.92
		_orbit_label.offset_top = -165
	else:
		_panel.offset_left = -408
		_panel.offset_right = -16
		_panel.offset_top = 134
		_panel.offset_bottom = -94
		_mobile_joystick.visible = false
		_mobile_interact.visible = false
		_quest_desc.custom_minimum_size.x = 420
		_orbit_label.anchor_right = 0.45
		_orbit_label.offset_top = -112

func _on_machine_selected(machine_id: String) -> void:
	_machine_detail_id = machine_id
	toggle_panel("machine")

func _on_contracts_changed() -> void:
	if selected_tab == "contracts":
		_refresh_current_panel()
	refresh_top()

func _on_building_placed(_machine_type: String,_instance_id: String) -> void:
	refresh_top()
	_refresh_current_panel()

func _on_power_changed(_generation: float,_consumption: float,_ratio: float) -> void:
	refresh_top()

func _on_dialogue_changed(speaker: String,line: String) -> void:
	_orbit_label.text = speaker+"  ·  "+line

func _on_quest_changed(title: String,description: String,_progress: float) -> void:
	_quest_title.text = "CURRENT OBJECTIVE  ·  "+title
	_quest_desc.text = description

func show_toast(message: String,severity: String = "info") -> void:
	if not is_instance_valid(_toast_stack):
		return
	var label := Label.new()
	label.text = message
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size",12)
	var color := Color(0.72,0.94,0.87)
	if severity == "warning":
		color = Color(0.98,0.79,0.45)
	elif severity == "error":
		color = Color(1.0,0.46,0.42)
	label.add_theme_color_override("font_color",color)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel",_panel_style(Color(0.02,0.055,0.08,0.96),color,8))
	panel.add_child(label)
	_toast_stack.add_child(panel)
	while _toast_stack.get_child_count()>4:
		_toast_stack.get_child(0).queue_free()
	get_tree().create_timer(3.0).timeout.connect(func():
		if is_instance_valid(panel):
			panel.queue_free()
	)

