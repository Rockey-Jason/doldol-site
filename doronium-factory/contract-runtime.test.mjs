import test from "node:test";import assert from "node:assert/strict";
import {createRuntimeState,addItemStack,stackTotals} from "./simulation-core.js";
import {createContractState,PACKAGING_STAGES,startContractShipment,advancePackagingStage,dispatchContractShipment,advanceShipments,claimContractReward,cancelContractShipment} from "./contract-runtime.js";
import {createOwnershipState,addCustody,validateOwnershipState} from "./ownership-runtime.js";
const contract={id:"IRON-25",itemID:"ironPlate",quantity:2,minQuality:90,minPurity:90,forbidSynthetic:true,reward:500,deadlineSeconds:600,transitSeconds:30,insuranceRate:.75};
function setUp(){const game={tick:0,seconds:100,money:100,runtime:createRuntimeState(),inventory:{}};addItemStack(game,"ironPlate",2,{quality:95,purity:96,synthetic:false});for(const[id,n]of Object.entries({wood:6,ironPlate:6,wire:2,circuit:3,quartz:4}))addItemStack(game,id,n,{quality:95,purity:95});return {game,contracts:createContractState(123)}}
function seedShipmentCustody(game,shipment){
 const reservation=game.runtime.reservations[shipment.reservationID];
 assert.ok(reservation,"shipment reservation must exist before custody seeding");
 const ledger=createOwnershipState();
 for(const allocation of reservation.allocations){
  const stack=game.runtime.itemStacks.find(item=>item.runtimeID===allocation.stackID);
  assert.ok(stack,"every reserved stack must still exist before dispatch");
  addCustody(ledger,{
   stackID:String(allocation.stackID)+"@"+String(reservation.reservationID),
   itemID:stack.itemID,quantity:allocation.quantity,ownerType:"ACTIVE_JOB",
   ownerID:String(reservation.ownerID),
   metadata:{quality:stack.quality,purity:stack.purity,synthetic:stack.synthetic}
  });
 }
 game.ownershipLedger=ledger;
 return ledger;
}
test("contract reserves only stacks that individually satisfy quality, purity and synthetic policy",()=>{const {game,contracts}=setUp();const before=stackTotals(game);const r=startContractShipment(game,contracts,contract);assert.equal(r.ok,true);assert.equal(stackTotals(game).ironPlate,before.ironPlate);const low={tick:0,runtime:createRuntimeState(),inventory:{}};addItemStack(low,"ironPlate",2,{quality:89,purity:99,synthetic:false});assert.equal(startContractShipment(low,createContractState(),contract).reason,"NO_QUALIFIED_CARGO")});
test("five packaging phases consume materials once and move cargo to dispatch-ready state",()=>{const {game,contracts}=setUp();startContractShipment(game,contracts,contract);const s=contracts.shipments[0];assert.equal(PACKAGING_STAGES.length,5);for(let i=0;i<5;i++)assert.equal(advancePackagingStage(game,contracts,s.shipmentID).ok,true);assert.equal(s.packageStage,5);assert.equal(s.status,"READY");assert.equal(advancePackagingStage(game,contracts,s.shipmentID).ok,false);assert.ok(s.protection>.8)});
test("dispatch commits reserved cargo and creates a single in-transit manifest",()=>{const {game,contracts}=setUp();startContractShipment(game,contracts,contract);const s=contracts.shipments[0];for(let i=0;i<5;i++)advancePackagingStage(game,contracts,s.shipmentID);assert.equal(dispatchContractShipment(game,contracts,s.shipmentID).ok,true);assert.equal(s.status,"IN_TRANSIT");assert.equal(stackTotals(game).ironPlate,3);assert.equal(dispatchContractShipment(game,contracts,s.shipmentID).ok,false);assert.equal(s.cargo.reduce((n,x)=>n+x.quantity,0),2)});
test("delivery consumes shipment custody before an idempotent reward claim",()=>{const {game,contracts}=setUp();startContractShipment(game,contracts,{...contract,deadlineSeconds:900,routeRisk:0});const s=contracts.shipments[0];for(let i=0;i<5;i++)advancePackagingStage(game,contracts,s.shipmentID);seedShipmentCustody(game,s);assert.equal(dispatchContractShipment(game,contracts,s.shipmentID).ok,true);game.seconds+=30;const results=advanceShipments(game,contracts,30);assert.equal(results.length,1);assert.equal(s.status,"DELIVERED");assert.equal(s.cargoSettled,true);assert.equal(game.ownershipLedger.consumed.reduce((n,x)=>n+x.quantity,0),2);assert.equal(game.ownershipLedger.custody.length,0);assert.equal(validateOwnershipState(game.ownershipLedger).valid,true);assert.equal(advanceShipments(game,contracts,30).length,0);const a=claimContractReward(game,contracts,s.shipmentID);const money=game.money;const b=claimContractReward(game,contracts,s.shipmentID);assert.equal(a.reward,500);assert.equal(b.duplicate,true);assert.equal(game.money,money)});
test("cancel before dispatch releases cargo reservations",()=>{const {game,contracts}=setUp();startContractShipment(game,contracts,contract);const s=contracts.shipments[0];assert.equal(cancelContractShipment(game,contracts,s.shipmentID),true);assert.equal(cancelContractShipment(game,contracts,s.shipmentID),false);assert.equal(stackTotals(game).ironPlate,8)});

test("dispatch rejects corrupted cargo reservation before consuming the reserved stack",()=>{
 const {game,contracts}=setUp(),cargoContract={...contract,id:"CARGO_GUARD",minQuality:80,minPurity:80};
 const started=startContractShipment(game,contracts,cargoContract);assert.equal(started.ok,true);
 const shipment=contracts.shipments[0];for(let i=0;i<5;i++)assert.equal(advancePackagingStage(game,contracts,shipment.shipmentID).ok,true);
 const reservation=game.runtime.reservations[shipment.reservationID];reservation.allocations[0].quantity=1;
 const before=stackTotals(game).ironPlate;
 const result=dispatchContractShipment(game,contracts,shipment.shipmentID);
 assert.equal(result.ok,false);assert.equal(result.reason,"CARGO_ALLOCATION_MISMATCH");
 assert.equal(stackTotals(game).ironPlate,before);
 assert.equal(shipment.status,"READY");
});

test("dispatch custody failure rolls back the reservation, source inventory and ledger",()=>{
 const {game,contracts}=setUp();startContractShipment(game,contracts,contract);const shipment=contracts.shipments[0];
 for(let i=0;i<5;i++)advancePackagingStage(game,contracts,shipment.shipmentID);
 const ledger=seedShipmentCustody(game,shipment);ledger.custody[0].ownerID="wrong-owner";
 const before={runtime:structuredClone(game.runtime),inventory:structuredClone(game.inventory),ledger:structuredClone(game.ownershipLedger)};
 const result=dispatchContractShipment(game,contracts,shipment.shipmentID);
 assert.equal(result.ok,false);assert.equal(result.reason,"CUSTODY_TRANSFER_FAILED");
 assert.deepEqual(game.runtime,before.runtime);assert.deepEqual(game.inventory,before.inventory);assert.deepEqual(game.ownershipLedger,before.ledger);
 assert.equal(shipment.status,"READY");assert.ok(game.runtime.reservations[shipment.reservationID]);
 assert.equal(validateOwnershipState(game.ownershipLedger).valid,true);
});

test("failed shipment transfers its cargo to an explicit world-drop owner",()=>{
 const {game,contracts}=setUp();startContractShipment(game,contracts,{...contract,id:"FAILED-IRON"}, {routeRisk:1});
 const shipment=contracts.shipments[0];for(let i=0;i<5;i++)advancePackagingStage(game,contracts,shipment.shipmentID);
 seedShipmentCustody(game,shipment);assert.equal(dispatchContractShipment(game,contracts,shipment.shipmentID).ok,true);
 shipment.protection=0;contracts.randomState=1;game.seconds+=30;
 const results=advanceShipments(game,contracts,30);
 assert.equal(results.length,1);assert.equal(shipment.status,"FAILED");assert.equal(shipment.cargoSettled,true);
 assert.equal(game.worldDrops.length,1);assert.equal(game.worldDrops[0].quantity,2);
 const owner=game.ownershipLedger.custody.find(x=>x.stackID===game.worldDrops[0].custodyStackID);
 assert.equal(owner.ownerType,"WORLD_DROP");assert.equal(owner.ownerID,game.worldDrops[0].dropID);
 assert.equal(owner.quantity,2);assert.equal(validateOwnershipState(game.ownershipLedger).valid,true);
});
