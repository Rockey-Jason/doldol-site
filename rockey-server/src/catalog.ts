export interface RockeyCover {
  x: number; z: number; hx: number; hz: number; top: number; bottom?: number;
}
export interface RockeyMap {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  palette: 'blue' | 'magenta' | 'ice' | 'cyan' | 'amber';
  background: number;
  fog: number;
  floor: number;
  grid: number;
  light: number;
  cover: RockeyCover[];
}
export const MAPS: Record<string,RockeyMap> = {
  training_facility: {
    id:'training_facility',name:'TRAINING FACILITY',
    description:'정밀 조준과 이동을 훈련하는 기본 전장.',difficulty:'EASY',
    palette:'blue',background:0x9fc8e8,fog:0xc5d9e8,floor:0x718b9c,grid:0x426f91,light:0x43a9ff,
    cover:[
      {x:0,z:0,hx:2.4,hz:2.4,top:3},
      {x:-9,z:-7,hx:3.2,hz:1.1,top:2.2},{x:9,z:-7,hx:3.2,hz:1.1,top:2.2},
      {x:-9,z:7,hx:3.2,hz:1.1,top:2.2},{x:9,z:7,hx:3.2,hz:1.1,top:2.2},
    ]
  },
  neon_district: {
    id:'neon_district',name:'NEON DISTRICT',
    description:'네온 간판과 좁은 골목이 교차하는 근접전 전장.',difficulty:'STANDARD',
    palette:'magenta',background:0xd5b8dc,fog:0xe2cde8,floor:0x806d8d,grid:0xa65fc1,light:0xe46aff,
    cover:[
      {x:0,z:-10,hx:5,hz:1.2,top:3.5},{x:0,z:10,hx:5,hz:1.2,top:3.5},
      // Keep the central building doors clear; the side pylons frame rather than seal the entrances.
      {x:-12,z:-6.5,hx:1.4,hz:1.5,top:4},{x:-12,z:4,hx:1.4,hz:1,top:4},
      {x:12,z:-6.5,hx:1.4,hz:1.5,top:4},{x:12,z:4,hx:1.4,hz:1,top:4},
      {x:-7,z:-5,hx:1.7,hz:1.7,top:2.4},{x:7,z:5,hx:1.7,hz:1.7,top:2.4}
    ]
  },
  frostline: {
    id:'frostline',name:'FROSTLINE',
    description:'빙결 연구기지. 긴 시야와 엄폐물 사이의 교전이 핵심.',difficulty:'HARD',
    palette:'ice',background:0xb9d9e8,fog:0xd5eaf1,floor:0x779cae,grid:0x5ba9c7,light:0x8cecff,
    cover:[
      {x:0,z:0,hx:1.6,hz:7,top:2.4},{x:-11,z:-9,hx:3.5,hz:1.2,top:3.2},
      {x:11,z:9,hx:3.5,hz:1.2,top:3.2},{x:-12,z:8,hx:2.2,hz:2.2,top:2.8},
      {x:12,z:-8,hx:2.2,hz:2.2,top:2.8}
    ]
  },
  orbital_dock: {
    id:'orbital_dock',name:'ORBITAL DOCK',
    description:'우주 정거장 적재 구역. 수직 구조와 중앙 통로를 활용하라.',difficulty:'HARD',
    palette:'cyan',background:0xa5d8df,fog:0xc5e8eb,floor:0x668f99,grid:0x42a7b2,light:0x45e6f4,
    cover:[
      {x:-10,z:0,hx:2.4,hz:7,top:4.5},{x:10,z:0,hx:2.4,hz:7,top:4.5},
      {x:0,z:-12,hx:7,hz:1.2,top:3},{x:0,z:12,hx:7,hz:1.2,top:3},
      {x:0,z:0,hx:2,hz:2,top:2.8}
    ]
  },
  canyon_relay: {
    id:'canyon_relay',name:'CANYON RELAY',
    description:'협곡 통신 중계소. 측면 우회와 장거리 저격에 유리하다.',difficulty:'STANDARD',
    palette:'amber',background:0xe8c99a,fog:0xf0ddbc,floor:0xa68b66,grid:0xc08b48,light:0xffc06a,
    cover:[
      {x:-12,z:-10,hx:4,hz:1.3,top:4},{x:12,z:10,hx:4,hz:1.3,top:4},
      {x:-12,z:10,hx:1.3,hz:4,top:3},{x:12,z:-10,hx:1.3,hz:4,top:3},
      {x:0,z:0,hx:3,hz:1.3,top:2.4}
    ]
  }
};


const TACTICAL_BUILDING_COVER:RockeyCover[]=[];
const addTacticalCover=(x:number,z:number,hx:number,hz:number,top=4.25,bottom=0)=>{
  TACTICAL_BUILDING_COVER.push({x,z,hx,hz,top,bottom});
};
for(const cx of [-17.2,17.2]){
  const innerSide=cx<0?1:-1;
  const outerSide=-innerSide;
  const innerDoorX=cx+innerSide*4.21;
  const outerDoorX=cx+outerSide*4.21;
  // Ground-floor exterior shell, with the inner entrance kept open.
  addTacticalCover(cx,-6.11,4.4,.19);
  addTacticalCover(outerDoorX,-1.5,.19,4.8);
  addTacticalCover(innerDoorX,-4.85,.19,1.45);
  addTacticalCover(innerDoorX,1.85,.19,1.45);
  addTacticalCover(cx-2.95,2.91,1.45,.19);
  addTacticalCover(cx+2.95,2.91,1.45,.19);
  // Office/storage cross-partition with a clear central doorway and lintel.
  addTacticalCover(cx-1.95,-2.05,.16,.16,4.1);
  addTacticalCover(cx+1.95,-2.05,.16,.16,4.1);
  addTacticalCover(cx-1.65,-3.55,.75,.16,3.15);
  addTacticalCover(cx+1.65,-3.55,.75,.16,3.15);
  addTacticalCover(cx,-3.55,.60,.16,4.1,3.15);

  // Second floor: outer gallery and inner bridge gallery, with a clear
  // stairwell landing and an overhead cross-walk between the two sides.
  addTacticalCover(cx-innerSide*.9,-.05,3.4,3.35,4.19,3.91);
  addTacticalCover(cx+innerSide*4.05,-.05,.65,3.35,4.19,3.91);
  addTacticalCover(cx+innerSide*3.05,-.9,.675,.45,4.19,3.91);
  addTacticalCover(cx+innerSide*3.05,-3.5,1.1,.725,4.14,3.86);

  // Outer guardrail stays continuous. The inner guardrail opens to the skybridge.
  addTacticalCover(cx- innerSide*4.18,-.05,.14,3.35,5.08,4.08);
  addTacticalCover(cx+innerSide*4.55,-2.95,.14,.45,5.08,4.08);
  addTacticalCover(cx+innerSide*4.55,1.4,.14,1.9,5.08,4.08);

  // The wall across the gallery has a doorway aligned with the stair landing.
  const stairDoorX=cx+innerSide*3.05;
  const leftWallEnd=stairDoorX-.85;
  const rightWallStart=stairDoorX+.85;
  const wallMin=cx-4.1,wallMax=cx+4.1;
  addTacticalCover((wallMin+leftWallEnd)/2,-3.25,(leftWallEnd-wallMin)/2,.14,5.08,4.08);
  addTacticalCover((rightWallStart+wallMax)/2,-3.25,(wallMax-rightWallStart)/2,.14,5.08,4.08);

  // Roof deck segments leave a real stairwell opening. Guardrails follow its sides.
  addTacticalCover(cx-2.5,-1.5,1.675,4.575,5.99,5.71);
  addTacticalCover(cx+2.5,-1.5,1.675,4.575,5.99,5.71);
  addTacticalCover(cx,-4.0375,.825,2.0375,5.99,5.71);
  addTacticalCover(cx,2.2875,.825,.7875,5.99,5.71);
  addTacticalCover(cx,-1.75,.8,.45,5.99,5.71);
  addTacticalCover(cx-innerSide*.82,-.25,.06,1.75,6.64,5.92);
  addTacticalCover(cx+innerSide*.82,-.25,.06,1.75,6.64,5.92);

  // Basement side walls are opened toward the central underpass; the inner
  // room walls retain the existing side passages into both service alcoves.
  addTacticalCover(cx+outerSide*4.12,-1.5,.11,5.95,-.125,-2.775);
  addTacticalCover(cx+innerSide*4.12,-5.2,.11,2.25,-.125,-2.775);
  addTacticalCover(cx+innerSide*4.12,2.2,.11,2.25,-.125,-2.775);
  // The old low sill volumes overlapped the player capsule and sealed both side portals.
  addTacticalCover(cx,-5.88,4.1,.11,-.125,-2.775);
  addTacticalCover(cx,2.88,4.1,.11,-.125,-2.775);
  for(const side of [-1,1]){
    addTacticalCover(cx+side*2.8,-4.25,.09,1.5,-.1,-2.6);
    addTacticalCover(cx+side*2.8,1.25,.09,1.5,-.1,-2.6);
  }
}
// Basement underpass side walls.
addTacticalCover(0,-.16,12.8,.09,-.145,-2.695);
addTacticalCover(0,-2.84,12.8,.09,-.145,-2.695);

// Bridge floor, glass-panel side walls and ceiling use vertical bounds so
// ground-floor combat is not accidentally blocked by elevated structure.
addTacticalCover(0,-1.5,12.8,1.25,4.19,3.91);
addTacticalCover(0,-2.74,12.8,.12,5.69,4.19);
addTacticalCover(0,-.26,12.8,.12,5.69,4.19);
addTacticalCover(0,-1.5,12.8,1.25,6.25,6.05);
for(const map of Object.values(MAPS))map.cover.push(...TACTICAL_BUILDING_COVER);

export interface RockeyWeapon {
  code: string; name: string; category: string;
  damage: number; headshotMultiplier: number; fireInterval: number;
  magazine: number; reserve: number; reloadMs: number; range: number;
  spread: number; pellets?: number;
}
export const WEAPONS: Record<string,RockeyWeapon> = {
  R16:{code:'R16',name:'R-16',category:'ASSAULT',damage:24,headshotMultiplier:1.3,fireInterval:115,magazine:30,reserve:90,reloadMs:1700,range:68,spread:.008},
  R9:{code:'R9',name:'R-9',category:'PISTOL',damage:34,headshotMultiplier:1.3,fireInterval:260,magazine:12,reserve:48,reloadMs:1400,range:58,spread:.004},
  VIPER:{code:'VIPER',name:'VIPER',category:'SMG',damage:18,headshotMultiplier:1.3,fireInterval:72,magazine:36,reserve:144,reloadMs:1800,range:44,spread:.018},
  THUNDER:{code:'THUNDER',name:'THUNDER',category:'SHOTGUN',damage:9,headshotMultiplier:1.3,fireInterval:780,magazine:8,reserve:40,reloadMs:2100,range:24,spread:.075,pellets:7},
  LONGSHOT:{code:'LONGSHOT',name:'LONGSHOT',category:'SNIPER',damage:88,headshotMultiplier:1.3,fireInterval:1250,magazine:5,reserve:25,reloadMs:2400,range:110,spread:.001},
  HELIX:{code:'HELIX',name:'HELIX',category:'DMR',damage:36,headshotMultiplier:1.3,fireInterval:330,magazine:12,reserve:60,reloadMs:1950,range:88,spread:.003},
  BASTION:{code:'BASTION',name:'BASTION',category:'LMG',damage:21,headshotMultiplier:1.3,fireInterval:94,magazine:60,reserve:180,reloadMs:3100,range:56,spread:.024},
  NOVA:{code:'NOVA',name:'NOVA',category:'HEAVY PISTOL',damage:42,headshotMultiplier:1.3,fireInterval:410,magazine:8,reserve:40,reloadMs:1550,range:64,spread:.003},
  ARC:{code:'ARC',name:'ARC',category:'ENERGY',damage:28,headshotMultiplier:1.3,fireInterval:190,magazine:24,reserve:96,reloadMs:2050,range:74,spread:.006},
  PULSE:{code:'PULSE',name:'PULSE',category:'BURST',damage:25,headshotMultiplier:1.3,fireInterval:205,magazine:21,reserve:84,reloadMs:1850,range:78,spread:.005},
  DORI:{code:'DORI',name:'DORI',category:'MELEE',damage:48,headshotMultiplier:1.3,fireInterval:620,magazine:1,reserve:0,reloadMs:500,range:3.2,spread:.08}
};
export const WEAPON_LIST = Object.values(WEAPONS);
export type RockeyItemCode='GRENADE'|'SMOKE'|'FLASH'|'PILLS'|'ENERGY';
export const ITEMS:Record<RockeyItemCode,{code:RockeyItemCode;name:string;startingCount:number}>={
 GRENADE:{code:'GRENADE',name:'수류탄',startingCount:2},SMOKE:{code:'SMOKE',name:'연막탄',startingCount:1},
 FLASH:{code:'FLASH',name:'섬광탄',startingCount:1},PILLS:{code:'PILLS',name:'회복 알약',startingCount:2},
 ENERGY:{code:'ENERGY',name:'에너지 드링크',startingCount:1}
};
