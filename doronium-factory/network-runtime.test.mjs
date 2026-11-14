import test from "node:test";import assert from "node:assert/strict";
import {solvePowerNetworks,applyPowerBatteryChanges,transferFluid,validateFluidBalance} from "./network-runtime.js";
test("disconnected power networks never share generation",()=>{const r=solvePowerNetworks({nodes:[{id:"G1",type:"GENERATOR",generationKW:10},{id:"C1",type:"CONSUMER",demandKW:8,priority:1},{id:"C2",type:"CONSUMER",demandKW:8,priority:1}],edges:[{from:"G1",to:"C1"}]});assert.equal(r.length,2);assert.equal(r.find(x=>x.nodeIDs.includes("C2")).allocations[0].deliveredKW,0)});
test("power allocation honors priority and brownout threshold",()=>{const r=solvePowerNetworks({nodes:[{id:"G",type:"GENERATOR",generationKW:9},{id:"critical",type:"CONSUMER",demandKW:8,priority:10},{id:"normal",type:"CONSUMER",demandKW:8,priority:1}],edges:[{from:"G",to:"critical"},{from:"G",to:"normal"}]})[0];assert.equal(r.allocations[0].status,"RUNNING");assert.equal(r.allocations[1].status,"PAUSED_POWER")});
test("fluid transfer conserves volume and respects capacity and flow",()=>{const a={fluidType:"WATER",amountL:20},b={fluidType:"WATER",amountL:2,capacityL:10};const before=a.amountL+b.amountL;const r=transferFluid({source:a,target:b,requestedLiters:15,deltaSeconds:2,maxFlowLps:3});assert.equal(r.movedL,6);assert.equal(validateFluidBalance(before,a.amountL+b.amountL).valid,true);assert.equal(b.amountL,8)});
test("fluid type mismatch cannot silently mix",()=>{const a={fluidType:"OIL",amountL:10},b={fluidType:"WATER",amountL:2,capacityL:20};assert.equal(transferFluid({source:a,target:b,requestedLiters:5}).movedL,0);assert.equal(a.amountL,10)});

test("isolated battery supplies shortfall and only settles energy after simulation tick",()=>{
 const nodes=[{id:"G",type:"GENERATOR",generationKW:2},{id:"BAT",type:"BATTERY",energyKJ:100,capacityKJ:200,maxDischargeKW:3,maxChargeKW:4},{id:"C",type:"CONSUMER",demandKW:5,priority:10}];
 const results=solvePowerNetworks({nodes,edges:[{from:"G",to:"BAT"},{from:"BAT",to:"C"}],deltaSeconds:1});
 assert.equal(results[0].allocations[0].ratio,1);assert.equal(results[0].batteryChanges[0].dischargeKW,3);assert.equal(results[0].batteryChanges[0].afterKJ,97);assert.equal(nodes[1].energyKJ,100,"solver must be pure until settlement is explicitly applied");
});
test("surplus generator charges batteries within kW and kJ limits",()=>{
 const nodes=[{id:"G",type:"GENERATOR",generationKW:10},{id:"B",type:"BATTERY",energyKJ:20,capacityKJ:100,maxDischargeKW:5,maxChargeKW:3},{id:"C",type:"CONSUMER",demandKW:2,priority:1}];
 const result=solvePowerNetworks({nodes,edges:[{from:"G",to:"B"},{from:"B",to:"C"}],deltaSeconds:2})[0];
 assert.equal(result.batteryChanges[0].chargeKW,3);assert.equal(result.batteryChanges[0].afterKJ,26);
});
test("transformer throughput caps a connected grid and priority consumers receive power first",()=>{
 const nodes=[{id:"G",type:"GENERATOR",generationKW:20},{id:"T",type:"TRANSFORMER",maxThroughputKW:8},{id:"SAFE",type:"CONSUMER",demandKW:6,priority:100},{id:"IND",type:"CONSUMER",demandKW:8,priority:10}];
 const result=solvePowerNetworks({nodes,edges:[{from:"G",to:"T"},{from:"T",to:"SAFE"},{from:"T",to:"IND"}]})[0];
 assert.equal(result.availableKW,8);assert.equal(result.allocations[0].status,"RUNNING");assert.equal(result.allocations[1].deliveredKW,2);assert.equal(result.allocations[1].status,"PAUSED_POWER");
});


test("power network IDs remain stable when unrelated networks are added or input order changes",()=>{
 const nodes=[{id:"GEN-ALPHA",type:"GENERATOR",generationKW:12},{id:"LOAD-ALPHA",type:"CONSUMER",demandKW:8,priority:1}];
 const edges=[{id:"EDGE-ALPHA",from:"GEN-ALPHA",to:"LOAD-ALPHA"}];
 const initial=solvePowerNetworks({nodes,edges}).find(network=>network.nodeIDs.includes("GEN-ALPHA")).networkID;
 const expanded=solvePowerNetworks({nodes:[{id:"0-ISOLATED",type:"GENERATOR",generationKW:0},...nodes].reverse(),edges}).find(network=>network.nodeIDs.includes("GEN-ALPHA")).networkID;
 assert.equal(initial,"POWER-GEN-ALPHA");
 assert.equal(expanded,initial);
});

test("400kW battery charger stores exactly 40kJ during one 0.1-second tick",()=>{
 const nodes=[
  {id:"P-GEN",type:"GENERATOR",generationKW:800},
  {id:"P-CABLE-1",type:"CABLE"},
  {id:"P-CABLE-2",type:"CABLE"},
  {id:"P-SMELTER-1",type:"CONSUMER",demandKW:400,priority:20},
  {id:"P-BATTERY",type:"BATTERY",energyKJ:0,capacityKJ:120000,maxDischargeKW:800,maxChargeKW:400,priority:80},
  {id:"P-SMELTER-2",type:"CONSUMER",demandKW:400,priority:20}
 ];
 const edges=[
  {id:"P-GEN-CABLE-1",from:"P-GEN",to:"P-CABLE-1"},
  {id:"P-CABLE-1-CABLE-2",from:"P-CABLE-1",to:"P-CABLE-2"},
  {id:"P-CABLE-2-SMELTER",from:"P-CABLE-2",to:"P-SMELTER-1"},
  {id:"P-CABLE-1-BATTERY",from:"P-CABLE-1",to:"P-BATTERY"}
 ];
 const networks=solvePowerNetworks({nodes,edges,deltaSeconds:.1});
 const network=networks.find(item=>item.nodeIDs.includes("P-BATTERY"));
 assert.ok(network);
 assert.ok(network.nodeIDs.includes("P-GEN"));
 const change=network.batteryChanges.find(item=>item.id==="P-BATTERY");
 assert.equal(change.chargeKW,400);
 assert.equal(change.afterKJ,40);
 assert.equal(nodes.find(item=>item.id==="P-BATTERY").energyKJ,0,"the solver must not mutate live storage before settlement");
 const applied=applyPowerBatteryChanges(nodes,networks);
 assert.equal(applied.length,1);
 assert.equal(nodes.find(item=>item.id==="P-BATTERY").energyKJ,40);
});
