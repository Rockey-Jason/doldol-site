import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureMineInfrastructure, mineSupportSections, nearestMineSupport,
  mineCellIsClosed, mineCellIsSafe, repairMineSupport,
  mineDrainageNetworks, tickMineDrainage, mineDrainageSummary,
  mineRailStations, setMineRailEnabled, mineRailSummary, tickMineRailRoutes,
  mineRoutePath, tickMineSupportSections, supportSectionsSummary, mineVeinSegments
} from "./mine-systems-runtime.js";
import { createMineEnvironment } from "./mine-runtime.js";

function stateFixture(){
  return {seconds:0,player:{layer:"mine",mineLevel:1,x:3,y:12},buildings:[],mineEnvironment:createMineEnvironment()};
}

test("legacy saves receive local support sections and rail state without losing buildings",()=>{
  const state={player:{layer:"surface"},buildings:[{uid:"legacy",type:"minerIron",layer:"mine",mineLevel:2}],mineEnvironment:createMineEnvironment()};
  const infra=ensureMineInfrastructure(state);
  assert.equal(mineSupportSections(state,2).length,6);
  assert.equal(mineSupportSections(state,1).length,6);
  assert.equal(infra.railRoutes[3].enabled,false);
  assert.equal(state.buildings[0].uid,"legacy");
});
test("support condition is local to each tunnel section and repairs can reopen a closed route",()=>{
  const state=stateFixture(),section=nearestMineSupport(state,1,5,12).section;
  section.integrity=4;section.warning=true;section.closed=true;
  ensureMineInfrastructure(state).closures["1:"+section.x+":"+section.z]=true;
  assert.equal(mineCellIsClosed(state,1,section.x,section.z),true);
  assert.equal(mineCellIsSafe(state,1,section.x,section.z).safe,false);
  const repaired=repairMineSupport(state,1,section.x,section.z,42);
  assert.equal(repaired.ok,true);
  assert.equal(section.integrity,46);
  assert.equal(section.closed,false);
  assert.equal(mineCellIsClosed(state,1,section.x,section.z),false);
});
test("wet active drilling wears nearby supports and creates a safe passage-closure event",()=>{
  const state=stateFixture();
  const section=nearestMineSupport(state,1,5,12).section;
  section.integrity=0;
  state.mineEnvironment[1].waterDepth=.8;
  state.mineEnvironment[1].humidity=90;
  state.buildings.push({uid:"drill",type:"minerIron",layer:"mine",mineLevel:1,x:5,y:12,status:"RUNNING"});
  const result=tickMineSupportSections(state,.1);
  assert.equal(result.events.some(e=>e.type==="PASSAGE_CLOSED"),true);
  assert.equal(mineCellIsClosed(state,1,section.x,section.z),true);
  assert.equal(supportSectionsSummary(state,1).closed,1);
});
test("water only drains through a continuous pump-pipe-tank network",()=>{
  const state=stateFixture();
  state.mineEnvironment[1].pumpActive=true;
  state.mineEnvironment[1].waterDepth=.5;
  state.buildings=[
    {uid:"pump",type:"mineDrainPump",layer:"mine",mineLevel:1,x:5,y:12,status:"RUNNING",rateLps:20},
    {uid:"pipe-a",type:"mineDrainPipe",layer:"mine",mineLevel:1,x:6,y:12},
    {uid:"pipe-b",type:"mineDrainPipe",layer:"mine",mineLevel:1,x:7,y:12},
    {uid:"tank",type:"mineWaterTank",layer:"mine",mineLevel:1,x:8,y:12,capacityL:5000,waterStoredL:0}
  ];
  assert.equal(mineDrainageNetworks(state,1)[0].connected,true);
  const result=tickMineDrainage(state,1);
  assert.equal(result.results.length,1);
  assert.equal(state.buildings[3].waterStoredL,20);
  assert.ok(state.mineEnvironment[1].waterDepth<.5);
  assert.equal(mineDrainageSummary(state,1).connectedNetworks,1);
});
test("disconnected pipe gaps prevent pumping and no water storage is invented",()=>{
  const state=stateFixture();
  state.mineEnvironment[1].pumpActive=true;state.mineEnvironment[1].waterDepth=.4;
  state.buildings=[
    {uid:"pump",type:"mineDrainPump",layer:"mine",mineLevel:1,x:5,y:12,status:"RUNNING"},
    {uid:"pipe",type:"mineDrainPipe",layer:"mine",mineLevel:1,x:6,y:12},
    {uid:"tank",type:"mineWaterTank",layer:"mine",mineLevel:1,x:8,y:12,capacityL:5000,waterStoredL:0}
  ];
  assert.equal(mineDrainageNetworks(state,1).some(n=>n.connected),false);
  assert.equal(tickMineDrainage(state,1).results.length,0);
  assert.equal(state.buildings[2].waterStoredL,0);
  assert.equal(state.mineEnvironment[1].waterDepth,.4);
});
test("rail route requires two stations and returns output only after the cart reaches a terminal",()=>{
  const state=stateFixture();
  state.buildings=[
    {uid:"s1",type:"mineRailStation",layer:"mine",mineLevel:1,x:5,y:12},
    {uid:"s2",type:"mineRailStation",layer:"mine",mineLevel:1,x:15,y:12},
    {uid:"s3",type:"mineRailStation",layer:"mine",mineLevel:1,x:25,y:12},
    {uid:"miner",type:"minerIron",layer:"mine",mineLevel:1,x:15,y:12,status:"PAUSED_OUTPUT",output:{id:"ironOre",qty:2,meta:{quality:91,purity:90,synthetic:false}}}
  ];
  assert.deepEqual(mineRailStations(state,1).map(x=>x.uid),["s1","s2","s3"]);
  assert.equal(setMineRailEnabled(state,1,true).ok,true);
  let delivered=[];
  for(let i=0;i<80;i++){
    const tick=tickMineRailRoutes(state,.5);
    delivered.push(...tick.deliveries);
  }
  assert.ok(delivered.some(x=>x.buildingUID==="miner"));
  assert.equal(mineRailSummary(state,1).delivered>=1,true);
  assert.equal(state.buildings[3].mineRailReserved,true,"the runtime leaves custody settlement to the canonical factory inventory path");
});
test("route guidance avoids closed support cells and rejects unreachable deposits",()=>{
  const state=stateFixture(),infra=ensureMineInfrastructure(state);
  const route=mineRoutePath(1,{x:3,z:12},{x:10,z:12},infra.closures);
  assert.ok(route&&route.length>1);
  const section=nearestMineSupport(state,1,5,12).section;
  infra.closures["1:"+section.x+":"+section.z]=true;
  const detour=mineRoutePath(1,{x:3,z:12},{x:10,z:12},infra.closures);
  assert.ok(detour);
  assert.equal(detour.some(p=>p.x===section.x&&p.z===section.z),false);
  infra.closures["1:10:12"]=true;
  assert.equal(mineRoutePath(1,{x:3,z:12},{x:10,z:12},infra.closures),null);
});
test("ore vein decorations remain deterministic and do not mutate deposit quantities",()=>{
  const deposit={level:3,x:12,z:11,type:"coal",amount:240};
  const a=mineVeinSegments(deposit),b=mineVeinSegments(deposit);
  assert.deepEqual(a,b);
  assert.equal(a.length,5);
  assert.ok(a.every(segment=>segment.length>=8&&segment.width>0));
  assert.equal(deposit.amount,240);
});
