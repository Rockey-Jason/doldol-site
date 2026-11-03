/* Deterministic fluid-network solver with SI volume, flow limits, pressure and conservation checks. */
const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FLUID_TYPES=Object.freeze(["WATER","OIL","PETROLEUM","MOLTEN_METAL","LAVA","CHEMICAL"]);
export const FLUID_NODE_TYPES=Object.freeze(["PIPE","PUMP","VALVE","TANK","SOURCE","CONSUMER"]);
const idOf=x=>String(x?.id??"");
function adjacency(nodes,edges){
 const ids=new Set(nodes.map(idOf)),map=new Map([...ids].map(id=>[id,[]]));
 for(const e of edges||[])if(ids.has(String(e.from))&&ids.has(String(e.to))&&e.open!==false){
  map.get(String(e.from)).push(String(e.to));map.get(String(e.to)).push(String(e.from));
 }
 return map;
}
export function buildFluidNetworks(nodes=[],edges=[]){
 const byID=new Map((nodes||[]).map(n=>[idOf(n),n])),adj=adjacency(nodes,edges);
 const networkByID=new Map(),networks=[];const seen=new Set();let index=0;
 for(const id of [...adj.keys()].sort())if(!seen.has(id)){
  const queue=[id],members=[];seen.add(id);
  while(queue.length){const at=queue.shift();members.push(at);for(const next of adj.get(at)||[])if(!seen.has(next)){seen.add(next);queue.push(next)}}
  index++;members.sort();const networkID="FLUID-"+index;for(const member of members)networkByID.set(member,networkID);networks.push({networkID,nodeIDs:members});
 }
 return {byID,adj,networkByID,networks,edges:(edges||[]).filter(e=>e.open!==false).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))};
}
function portAllows(node,port){const ports=node?.ports;if(!Array.isArray(ports)||!port)return true;return ports.includes(port)}
function edgeEnabled(edge,from,to){
 if(edge.open===false)return false;
 if(edge.oneWay===false)return true;
 if(edge.from!=null&&edge.to!=null)return String(edge.from)===idOf(from)&&String(edge.to)===idOf(to);
 return true;
}
export function totalFluidLiters(nodes){
 const totals={};for(const n of nodes||[]){const type=n.fluidType;if(type)totals[type]=(totals[type]||0)+Math.max(0,finite(n.amountL))}return totals;
}
export function tickFluidNetwork({nodes=[],edges=[],deltaSeconds=.1,ambientTemperatureC=20}={}){
 const dt=Math.max(0,finite(deltaSeconds)),graph=buildFluidNetworks(nodes,edges),before=totalFluidLiters(nodes),flows=[],leaks=[],faults=[];
 for(const edge of graph.edges){
  let source=graph.byID.get(String(edge.from)),target=graph.byID.get(String(edge.to));if(!source||!target)continue;
  const reverse=()=>{const previous=source;source=target;target=previous};
  const effectivePressure=node=>Math.max(0,finite(node.pressureKPa))+(node.type==="PUMP"?Math.max(0,finite(node.pumpHeadKPa)):0);
  if(edge.open===false)continue;
  if(edge.oneWay===false){
   const forwardPressure=effectivePressure(source),reversePressure=effectivePressure(target);
   if(reversePressure>forwardPressure)reverse();
   else if(forwardPressure===reversePressure)continue;
  }else if(!edgeEnabled(edge,source,target))continue;
  const fromPort=source===graph.byID.get(String(edge.from))?edge.fromPort:edge.toPort;
  const toPort=target===graph.byID.get(String(edge.to))?edge.toPort:edge.fromPort;
  if(!portAllows(source,fromPort)||!portAllows(target,toPort))continue;
  if(!FLUID_NODE_TYPES.includes(String(source.type))||!FLUID_NODE_TYPES.includes(String(target.type)))continue;
  if(target.type==="SOURCE"||source.type==="CONSUMER")continue;
  const sourceAmount=Math.max(0,finite(source.amountL)),targetAmount=Math.max(0,finite(target.amountL));
  const capacity=Math.max(0,finite(target.capacityL,Infinity));
  const sourceType=String(source.fluidType||""),targetType=String(target.fluidType||"");
  if(!FLUID_TYPES.includes(sourceType)||sourceAmount<=0)continue;
  if(targetAmount>0&&targetType!==sourceType&&!target.allowMixing){faults.push({edgeID:edge.id,reason:"FLUID_MISMATCH",source:sourceType,target:targetType});continue}
  const sourcePressure=Math.max(0,finite(source.pressureKPa)),targetPressure=Math.max(0,finite(target.pressureKPa));
  const gravityHead=Math.max(0,finite(edge.gravityHeadKPa)),pumpHead=source.type==="PUMP"?Math.max(0,finite(source.pumpHeadKPa)):0;
  const pressureDelta=Math.max(0,sourcePressure+pumpHead+gravityHead-targetPressure);
  if(pressureDelta<=0)continue;
  const ratedPressure=Math.max(0,finite(edge.maxPressureKPa,finite(source.maxPressureKPa,Infinity)));
  if(sourcePressure+pumpHead+gravityHead>ratedPressure){
   faults.push({edgeID:edge.id,reason:"OVERPRESSURE",pressureKPa:sourcePressure+pumpHead+gravityHead,ratedPressureKPa:ratedPressure});
   if(edge.breakOnOverpressure){edge.open=false;edge.broken=true;continue}
  }
  const conductance=Math.max(0,finite(edge.conductanceLpsPerKPa,finite(edge.maxFlowLps,0)/(Math.max(1,finite(edge.referencePressureKPa,100)))));
  const pressureFlow=conductance*pressureDelta,maxFlow=Math.max(0,finite(edge.maxFlowLps,Infinity));
  const requested=Math.max(0,finite(edge.requestedLiters,Infinity));
  const moved=Math.min(sourceAmount,Math.max(0,capacity-targetAmount),dt*maxFlow,dt*pressureFlow,requested);
  if(!(moved>0))continue;
  source.amountL=sourceAmount-moved;target.amountL=targetAmount+moved;
  if(source.amountL<=1e-12){source.amountL=0;source.fluidType=null}
  if(targetAmount<=0)target.fluidType=sourceType;
  const sourceTemp=finite(source.temperatureC,20),targetTemp=finite(target.temperatureC,20);
  target.temperatureC=targetAmount>0?(targetTemp*targetAmount+sourceTemp*moved)/(targetAmount+moved):sourceTemp;
  source.pressureKPa=Math.max(0,sourcePressure-moved/Math.max(.001,finite(source.pressureVolumeL,100))*100);
  target.pressureKPa=Math.max(targetPressure,finite(edge.pressureRecoveryKPa,0));
  if(target.allowMixing&&targetType&&targetType!==sourceType)target.contaminants=[...(target.contaminants||[]),sourceType];
  const flowLps=moved/dt;
  flows.push({edgeID:edge.id,from:idOf(source),to:idOf(target),fluidType:sourceType,movedL:moved,flowLps,pressureDeltaKPa:pressureDelta});
  const leakRate=clamp(finite(edge.leakRateLps,0),0,flowLps);
  if(leakRate>0){const lost=Math.min(moved,leakRate*dt);target.amountL=Math.max(0,target.amountL-lost);if(target.amountL===0)target.fluidType=null;leaks.push({edgeID:edge.id,fluidType:sourceType,lostL:lost})}
 }
 // Thermal exchange is deterministic and does not alter fluid mass.
 for(const node of nodes||[]){
  if(!(finite(node.amountL)>0))continue;
  const insulation=clamp(finite(node.insulation,0),0,.99),exchange=Math.max(0,finite(node.thermalExchangePerSecond,.01));
  const current=finite(node.temperatureC,ambientTemperatureC);
  node.temperatureC=current+(finite(ambientTemperatureC)-current)*Math.min(1,exchange*dt*(1-insulation));
  const contaminants=Array.isArray(node.contaminants)?node.contaminants:[];
  if(contaminants.length)node.contaminants=[...new Set(contaminants.map(String))].sort();
 }
 const after=totalFluidLiters(nodes),massBefore=Object.values(before).reduce((a,b)=>a+b,0),massAfter=Object.values(after).reduce((a,b)=>a+b,0),lost=leaks.reduce((n,x)=>n+x.lostL,0);
 return {networks:graph.networks,networkByID:Object.fromEntries(graph.networkByID),flows,leaks,faults,before,after,massBalance:{beforeL:massBefore,afterL:massAfter,lostL:lost,deltaL:massBefore-massAfter-lost,valid:Math.abs(massBefore-massAfter-lost)<=1e-8}};
}
export function consumeFluid(node,requestedLiters,expectedFluidType){
 const request=Math.max(0,finite(requestedLiters)),amount=Math.max(0,finite(node?.amountL));
 if(!node||!FLUID_TYPES.includes(String(node.fluidType||""))||expectedFluidType&&node.fluidType!==expectedFluidType||amount<request)return {ok:false,movedL:0,reason:"FLUID_UNAVAILABLE"};
 node.amountL=amount-request;if(node.amountL===0)node.fluidType=null;
 return {ok:true,movedL:request,fluidType:expectedFluidType||node.fluidType};
}
export function transferFluidDirect({source,target,requestedLiters,deltaSeconds=1,maxFlowLps=Infinity}={}){
 const requested=Math.max(0,finite(requestedLiters)),dt=Math.max(0,finite(deltaSeconds)),flow=Math.max(0,finite(maxFlowLps,Infinity));
 if(!source||!target||!FLUID_TYPES.includes(String(source.fluidType||"")))return {movedL:0,reason:"INVALID_FLUID_SOURCE"};
 if(target.amountL>0&&target.fluidType!==source.fluidType&&!target.allowMixing)return {movedL:0,reason:"FLUID_MISMATCH"};
 const moved=Math.min(requested,Math.max(0,finite(source.amountL)),Math.max(0,flow*dt),Math.max(0,finite(target.capacityL,Infinity)-finite(target.amountL)));
 if(moved<=0)return {movedL:0,reason:"NO_CAPACITY_OR_SUPPLY"};
 source.amountL-=moved;target.amountL=finite(target.amountL)+moved;if(!target.fluidType)target.fluidType=source.fluidType;
 return {movedL:moved,fluidType:source.fluidType,sourceRemainingL:source.amountL,targetAmountL:target.amountL};
}
