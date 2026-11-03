/* Resumable, all-input-reserved Infinity Fusion transaction. */
import {INFINITY_REQUIREMENTS,INFINITY_TOTAL_INPUT,validateInfinityManifest} from "./canonical-data.js";
import {reserveItemBatch,releaseItemReservation,commitItemReservations,addItemStack} from "./simulation-core.js";
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const POWER_FLOOR=.8;
export function startInfinityFusion(state,{jobID,machineID,stageDurationsSeconds,stagePowerMW}={}){
 if(state.fusionJob&&["RESERVED","RUNNING","WAITING_POWER","ERROR"].includes(state.fusionJob.status))return {ok:false,reason:"job-already-active"};
 if(!jobID||!machineID||!Array.isArray(stageDurationsSeconds)||stageDurationsSeconds.length!==7||stageDurationsSeconds.some(x=>!Number.isFinite(x)||x<=0)||Math.abs(stageDurationsSeconds.reduce((a,b)=>a+b,0)-260)>.001)return {ok:false,reason:"invalid-seven-stage-plan"};
 if(!Array.isArray(stagePowerMW)||stagePowerMW.length!==7||stagePowerMW.some(x=>!Number.isFinite(x)||x<=0))return {ok:false,reason:"invalid-stage-power-plan"};
 const stacks=state.runtime?.itemStacks||[],manifest=validateInfinityManifest(stacks);
 if(!manifest.valid||manifest.total!==INFINITY_TOTAL_INPUT)return {ok:false,reason:"manifest-invalid",errors:manifest.errors};
 const reservationIDs=reserveItemBatch(state,INFINITY_REQUIREMENTS,"INFINITY:"+jobID);
 if(!reservationIDs)return {ok:false,reason:"reservation-failed"};
 state.fusionJob={jobID:String(jobID),machineID:String(machineID),status:"RESERVED",stageIndex:0,stageElapsedSeconds:0,totalElapsedSeconds:0,stageDurationsSeconds:[...stageDurationsSeconds],stagePowerMW:[...stagePowerMW],reservationIDs:[...reservationIDs],inputQuantity:INFINITY_TOTAL_INPUT,outputStackID:null,createdTick:Number(state.tick)||0};
 return {ok:true,job:clone(state.fusionJob)};
}
export function tickInfinityFusion(state,{deltaSeconds=.1,machineExists=true,powerRatio=1,maintenanceRequired=false}={}){
 const job=state.fusionJob;if(!job||!["RESERVED","RUNNING","WAITING_POWER","ERROR"].includes(job.status))return {status:job?.status||"IDLE",completed:false};
 if(!machineExists){job.status="ERROR";job.errorCode="MACHINE_MISSING";return {status:job.status,completed:false,recoverable:true}}
 if(maintenanceRequired){job.status="ERROR";job.errorCode="MAINTENANCE_REQUIRED";return {status:job.status,completed:false,recoverable:true}}
 if(!Number.isFinite(deltaSeconds)||deltaSeconds<0)return {status:job.status,completed:false,error:"INVALID_DELTA"};
 if(!Number.isFinite(powerRatio)||powerRatio<POWER_FLOOR){job.status="WAITING_POWER";return {status:job.status,completed:false}}
 job.status="RUNNING";let remaining=deltaSeconds;
 while(remaining>0&&job.stageIndex<7){
  const stageLeft=job.stageDurationsSeconds[job.stageIndex]-job.stageElapsedSeconds;
  const step=Math.min(remaining,stageLeft);job.stageElapsedSeconds+=step;job.totalElapsedSeconds+=step;remaining-=step;
  if(job.stageElapsedSeconds+1e-9>=job.stageDurationsSeconds[job.stageIndex]){job.stageIndex++;job.stageElapsedSeconds=0}
 }
 if(job.stageIndex<7)return {status:job.status,completed:false,stage:job.stageIndex+1,totalElapsedSeconds:job.totalElapsedSeconds};
 const before=clone(state);
 try{
  const consumed=commitItemReservations(state,job.reservationIDs);
  if(!consumed||consumed.reduce((n,x)=>n+x.quantity,0)!==INFINITY_TOTAL_INPUT)throw new Error("INPUT_COMMIT_FAILED");
  const outputStackID=addItemStack(state,"ITEM_DORONUM_INFINITY",1,{quality:100,purity:100,synthetic:false});
  if(!outputStackID)throw new Error("OUTPUT_CREATE_FAILED");
  job.status="COMPLETED";job.outputStackID=outputStackID;job.completedTick=Number(state.tick)||0;job.reservationIDs=[];
  state.completionBuffer=state.completionBuffer||[];state.completionBuffer.push({completionID:"FUSION:"+job.jobID,stackID:outputStackID,itemID:"ITEM_DORONUM_INFINITY",quantity:1});
  return {status:"COMPLETED",completed:true,outputStackID};
 }catch(error){for(const key of Object.keys(state))delete state[key];Object.assign(state,before);state.fusionJob.status="ERROR";state.fusionJob.errorCode=String(error.message||"FUSION_COMMIT_FAILED");return {status:"ERROR",completed:false,recoverable:true,error:state.fusionJob.errorCode}}
}
export function cancelInfinityFusion(state,{jobID}={}){
 const job=state.fusionJob;if(!job||job.jobID!==jobID||!["RESERVED","RUNNING","WAITING_POWER","ERROR"].includes(job.status))return false;
 for(const id of job.reservationIDs||[])releaseItemReservation(state,id);
 job.reservationIDs=[];job.status="CANCELLED";job.cancelledTick=Number(state.tick)||0;return true;
}
export function recoverInfinityFusion(state){
 const job=state.fusionJob;if(!job||!["RESERVED","RUNNING","WAITING_POWER","ERROR"].includes(job.status))return {recoverable:false,reason:"no-active-job"};
 const reservations=job.reservationIDs||[],live=state.runtime?.reservations||{};
 const valid=reservations.length===15&&reservations.every(id=>live[id]?.status==="reserved");
 if(!valid){job.status="ERROR";job.errorCode="RESERVATION_LEDGER_MISMATCH";return {recoverable:false,reason:job.errorCode}}
 if(job.errorCode==="MACHINE_MISSING"||job.errorCode==="MAINTENANCE_REQUIRED"){job.status="RESERVED";delete job.errorCode}
 return {recoverable:true,job:clone(job)};
}
