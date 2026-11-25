import test from "node:test";
import assert from "node:assert/strict";
import {activateMineInstance,ensureMineInstance,mineInstanceIDForEntrance,saveActiveMineInstance} from "./mine-instance-runtime.js";

const defaults=()=>({mineDeposits:{"1:1:1":{amount:50}},mineEnvironment:{1:{waterDepth:.1}},mineInfrastructure:{supports:{},closures:{},events:[],railRoutes:{}}});

test("entrance coordinates produce stable, distinct mine identities",()=>{
 assert.equal(mineInstanceIDForEntrance(12,34),"mine:12:34");
 assert.equal(mineInstanceIDForEntrance(12,35),"mine:12:35");
 assert.equal(mineInstanceIDForEntrance(12.9,34.8),"mine:12:34");
});

test("first instance safely inherits legacy mine state; next instance gets isolated state",()=>{
 const state={player:{layer:"surface"},mineDeposits:{"1:8:12":{amount:0}},mineEnvironment:{1:{waterDepth:.6}},mineInfrastructure:{supports:{legacy:true},closures:{},events:[],railRoutes:{}},buildings:[{layer:"mine",mineLevel:1,uid:"legacy-miner"}]};
 const first=activateMineInstance(state,"mine:10:20",defaults);
 assert.equal(first.mineDeposits["1:8:12"].amount,0,"depleted legacy deposit must remain depleted");
 assert.equal(state.buildings[0].mineInstanceID,"mine:10:20","legacy mine machinery must migrate with the legacy mine state");
 first.mineEnvironment[1].waterDepth=.72;
 const second=activateMineInstance(state,"mine:30:40",defaults);
 assert.equal(second.mineDeposits["1:1:1"].amount,50);
 assert.notEqual(second.mineEnvironment[1].waterDepth,.72);
 second.mineDeposits["1:1:1"].amount=9;
 activateMineInstance(state,"mine:10:20",defaults);
 assert.equal(state.mineDeposits["1:8:12"].amount,0);
 assert.equal(state.mineEnvironment[1].waterDepth,.72);
 assert.equal(state.mineInstanceMigrationComplete,true);
});

test("active mine state persists and reopens without aliasing another instance",()=>{
 const state={player:{layer:"surface"},mineDeposits:{old:{amount:1}},mineEnvironment:{1:{waterDepth:.2}},mineInfrastructure:{supports:{},closures:{},events:[],railRoutes:{}}};
 activateMineInstance(state,"mine:1:2",defaults);
 state.mineDeposits["1:1:1"].amount=3;
 saveActiveMineInstance(state);
 activateMineInstance(state,"mine:3:4",defaults);
 state.mineDeposits["1:1:1"].amount=41;
 activateMineInstance(state,"mine:1:2",defaults);
 assert.equal(state.mineDeposits["1:1:1"].amount,3);
 assert.notEqual(state.mineDeposits,state.mineInstances["mine:3:4"].mineDeposits);
});

test("legacy state migrates only once and malformed instance map is normalized",()=>{
 const state={mineInstances:[],mineDeposits:{legacy:{amount:0}},mineEnvironment:{1:{}},player:{layer:"surface"}};
 const migrated=ensureMineInstance(state,"mine:1:1",defaults);
 assert.equal(migrated.mineDeposits.legacy.amount,0);
 assert.equal(state.mineInstanceMigrationComplete,true);
 const other=ensureMineInstance(state,"mine:2:2",defaults);
 assert.equal(other.mineDeposits["1:1:1"].amount,50);
});


test("mine power topology settings are isolated and restored per entrance",()=>{
 const state={
  player:{layer:"surface"},
  mineDeposits:{"1:8:12":{amount:0}},
  mineEnvironment:{1:{waterDepth:.4}},
  mineInfrastructure:{supports:{},closures:{},events:[],railRoutes:{}},
  powerTopologyLayers:{surface:true,mine:{1:true,2:false}}
 };
 const first=activateMineInstance(state,"mine:10:10",defaults);
 assert.deepEqual(first.powerTopology,{1:true,2:false});
 state.player.layer="mine";
 state.powerTopologyLayers.mine[1]=false;
 saveActiveMineInstance(state);
 state.player.layer="surface";
 const second=activateMineInstance(state,"mine:20:20",defaults);
 assert.deepEqual(state.powerTopologyLayers.mine,{});
 state.player.layer="mine";
 state.powerTopologyLayers.mine[1]=true;
 saveActiveMineInstance(state);
 state.player.layer="surface";
 activateMineInstance(state,"mine:10:10",defaults);
 assert.deepEqual(state.powerTopologyLayers.mine,{1:false,2:false});
 activateMineInstance(state,"mine:20:20",defaults);
 assert.deepEqual(state.powerTopologyLayers.mine,{1:true});
 assert.equal(state.powerTopologyLayers.surface,true,"surface topology remains shared and unchanged");
});
