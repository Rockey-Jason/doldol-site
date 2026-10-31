import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, MAPS, WEAPONS } from './catalog.js';
import { canFireWeapon, calculateWeaponDamage, calculateWeaponRecoil, traceWeaponShot, transferReloadAmmo, type Combatant, type SmokeVolume } from './combat.js';

test('all ten weapon definitions have valid combat tuning',()=>{
  assert.equal(Object.keys(WEAPONS).length,11);
  for(const weapon of Object.values(WEAPONS)){
    assert.ok(weapon.magazine>0,weapon.code+' magazine');
    assert.ok(weapon.reserve>=0,weapon.code+' reserve');
    assert.ok(weapon.damage>0,weapon.code+' damage');
    assert.ok(weapon.fireInterval>0,weapon.code+' fire interval');
    assert.ok(weapon.reloadMs>0,weapon.code+' reload duration');
    assert.ok(weapon.range>0,weapon.code+' range');
    if(weapon.category==='MELEE')assert.equal(calculateWeaponRecoil(weapon),0,weapon.code+' melee recoil');
    else assert.ok(calculateWeaponRecoil(weapon)>0 && calculateWeaponRecoil(weapon)<=.045,weapon.code+' recoil');
    assert.ok(calculateWeaponDamage(weapon,false,weapon.range/2)>=weapon.damage,weapon.code+' body damage');
    assert.ok(calculateWeaponDamage(weapon,true,weapon.range/2)>calculateWeaponDamage(weapon,false,weapon.range/2),weapon.code+' headshot damage');
  }
});

test('all firearm and DORI headshots use exactly a 1.3x multiplier',()=>{
  for(const weapon of Object.values(WEAPONS)){
    assert.equal(weapon.headshotMultiplier,1.3,weapon.code+' headshot multiplier');
    assert.equal(calculateWeaponDamage(weapon,true,weapon.range/2),Math.round(calculateWeaponDamage(weapon,false,weapon.range/2)*1.3));
  }
  assert.equal(calculateWeaponRecoil(WEAPONS.DORI),0);
});

test('server fire gate rejects empty, reloading, and too-fast shots',()=>{
  assert.equal(canFireWeapon(1000,800,0,1,150),true);
  assert.equal(canFireWeapon(949,800,0,1,150),false);
  assert.equal(canFireWeapon(1000,800,1001,1,150),false);
  assert.equal(canFireWeapon(1000,800,0,0,150),false);
});

test('shotgun pellet damage scales and never becomes negative',()=>{
  const shotgun=WEAPONS.THUNDER;
  assert.ok(calculateWeaponDamage(shotgun,false,1)>=shotgun.damage);
  assert.ok(calculateWeaponDamage(shotgun,false,shotgun.range)>=shotgun.damage);
  assert.equal(calculateWeaponDamage(shotgun,false,shotgun.range+100),shotgun.damage);
});

function combatant(id:string,team:number,x:number,y:number,z:number,yaw=0,pitch=0):Combatant {
  return {id,team,x,y,z,yaw,pitch,alive:true,connected:true};
}
test('live shot trace hits enemies, blocks cover, and ignores teammates outside FFA',()=>{
  const weapon=WEAPONS.R16;
  const shooter=combatant('a',0,0,.92,0);
  const enemy=combatant('b',1,0,.92,-12);
  const ally=combatant('c',0,0,.92,-8);
  assert.equal(traceWeaponShot(shooter,[shooter,ally,enemy],'1v1',[],weapon).target,enemy);
  assert.equal(traceWeaponShot(shooter,[shooter,ally],'1v1',[],weapon).target,null);
  assert.equal(traceWeaponShot(shooter,[shooter,ally],'ffa',[],weapon).target,ally);
  assert.equal(traceWeaponShot(shooter,[shooter,enemy],'1v1',[{x:0,z:-6,hx:2,hz:.5}],weapon).target,null);
});
test('shots cannot pass through walls and can pass above low cover',()=>{
  const shooter=combatant('a',0,0,.92,0,0,.09);
  const enemy=combatant('b',1,0,.92,-10);
  const wall={x:0,z:-5,hx:2,hz:.35,top:2.4};
  assert.equal(traceWeaponShot(shooter,[shooter,enemy],'1v1',[wall],WEAPONS.R16).target,null);
  const lowCover={...wall,top:1};
  const shallowAim=combatant('c',0,0,.92,0,0,.01);
  assert.equal(traceWeaponShot(shallowAim,[shallowAim,enemy],'1v1',[lowCover],WEAPONS.R16).target,enemy);
});

test('live shot trace enforces range and recognizes headshots',()=>{
  const weapon=WEAPONS.R16;
  const shooter=combatant('a',0,0,.92,0,0,.09);
  const headTarget=combatant('b',1,0,.92,-10);
  const farTarget=combatant('c',1,0,.92,-weapon.range-8);
  const trace=traceWeaponShot(shooter,[shooter,headTarget],'1v1',[],weapon);
  assert.equal(trace.target,headTarget);
  assert.equal(trace.headshot,true);
  assert.equal(traceWeaponShot(shooter,[shooter,farTarget],'1v1',[],weapon).target,null);
});

test('live smoke blocks server-authoritative target acquisition only when the shot crosses its volume',()=>{
  const shooter=combatant('a',0,0,.92,0);
  const enemy=combatant('b',1,0,.92,-12);
  const smoke:SmokeVolume={x:0,y:1.5,z:-6,radius:2,expiresAt:Date.now()+8000};
  assert.equal(traceWeaponShot(shooter,[shooter,enemy],'1v1',[],WEAPONS.R16,[smoke]).target,null);
  const offsetSmoke={...smoke,x:5};
  assert.equal(traceWeaponShot(shooter,[shooter,enemy],'1v1',[],WEAPONS.R16,[offsetSmoke]).target,enemy);
  const smokeBeyondTarget={...smoke,z:-18};
  assert.equal(traceWeaponShot(shooter,[shooter,enemy],'1v1',[],WEAPONS.R16,[smokeBeyondTarget]).target,enemy);
});

test('tactical building shells block server shots but preserve the side entrance',()=>{
  const inside=combatant('a',0,-17.2,.92,0);
  const farEnemy=combatant('b',1,-17.2,.92,-12);
  assert.equal(traceWeaponShot(inside,[inside,farEnemy],'1v1',MAPS.training_facility.cover,WEAPONS.R16).target,null);

  const doorwayShooter=combatant('c',0,-10,.92,0,Math.PI/2);
  const doorwayTarget=combatant('d',1,-17.2,.92,0);
  assert.equal(traceWeaponShot(doorwayShooter,[doorwayShooter,doorwayTarget],'1v1',MAPS.training_facility.cover,WEAPONS.R16).target,doorwayTarget);

  const wallShooter=combatant('e',0,-10,.92,2,Math.PI/2);
  const wallTarget=combatant('f',1,-17.2,.92,2);
  assert.equal(traceWeaponShot(wallShooter,[wallShooter,wallTarget],'1v1',MAPS.training_facility.cover,WEAPONS.R16).target,null);
});

test('vertically bounded upper partitions do not block shots below their lintels',()=>{
  const shooter=combatant('a',0,0,.92,0);
  const enemy=combatant('b',1,0,.92,-10);
  const lintel={x:0,z:-5,hx:2,hz:.25,bottom:3.15,top:4.1};
  assert.equal(traceWeaponShot(shooter,[shooter,enemy],'1v1',[lintel],WEAPONS.R16).target,enemy);
  const elevatedShooter=combatant('c',0,0,3.0,0,0,.0);
  const elevatedEnemy=combatant('d',1,0,3.0,-10);
  assert.equal(traceWeaponShot(elevatedShooter,[elevatedShooter,elevatedEnemy],'1v1',[lintel],WEAPONS.R16).target,null);
});

test('every weapon reload transfers only missing magazine rounds and never creates ammo',()=>{
  for(const weapon of Object.values(WEAPONS)){
    const partial=Math.max(0,Math.floor(weapon.magazine*.37));
    const reserve=Math.max(0,Math.floor(weapon.reserve*.41));
    const result=transferReloadAmmo(partial,reserve,weapon.magazine);
    assert.equal(result.ammo,Math.min(weapon.magazine,partial+reserve),weapon.code);
    assert.equal(result.reserve,Math.max(0,reserve-(weapon.magazine-partial)),weapon.code);
    assert.equal(result.ammo+result.reserve,partial+reserve,weapon.code);
    assert.ok(result.ammo<=weapon.magazine,weapon.code);
  }
});

test('reload cancellation leaves the original magazine and reserve untouched',()=>{
  const before={ammo:3,reserve:27};
  const cancelled={...before};
  assert.deepEqual(cancelled,before);
  const completed=transferReloadAmmo(before.ammo,before.reserve,WEAPONS.R16.magazine);
  assert.deepEqual(completed,{ammo:30,reserve:0,moved:27});
});

test('all tactical items have valid inventory definitions',()=>{
  assert.deepEqual(Object.keys(ITEMS).sort(),['ENERGY','FLASH','GRENADE','PILLS','SMOKE']);
  for(const item of Object.values(ITEMS)){
    assert.ok(item.startingCount>=0&&item.startingCount<=10,item.code);
    assert.ok(item.name.length>0,item.code);
  }
});
