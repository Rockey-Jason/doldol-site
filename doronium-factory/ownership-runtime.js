/* Single-custody item ledger. Renderer-independent and transaction-idempotent. */
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const key=(type,id)=>String(type)+":"+String(id);
export const OWNER_TYPES=Object.freeze(["PLAYER_INVENTORY","WORLD_DROP","MACHINE_INPUT","MACHINE_OUTPUT","CONVEYOR","WAREHOUSE","ACTIVE_JOB","COMPLETION_BUFFER","QUARANTINE"]);
export function createOwnershipState(){return {version:1,nextLedgerID:1,custody:[],transactions:{},consumed:[]};}
export function addCustody(state,{stackID,itemID,quantity,ownerType,ownerID,metadata={}}){
 if(!OWNER_TYPES.includes(ownerType)||!stackID||!itemID||!Number.isSafeInteger(quantity)||quantity<=0)throw new Error("invalid-custody");
 if(state.custody.some(x=>x.stackID===stackID))throw new Error("stack-already-owned");
 const record={ledgerID:"OWN-"+state.nextLedgerID++,stackID:String(stackID),itemID:String(itemID),quantity,ownerType,ownerID:String(ownerID),metadata:clone(metadata)};
 state.custody.push(record);return clone(record);
}
export function transferCustody(state,{transactionID,stackID,quantity,toType,toID,expectedFromType,expectedFromID}){
 if(!transactionID)throw new Error("transaction-id-required");
 const prior=state.transactions[transactionID];if(prior)return prior.status==="COMMITTED"?{...clone(prior.result),duplicate:true}:null;
 if(!OWNER_TYPES.includes(toType)||!Number.isSafeInteger(quantity)||quantity<=0)throw new Error("invalid-transfer");
 const source=state.custody.find(x=>x.stackID===stackID);
 if(!source||source.quantity<quantity)return null;
 if(expectedFromType&&source.ownerType!==expectedFromType)return null;
 if(expectedFromID&&source.ownerID!==String(expectedFromID))return null;
 if(quantity!==source.quantity)throw new Error("partial-transfer-requires-stack-split");
 const result={stackID,quantity,itemID:source.itemID,from:{type:source.ownerType,id:source.ownerID},to:{type:toType,id:String(toID)}};
 source.ownerType=toType;source.ownerID=String(toID);source.ledgerID="OWN-"+state.nextLedgerID++;
 state.transactions[transactionID]={status:"COMMITTED",result:clone(result)};
 return result;
}
export function consumeCustody(state,{transactionID,stackID,quantity,expectedOwnerType,expectedOwnerID,reason}){
 if(!transactionID)throw new Error("transaction-id-required");
 if(state.transactions[transactionID])return state.transactions[transactionID].status==="COMMITTED"?{...clone(state.transactions[transactionID].result),duplicate:true}:null;
 const source=state.custody.find(x=>x.stackID===stackID);
 if(!source||source.quantity!==quantity||source.ownerType!==expectedOwnerType||source.ownerID!==String(expectedOwnerID))return null;
 const result={stackID,itemID:source.itemID,quantity,reason:String(reason||"consumed"),owner:{type:source.ownerType,id:source.ownerID}};
 state.custody=state.custody.filter(x=>x!==source);state.consumed.push({...result,transactionID});
 state.transactions[transactionID]={status:"COMMITTED",result:clone(result)};return result;
}
export function validateOwnershipState(state){
 const errors=[],seen=new Set(),totals=new Map();
 for(const x of state.custody||[]){
  if(seen.has(x.stackID))errors.push("duplicate-owner:"+x.stackID);seen.add(x.stackID);
  if(!OWNER_TYPES.includes(x.ownerType)||!Number.isSafeInteger(x.quantity)||x.quantity<=0)errors.push("invalid-custody:"+x.stackID);
  const k=x.itemID;totals.set(k,(totals.get(k)||0)+x.quantity);
 }
 const txIDs=new Set();for(const [id,tx] of Object.entries(state.transactions||{})){if(txIDs.has(id))errors.push("duplicate-transaction:"+id);txIDs.add(id);if(tx.status!=="COMMITTED")errors.push("unfinished-transaction:"+id)}
 return {valid:errors.length===0,errors,stackCount:seen.size,itemTotals:Object.fromEntries(totals)};
}
