import test from "node:test";import assert from "node:assert/strict";
import {createRuntimeState,addItemStack,stackTotals} from "./simulation-core.js";
import {createOwnershipState,addCustody,validateOwnershipState} from "./ownership-runtime.js";
import {CANONICAL_DORONUM_IDS,CANONICAL_INFINITY_DORONUM_ID} from "./canonical-data.js";
import {startInfinityFusion,tickInfinityFusion,cancelInfinityFusion,recoverInfinityFusion,settleInfinityFusionOutput} from "./fusion-runtime.js";
function state(){const s={tick:0,inventory:{},runtime:createRuntimeState()};for(const id of CANONICAL_DORONUM_IDS)addItemStack(s,id,100,{quality:95,purity:95,synthetic:false});return s}
const plan={jobID:"JOB-1",machineID:"FUSION-1",stageDurationsSeconds:[30,35,40,45,45,35,30],stagePowerMW:[.5,1,1.5,2,3,4,5]};
function addReservedCustody(s){
 const ledger=createOwnershipState();
 for(const reservation of Object.values(s.runtime.reservations||{}))for(const allocation of reservation.allocations||[]){
  const stack=s.runtime.itemStacks.find(item=>item.runtimeID===allocation.stackID);
  if(!stack)throw new Error("test reservation stack missing");
  addCustody(ledger,{stackID:String(allocation.stackID)+"@"+String(reservation.reservationID),itemID:stack.itemID,quantity:allocation.quantity,ownerType:"ACTIVE_JOB",ownerID:reservation.ownerID,metadata:{quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}});
 }
 s.ownershipLedger=ledger;s.ownershipLedgerValidation=validateOwnershipState(ledger);return s.ownershipLedgerValidation;
}
function rebuildInventoryCustody(s){
 const previous=s.ownershipLedger,ledger=createOwnershipState();
 ledger.nextLedgerID=previous.nextLedgerID;ledger.transactions=structuredClone(previous.transactions);ledger.consumed=structuredClone(previous.consumed);
 for(const stack of s.runtime.itemStacks)addCustody(ledger,{stackID:stack.runtimeID,itemID:stack.itemID,quantity:stack.quantity,ownerType:"PLAYER_INVENTORY",ownerID:"player",metadata:{quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}});
 s.ownershipLedger=ledger;s.ownershipLedgerValidation=validateOwnershipState(ledger);return s.ownershipLedgerValidation;
}
test("Fusion reserves all 1500 canonical inputs without consuming them",()=>{const s=state(),before=stackTotals(s);const r=startInfinityFusion(s,plan);assert.equal(r.ok,true);assert.equal(s.fusionJob.reservationIDs.length,15);assert.deepEqual(stackTotals(s),before)});
test("missing machine preserves job and reservations for recovery",()=>{const s=state();startInfinityFusion(s,plan);const r=tickInfinityFusion(s,{machineExists:false});assert.equal(r.recoverable,true);assert.equal(recoverInfinityFusion(s).recoverable,true);assert.equal(s.fusionJob.status,"RESERVED")});
test("qualified canonical inputs ignore unrelated low-quality stock and reserve exactly 100 each",()=>{
 const s=state(),first=CANONICAL_DORONUM_IDS[0];
 addItemStack(s,first,50,{quality:70,purity:99,synthetic:false});
 const result=startInfinityFusion(s,plan);
 assert.equal(result.ok,true);
 const reservationIDs=result.job.reservationIDs;
 assert.equal(reservationIDs.length,15);
 const reservation=Object.values(s.runtime.reservations).filter(item=>reservationIDs.includes(item.reservationID));
 const stacksByID=new Map(s.runtime.itemStacks.map(item=>[item.runtimeID,item]));
 const selected=reservation.flatMap(item=>item.allocations||[]).filter(item=>stacksByID.get(item.stackID)?.itemID===first);
 assert.equal(selected.reduce((n,item)=>n+item.quantity,0),100);
 assert.equal(s.runtime.itemStacks.filter(item=>item.itemID===first&&item.quality<90).reduce((n,item)=>n+item.quantity,0),50);
 assert.equal(s.fusionJob.inputQuantity,1500);
});
test("a deficient qualified canonical item blocks Fusion without creating reservations",()=>{
 const s=state(),first=CANONICAL_DORONUM_IDS[0];
 s.runtime.itemStacks=s.runtime.itemStacks.filter(item=>item.itemID!==first);
 addItemStack(s,first,99,{quality:95,purity:95,synthetic:false});
 const result=startInfinityFusion(s,plan);
 assert.equal(result.ok,false);
 assert.equal(result.reason,"manifest-invalid");
 assert.equal(Object.keys(s.runtime.reservations).length,0);
});
test("saved calibration state can recover when its 15 reservations remain valid",()=>{
 const s=state();const started=startInfinityFusion(s,plan);
 s.fusionJob.status="CALIBRATING";
 const recovered=recoverInfinityFusion(s);
 assert.equal(recovered.recoverable,true);
 assert.equal(s.fusionJob.status,"RESERVED");
 assert.equal(s.fusionJob.reservationIDs.length,15);
});
test("power interruption pauses without losing reserved inputs",()=>{const s=state();startInfinityFusion(s,plan);assert.equal(tickInfinityFusion(s,{powerRatio:.5}).status,"WAITING_POWER");assert.equal(s.fusionJob.reservationIDs.length,15)});
test("a missing reserved input stops the next Fusion tick before progress or consumption",()=>{
 const s=state();const started=startInfinityFusion(s,plan);
 delete s.runtime.reservations[started.job.reservationIDs[4]];
 const before=stackTotals(s);
 const result=tickInfinityFusion(s,{deltaSeconds:1,powerRatio:1});
 assert.equal(result.status,"ERROR");
 assert.equal(result.error,"RESERVATION_LEDGER_MISMATCH");
 assert.deepEqual(stackTotals(s),before);
 assert.equal(s.fusionJob.stageIndex,0);
});
test("a reservation cannot substitute another item ID for a canonical Fusion input",()=>{
 const s=state(),started=startInfinityFusion(s,plan);
 const reservation=s.runtime.reservations[started.job.reservationIDs[0]];
 reservation.itemID="ITEM_IRON_ORE";
 const before=stackTotals(s);
 const result=tickInfinityFusion(s,{deltaSeconds:1,powerRatio:1});
 assert.equal(result.error,"RESERVATION_LEDGER_MISMATCH");
 assert.deepEqual(stackTotals(s),before);
 assert.equal(s.fusionJob.stageIndex,0);
});
test("a reserved stack that loses its quality qualification stops Fusion",()=>{
 const s=state(),started=startInfinityFusion(s,plan);
 const reservation=s.runtime.reservations[started.job.reservationIDs[0]];
 const allocation=reservation.allocations[0];
 const stack=s.runtime.itemStacks.find(item=>item.runtimeID===allocation.stackID);
 stack.quality=89;
 const result=tickInfinityFusion(s,{deltaSeconds:1,powerRatio:1});
 assert.equal(result.error,"RESERVATION_LEDGER_MISMATCH");
 assert.equal(s.fusionJob.stageIndex,0);
 assert.equal(stackTotals(s)[reservation.itemID],100);
});
test("completed seven-stage fusion creates exactly one output",()=>{const s=state();startInfinityFusion(s,plan);for(let i=0;i<2600;i++)tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});assert.equal(s.fusionJob.status,"COMPLETED");assert.equal(s.runtime.itemStacks.filter(x=>x.itemID===CANONICAL_INFINITY_DORONUM_ID).reduce((n,x)=>n+x.quantity,0),1);assert.equal(s.runtime.itemStacks.reduce((n,x)=>n+x.quantity,0),1)});
test("live Fusion consumes all input custody and creates one output that survives snapshot rebuild",()=>{
 const s=state();startInfinityFusion(s,plan);assert.equal(addReservedCustody(s).valid,true);
 let result;for(let i=0;i<2600;i++)result=tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});
 assert.equal(result.status,"COMPLETED");assert.equal(s.fusionJob.status,"COMPLETED");
 const transactionID="FUSION_COMPLETE:JOB-1",consumed=s.ownershipLedger.consumed.filter(entry=>entry.reason==="production-input:"+transactionID);
 assert.equal(consumed.reduce((n,entry)=>n+entry.quantity,0),1500);assert.equal(consumed.length,15);
 assert.ok(s.ownershipLedger.transactions[transactionID]);
 const beforeTransactions=Object.keys(s.ownershipLedger.transactions).length,beforeConsumed=s.ownershipLedger.consumed.length;
 const rebuilt=rebuildInventoryCustody(s),output=s.ownershipLedger.custody.find(entry=>entry.stackID===s.fusionJob.outputStackID);
 assert.equal(rebuilt.valid,true);assert.equal(rebuilt.itemTotals[CANONICAL_INFINITY_DORONUM_ID],1);
 assert.equal(output?.ownerType,"PLAYER_INVENTORY");assert.equal(output?.ownerID,"player");assert.equal(output?.quantity,1);
 const replay=settleInfinityFusionOutput(s,{jobID:"JOB-1"});
 assert.equal(replay.duplicate,true);assert.equal(Object.keys(s.ownershipLedger.transactions).length,beforeTransactions);assert.equal(s.ownershipLedger.consumed.length,beforeConsumed);
 assert.equal(stackTotals(s)[CANONICAL_INFINITY_DORONUM_ID],1);
});
test("Fusion custody mismatch fails closed and preserves all 1500 reserved inputs",()=>{
 const s=state();startInfinityFusion(s,plan);const ledger=createOwnershipState();
 for(const stack of s.runtime.itemStacks)addCustody(ledger,{stackID:stack.runtimeID,itemID:stack.itemID,quantity:stack.quantity,ownerType:"PLAYER_INVENTORY",ownerID:"player",metadata:{quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}});
 s.ownershipLedger=ledger;s.ownershipLedgerValidation=validateOwnershipState(ledger);
 let result;for(let i=0;i<2600;i++)result=tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});
 assert.equal(result.status,"ERROR");assert.equal(s.fusionJob.errorCode,"FUSION_CUSTODY_COMMIT_FAILED");
 assert.equal(stackTotals(s)[CANONICAL_INFINITY_DORONUM_ID],0);assert.equal(CANONICAL_DORONUM_IDS.reduce((n,id)=>n+stackTotals(s)[id],0),1500);
 assert.equal(Object.values(s.runtime.reservations).filter(item=>item.status==="reserved").length,15);
 assert.equal(s.ownershipLedger.consumed.length,0);assert.equal(s.fusionDone,false);
});
test("cancel releases all inputs and is idempotently unavailable afterwards",()=>{const s=state();startInfinityFusion(s,plan);assert.equal(cancelInfinityFusion(s,{jobID:"JOB-1"}),true);assert.equal(cancelInfinityFusion(s,{jobID:"JOB-1"}),false);assert.equal(s.runtime.itemStacks.reduce((n,x)=>n+x.quantity,0),1500);assert.equal(Object.keys(s.runtime.reservations).length,0)});

test("final fusion settlement consumes inputs and creates one output under one idempotency key",()=>{
 const s=state();startInfinityFusion(s,plan);
 for(let i=0;i<2600;i++)tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});
 const first=settleInfinityFusionOutput(s,{jobID:"JOB-1"});
 assert.equal(first.ok,true);
 assert.equal(first.duplicate,true);
 assert.equal(stackTotals(s)[CANONICAL_INFINITY_DORONUM_ID],1);
 assert.equal(s.fusionSettlements["JOB-1"].inputQuantity,1500);
 assert.equal(s.stats.produced[CANONICAL_INFINITY_DORONUM_ID],1);
 assert.equal(s.fusionJob.status,"COMPLETED");
});
test("output failure rolls back the 1500-input commit and preserves reservations for recovery",()=>{
 const s=state();startInfinityFusion(s,plan);
 for(let i=0;i<2600;i++)tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});
 // Run a fresh in-progress job to exercise the atomic boundary before the helper has settled.
 const failed=state();startInfinityFusion(failed,{...plan,jobID:"JOB-FAIL"});
 const before=stackTotals(failed);
 const reservations=[...failed.fusionJob.reservationIDs];
 const result=settleInfinityFusionOutput(failed,{jobID:"JOB-FAIL",outputItemID:""});
 assert.equal(result.ok,false);
 assert.deepEqual(stackTotals(failed),before);
 assert.equal(failed.fusionDone,false);
 assert.equal(failed.runtime.itemStacks.reduce((n,x)=>n+x.quantity,0),1500);
 for(const id of reservations)assert.equal(failed.runtime.reservations[id].status,"reserved");
 assert.equal(failed.fusionJob.status,"ERROR");
 assert.equal(failed.fusionJob.errorCode,"OUTPUT_CREATE_FAILED");
});
test("a prior settlement cannot mint a second Infinity output",()=>{
 const s=state();startInfinityFusion(s,plan);
 for(let i=0;i<2600;i++)tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});
 const before=stackTotals(s)[CANONICAL_INFINITY_DORONUM_ID];
 const result=settleInfinityFusionOutput(s,{jobID:"JOB-1"});
 assert.equal(result.duplicate,true);
 assert.equal(stackTotals(s)[CANONICAL_INFINITY_DORONUM_ID],before);
 assert.equal(s.stats.produced[CANONICAL_INFINITY_DORONUM_ID],1);
});
