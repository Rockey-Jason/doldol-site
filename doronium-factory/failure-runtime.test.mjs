import test from "node:test";
import assert from "node:assert/strict";
import {validateFailureProfile,calculateFailureRisks,calculateFailureHazard,nextFailureRandom,rollMachineFailure,advanceFailureExposure} from "./failure-runtime.js";

const profile={baseFailureProbability:.01,referenceDurationSec:260,weights:{temperature:1,pressure:1,powerInstability:1,wear:1,load:1},loadRiskRange:{optimalRatio:1,criticalRatio:2},gradeDistribution:{minor:.3,major:.45,critical:.25},outcomes:{minor:{progressLossSeconds:1},major:{progressLossSeconds:5},critical:{progressLossSeconds:10}}};
const risks={temperature:0,pressure:0,powerInstability:0,wear:0,load:0};

test("failure profile requires valid base hazard, risk weights, grade distribution and explicit outcomes",()=>{
 assert.equal(validateFailureProfile(profile).valid,true);
 assert.equal(validateFailureProfile({...profile,baseFailureProbability:1}).valid,false);
 assert.equal(validateFailureProfile({...profile,referenceDurationSec:0}).valid,false);
 assert.equal(validateFailureProfile({...profile,gradeDistribution:{minor:.3,major:.3,critical:.3}}).valid,false);
 assert.equal(validateFailureProfile({...profile,outcomes:{minor:{},major:{}}}).valid,false);
 assert.equal(validateFailureProfile({...profile,weights:{...profile.weights,wear:-1}}).valid,false);
});

test("hazard rate uses reference duration and exposure time, not repeated fixed tick chance",()=>{
 const hazard=calculateFailureHazard(profile,risks,260);
 assert.equal(hazard.valid,true);
 assert.ok(Math.abs(hazard.tickProbability-.01)<1e-12);
 assert.ok(Math.abs(hazard.baseHazardRate-(-Math.log(.99)/260))<1e-12);
 assert.equal(calculateFailureHazard(profile,risks,0).tickProbability,0);
 assert.ok(calculateFailureHazard(profile,{...risks,wear:1},260).tickProbability>hazard.tickProbability);
});

test("temperature and pressure risks rise from target to safe-band edge and fault outside",()=>{
 const args={temperature:100,targetTemperature:100,safeTemperatureMin:50,safeTemperatureMax:150,pressure:100,targetPressure:100,safePressureMin:50,safePressureMax:150,powerRatio:.8,condition:50,actualLoad:1,nominalLoad:2};
 const center=calculateFailureRisks({...args,profile});
 assert.equal(center.temperature,0);
 assert.equal(center.pressure,0);
 assert.equal(center.powerInstability,.19999999999999996);
 assert.equal(center.wear,.5);
 assert.equal(center.load,0);
 const overloaded=calculateFailureRisks({...args,profile,actualLoad:1.5});
 assert.equal(overloaded.load,.5);
 const edge=calculateFailureRisks({...args,profile,temperature:150,pressure:50});
 assert.equal(edge.temperature,1);
 assert.equal(edge.pressure,1);
 const fault=calculateFailureRisks({...args,profile,temperature:151});
 assert.equal(fault.safetyFault,true);
 assert.equal(calculateFailureHazard(profile,fault,10).tickProbability,0);
});

test("only active RUNNING exposure accumulates",()=>{
 const machine={failureExposureSec:2};
 assert.equal(advanceFailureExposure(machine,.1,true),2.1);
 assert.equal(advanceFailureExposure(machine,10,false),2.1);
 assert.equal(advanceFailureExposure(machine,-1,true),2.1);
});

test("deterministic RNG resumes exactly from persisted state",()=>{
 const a={failureRngState:123456789,failureRngIndex:0},b={failureRngState:123456789,failureRngIndex:0};
 const first=nextFailureRandom(a);
 assert.equal(first,nextFailureRandom(b));
 const saved={...a};
 assert.equal(nextFailureRandom(a),nextFailureRandom(saved));
 assert.equal(a.failureRngIndex,2);
});

test("failure roll emits one unique persisted event with configured grade",()=>{
 const runtime={failureRngState:1,failureRngIndex:0,nextFailureEventId:1,failureEvents:[]};
 const certain={...profile,baseFailureProbability:.999999};
 const hazard=calculateFailureHazard(certain,risks,10000);
 const event=rollMachineFailure(runtime,{uid:"machine-7",tick:55},certain,hazard);
 assert.ok(event);
 assert.match(event.failureEventID,/^FAIL-1$/);
 assert.equal(event.machineID,"machine-7");
 assert.ok(["minor","major","critical"].includes(event.grade));
 assert.equal(runtime.failureEvents.length,1);
 assert.equal(rollMachineFailure(runtime,{uid:"machine-7"},certain,{valid:false,tickProbability:1}),null);
});
