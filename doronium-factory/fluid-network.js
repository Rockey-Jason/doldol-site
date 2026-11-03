/* A17.2 FluidNetwork. Fluids are measured in litres and are not ItemStacks. */
export const FLUID_IDS = Object.freeze([
  "FLUID_WATER", "FLUID_OIL", "FLUID_PETROLEUM", "FLUID_COOLANT",
  "FLUID_MOLTEN_METAL", "FLUID_LAVA", "FLUID_CHEMICAL"
]);
const validFluidIDs=new Set(FLUID_IDS);
const clone=value=>typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
const finite=n=>Number.isFinite(Number(n));
const nonNegative=n=>finite(n)&&Number(n)>=0;
const ratio=n=>finite(n)&&Number(n)>=0&&Number(n)<=1;

export function createFluidState({tanks=[],pipes=[],pumps=[]}={}) {
  return {
    schemaVersion:1,nextReservationID:1,nextTransferID:1,
    tanks:clone(tanks),pipes:clone(pipes),pumps:clone(pumps),
    reservations:{},consumptionLedger:[],transferLedger:[]
  };
}
function reservedVolume(state,tankID) {
  return Object.values(state.reservations||{}).filter(r=>r.status==="reserved"&&r.tankID===tankID)
    .reduce((sum,r)=>sum+Number(r.volumeL||0),0);
}
function validTank(tank) {
  return !!tank&&typeof tank.id==="string"&&!!tank.id&&typeof tank.nodeID==="string"&&!!tank.nodeID&&
    (tank.fluidID===null||validFluidIDs.has(tank.fluidID))&&nonNegative(tank.volumeL)&&
    nonNegative(tank.capacityL)&&Number(tank.volumeL)<=Number(tank.capacityL)&&
    nonNegative(tank.temperatureC??0)&&ratio(tank.contamination??0)&&nonNegative(tank.pressureKPa??0);
}
export function validateFluidState(state) {
  const errors=[];
  if(!state||state.schemaVersion!==1||!Array.isArray(state.tanks)||!Array.isArray(state.pipes)||!Array.isArray(state.pumps))
    return {valid:false,errors:["INVALID_FLUID_STATE"]};
  const tankIDs=new Set(),pipeIDs=new Set(),pumpIDs=new Set();
  for(const tank of state.tanks){
    if(!validTank(tank))errors.push("INVALID_TANK:"+String(tank?.id));
    if(tankIDs.has(tank?.id))errors.push("DUPLICATE_TANK:"+tank.id);
    tankIDs.add(tank?.id);
    if(Number(tank?.volumeL)>0&&!tank?.fluidID)errors.push("TANK_WITHOUT_FLUID_ID:"+tank.id);
  }
  for(const pipe of state.pipes){
    if(!pipe?.id||pipeIDs.has(pipe.id)||typeof pipe.fromNodeID!=="string"||typeof pipe.toNodeID!=="string"||
      pipe.fromNodeID===pipe.toNodeID||!nonNegative(pipe.maxFlowLps)||!ratio(pipe.lossRatio??0)||
      !nonNegative(pipe.pressureDropKPa??0))errors.push("INVALID_PIPE:"+String(pipe?.id));
    pipeIDs.add(pipe?.id);
  }
  for(const pump of state.pumps){
    if(!pump?.id||pumpIDs.has(pump.id)||typeof pump.nodeID!=="string"||
      !nonNegative(pump.pressureBoostKPa??0)||!nonNegative(pump.maxFlowLps))errors.push("INVALID_PUMP:"+String(pump?.id));
    pumpIDs.add(pump?.id);
  }
  for(const [id,reservation] of Object.entries(state.reservations||{})){
    if(id!==reservation?.reservationID||!tankIDs.has(reservation?.tankID)||
      !nonNegative(reservation?.volumeL)||Number(reservation?.volumeL)<=0||
      !["reserved","committed","released"].includes(reservation?.status))errors.push("INVALID_FLUID_RESERVATION:"+id);
  }
  for(const tank of state.tanks)if(reservedVolume(state,tank.id)>Number(tank.volumeL)+1e-9)
    errors.push("RESERVATION_EXCEEDS_TANK_VOLUME:"+tank.id);
  return {valid:errors.length===0,errors};
}

export function reserveFluid(state,tankID,volumeL,ownerID="fluid-transaction") {
  if(!state||!Array.isArray(state.tanks))return {ok:false,reason:"INVALID_FLUID_STATE"};
  const tank=state.tanks.find(item=>item.id===tankID),volume=Number(volumeL);
  if(!tank||!finite(volume)||volume<=0)return {ok:false,reason:"INVALID_FLUID_RESERVATION"};
  const available=Number(tank.volumeL)-reservedVolume(state,tankID);
  if(volume>available+1e-9)return {ok:false,reason:"INSUFFICIENT_FLUID"};
  const reservationID="FLUID-RES-"+state.nextReservationID++;
  state.reservations[reservationID]={reservationID,tankID,volumeL:volume,ownerID:String(ownerID),status:"reserved"};
  return {ok:true,reservationID,availableAfter:available-volume};
}
export function releaseFluidReservation(state,reservationID) {
  const reservation=state?.reservations?.[reservationID];
  if(!reservation||reservation.status!=="reserved")return false;
  reservation.status="released";return true;
}
export function commitFluidReservation(state,reservationID) {
  const reservation=state?.reservations?.[reservationID];
  if(!reservation||reservation.status!=="reserved")return {ok:false,reason:"RESERVATION_NOT_ACTIVE"};
  const tank=state.tanks.find(item=>item.id===reservation.tankID);
  if(!tank||Number(tank.volumeL)+1e-9<reservation.volumeL)return {ok:false,reason:"FLUID_STATE_CHANGED"};
  tank.volumeL=Math.max(0,Number(tank.volumeL)-reservation.volumeL);
  reservation.status="committed";
  const event={eventID:"FLUID-CONSUME-"+state.nextTransferID++,reservationID,tankID:tank.id,fluidID:tank.fluidID,volumeL:reservation.volumeL};
  state.consumptionLedger.push(event);
  if(state.consumptionLedger.length>512)state.consumptionLedger.splice(0,state.consumptionLedger.length-512);
  return {ok:true,event:clone(event)};
}

function findFluidPath(state,fromNodeID,toNodeID) {
  const adjacency=new Map();
  const connect=(from,to,pipe,direction)=>{if(!adjacency.has(from))adjacency.set(from,[]);adjacency.get(from).push({nodeID:to,pipe,direction})};
  for(const pipe of state.pipes){
    if(pipe.enabled===false||pipe.open===false||Number(pipe.maxFlowLps)<=0)continue;
    connect(pipe.fromNodeID,pipe.toNodeID,pipe,"forward");
    if(pipe.bidirectional===true)connect(pipe.toNodeID,pipe.fromNodeID,pipe,"reverse");
  }
  for(const list of adjacency.values())list.sort((a,b)=>a.nodeID.localeCompare(b.nodeID)||a.pipe.id.localeCompare(b.pipe.id));
  const queue=[{nodeID:fromNodeID,path:[]}],visited=new Set([fromNodeID]);
  for(let i=0;i<queue.length;i++){
    const current=queue[i];
    if(current.nodeID===toNodeID)return current.path;
    for(const step of adjacency.get(current.nodeID)||[]){
      if(visited.has(step.nodeID))continue;
      if(step.direction==="reverse"&&step.pipe.checkValve===true)continue;
      visited.add(step.nodeID);queue.push({nodeID:step.nodeID,path:current.path.concat([step])});
    }
  }
  return null;
}

export function transferFluid(state,{sourceTankID,targetTankID,requestedL,dtSeconds}={}) {
  const invalid=validateFluidState(state);
  if(!invalid.valid)return {ok:false,reason:"INVALID_FLUID_STATE",errors:invalid.errors};
  const dt=Number(dtSeconds),requested=Number(requestedL);
  if(!finite(dt)||dt<=0||!finite(requested)||requested<=0)return {ok:false,reason:"INVALID_TRANSFER_AMOUNT"};
  const source=state.tanks.find(t=>t.id===sourceTankID),target=state.tanks.find(t=>t.id===targetTankID);
  if(!source||!target||source.id===target.id)return {ok:false,reason:"INVALID_TANK_PAIR"};
  if(!source.fluidID||Number(source.volumeL)<=0)return {ok:false,reason:"SOURCE_EMPTY"};
  if(target.fluidID&&target.fluidID!==source.fluidID)return {ok:false,reason:"FLUID_TYPE_MISMATCH"};
  const path=findFluidPath(state,source.nodeID,target.nodeID);
  if(!path)return {ok:false,reason:"NO_OPEN_FLUID_PATH"};
  const pumps=state.pumps.filter(pump=>path.some(step=>step.nodeID===pump.nodeID)||source.nodeID===pump.nodeID)
    .filter(pump=>pump.enabled!==false&&pump.powered===true).sort((a,b)=>a.id.localeCompare(b.id));
  const pumpFlow=pumps.length?Math.min(...pumps.map(p=>Number(p.maxFlowLps))):Number.POSITIVE_INFINITY;
  const pressure=Number(source.pressureKPa||0)+pumps.reduce((sum,p)=>sum+Number(p.pressureBoostKPa||0),0)-
    path.reduce((sum,step)=>sum+Number(step.pipe.pressureDropKPa||0),0);
  if(pressure+1e-9<Number(target.requiredPressureKPa||0))return {ok:false,reason:"INSUFFICIENT_PRESSURE",availablePressureKPa:pressure};
  const maxFlow=path.length?Math.min(...path.map(step=>Number(step.pipe.maxFlowLps))):Number.POSITIVE_INFINITY;
  let factor=1,deliveredCapacity=Number.POSITIVE_INFINITY;
  for(const step of path){
    const loss=Number(step.pipe.lossRatio||0);
    factor*=1-loss;
    deliveredCapacity=Math.min(deliveredCapacity,Number(step.pipe.maxFlowLps)*dt*factor);
  }
  if(factor<=0)return {ok:false,reason:"PIPE_LOSS_BLOCKS_FLOW"};
  const sourceAvailable=Number(source.volumeL)-reservedVolume(state,source.id);
  const targetSpace=Number(target.capacityL)-Number(target.volumeL);
  const maxSourceByPipe=Math.min(maxFlow*dt,pumpFlow*dt,deliveredCapacity/factor);
  const sourceDraw=Math.min(requested/factor,sourceAvailable,targetSpace/factor,maxSourceByPipe);
  if(sourceDraw<=1e-9)return {ok:false,reason:"NO_TRANSFER_CAPACITY"};
  const delivered=sourceDraw*factor,leaked=sourceDraw-delivered;
  const incomingContamination=Number(source.contamination||0);
  const incomingTemperature=Number(source.temperatureC||0);
  const oldVolume=Number(target.volumeL),newVolume=oldVolume+delivered;
  const oldWeight=oldVolume,newWeight=delivered;
  const oldContamination=Number(target.contamination||0),oldTemperature=Number(target.temperatureC||0);
  const resultingContamination=(oldContamination*oldWeight+incomingContamination*newWeight)/newVolume;
  if(finite(target.maxContamination)&&resultingContamination>Number(target.maxContamination)+1e-9)
    return {ok:false,reason:"CONTAMINATION_LIMIT"};
  source.volumeL=Math.max(0,Number(source.volumeL)-sourceDraw);
  target.volumeL=newVolume;target.fluidID=source.fluidID;
  target.temperatureC=(oldTemperature*oldWeight+incomingTemperature*newWeight)/newVolume;
  target.contamination=resultingContamination;
  target.pressureKPa=Math.max(Number(target.pressureKPa||0),pressure);
  const transferID="FLUID-XFER-"+state.nextTransferID++;
  const event={transferID,sourceTankID,targetTankID,fluidID:source.fluidID,sourceDrawL:sourceDraw,
    deliveredL:delivered,leakedL:leaked,pressureKPa:pressure,temperatureC:incomingTemperature,
    contamination:incomingContamination,path: path.map(step=>({pipeID:step.pipe.id,direction:step.direction}))};
  state.transferLedger.push(event);
  if(state.transferLedger.length>512)state.transferLedger.splice(0,state.transferLedger.length-512);
  return {ok:true,event:clone(event),remainingSourceL:source.volumeL,targetVolumeL:target.volumeL};
}
