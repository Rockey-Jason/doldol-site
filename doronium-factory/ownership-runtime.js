/* Single-custody item ledger. Renderer-independent and transaction-idempotent. */
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
export const OWNER_TYPES=Object.freeze(["PLAYER_INVENTORY","WORLD_DROP","MACHINE_INPUT","MACHINE_OUTPUT","CONVEYOR","WAREHOUSE","SHIPMENT_CARGO","ACTIVE_JOB","COMPLETION_BUFFER","QUARANTINE"]);
const plainObject=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
const sameRequest=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validID(value){return typeof value==="string"&&value.trim().length>0}
function ensureState(state){
 if(!plainObject(state))throw new Error("invalid-ownership-state");
 state.version=2;
 if(!Number.isSafeInteger(state.nextLedgerID)||state.nextLedgerID<1)state.nextLedgerID=1;
 if(!Array.isArray(state.custody))state.custody=[];
 if(!plainObject(state.transactions))state.transactions={};
 if(!Array.isArray(state.consumed))state.consumed=[];
 return state;
}
function transactionReplay(state,transactionID,request){
 const prior=state.transactions[transactionID];
 if(!prior)return null;
 if(prior.status!=="COMMITTED"||!sameRequest(prior.request,request))return {conflict:true};
 return {...clone(prior.result),duplicate:true};
}
function saveTransaction(state,transactionID,request,result){
 state.transactions[transactionID]={status:"COMMITTED",request:clone(request),result:clone(result)};
 return clone(result);
}
export function createOwnershipState(){return {version:2,nextLedgerID:1,custody:[],transactions:{},consumed:[]};}
export function addCustody(state,{stackID,itemID,quantity,ownerType,ownerID,metadata={}}){
 const s=ensureState(state);
 if(!OWNER_TYPES.includes(ownerType)||!validID(stackID)||!validID(itemID)||!validID(ownerID)||!Number.isSafeInteger(quantity)||quantity<=0||!plainObject(metadata))throw new Error("invalid-custody");
 if(s.custody.some(x=>x.stackID===String(stackID)))throw new Error("stack-already-owned");
 const record={ledgerID:"OWN-"+s.nextLedgerID++,stackID:String(stackID),itemID:String(itemID),quantity,ownerType,ownerID:String(ownerID),metadata:clone(metadata)};
 s.custody.push(record);return clone(record);
}
export function splitCustody(state,{transactionID,stackID,quantity,newStackID}){
 const s=ensureState(state),tx=String(transactionID||"");
 if(!validID(tx)||!validID(stackID)||!validID(newStackID)||newStackID===stackID)return null;
 const request={type:"SPLIT",stackID:String(stackID),quantity,newStackID:String(newStackID)};
 const replay=transactionReplay(s,tx,request);
 if(replay)return replay.conflict?null:replay;
 if(!Number.isSafeInteger(quantity)||quantity<=0)return null;
 const source=s.custody.find(x=>x.stackID===String(stackID));
 if(!source||quantity>=source.quantity||s.custody.some(x=>x.stackID===String(newStackID)))return null;
 const newRecord=addCustody(s,{stackID:newStackID,itemID:source.itemID,quantity,ownerType:source.ownerType,ownerID:source.ownerID,metadata:source.metadata});
 source.quantity-=quantity;
 const result={sourceStackID:String(stackID),newStackID:String(newStackID),quantity,itemID:source.itemID,ownerType:source.ownerType,ownerID:source.ownerID,newLedgerID:newRecord.ledgerID};
 return saveTransaction(s,tx,request,result);
}
export function transferCustody(state,{transactionID,stackID,quantity,toType,toID,expectedFromType,expectedFromID}){
 const s=ensureState(state),tx=String(transactionID||"");
 if(!validID(tx)||!validID(stackID)||!validID(toID))return null;
 const request={type:"TRANSFER",stackID:String(stackID),quantity,toType,toID:String(toID),expectedFromType:expectedFromType||null,expectedFromID:expectedFromID==null?null:String(expectedFromID)};
 const replay=transactionReplay(s,tx,request);
 if(replay)return replay.conflict?null:replay;
 if(!OWNER_TYPES.includes(toType)||!Number.isSafeInteger(quantity)||quantity<=0)return null;
 const source=s.custody.find(x=>x.stackID===String(stackID));
 if(!source||source.quantity!==quantity)return null;
 if(expectedFromType&&source.ownerType!==expectedFromType)return null;
 if(expectedFromID&&source.ownerID!==String(expectedFromID))return null;
 const result={stackID:String(stackID),quantity,itemID:source.itemID,from:{type:source.ownerType,id:source.ownerID},to:{type:toType,id:String(toID)}};
 source.ownerType=toType;source.ownerID=String(toID);source.ledgerID="OWN-"+s.nextLedgerID++;
 return saveTransaction(s,tx,request,result);
}
export function consumeCustody(state,{transactionID,stackID,quantity,expectedOwnerType,expectedOwnerID,reason}){
 const s=ensureState(state),tx=String(transactionID||"");
 if(!validID(tx)||!validID(stackID)||!validID(expectedOwnerID))return null;
 const request={type:"CONSUME",stackID:String(stackID),quantity,expectedOwnerType,expectedOwnerID:String(expectedOwnerID),reason:String(reason||"consumed")};
 const replay=transactionReplay(s,tx,request);
 if(replay)return replay.conflict?null:replay;
 const source=s.custody.find(x=>x.stackID===String(stackID));
 if(!source||!Number.isSafeInteger(quantity)||quantity<=0||source.quantity!==quantity||source.ownerType!==expectedOwnerType||source.ownerID!==String(expectedOwnerID))return null;
 const result={stackID:String(stackID),itemID:source.itemID,quantity,reason:request.reason,owner:{type:source.ownerType,id:source.ownerID}};
 s.custody=s.custody.filter(x=>x!==source);
 s.consumed.push({...result,transactionID:tx});
 saveTransaction(s,tx,request,result);return clone(result);
}
function restoreOwnershipState(target,snapshot){
 target.version=snapshot.version;target.nextLedgerID=snapshot.nextLedgerID;
 target.custody=snapshot.custody;target.transactions=snapshot.transactions;target.consumed=snapshot.consumed;
}
export function completeProductionCustody(state,{transactionID,inputs=[],output}={}){
 const s=ensureState(state),tx=String(transactionID||"");
 if(!validID(tx)||!Array.isArray(inputs)||!plainObject(output))return null;
 const normalizedInputs=inputs.map(input=>({stackID:String(input?.stackID||""),quantity:Number(input?.quantity),expectedOwnerType:String(input?.expectedOwnerType||"ACTIVE_JOB"),expectedOwnerID:String(input?.expectedOwnerID||"")}));
 const normalizedOutput={stackID:String(output.stackID||""),itemID:String(output.itemID||""),quantity:Number(output.quantity),ownerType:String(output.ownerType||"MACHINE_OUTPUT"),ownerID:String(output.ownerID||""),metadata:plainObject(output.metadata)?clone(output.metadata):null};
 if(normalizedInputs.some(input=>!validID(input.stackID)||!Number.isSafeInteger(input.quantity)||input.quantity<=0||!OWNER_TYPES.includes(input.expectedOwnerType)||!validID(input.expectedOwnerID)))return null;
 if(new Set(normalizedInputs.map(input=>input.stackID)).size!==normalizedInputs.length)return null;
 if(!validID(normalizedOutput.stackID)||!validID(normalizedOutput.itemID)||!Number.isSafeInteger(normalizedOutput.quantity)||normalizedOutput.quantity<=0||!OWNER_TYPES.includes(normalizedOutput.ownerType)||!validID(normalizedOutput.ownerID)||!plainObject(normalizedOutput.metadata))return null;
 if(normalizedInputs.some(input=>input.stackID===normalizedOutput.stackID))return null;
 const request={type:"PRODUCTION_COMPLETE",inputs:normalizedInputs,output:normalizedOutput};
 const replay=transactionReplay(s,tx,request);if(replay)return replay.conflict?null:replay;
 const snapshot=clone(s);
 try{
  const consumed=[];
  for(let i=0;i<normalizedInputs.length;i++){
   const input=normalizedInputs[i];
   const result=consumeCustody(s,{transactionID:tx+":INPUT:"+i,stackID:input.stackID,quantity:input.quantity,expectedOwnerType:input.expectedOwnerType,expectedOwnerID:input.expectedOwnerID,reason:"production-input:"+tx});
   if(!result)throw new Error("production-input-custody-rejected:"+i);
   consumed.push(result);
  }
  const created=addCustody(s,{stackID:normalizedOutput.stackID,itemID:normalizedOutput.itemID,quantity:normalizedOutput.quantity,ownerType:normalizedOutput.ownerType,ownerID:normalizedOutput.ownerID,metadata:normalizedOutput.metadata});
  return saveTransaction(s,tx,request,{transactionID:tx,consumed,output:created});
 }catch{
  restoreOwnershipState(s,snapshot);return null;
 }
}

export function validateOwnershipState(input){
 const state=ensureState(input),errors=[],seenStacks=new Set(),seenLedgerIDs=new Set(),totals=new Map();
 let maxLedgerID=0;
 for(const x of state.custody){
  if(!validID(x?.stackID)||seenStacks.has(x.stackID))errors.push("duplicate-or-invalid-owner:"+x?.stackID);
  seenStacks.add(x?.stackID);
  if(!OWNER_TYPES.includes(x?.ownerType)||!validID(x?.ownerID)||!validID(x?.itemID)||!Number.isSafeInteger(x?.quantity)||x.quantity<=0||!validID(x?.ledgerID))errors.push("invalid-custody:"+x?.stackID);
  if(seenLedgerIDs.has(x?.ledgerID))errors.push("duplicate-ledger-id:"+x?.ledgerID);
  seenLedgerIDs.add(x?.ledgerID);
  const sequence=Number(String(x?.ledgerID||"").replace(/^OWN-/,""));
  if(Number.isSafeInteger(sequence))maxLedgerID=Math.max(maxLedgerID,sequence);
  const item=String(x?.itemID||"");totals.set(item,(totals.get(item)||0)+(Number(x?.quantity)||0));
 }
 if(!Number.isSafeInteger(state.nextLedgerID)||state.nextLedgerID<=maxLedgerID)errors.push("ledger-id-counter-not-advanced");
 const txIDs=new Set();
 for(const [id,tx] of Object.entries(state.transactions)){
  if(txIDs.has(id))errors.push("duplicate-transaction:"+id);txIDs.add(id);
  if(tx?.status!=="COMMITTED"||!plainObject(tx.request)||!plainObject(tx.result))errors.push("invalid-transaction:"+id);
 }
 const consumedTransactions=new Set();
 for(const entry of state.consumed){
  if(!validID(entry?.transactionID)||consumedTransactions.has(entry.transactionID))errors.push("duplicate-consumption-transaction:"+entry?.transactionID);
  consumedTransactions.add(entry?.transactionID);
  if(!validID(entry?.stackID)||!validID(entry?.itemID)||!Number.isSafeInteger(entry?.quantity)||entry.quantity<=0||!validID(entry?.reason))errors.push("invalid-consumption:"+entry?.transactionID);
  if(state.custody.some(x=>x.stackID===entry.stackID))errors.push("consumed-stack-still-owned:"+entry.stackID);
  const tx=state.transactions[entry.transactionID];
  if(!tx||tx.request?.type!=="CONSUME")errors.push("consumption-without-transaction:"+entry.transactionID);
 }
 return {valid:errors.length===0,errors,stackCount:seenStacks.size,itemTotals:Object.fromEntries(totals),transactionCount:Object.keys(state.transactions).length,consumedCount:state.consumed.length};
}
/* Snapshot rebuilds may replace custody records, but must not erase the
   transaction/consumption journal or rewind its monotonically increasing IDs. */
export function resetCustodySnapshot(state){
 const s=ensureState(state);s.custody=[];return s;
}
