extends Node
class_name ContractManager3D

signal contracts_changed
signal shipment_updated(contract_id: String, status: String)

const CONTRACTS: Array[Dictionary] = [
	{
		"id":"CONTRACT_INDUSTRIAL_SUPPLY",
		"title":"Industrial Supply Order",
		"category":"Industrial",
		"description":"폐허 복구 기지에 기초 산업 부품을 납품합니다.",
		"requires_research":["RESEARCH_MECHANICAL_PROCESSING"],
		"requires_story":[],
		"inputs":{"ITEM_STEEL_PLATE":10,"ITEM_GEAR":10,"ITEM_COPPER_WIRE":20},
		"minimum_quality":70.0,"minimum_purity":70.0,"transit_seconds":20.0,
		"rewards":{"ITEM_BATTERY":4},"rp":2000,"currency_d":20000,
		"packing":"BOX","one_time":true
	},
	{
		"id":"CONTRACT_ADVANCED_COMPONENTS",
		"title":"Advanced Control Components",
		"category":"Advanced",
		"description":"ORBIT 복구 네트워크용 고급 제어 부품을 납품합니다.",
		"requires_research":["RESEARCH_ADVANCED_CIRCUITS"],
		"requires_story":[],
		"inputs":{"ITEM_ADVANCED_CIRCUIT":10,"ITEM_CONTROL_MODULE":5,"ITEM_SENSOR":10},
		"minimum_quality":80.0,"minimum_purity":80.0,"transit_seconds":35.0,
		"rewards":{"ITEM_CONTROL_MODULE":5},"rp":5000,"currency_d":50000,
		"packing":"SECURE_CONTAINER","one_time":true
	},
	{
		"id":"CONTRACT_DORONUM_QUALITY",
		"title":"Verified Doronium Sample Batch",
		"category":"Doronum",
		"description":"비합성 도로늄의 품질·순도 검증 배치를 연구 기관으로 보냅니다.",
		"requires_research":["RESEARCH_DORONUM_ENGINEERING"],
		"requires_story":["FIRST_DORONUM_OUTPUT"],
		"inputs":{"ITEM_DORONUM_NORMAL":10},
		"minimum_quality":90.0,"minimum_purity":90.0,"transit_seconds":45.0,
		"rewards":{"ITEM_DORONUM_YELLOW":2,"ITEM_DORONUM_BLUE":2},"rp":7500,"currency_d":100000,
		"packing":"DORONUM_ISOLATION","one_time":true
	},
	{
		"id":"CONTRACT_SECURITY_ARCHIVE",
		"title":"First Factory Security Archive",
		"category":"First Factory",
		"description":"복구한 First Factory 기록을 검증하고 보안 패턴을 인계합니다.",
		"requires_research":["RESEARCH_DORONUM_CRYSTAL"],
		"requires_story":["INFINITY_PROJECT_REVEALED"],
		"inputs":{"ITEM_DORONUM_YELLOW":5,"ITEM_ADVANCED_CIRCUIT":10},
		"minimum_quality":85.0,"minimum_purity":85.0,"transit_seconds":60.0,
		"rewards":{"ITEM_ARCHIVE_PATTERN":100},"rp":10000,"currency_d":150000,
		"packing":"SECURE_CONTAINER","one_time":true
	},
	{
		"id":"CONTRACT_LEGACY_BATCH_SEAL",
		"title":"Legacy Batch Authorization",
		"category":"Limited Edition",
		"description":"FIRST FACTORY의 Legacy Batch Line에 사용할 봉인 승인서를 받습니다.",
		"requires_research":["RESEARCH_DORONUM_FUSION"],
		"requires_story":["INFINITY_PROJECT_REVEALED","FIRST_FACTORY_RESONANCE_CHAMBER"],
		"inputs":{"ITEM_DORONUM_ULTRA":5,"ITEM_DORONUM_TRANSLUCENT":5,"ITEM_DORONUM_BLACK":5},
		"minimum_quality":90.0,"minimum_purity":90.0,"transit_seconds":90.0,
		"rewards":{"ITEM_CONTRACT_SEAL":100},"rp":15000,"currency_d":300000,
		"packing":"INFINITY_ISOLATION","one_time":true
	}
]

var contract_state: Dictionary = {}
var shipments: Dictionary = {}

func _ready() -> void:
	add_to_group("contract_manager")
	contract_state = GameState.world_state.get("contract_state",{})
	shipments = GameState.world_state.get("shipments",{})
	GameState.tick_advanced.connect(_on_tick)
	_persist_state()

func list_contracts() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for definition in CONTRACTS:
		var record: Dictionary = _record_for(str(definition.id))
		var merged: Dictionary = definition.duplicate(true)
		merged["state"] = str(record.get("state","NOT_SHIPPED"))
		merged["shipment"] = str(record.get("shipment_id",""))
		merged["remaining_seconds"] = float(shipments.get(str(record.get("shipment_id","")),{}).get("remaining_seconds",0.0))
		merged["prerequisites_met"] = _prerequisites_met(definition)
		result.append(merged)
	return result

func _definition(contract_id: String) -> Dictionary:
	for definition in CONTRACTS:
		if str(definition.id) == contract_id:
			return definition
	return {}

func _record_for(contract_id: String) -> Dictionary:
	return contract_state.get(contract_id,{"state":"NOT_SHIPPED","shipment_id":"","cycle":0})

func _prerequisites_met(definition: Dictionary) -> bool:
	for research_id in definition.get("requires_research",[]):
		if not GameState.completed_research.has(str(research_id)):
			return false
	for flag in definition.get("requires_story",[]):
		if not bool(GameState.story_flags.get(str(flag),false)):
			return false
	return true

func accept_contract(contract_id: String) -> bool:
	var definition := _definition(contract_id)
	if definition.is_empty():
		GameState.toast("알 수 없는 계약입니다.","error")
		return false
	var record := _record_for(contract_id)
	if str(record.get("state","NOT_SHIPPED")) != "NOT_SHIPPED":
		GameState.toast("이 계약은 이미 수락했거나 종료되었습니다.","warning")
		return false
	if not _prerequisites_met(definition):
		GameState.toast("계약 선행 연구 또는 First Factory 스토리 조건이 부족합니다.","warning")
		return false
	record["state"] = "RESERVED"
	record["accepted_tick"] = GameState.simulation_tick
	contract_state[contract_id] = record
	_persist_state()
	contracts_changed.emit()
	GameState.toast("계약 수락 · "+str(definition.title),"success")
	return true

func pack_and_ship(contract_id: String) -> bool:
	var definition := _definition(contract_id)
	if definition.is_empty():
		return false
	var record := _record_for(contract_id)
	if str(record.get("state","")) != "RESERVED":
		GameState.toast("먼저 계약을 수락하세요.","warning")
		return false
	var min_quality := float(definition.get("minimum_quality",0.0))
	var min_purity := float(definition.get("minimum_purity",0.0))
	var shortages: Array[String] = []
	for item_id in definition.inputs:
		var eligible := GameState.eligible_quantity(str(item_id),min_quality,min_purity,false)
		if eligible < int(definition.inputs[item_id]):
			shortages.append(str(item_id)+" "+str(eligible)+"/"+str(definition.inputs[item_id]))
	if not shortages.is_empty():
		GameState.toast("출하 조건 미달 · "+", ".join(shortages),"warning")
		return false
	var snapshot := GameState.inventory.duplicate(true)
	var manifest: Dictionary = {}
	for item_id in definition.inputs:
		var removed := GameState.remove_eligible_items(str(item_id),int(definition.inputs[item_id]),min_quality,min_purity,false)
		if removed.is_empty():
			GameState.inventory = snapshot
			GameState.inventory_changed.emit()
			GameState.toast("출하 예약 실패 · 재료를 되돌렸습니다.","error")
			return false
		manifest[item_id] = removed
	var cycle := int(record.get("cycle",0))+1
	var shipment_id := "SHIPMENT:"+contract_id+":"+str(cycle)
	var package_cost := {"BOX":2,"SECURE_CONTAINER":5,"DORONUM_ISOLATION":8,"INFINITY_ISOLATION":12}.get(str(definition.get("packing","BOX")),2)
	var packing_item := "ITEM_WOOD"
	if GameState.count_item(packing_item)<package_cost:
		GameState.inventory=snapshot
		GameState.inventory_changed.emit()
		GameState.toast("포장 자재가 부족합니다 · Wood %d개 필요" % package_cost,"warning")
		return false
	if not GameState.remove_item(packing_item,package_cost):
		GameState.inventory=snapshot
		GameState.inventory_changed.emit()
		return false
	shipments[shipment_id] = {
		"shipment_id":shipment_id,"contract_id":contract_id,
		"state":"IN_TRANSIT","manifest":manifest,
		"packing":definition.get("packing","BOX"),
		"remaining_seconds":float(definition.get("transit_seconds",30.0)),
		"created_tick":GameState.simulation_tick,
		"settled":false
	}
	record["state"]="IN_TRANSIT"
	record["shipment_id"]=shipment_id
	record["cycle"]=cycle
	contract_state[contract_id]=record
	_persist_state()
	GameState.toast("포장 완료 · 화물 운송 중 · "+str(definition.title),"success")
	contracts_changed.emit()
	shipment_updated.emit(contract_id,"IN_TRANSIT")
	return true

func _on_tick(_tick_index: int) -> void:
	var changed := false
	for shipment_id in shipments.keys():
		var shipment: Dictionary = shipments[shipment_id]
		if str(shipment.get("state","")) != "IN_TRANSIT":
			continue
		shipment["remaining_seconds"] = maxf(0.0,float(shipment.get("remaining_seconds",0.0))-GameState.FIXED_TICK)
		if float(shipment.remaining_seconds)<=0.0:
			_settle_shipment(str(shipment_id),shipment)
		shipments[shipment_id]=shipment
		changed = true
	if changed:
		_persist_state()

func _settle_shipment(shipment_id: String, shipment: Dictionary) -> void:
	if bool(shipment.get("settled",false)):
		return
	var contract_id := str(shipment.get("contract_id",""))
	var definition := _definition(contract_id)
	if definition.is_empty():
		shipment["state"]="FAILED"
		shipment["settled"]=true
		return
	var claim_id := "CONTRACT_SETTLEMENT:"+shipment_id
	if not GameState.reward_ledger.has(claim_id):
		GameState.reward_ledger[claim_id]={"contract_id":contract_id,"shipment_id":shipment_id,"tick":GameState.simulation_tick}
		GameState.research_points += int(definition.get("rp",0))
		GameState.currency_d += int(definition.get("currency_d",0))
		for item_id in definition.get("rewards",{}):
			GameState.add_item(str(item_id),int(definition.rewards[item_id]),95.0,95.0,false,"CONTRACT:"+contract_id)
		if contract_id=="CONTRACT_SECURITY_ARCHIVE":
			GameState.story_flags["SPECIAL_EDITION_BATCH_RESEARCHED"]=true
		if contract_id=="CONTRACT_LEGACY_BATCH_SEAL":
			GameState.story_flags["LIMITED_EDITION_CONTRACT_ACTIVE"]=true
	shipment["state"]="DELIVERED"
	shipment["settled"]=true
	var record := _record_for(contract_id)
	record["state"]="DELIVERED"
	record["delivered_tick"]=GameState.simulation_tick
	contract_state[contract_id]=record
	GameState.toast("계약 배송 완료 · %s · +%d RP · +%d D" % [str(definition.title),int(definition.get("rp",0)),int(definition.get("currency_d",0))],"success")
	GameState.progression_changed.emit()
	contracts_changed.emit()
	shipment_updated.emit(contract_id,"DELIVERED")

func _persist_state() -> void:
	GameState.world_state["contract_state"]=contract_state
	GameState.world_state["shipments"]=shipments
	GameState.save_game()
