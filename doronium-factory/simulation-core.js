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
  return {schemaVersion:2,nextStackId:1,itemStacks:[],tickStageOrder:[...TICK_STAGE_ORDER],lastTickStages:[],saveSnapshotRequested:false};
}
function normalizeStack(stack){
  return {runtimeID:String(stack.runtimeID),itemID:String(stack.itemID),quantity:Math.max(0,Math.floor(Number(stack.quantity)||0)),
    quality:clamp(stack.quality??90,0,100),purity:clamp(stack.purity??90,0,100),
    synthetic:!!stack.synthetic,packaging:stack.packaging||null,createdTick:Math.max(0,Number(stack.createdTick)||0)};
}
export function ensureItemStacks(state){
  if(!state.runtime||typeof state.runtime!=="object")state.runtime=createRuntimeState();
  const rt=state.runtime;
  if(!Array.isArray(rt.itemStacks))rt.itemStacks=[];
  rt.itemStacks=rt.itemStacks.filter(s=>s&&s.quantity>0).map(normalizeStack);
  let maxId=0;
  for(const stack of rt.itemStacks){const n=Number(String(stack.runtimeID).replace(/^IS-/,""));if(Number.isFinite(n))maxId=Math.max(maxId,n)}
  rt.nextStackId=Math.max(1,Math.floor(Number(rt.nextStackId)||1),maxId+1);
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
export function addItemStack(state,itemID,quantity,meta={}){
  const rt=ensureItemStacks(state),qty=Math.floor(Number(quantity)||0);
  if(!itemID||qty<=0)return null;
  const stack={runtimeID:"IS-"+rt.nextStackId++,itemID:String(itemID),quantity:qty,
    quality:clamp(meta.quality??90,0,100),purity:clamp(meta.purity??90,0,100),
    synthetic:!!meta.synthetic,packaging:meta.packaging||null,createdTick:Math.max(0,Number(state.tick)||0)};
  rt.itemStacks.push(stack);
  return stack.runtimeID;
}
export function removeItemStacks(state,itemID,quantity){
  const rt=ensureItemStacks(state);let remaining=Math.floor(Number(quantity)||0);
  if(remaining<=0)return [];
  const available=rt.itemStacks.filter(s=>s.itemID===itemID).reduce((n,s)=>n+s.quantity,0);
  if(available<remaining)return null;
  const removed=[];
  for(const stack of rt.itemStacks){
    if(stack.itemID!==itemID||remaining<=0)continue;
    const take=Math.min(stack.quantity,remaining);
    removed.push({...stack,quantity:take});
    stack.quantity-=take;remaining-=take;
  }
  rt.itemStacks=rt.itemStacks.filter(s=>s.quantity>0);
  return removed;
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
