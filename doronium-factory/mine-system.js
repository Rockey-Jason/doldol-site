/* DORONIUM FACTORY — deterministic, independent mine instances. */
import {
  MINE_W, MINE_H, MINE_LEVELS, mineFloorY,
  mineTunnelAt as legacyMineTunnelAt,
  makeMineDeposits as makeLegacyMineDeposits
} from "./terrain-system.js";

export const MINE_ENTRANCES = Object.freeze([
  Object.freeze({ x:72, z:42, name:"중앙 본광산" }),
  Object.freeze({ x:30, z:64, name:"서부 습지광산" }),
  Object.freeze({ x:108, z:56, name:"동부 사막광산" }),
  Object.freeze({ x:160, z:91, name:"수정 고원광산" }),
  Object.freeze({ x:48, z:142, name:"남부 심층광산" })
]);

const LEVEL_POOLS = Object.freeze({
  1:["stone","copperOre","ironOre","leadOre","magnetite"],
  2:["ironOre","coal","quartz","nickelOre","aluminumOre","leadOre"],
  3:["quartz","goldOre","coal","chromiumOre","nickelOre"],
  4:["diamond","goldOre","titaniumOre","magnetite"],
  5:["goldOre","diamond","quartz","coal","neodymiumOre","diamondOre"]
});
const MINE_SPECIALTIES=["copperOre","ironOre","quartz","goldOre","diamond"];
const RARE_ORES=new Set(["diamond","diamondOre","titaniumOre","neodymiumOre","chromiumOre"]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const cellKey=(x,z)=>String(x)+","+String(z);
const cloneJSON=value=>value==null?value:JSON.parse(JSON.stringify(value));

function hashString(value){
  let hash=2166136261;
  for(let i=0;i<String(value).length;i++){
    hash^=String(value).charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}
function createRandom(seed){
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6D2B79F5)>>>0;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

export function mineIdFromEntrance(x,z){
  const ix=Math.round(Number(x)),iz=Math.round(Number(z));
  if(!Number.isFinite(ix)||!Number.isFinite(iz))return "";
  return "mine_"+ix+"_"+iz;
}
export function mineCellKey(x,z){return cellKey(Math.round(Number(x)),Math.round(Number(z)));}

function carve(tunnels,x,z){
  if(x<1||z<1||x>=MINE_W-1||z>=MINE_H-1)return;
  tunnels[cellKey(x,z)]=true;
}
function carveRoom(tunnels,cx,cz,radius=2){
  for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++)carve(tunnels,x,z);
}

function generateTunnels(seed,level){
  const random=createRandom((seed^(level*0x9e3779b9))>>>0);
  const tunnels={},centerline=new Array(MINE_W).fill(12);
  let z=12;
  carveRoom(tunnels,3,12,2);
  for(let x=3;x<=36;x++){
    const previous=z;
    if(x>=31){
      if(z<12)z++;else if(z>12)z--;
    }else if(x>=7&&x<=29){
      const roll=random();
      if(roll<.31)z--;
      else if(roll>.69)z++;
    }
    z=clamp(z,5,19);
    centerline[x]=z;
    const low=Math.min(previous,z)-1,high=Math.max(previous,z)+1;
    for(let lane=low;lane<=high;lane++)carve(tunnels,x,lane);
    for(let offset=-1;offset<=1;offset++)carve(tunnels,x,z+offset);
  }
  carveRoom(tunnels,36,12,2);

  const branchCount=2+Math.floor(random()*4);
  const branches=[];
  for(let branch=0;branch<branchCount;branch++){
    const startX=7+Math.floor(random()*25);
    const direction=random()<.5?-1:1;
    const length=3+Math.floor(random()*7);
    const startZ=centerline[startX]||12;
    let endZ=startZ;
    for(let step=1;step<=length;step++){
      endZ=clamp(startZ+direction*step,3,20);
      for(let offset=-1;offset<=1;offset++)carve(tunnels,startX+offset,endZ);
      carve(tunnels,startX,endZ);
    }
    carveRoom(tunnels,startX,endZ,1+Math.floor(random()*2));
    branches.push({x:startX,z:startZ,endZ,length,direction});
  }
  return {tunnels,centerline,branches};
}

function generateDeposits(mineID,level,seed,tunnels,mineIndex){
  const random=createRandom((seed^(level*0x85ebca6b)^0xc2b2ae35)>>>0);
  const pool=[...LEVEL_POOLS[level]];
  const specialty=MINE_SPECIALTIES[mineIndex%MINE_SPECIALTIES.length];
  if(!pool.includes(specialty))pool.push(specialty);
  const candidates=Object.keys(tunnels).map(key=>{
    const [x,z]=key.split(",").map(Number);
    return {x,z,key};
  }).filter(point=>point.x>=6&&point.x<=33&&point.z>=3&&point.z<=20);
  for(let i=candidates.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  const count=5+Math.floor(random()*4),deposits={};
  const placed=[];
  for(const point of candidates){
    if(placed.length>=count)break;
    if(placed.some(other=>Math.abs(other.x-point.x)+Math.abs(other.z-point.z)<5))continue;
    const type=pool[Math.floor(random()*pool.length)];
    const amount=RARE_ORES.has(type)?4+Math.floor(random()*10):15+Math.floor(random()*34);
    const floor=mineFloorY(level);
    const depthY=Number((floor+7+random()*23).toFixed(1));
    const depositSeed=Math.floor(random()*0xffffffff)>>>0;
    deposits[point.key]={
      mineId:mineID,level,x:point.x,z:point.z,type,amount,max:amount,
      cooldown:0,depthY,seed:depositSeed
    };
    placed.push(point);
  }
  return deposits;
}

function generateMineLevel(mineID,level,seed,mineIndex){
  const {tunnels,centerline,branches}=generateTunnels(seed,level);
  return {
    level,
    seed:(seed^(level*0x9e3779b9))>>>0,
    floorY:mineFloorY(level),
    tunnels,
    centerline,
    branches,
    deposits:generateDeposits(mineID,level,seed,tunnels,mineIndex)
  };
}

export function createMineRegistry(worldSeed=827142,entrances=MINE_ENTRANCES){
  const registry={};
  const seedBase=Number.isFinite(Number(worldSeed))?Number(worldSeed)>>>0:827142;
  entrances.forEach((entrance,index)=>{
    const x=Math.round(Number(entrance.x)),z=Math.round(Number(entrance.z));
    const id=mineIdFromEntrance(x,z);
    const seed=hashString(seedBase+":"+id);
    const mine={
      id,name:String(entrance.name||("광산 "+(index+1))),
      entrance:{x,z},seed,
      levels:{}
    };
    for(let level=1;level<=MINE_LEVELS;level++){
      mine.levels[String(level)]=generateMineLevel(id,level,seed,index);
    }
    registry[id]=mine;
  });
  return registry;
}

export function getMine(mineRegistry,mineID){
  return mineRegistry&&typeof mineRegistry==="object"?mineRegistry[mineID]||null:null;
}
export function getMineLevel(mineRegistry,mineID,level){
  const mine=getMine(mineRegistry,mineID);
  const index=clamp(Math.floor(Number(level)||1),1,MINE_LEVELS);
  return mine?.levels?.[String(index)]||null;
}
export function mineTunnelAt(levelState,x,z){
  const ix=Math.round(Number(x)),iz=Math.round(Number(z));
  if(!levelState||!Number.isInteger(ix)||!Number.isInteger(iz)||ix<0||iz<0||ix>=MINE_W||iz>=MINE_H)return false;
  return levelState.tunnels?.[cellKey(ix,iz)]===true;
}
export function findNearestMineID(x,z,mineRegistry){
  const mines=Object.values(mineRegistry||{});
  if(!mines.length)return mineIdFromEntrance(MINE_ENTRANCES[0].x,MINE_ENTRANCES[0].z);
  const px=Number(x),pz=Number(z);
  if(!Number.isFinite(px)||!Number.isFinite(pz))return mines[0].id;
  let best=mines[0],bestDistance=Infinity;
  for(const mine of mines){
    const dx=Number(mine.entrance?.x)-px,dz=Number(mine.entrance?.z)-pz;
    const distance=dx*dx+dz*dz;
    if(distance<bestDistance){best=mine;bestDistance=distance;}
  }
  return best.id;
}
export function resolvePlayerMineID(player,mineRegistry){
  if(player?.mineId&&mineRegistry?.[player.mineId])return player.mineId;
  const location=player?.surfacePosition;
  if(location&&Number.isFinite(Number(location.x))&&Number.isFinite(Number(location.y))){
    return findNearestMineID(Number(location.x),Number(location.y),mineRegistry);
  }
  const primary=mineIdFromEntrance(MINE_ENTRANCES[0].x,MINE_ENTRANCES[0].z);
  return mineRegistry?.[primary]?primary:Object.keys(mineRegistry||{})[0]||primary;
}

function normalizeStoredMine(baseMine,storedMine,id){
  if(!storedMine||typeof storedMine!=="object")return cloneJSON(baseMine);
  const result={
    ...cloneJSON(baseMine),
    ...cloneJSON(storedMine),
    id,
    entrance:cloneJSON(storedMine.entrance||baseMine.entrance),
    levels:{}
  };
  for(let level=1;level<=MINE_LEVELS;level++){
    const key=String(level),base=baseMine?.levels?.[key]||generateMineLevel(id,level,result.seed||baseMine.seed,0);
    const stored=storedMine.levels?.[key];
    if(!stored||typeof stored!=="object"){result.levels[key]=cloneJSON(base);continue;}
    result.levels[key]={
      ...cloneJSON(base),
      ...cloneJSON(stored),
      level,
      tunnels:{...cloneJSON(base.tunnels||{}),...(stored.tunnels&&typeof stored.tunnels==="object"?cloneJSON(stored.tunnels):{})},
      centerline:Array.isArray(stored.centerline)?stored.centerline.slice():base.centerline.slice(),
      branches:Array.isArray(stored.branches)?cloneJSON(stored.branches):cloneJSON(base.branches),
      deposits:{...cloneJSON(base.deposits||{}),...(stored.deposits&&typeof stored.deposits==="object"?cloneJSON(stored.deposits):{})}
    };
  }
  return result;
}

function parseLegacyDepositKey(key){
  const match=/^(\d+):(\d+):(\d+)$/.exec(String(key));
  if(!match)return null;
  return {level:Number(match[1]),x:Number(match[2]),z:Number(match[3])};
}

export function migrateMineRegistry({
  generatedMines,
  incomingMines,
  legacyDeposits,
  player,
  mergeLegacyDefaults=false
}={}){
  const registry=cloneJSON(generatedMines||createMineRegistry());
  if(incomingMines&&typeof incomingMines==="object"&&!Array.isArray(incomingMines)&&Object.keys(incomingMines).length){
    for(const [id,stored] of Object.entries(incomingMines)){
      if(registry[id])registry[id]=normalizeStoredMine(registry[id],stored,id);
      else if(stored&&typeof stored==="object"&&stored.entrance&&stored.levels){
        registry[id]=normalizeStoredMine(stored,stored,id);
      }
    }
    return registry;
  }
  if(!legacyDeposits||typeof legacyDeposits!=="object"||Array.isArray(legacyDeposits))return registry;

  const targetID=resolvePlayerMineID(player,registry);
  const target=registry[targetID];
  if(!target)return registry;
  const legacyDefaults=mergeLegacyDefaults?makeLegacyMineDeposits():{};
  for(let level=1;level<=MINE_LEVELS;level++){
    const levelState=target.levels[String(level)];
    levelState.deposits={};
    levelState.tunnels={};
    for(let z=0;z<MINE_H;z++)for(let x=0;x<MINE_W;x++){
      if(legacyMineTunnelAt(x,z))levelState.tunnels[cellKey(x,z)]=true;
    }
    if(mergeLegacyDefaults){
      for(const node of Object.values(legacyDefaults)){
        if(node.level!==level)continue;
        const key=cellKey(node.x,node.z);
        levelState.deposits[key]={...cloneJSON(node),mineId:targetID};
      }
    }
  }
  for(const [legacyKey,legacyNode] of Object.entries(legacyDeposits)){
    const coordinates=parseLegacyDepositKey(legacyKey);
    if(!coordinates||!legacyNode||typeof legacyNode!=="object")continue;
    const {level,x,z}=coordinates;
    if(level<1||level>MINE_LEVELS||x<0||z<0||x>=MINE_W||z>=MINE_H)continue;
    const levelState=target.levels[String(level)],key=cellKey(x,z);
    levelState.tunnels[key]=true;
    const fallback=levelState.deposits[key]||{};
    levelState.deposits[key]={
      ...fallback,
      ...cloneJSON(legacyNode),
      mineId:targetID,level,x,z,
      amount:Math.max(0,Number(legacyNode.amount)||0),
      max:Math.max(0,Number(legacyNode.max??legacyNode.amount)||0)
    };
  }
  target.legacyLayout=true;
  return registry;
}

export function validateMineRegistry(registry){
  const errors=[],ids=Object.keys(registry||{});
  if(!ids.length)errors.push("mine-registry-empty");
  for(const id of ids){
    const mine=registry[id];
    if(!mine||mine.id!==id||!mine.entrance)errors.push("mine-invalid:"+id);
    for(let level=1;level<=MINE_LEVELS;level++){
      const layer=mine?.levels?.[String(level)];
      if(!layer){errors.push("mine-level-missing:"+id+":"+level);continue;}
      if(!mineTunnelAt(layer,3,12))errors.push("mine-entry-not-walkable:"+id+":"+level);
      if(!mineTunnelAt(layer,36,12))errors.push("mine-descend-not-walkable:"+id+":"+level);
      const keys=Object.keys(layer.tunnels||{});
      if(!keys.length)errors.push("mine-tunnels-empty:"+id+":"+level);
      const start=cellKey(3,12),visited=new Set([start]),queue=[[3,12]];
      for(let head=0;head<queue.length;head++){
        const [x,z]=queue[head];
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const nx=x+dx,nz=z+dz,key=cellKey(nx,nz);
          if(!visited.has(key)&&mineTunnelAt(layer,nx,nz)){visited.add(key);queue.push([nx,nz]);}
        }
      }
      if(!visited.has(cellKey(36,12)))errors.push("mine-level-disconnected:"+id+":"+level);
      for(const [key,deposit] of Object.entries(layer.deposits||{})){
        const [x,z]=key.split(",").map(Number);
        if(!Number.isInteger(x)||!Number.isInteger(z)||deposit.x!==x||deposit.z!==z||
          deposit.level!==level||deposit.mineId!==id||!mineTunnelAt(layer,x,z)||
          !Number.isFinite(Number(deposit.amount))||Number(deposit.amount)<0||
          !Number.isFinite(Number(deposit.max))||Number(deposit.max)<Number(deposit.amount)){
          errors.push("mine-deposit-invalid:"+id+":"+level+":"+key);
        }
      }
    }
  }
  return {valid:errors.length===0,errors,mineCount:ids.length};
}
