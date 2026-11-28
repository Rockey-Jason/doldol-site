/* DORONIUM FACTORY — world generation and geology */
export const WORLD_W = 192;
export const WORLD_H = 160;
export const MINE_W = 40;
export const MINE_H = 24;
export const MINE_LEVELS = 5;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

export function biomeAt(x,z){
  // Keep the original western continent intact for existing exploration routes.
  const westernRidge=Math.hypot((x-91)*.88,z-27);
  if(x<128){
    if(z<13 || (westernRidge<21 && z<36)) return "frost";
    if(westernRidge<30) return "highlands";
    if(x>91 && z>55) return "desert";
    if(x<34 && z>56) return "wetland";
    if(x<52 && z<57) return "forest";
    if(x>77 && z>32 && z<70) return "crystal";
    if(x>45 && x<79 && z<37) return "volcanic";
    return "meadow";
  }
  // A second continent with its own mountain chain, wetlands and volcanic basin.
  const easternRidge=Math.hypot((x-153)*.82,z-31);
  if(x>143 && z<24) return "frost";
  if(easternRidge<31) return "highlands";
  if(x>176 && z>64) return "desert";
  if(x>=151 && x<=176 && z>=90 && z<132) return "crystal";
  if(x>=128 && x<151 && z>=104 && z<128) return "volcanic";
  if(x>=128 && x<151 && z>=128) return "forest";
  if(x>=128 && x<151 && z>=65 && z<104) return "wetland";
  return "meadow";
}

/* Named resource regions are overlays on the original biome map. */
export function regionAt(x,z){
  if(x>=166&&x<=184&&z>=68&&z<=91)return "oilField";
  if(x>=31&&x<=47&&z>=28&&z<=46)return "doriForest";
  if(x>=84&&x<=105&&z>=44&&z<=68)return "doroniumForest";
  if(x>=44&&x<=80&&z>=6&&z<=39)return "lava";
  if(x>=2&&x<=33&&z>=2&&z<=23)return "cold";
  if(x>=39&&x<=83&&z>=40&&z<=68)return "denseForest";
  return biomeAt(x,z);
}

export function terrainHeightAt(x,z){
  const wave=Math.sin(x*.105+z*.036)*5.5+Math.cos(z*.12-x*.025)*4.5+Math.sin((x+z)*.047)*5;
  const westCenter=91+Math.sin(z*.09)*7;
  const eastCenter=153+Math.sin(z*.045)*11;
  const southCenter=137+Math.sin(x*.035)*9;
  const westernRidge=Math.exp(-Math.pow((x-westCenter)/31,2))*Math.exp(-Math.pow((z-26)/51,2));
  const easternRidge=Math.exp(-Math.pow((x-eastCenter)/27,2))*Math.exp(-Math.pow((z-30)/55,2));
  const southernRidge=Math.exp(-Math.pow((z-southCenter)/28,2))*Math.exp(-Math.pow((x-158)/60,2));

  // Soft biome-shaped landforms keep adjacent block heights traversable.
  const desert=smooth(168,180,x)*smooth(58,76,z);
  const westWetland=Math.exp(-Math.pow((x-18)/20,2))*Math.exp(-Math.pow((z-76)/28,2));
  const eastWetland=Math.exp(-Math.pow((x-139)/18,2))*Math.exp(-Math.pow((z-84)/25,2));
  const westForest=Math.exp(-Math.pow((x-29)/24,2))*Math.exp(-Math.pow((z-26)/35,2));
  const eastForest=Math.exp(-Math.pow((x-139)/20,2))*Math.exp(-Math.pow((z-143)/24,2));
  const westCrystal=Math.exp(-Math.pow((x-95)/22,2))*Math.exp(-Math.pow((z-51)/28,2));
  const eastCrystal=Math.exp(-Math.pow((x-164)/17,2))*Math.exp(-Math.pow((z-111)/27,2));
  const volcano=(cx,cz)=>{
    const d2=(x-cx)*(x-cx)+(z-cz)*(z-cz);
    return Math.exp(-d2/700)*44-Math.exp(-d2/80)*24;
  };
  const relief=westernRidge*60+easternRidge*95+southernRidge*38;
  const landforms=desert*(6+Math.sin(x*.17+z*.08)*4)
    -(westWetland+eastWetland)*9
    +(westForest+eastForest)*3
    +(westCrystal+eastCrystal)*14
    +volcano(62,24)+volcano(139,116);
  // Keep the heightfield continuous. Quantized 3m steps made the entire planet
  // read like stacked cubes even when viewed through a perspective camera.
  const fineRelief = Math.sin(x*.235+Math.sin(z*.071)*1.8)*1.35
    + Math.cos(z*.265-x*.083)*.95
    + Math.sin((x-z)*.19)*.55;
  // Broad rolling foothills and finer erosion-like ridges break up the grid
  // while keeping the generated heightfield continuous and traversable.
  const foothills=(Math.sin(x*.052+z*.031)*Math.cos(z*.047-x*.022)
    +Math.sin((x+z)*.083)*.42)*5.2;
  const ridgeNoise=(Math.sin(x*.19+Math.cos(z*.11)*1.4)
    +Math.cos(z*.21+Math.sin(x*.08)*1.2))*.85;
  return Number((wave+relief+landforms+fineRelief+foothills+ridgeNoise).toFixed(2));
}

export function mineFloorY(level){return -42*clamp(Number(level)||1,1,MINE_LEVELS);}
export function mineDepositKey(level,x,z){return level+":"+x+":"+z;}

export const MINE_ENTRANCES=Object.freeze([
  Object.freeze({id:"mine_72_42",x:72,y:42,name:"중앙 광산",geology:"granite"}),
  Object.freeze({id:"mine_30_64",x:30,y:64,name:"서부 광산",geology:"iron"}),
  Object.freeze({id:"mine_108_56",x:108,y:56,name:"수정 고원 광산",geology:"crystal"}),
  Object.freeze({id:"mine_160_91",x:160,y:91,name:"동부 광산",geology:"basalt"}),
  Object.freeze({id:"mine_48_142",x:48,y:142,name:"남부 광산",geology:"copper"})
]);
export const PRIMARY_MINE_ID=MINE_ENTRANCES[0].id;
const TUNNEL_PROFILES=[
  Object.freeze({offsets:[0,0,0],north:[5,6,4],south:[18,18,20]}),
  Object.freeze({offsets:[1,-2,2],north:[6,5,5],south:[19,19,18]}),
  Object.freeze({offsets:[-2,2,-1],north:[4,7,6],south:[17,20,19]}),
  Object.freeze({offsets:[2,1,-2],north:[7,4,7],south:[20,17,20]}),
  Object.freeze({offsets:[-1,-1,1],north:[5,8,4],south:[18,16,20]})
];
const BASE_MINE_ROWS=[
  [1,8,12,"stone",48,-18],[1,10,7,"copperOre",30,-26],[1,12,15,"ironOre",28,-34],
  [1,19,12,"stone",52,-20],[1,22,8,"copperOre",32,-29],[1,31,12,"ironOre",34,-36],
  [2,7,12,"ironOre",42,-60],[2,12,7,"coal",44,-66],[2,22,15,"quartz",22,-74],[2,32,12,"coal",48,-70],
  [3,8,12,"quartz",35,-102],[3,20,8,"goldOre",20,-108],[3,22,15,"coal",42,-116],[3,32,12,"goldOre",25,-112],
  [4,12,12,"diamond",8,-144],[4,22,8,"goldOre",32,-150],[4,32,12,"diamond",10,-158],
  [5,8,12,"goldOre",18,-186],[5,12,7,"diamond",8,-192],[5,22,15,"quartz",8,-198],
  [5,25,8,"coal",6,-204],[5,31,12,"diamond",3,-202],[5,34,17,"goldOre",6,-188],
  [1,5,12,"leadOre",22,-22],[1,15,12,"magnetite",18,-30],
  [2,8,16,"nickelOre",26,-72],[2,17,12,"aluminumOre",18,-76],[2,31,12,"leadOre",28,-68],
  [3,12,12,"chromiumOre",20,-110],[3,30,12,"nickelOre",25,-118],
  [4,8,12,"titaniumOre",13,-146],[4,30,12,"magnetite",20,-160],
  [5,15,12,"neodymiumOre",9,-194],[5,34,12,"diamondOre",5,-208]
];
const hash32=value=>{
  const text=String(value);let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);}
  return hash>>>0;
};
export function mineInstanceId(x,z){return "mine_"+Math.round(Number(x)||0)+"_"+Math.round(Number(z)||0);}
export function mineEntranceAt(x,z){return MINE_ENTRANCES.find(entry=>entry.x===Math.round(Number(x))&&entry.y===Math.round(Number(z)))||null;}
export function nearestMineInstanceId(x,z){
  const px=Number(x)||0,pz=Number(z)||0;
  let best=MINE_ENTRANCES[0],bestDistance=Infinity;
  for(const entry of MINE_ENTRANCES){
    const distance=(entry.x-px)**2+(entry.y-pz)**2;
    if(distance<bestDistance||(distance===bestDistance&&entry.id<best.id)){best=entry;bestDistance=distance;}
  }
  return best.id;
}
function tunnelProfile(mineId){
  const index=MINE_ENTRANCES.findIndex(entry=>entry.id===mineId);
  if(index>=0)return TUNNEL_PROFILES[index];
  const seed=hash32(mineId);
  return {offsets:[(seed%5)-2,((seed>>>7)%5)-2,((seed>>>14)%5)-2],north:[5,6,4],south:[18,18,20]};
}
export function mineTunnelAt(x,z,mineId=PRIMARY_MINE_ID){
  const cx=Math.floor(Number(x)),cz=Math.floor(Number(z));
  if(!Number.isFinite(cx)||!Number.isFinite(cz)||cx<0||cz<0||cx>=MINE_W||cz>=MINE_H)return false;
  // Preserve the original mine's exact tunnel footprint for existing saves.
  if(mineId===PRIMARY_MINE_ID){
    return (cx>=2&&cx<=37&&cz>=10&&cz<=14) ||
      (cx>=8&&cx<=13&&cz>=5&&cz<=18) ||
      (cx>=19&&cx<=24&&cz>=6&&cz<=18) ||
      (cx>=29&&cx<=36&&cz>=4&&cz<=20) ||
      (cx>=3&&cx<=6&&cz>=8&&cz<=16);
  }
  const profile=tunnelProfile(mineId);
  if(cx>=2&&cx<=37&&cz>=10&&cz<=14)return true;
  const bases=[8,20,31];
  for(let index=0;index<bases.length;index++){
    const shaftX=clamp(bases[index]+profile.offsets[index],5,35);
    const north=profile.north[index],south=profile.south[index];
    if(cx>=shaftX-2&&cx<=shaftX+2&&cz>=north&&cz<=south)return true;
    // Small lateral galleries form mine-specific side chambers.
    const chamberZ=index===1?south-1:north+1;
    if(cz>=chamberZ&&cz<=chamberZ+1&&cx>=shaftX-5&&cx<=shaftX+5)return true;
  }
  return false;
}
export function biomeGroundColor(biome){
  return ({forest:0x315b42,meadow:0x3d674d,wetland:0x354f45,desert:0x92764d,
    highlands:0x687477,frost:0x81939a,crystal:0x3f6670,volcanic:0x5b4540})[biome]||0x3d674d;
}
function baseDepositObject(mineId,worldSeed){
  return Object.fromEntries(BASE_MINE_ROWS.map(([level,x,z,type,amount,depthY],i)=>{
    const key=mineDepositKey(level,x,z);
    return [key,{level,x,z,type,amount,max:amount,cooldown:0,depthY,seed:mineId===PRIMARY_MINE_ID?(((level*73856093)^(x*19349663)^(z*83492791)^(i*2654435761))>>>0):hash32(worldSeed+"|"+mineId+"|"+key+"|"+i)}];
  }));
}
export function makeMineDeposits(mineId=PRIMARY_MINE_ID,worldSeed=827142){
  const base=baseDepositObject(mineId,worldSeed);
  if(mineId===PRIMARY_MINE_ID)return base;
  const deposits={},profileIndex=Math.max(0,MINE_ENTRANCES.findIndex(entry=>entry.id===mineId));
  for(let level=1;level<=MINE_LEVELS;level++){
    const candidates=[];
    for(let z=4;z<MINE_H-3;z++)for(let x=5;x<MINE_W-4;x++){
      if(Math.abs(z-12)<3||!mineTunnelAt(x,z,mineId))continue;
      const key=x+","+z;candidates.push({x,z,rank:hash32(worldSeed+"|"+mineId+"|"+level+"|"+key)});
    }
    candidates.sort((a,b)=>a.rank-b.rank||a.x-b.x||a.z-b.z);
    const rows=BASE_MINE_ROWS.filter(row=>row[0]===level);
    const typePool=[...new Set(rows.map(row=>row[3]))];
    rows.forEach(([rowLevel,oldX,oldZ,oldType,oldAmount,depthY],index)=>{
      const spot=candidates[index];
      if(!spot)return;
      const type=typePool[(index+profileIndex*2)%typePool.length];
      const variance=(hash32(mineId+"|amount|"+level+"|"+index)%7)-3;
      const amount=Math.max(1,oldAmount+variance);
      const key=mineDepositKey(rowLevel,spot.x,spot.z);
      deposits[key]={level:rowLevel,x:spot.x,z:spot.z,type,amount,max:amount,cooldown:0,depthY,seed:hash32(worldSeed+"|"+mineId+"|"+key)};
    });
  }
  return deposits;
}
export function createMineInstances(worldSeed=827142){
  const mines={};
  for(const entry of MINE_ENTRANCES){
    mines[entry.id]={
      id:entry.id,name:entry.name,geology:entry.geology,entrance:{x:entry.x,y:entry.y},
      seed:hash32(Number(worldSeed)+"|"+entry.id),currentLevel:1,
      player:{x:3,z:12,yaw:0,pitch:-.06,level:1},
      deposits:makeMineDeposits(entry.id,worldSeed),
      elevatorBuffers:{}
    };
  }
  return mines;
}
function mergeMineDeposits(generated,saved){
  const result={...generated};
  if(!saved||typeof saved!=="object"||Array.isArray(saved))return result;
  for(const [key,value] of Object.entries(saved)){
    if(!value||typeof value!=="object")continue;
    const parts=String(key).split(":").map(Number);
    const level=clamp(Number(value.level??parts[0])||1,1,MINE_LEVELS);
    const x=clamp(Number(value.x??parts[1])||0,0,MINE_W-1);
    const z=clamp(Number(value.z??parts[2])||0,0,MINE_H-1);
    const normalizedKey=mineDepositKey(level,x,z);
    const template=result[normalizedKey]||{};
    const max=Math.max(0,Number(value.max??template.max??value.amount)||0);
    const amount=clamp(Number(value.amount??template.amount??0)||0,0,Math.max(max,Number(value.amount)||0));
    result[normalizedKey]={...template,...value,level,x,z,max,amount,
      depthY:Number.isFinite(Number(value.depthY??template.depthY))?Number(value.depthY??template.depthY):mineFloorY(level)-8};
  }
  return result;
}
export function migrateMineInstances({
  worldSeed=827142,mineInstances=null,legacyMineDeposits=null,legacyMineElevatorBuffers=null
}={}){
  const generated=createMineInstances(worldSeed),saved=mineInstances&&typeof mineInstances==="object"&&!Array.isArray(mineInstances)?mineInstances:{};
  for(const entry of MINE_ENTRANCES){
    const base=generated[entry.id],existing=saved[entry.id]&&typeof saved[entry.id]==="object"?saved[entry.id]:null;
    if(existing){
      base.name=typeof existing.name==="string"&&existing.name?existing.name:base.name;
      base.geology=typeof existing.geology==="string"&&existing.geology?existing.geology:base.geology;
      base.seed=Number.isSafeInteger(existing.seed)?existing.seed:base.seed;
      base.deposits=mergeMineDeposits(base.deposits,existing.deposits);
      base.elevatorBuffers=existing.elevatorBuffers&&typeof existing.elevatorBuffers==="object"&&!Array.isArray(existing.elevatorBuffers)?{...existing.elevatorBuffers}:{};
    }
  }
  if(legacyMineDeposits&&typeof legacyMineDeposits==="object"){
    const primary=generated[PRIMARY_MINE_ID];
    primary.deposits=mergeMineDeposits(primary.deposits,legacyMineDeposits);
  }
  if(legacyMineElevatorBuffers&&typeof legacyMineElevatorBuffers==="object"){
    const primary=generated[PRIMARY_MINE_ID];primary.elevatorBuffers={...primary.elevatorBuffers,...legacyMineElevatorBuffers};
  }
  return generated;
}
