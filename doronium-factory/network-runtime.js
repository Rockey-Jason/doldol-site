/* Deterministic topology solvers for isolated power and conserved fluid networks. */
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function stableNetworkID(prefix,nodeIDs){const anchor=(nodeIDs||[]).map(String).sort()[0];return prefix+"-"+(anchor?encodeURIComponent(anchor):"EMPTY")}
function components(nodes,edges){
 const ids=new Set(nodes.map(n=>String(n.id))),adj=new Map([...ids].map(id=>[id,[]]));
 for(const e of edges||[])if(ids.has(String(e.from))&&ids.has(String(e.to))){adj.get(String(e.from)).push(String(e.to));adj.get(String(e.to)).push(String(e.from))}
 const groups=[],visited=new Set();
 for(const id of [...ids].sort())if(!visited.has(id)){const q=[id],group=[];visited.add(id);while(q.length){const at=q.shift();group.push(at);for(const next of adj.get(at))if(!visited.has(next)){visited.add(next);q.push(next)}}groups.push(group.sort())}
 return groups;
}
/* Accumulate per-edge losses along the least-loss route from any live source.
   Using -log(efficiency) makes serial cable losses compound exactly. */
function transmissionLossByNode(nodeIDs,edges,sourceIDs){
 const ids=new Set((nodeIDs||[]).map(String)),adj=new Map([...ids].map(id=>[id,[]]));
 for(const edge of edges||[]){const from=String(edge.from),to=String(edge.to);if(!ids.has(from)||!ids.has(to))continue;const raw=edge.lossRate??edge.transmissionLoss??0,loss=Math.max(0,Math.min(.99,finite(raw))),weight=-Math.log(1-loss);adj.get(from).push({id:to,weight});adj.get(to).push({id:from,weight})}
 const best=new Map([...ids].map(id=>[id,Infinity]));for(const source of sourceIDs||[])if(ids.has(String(source)))best.set(String(source),0);
 const visited=new Set();
 while(true){let current=null,currentWeight=Infinity;for(const [id,weight] of best)if(!visited.has(id)&&weight<currentWeight){current=id;currentWeight=weight}if(current===null)break;visited.add(current);for(const next of adj.get(current)||[]){const candidate=currentWeight+next.weight;if(candidate<best.get(next.id))best.set(next.id,candidate)}}
 const result=new Map();for(const id of ids){const weight=best.get(id);result.set(id,Number.isFinite(weight)?Math.max(0,Math.min(.99,1-Math.exp(-weight))):0)}return result;
}
export function solvePowerNetworks({nodes=[],edges=[],deltaSeconds=1}={}){
 const byID=new Map(nodes.map(n=>[String(n.id),n])),groups=components(nodes,edges),results=[],dt=Math.max(.001,finite(deltaSeconds,1));
 for(let i=0;i<groups.length;i++){
  const ids=groups[i],members=ids.map(id=>byID.get(id)),idSet=new Set(ids),networkEdges=(edges||[]).filter(edge=>idSet.has(String(edge.from))&&idSet.has(String(edge.to)));
  const sources=members.filter(node=>(node.type==="GENERATOR"&&finite(node.generationKW)>0)||(node.type==="BATTERY"&&finite(node.energyKJ)>0&&finite(node.maxDischargeKW)>0)).map(node=>String(node.id));
  const pathLosses=transmissionLossByNode(ids,networkEdges,sources);
  const generators=members.reduce((n,x)=>n+Math.max(0,finite(x.generationKW)),0);
  const transformers=members.filter(x=>x.type==="TRANSFORMER").map(x=>Math.max(0,finite(x.maxThroughputKW,Infinity))),transformerLimit=transformers.length?Math.min(...transformers):Infinity;
  const batteries=members.filter(x=>x.type==="BATTERY").sort((a,b)=>finite(b.priority)-finite(a.priority)||String(a.id).localeCompare(String(b.id)));
  const batteryAvailable=batteries.reduce((n,b)=>n+Math.min(Math.max(0,finite(b.maxDischargeKW)),Math.max(0,finite(b.energyKJ))/dt),0),available=Math.min(generators+batteryAvailable,transformerLimit);
  const consumers=members.filter(x=>x.type==="CONSUMER").sort((a,b)=>finite(b.priority)-finite(a.priority)||String(a.id).localeCompare(String(b.id)));
  let remaining=available,allocated=0,totalInput=0;const allocations=[];
  for(const consumer of consumers){
   const demand=Math.max(0,finite(consumer.demandKW)),declaredLoss=Math.max(0,Math.min(.99,finite(consumer.transmissionLoss,0))),pathLoss=pathLosses.get(String(consumer.id))||0;
   const loss=Math.max(0,Math.min(.99,1-(1-declaredLoss)*(1-pathLoss))),efficiency=1-loss;
   const delivered=Math.min(demand,remaining*efficiency),input=demand?delivered/efficiency:0;
   remaining=Math.max(0,remaining-input);totalInput+=input;allocated+=delivered;
   const ratio=demand===0?1:delivered/demand;
   allocations.push({id:String(consumer.id),demandKW:demand,deliveredKW:delivered,ratio,transmissionLoss:loss,status:ratio>=1?"RUNNING":ratio>=.8?"BROWNOUT_RUNNING":"PAUSED_POWER",priority:finite(consumer.priority)});
  }
  let storageUsed=Math.max(0,totalInput-generators),chargeRemaining=Math.max(0,Math.min(generators,transformerLimit)-Math.min(totalInput,generators));const batteryChanges=[];
  for(const battery of batteries){
   const before=Math.max(0,finite(battery.energyKJ)),capacity=Math.max(0,finite(battery.capacityKJ)),maxDischarge=Math.max(0,finite(battery.maxDischargeKW)),maxCharge=Math.max(0,finite(battery.maxChargeKW));let discharge=0,charge=0;
   if(storageUsed>0){discharge=Math.min(storageUsed,maxDischarge,before/dt);storageUsed-=discharge}else if(chargeRemaining>0){charge=Math.min(chargeRemaining,maxCharge,Math.max(0,capacity-before)/dt);chargeRemaining-=charge}
   const after=Math.min(capacity,Math.max(0,before-discharge*dt+charge*dt));batteryChanges.push({id:String(battery.id),beforeKJ:before,afterKJ:after,dischargeKW:discharge,chargeKW:charge,deltaKJ:after-before});
  }
  results.push({networkID:stableNetworkID("POWER",ids),nodeIDs:ids,generationKW:generators,transformerLimitKW:transformerLimit,storageAvailableKW:batteryAvailable,storageDischargeKW:batteryChanges.reduce((n,x)=>n+x.dischargeKW,0),storageChargeKW:batteryChanges.reduce((n,x)=>n+x.chargeKW,0),availableKW:available,inputKW:totalInput,allocatedKW:allocated,transmissionLossKW:Math.max(0,totalInput-allocated),allocations,batteryChanges});
 }
 return results;
}
export function applyPowerBatteryChanges(nodes=[],networks=[]){const byID=new Map((nodes||[]).map(n=>[String(n.id),n])),applied=[];for(const network of networks||[])for(const change of network.batteryChanges||[]){const node=byID.get(String(change.id));if(!node)continue;node.energyKJ=change.afterKJ;applied.push(change)}return applied}
export function transferFluid({source,target,requestedLiters,deltaSeconds=1,maxFlowLps=Infinity,allowMixing=false}){
 const requested=Math.max(0,finite(requestedLiters)),dt=Math.max(0,finite(deltaSeconds)),flow=Math.max(0,finite(maxFlowLps,Infinity)),sourceAmount=Math.max(0,finite(source.amountL)),targetAmount=Math.max(0,finite(target.amountL)),capacity=Math.max(0,finite(target.capacityL,Infinity));
 if(!source.fluidType||!target.fluidType&&targetAmount>0)return {movedL:0,reason:"fluid-type-missing"};if(target.fluidType&&source.fluidType!==target.fluidType&&!allowMixing)return {movedL:0,reason:"fluid-mismatch"};
 const moved=Math.min(requested,sourceAmount,flow*dt,Math.max(0,capacity-targetAmount));if(moved<=0)return {movedL:0,reason:"no-capacity-or-supply"};
 source.amountL=sourceAmount-moved;target.amountL=targetAmount+moved;if(!target.fluidType)target.fluidType=source.fluidType;if(allowMixing&&target.fluidType!==source.fluidType)target.contaminants=[...(target.contaminants||[]),source.fluidType];
 return {movedL:moved,fluidType:source.fluidType,sourceRemainingL:source.amountL,targetAmountL:target.amountL};
}
export function validateFluidBalance(before,after,tolerance=1e-8){const delta=finite(after)-finite(before);return {valid:Math.abs(delta)<=tolerance,delta}}
