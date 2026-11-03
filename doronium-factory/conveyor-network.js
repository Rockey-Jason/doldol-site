/* Deterministic graph-based conveyor routing.
   One occupied segment owns one parcel. Every move is planned from a snapshot and committed once. */
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const SORT_TYPES=new Set(["conveyor","sorter","splitter","merger","lift","storage-port","source","sink"]);
function validID(value){return typeof value==="string"&&value.trim().length>0}
function validParcel(parcel){
 return parcel&&validID(parcel.stackID)&&validID(parcel.itemID)&&Number.isSafeInteger(parcel.quantity)&&parcel.quantity>0;
}
export function createConveyorState({segments=[],parcels=[]}={}){
 const state={schemaVersion:1,nextTransferID:1,segments:clone(segments),parcels:clone(parcels),transferLedger:[],mergeCursors:{},splitterCursors:{}};
 for(const segment of state.segments)segment.occupantStackID??=null;
 return state;
}
export function validateConveyorState(state){
 const errors=[];
 if(!state||state.schemaVersion!==1||!Array.isArray(state.segments)||!Array.isArray(state.parcels))
  return {valid:false,errors:["INVALID_CONVEYOR_STATE"]};
 const ids=new Set(),parcelIDs=new Set(),occupants=new Map();
 for(const segment of state.segments){
  if(!validID(segment?.id)||ids.has(segment.id)||!SORT_TYPES.has(segment.type)||
     !Number.isSafeInteger(segment.capacity)||segment.capacity<1||
     !Array.isArray(segment.outputs||[]))errors.push("INVALID_SEGMENT:"+String(segment?.id));
  ids.add(segment?.id);
 }
 for(const parcel of state.parcels){
  if(!validParcel(parcel)||parcelIDs.has(parcel?.stackID))errors.push("INVALID_OR_DUPLICATE_PARCEL:"+String(parcel?.stackID));
  parcelIDs.add(parcel?.stackID);
  if(!ids.has(parcel?.segmentID))errors.push("PARCEL_SEGMENT_MISSING:"+parcel?.stackID);
  if(occupants.has(parcel?.segmentID))errors.push("SEGMENT_HAS_MULTIPLE_PARCELS:"+parcel?.segmentID);
  occupants.set(parcel?.segmentID,parcel?.stackID);
 }
 for(const segment of state.segments){
  if(segment.occupantStackID&&occupants.get(segment.id)!==segment.occupantStackID)
   errors.push("OCCUPANT_INDEX_MISMATCH:"+segment.id);
  for(const output of segment.outputs||[])if(!ids.has(output))errors.push("UNKNOWN_OUTPUT:"+segment.id+":"+output);
  if(segment.type==="lift"&&(!Number.isFinite(Number(segment.fromHeight))||!Number.isFinite(Number(segment.toHeight))))
   errors.push("INVALID_LIFT_HEIGHT:"+segment.id);
 }
 return {valid:errors.length===0,errors};
}
function segmentMap(state){return new Map(state.segments.map(s=>[s.id,s]))}
function parcelMap(state){return new Map(state.parcels.map(p=>[p.stackID,p]))}
function routeMatches(rule,parcel){
 if(rule.itemID&&rule.itemID!==parcel.itemID)return false;
 if(rule.minQuality!==undefined&&Number(parcel.quality??0)<Number(rule.minQuality))return false;
 if(rule.maxQuality!==undefined&&Number(parcel.quality??100)>Number(rule.maxQuality))return false;
 if(rule.synthetic!==undefined&&!!parcel.synthetic!==!!rule.synthetic)return false;
 if(rule.provenance!==undefined&&parcel.provenance!==rule.provenance)return false;
 return true;
}
function isDestinationAvailable(segment,occupied,arrivals){
 return !!segment&&segment.type!=="source"&&
  (segment.type==="sink"||(occupied.has(segment.id)===false&&arrivals.has(segment.id)===false));
}
function chooseOutput(segment,parcel,state,segments,occupied,arrivals){
 const outputs=(segment.outputs||[]).map(id=>segments.get(id)).filter(Boolean);
 if(segment.type==="sorter"){
  const rules=Array.isArray(segment.rules)?segment.rules:[];
  for(const rule of rules){
   if(!routeMatches(rule,parcel))continue;
   const target=segments.get(rule.outputID);
   if(isDestinationAvailable(target,occupied,arrivals))return target;
  }
 }
 if(segment.type==="sink"){
  return {id:"__SINK__",type:"sink"};
 }
 if(segment.type==="splitter"||segment.type==="merger"){
  if(!outputs.length)return null;
  const cursorKey=(segment.type==="splitter"?"splitter:":"merge:")+segment.id;
  const cursor=Number(state.mergeCursors?.[cursorKey]??state.splitterCursors?.[segment.id]??0);
  const start=((Number.isSafeInteger(cursor)?cursor:0)%outputs.length+outputs.length)%outputs.length;
  for(let offset=0;offset<outputs.length;offset++){
   const index=(start+offset)%outputs.length;
   const target=outputs[index];
   if(isDestinationAvailable(target,occupied,arrivals))return {target,nextCursor:index+1};
  }
  return null;
 }
 for(const target of outputs)if(isDestinationAvailable(target,occupied,arrivals))return target;
 return null;
}
function findDeadlocks(waitFor){
 const cycles=[],visited=new Set(),active=new Set(),stack=[];
 function visit(id){
  if(active.has(id)){const start=stack.indexOf(id);if(start>=0){const cycle=stack.slice(start);const key=[...cycle].sort().join("|");if(!visited.has(key)){visited.add(key);cycles.push(cycle)}}return}
  if(visited.has(id))return;
  active.add(id);stack.push(id);
  for(const next of waitFor.get(id)||[])visit(next);
  stack.pop();active.delete(id);visited.add(id);
 }
 for(const id of waitFor.keys())visit(id);
 return cycles;
}
export function advanceConveyorTick(state,{tick=0,maxMoves=10000}={}){
 const validation=validateConveyorState(state);
 if(!validation.valid)return {ok:false,reason:"INVALID_CONVEYOR_STATE",errors:validation.errors,moved:[],blocked:[],deadlocks:[]};
 if(!Number.isSafeInteger(tick)||tick<0||!Number.isSafeInteger(maxMoves)||maxMoves<1)
  return {ok:false,reason:"INVALID_TICK_ARGUMENT",moved:[],blocked:[],deadlocks:[]};
 const segments=segmentMap(state),parcels=parcelMap(state);
 const occupied=new Set(state.parcels.map(p=>p.segmentID)),arrivals=new Set(),moved=[],blocked=[],waitFor=new Map(),plans=[];
 const ordered=[...state.parcels].sort((a,b)=>a.segmentID.localeCompare(b.segmentID)||a.stackID.localeCompare(b.stackID));
 for(const parcel of ordered){
  if(plans.length>=maxMoves)break;
  const source=segments.get(parcel.segmentID);
  if(!source||source.type==="sink"||source.type==="storage-port"&&source.accepting===true)continue;
  const targetChoice=chooseOutput(source,parcel,state,segments,occupied,arrivals);
  if(!targetChoice){
   const nexts=(source.outputs||[]).filter(id=>segments.has(id));
   if(nexts.length){
    waitFor.set(source.id,nexts.filter(id=>occupied.has(id)));
    blocked.push({stackID:parcel.stackID,segmentID:source.id,reason:"BACKPRESSURE",outputs:nexts});
   }
   continue;
  }
  const target=targetChoice.target||targetChoice;
  if(target.id==="__SINK__"||target.type==="sink"){
   plans.push({parcel,source,target,sink:true});
   continue;
  }
  if(!isDestinationAvailable(target,occupied,arrivals)){
   blocked.push({stackID:parcel.stackID,segmentID:source.id,reason:"DESTINATION_FULL",targetID:target.id});
   waitFor.set(source.id,[target.id]);continue;
  }
  arrivals.add(target.id);
  plans.push({parcel,source,target,sink:false,nextCursor:targetChoice.nextCursor});
 }
 const nextParcels=[],removeIDs=new Set();
 for(const plan of plans){
  removeIDs.add(plan.parcel.stackID);
  if(!plan.sink)nextParcels.push({...plan.parcel,segmentID:plan.target.id,lastMovedTick:tick});
  const transferID="BELT-XFER-"+state.nextTransferID++;
  const event={transferID,stackID:plan.parcel.stackID,itemID:plan.parcel.itemID,quantity:plan.parcel.quantity,
   fromSegmentID:plan.source.id,toSegmentID:plan.sink?null:plan.target.id,sink:plan.sink,tick};
  state.transferLedger.push(event);moved.push(event);
  if(plan.nextCursor!==undefined){
   if(plan.source.type==="splitter")state.splitterCursors[plan.source.id]=plan.nextCursor;
   else state.mergeCursors["merge:"+plan.source.id]=plan.nextCursor;
  }
 }
 state.parcels=state.parcels.filter(parcel=>!removeIDs.has(parcel.stackID)).concat(nextParcels);
 for(const segment of state.segments)segment.occupantStackID=state.parcels.find(p=>p.segmentID===segment.id)?.stackID||null;
 if(state.transferLedger.length>2048)state.transferLedger.splice(0,state.transferLedger.length-2048);
 return {ok:true,moved,blocked,deadlocks:findDeadlocks(waitFor),remainingParcels:state.parcels.length};
}
