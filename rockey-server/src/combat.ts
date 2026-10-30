import type { RockeyWeapon } from './catalog.js';

export function canFireWeapon(now:number,lastFire:number,reloadUntil:number,ammo:number,fireInterval:number):boolean {
  return Number.isFinite(now) && ammo>0 && now>=reloadUntil && now-lastFire>=fireInterval;
}

export function calculateWeaponRecoil(weapon:RockeyWeapon):number {
  return Math.min(0.045,0.012+weapon.damage/2500+weapon.spread*0.25);
}

export function calculateWeaponDamage(weapon:RockeyWeapon,headshot:boolean,distance:number):number {
  const multiplier=headshot?weapon.headshotMultiplier:1;
  const pelletScale=weapon.pellets
    ?Math.min(weapon.pellets,Math.max(1,Math.ceil((weapon.range-distance)/weapon.range*weapon.pellets)))
    :1;
  return Math.max(0,Math.round(weapon.damage*multiplier*pelletScale));
}
