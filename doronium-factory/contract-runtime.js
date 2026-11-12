/* Five-step package, qualified cargo reservation and idempotent delivery settlement. */
import {reserveQualifiedItemStacks,reserveItemBatch,releaseItemReservation,commitItemReservations,syncLegacyInventory} from "./simulation-core.js";
import {transferCustody,consumeCustody,validateOwnershipState} from "./ownership-runtime.js";
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
export const PACKAGING_STAGES=Object.freeze([
 {id:"CUSHION",name:"완충재",inputs:{wood:2},protection:.08},
 {id:"BOX",name:"산업용 상자",inputs:{wood:4},protection:.12},
 {id:"TRANSPORT_CONTAINER",name:"운송 컨테이너",inputs:{ironPlate:3},protection:.22},
 {id:"SECURITY",name:"보안 봉인",inputs:{wire:2,circuit:1},protection:.18},
 {id:"INFINITY_ISOLATION",name:"인피니티 격리",inputs:{quartz:4,circuit:2},protection:.3}
]);
export function createContractState(seed=0x4c4f4749){return {version:1,nextShipmentID:1,randomState:(Number(seed)>>>0)||0x4c4f4749,shipments:[],claims:{},events:[]}}
function random(state){let x=state.randomState>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;state.randomState=x>>>0;return state.randomState/4294967296}
function record(state,event){state.events.push({...event});if(state.events.length>256)state.events.splice(0,state.events.length-256)}
export function startContractShipment(gameState,contractState,contract,{routeRisk=0,insured=true,nowSeconds=gameState.seconds||0}={}){
 if(!contract?.id||!contract.itemID||!Number.isSafeInteger(contract.quantity)||contract.quantity<=0)return {ok:false,reason:"INVALID_CONTRACT"};
 if(contractState.shipments.some(s=>s.contractID===contract.id&&["PACKAGING","READY","IN_TRANSIT"].includes(s.status)))return {ok:false,reason:"CONTRACT_ALREADY_ACTIVE"};
 const risk=Number(routeRisk);if(!Number.isFinite(risk)||risk<0||risk>1)return {ok:false,reason:"INVALID_ROUTE_RISK"};
 const predicate=stack=>Number(stack.quality)>=Number(contract.minQuality??0)&&Number(stack.purity)>=Number(contract.minPurity??0)&&(!contract.forbidSynthetic||!stack.synthetic);
 const reservationID=reserveQualifiedItemStacks(gameState,contract.itemID,contract.quantity,"SHIPMENT:"+contract.id,predicate);
 if(!reservationID)return {ok:false,reason:"NO_QUALIFIED_CARGO"};
 const shipmentID="SHIP-"+String(contractState.nextShipmentID++).padStart(8,"0");
 const shipment={shipmentID,contractID:String(contract.id),itemID:String(contract.itemID),quantity:contract.quantity,reservationID,status:"PACKAGING",packageStage:0,protection:0,routeRisk:risk,insured:!!insured,startedAt:Number(nowSeconds)||0,deadlineAt:(Number(nowSeconds)||0)+Math.max(0,Number(contract.deadlineSeconds)||0),transitSeconds:Math.max(1,Number(contract.transitSeconds)||60),reward:Math.max(0,Math.floor(Number(contract.reward)||0)),insuranceRate:clamp(contract.insuranceRate??.75,0,1),minQuality:Number(contract.minQuality)||0,minPurity:Number(contract.minPurity)||0,forbidSynthetic:!!contract.forbidSynthetic,cargo:null,paid:false};
 contractState.shipments.push(shipment);record(contractState,{eventID:"SHIPMENT_START:"+shipmentID,type:"STARTED",shipmentID,tick:Number(gameState.tick)||0});
 return {ok:true,shipment:clone(shipment)};
}
export function advancePackagingStage(gameState,contractState,shipmentID){
 const shipment=contractState.shipments.find(s=>s.shipmentID===shipmentID);
 if(!shipment||shipment.status!=="PACKAGING")return {ok:false,reason:"NOT_PACKAGING"};
 if(shipment.packageStage>=PACKAGING_STAGES.length)return {ok:false,reason:"PACKAGING_COMPLETE"};
 const stage=PACKAGING_STAGES[shipment.packageStage],claimID="PACKAGE:"+shipmentID+":"+stage.id;
 if(contractState.claims[claimID])return {ok:false,reason:"STAGE_ALREADY_CLAIMED"};
 const reservations=reserveItemBatch(gameState,stage.inputs,"PACKAGE:"+shipmentID+":"+stage.id);
 if(!reservations)return {ok:false,reason:"PACKAGING_MATERIALS_MISSING"};
 const consumed=commitItemReservations(gameState,reservations);
 if(!consumed){for(const id of reservations)releaseItemReservation(gameState,id);return {ok:false,reason:"PACKAGING_COMMIT_FAILED"}}
 syncLegacyInventory(gameState);
 contractState.claims[claimID]={claimedAt:Number(gameState.seconds)||0};
 shipment.protection=clamp(shipment.protection+stage.protection,0,.95);
 shipment.packageStage++;record(contractState,{eventID:claimID,type:"PACKAGED",shipmentID,stage:stage.id});
 if(shipment.packageStage===PACKAGING_STAGES.length)shipment.status="READY";
 return {ok:true,stage:stage.id,complete:shipment.status==="READY",protection:shipment.protection};
}
function shipmentCargoCustodyValid(gameState,shipment){
 if(shipment?.custodyVersion!==1)return true;
 try{
  const ledger=gameState?.ownershipLedger;
  if(!ledger||!validateOwnershipState(ledger).valid)return false;
  const cargo=Array.isArray(shipment.cargo)?shipment.cargo:[];
  if(!cargo.length)return false;
  return cargo.every(stack=>{
   const stackID=String(stack?.custodyStackID||"");
   const record=ledger.custody.find(entry=>entry.stackID===stackID);
   return !!record&&record.itemID===stack.itemID&&record.quantity===stack.quantity&&record.ownerType==="SHIPMENT_CARGO"&&record.ownerID===String(shipment.shipmentID);
  });
 }catch{return false}
}
export function dispatchContractShipment(gameState,contractState,shipmentID){
 const shipment=contractState.shipments.find(s=>s.shipmentID===shipmentID);
 if(!shipment||shipment.status!=="READY")return {ok:false,reason:"NOT_READY"};
 const reservation=gameState.runtime?.reservations?.[shipment.reservationID];
 if(!reservation||reservation.status!=="reserved"||reservation.itemID!==shipment.itemID||reservation.quantity!==shipment.quantity)return {ok:false,reason:"CARGO_RESERVATION_MISMATCH"};
 if(String(reservation.ownerID)!=="SHIPMENT:"+String(shipment.contractID))return {ok:false,reason:"CARGO_RESERVATION_OWNER_MISMATCH"};
 const stackByID=new Map((gameState.runtime?.itemStacks||[]).map(stack=>[String(stack.runtimeID),stack]));
 const allocations=Array.isArray(reservation.allocations)?reservation.allocations:[];
 const allocationIDs=new Set();
 let reservedQuantity=0;
 for(const allocation of allocations){
  const stack=stackByID.get(String(allocation.stackID));
  if(!stack||stack.itemID!==shipment.itemID||!Number.isSafeInteger(allocation.quantity)||allocation.quantity<=0||stack.quantity<allocation.quantity||allocationIDs.has(String(allocation.stackID)))return {ok:false,reason:"CARGO_ALLOCATION_MISMATCH"};
  allocationIDs.add(String(allocation.stackID));reservedQuantity+=allocation.quantity;
 }
 if(!allocations.length||reservedQuantity!==shipment.quantity)return {ok:false,reason:"CARGO_ALLOCATION_MISMATCH"};
 const ledger=gameState.ownershipLedger;
 if(!ledger||!validateOwnershipState(ledger).valid)return {ok:false,reason:"CUSTODY_LEDGER_INVALID"};
 const ledgerSnapshot=clone(ledger),runtimeSnapshot=clone(gameState.runtime);
 const inventorySnapshot=clone(gameState.inventory||{}),metaSnapshot=clone(gameState.meta||{});
 const shipmentSnapshot=clone(shipment),eventsSnapshot=clone(contractState.events||[]);
 try{
  const custodyIDs=[];
  for(let i=0;i<allocations.length;i++){
   const allocation=allocations[i],custodyStackID=String(allocation.stackID)+"@"+String(reservation.reservationID);
   const moved=transferCustody(ledger,{
    transactionID:"SHIPMENT_DISPATCH:"+String(shipmentID)+":"+i,
    stackID:custodyStackID,quantity:allocation.quantity,
    toType:"SHIPMENT_CARGO",toID:String(shipmentID),
    expectedFromType:"ACTIVE_JOB",expectedFromID:String(reservation.ownerID)
   });
   if(!moved||moved.duplicate)throw new Error("CUSTODY_TRANSFER_FAILED");
   custodyIDs.push(custodyStackID);
  }
  const removed=commitItemReservations(gameState,[shipment.reservationID]);
  if(!removed||removed.length!==allocations.length)throw new Error("CARGO_RESERVATION_COMMIT_FAILED");
  const removedByID=new Map(removed.map(stack=>[String(stack.runtimeID),stack]));
  const cargo=allocations.map((allocation,index)=>{
   const stack=removedByID.get(String(allocation.stackID));
   if(!stack||stack.itemID!==shipment.itemID||stack.quantity!==allocation.quantity)throw new Error("CARGO_COMMIT_QUANTITY_MISMATCH");
   return {...stack,quantity:allocation.quantity,custodyStackID:custodyIDs[index]};
  });
  if(cargo.reduce((total,stack)=>total+stack.quantity,0)!==shipment.quantity)throw new Error("CARGO_COMMIT_QUANTITY_MISMATCH");
  syncLegacyInventory(gameState);
  shipment.cargo=cargo;shipment.reservationID=null;shipment.status="IN_TRANSIT";
  shipment.dispatchedAt=Number(gameState.seconds)||0;shipment.custodyVersion=1;shipment.cargoSettled=false;
  if(!validateOwnershipState(ledger).valid)throw new Error("CUSTODY_LEDGER_INVALID_AFTER_DISPATCH");
  record(contractState,{eventID:"DISPATCH:"+shipmentID,type:"DISPATCHED",shipmentID,quantity:shipment.quantity});
  return {ok:true,shipment:clone(shipment)};
 }catch(error){
  gameState.runtime=runtimeSnapshot;gameState.inventory=inventorySnapshot;gameState.meta=metaSnapshot;
  gameState.ownershipLedger=ledgerSnapshot;
  for(const key of Object.keys(shipment))delete shipment[key];
  Object.assign(shipment,shipmentSnapshot);
  contractState.events=eventsSnapshot;
  return {ok:false,reason:String(error?.message||"CUSTODY_TRANSFER_FAILED")};
 }
}
export function advanceShipments(gameState,contractState,deltaSeconds){
 const dt=Math.max(0,Number(deltaSeconds)||0),results=[];
 for(const shipment of contractState.shipments){
  if(shipment.status!=="IN_TRANSIT")continue;
  const previousElapsed=Math.max(0,Number(shipment.transitElapsed)||0),nextElapsed=previousElapsed+dt;
  if(nextElapsed<shipment.transitSeconds){shipment.transitElapsed=nextElapsed;continue}
  if(shipment.custodyVersion===1&&!shipmentCargoCustodyValid(gameState,shipment))continue;
  const previousRandomState=contractState.randomState;
  const ledgerSnapshot=shipment.custodyVersion===1?clone(gameState.ownershipLedger):null;
  const hadWorldDrops=Array.isArray(gameState.worldDrops),worldDropsSnapshot=hadWorldDrops?clone(gameState.worldDrops):null;
  const shipmentSnapshot=clone(shipment),eventsSnapshot=clone(contractState.events||[]);
  try{
   const lateness=Math.max(0,(Number(gameState.seconds)||0)-shipment.deadlineAt);
   const damaged=random(contractState)<clamp(shipment.routeRisk*.45*(1-shipment.protection),0,.95);
   const qualityLoss=damaged?Math.max(1,shipment.routeRisk*18*(1-shipment.protection)):0;
   const purityLoss=damaged?Math.max(1,shipment.routeRisk*12*(1-shipment.protection)):0;
   const total=shipment.cargo.reduce((n,s)=>n+s.quantity,0);
   let weightedQuality=0,weightedPurity=0,synthetic=false;
   for(const stack of shipment.cargo){weightedQuality+=stack.quality*stack.quantity;weightedPurity+=stack.purity*stack.quantity;synthetic=synthetic||!!stack.synthetic}
   const quality=total?weightedQuality/total-qualityLoss:0,purity=total?weightedPurity/total-purityLoss:0;
   const qualifies=(!shipment.forbidSynthetic||!synthetic)&&quality>=shipment.minQuality&&purity>=shipment.minPurity;
   if(shipment.custodyVersion===1&&!shipment.cargoSettled){
    if(qualifies){
     for(let i=0;i<shipment.cargo.length;i++){
      const stack=shipment.cargo[i];
      const consumed=consumeCustody(gameState.ownershipLedger,{
       transactionID:"SHIPMENT_DELIVERED:"+String(shipment.shipmentID)+":"+i,
       stackID:String(stack.custodyStackID),quantity:stack.quantity,
       expectedOwnerType:"SHIPMENT_CARGO",expectedOwnerID:String(shipment.shipmentID),
       reason:"contract-delivery:"+String(shipment.contractID)
      });
      if(!consumed||consumed.duplicate)throw new Error("SHIPMENT_DELIVERY_CUSTODY_FAILED");
     }
    }else{
     gameState.worldDrops??=[];
     for(let i=0;i<shipment.cargo.length;i++){
      const stack=shipment.cargo[i],dropID="WORLD_DROP:"+String(shipment.shipmentID)+":"+i;
      if(gameState.worldDrops.some(drop=>drop.dropID===dropID))throw new Error("SHIPMENT_WORLD_DROP_DUPLICATE");
      const moved=transferCustody(gameState.ownershipLedger,{
       transactionID:"SHIPMENT_FAILED_DROP:"+String(shipment.shipmentID)+":"+i,
       stackID:String(stack.custodyStackID),quantity:stack.quantity,
       toType:"WORLD_DROP",toID:dropID,
       expectedFromType:"SHIPMENT_CARGO",expectedFromID:String(shipment.shipmentID)
      });
      if(!moved||moved.duplicate)throw new Error("SHIPMENT_WORLD_DROP_CUSTODY_FAILED");
      gameState.worldDrops.push({
       dropID,custodyStackID:String(stack.custodyStackID),itemID:String(stack.itemID),
       quantity:stack.quantity,quality:Number(stack.quality)||0,purity:Number(stack.purity)||0,
       synthetic:stack.synthetic===true,x:Number(gameState.player?.x)||0,y:Number(gameState.player?.y)||0,
       layer:gameState.player?.layer==="mine"?"mine":"surface",mineLevel:gameState.player?.layer==="mine"?Math.max(1,Math.floor(Number(gameState.player.mineLevel)||1)):null,
       createdAt:Number(gameState.seconds)||0,source:"FAILED_SHIPMENT"
      });
     }
    }
    shipment.cargoSettled=true;
   }
   shipment.transitElapsed=nextElapsed;shipment.deliveredAt=Number(gameState.seconds)||0;
   shipment.finalQuality=clamp(quality,0,100);shipment.finalPurity=clamp(purity,0,100);
   shipment.damaged=damaged;shipment.late=lateness>0;shipment.status=qualifies?"DELIVERED":"FAILED";
   shipment.settlement=shipment.status==="DELIVERED"?shipment.reward:(shipment.insured?Math.floor(shipment.reward*shipment.insuranceRate):0);
   record(contractState,{eventID:"ARRIVAL:"+shipment.shipmentID,type:shipment.status,shipmentID:shipment.shipmentID,damaged,late:shipment.late,quality:shipment.finalQuality,purity:shipment.finalPurity,settlement:shipment.settlement});
   results.push(clone(shipment));
  }catch(error){
   if(ledgerSnapshot)gameState.ownershipLedger=ledgerSnapshot;
   if(hadWorldDrops)gameState.worldDrops=worldDropsSnapshot;else delete gameState.worldDrops;
   for(const key of Object.keys(shipment))delete shipment[key];
   Object.assign(shipment,shipmentSnapshot);
   contractState.events=eventsSnapshot;contractState.randomState=previousRandomState;
   continue;
  }
 }
 return results;
}
export function claimContractReward(gameState,contractState,shipmentID){
 const shipment=contractState.shipments.find(s=>s.shipmentID===shipmentID);
 if(!shipment||!["DELIVERED","FAILED"].includes(shipment.status))return {ok:false,reason:"NOT_SETTLED"};
 const claimID="CONTRACT_REWARD:"+shipmentID;
 if(contractState.claims[claimID])return {ok:true,duplicate:true,reward:contractState.claims[claimID].reward};
 const reward=Math.max(0,Math.floor(Number(shipment.settlement)||0));
 gameState.money=Math.max(0,Math.floor(Number(gameState.money)||0))+reward;
 contractState.claims[claimID]={reward,claimedAt:Number(gameState.seconds)||0};
 shipment.paid=true;record(contractState,{eventID:claimID,type:"REWARD_CLAIMED",shipmentID,reward});
 return {ok:true,duplicate:false,reward};
}
export function cancelContractShipment(gameState,contractState,shipmentID){
 const shipment=contractState.shipments.find(s=>s.shipmentID===shipmentID);
 if(!shipment||!["PACKAGING","READY"].includes(shipment.status))return false;
 if(shipment.reservationID)releaseItemReservation(gameState,shipment.reservationID);
 shipment.status="CANCELLED";shipment.reservationID=null;shipment.cancelledAt=Number(gameState.seconds)||0;
 record(contractState,{eventID:"CANCEL:"+shipmentID,type:"CANCELLED",shipmentID});return true;
}
