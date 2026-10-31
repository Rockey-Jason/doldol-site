export interface RockeyCover {
  x: number; z: number; hx: number; hz: number; top: number;
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
      {x:-17,z:0,hx:1.2,hz:4.2,top:4.4},{x:17,z:0,hx:1.2,hz:4.2,top:4.4}
    ]
  },
  neon_district: {
    id:'neon_district',name:'NEON DISTRICT',
    description:'네온 간판과 좁은 골목이 교차하는 근접전 전장.',difficulty:'STANDARD',
    palette:'magenta',background:0xd5b8dc,fog:0xe2cde8,floor:0x806d8d,grid:0xa65fc1,light:0xe46aff,
    cover:[
      {x:0,z:-10,hx:5,hz:1.2,top:3.5},{x:0,z:10,hx:5,hz:1.2,top:3.5},
      {x:-12,z:0,hx:1.4,hz:5,top:4},{x:12,z:0,hx:1.4,hz:5,top:4},
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
