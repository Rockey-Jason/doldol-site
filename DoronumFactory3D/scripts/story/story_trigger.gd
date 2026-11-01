extends Area3D
class_name StoryTrigger3D

@export var event_id := "FIRST_FACTORY_ARCHIVE"
@export var title := "First Factory Archive"
@export_multiline var orbit_line := "Historical archive recovered."
var _completed := false

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	monitoring = true

func _on_body_entered(body: Node3D) -> void:
	if _completed or not body.is_in_group("player"):
		return
	_completed = GameState.register_world_event("LORE:"+event_id)
	if not _completed:
		return
	GameState.progress_objective("LORE_DISCOVERED",event_id)
	get_tree().call_group("story_manager","notify_lore",event_id,title,orbit_line)

