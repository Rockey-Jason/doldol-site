import test from "node:test";
import assert from "node:assert/strict";
import {
  MINE_ROCK_PROFILES, createMineEnvironment, ensureMineEnvironment,
  mineGeologyAt, mineOreProfile, mineSafetyAssessment, tickMineEnvironment,
  toggleMineEquipment, reinforceMineSupports, mineEnvironmentSummary
} from "./mine-runtime.js";

test("geology changes by depth and position while remaining deterministic",()=>{
  const a=mineGeologyAt(1,12,8),b=mineGeologyAt(1,12,8),deep=mineGeologyAt(5,12,8),other=mineGeologyAt(3,20,16);
  assert.deepEqual(a,b);
  assert.ok(Object.hasOwn(MINE_ROCK_PROFILES,a.id));
  assert.notEqual(a.id,deep.id,"depth should expose a different host-rock profile");
  assert.ok(Number.isFinite(a.hardness)&&a.hardness>0);
  assert.ok(other.id&&Number.isInteger(other.color));
});
test("ore profiles distinguish coal seams from metallic and crystalline deposits",()=>{
  assert.equal(mineOreProfile("coal").style,"stratified-seam");
  assert.notEqual(mineOreProfile("coal").cluster,mineOreProfile("quartz").cluster);
  assert.ok(mineOreProfile("ironOre").metalness>mineOreProfile("coal").metalness);
});
test("legacy saves gain five environment records without losing existing settings",()=>{
  const state={player:{layer:"mine",mineLevel:3},mineEnvironment:{3:{waterDepth:.4,pumpActive:true,supportIntegrity:72}}};
  const env=ensureMineEnvironment(state);
  assert.equal(Object.keys(env).length,5);
  assert.equal(env[3].waterDepth,.4);
  assert.equal(env[3].pumpActive,true);
  assert.equal(env[3].supportIntegrity,72);
  assert.equal(env[1].supportIntegrity,100);
});
test("ventilation reduces gas while an inactive fan allows it to accumulate",()=>{
  const state={player:{layer:"mine",mineLevel:1},mineEnvironment:createMineEnvironment()};
  const env=ensureMineEnvironment(state)[1];
  env.gasLevel=40;
  for(let i=0;i<100;i++)tickMineEnvironment(state,.3);
  const ventilated=env.gasLevel;
  toggleMineEquipment(env,"ventilation");
  for(let i=0;i<100;i++)tickMineEnvironment(state,.3);
  assert.ok(env.gasLevel>ventilated);
  assert.equal(env.ventilationActive,false);
});
test("drain pump reduces water ingress relative to an inactive pump",()=>{
  const a={player:{layer:"mine",mineLevel:2},mineEnvironment:createMineEnvironment()};
  const b={player:{layer:"mine",mineLevel:2},mineEnvironment:createMineEnvironment()};
  toggleMineEquipment(ensureMineEnvironment(a)[2],"pump");
  for(let i=0;i<1200;i++){tickMineEnvironment(a,.3);tickMineEnvironment(b,.3)}
  assert.ok(a.mineEnvironment[2].waterDepth<b.mineEnvironment[2].waterDepth);
});
test("support repair restores condition and recalculates an incident",()=>{
  const env=createMineEnvironment()[4];
  env.supportIntegrity=0;env.waterDepth=.98;env.gasLevel=100;
  const risk=mineSafetyAssessment(env);
  assert.equal(risk.status,"EVACUATE");
  const repair=reinforceMineSupports(env,100);
  assert.equal(repair.after,100);
  assert.equal(env.incident,false);
  assert.equal(mineEnvironmentSummary(env).support,100);
});
test("mine systems stay inactive on the surface and stop mining after a safety limit is exceeded",()=>{
  const surface={player:{layer:"surface",mineLevel:1},mineEnvironment:createMineEnvironment()};
  assert.equal(tickMineEnvironment(surface,.3).active,false);
  const underground={player:{layer:"mine",mineLevel:1},mineEnvironment:createMineEnvironment()};
  const env=ensureMineEnvironment(underground)[1];
  env.gasLevel=100;env.waterDepth=.98;env.supportIntegrity=0;
  const tick=tickMineEnvironment(underground,.3);
  assert.equal(tick.assessment.stopMining,true);
  assert.equal(tick.environment.incident,true);
});
