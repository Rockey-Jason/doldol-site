/* Resumable, all-input-reserved Infinity Fusion transaction. */
import {INFINITY_REQUIREMENTS,INFINITY_TOTAL_INPUT,CANONICAL_INFINITY_DORONUM_ID,validateInfinityManifest} from "./canonical-data.js";
import {reserveQualifiedItemBatch,releaseItemReservation,commitItemReservations,addItemStack,syncLegacyInventory} from "./simulation-core.js";
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const POWER_FLOOR=.8;
function hasValidQualifiedReservations(state,job){
 if(job?.legacyConsumedInput===true)return true;
 const ids=Array.isArray(job?.reservationIDs)?job.reservationIDs:[];
 if(ids.length!==15||new Set(ids).size!==15)return false;
 const runtime=state?.runtime,live=runtime?.reservations||{},stackByID=new Map((runtime?.itemStacks||[]).map(stack=>[String(stack.runtimeID),stack]));
 const active=ids.map(id=>live[id]);
 if(active.some(reservation=>!reservation||reservation.status!=="reserved"))return false;
 for(const [itemID,required] of Object.entries(INFINITY_REQUIREMENTS)){
  const matches=active.filter(reservation=>reservation.itemID===itemID);
  if(matches.length!==1)return false;
  const reservation=matches[0],allocations=Array.isArray(reservation.allocations)?reservation.allocations:[];
  if(reservation.quantity!==required||allocations.reduce((total,item)=>total+Math.max(0,Number(item.quantity)||0),0)!==required)return false;
  for(const allocation of allocations){
   const stack=stackByID.get(String(allocation.stackID));
   if(!stack||stack.itemID!==itemID||!Number.isSafeInteger(allocation.quantity)||allocation.quantity<=0||stack.quantity<allocation.quantity)return false;
   if(Number(stack.quality)<90||Number(stack.purity)<90||stack.synthetic===true||stack.quarantined===true)return false;
  }
 }
 return true;
}
export function settleInfinityFusionOutput(state,{jobID,outputItemID=CANONICAL_INFINITY_DORONUM_ID,quality=100,purity=100}={}){
 const job=state?.fusionJob;
 if(!job||!jobID||String(job.jobID)!==String(jobID))return {ok:false,reason:"JOB_NOT_FOUND"};
 state.fusionSettlements??={};
 const existing=state.fusionSettlements[String(jobID)];
 if(existing){
  job.status="COMPLETED";job.outputStackID=existing.outputStackID;job.outputIssued=true;job.reservationIDs=[];
  state.fusionDone=true;
  return {ok:true,duplicate:true,outputStackID:existing.outputStackID};
 }
 if(job.outputIssued||state.fusionDone)return {ok:false,reason:"OUTPUT_ALREADY_ISSUED"};
 if(!hasValidQualifiedReservations(state,job))return {ok:false,reason:"RESERVATION_LEDGER_MISMATCH"};
 const snapshot={
  runtime:clone(state.runtime),inventory:clone(state.inventory||{}),meta:clone(state.meta||{}),
  stats:clone(state.stats||{}),fusionDone:!!state.fusionDone,
  fusionSettlements:clone(state.fusionSettlements||{}),job:clone(job)
 };
 try{
  let consumedQuantity=0;
  if(!job.legacyConsumedInput){
   const consumed=commitItemReservations(state,job.reservationIDs||[]);
   if(!consumed)throw new Error("INPUT_COMMIT_FAILED");
   consumedQuantity=consumed.reduce((total,stack)=>total+Math.max(0,Number(stack.quantity)||0),0);
   if(consumedQuantity!==INFINITY_TOTAL_INPUT)throw new Error("INPUT_QUANTITY_MISMATCH");
  }else consumedQuantity=Math.max(INFINITY_TOTAL_INPUT,Math.floor(Number(job.inputQuantity)||0));
  const outputStackID=addItemStack(state,outputItemID,1,{quality,purity,synthetic:false});
  if(!outputStackID)throw new Error("OUTPUT_CREATE_FAILED");
  syncLegacyInventory(state);
  state.stats??={};state.stats.produced??={};
  state.stats.produced[outputItemID]=(Number(state.stats.produced[outputItemID])||0)+1;
  job.status="COMPLETED";job.outputStackID=outputStackID;job.completedTick=Math.max(0,Number(state.tick)||0);job.completedAt=Number(state.seconds)||0;
  job.outputIssued=true;job.reservationIDs=[];
  state.fusionDone=true;
  state.fusionSettlements[String(jobID)]={
   settlementID:"FUSION-SETTLEMENT:"+String(jobID),jobID:String(jobID),
   outputStackID,outputItemID:String(outputItemID),outputQuantity:1,
   inputQuantity:consumedQuantity,completedTick:job.completedTick
  };
  return {ok:true,duplicate:false,outputStackID,inputQuantity:consumedQuantity};
 }catch(error){
  state.runtime=snapshot.runtime;state.inventory=snapshot.inventory;state.meta=snapshot.meta;
  state.stats=snapshot.stats;state.fusionDone=snapshot.fusionDone;state.fusionSettlements=snapshot.fusionSettlements;
  state.fusionJob=snapshot.job;state.fusionJob.status="ERROR";
  state.fusionJob.errorCode=String(error?.message||"FUSION_SETTLEMENT_FAILED");
  return {ok:false,reason:state.fusionJob.errorCode};
 }
}
export function startInfinityFusion(state,{jobID,machineID,stageDurationsSeconds,stagePowerMW}={}){
 if(state.fusionJob&&["RESERVED","RUNNING","WAITING_POWER","CALIBRATING","ERROR"].includes(state.fusionJob.status))return {ok:false,reason:"job-already-active"};
 if(!jobID||!machineID||!Array.isArray(stageDurationsSeconds)||stageDurationsSeconds.length!==7||stageDurationsSeconds.some(x=>!Number.isFinite(x)||x<=0)||Math.abs(stageDurationsSeconds.reduce((a,b)=>a+b,0)-260)>.001)return {ok:false,reason:"invalid-seven-stage-plan"};
 if(!Array.isArray(stagePowerMW)||stagePowerMW.length!==7||stagePowerMW.some(x=>!Number.isFinite(x)||x<=0))return {ok:false,reason:"invalid-stage-power-plan"};
 const requirements=INFINITY_REQUIREMENTS;
 const predicates=Object.fromEntries(Object.keys(requirements).map(id=>[id,stack=>Number(stack.quality)>=90&&Number(stack.purity)>=90&&stack.synthetic!==true&&stack.quarantined!==true]));
 const eligible=(state.runtime?.itemStacks||[]).filter(stack=>stack&&!stack.quarantined&&predicates[stack.itemID]?.(stack));
 const manifest=validateInfinityManifest(eligible);
 if(!manifest.valid||Object.values(manifest.totals).some(quantity=>quantity<100)||manifest.total<INFINITY_TOTAL_INPUT)return {ok:false,reason:"manifest-invalid",errors:manifest.errors};
 const reservationIDs=reserveQualifiedItemBatch(state,requirements,"INFINITY:"+jobID,predicates);
 if(!reservationIDs||reservationIDs.length!==15)return {ok:false,reason:"reservation-failed"};
 state.fusionJob={runtimeVersion:2,jobID:String(jobID),machineID:String(machineID),status:"RESERVED",stageIndex:0,stageElapsedSeconds:0,totalElapsedSeconds:0,stageDurationsSeconds:[...stageDurationsSeconds],stagePowerMW:[...stagePowerMW],reservationIDs:[...reservationIDs],inputQuantity:INFINITY_TOTAL_INPUT,outputStackID:null,createdTick:Number(state.tick)||0};
 return {ok:true,job:clone(state.fusionJob)};
}
export function tickInfinityFusion(state,{deltaSeconds=.1,machineExists=true,powerRatio=1,maintenanceRequired=false}={}){
 const job=state.fusionJob;if(!job||!["RESERVED","RUNNING","WAITING_POWER","CALIBRATING","ERROR"].includes(job.status))return {status:job?.status||"IDLE",completed:false};
 if(!machineExists){job.status="ERROR";job.errorCode="MACHINE_MISSING";return {status:job.status,completed:false,recoverable:true}}
 if(maintenanceRequired){job.status="ERROR";job.errorCode="MAINTENANCE_REQUIRED";return {status:job.status,completed:false,recoverable:true}}
 if(!Number.isFinite(deltaSeconds)||deltaSeconds<0)return {status:job.status,completed:false,error:"INVALID_DELTA"};
 if(!hasValidQualifiedReservations(state,job)){job.status="ERROR";job.errorCode="RESERVATION_LEDGER_MISMATCH";return {status:job.status,completed:false,recoverable:false,error:job.errorCode}}
 if(!Number.isFinite(powerRatio)||powerRatio<POWER_FLOOR){job.status="WAITING_POWER";return {status:job.status,completed:false}}
 job.status="RUNNING";let remaining=deltaSeconds;
 while(remaining>0&&job.stageIndex<7){
  const stageLeft=job.stageDurationsSeconds[job.stageIndex]-job.stageElapsedSeconds;
  const step=Math.min(remaining,stageLeft);job.stageElapsedSeconds+=step;job.totalElapsedSeconds+=step;remaining-=step;
  if(job.stageElapsedSeconds+1e-9>=job.stageDurationsSeconds[job.stageIndex]){job.stageIndex++;job.stageElapsedSeconds=0}
 }
 if(job.stageIndex<7)return {status:job.status,completed:false,stage:job.stageIndex+1,totalElapsedSeconds:job.totalElapsedSeconds};
 const settlement=settleInfinityFusionOutput(state,{jobID:job.jobID,outputItemID:CANONICAL_INFINITY_DORONUM_ID,quality:100,purity:100});
 if(!settlement.ok)return {status:"ERROR",completed:false,recoverable:true,error:settlement.reason};
 return {status:"COMPLETED",completed:true,outputStackID:settlement.outputStackID,duplicate:!!settlement.duplicate};
}
export function cancelInfinityFusion(state,{jobID}={}){
 const job=state.fusionJob;if(!job||job.jobID!==jobID||!["RESERVED","RUNNING","WAITING_POWER","CALIBRATING","ERROR"].includes(job.status))return false;
 for(const id of job.reservationIDs||[])releaseItemReservation(state,id);
 job.reservationIDs=[];job.status="CANCELLED";job.cancelledTick=Number(state.tick)||0;return true;
}
export function recoverInfinityFusion(state){
 const job=state.fusionJob;if(!job||!["RESERVED","RUNNING","WAITING_POWER","CALIBRATING","ERROR"].includes(job.status))return {recoverable:false,reason:"no-active-job"};
 const valid=hasValidQualifiedReservations(state,job);
 if(!valid){job.status="ERROR";job.errorCode="RESERVATION_LEDGER_MISMATCH";return {recoverable:false,reason:job.errorCode}}
 if(job.errorCode==="MACHINE_MISSING"||job.errorCode==="MAINTENANCE_REQUIRED"||job.status==="CALIBRATING"){job.status="RESERVED";delete job.errorCode}
 return {recoverable:true,job:clone(job)};
}
