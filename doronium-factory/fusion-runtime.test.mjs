import test from "node:test";import assert from "node:assert/strict";
import {createRuntimeState,addItemStack,stackTotals} from "./simulation-core.js";
import {CANONICAL_DORONUM_IDS,CANONICAL_INFINITY_DORONUM_ID} from "./canonical-data.js";
import {startInfinityFusion,tickInfinityFusion,cancelInfinityFusion,recoverInfinityFusion,settleInfinityFusionOutput} from "./fusion-runtime.js";
function state(){const s={tick:0,inventory:{},runtime:createRuntimeState()};for(const id of CANONICAL_DORONUM_IDS)addItemStack(s,id,100,{quality:95,purity:95,synthetic:false});return s}
const plan={jobID:"JOB-1",machineID:"FUSION-1",stageDurationsSeconds:[30,35,40,45,45,35,30],stagePowerMW:[.5,1,1.5,2,3,4,5]};
test("Fusion reserves all 1500 canonical inputs without consuming them",()=>{const s=state(),before=stackTotals(s);const r=startInfinityFusion(s,plan);assert.equal(r.ok,true);assert.equal(s.fusionJob.reservationIDs.length,15);assert.deepEqual(stackTotals(s),before)});
test("missing machine preserves job and reservations for recovery",()=>{const s=state();startInfinityFusion(s,plan);const r=tickInfinityFusion(s,{machineExists:false});assert.equal(r.recoverable,true);assert.equal(recoverInfinityFusion(s).recoverable,true);assert.equal(s.fusionJob.status,"RESERVED")});
test("power interruption pauses without losing reserved inputs",()=>{const s=state();startInfinityFusion(s,plan);assert.equal(tickInfinityFusion(s,{powerRatio:.5}).status,"WAITING_POWER");assert.equal(s.fusionJob.reservationIDs.length,15)});
test("completed seven-stage fusion creates exactly one output",()=>{const s=state();startInfinityFusion(s,plan);for(let i=0;i<2600;i++)tickInfinityFusion(s,{deltaSeconds:.1,powerRatio:1});assert.equal(s.fusionJob.status,"COMPLETED");assert.equal(s.runtime.itemStacks.filter(x=>x.itemID===CANONICAL_INFINITY_DORONUM_ID).reduce((n,x)=>n+x.quantity,0),1);assert.equal(s.runtime.itemStacks.reduce((n,x)=>n+x.quantity,0),1)});
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
