/* Footprint-aware construction escrow and portable blueprint validation. */
import {reserveItemBatch,releaseItemReservation,commitItemReservations} from "./simulation-core.js";
const clone=v=>typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));
const cellKey=(x,y)=>String(x)+","+String(y);
function rotateOffset(x,y,width,height,rotation){
 const r=((Math.floor(Number(rotation)||0)%4)+4)%4;
 if(r===0)return {x,y};
 if(r===1)return {x:height-1-y,y:x};
 if(r===2)return {x:width-1-x,y:height-1-y};
 return {x:y,y:width-1-x};
}
export function footprintCells({x,y,width=1,height=1,rotation=0}={}){
 const w=Math.max(1,Math.floor(Number(width)||1)),h=Math.max(1,Math.floor(Number(height)||1)),out=[];
 for(let cy=0;cy<h;cy++)for(let cx=0;cx<w;cx++){const p=rotateOffset(cx,cy,w,h,rotation);out.push({x:Math.floor(Number(x)||0)+p.x,y:Math.floor(Number(y)||0)+p.y})}
 return out;
}
export function validateConstructionFootprint({x,y,width=1,height=1,rotation=0,worldWidth,worldHeight,occupied=[],heightAt=()=>0,maxSlope=Infinity,requiresFlat=false,foundation=()=>true,ports=[],requiredPorts=[]}={}){
 const errors=[],cells=footprintCells({x,y,width,height,rotation}),occupiedSet=new Set((occupied||[]).map(p=>cellKey(p.x,p.y)));
 const heights=[];
 for(const cell of cells){
  if(!Number.isInteger(cell.x)||!Number.isInteger(cell.y)||cell.x<0||cell.y<0||cell.x>=worldWidth||cell.y>=worldHeight){errors.push("OUT_OF_BOUNDS:"+cellKey(cell.x,cell.y));continue}
  if(occupiedSet.has(cellKey(cell.x,cell.y)))errors.push("OCCUPIED:"+cellKey(cell.x,cell.y));
  const h=Number(heightAt(cell.x,cell.y));if(!Number.isFinite(h))errors.push("INVALID_TERRAIN_HEIGHT:"+cellKey(cell.x,cell.y));else heights.push(h);
  if(requiresFlat&&!foundation(cell.x,cell.y))errors.push("FOUNDATION_REQUIRED:"+cellKey(cell.x,cell.y));
 }
 const slope=heights.length?Math.max(...heights)-Math.min(...heights):Infinity;
 if(requiresFlat&&slope>Math.max(0,Number(maxSlope)||0))errors.push("SLOPE_TOO_STEEP");
 const portSet=new Set(ports||[]);for(const port of requiredPorts||[])if(!portSet.has(port))errors.push("MISSING_PORT:"+port);
 return {valid:errors.length===0,errors,cells,slope};
}
function moneyReserved(state){return Object.values(state.moneyReservations||{}).reduce((n,x)=>n+Math.max(0,Number(x.amount)||0),0)}
export function beginConstruction(state,{transactionID,buildingType,x,y,width=1,height=1,rotation=0,moneyCost=0,materials={},ownerID="player",worldWidth,worldHeight,occupied=[],heightAt=()=>0,maxSlope=Infinity,requiresFlat=false,foundation=()=>true,ports=[],requiredPorts=[]}={}){
 if(!state||!transactionID||!buildingType)return {ok:false,reason:"INVALID_CONSTRUCTION_REQUEST"};
 state.constructionLedger??={};state.moneyReservations??={};
 if(state.constructionLedger[transactionID])return {ok:false,reason:"DUPLICATE_TRANSACTION"};
 const cost=Math.max(0,Math.floor(Number(moneyCost)||0));
 if(Math.floor(Number(state.money)||0)-moneyReserved(state)<cost)return {ok:false,reason:"INSUFFICIENT_MONEY"};
 const footprint=validateConstructionFootprint({x,y,width,height,rotation,worldWidth,worldHeight,occupied,heightAt,maxSlope,requiresFlat,foundation,ports,requiredPorts});
 if(!footprint.valid)return {ok:false,reason:"INVALID_FOOTPRINT",errors:footprint.errors};
 const reservationIDs=reserveItemBatch(state,materials,"BUILD:"+transactionID);
 if(!reservationIDs)return {ok:false,reason:"INSUFFICIENT_MATERIALS"};
 state.moneyReservations[transactionID]={amount:cost,ownerID:String(ownerID)};
 state.constructionLedger[transactionID]={transactionID,buildingType:String(buildingType),ownerID:String(ownerID),x:Math.floor(Number(x)||0),y:Math.floor(Number(y)||0),width,height,rotation:((Math.floor(Number(rotation)||0)%4)+4)%4,moneyCost:cost,materials:{...materials},reservationIDs,status:"RESERVED",cells:footprint.cells,createdTick:Math.max(0,Number(state.tick)||0)};
 return {ok:true,transaction:clone(state.constructionLedger[transactionID])};
}
function replaceState(target,snapshot){for(const key of Object.keys(target))delete target[key];Object.assign(target,clone(snapshot))}
export function commitConstruction(state,transactionID,install){
 const tx=state?.constructionLedger?.[transactionID];if(!tx||tx.status!=="RESERVED"||typeof install!=="function")return {ok:false,reason:"INVALID_TRANSACTION"};
 const snapshot=clone(state);
 try{
  if(Math.floor(Number(state.money)||0)<tx.moneyCost)return {ok:false,reason:"MONEY_CHANGED"};
  const consumed=tx.reservationIDs?.length?commitItemReservations(state,tx.reservationIDs):[];
  if(!consumed)return {ok:false,reason:"MATERIAL_RESERVATION_LOST"};
  const consumedCount=consumed.reduce((n,x)=>n+x.quantity,0),requiredCount=Object.values(tx.materials).reduce((n,x)=>n+Math.max(0,Math.floor(Number(x)||0)),0);
  if(consumedCount!==requiredCount)throw new Error("MATERIAL_COUNT_MISMATCH");
  state.money=Math.floor(Number(state.money)||0)-tx.moneyCost;
  const result=install(state,clone(tx));
  if(result===false)throw new Error("INSTALL_REJECTED");
  tx.status="COMMITTED";tx.committedTick=Math.max(0,Number(state.tick)||0);tx.result=clone(result??null);
  delete state.moneyReservations[transactionID];
  return {ok:true,result:clone(result??null),consumed};
 }catch(error){replaceState(state,snapshot);return {ok:false,reason:String(error?.message||"COMMIT_FAILED")}}
}
export function cancelConstruction(state,transactionID){
 const tx=state?.constructionLedger?.[transactionID];if(!tx||tx.status!=="RESERVED")return false;
 for(const id of tx.reservationIDs||[])releaseItemReservation(state,id);
 tx.status="CANCELLED";tx.cancelledTick=Math.max(0,Number(state.tick)||0);delete state.moneyReservations[transactionID];return true;
}
export function createBlueprint(buildings=[],{name="Blueprint"}={}){
 const selected=(buildings||[]).filter(Boolean);if(!selected.length)return {version:1,name:String(name),buildings:[]};
 const minX=Math.min(...selected.map(b=>Number(b.x)||0)),minY=Math.min(...selected.map(b=>Number(b.y)||0));
 return {version:1,name:String(name).slice(0,80),createdAt:null,buildings:selected.map(b=>({type:String(b.type),dx:(Number(b.x)||0)-minX,dy:(Number(b.y)||0)-minY,dir:((Number(b.dir)||0)%4+4)%4,variant:b.variant||null,footprint:{width:Math.max(1,Number(b.footprint?.width)||1),height:Math.max(1,Number(b.footprint?.height)||1)}}))};
}
export function rotateBlueprint(blueprint,rotation=1){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.buildings))return null;
 const r=((Math.floor(Number(rotation)||0)%4)+4)%4;
 const width=Math.max(1,...blueprint.buildings.map(b=>(Number(b.dx)||0)+Math.max(1,Number(b.footprint?.width)||1)));
 const height=Math.max(1,...blueprint.buildings.map(b=>(Number(b.dy)||0)+Math.max(1,Number(b.footprint?.height)||1)));
 return {...clone(blueprint),buildings:blueprint.buildings.map(b=>{
  const bw=Math.max(1,Number(b.footprint?.width)||1),bh=Math.max(1,Number(b.footprint?.height)||1),cells=[];
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)cells.push(rotateOffset((Number(b.dx)||0)+x,(Number(b.dy)||0)+y,width,height,r));
  const minX=Math.min(...cells.map(p=>p.x)),minY=Math.min(...cells.map(p=>p.y)),maxX=Math.max(...cells.map(p=>p.x)),maxY=Math.max(...cells.map(p=>p.y));
  return {...b,dx:minX,dy:minY,dir:((Number(b.dir)||0)+r)%4,footprint:{width:maxX-minX+1,height:maxY-minY+1}};
 })};
}
export function validateBlueprintPlacement(blueprint,{x,y,worldWidth,worldHeight,occupied=[],heightAt=()=>0,foundation=()=>true,maxSlope=Infinity,requiresFlat=false}={}){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.buildings)||!blueprint.buildings.length)return {valid:false,errors:["INVALID_BLUEPRINT"]};
 const occupiedSet=new Set((occupied||[]).map(p=>cellKey(p.x,p.y))),errors=[],placements=[];
 for(const b of blueprint.buildings){
  const px=Math.floor(Number(x)||0)+(Number(b.dx)||0),py=Math.floor(Number(y)||0)+(Number(b.dy)||0),w=b.footprint?.width||1,h=b.footprint?.height||1;
  const result=validateConstructionFootprint({x:px,y:py,width:w,height:h,worldWidth,worldHeight,occupied:[...occupiedSet].map(v=>{const[a,b]=v.split(",").map(Number);return{x:a,y:b}}),heightAt,maxSlope,requiresFlat,foundation});
  if(!result.valid)errors.push(...result.errors.map(e=>String(b.type)+":"+e));
  for(const p of result.cells)occupiedSet.add(cellKey(p.x,p.y));
  placements.push({...clone(b),x:px,y:py});
 }
 return {valid:errors.length===0,errors,placements};
}

export function duplicateBlueprint(blueprint,{newID,name}={}){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.buildings)||!newID)return null;
 return {...clone(blueprint),id:String(newID),name:String(name||((blueprint.name||"Blueprint")+" Copy")).slice(0,80),createdAt:null};
}
export function beginBlueprintConstruction(state,{transactionID,blueprint,x,y,rotation=0,buildingCatalog={},ownerID="player",worldWidth,worldHeight,occupied=[],heightAt=()=>0,foundation=()=>true,maxSlope=Infinity,isUnlocked=()=>true,canPlaceType=()=>true}={}){
 if(!state||!transactionID||!blueprint||blueprint.version!==1||!Array.isArray(blueprint.buildings)||!blueprint.buildings.length)return {ok:false,reason:"INVALID_BLUEPRINT_REQUEST"};
 state.constructionLedger??={};state.moneyReservations??={};
 if(state.constructionLedger[transactionID])return {ok:false,reason:"DUPLICATE_TRANSACTION"};
 const rotated=rotation?rotateBlueprint(blueprint,rotation):clone(blueprint);
 if(!rotated)return {ok:false,reason:"INVALID_BLUEPRINT"};
 const occupiedSet=new Set((occupied||[]).map(p=>cellKey(p.x,p.y))),planned=new Set(),placements=[],materials={},occupiedCells=[];
 let moneyCost=0;
 for(const item of rotated.buildings){
  const def=buildingCatalog[item.type];if(!def)return {ok:false,reason:"UNKNOWN_BUILDING:"+item.type};
  if(!isUnlocked(item.type,def))return {ok:false,reason:"BUILDING_LOCKED:"+item.type};
  const px=Math.floor(Number(x)||0)+(Number(item.dx)||0),py=Math.floor(Number(y)||0)+(Number(item.dy)||0);
  if(!canPlaceType(item.type,px,py,def))return {ok:false,reason:"SPECIAL_PLACEMENT_RULE:"+item.type};
  const footprint=item.footprint||def.footprint||{width:1,height:1};
  const requiresFlat=def.requiresFlat!==false;
  const result=validateConstructionFootprint({x:px,y:py,width:footprint.width,height:footprint.height,worldWidth,worldHeight,occupied:[...(occupiedSet),...planned].map(v=>{const[a,b]=String(v).split(",").map(Number);return{x:a,y:b}}),heightAt,maxSlope:requiresFlat?maxSlope:Infinity,requiresFlat,foundation});
  if(!result.valid)return {ok:false,reason:"INVALID_BLUEPRINT_FOOTPRINT",buildingType:item.type,errors:result.errors};
  for(const p of result.cells){const k=cellKey(p.x,p.y);planned.add(k);occupiedCells.push(p)}
  const cost=Math.max(0,Math.floor(Number(def.moneyCost)||0));moneyCost+=cost;
  for(const[id,qty]of Object.entries(def.materials||{}))materials[id]=(materials[id]||0)+Math.max(0,Math.floor(Number(qty)||0));
  placements.push({...clone(item),x:px,y:py,footprint:{...footprint},moneyCost:cost,materials:{...def.materials}});
 }
 if(Math.floor(Number(state.money)||0)-moneyReserved(state)<moneyCost)return {ok:false,reason:"INSUFFICIENT_MONEY"};
 const reservationIDs=reserveItemBatch(state,materials,"BLUEPRINT:"+transactionID);
 if(!reservationIDs)return {ok:false,reason:"INSUFFICIENT_MATERIALS"};
 state.moneyReservations[transactionID]={amount:moneyCost,ownerID:String(ownerID)};
 state.constructionLedger[transactionID]={transactionID,buildingType:"BLUEPRINT",ownerID:String(ownerID),x:Math.floor(Number(x)||0),y:Math.floor(Number(y)||0),rotation,moneyCost,materials,reservationIDs,status:"RESERVED",cells:occupiedCells,placements,createdTick:Math.max(0,Number(state.tick)||0)};
 return {ok:true,transaction:clone(state.constructionLedger[transactionID])};
}
