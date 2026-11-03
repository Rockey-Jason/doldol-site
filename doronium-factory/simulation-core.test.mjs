import test from "node:test";
import assert from "node:assert/strict";
import {
  createRuntimeState, ensureItemStacks, addItemStack, removeItemStacks,
  calculateOutputQuality, calculateOutputPurity, accuracyQuality,
  reserveItemStacks, reserveItemBatch, releaseItemReservation, commitItemReservations,
  splitItemStack, mergeItemStacks, validateRuntimeState, availableItemCount,
  runCanonicalTick, TICK_STAGE_ORDER, availableEligibleItemCount,
  reserveEligibleItemBatch, allocateEntityID, enqueueSimulationEvent,
  processSimulationEvents, nextDeterministicRandom, consumeFixedStepBudget
} from "./simulation-core.js";

test("legacy inventory migrates to stable unique stack IDs",()=>{
  const state={runtime:createRuntimeState(),inventory:{ironOre:5},meta:{ironOre:{quality:82,purity:91,synthetic:false}},tick:4};
  ensureItemStacks(state);
  assert.equal(state.runtime.itemStacks.reduce((n,s)=>n+s.quantity,0),5);
  const first=state.runtime.itemStacks[0].runtimeID;
  addItemStack(state,"ironOre",2,{quality:95,purity:98});
  const second=state.runtime.itemStacks[1].runtimeID;
  assert.notEqual(first,second);
  assert.equal(state.runtime.itemStacks[1].createdTick,4);
});

test("legacy saves without a runtime migrate from their saved inventory, not starter defaults",()=>{
  const state={inventory:{ironOre:11,water:4},meta:{ironOre:{quality:75,purity:83}},tick:2};
  ensureItemStacks(state);
  const totals=state.runtime.itemStacks.reduce((out,stack)=>{out[stack.itemID]=(out[stack.itemID]||0)+stack.quantity;return out},{});
  assert.deepEqual(totals,{ironOre:11,water:4});
  assert.equal(state.runtime.itemStacks.find(stack=>stack.itemID==="ironOre").quality,75);
});

test("stack removal is transactional and preserves per-stack metadata",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:0};
  addItemStack(state,"copperOre",3,{quality:70,purity:88});
  addItemStack(state,"copperOre",4,{quality:96,purity:99,synthetic:true});
  const removed=removeItemStacks(state,"copperOre",5);
  assert.equal(removed.reduce((n,s)=>n+s.quantity,0),5);
  assert.equal(removed[0].quality,70);
  assert.equal(removed[1].synthetic,true);
  assert.equal(state.runtime.itemStacks.reduce((n,s)=>n+s.quantity,0),2);
  assert.equal(removeItemStacks(state,"copperOre",3),null);
});

test("quality and purity follow the canonical independent formulas",()=>{
  assert.equal(calculateOutputQuality({materialQuality:80,temperatureQuality:100,pressureQuality:90,machineConditionQuality:100,powerStability:100}),90);
  assert.equal(calculateOutputPurity({inputPurity:80,processLoss:2,purificationBonus:12,modifier:2}),92);
  assert.equal(accuracyQuality(1000,1000),100);
  assert.equal(accuracyQuality(1040,1000),85);
});

test("fixed simulation tick executes all 18 stages in canonical order",()=>{
  const state={runtime:createRuntimeState(),tick:9};
  const trace=runCanonicalTick({state,dt:.1});
  assert.deepEqual(trace,TICK_STAGE_ORDER);
  assert.equal(state.runtime.lastTick,9);
});

test("stack split and merge preserve metadata and enforce the stack limit",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:3};
  const first=addItemStack(state,"ironOre",7000,{quality:88,purity:93});
  assert.equal(state.runtime.itemStacks.length,2);
  assert.deepEqual(state.runtime.itemStacks.map(x=>x.quantity),[5000,2000]);
  const split=splitItemStack(state,first,1200);
  assert.ok(split);
  assert.equal(state.runtime.itemStacks.find(x=>x.runtimeID===split).quality,88);
  assert.equal(mergeItemStacks(state,split,first),true);
  assert.equal(state.runtime.itemStacks.find(x=>x.runtimeID===first).quantity,5000);
  assert.equal(validateRuntimeState(state).valid,true);
});

test("reservations lock stock until commit or release and cannot be double-spent",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:4};
  addItemStack(state,"copperOre",10,{quality:91,purity:95});
  const reservation=reserveItemStacks(state,"copperOre",7,"machine-1");
  assert.ok(reservation);
  assert.equal(reserveItemStacks(state,"copperOre",4,"machine-2"),null);
  assert.equal(removeItemStacks(state,"copperOre",4),null);
  const committed=commitItemReservations(state,[reservation]);
  assert.equal(committed.reduce((n,x)=>n+x.quantity,0),7);
  assert.equal(state.runtime.itemStacks[0].quantity,3);
  assert.equal(commitItemReservations(state,[reservation]),null);
});

test("multi-item reservation rolls back completely when one ingredient is missing",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:5};
  addItemStack(state,"ironOre",8);
  const batch=reserveItemBatch(state,{ironOre:5,coal:1},"recipe-1");
  assert.equal(batch,null);
  assert.equal(Object.values(state.runtime.reservations).filter(x=>x.status==="reserved").length,0);
  const held=reserveItemStacks(state,"ironOre",4,"machine-2");
  assert.ok(held);
  assert.equal(releaseItemReservation(state,held),true);
  assert.ok(reserveItemStacks(state,"ironOre",8,"machine-3"));
});

test("reserved source stacks cannot be split or merged away",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:6};
  const a=addItemStack(state,"stone",10);
  const b=addItemStack(state,"stone",10);
  const held=reserveItemStacks(state,"stone",5,"machine");
  assert.ok(held);
  assert.equal(splitItemStack(state,a,6),null);
  assert.equal(mergeItemStacks(state,a,b),false);
  assert.equal(validateRuntimeState(state).valid,true);
});

test("reserved quantities are excluded from spendable inventory",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:7};
  addItemStack(state,"ironOre",12);
  const held=reserveItemStacks(state,"ironOre",9,"fusion-input");
  assert.ok(held);
  assert.equal(availableItemCount(state,"ironOre"),3);
  assert.equal(removeItemStacks(state,"ironOre",4),null);
  assert.equal(availableItemCount(state,"ironOre"),3);
  releaseItemReservation(state,held);
  assert.equal(availableItemCount(state,"ironOre"),12);
});

test("reservation audit history is bounded during long sessions",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:8};
  addItemStack(state,"coal",1);
  for(let i=0;i<300;i++){
    const id=reserveItemStacks(state,"coal",1,"cycle-"+i);
    assert.ok(id);
    assert.equal(commitItemReservations(state,[id]).length,1);
    addItemStack(state,"coal",1);
  }
  assert.equal(state.runtime.reservationHistory.length,256);
  assert.equal(Object.keys(state.runtime.reservations).length,0);
});

test("runtime save validation checks deterministic failure journal counters and IDs",()=>{
 const state={runtime:createRuntimeState(),inventory:{}};
 assert.equal(validateRuntimeState(state).valid,true);
 state.runtime.failureEvents.push({failureEventID:"FAIL-1"});state.runtime.nextFailureEventId=1;
 assert.ok(validateRuntimeState(state).errors.includes("failure-event-counter-not-advanced"));
 state.runtime.nextFailureEventId=2;
 assert.equal(validateRuntimeState(state).valid,true);
 state.runtime.failureEvents.push({failureEventID:"FAIL-1"});
 assert.ok(validateRuntimeState(state).errors.some(x=>x.startsWith("duplicate-failure-event:")));
});

test("eligible reservations select only qualifying per-stack quality and purity metadata",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:12};
  addItemStack(state,"doronium_alpha",120,{quality:96,purity:93,synthetic:false});
  addItemStack(state,"doronium_alpha",50,{quality:89,purity:99,synthetic:false});
  addItemStack(state,"doronium_alpha",30,{quality:100,purity:100,synthetic:true});
  addItemStack(state,"doronium_beta",1,{quality:99,purity:99,synthetic:false});
  const criteria={minQuality:90,minPurity:90,allowSynthetic:false};
  assert.equal(availableEligibleItemCount(state,"doronium_alpha",criteria),120);
  const failed=reserveEligibleItemBatch(state,{doronium_alpha:100,doronium_beta:2},"fusion-test",criteria);
  assert.equal(failed,null);
  assert.equal(availableEligibleItemCount(state,"doronium_alpha",criteria),120);
  assert.equal(Object.keys(state.runtime.reservations).length,0);
  const batch=reserveEligibleItemBatch(state,{doronium_alpha:100,doronium_beta:1},"fusion-test",criteria);
  assert.ok(batch);
  const allocations=batch.flatMap(id=>state.runtime.reservations[id].allocations);
  for(const allocation of allocations){
    const stack=state.runtime.itemStacks.find(x=>x.runtimeID===allocation.stackID);
    assert.ok(stack.quality>=90&&stack.purity>=90&&!stack.synthetic);
  }
  assert.equal(availableEligibleItemCount(state,"doronium_alpha",criteria),20);
  const committed=commitItemReservations(state,batch);
  assert.equal(committed.reduce((n,x)=>n+x.quantity,0),101);
  assert.equal(validateRuntimeState(state).valid,true);
});

test("entity IDs are deterministic, globally monotonic, and save-resumable",()=>{
  const state={runtime:createRuntimeState(),inventory:{},meta:{},tick:0};
  assert.equal(allocateEntityID(state,"BLD"),"BLD-00000001");
  assert.equal(allocateEntityID(state,"FUS"),"FUS-00000002");
  const snapshot=structuredClone(state);
  assert.equal(allocateEntityID(snapshot,"BLD"),"BLD-00000003");
  assert.equal(validateRuntimeState(snapshot).valid,true);
});

test("simulation events are queued in order and idempotency keys prevent duplicate rewards",()=>{
  const state={runtime:createRuntimeState(),inventory:{},tick:10};
  const seen=[];
  const first=enqueueSimulationEvent(state,{type:"COIN_REWARD",payload:{amount:50},idempotencyKey:"quest:q1:reward"});
  const duplicate=enqueueSimulationEvent(state,{type:"COIN_REWARD",payload:{amount:50},idempotencyKey:"quest:q1:reward"});
  assert.equal(first.accepted,true);
  assert.equal(duplicate.duplicate,true);
  const result=processSimulationEvents(state,{COIN_REWARD:(payload,event,s)=>{s.money=(s.money||0)+payload.amount;seen.push(event.eventID)}});
  assert.equal(result.processed,1);
  assert.equal(state.money,50);
  assert.equal(seen.length,1);
  const replay=enqueueSimulationEvent(state,{type:"COIN_REWARD",payload:{amount:50},idempotencyKey:"quest:q1:reward"});
  assert.equal(replay.duplicate,true);
  assert.equal(state.money,50);
  assert.equal(state.runtime.eventJournal.length,1);
});

test("failed simulation event remains queued for retry without losing payload",()=>{
  const state={runtime:createRuntimeState(),inventory:{},tick:3};
  const queued=enqueueSimulationEvent(state,{type:"ATOMIC_EVENT",payload:{value:7},idempotencyKey:"operation:7"});
  const failed=processSimulationEvents(state,{ATOMIC_EVENT:()=>{throw new Error("TEMPORARY_FAILURE")}});
  assert.equal(failed.processed,0);
  assert.equal(failed.remaining,1);
  assert.equal(state.runtime.eventQueue[0].eventID,queued.eventID);
  assert.equal(state.runtime.eventQueue[0].attempts,1);
  let result=0;
  const retried=processSimulationEvents(state,{ATOMIC_EVENT:payload=>{result=payload.value}});
  assert.equal(retried.processed,1);
  assert.equal(result,7);
  assert.equal(state.runtime.eventQueue.length,0);
});

test("deterministic RNG streams replay independently from saved state",()=>{
  const state={runtime:createRuntimeState(),inventory:{},worldSeed:827142};
  const firstA=nextDeterministicRandom(state,"factory-a");
  const firstB=nextDeterministicRandom(state,"factory-b");
  const snapshot=structuredClone(state);
  const secondA=nextDeterministicRandom(state,"factory-a");
  const secondB=nextDeterministicRandom(state,"factory-b");
  assert.notEqual(firstA,firstB);
  assert.deepEqual([secondA,secondB],[nextDeterministicRandom(snapshot,"factory-a"),nextDeterministicRandom(snapshot,"factory-b")]);
});

test("fixed-step catch-up executes at most ten ticks while retaining all backlog",()=>{
  const first=consumeFixedStepBudget(3.45,0.1,10);
  assert.equal(first.steps,10);
  assert.ok(Math.abs(first.remaining-2.45)<1e-8);
  const second=consumeFixedStepBudget(first.remaining,0.1,10);
  assert.equal(second.steps,10);
  assert.ok(Math.abs(second.remaining-1.45)<1e-8);
  let total=first.steps+second.steps,remainder=second.remaining;
  for(let i=0;i<3;i++){const next=consumeFixedStepBudget(remainder,0.1,10);total+=next.steps;remainder=next.remaining}
  assert.equal(total,34);
  assert.ok(remainder<0.06);
});
