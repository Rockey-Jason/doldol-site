import test from "node:test";
import assert from "node:assert/strict";
import {
  createRuntimeState, ensureItemStacks, addItemStack, removeItemStacks,
  calculateOutputQuality, calculateOutputPurity, accuracyQuality,
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
