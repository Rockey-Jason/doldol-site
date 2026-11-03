import test from "node:test";
import assert from "node:assert/strict";
import { resolvePowerNetworks, tickFluidNetwork } from "./network-runtime.js";

test("power networks isolate disconnected islands and assign stable NetworkIDs",()=>{
  const state={
    powerNodes:[
      {id:"g-a",kind:"generator",generationKW:100},
      {id:"m-a",kind:"consumer",demandKW:60,priority:1},
      {id:"g-b",kind:"generator",generationKW:20},
      {id:"m-b",kind:"consumer",demandKW:10,priority:1}
    ],
    powerEdges:[
      {id:"cable-a",from:"g-a",to:"m-a",capacityKW:100,lossRatio:0},
      {id:"cable-b",from:"g-b",to:"m-b",capacityKW:100,lossRatio:0}
    ]
  };
  const first=resolvePowerNetworks(state,{dtSec:.1});
  assert.equal(first.consumers["m-a"].suppliedKW,60);
  assert.equal(first.consumers["m-b"].suppliedKW,10);
  assert.notEqual(first.consumers["m-a"].networkID,first.consumers["m-b"].networkID);
  const ids=state.powerNodes.map(n=>n.networkID);
  assert.deepEqual(resolvePowerNetworks(state,{dtSec:.1}).networks.map(n=>n.networkID),first.networks.map(n=>n.networkID));
  assert.deepEqual(state.powerNodes.map(n=>n.networkID),ids);
});

test("power allocation obeys priority, brownout floor, and cable losses",()=>{
  const state={
    powerNodes:[
      {id:"g",kind:"generator",generationKW:110},
      {id:"safety",kind:"consumer",demandKW:50,priority:0},
      {id:"machine",kind:"consumer",demandKW:60,priority:10}
    ],
    powerEdges:[
      {id:"main",from:"g",to:"safety",capacityKW:200,lossRatio:.1},
      {id:"branch",from:"safety",to:"machine",capacityKW:200,lossRatio:0}
    ]
  };
  const result=resolvePowerNetworks(state,{dtSec:.1});
  assert.equal(result.consumers.safety.state,"RUNNING");
  assert.ok(result.consumers.machine.powerRatio>=.8);
  assert.ok(result.consumers.machine.powerRatio<1);
  assert.ok(result.networks[0].lossKW>0);
  assert.equal(result.consumers.machine.state,"BROWNOUT_RUNNING");
  const blocked={
    powerNodes:[{id:"g",kind:"generator",generationKW:35},{id:"critical",kind:"consumer",demandKW:50,priority:0},{id:"low",kind:"consumer",demandKW:10,priority:10}],
    powerEdges:[{id:"a",from:"g",to:"critical"},{id:"b",from:"critical",to:"low"}]
  };
  const paused=resolvePowerNetworks(blocked,{dtSec:.1});
  assert.equal(paused.consumers.critical.state,"PAUSED_POWER");
  assert.equal(paused.consumers.low.state,"RUNNING");
  assert.equal(paused.consumers.low.suppliedKW,10);
});

test("battery stores kJ separately from kW output and respects both power limits",()=>{
  const state={
    powerNodes:[
      {id:"g",kind:"generator",generationKW:80},
      {id:"battery",kind:"battery",storedEnergyKJ:100,capacityKJ:1000,maxChargeKW:20,maxDischargeKW:5,chargeEfficiency:.9,dischargeEfficiency:.8},
      {id:"m",kind:"consumer",demandKW:85,priority:0}
    ],
    powerEdges:[{id:"c1",from:"g",to:"m",capacityKW:200},{id:"c2",from:"g",to:"battery",capacityKW:200},{id:"c3",from:"battery",to:"m",capacityKW:200}]
  };
  const before=state.powerNodes.find(n=>n.id==="battery").storedEnergyKJ;
  const first=resolvePowerNetworks(state,{dtSec:1});
  const battery=state.powerNodes.find(n=>n.id==="battery");
  assert.equal(first.batteries.battery.dischargeKW,5);
  assert.ok(battery.storedEnergyKJ<before);
  assert.ok(battery.storedEnergyKJ>=0);
  assert.ok(battery.storedEnergyKJ<=battery.capacityKJ);
  state.powerNodes.find(n=>n.id==="m").demandKW=20;
  resolvePowerNetworks(state,{dtSec:1});
  assert.ok(battery.storedEnergyKJ>0);
  assert.ok(battery.storedEnergyKJ<=battery.capacityKJ);
});

test("transformer-rated link caps transfer and a disabled edge splits a network",()=>{
  const state={
    powerNodes:[{id:"g",kind:"generator",generationKW:500},{id:"m",kind:"consumer",demandKW:100,priority:0}],
    powerEdges:[{id:"transformer",kind:"transformer",from:"g",to:"m",capacityKW:40,lossRatio:.05}]
  };
  const result=resolvePowerNetworks(state,{dtSec:.1});
  assert.equal(result.consumers.m.state,"PAUSED_POWER");
  assert.equal(result.consumers.m.suppliedKW,0);
  state.powerEdges[0].capacityKW=200;
  const recovered=resolvePowerNetworks(state,{dtSec:.1});
  assert.equal(recovered.consumers.m.state,"RUNNING");
  state.powerEdges[0].enabled=false;
  const separated=resolvePowerNetworks(state,{dtSec:.1});
  assert.equal(separated.consumers.m.state,"PAUSED_POWER");
  assert.notEqual(state.powerNodes[0].networkID,state.powerNodes[1].networkID);
});

test("fluid transfer conserves litres and records explicit line loss",()=>{
  const state={
    fluidNodes:[
      {id:"tank",kind:"tank",fluidType:"water",quantityL:100,capacityL:200,reservedL:10,pressureKPa:300,maxFlowLps:20,temperatureC:20,contamination:0},
      {id:"machine",kind:"machine",fluidType:null,quantityL:0,capacityL:50,reservedL:0,pressureKPa:100,maxFlowLps:10,temperatureC:25,contamination:0}
    ],
    fluidEdges:[{id:"pipe",from:"tank",to:"machine",maxFlowLps:10,lossRatio:.1,pressureResistanceKPa:100}]
  };
  const result=tickFluidNetwork(state,{dtSec:1});
  assert.ok(result.movedL>0);
  assert.ok(result.deliveredL<result.movedL);
  assert.ok(result.lostL>0);
  assert.ok(Math.abs(result.conservationErrorL)<1e-9);
  assert.equal(state.fluidNodes[0].quantityL+state.fluidNodes[1].quantityL+result.lostL,100);
  assert.equal(state.fluidNodes[1].fluidType,"water");
});

test("fluid reservations, valves, pump head and incompatible fluids are enforced",()=>{
  const state={
    fluidNodes:[
      {id:"tank",kind:"tank",fluidType:"oil",quantityL:10,capacityL:20,reservedL:8,pressureKPa:100,maxFlowLps:100,valveOpen:true},
      {id:"pump",kind:"pump",fluidType:null,quantityL:0,capacityL:10,pressureKPa:300,maxFlowLps:100,pumpActive:true,pumpHeadKPa:500,valveOpen:true},
      {id:"water-tank",kind:"tank",fluidType:"water",quantityL:0,capacityL:20,reservedL:0,pressureKPa:0,maxFlowLps:100,valveOpen:true}
    ],
    fluidEdges:[
      {id:"oil-line",from:"tank",to:"pump",maxFlowLps:100,pressureResistanceKPa:1},
      {id:"water-line",from:"pump",to:"water-tank",maxFlowLps:100,pressureResistanceKPa:1}
    ]
  };
  const result=tickFluidNetwork(state,{dtSec:1});
  assert.equal(state.fluidNodes[0].quantityL,10);
  assert.equal(state.fluidNodes[1].quantityL,0);
  assert.equal(result.movedL,0);
  state.fluidNodes[0].valveOpen=false;
  assert.equal(tickFluidNetwork(state,{dtSec:1}).movedL,0);
});

test("fluid transfer is snapshot-based: incoming liquid cannot cross a second link in the same tick",()=>{
  const state={
    fluidNodes:[
      {id:"source",fluidType:"water",quantityL:20,capacityL:20,pressureKPa:300,maxFlowLps:10},
      {id:"middle",fluidType:null,quantityL:0,capacityL:20,pressureKPa:200,maxFlowLps:10},
      {id:"sink",fluidType:null,quantityL:0,capacityL:20,pressureKPa:0,maxFlowLps:10}
    ],
    fluidEdges:[
      {id:"01",from:"source",to:"middle",maxFlowLps:10,pressureResistanceKPa:1},
      {id:"02",from:"middle",to:"sink",maxFlowLps:10,pressureResistanceKPa:1}
    ]
  };
  const result=tickFluidNetwork(state,{dtSec:1});
  assert.equal(state.fluidNodes[0].quantityL,10);
  assert.equal(state.fluidNodes[1].quantityL,10);
  assert.equal(state.fluidNodes[2].quantityL,0);
  assert.equal(result.movedL,10);
  assert.equal(result.conservationErrorL,0);
});
