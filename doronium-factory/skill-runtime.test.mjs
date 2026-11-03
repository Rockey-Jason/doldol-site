import test from "node:test";
import assert from "node:assert/strict";
import {SKILL_NODES,createSkillState,normalizeSkillState,awardSkillPoints,unlockSkill,skillNodeStatus,calculateSkillBonuses,validateSkillTree,validateSkillState} from "./skill-runtime.js";

test("canonical skill tree contains five valid specializations and twenty ordered nodes",()=>{
 const v=validateSkillTree();
 assert.equal(v.valid,true,JSON.stringify(v.errors));
 assert.equal(v.nodeCount,20);
 assert.equal(v.groupCount,5);
});

test("one-time skill milestone claims are idempotent and capped at fifteen points",()=>{
 let state=createSkillState();
 const first=awardSkillPoints(state,"ACT_I_COMPLETE",1);state=first.state;
 assert.equal(first.awarded,1);
 const duplicate=awardSkillPoints(state,"ACT_I_COMPLETE",1);
 assert.equal(duplicate.awarded,0);
 state=awardSkillPoints(state,"MILESTONE_BONUS",99).state;
 assert.equal(state.totalEarned,15);
 assert.equal(state.availablePoints,15);
 assert.equal(awardSkillPoints(state,"OVER_CAP",1).awarded,0);
 assert.equal(validateSkillState(state).valid,true);
});

test("nodes require specialization prerequisites and exactly one point",()=>{
 let state=createSkillState();
 assert.equal(skillNodeStatus(state,"GEOLOGICAL_READOUT"),"LOCKED");
 let result=unlockSkill(state,"GEOLOGICAL_READOUT");assert.equal(result.reason,"PREREQUISITES_LOCKED");
 result=unlockSkill(state,"FIELD_SURVEYOR");assert.equal(result.ok,true);state=result.state;
 assert.equal(skillNodeStatus(state,"FIELD_SURVEYOR"),"UNLOCKED");
 assert.equal(skillNodeStatus(state,"GEOLOGICAL_READOUT"),"LOCKED");
 state=awardSkillPoints(state,"RESEARCH_TIER_1").state;
 result=unlockSkill(state,"GEOLOGICAL_READOUT");assert.equal(result.ok,true);
 assert.equal(validateSkillState(state).valid,true);
});

test("skill bonuses are applied once and only for unlocked nodes",()=>{
 let state=createSkillState();
 state=unlockSkill(state,"FIELD_SURVEYOR").state;
 assert.equal(calculateSkillBonuses(state).scannerRangeMultiplier,1.1);
 assert.equal(calculateSkillBonuses(state).miningSpeedMultiplier,1);
 state=awardSkillPoints(state,"MILESTONE_2").state;
 state=unlockSkill(state,"STEADY_SWING").state;
 assert.equal(calculateSkillBonuses(state).miningSpeedMultiplier,1.1);
 assert.equal(calculateSkillBonuses(state).toolWearMultiplier,1);
});

test("normalization preserves old saves and produces a valid initial skill ledger",()=>{
 const initial=normalizeSkillState(null);
 assert.equal(initial.availablePoints,1);
 assert.equal(validateSkillState(initial).valid,true);
 const resumed=normalizeSkillState({...initial,unlockedSkillIDs:["FIELD_SURVEYOR"],totalEarned:2,availablePoints:1,totalSpent:1});
 assert.equal(resumed.availablePoints,1);
 assert.equal(validateSkillState(resumed).valid,true);
});
