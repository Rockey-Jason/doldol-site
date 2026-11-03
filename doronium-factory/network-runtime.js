/* Deterministic topology solvers for isolated power and conserved fluid networks. */
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function components(nodes,edges){
 const ids=new Set(nodes.map(n=>String(n.id))),adj=new Map([...ids].map(id=>[id,[]]));
 for(const e of edges||[])if(ids.has(String(e.from))&&ids.has(String(e.to))){adj.get(String(e.from)).push(String(e.to));adj.get(String(e.to)).push(String(e.from))}
 const groups=[],visited=new Set();
 for(const id of [...ids].sort())if(!visited.has(id)){const q=[id],group=[];visited.add(id);while(q.length){const at=q.shift();group.push(at);for(const next of adj.get(at))if(!visited.has(next)){visited.add(next);q.push(next)}}groups.push(group.sort())}
 return groups;
}
export function solvePowerNetworks({nodes=[],edges=[],deltaSeconds=1}={}){
 const byID=new Map(nodes.map(n=>[String(n.id),n])),groups=components(nodes,edges),results=[];
 for(let i=0;i<groups.length;i++){
  const ids=groups[i],members=ids.map(id=>byID.get(id)),generators=members.reduce((n,x)=>n+Math.max(0,finite(x.generationKW)),0);
  let available=generators,storage=0;
  for(const b of members.filter(x=>x.type==="BATTERY").sort((a,b)=>finite(b.priority)-finite(a.priority)||String(a.id).localeCompare(String(b.id)))){
   const maxOut=Math.max(0,finite(b.maxDischargeKW)),energy=Math.max(0,finite(b.energyKJ));
   const out=Math.min(maxOut,energy/Math.max(.001,finite(deltaSeconds,1)));
   storage+=out;available+=out;b._plannedDischargeKJ=out*Math.max(0,finite(deltaSeconds,1));
  }
  const consumers=members.filter(x=>x.type==="CONSUMER").sort((a,b)=>finite(b.priority)-finite(a.priority)||String(a.id).localeCompare(String(b.id)));
  let remaining=available,allocated=0;
  const allocations=[];
  for(const c of consumers){
   const demand=Math.max(0,finite(c.demandKW)),loss=Math.max(0,Math.min(.99,finite(c.transmissionLoss,0)));
   const delivered=Math.min(demand,remaining*(1-loss));remaining-=demand?delivered/(1-loss):0;allocated+=delivered;
   const ratio=demand===0?1:delivered/demand;
   allocations.push({id:String(c.id),demandKW:demand,deliveredKW:delivered,ratio,status:ratio>=1?"RUNNING":ratio>=.8?"BROWNOUT_RUNNING":"PAUSED_POWER"});
  }
  for(const b of members.filter(x=>x.type==="BATTERY")){const out=Math.min(Math.max(0,finite(b.maxDischargeKW)),Math.max(0,finite(b.energyKJ))/Math.max(.001,finite(deltaSeconds,1)));b.energyKJ=Math.max(0,finite(b.energyKJ)-out*Math.max(0,finite(deltaSeconds,1)))}
  results.push({networkID:"POWER-"+(i+1),nodeIDs:ids,generationKW:generators,storageDischargeKW:storage,availableKW:available,allocatedKW:allocated,allocations});
 }
 return results;
}
export function transferFluid({source,target,requestedLiters,deltaSeconds=1,maxFlowLps=Infinity,allowMixing=false}){
 const requested=Math.max(0,finite(requestedLiters)),dt=Math.max(0,finite(deltaSeconds)),flow=Math.max(0,finite(maxFlowLps,Infinity));
 const sourceAmount=Math.max(0,finite(source.amountL)),targetAmount=Math.max(0,finite(target.amountL)),capacity=Math.max(0,finite(target.capacityL,Infinity));
 if(!source.fluidType||!target.fluidType&&targetAmount>0)return {movedL:0,reason:"fluid-type-missing"};
 if(target.fluidType&&source.fluidType!==target.fluidType&&!allowMixing)return {movedL:0,reason:"fluid-mismatch"};
 const moved=Math.min(requested,sourceAmount,flow*dt,Math.max(0,capacity-targetAmount));
 if(moved<=0)return {movedL:0,reason:"no-capacity-or-supply"};
 source.amountL=sourceAmount-moved;target.amountL=targetAmount+moved;if(!target.fluidType)target.fluidType=source.fluidType;
 if(allowMixing&&target.fluidType!==source.fluidType)target.contaminants=[...(target.contaminants||[]),source.fluidType];
 return {movedL:moved,fluidType:source.fluidType,sourceRemainingL:source.amountL,targetAmountL:target.amountL};
}
export function validateFluidBalance(before,after,tolerance=1e-8){
 const delta=finite(after)-finite(before);return {valid:Math.abs(delta)<=tolerance,delta};
}
