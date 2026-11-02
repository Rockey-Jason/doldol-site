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

export function terrainHeightAt(x,z){
  const wave=Math.sin(x*.105+z*.036)*5.5+Math.cos(z*.12-x*.025)*4.5+Math.sin((x+z)*.047)*5;
  const biome=biomeAt(x,z);
  const westernRidge=Math.max(0,1-Math.abs(x-(91+Math.sin(z*.09)*7))/32);
  const easternRidge=Math.exp(-Math.pow((x-(153+Math.sin(z*.045)*11))/25,2));
  const southernRidge=Math.exp(-Math.pow((z-(137+Math.sin(x*.035)*9))/24,2));
  let h=wave;
  if(biome==="highlands"||biome==="frost") h+=18+westernRidge*40+Math.sin(z*.31)*7;
  else if(biome==="desert") h+=9+Math.sin(x*.17+z*.08)*6+Math.cos(z*.24)*3;
  else if(biome==="wetland") h-=7+Math.sin(x*.15)*4;
  else if(biome==="forest") h+=7+Math.sin(z*.2)*5;
  else if(biome==="crystal") h+=20+Math.sin((x-z)*.16)*12;
  else if(biome==="volcanic") h+=12+Math.sin(x*.2)*8+Math.cos(z*.19)*7;
  // Broad mountain belts create readable block-height relief without isolated spikes.
  h+=easternRidge*70+southernRidge*30;
  if(biome==="volcanic"){
    const cx=x<100?62:139,cz=x<100?24:116,d=Math.hypot(x-cx,z-cz);
    h+=Math.max(0,1-d/25)*35-Math.max(0,1-d/10)*24;
  }
  return Math.round(h/3)*3;
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
    [4,12,12,"diamond",8,-144],[4,22,8,"goldOre",32,-150],[4,32,12,"doronium_normal",10,-158],
    [5,8,12,"doronium_normal",18,-186],[5,12,7,"doronium_blue",8,-192],[5,22,15,"doronium_red",8,-198],
    [5,25,8,"doronium_thermal",6,-204],[5,31,12,"doronium_void",3,-202],[5,34,17,"diamond",6,-188]
  ];
  return Object.fromEntries(rows.map(([level,x,z,type,amount,depthY],i)=>{
    const key=mineDepositKey(level,x,z);
    return [key,{level,x,z,type,amount,max:amount,cooldown:0,depthY,seed:((level*73856093)^(x*19349663)^(z*83492791)^(i*2654435761))>>>0}];
  }));
}
