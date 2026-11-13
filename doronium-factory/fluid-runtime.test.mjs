import test from "node:test";import assert from "node:assert/strict";
import {buildFluidNetworks,tickFluidNetwork,totalFluidLiters,consumeFluid,transferFluidDirect} from "./fluid-runtime.js";
const node=(id,type,amountL,extra={})=>({id,type,amountL,capacityL:100,fluidType:amountL>0?"WATER":null,pressureKPa:100,temperatureC:20,maxPressureKPa:500,...extra});
test("fluid network IDs isolate disconnected pipe networks",()=>{const a=node("A","PIPE",20),b=node("B","TANK",0),c=node("C","PIPE",5),g=buildFluidNetworks([a,b,c],[{id:"E1",from:"A",to:"B"}]);assert.equal(g.networkByID.get("A"),g.networkByID.get("B"));assert.notEqual(g.networkByID.get("A"),g.networkByID.get("C"))});
test("flow transfers fluid without duplication and respects flow/capacity limits",()=>{const source=node("S","PUMP",20,{pumpHeadKPa:50,pressureKPa:100}),tank=node("T","TANK",2,{capacityL:10,pressureKPa:0});const r=tickFluidNetwork({nodes:[source,tank],edges:[{id:"P1",from:"S",to:"T",maxFlowLps:3,conductanceLpsPerKPa:1,maxPressureKPa:200}],deltaSeconds:2});assert.equal(r.flows[0].movedL,6);assert.equal(source.amountL+tank.amountL,22);assert.equal(r.massBalance.valid,true)});
test("mismatched fluid types cannot silently mix",()=>{const oil=node("O","PIPE",10,{fluidType:"OIL"}),water=node("W","TANK",5,{fluidType:"WATER"});const r=tickFluidNetwork({nodes:[oil,water],edges:[{id:"E",from:"O",to:"W",maxFlowLps:10,conductanceLpsPerKPa:1}]});assert.equal(r.flows.length,0);assert.equal(r.faults[0].reason,"FLUID_MISMATCH");assert.equal(oil.amountL,10);assert.equal(water.amountL,5)});
test("explicit leaks are audited as losses and do not get counted as hidden conservation",()=>{const p=node("P","PUMP",10,{pumpHeadKPa:20,pressureKPa:100}),t=node("T","TANK",0,{pressureKPa:0});const r=tickFluidNetwork({nodes:[p,t],edges:[{id:"E",from:"P",to:"T",maxFlowLps:10,conductanceLpsPerKPa:1,leakRateLps:1}],deltaSeconds:2});assert.equal(r.leaks[0].lostL,2);assert.equal(r.massBalance.valid,true);assert.equal(totalFluidLiters([p,t]).WATER,8)});
test("consumers cannot overdraw tanks and direct transfer conserves both ends",()=>{const tank=node("T","TANK",3);assert.equal(consumeFluid(tank,4,"WATER").ok,false);assert.equal(consumeFluid(tank,2,"WATER").ok,true);const a=node("A","PIPE",10),b=node("B","TANK",1);const before=a.amountL+b.amountL;assert.equal(transferFluidDirect({source:a,target:b,requestedLiters:5,deltaSeconds:1,maxFlowLps:2}).movedL,2);assert.equal(a.amountL+b.amountL,before)});

test("bidirectional pipe edges follow the pressure gradient in either direction",()=>{
 const low=node("LOW","TANK",2,{pressureKPa:20,fluidType:"WATER"}),high=node("HIGH","TANK",10,{pressureKPa:120,fluidType:"WATER"});
 const r=tickFluidNetwork({nodes:[low,high],edges:[{id:"BIDIR",from:"LOW",to:"HIGH",oneWay:false,maxFlowLps:4,conductanceLpsPerKPa:1}],deltaSeconds:1});
 assert.equal(r.flows.length,1);assert.equal(r.flows[0].from,"HIGH");assert.equal(r.flows[0].to,"LOW");assert.equal(r.flows[0].movedL,4);assert.equal(r.massBalance.valid,true);
});
test("one-way check valves do not permit reverse pressure flow",()=>{
 const low=node("LOW","TANK",2,{pressureKPa:20,fluidType:"WATER"}),high=node("HIGH","TANK",10,{pressureKPa:120,fluidType:"WATER"});
 const r=tickFluidNetwork({nodes:[low,high],edges:[{id:"CHECK",from:"LOW",to:"HIGH",oneWay:true,maxFlowLps:4,conductanceLpsPerKPa:1}],deltaSeconds:1});
 assert.equal(r.flows.length,0);assert.equal(low.amountL,2);assert.equal(high.amountL,10);
});

test("pressurized water propagates across a serial pipe valve and tank chain in one fixed tick",()=>{
 const pump={id:"P",type:"PUMP",amountL:10,capacityL:100,fluidType:"WATER",pressureKPa:0,pumpHeadKPa:180,maxPressureKPa:350};
 const pipe={id:"A",type:"PIPE",amountL:0,capacityL:100,pressureKPa:0,maxPressureKPa:350};
 const valve={id:"V",type:"VALVE",amountL:0,capacityL:100,pressureKPa:0,maxPressureKPa:350};
 const pipe2={id:"B",type:"PIPE",amountL:0,capacityL:100,pressureKPa:0,maxPressureKPa:350};
 const tank={id:"T",type:"TANK",amountL:0,capacityL:500,pressureKPa:0,maxPressureKPa:600};
 const result=tickFluidNetwork({nodes:[pump,pipe,valve,pipe2,tank],edges:[
  {id:"1",from:"P",to:"A",oneWay:false,maxFlowLps:20,conductanceLpsPerKPa:50,maxPressureKPa:350},
  {id:"2",from:"A",to:"V",oneWay:false,maxFlowLps:20,conductanceLpsPerKPa:50,maxPressureKPa:350},
  {id:"3",from:"V",to:"B",oneWay:false,maxFlowLps:20,conductanceLpsPerKPa:50,maxPressureKPa:350},
  {id:"4",from:"B",to:"T",oneWay:false,maxFlowLps:20,conductanceLpsPerKPa:50,maxPressureKPa:350}
 ],deltaSeconds:.1});
 assert.equal(result.flows.length,4);assert.ok(tank.amountL>0);assert.equal(result.massBalance.valid,true);
});

test("consumeFluid debits a live building fluidAmountL buffer",()=>{
 const building={fluidAmountL:3,fluidType:"WATER"};
 const result=consumeFluid(building,1,"WATER");
 assert.equal(result.ok,true);assert.equal(result.movedL,1);assert.equal(building.fluidAmountL,2);assert.equal(building.fluidType,"WATER");
 assert.equal(consumeFluid(building,3,"WATER").ok,false);assert.equal(building.fluidAmountL,2);
});


test("fluid network IDs remain stable when unrelated networks are added or input order changes",()=>{
 const nodes=[node("PUMP-ALPHA","PUMP",10),node("TANK-ALPHA","TANK",0)];
 const edges=[{id:"EDGE-ALPHA",from:"PUMP-ALPHA",to:"TANK-ALPHA"}];
 const initial=buildFluidNetworks(nodes,edges).networkByID.get("PUMP-ALPHA");
 const expanded=buildFluidNetworks([node("0-ISOLATED","PIPE",0),...nodes].reverse(),edges).networkByID.get("PUMP-ALPHA");
 assert.equal(initial,"FLUID-PUMP-ALPHA");
 assert.equal(expanded,initial);
});
