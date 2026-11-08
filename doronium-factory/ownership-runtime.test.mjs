import test from "node:test";import assert from "node:assert/strict";
import {createOwnershipState,addCustody,splitCustody,transferCustody,consumeCustody,validateOwnershipState,resetCustodySnapshot} from "./ownership-runtime.js";
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
