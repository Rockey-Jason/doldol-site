import {FAILURE_PROFILES} from "./failure-profiles.js";
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
 const args={temperature:100,targetTemperature:100,safeTemperatureMin:50,safeTemperatureMax:150,pressure:100,targetPressure:100,safePressureMin:50,safePressureMax:150,powerRatio:.8,condition:50,actualLoad:2,nominalLoad:2};
 const center=calculateFailureRisks({...args,profile});
 assert.equal(center.temperature,0);
 assert.equal(center.pressure,0);
 assert.equal(center.powerInstability,.19999999999999996);
 assert.equal(center.wear,.5);
 assert.equal(center.load,0);
 const overloaded=calculateFailureRisks({...args,profile,actualLoad:3});
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

import {applyMachineFailure,completeMachineRepair} from "./failure-runtime.js";
import {FAILURE_PROFILES} from "./failure-profiles.js";

test("all production machine profiles define valid explicit minor/major/critical outcomes",()=>{
 for(const [machineType,p] of Object.entries(FAILURE_PROFILES)){
  assert.equal(validateFailureProfile(p).valid,true,machineType);
  for(const grade of ["minor","major","critical"]){
   assert.ok(Number(p.outcomes[grade].repairSeconds)>0);
   assert.ok(Object.keys(p.outcomes[grade].repairMaterials||{}).length>0);
  }
 }
});

test("failure result applies once and preserves the in-process recipe for repair",()=>{
 const machine={uid:"M-42",condition:100,status:"RUNNING",activeMeta:{quality:90,purity:92,synthetic:false},progress:4};
 const event={failureEventID:"FAIL-77",grade:"major",outcome:{...FAILURE_PROFILES.smelter.outcomes.major}};
 assert.equal(applyMachineFailure(machine,event),true);
 assert.equal(machine.status,"MAINTENANCE");
 assert.equal(machine.condition,84);
 assert.ok(machine.activeMeta,"active recipe inputs remain attached while under repair");
 assert.equal(applyMachineFailure(machine,event),false,"the same failure event cannot be applied twice");
 machine.condition=40;machine.maintenanceTimer=0;
 assert.equal(completeMachineRepair(machine),true);
 assert.equal(machine.status,"IDLE");
 assert.equal(machine.condition,76);
 assert.equal(machine.activeMeta.quality,90);
 assert.equal(completeMachineRepair(machine),false);
});

test("critical failure enters BROKEN and requires an explicit repair",()=>{
 const machine={uid:"M-99",condition:100,status:"RUNNING"};
 const event={failureEventID:"FAIL-99",grade:"critical",outcome:{...FAILURE_PROFILES.reactor.outcomes.critical}};
 assert.equal(applyMachineFailure(machine,event),true);
 assert.equal(machine.status,"BROKEN");
 assert.equal(machine.failureRepair.broken,true);
 assert.equal(machine.failureRepair.repairMaterials.ironPlate,10);
 assert.equal(completeMachineRepair(machine),true);
 assert.equal(machine.status,"IDLE");
 assert.equal(machine.condition,62);
});

test("every live factory utility, mining, fluid, logistics and campaign facility has a valid failure profile",()=>{
 const required=["smelter","wiremill","assembler","reactor","variantLab","goldSmelter","chromeSmelter","steelForge","titaniumPress","carbonMill","minerAdvanced","pump","doriFarm","minerIron","minerCopper","minerCoal","mineGen","coalgen","cooling","fusion","fluidPipe","fluidValve","fluidTank","fluidPump","solar","wind","battery","transformer","powerCable","belt","beltAdaptive","sorter","splitter","merger","conveyorLift","curvedConveyor","multiLaneConveyor","storage","warehouse","market","relay","core","lab"];
 for(const id of required){assert.ok(FAILURE_PROFILES[id],id+" profile missing");assert.equal(validateFailureProfile(FAILURE_PROFILES[id]).valid,true,id+" profile invalid")}
});
