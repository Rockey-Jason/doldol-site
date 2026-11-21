import test from "node:test";import assert from "node:assert/strict";
import {createOwnershipState,addCustody,splitCustody,transferCustody,consumeCustody,completeProductionCustody,validateOwnershipState,resetCustodySnapshot,hasPendingBuildingCustody,commitBuildingDismantle} from "./ownership-runtime.js";
test("one stack has one custody owner and transfers idempotently",()=>{const s=createOwnershipState();addCustody(s,{stackID:"S1",itemID:"iron",quantity:5,ownerType:"PLAYER_INVENTORY",ownerID:"p1"});const a=transferCustody(s,{transactionID:"T1",stackID:"S1",quantity:5,toType:"MACHINE_INPUT",toID:"M1",expectedFromType:"PLAYER_INVENTORY",expectedFromID:"p1"});assert.equal(a.to.id,"M1");assert.equal(transferCustody(s,{transactionID:"T1",stackID:"S1",quantity:5,toType:"MACHINE_INPUT",toID:"M1",expectedFromType:"PLAYER_INVENTORY",expectedFromID:"p1"}).duplicate,true);assert.equal(s.custody.length,1);assert.equal(validateOwnershipState(s).valid,true)});
test("invalid owner and duplicate stack are rejected",()=>{const s=createOwnershipState();addCustody(s,{stackID:"S1",itemID:"ore",quantity:1,ownerType:"WORLD_DROP",ownerID:"x"});assert.throws(()=>addCustody(s,{stackID:"S1",itemID:"ore",quantity:1,ownerType:"WORLD_DROP",ownerID:"y"}));assert.equal(transferCustody(s,{transactionID:"T2",stackID:"S1",quantity:2,toType:"WAREHOUSE",toID:"w"}),null)});
test("consumption has an idempotent ledger entry",()=>{const s=createOwnershipState();addCustody(s,{stackID:"S",itemID:"ore",quantity:2,ownerType:"MACHINE_INPUT",ownerID:"M"});assert.equal(consumeCustody(s,{transactionID:"C",stackID:"S",quantity:2,expectedOwnerType:"MACHINE_INPUT",expectedOwnerID:"M"}).quantity,2);assert.equal(consumeCustody(s,{transactionID:"C",stackID:"S",quantity:2,expectedOwnerType:"MACHINE_INPUT",expectedOwnerID:"M"}).duplicate,true);assert.equal(s.consumed.length,1)});

test("partial transfer requires an explicit split and preserves exact total quantity",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"STACK-A",itemID:"iron",quantity:10,ownerType:"PLAYER_INVENTORY",ownerID:"player"});
 assert.equal(transferCustody(s,{transactionID:"PART-1",stackID:"STACK-A",quantity:4,toType:"MACHINE_INPUT",toID:"M1"}),null);
 const split=splitCustody(s,{transactionID:"SPLIT-1",stackID:"STACK-A",quantity:4,newStackID:"STACK-A-PART"});
 assert.equal(split.quantity,4);
 assert.equal(splitCustody(s,{transactionID:"SPLIT-1",stackID:"STACK-A",quantity:4,newStackID:"STACK-A-PART"}).duplicate,true);
 const moved=transferCustody(s,{transactionID:"MOVE-1",stackID:"STACK-A-PART",quantity:4,toType:"MACHINE_INPUT",toID:"M1",expectedFromType:"PLAYER_INVENTORY",expectedFromID:"player"});
 assert.equal(moved.to.id,"M1");
 assert.deepEqual(validateOwnershipState(s).itemTotals,{iron:10});
 assert.equal(validateOwnershipState(s).valid,true);
});

test("reusing an idempotency key with a different transaction body is rejected",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"STACK-X",itemID:"coal",quantity:3,ownerType:"PLAYER_INVENTORY",ownerID:"player"});
 assert.ok(transferCustody(s,{transactionID:"TX-REUSE",stackID:"STACK-X",quantity:3,toType:"WAREHOUSE",toID:"W1"}));
 assert.equal(transferCustody(s,{transactionID:"TX-REUSE",stackID:"STACK-X",quantity:3,toType:"MACHINE_INPUT",toID:"M2"}),null);
 assert.equal(s.custody[0].ownerType,"WAREHOUSE");
 assert.equal(s.custody[0].ownerID,"W1");
 assert.equal(validateOwnershipState(s).valid,true);
});

test("snapshot reset preserves consumed and transaction journals plus monotonic IDs",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"STACK-J",itemID:"ironOre",quantity:2,ownerType:"MACHINE_INPUT",ownerID:"M1"});
 consumeCustody(s,{transactionID:"CONSUME-J",stackID:"STACK-J",quantity:2,expectedOwnerType:"MACHINE_INPUT",expectedOwnerID:"M1",reason:"recipe"});
 const nextBefore=s.nextLedgerID;
 addCustody(s,{stackID:"SNAPSHOT-OLD",itemID:"coal",quantity:1,ownerType:"PLAYER_INVENTORY",ownerID:"player"});
 const beforeTransactions=Object.keys(s.transactions).length;
 const beforeConsumed=s.consumed.length;
 resetCustodySnapshot(s);
 assert.equal(s.custody.length,0);
 assert.equal(Object.keys(s.transactions).length,beforeTransactions);
 assert.equal(s.consumed.length,beforeConsumed);
 addCustody(s,{stackID:"SNAPSHOT-NEW",itemID:"coal",quantity:1,ownerType:"PLAYER_INVENTORY",ownerID:"player"});
 assert.ok(Number(s.custody[0].ledgerID.slice(4))>=nextBefore);
 assert.equal(validateOwnershipState(s).valid,true);
});

test("ownership validator detects duplicate ledger IDs and stale counters",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"A",itemID:"iron",quantity:1,ownerType:"PLAYER_INVENTORY",ownerID:"player"});
 addCustody(s,{stackID:"B",itemID:"iron",quantity:1,ownerType:"WAREHOUSE",ownerID:"W1"});
 s.custody[1].ledgerID=s.custody[0].ledgerID;
 s.nextLedgerID=1;
 const result=validateOwnershipState(s);
 assert.equal(result.valid,false);
 assert.ok(result.errors.includes("duplicate-ledger-id:"+s.custody[0].ledgerID));
 assert.ok(result.errors.includes("ledger-id-counter-not-advanced"));
});

test("legacy ownership snapshots are upgraded to the current ledger schema without losing history",()=>{
 const legacy={version:1,nextLedgerID:4,custody:[],transactions:{LEGACY:{status:"COMMITTED",request:{type:"LEGACY"},result:{ok:true}}},consumed:[]};
 resetCustodySnapshot(legacy);
 assert.equal(legacy.version,2);
 assert.equal(legacy.nextLedgerID,4);
 assert.ok(legacy.transactions.LEGACY);
 assert.equal(validateOwnershipState(legacy).valid,true);
});


test("production completion atomically consumes active-job inputs and creates one machine output",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"ACTIVE-IRON",itemID:"ironOre",quantity:2,ownerType:"ACTIVE_JOB",ownerID:"SMELTER-1"});
 addCustody(s,{stackID:"ACTIVE-COAL",itemID:"coal",quantity:1,ownerType:"ACTIVE_JOB",ownerID:"SMELTER-1"});
 const request={transactionID:"PROD:SMELTER-1:1",inputs:[
  {stackID:"ACTIVE-IRON",quantity:2,expectedOwnerType:"ACTIVE_JOB",expectedOwnerID:"SMELTER-1"},
  {stackID:"ACTIVE-COAL",quantity:1,expectedOwnerType:"ACTIVE_JOB",expectedOwnerID:"SMELTER-1"}
 ],output:{stackID:"MACHINE_OUTPUT:SMELTER-1",itemID:"ironPlate",quantity:1,ownerType:"MACHINE_OUTPUT",ownerID:"SMELTER-1",metadata:{quality:96,purity:94,synthetic:false}}};
 const first=completeProductionCustody(s,request);
 assert.equal(first.output.itemID,"ironPlate");assert.equal(s.custody.length,1);
 assert.equal(s.custody[0].stackID,"MACHINE_OUTPUT:SMELTER-1");
 assert.equal(s.consumed.reduce((n,x)=>n+x.quantity,0),3);
 assert.equal(completeProductionCustody(s,request).duplicate,true);
 assert.equal(s.custody.length,1);assert.equal(s.consumed.length,2);
 assert.equal(completeProductionCustody(s,{...request,output:{...request.output,quantity:2}}),null);
 assert.equal(validateOwnershipState(s).valid,true);
});

test("failed production completion rolls back every input and journal entry",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"ACTIVE-IRON",itemID:"ironOre",quantity:2,ownerType:"ACTIVE_JOB",ownerID:"SMELTER-2"});
 const before=structuredClone(s);
 const result=completeProductionCustody(s,{transactionID:"PROD:SMELTER-2:1",inputs:[
  {stackID:"ACTIVE-IRON",quantity:2,expectedOwnerType:"ACTIVE_JOB",expectedOwnerID:"SMELTER-2"},
  {stackID:"MISSING-COAL",quantity:1,expectedOwnerType:"ACTIVE_JOB",expectedOwnerID:"SMELTER-2"}
 ],output:{stackID:"MACHINE_OUTPUT:SMELTER-2",itemID:"ironPlate",quantity:1,ownerType:"MACHINE_OUTPUT",ownerID:"SMELTER-2"}});
 assert.equal(result,null);assert.deepEqual(s,before);assert.equal(validateOwnershipState(s).valid,true);
});


test("conveyor custody preserves one stable stack identity across two belts and inventory",()=>{
 const s=createOwnershipState();
 addCustody(s,{stackID:"MACHINE_OUTPUT:M1:1",itemID:"ironPlate",quantity:2,ownerType:"MACHINE_OUTPUT",ownerID:"M1",metadata:{quality:96,purity:97,synthetic:false}});
 const first=transferCustody(s,{transactionID:"LOGISTICS:M1:1",stackID:"MACHINE_OUTPUT:M1:1",quantity:2,toType:"CONVEYOR",toID:"B1",expectedFromType:"MACHINE_OUTPUT",expectedFromID:"M1"});
 assert.equal(first.to.id,"B1");
 const second=transferCustody(s,{transactionID:"LOGISTICS:B1:1",stackID:"MACHINE_OUTPUT:M1:1",quantity:2,toType:"CONVEYOR",toID:"B2",expectedFromType:"CONVEYOR",expectedFromID:"B1"});
 assert.equal(second.to.id,"B2");
 const third=transferCustody(s,{transactionID:"LOGISTICS:B2:1",stackID:"MACHINE_OUTPUT:M1:1",quantity:2,toType:"PLAYER_INVENTORY",toID:"player",expectedFromType:"CONVEYOR",expectedFromID:"B2"});
 assert.equal(third.to.type,"PLAYER_INVENTORY");
 assert.equal(transferCustody(s,{transactionID:"LOGISTICS:B2:1",stackID:"MACHINE_OUTPUT:M1:1",quantity:2,toType:"PLAYER_INVENTORY",toID:"player",expectedFromType:"CONVEYOR",expectedFromID:"B2"}).duplicate,true);
 assert.equal(transferCustody(s,{transactionID:"LOGISTICS:B2:1",stackID:"MACHINE_OUTPUT:M1:1",quantity:2,toType:"WAREHOUSE",toID:"W1",expectedFromType:"CONVEYOR",expectedFromID:"B2"}),null);
 assert.equal(s.custody.length,1);
 assert.equal(s.custody[0].stackID,"MACHINE_OUTPUT:M1:1");
 assert.equal(s.custody[0].ownerType,"PLAYER_INVENTORY");
 assert.equal(s.custody[0].quantity,2);
 assert.deepEqual(validateOwnershipState(s).itemTotals,{ironPlate:2});
 assert.equal(validateOwnershipState(s).valid,true);
});


test("active production inputs block dismantling even when progress is zero",()=>{
 const state={runtime:{reservations:{}},completionBuffer:[],ownershipLedger:createOwnershipState()};
 const building={uid:"SMELTER-A",activeInputQuantities:[{itemID:"ironOre",quantity:2}],activeRecipe:"Iron Smelting",activeRecipeSnapshot:{name:"Iron Smelting"},progress:0,status:"PAUSED_POWER"};
 assert.equal(hasPendingBuildingCustody(state,building),true);
});

test("legacy activeMeta inputs and active-job ledger custody remain protected",()=>{
 const state={runtime:{reservations:{}},completionBuffer:[],ownershipLedger:createOwnershipState()};
 const building={uid:"SMELTER-LEGACY",activeMeta:{consumedInputs:[{itemID:"ironOre",quantity:3}]},progress:0,status:"PAUSED_POWER"};
 assert.equal(hasPendingBuildingCustody(state,building),true);
 addCustody(state.ownershipLedger,{stackID:"ACTIVE-LEDGER-STACK",itemID:"ironOre",quantity:1,ownerType:"ACTIVE_JOB",ownerID:"SMELTER-LEDGER"});
 assert.equal(hasPendingBuildingCustody(state,{uid:"SMELTER-LEDGER"}),true);
});

test("machine-owned reservations and linked completion buffers block dismantling",()=>{
 const state={runtime:{reservations:{R1:{status:"reserved",ownerID:"recipe:SMELTER-B",allocations:[]}}},completionBuffer:[],ownershipLedger:createOwnershipState()};
 assert.equal(hasPendingBuildingCustody(state,{uid:"SMELTER-B"}),true);
 state.runtime.reservations={};
 state.completionBuffer=[{completionID:"COMPLETION:SMELTER-B:2",itemID:"ironPlate",quantity:1}];
 assert.equal(hasPendingBuildingCustody(state,{uid:"SMELTER-B"}),true);
});

test("unrelated reservations and completion buffers do not block an idle building",()=>{
 const state={runtime:{reservations:{R1:{status:"reserved",ownerID:"recipe:OTHER",allocations:[]}}},completionBuffer:[{completionID:"COMPLETION:OTHER:1",itemID:"ironPlate",quantity:1}],ownershipLedger:createOwnershipState()};
 assert.equal(hasPendingBuildingCustody(state,{uid:"SMELTER-IDLE",input:{},progress:0}),false);
 assert.equal(hasPendingBuildingCustody(state,null),false);
});

test("building dismantle journals refund and salvage exactly once across exact replay",()=>{
 const building={uid:"BUILDING-DISMANTLE-1",type:"smelter"};
 const state={ownershipLedger:createOwnershipState(),buildings:[building],runtime:{reservations:{}},completionBuffer:[],money:100,inventory:{wood:0}};
 const request={transactionID:"DISMANTLE:BUILDING-DISMANTLE-1",buildingUID:building.uid,refund:55,salvage:[{itemID:"wood",quantity:2}]};
 let applyCalls=0,rollbackCalls=0;
 const apply=()=>{applyCalls++;state.money+=55;state.inventory.wood+=2;state.buildings=[];return true};
 const rollback=()=>{rollbackCalls++;state.money=100;state.inventory.wood=0;state.buildings=[building]};
 const first=commitBuildingDismantle(state,request,apply,rollback);
 assert.equal(first.refund,55);assert.deepEqual(first.salvage,[{itemID:"wood",quantity:2}]);
 assert.equal(state.money,155);assert.equal(state.inventory.wood,2);assert.equal(state.buildings.length,0);
 const replay=commitBuildingDismantle(state,request,()=>{applyCalls++;return true},()=>{rollbackCalls++});
 assert.equal(replay.duplicate,true);assert.equal(applyCalls,1);assert.equal(rollbackCalls,0);
 assert.equal(state.money,155);assert.equal(state.inventory.wood,2);assert.equal(validateOwnershipState(state.ownershipLedger).valid,true);
});

test("building dismantle rejects a reused transaction key with a changed refund or salvage payload",()=>{
 const building={uid:"BUILDING-DISMANTLE-2",type:"smelter"};
 const state={ownershipLedger:createOwnershipState(),buildings:[building],runtime:{reservations:{}},completionBuffer:[],money:100};
 const request={transactionID:"DISMANTLE:BUILDING-DISMANTLE-2",buildingUID:building.uid,refund:55,salvage:[{itemID:"wood",quantity:2}]};
 let calls=0;
 assert.ok(commitBuildingDismantle(state,request,()=>{calls++;state.buildings=[];return true},()=>{}));
 const conflict=commitBuildingDismantle(state,{...request,refund:56},()=>{calls++;return true},()=>{});
 assert.equal(conflict,null);assert.equal(calls,1);assert.equal(state.money,100);assert.equal(state.buildings.length,0);
 assert.equal(validateOwnershipState(state.ownershipLedger).valid,true);
});

test("failed dismantle projection invokes rollback and leaves no committed journal",()=>{
 const building={uid:"BUILDING-DISMANTLE-3",type:"smelter"};
 const state={ownershipLedger:createOwnershipState(),buildings:[building],runtime:{reservations:{}},completionBuffer:[],money:100,inventory:{wood:0}};
 let rollbackCalls=0;
 const result=commitBuildingDismantle(state,{transactionID:"DISMANTLE:BUILDING-DISMANTLE-3",buildingUID:building.uid,refund:55,salvage:[{itemID:"wood",quantity:2}]},()=>{
  state.money=155;state.inventory.wood=2;state.buildings=[];return false;
 },()=>{
  rollbackCalls++;state.money=100;state.inventory.wood=0;state.buildings=[building];
 });
 assert.equal(result,null);assert.equal(rollbackCalls,1);
 assert.equal(state.money,100);assert.equal(state.inventory.wood,0);assert.equal(state.buildings[0],building);
 assert.equal(Object.keys(state.ownershipLedger.transactions).length,0);
 assert.equal(validateOwnershipState(state.ownershipLedger).valid,true);
});

test("building dismantle refuses active production custody before applying a refund",()=>{
 const building={uid:"BUILDING-DISMANTLE-4",type:"smelter",activeInputQuantities:[{itemID:"ironOre",quantity:1}]};
 const state={ownershipLedger:createOwnershipState(),buildings:[building],runtime:{reservations:{}},completionBuffer:[],money:100};
 let calls=0;
 const result=commitBuildingDismantle(state,{transactionID:"DISMANTLE:BUILDING-DISMANTLE-4",buildingUID:building.uid,refund:55,salvage:[]},()=>{calls++;return true},()=>{});
 assert.equal(result,null);assert.equal(calls,0);assert.equal(state.money,100);assert.equal(state.buildings[0],building);
 assert.equal(Object.keys(state.ownershipLedger.transactions).length,0);
});

test("building dismantle normalizes salvage totals before recording its idempotency payload",()=>{
 const building={uid:"BUILDING-DISMANTLE-5",type:"smelter"};
 const state={ownershipLedger:createOwnershipState(),buildings:[building],runtime:{reservations:{}},completionBuffer:[]};
 const result=commitBuildingDismantle(state,{transactionID:"DISMANTLE:BUILDING-DISMANTLE-5",buildingUID:building.uid,refund:0,salvage:[{itemID:"wood",quantity:1},{itemID:"stone",quantity:2},{itemID:"wood",quantity:3}]},()=>{state.buildings=[];return true},()=>{});
 assert.deepEqual(result.salvage,[{itemID:"stone",quantity:2},{itemID:"wood",quantity:4}]);
 assert.equal(validateOwnershipState(state.ownershipLedger).valid,true);
});
