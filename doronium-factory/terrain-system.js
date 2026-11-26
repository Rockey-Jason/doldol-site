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
  return Number((wave+relief+landforms+fineRelief).toFixed(2));
}

export function mineFloorY(level){return -42*clamp(Number(level)||1,1,MINE_LEVELS);}
export function mineDepositKey(level,x,z){return level+":"+x+":"+z;}

export function mineTunnelAt(x,z){
  return (x>=2&&x<=37&&z>=10&&z<=14) ||
    (x>=8&&x<=13&&z>=5&&z<=18) ||
    (x>=19&&x<=24&&z>=6&&z<=18) ||
    (x>=29&&x<=36&&z>=4&&z<=20) ||
    (x>=3&&x<=6&&z>=8&&z<=16);
}

export function biomeGroundColor(biome){
  return ({forest:0x315b42,meadow:0x3d674d,wetland:0x354f45,desert:0x92764d,
    highlands:0x687477,frost:0x81939a,crystal:0x3f6670,volcanic:0x5b4540})[biome]||0x3d674d;
}

export function makeMineDeposits(){
  const rows=[
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
  return Object.fromEntries(rows.map(([level,x,z,type,amount,depthY],i)=>{
    const key=mineDepositKey(level,x,z);
    return [key,{level,x,z,type,amount,max:amount,cooldown:0,depthY,seed:((level*73856093)^(x*19349663)^(z*83492791)^(i*2654435761))>>>0}];
  }));
}
