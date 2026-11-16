/* DORONIUM FACTORY — canonical simulation and item-stack runtime
 * Deterministic, renderer-independent core. Legacy aggregate inventory remains
 * a compatibility projection while stack records become the source of metadata.
 */
export const SIMULATION_STEP_SECONDS = 0.1;
export const ITEM_STACK_LIMIT = 5000;
export const TICK_STAGE_ORDER = Object.freeze([
  "STATE_READ","RESERVATION_RESOLVE","POWER_RESOLVE","PRODUCTION_STATE",
  "SPEED_RESOLVE","TEMPERATURE_UPDATE","PRESSURE_UPDATE","QUALITY",
  "WEAR","POWER_STABILITY","PRODUCTION_PROGRESS","FAILURE_CHECK",
  "FAILURE_RESOLUTION","OUTPUT_QUALITY_PURITY","COMPLETION_BUFFER",
  "CONVEYOR_TRANSFER","METRICS","SAVE_SNAPSHOT_REQUEST"
]);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const clone=value=>typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));

export function createRuntimeState(){
  return {schemaVersion:5,nextStackId:1,nextReservationId:1,nextEntityId:1,itemStacks:[],reservations:{},reservationHistory:[],consumptionLedger:[],failureRngState:0x6d2b79f5,failureRngIndex:0,nextFailureEventId:1,failureEvents:[],tickStageOrder:[...TICK_STAGE_ORDER],lastTickStages:[],saveSnapshotRequested:false};
}
function normalizeStack(stack){
  return {runtimeID:String(stack.runtimeID),itemID:String(stack.itemID),quantity:Math.max(0,Math.floor(Number(stack.quantity)||0)),
    quality:clamp(stack.quality??90,0,100),purity:clamp(stack.purity??90,0,100),
    synthetic:!!stack.synthetic,packaging:stack.packaging||null,createdTick:Math.max(0,Number(stack.createdTick)||0)};
}
export function ensureItemStacks(state){
  if(!state.runtime||typeof state.runtime!=="object")state.runtime=createRuntimeState();
  const rt=state.runtime;rt.schemaVersion=Math.max(5,Math.floor(Number(rt.schemaVersion)||0));
  if(!Array.isArray(rt.itemStacks))rt.itemStacks=[];
  rt.itemStacks=rt.itemStacks.filter(s=>s&&s.quantity>0).map(normalizeStack);
  let maxId=0;
  for(const stack of rt.itemStacks){const n=Number(String(stack.runtimeID).replace(/^IS-/,""));if(Number.isFinite(n))maxId=Math.max(maxId,n)}
  rt.nextStackId=Math.max(1,Math.floor(Number(rt.nextStackId)||1),maxId+1);
  if(!rt.reservations||typeof rt.reservations!=="object")rt.reservations={};
  if(!Array.isArray(rt.reservationHistory))rt.reservationHistory=[];
  rt.failureRngState=(Number(rt.failureRngState)>>>0)||0x6d2b79f5;
  rt.failureRngIndex=Math.max(0,Math.floor(Number(rt.failureRngIndex)||0));
  rt.nextFailureEventId=Math.max(1,Math.floor(Number(rt.nextFailureEventId)||1));
  if(!Array.isArray(rt.failureEvents))rt.failureEvents=[];
  if(!Array.isArray(rt.consumptionLedger))rt.consumptionLedger=[];
  if(rt.consumptionLedger.length>512)rt.consumptionLedger=rt.consumptionLedger.slice(-512);
  if(rt.failureEvents.length>256)rt.failureEvents=rt.failureEvents.slice(-256);
  if(!Number.isSafeInteger(rt.failureRngIndex)||rt.failureRngIndex<0)rt.failureRngIndex=0;
  if(!Number.isSafeInteger(rt.nextFailureEventId)||rt.nextFailureEventId<1)rt.nextFailureEventId=1;
  rt.nextReservationId=Math.max(1,Math.floor(Number(rt.nextReservationId)||1));
  rt.nextEntityId=Math.max(1,Math.floor(Number(rt.nextEntityId)||1));
  // One-time migration from the legacy item-count map. Never replace existing stacks.
  if(!rt.legacyInventoryMigrated){
    for(const [itemID,quantity] of Object.entries(state.inventory||{})){
      const total=rt.itemStacks.filter(s=>s.itemID===itemID).reduce((n,s)=>n+s.quantity,0);
      const missing=Math.max(0,Math.floor(Number(quantity)||0)-total);
      if(missing){const meta=state.meta?.[itemID]||{};rt.itemStacks.push({runtimeID:"IS-"+rt.nextStackId++,itemID,quantity:missing,
        quality:clamp(meta.quality??90,0,100),purity:clamp(meta.purity??90,0,100),synthetic:!!meta.synthetic,packaging:null,createdTick:state.tick||0})}
    }
    rt.legacyInventoryMigrated=true;
  }
  return rt;
}
export function allocateRuntimeID(state,prefix="ID"){
  const rt=ensureItemStacks(state);
  const safePrefix=String(prefix||"ID").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,24)||"ID";
  const existing=new Set((state.buildings||[]).map(building=>String(building.uid||"")));
  let id;
  do{id=safePrefix+"-"+String(rt.nextEntityId++).padStart(8,"0")}while(existing.has(id));
  return id;
}
export function addItemStack(state,itemID,quantity,meta={}){
  const rt=ensureItemStacks(state);let remaining=Math.floor(Number(quantity)||0),firstID=null;
  if(!itemID||remaining<=0)return null;
  while(remaining>0){
    const qty=Math.min(ITEM_STACK_LIMIT,remaining),runtimeID="IS-"+rt.nextStackId++;
    rt.itemStacks.push({runtimeID,itemID:String(itemID),quantity:qty,
      quality:clamp(meta.quality??90,0,100),purity:clamp(meta.purity??90,0,100),
      synthetic:!!meta.synthetic,packaging:meta.packaging||null,createdTick:Math.max(0,Number(state.tick)||0)});
    if(firstID===null)firstID=runtimeID;remaining-=qty;
  }
  return firstID;
}
function reservedByStack(rt,excludeReservationID=null){
  const totals=new Map();
  for(const reservation of Object.values(rt.reservations||{})){
    if(reservation.status!=="reserved"||reservation.reservationID===excludeReservationID)continue;
    for(const allocation of reservation.allocations||[])totals.set(allocation.stackID,(totals.get(allocation.stackID)||0)+allocation.quantity);
  }
  return totals;
}
export function reserveItemStacks(state,itemID,quantity,ownerID="inventory-transaction",stackPredicate=null){
  const rt=ensureItemStacks(state),qty=Math.floor(Number(quantity)||0);
  if(!itemID||qty<=0)return null;
  const reserved=reservedByStack(rt);let remaining=qty;const allocations=[];
  for(const stack of rt.itemStacks){
    if(stack.itemID!==itemID||remaining<=0||(typeof stackPredicate==="function"&&!stackPredicate(stack)))continue;
    const free=Math.max(0,stack.quantity-(reserved.get(stack.runtimeID)||0));
    const take=Math.min(free,remaining);if(take>0){allocations.push({stackID:stack.runtimeID,quantity:take});remaining-=take}
  }
  if(remaining>0)return null;
  const reservationID="RS-"+rt.nextReservationId++;
  rt.reservations[reservationID]={reservationID,ownerID:String(ownerID),itemID:String(itemID),quantity:qty,allocations,status:"reserved",createdTick:Math.max(0,Number(state.tick)||0)};
  return reservationID;
}
export function reserveItemBatch(state,requirements,ownerID="inventory-transaction",stackPredicate=null){
  const created=[];
  for(const [itemID,quantity] of Object.entries(requirements||{})){
    const qty=Math.floor(Number(quantity)||0);if(qty<=0)continue;
    const id=reserveItemStacks(state,itemID,qty,ownerID,stackPredicate);
    if(!id){for(const prior of created)releaseItemReservation(state,prior);return null}
    created.push(id);
  }
  return created;
}
export function releaseItemReservation(state,reservationID){
  const rt=ensureItemStacks(state),reservation=rt.reservations[reservationID];
  if(!reservation||reservation.status!=="reserved")return false;
  reservation.status="released";reservation.releasedTick=Math.max(0,Number(state.tick)||0);rt.reservationHistory.push({reservationID,ownerID:reservation.ownerID,status:"released",tick:reservation.releasedTick});delete rt.reservations[reservationID];if(rt.reservationHistory.length>256)rt.reservationHistory.splice(0,rt.reservationHistory.length-256);return true;
}
export function commitItemReservations(state,reservationIDs){
  const rt=ensureItemStacks(state),ids=[...new Set(reservationIDs||[])],reservations=ids.map(id=>rt.reservations[id]);
  if(!ids.length||reservations.some(r=>!r||r.status!=="reserved"))return null;
  const byID=new Map(rt.itemStacks.map(stack=>[stack.runtimeID,stack]));
  for(const reservation of reservations)for(const allocation of reservation.allocations||[]){
    const stack=byID.get(allocation.stackID);
    if(!stack||stack.itemID!==reservation.itemID||stack.quantity<allocation.quantity)return null;
  }
  const removed=[];
  for(const reservation of reservations){
    for(const allocation of reservation.allocations){
      const stack=byID.get(allocation.stackID);
      removed.push({...stack,quantity:allocation.quantity});
      stack.quantity-=allocation.quantity;
    }
    reservation.status="committed";reservation.committedTick=Math.max(0,Number(state.tick)||0);rt.reservationHistory.push({reservationID:reservation.reservationID,ownerID:reservation.ownerID,status:"committed",tick:reservation.committedTick});delete rt.reservations[reservation.reservationID];
  }
  rt.itemStacks=rt.itemStacks.filter(stack=>stack.quantity>0);
  if(rt.reservationHistory.length>256)rt.reservationHistory.splice(0,rt.reservationHistory.length-256);
  return removed;
}
export function splitItemStack(state,runtimeID,quantity){
  const rt=ensureItemStacks(state),stack=rt.itemStacks.find(s=>s.runtimeID===runtimeID),qty=Math.floor(Number(quantity)||0);
  if(!stack||qty<=0||qty>=stack.quantity)return null;
  const reserved=reservedByStack(rt).get(runtimeID)||0;
  if(stack.quantity-qty<reserved)return null;
  const next={...stack,runtimeID:"IS-"+rt.nextStackId++,quantity:qty};
  stack.quantity-=qty;rt.itemStacks.push(next);return next.runtimeID;
}
export function mergeItemStacks(state,sourceID,targetID){
  const rt=ensureItemStacks(state);
  if(sourceID===targetID)return false;
  const source=rt.itemStacks.find(s=>s.runtimeID===sourceID),target=rt.itemStacks.find(s=>s.runtimeID===targetID);
  if(!source||!target||source.itemID!==target.itemID||source.quality!==target.quality||source.purity!==target.purity||source.synthetic!==target.synthetic||source.packaging!==target.packaging)return false;
  if(source.quantity>ITEM_STACK_LIMIT-target.quantity)return false;
  if((reservedByStack(rt).get(sourceID)||0)>0)return false;
  target.quantity+=source.quantity;rt.itemStacks=rt.itemStacks.filter(s=>s.runtimeID!==sourceID);return true;
}
export function removeItemStacks(state,itemID,quantity){
  const rt=ensureItemStacks(state);let remaining=Math.floor(Number(quantity)||0);
  if(remaining<=0)return [];
  const reserved=reservedByStack(rt);
  const available=rt.itemStacks.filter(s=>s.itemID===itemID).reduce((n,s)=>n+Math.max(0,s.quantity-(reserved.get(s.runtimeID)||0)),0);
  if(available<remaining)return null;
  const removed=[];
  for(const stack of rt.itemStacks){
    if(stack.itemID!==itemID||remaining<=0)continue;
    const free=Math.max(0,stack.quantity-(reserved.get(stack.runtimeID)||0));
    const take=Math.min(free,remaining);
    if(take>0){removed.push({...stack,quantity:take});stack.quantity-=take;remaining-=take}
  }
  rt.itemStacks=rt.itemStacks.filter(s=>s.quantity>0);
  return removed;
}
export function validateRuntimeState(state){
  const rt=ensureItemStacks(state),errors=[],ids=new Set(),stackByID=new Map();
  if(!Number.isSafeInteger(rt.nextEntityId)||rt.nextEntityId<1)errors.push("invalid-entity-id-counter");
  for(const stack of rt.itemStacks){
    if(ids.has(stack.runtimeID))errors.push("duplicate-stack-id:"+stack.runtimeID);
    ids.add(stack.runtimeID);stackByID.set(stack.runtimeID,stack);
    if(!stack.itemID||!Number.isInteger(stack.quantity)||stack.quantity<=0||stack.quantity>ITEM_STACK_LIMIT)errors.push("invalid-stack:"+stack.runtimeID);
  }
  const reserved=reservedByStack(rt);
  for(const [stackID,quantity] of reserved){
    const stack=stackByID.get(stackID);
    if(!stack||quantity>stack.quantity)errors.push("reservation-overflow:"+stackID);
  }
  for(const reservation of Object.values(rt.reservations)){
    if(reservation.status==="reserved"&&(!reservation.ownerID||!reservation.allocations?.length))errors.push("invalid-reservation:"+reservation.reservationID);
  }
  const maxID=Math.max(0,...[...ids].map(id=>Number(id.replace(/^IS-/,""))||0));
  if(rt.nextStackId<=maxID)errors.push("stack-id-counter-not-advanced");
  if(!Number.isSafeInteger(rt.failureRngState)||rt.failureRngState<=0)errors.push("invalid-failure-rng-state");
  if(!Number.isSafeInteger(rt.failureRngIndex)||rt.failureRngIndex<0)errors.push("invalid-failure-rng-index");
  if(!Number.isSafeInteger(rt.nextFailureEventId)||rt.nextFailureEventId<1)errors.push("invalid-failure-event-counter");
  const failureIDs=new Set();let maxFailureID=0;
  for(const event of rt.failureEvents){if(!event?.failureEventID||failureIDs.has(event.failureEventID))errors.push("duplicate-failure-event:"+event?.failureEventID);failureIDs.add(event?.failureEventID);const n=Number(String(event?.failureEventID||"").replace(/^FAIL-/,""));if(Number.isSafeInteger(n))maxFailureID=Math.max(maxFailureID,n)}
  if(rt.nextFailureEventId<=maxFailureID)errors.push("failure-event-counter-not-advanced");
  return {valid:errors.length===0,errors,stackCount:rt.itemStacks.length,reservationCount:Object.values(rt.reservations).filter(r=>r.status==="reserved").length,failureEventCount:rt.failureEvents.length};
}
export function availableItemCount(state,itemID){
  const rt=ensureItemStacks(state),reserved=reservedByStack(rt);
  return rt.itemStacks.filter(stack=>stack.itemID===itemID).reduce((total,stack)=>total+Math.max(0,stack.quantity-(reserved.get(stack.runtimeID)||0)),0);
}
export function stackTotals(state){
  const totals={};
  for(const s of ensureItemStacks(state).itemStacks)totals[s.itemID]=(totals[s.itemID]||0)+s.quantity;
  return totals;
}
export function syncLegacyInventory(state){
  const rt=ensureItemStacks(state),totals={},weighted={};
  for(const s of rt.itemStacks){
    totals[s.itemID]=(totals[s.itemID]||0)+s.quantity;
    const w=weighted[s.itemID]||(weighted[s.itemID]={q:0,p:0,n:0,synthetic:false});
    w.q+=s.quality*s.quantity;w.p+=s.purity*s.quantity;w.n+=s.quantity;w.synthetic=w.synthetic||s.synthetic;
  }
  state.inventory=totals;state.meta={};
  for(const [id,w] of Object.entries(weighted))state.meta[id]={quality:w.n?w.q/w.n:90,purity:w.n?w.p/w.n:90,synthetic:w.synthetic};
  return state;
}
export function calculateOutputQuality({materialQuality=90,temperatureQuality=100,pressureQuality=100,machineConditionQuality=100,powerStability=100,recipeModifier=0,pollutionPenalty=0}={}){
  const raw=materialQuality*.4+temperatureQuality*.2+pressureQuality*.2+machineConditionQuality*.1+powerStability*.1+recipeModifier;
  return clamp(raw-pollutionPenalty,0,100);
}
export function accuracyQuality(actual,target){
  const t=Math.abs(Number(target)||0),a=Number(actual)||0;
  if(t<=0)return Math.abs(a)<=1?100:50;
  const error=Math.abs(a-t)/t;
  return error<=.01?100:error<=.03?95:error<=.05?85:error<=.10?70:50;
}
export function calculateOutputPurity({inputPurity=90,processLoss=0,purificationBonus=0,modifier=0}={}){
  return clamp(inputPurity-processLoss+purificationBonus+modifier,0,100);
}
export function qualityGrade(value){
  const q=clamp(value,0,100);
  return q<30?"불량":q<50?"하급":q<70?"일반":q<85?"고급":q<95?"희귀":"최고급";
}
export function runCanonicalTick(context,handlers={}){
  const rt=context.state.runtime||(context.state.runtime=createRuntimeState()),trace=[];
  for(let i=0;i<TICK_STAGE_ORDER.length;i++){
    const stage=TICK_STAGE_ORDER[i];trace.push(stage);
    if(typeof handlers[stage]==="function")handlers[stage](context);
  }
  rt.lastTickStages=trace;
  rt.lastTick=Number(context.state.tick)||0;
  return trace;
}
export function createImmutableSaveSnapshot(state){
  const snapshot=clone(state);
  if(snapshot.runtime)snapshot.runtime.saveSnapshotRequested=false;
  return Object.freeze(snapshot);
}
export function requestSaveSnapshot(state){
  const rt=ensureItemStacks(state);rt.saveSnapshotRequested=true;
  return createImmutableSaveSnapshot(state);
}
