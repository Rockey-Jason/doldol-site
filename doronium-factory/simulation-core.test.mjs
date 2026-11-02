import test from "node:test";
import assert from "node:assert/strict";
import {
  createRuntimeState, ensureItemStacks, addItemStack, removeItemStacks,
  calculateOutputQuality, calculateOutputPurity, accuracyQuality,
  reserveItemStacks, reserveItemBatch, releaseItemReservation, commitItemReservations,
  splitItemStack, mergeItemStacks, validateRuntimeState, availableItemCount,
  runCanonicalTick, TICK_STAGE_ORDER
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
