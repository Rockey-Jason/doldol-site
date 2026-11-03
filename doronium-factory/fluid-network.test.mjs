import test from "node:test";
import assert from "node:assert/strict";
import {
  FLUID_IDS,createFluidState,validateFluidState,reserveFluid,releaseFluidReservation,
  commitFluidReservation,transferFluid
} from "./fluid-network.js";

function state(overrides={}) {
  return createFluidState({
    tanks:[
      {id:"source",nodeID:"a",fluidID:"FLUID_WATER",volumeL:100,capacityL:100,temperatureC:20,contamination:.01,pressureKPa:200},
      {id:"target",nodeID:"b",fluidID:null,volumeL:0,capacityL:100,temperatureC:20,contamination:0,pressureKPa:0}
    ],
    pipes:[{id:"pipe-1",fromNodeID:"a",toNodeID:"b",maxFlowLps:20,lossRatio:0,pressureDropKPa:10,bidirectional:true}],
    ...overrides
  });
}

test("fluid types are a separate registry rather than inventory ItemStacks",()=>{
  assert.deepEqual(FLUID_IDS,["FLUID_WATER","FLUID_OIL","FLUID_PETROLEUM","FLUID_COOLANT","FLUID_MOLTEN_METAL","FLUID_LAVA","FLUID_CHEMICAL"]);
  assert.equal(validateFluidState(state()).valid,true);
});

test("pipe transfer conserves fluid volume and records explicit transfer details",()=>{
  const s=state();
  const result=transferFluid(s,{sourceTankID:"source",targetTankID:"target",requestedL:15,dtSeconds:1});
  assert.equal(result.ok,true);
  assert.equal(s.tanks[0].volumeL,85);
  assert.equal(s.tanks[1].volumeL,15);
  assert.equal(s.tanks[0].volumeL+s.tanks[1].volumeL,100);
  assert.equal(result.event.leakedL,0);
  assert.equal(s.transferLedger.length,1);
});

test("explicit pipe loss is deducted from source and recorded, never silently lost",()=>{
  const s=state({pipes:[{id:"leaking",fromNodeID:"a",toNodeID:"b",maxFlowLps:20,lossRatio:.1,pressureDropKPa:0,bidirectional:true}]});
  const result=transferFluid(s,{sourceTankID:"source",targetTankID:"target",requestedL:9,dtSeconds:1});
  assert.equal(result.ok,true);
  assert.equal(result.event.sourceDrawL,10);
  assert.equal(result.event.deliveredL,9);
  assert.equal(result.event.leakedL,1);
  assert.ok(Math.abs(s.tanks.reduce((sum,t)=>sum+t.volumeL,0)+result.event.leakedL-100)<1e-9);
});

test("different fluids cannot mix in one tank",()=>{
  const s=state({tanks:[
    {id:"source",nodeID:"a",fluidID:"FLUID_OIL",volumeL:100,capacityL:100,temperatureC:80,contamination:0,pressureKPa:200},
    {id:"target",nodeID:"b",fluidID:"FLUID_WATER",volumeL:10,capacityL:100,temperatureC:20,contamination:0,pressureKPa:0}
  ]});
  assert.equal(transferFluid(s,{sourceTankID:"source",targetTankID:"target",requestedL:5,dtSeconds:1}).reason,"FLUID_TYPE_MISMATCH");
  assert.equal(s.tanks[0].volumeL,100);
  assert.equal(s.tanks[1].volumeL,10);
});

test("closed valve, check valve backflow and insufficient pressure block transfer",()=>{
  const closed=state({pipes:[{id:"p",fromNodeID:"a",toNodeID:"b",maxFlowLps:20,open:false}]});
  assert.equal(transferFluid(closed,{sourceTankID:"source",targetTankID:"target",requestedL:5,dtSeconds:1}).reason,"NO_OPEN_FLUID_PATH");
  const check=state({pipes:[{id:"p",fromNodeID:"a",toNodeID:"b",maxFlowLps:20,checkValve:true,bidirectional:true}]});
  check.tanks[0].nodeID="b";check.tanks[1].nodeID="a";
  assert.equal(transferFluid(check,{sourceTankID:"source",targetTankID:"target",requestedL:5,dtSeconds:1}).reason,"NO_OPEN_FLUID_PATH");
  const pressure=state({tanks:[
    {id:"source",nodeID:"a",fluidID:"FLUID_WATER",volumeL:100,capacityL:100,temperatureC:20,contamination:0,pressureKPa:5},
    {id:"target",nodeID:"b",fluidID:null,volumeL:0,capacityL:100,requiredPressureKPa:100}
  ]});
  assert.equal(transferFluid(pressure,{sourceTankID:"source",targetTankID:"target",requestedL:5,dtSeconds:1}).reason,"INSUFFICIENT_PRESSURE");
});

test("powered pump contributes only its configured pressure and flow capacity",()=>{
  const s=state({
    tanks:[
      {id:"source",nodeID:"a",fluidID:"FLUID_WATER",volumeL:100,capacityL:100,pressureKPa:0},
      {id:"target",nodeID:"b",fluidID:null,volumeL:0,capacityL:100,requiredPressureKPa:80}
    ],
    pipes:[{id:"p",fromNodeID:"a",toNodeID:"b",maxFlowLps:50,pressureDropKPa:10}],
    pumps:[{id:"pump",nodeID:"a",powered:true,pressureBoostKPa:100,maxFlowLps:3}]
  });
  const result=transferFluid(s,{sourceTankID:"source",targetTankID:"target",requestedL:10,dtSeconds:1});
  assert.equal(result.ok,true);
  assert.equal(result.event.pressureKPa,90);
  assert.equal(result.event.deliveredL,3);
});

test("reservations prevent overdraw and can be released or committed once",()=>{
  const s=state();
  const a=reserveFluid(s,"source",70,"machine-a");
  assert.equal(a.ok,true);
  assert.equal(reserveFluid(s,"source",31,"machine-b").reason,"INSUFFICIENT_FLUID");
  const committed=commitFluidReservation(s,a.reservationID);
  assert.equal(committed.ok,true);
  assert.equal(s.tanks[0].volumeL,30);
  assert.equal(commitFluidReservation(s,a.reservationID).reason,"RESERVATION_NOT_ACTIVE");
  const b=reserveFluid(s,"source",20,"machine-c");
  assert.equal(b.ok,true);
  assert.equal(releaseFluidReservation(s,b.reservationID),true);
  assert.equal(reserveFluid(s,"source",30,"machine-d").ok,true);
});

test("temperature and contamination are mass-weighted; contaminated target can reject",()=>{
  const s=state({tanks:[
    {id:"source",nodeID:"a",fluidID:"FLUID_WATER",volumeL:50,capacityL:50,temperatureC:80,contamination:.4,pressureKPa:200},
    {id:"target",nodeID:"b",fluidID:"FLUID_WATER",volumeL:50,capacityL:100,temperatureC:20,contamination:0,pressureKPa:0}
  ]});
  const result=transferFluid(s,{sourceTankID:"source",targetTankID:"target",requestedL:10,dtSeconds:1});
  assert.equal(result.ok,true);
  assert.equal(s.tanks[1].temperatureC,30);
  assert.ok(Math.abs(s.tanks[1].contamination-(.4*10/60))<1e-12);
  const overPressure=state({tanks:[
    {id:"source",nodeID:"a",fluidID:"FLUID_WATER",volumeL:50,capacityL:50,temperatureC:20,contamination:0,pressureKPa:200},
    {id:"target",nodeID:"b",fluidID:null,volumeL:0,capacityL:100,maxPressureKPa:100}
  ]});
  assert.equal(transferFluid(overPressure,{sourceTankID:"source",targetTankID:"target",requestedL:10,dtSeconds:1}).reason,"OVERPRESSURE");
  const rejected=state({tanks:[
    {id:"source",nodeID:"a",fluidID:"FLUID_WATER",volumeL:50,capacityL:50,temperatureC:20,contamination:.9,pressureKPa:200},
    {id:"target",nodeID:"b",fluidID:"FLUID_WATER",volumeL:50,capacityL:100,temperatureC:20,contamination:0,maxContamination:.1}
  ]});
  assert.equal(transferFluid(rejected,{sourceTankID:"source",targetTankID:"target",requestedL:10,dtSeconds:1}).reason,"CONTAMINATION_LIMIT");
  assert.equal(rejected.tanks[0].volumeL,50);
});

test("invalid fluid data fails closed without changing state",()=>{
  const s=state();
  s.tanks[0].volumeL=Infinity;
  const invalid=validateFluidState(s);
  assert.equal(invalid.valid,false);
  assert.equal(transferFluid(s,{sourceTankID:"source",targetTankID:"target",requestedL:1,dtSeconds:1}).ok,false);
});
