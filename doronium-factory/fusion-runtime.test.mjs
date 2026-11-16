import test from "node:test";
import assert from "node:assert/strict";
import {createRuntimeState, addItemStack, availableItemCount, stackTotals, validateRuntimeState} from "./simulation-core.js";
import {reserveFusionInputs, validateFusionReservations, releaseFusionInputs, commitFusionInputs, FUSION_INPUT_COUNT} from "./fusion-runtime.js";

const IDS = [
  "doronium_normal","doronium_blue","doronium_red","doronium_iron","doronium_orange",
  "doronium_thermal","doronium_cold","doronium_black","doronium_clear","doronium_special",
  "doronium_limited","doronium_crystal","doronium_resonant","doronium_prismatic","doronium_void"
];

function makeState() {
  const state = {runtime:createRuntimeState(),inventory:{},meta:{},tick:12};
  for (const id of IDS) addItemStack(state,id,105,{quality:96,purity:94,synthetic:false});
  return state;
}

test("fusion manifest rejects missing, duplicate and malformed variant IDs",()=>{
  const state=makeState();
  assert.equal(reserveFusionInputs(state,IDS.slice(0,14)).reason,"INVALID_INPUT_MANIFEST");
  assert.equal(reserveFusionInputs(state,[...IDS.slice(0,14),IDS[0]]).reason,"INVALID_INPUT_MANIFEST");
  assert.equal(Object.keys(state.runtime.reservations).length,0);
});

test("fusion reserves exactly 100 of each variant without consuming or double-spending it",()=>{
  const state=makeState(),result=reserveFusionInputs(state,IDS);
  assert.equal(result.ok,true);
  assert.equal(result.reservationIDs.length,15);
  for(const id of IDS){
    assert.equal(availableItemCount(state,id),5);
    assert.equal(stackTotals(state)[id],105);
  }
  assert.equal(validateFusionReservations(state,IDS,result.reservationIDs),true);
  assert.equal(validateRuntimeState(state).valid,true);
  assert.equal(reserveFusionInputs(state,IDS).reason,"INSUFFICIENT_OR_RESERVED_INPUTS");
});

test("cancel or recover a fusion releases every ingredient reservation intact",()=>{
  const state=makeState(),result=reserveFusionInputs(state,IDS);
  assert.equal(result.ok,true);
  assert.equal(releaseFusionInputs(state,result.reservationIDs),15);
  assert.equal(releaseFusionInputs(state,result.reservationIDs),0);
  for(const id of IDS)assert.equal(availableItemCount(state,id),105);
  assert.equal(Object.keys(state.runtime.reservations).length,0);
  assert.equal(validateRuntimeState(state).valid,true);
});

test("successful fusion commits all 1,500 ingredients exactly once",()=>{
  const state=makeState(),result=reserveFusionInputs(state,IDS);
  assert.equal(result.ok,true);
  const committed=commitFusionInputs(state,IDS,result.reservationIDs);
  assert.equal(committed.ok,true);
  assert.equal(committed.total,15*FUSION_INPUT_COUNT);
  for(const id of IDS){
    assert.equal(availableItemCount(state,id),5);
    assert.equal(stackTotals(state)[id],5);
  }
  assert.equal(commitFusionInputs(state,IDS,result.reservationIDs).ok,false);
  assert.equal(validateRuntimeState(state).valid,true);
});

test("a low-quality, low-purity or synthetic stack is rejected and reservations roll back",()=>{
  for(const badMeta of [{quality:89,purity:99},{quality:99,purity:89},{quality:99,purity:99,synthetic:true}]){
    const state=makeState();
    state.runtime.itemStacks=state.runtime.itemStacks.filter(stack=>stack.itemID!=="doronium_void");
    addItemStack(state,"doronium_void",105,{quality:96,purity:95,synthetic:false});
    const target=state.runtime.itemStacks.find(stack=>stack.itemID==="doronium_void");
    Object.assign(target,badMeta);
    const result=reserveFusionInputs(state,IDS);
    assert.equal(result.reason,"INPUT_QUALITY_OR_PROVENANCE_REJECTED");
    assert.equal(Object.keys(state.runtime.reservations).length,0);
    assert.equal(availableItemCount(state,"doronium_void"),105);
  }
});

test("tampered reservation cannot partially consume the fusion manifest",()=>{
  const state=makeState(),result=reserveFusionInputs(state,IDS);
  assert.equal(result.ok,true);
  const record=state.runtime.reservations[result.reservationIDs[14]];
  record.quantity=99;
  const committed=commitFusionInputs(state,IDS,result.reservationIDs);
  assert.equal(committed.ok,false);
  for(const id of IDS)assert.equal(stackTotals(state)[id],105);
  assert.equal(validateRuntimeState(state).valid,false);
});
