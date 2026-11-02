/* DORONIUM FACTORY — world generation and geology */
export const WORLD_W = 128;
export const WORLD_H = 96;
export const MINE_W = 40;
export const MINE_H = 24;
export const MINE_LEVELS = 5;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

export function biomeAt(x,z){
  const mountain=Math.hypot((x-91)*.88,z-27);
  if(z<13 || (mountain<21 && z<36)) return "frost";
  if(mountain<30) return "highlands";
  if(x>91 && z>55) return "desert";
  if(x<34 && z>56) return "wetland";
  if(x<52 && z<57) return "forest";
  if(x>77 && z>32 && z<70) return "crystal";
  if(x>45 && x<79 && z<37) return "volcanic";
  return "meadow";
}

export function terrainHeightAt(x,z){
  const wave=Math.sin(x*.105+z*.036)*5.5+Math.cos(z*.12-x*.025)*4.5+Math.sin((x+z)*.047)*5;
  const biome=biomeAt(x,z);
  let h=wave;
  if(biome==="highlands"||biome==="frost"){
    const ridge=Math.max(0,1-Math.abs(x-(91+Math.sin(z*.09)*7))/32);
    h+=28+ridge*38+Math.sin(z*.31)*8;
  }else if(biome==="desert") h+=8+Math.sin(x*.17+z*.08)*5+Math.cos(z*.24)*2;
  else if(biome==="wetland") h-=4+Math.sin(x*.15)*3;
  else if(biome==="forest") h+=5+Math.sin(z*.2)*4;
  else if(biome==="crystal") h+=17+Math.sin((x-z)*.16)*10;
  else if(biome==="volcanic") h+=13+Math.sin(x*.2)*7+Math.cos(z*.19)*6;
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
