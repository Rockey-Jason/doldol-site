import type { RockeyWeapon } from './catalog.js';

export function canFireWeapon(now:number,lastFire:number,reloadUntil:number,ammo:number,fireInterval:number):boolean {
  return Number.isFinite(now) && ammo>0 && now>=reloadUntil && now-lastFire>=fireInterval;
}

export function calculateWeaponRecoil(weapon:RockeyWeapon):number {
  if(weapon.category==='MELEE')return 0;
  return Math.min(0.045,0.012+weapon.damage/2500+weapon.spread*0.25);
}

export function calculateWeaponDamage(weapon:RockeyWeapon,headshot:boolean,distance:number):number {
  const multiplier=headshot?weapon.headshotMultiplier:1;
  const pelletScale=weapon.pellets
    ?Math.min(weapon.pellets,Math.max(1,Math.ceil((weapon.range-distance)/weapon.range*weapon.pellets)))
    :1;
  return Math.max(0,Math.round(weapon.damage*multiplier*pelletScale));
}

export type Combatant = {
  id?:string; team:number; x:number; y:number; z:number;
  yaw:number; pitch:number; alive:boolean; connected:boolean;
};
export type CoverBox = {x:number;z:number;hx:number;hz:number;top?:number};
export type SmokeVolume = {x:number;y:number;z:number;radius:number;expiresAt:number};
function rayBlockedBySmoke(
  ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,distance:number,smoke:readonly SmokeVolume[]
):boolean{
  for(const cloud of smoke){
    const along=(cloud.x-ox)*dx+(cloud.y-oy)*dy+(cloud.z-oz)*dz;
    if(along<=0||along>=distance)continue;
    const cx=ox+dx*along,cy=oy+dy*along,cz=oz+dz*along;
    if(Math.hypot(cloud.x-cx,cloud.y-cy,cloud.z-cz)<cloud.radius)return true;
  }
  return false;
}
function rayBlocked(ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,distance:number,box:CoverBox):boolean {
  let min=0,max=distance;
  for(const axis of [
    {o:ox,d:dx,lo:box.x-box.hx,hi:box.x+box.hx},
    {o:oy,d:dy,lo:0,hi:box.top??100},
    {o:oz,d:dz,lo:box.z-box.hz,hi:box.z+box.hz}
  ]){
    if(Math.abs(axis.d)<.00001){if(axis.o<axis.lo||axis.o>axis.hi)return false;continue;}
    let a=(axis.lo-axis.o)/axis.d,b=(axis.hi-axis.o)/axis.d;
    if(a>b)[a,b]=[b,a];
    min=Math.max(min,a);max=Math.min(max,b);
    if(max<min)return false;
  }
  return true;
}
export function traceWeaponShot<T extends Combatant>(
  shooter:T,candidates:readonly T[],mode:string,cover:readonly CoverBox[],weapon:RockeyWeapon,
  smoke:readonly SmokeVolume[]=[]
):{target:T|null;distance:number;headshot:boolean}{
  const cp=Math.cos(shooter.pitch),dx=-Math.sin(shooter.yaw)*cp,dy=Math.sin(shooter.pitch),dz=-Math.cos(shooter.yaw)*cp;
  const ox=shooter.x,oy=shooter.y+.55,oz=shooter.z;
  let target:T|null=null,best=weapon.range,headshot=false;
  for(const candidate of candidates){
    if(candidate===shooter||!candidate.alive||!candidate.connected)continue;
    if(mode!=='ffa'&&candidate.team===shooter.team)continue;
    const tx=candidate.x-ox,ty=candidate.y+.65-oy,tz=candidate.z-oz;
    const along=tx*dx+ty*dy+tz*dz;
    if(along<=0||along>=best)continue;
    const px=tx-dx*along,py=ty-dy*along,pz=tz-dz*along;
    if(Math.hypot(px,pz)>.62+weapon.spread*along*.35||Math.abs(py)>.95)continue;
    if(cover.some(box=>rayBlocked(ox,oy,oz,dx,dy,dz,along,box)))continue;
    if(rayBlockedBySmoke(ox,oy,oz,dx,dy,dz,along,smoke))continue;
    best=along;target=candidate;
    headshot=Math.abs(oy+dy*along-(candidate.y+1.45))<.24;
  }
  return {target,distance:best,headshot};
}
