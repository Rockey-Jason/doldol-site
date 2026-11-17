import { transferCustody } from "./ownership-runtime.js?v=6";
const clone = value => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
function restoreObject(target, snapshot) { for (const key of Object.keys(target)) delete target[key]; Object.assign(target, clone(snapshot)); }
function restoreStock(warehouse, existed, stock) { if (!existed) delete warehouse.warehouseStock; else warehouse.warehouseStock = clone(stock); }
function isWarehouse(warehouse) { return !!warehouse && ["storage","warehouse"].includes(String(warehouse.type)) && typeof warehouse.uid === "string" && warehouse.uid.trim().length > 0; }
export function storeWarehouseStack({ledger,warehouse,stackID,itemID,quantity,metadata={},transactionID,expectedFromType,expectedFromID,storedTick=0}={}) {
 const id=String(stackID||""),item=String(itemID||""),tx=String(transactionID||""),qty=Number(quantity);
 if(!ledger||!isWarehouse(warehouse)||!id||!item||!tx||!Number.isSafeInteger(qty)||qty<=0||!expectedFromType||!expectedFromID||!metadata||typeof metadata!=="object"||Array.isArray(metadata))return null;
 const hadStock=Array.isArray(warehouse.warehouseStock),stockBefore=hadStock?clone(warehouse.warehouseStock):[];
 if(stockBefore.some(entry=>String(entry?.stackID||"")===id))return null;
 const ledgerBefore=clone(ledger);
 try{
  const moved=transferCustody(ledger,{transactionID:tx,stackID:id,quantity:qty,toType:"WAREHOUSE",toID:String(warehouse.uid),expectedFromType,expectedFromID:String(expectedFromID)});
  if(!moved||moved.duplicate)throw new Error("warehouse-transfer-rejected");
  warehouse.warehouseStock=[...stockBefore,{stackID:id,itemID:item,quantity:qty,meta:clone(metadata),storedTick:Math.max(0,Math.floor(Number(storedTick)||0))}];
  return {ok:true,stackID:id,itemID:item,quantity:qty,warehouseID:String(warehouse.uid),transactionID:tx};
 }catch{restoreObject(ledger,ledgerBefore);restoreStock(warehouse,hadStock,stockBefore);return null}
}
export function withdrawWarehouseStack({ledger,warehouse,stackID,transactionID,toID="player"}={}) {
 const id=String(stackID||""),tx=String(transactionID||""),destinationID=String(toID||"");
 if(!ledger||!isWarehouse(warehouse)||!id||!tx||!destinationID||!Array.isArray(warehouse.warehouseStock))return null;
 const stockBefore=clone(warehouse.warehouseStock),index=stockBefore.findIndex(entry=>String(entry?.stackID||"")===id);
 if(index<0)return null;
 const entry=stockBefore[index],itemID=String(entry?.itemID||""),quantity=Number(entry?.quantity);
 if(!itemID||!Number.isSafeInteger(quantity)||quantity<=0||!entry.meta||typeof entry.meta!=="object"||Array.isArray(entry.meta))return null;
 const ledgerBefore=clone(ledger);
 try{
  const moved=transferCustody(ledger,{transactionID:tx,stackID:id,quantity,toType:"PLAYER_INVENTORY",toID:destinationID,expectedFromType:"WAREHOUSE",expectedFromID:String(warehouse.uid)});
  if(!moved||moved.duplicate)throw new Error("warehouse-withdraw-rejected");
  warehouse.warehouseStock=stockBefore.filter((_,currentIndex)=>currentIndex!==index);
  return {ok:true,stackID:id,itemID,quantity,metadata:clone(entry.meta),warehouseID:String(warehouse.uid),transactionID:tx};
 }catch{restoreObject(ledger,ledgerBefore);warehouse.warehouseStock=stockBefore;return null}
}
