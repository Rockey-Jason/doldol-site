import test from "node:test";
import assert from "node:assert/strict";
import {createConveyorState,validateConveyorState,advanceConveyorTick} from "./conveyor-network.js";
const parcel=(id,segmentID,extra={})=>({stackID:id,itemID:"ironOre",quantity:3,quality:95,purity:90,synthetic:false,segmentID,...extra});
const segment=(id,type="conveyor",outputs=[],extra={})=>({id,type,outputs,capacity:1,...extra});

test("one tick moves a parcel exactly once and preserves identity, quantity and metadata",()=>{
 const s=createConveyorState({segments:[segment("a","source",["b"]),segment("b","conveyor",["c"]),segment("c","sink")],parcels:[parcel("IS-1","a",{quality:97,provenance:"mine"})]});
 const r=advanceConveyorTick(s,{tick:1});
 assert.equal(r.moved.length,1);assert.equal(s.parcels[0].segmentID,"b");
 assert.equal(s.parcels[0].quantity,3);assert.equal(s.parcels[0].quality,97);assert.equal(s.parcels[0].provenance,"mine");
 assert.equal(validateConveyorState(s).valid,true);
});

test("backpressure keeps the parcel in its source segment without duplication or loss",()=>{
 const s=createConveyorState({segments:[segment("a","source",["b"]),segment("b","conveyor",["c"]),segment("c","sink")],
  parcels:[parcel("IS-1","a"),parcel("IS-2","b")]});
 const r=advanceConveyorTick(s,{tick:2});
 assert.equal(r.moved.length,1);assert.equal(r.blocked.length,1);
 assert.equal(s.parcels.length,2);assert.equal(validateConveyorState(s).valid,true);
});

test("sorter routes matching item and quality rule to its selected branch",()=>{
 const s=createConveyorState({segments:[
  segment("in","source",["sort"]),segment("sort","sorter",["high","low"],{rules:[{itemID:"ironOre",minQuality:95,outputID:"high"}]}),
  segment("high"),segment("low")
 ],parcels:[parcel("IS-1","in")]});
 advanceConveyorTick(s,{tick:1});advanceConveyorTick(s,{tick:2});
 assert.equal(s.parcels[0].segmentID,"high");
});

test("splitter distributes successive parcels round-robin across free outputs",()=>{
 const s=createConveyorState({segments:[
  segment("split","splitter",["left","right"]),segment("left"),segment("right")
 ],parcels:[parcel("IS-1","split"),parcel("IS-2","split")]});
 const r=advanceConveyorTick(s,{tick:1});
 assert.equal(r.moved.length,1);
 const r2=advanceConveyorTick(s,{tick:2});
 assert.equal(r2.moved.length,1);
 assert.deepEqual(s.parcels.map(p=>p.segmentID).sort(),["left","right"]);
});

test("storage port holds incoming parcels until accepted by storage logic",()=>{
 const s=createConveyorState({segments:[segment("a","source",["port"]),segment("port","storage-port",[],{accepting:true})],parcels:[parcel("IS-1","a")]});
 advanceConveyorTick(s,{tick:1});
 advanceConveyorTick(s,{tick:2});
 assert.equal(s.parcels.length,1);
 assert.equal(s.parcels[0].segmentID,"port");
});

test("sink consumes parcel exactly once with a durable event",()=>{
 const s=createConveyorState({segments:[segment("a","source",["sink"]),segment("sink","sink")],parcels:[parcel("IS-1","a")]});
 const first=advanceConveyorTick(s,{tick:1});
 const second=advanceConveyorTick(s,{tick:2});
 assert.equal(first.moved.length,1);assert.equal(second.moved.length,0);
 assert.equal(s.parcels.length,0);assert.equal(s.transferLedger.length,1);assert.equal(s.transferLedger[0].quantity,3);
});

test("lift stores its vertical endpoints and preserves parcel metadata",()=>{
 const s=createConveyorState({segments:[segment("a","source",["lift"]),segment("lift","lift",["b"],{fromHeight:0,toHeight:8}),segment("b")],parcels:[parcel("IS-1","a",{purity:99})]});
 advanceConveyorTick(s,{tick:1});advanceConveyorTick(s,{tick:2});
 assert.equal(s.parcels[0].segmentID,"b");assert.equal(s.parcels[0].purity,99);
});

test("invalid duplicate parcel ownership fails closed",()=>{
 const s=createConveyorState({segments:[segment("a"),segment("b")],parcels:[parcel("IS-1","a"),parcel("IS-1","b")]});
 assert.equal(validateConveyorState(s).valid,false);
 assert.equal(advanceConveyorTick(s).ok,false);
});
