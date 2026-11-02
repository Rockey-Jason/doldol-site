import test from "node:test";
import assert from "node:assert/strict";
import {resolveMachinePower,moveTowards,advanceMachineEnvironment,applyMachineWear,commitCompletionBuffer,clearCompletionBuffer} from "./production-runtime.js";

test("power thresholds are exact and brownout progress scales proportionally",()=>{
  assert.deepEqual(resolveMachinePower(0.7999,10),{status:"PAUSED_POWER",ratio:0.7999,progressMultiplier:0,canProgress:false});
  assert.equal(resolveMachinePower(0.8,10).status,"BROWNOUT_RUNNING");
  assert.equal(resolveMachinePower(0.8,10).progressMultiplier,0.8);
  assert.equal(resolveMachinePower(0.9999,10).progressMultiplier,0.9999);
  assert.equal(resolveMachinePower(1.2,10).progressMultiplier,1);
  assert.equal(resolveMachinePower(0,0).status,"RUNNING");
});

test("MoveTowards approaches targets at a bounded deterministic rate",()=>{
  assert.equal(moveTowards(0,100,5),5);
  assert.equal(moveTowards(98,100,5),100);
  assert.equal(moveTowards(100,0,5),95);
});

test("temperature and pressure ramp gradually and unused channels score 100",()=>{
  const machine={temp:25,pressure:0};
  const first=advanceMachineEnvironment(machine,{temp:1000,pressure:100,temperatureRampPerSecond:100,pressureRampPerSecond:10},0.1,1);
  assert.equal(machine.temp,35);
  assert.equal(machine.pressure,1);
  assert.equal(first.safe,false);
  const unused=advanceMachineEnvironment(machine,{usesTemperature:false,usesPressure:false},0.1,1);
  assert.equal(unused.temperatureQuality,100);
  assert.equal(unused.pressureQuality,100);
  assert.equal(unused.safe,true);
});

test("machine wear clamps condition and applies maintenance and low-condition thresholds",()=>{
  const machine={condition:25};
  const result=applyMachineWear(machine,{baseWearPerSecond:1},1,1);
  assert.equal(result.condition,24);
  assert.equal(result.maintenanceRecommended,true);
  const low=applyMachineWear(machine,{baseWearPerSecond:14},1,1);
  assert.equal(low.condition,10);
  assert.equal(low.progressMultiplier,0.8);
  const broken=applyMachineWear(machine,{baseWearPerSecond:10},1,1);
  assert.equal(broken.condition,0);
  assert.equal(broken.broken,true);
});

test("completion buffer is single-capacity and clear is idempotent",()=>{
  const machine={output:null};
  assert.equal(commitCompletionBuffer(machine,{id:"ironPlate",qty:1}),true);
  assert.equal(commitCompletionBuffer(machine,{id:"gear",qty:1}),false);
  assert.equal(machine.output.id,"ironPlate");
  assert.equal(clearCompletionBuffer(machine),true);
  assert.equal(clearCompletionBuffer(machine),false);
  assert.equal(commitCompletionBuffer(machine,{id:"gear",qty:2}),true);
});
