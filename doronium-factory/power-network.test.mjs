import test from "node:test";
import assert from "node:assert/strict";
import { resolvePowerNetworks } from "./power-network.js";

test("isolated networks never share generator capacity", () => {
  const result = resolvePowerNetworks({
    dtSeconds: 1,
    nodes: [{id:"a"},{id:"b"}],
    generators: [{id:"g-a",nodeID:"a",availableKW:100}],
    consumers: [
      {id:"c-a",nodeID:"a",requiredKW:60,priority:1},
      {id:"c-b",nodeID:"b",requiredKW:60,priority:1}
    ]
  });
  assert.equal(result.valid,true);
  assert.equal(result.consumers["c-a"].status,"RUNNING");
  assert.equal(result.consumers["c-b"].status,"PAUSED_POWER");
  assert.notEqual(result.consumers["c-a"].networkID,result.consumers["c-b"].networkID);
});

test("priority distribution protects safety and cooling loads before production", () => {
  const result = resolvePowerNetworks({
    dtSeconds: 1,
    nodes: [{id:"grid"}],
    generators: [{id:"g",nodeID:"grid",availableKW:100}],
    consumers: [
      {id:"production",nodeID:"grid",requiredKW:80,priority:20},
      {id:"cooling",nodeID:"grid",requiredKW:30,priority:1},
      {id:"safety",nodeID:"grid",requiredKW:20,priority:0}
    ]
  });
  assert.equal(result.consumers.safety.suppliedKW,20);
  assert.equal(result.consumers.cooling.suppliedKW,30);
  assert.equal(result.consumers.production.suppliedKW,50);
  assert.equal(result.consumers.production.status,"PAUSED_POWER");
});

test("battery energy (kJ) and output power (kW) are separate limits", () => {
  const input = {
    dtSeconds:1,
    nodes:[{id:"grid"}],
    batteries:[{id:"b",nodeID:"grid",energyKJ:250,capacityKJ:250,maxOutputKW:500,maxInputKW:0}],
    consumers:[{id:"c",nodeID:"grid",requiredKW:250,priority:1}]
  };
  const first=resolvePowerNetworks(structuredClone(input));
  assert.equal(first.consumers.c.suppliedKW,250);
  assert.equal(first.networks[0].batteryEnergyKJ,0);
  const secondInput=structuredClone(input);
  secondInput.batteries[0].energyKJ=first.networks[0].batteryEnergyKJ;
  const second=resolvePowerNetworks(secondInput);
  assert.equal(second.consumers.c.suppliedKW,0);
});

test("cable losses and transformer efficiency/capacity limit delivered power", () => {
  const result=resolvePowerNetworks({
    dtSeconds:1,
    cables:[{id:"cable",from:"plant",to:"transformer-in",capacityKW:100,lossRatio:0}],
    transformers:[{id:"xfmr",from:"transformer-in",to:"factory",capacityKW:60,lossRatio:0,efficiency:.9}],
    nodes:[{id:"plant"},{id:"transformer-in"},{id:"factory"}],
    generators:[{id:"g",nodeID:"plant",availableKW:100}],
    consumers:[{id:"load",nodeID:"factory",requiredKW:100,priority:1}]
  });
  assert.equal(result.consumers.load.suppliedKW,54);
  assert.equal(result.consumers.load.status,"PAUSED_POWER");
});

test("empty consumers use ratio one and brownout boundary is exact", () => {
  const result=resolvePowerNetworks({
    dtSeconds:1,nodes:[{id:"grid"}],
    generators:[{id:"g",nodeID:"grid",availableKW:80}],
    consumers:[
      {id:"zero",nodeID:"grid",requiredKW:0},
      {id:"brownout",nodeID:"grid",requiredKW:100,priority:1}
    ]
  });
  assert.equal(result.consumers.zero.powerRatio,1);
  assert.equal(result.consumers.brownout.powerRatio,.8);
  assert.equal(result.consumers.brownout.status,"BROWNOUT_RUNNING");
  assert.equal(result.consumers.brownout.progressMultiplier,.8);
});

test("surplus generator output charges battery by explicit kJ and efficiency", () => {
  const result=resolvePowerNetworks({
    dtSeconds:2,nodes:[{id:"grid"}],
    generators:[{id:"g",nodeID:"grid",availableKW:50}],
    batteries:[{id:"b",nodeID:"grid",energyKJ:0,capacityKJ:100,maxOutputKW:10,maxInputKW:20,chargeEfficiency:.5}],
    consumers:[{id:"c",nodeID:"grid",requiredKW:10,priority:1}]
  });
  assert.equal(result.consumers.c.suppliedKW,10);
  assert.equal(result.networks[0].batteryEnergyKJ,20);
});

test("invalid topology and battery data fail closed", () => {
  const bad=resolvePowerNetworks({
    dtSeconds:1,nodes:[{id:"a"}],
    generators:[{id:"g",nodeID:"missing",availableKW:10}],
    batteries:[{id:"b",nodeID:"a",energyKJ:500,capacityKJ:250,maxOutputKW:1,maxInputKW:1}]
  });
  assert.equal(bad.valid,false);
  assert.ok(bad.errors.length>=2);
});
