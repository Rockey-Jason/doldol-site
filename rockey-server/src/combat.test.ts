import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS } from './catalog.js';
import { canFireWeapon, calculateWeaponDamage, calculateWeaponRecoil, traceWeaponShot, type Combatant } from './combat.js';

test('all ten weapon definitions have valid combat tuning',()=>{
  assert.equal(Object.keys(WEAPONS).length,10);
  for(const weapon of Object.values(WEAPONS)){
    assert.ok(weapon.magazine>0,weapon.code+' magazine');
    assert.ok(weapon.reserve>=0,weapon.code+' reserve');
    assert.ok(weapon.damage>0,weapon.code+' damage');
    assert.ok(weapon.fireInterval>0,weapon.code+' fire interval');
    assert.ok(weapon.reloadMs>0,weapon.code+' reload duration');
    assert.ok(weapon.range>0,weapon.code+' range');
    assert.ok(calculateWeaponRecoil(weapon)>0 && calculateWeaponRecoil(weapon)<=.045,weapon.code+' recoil');
    assert.ok(calculateWeaponDamage(weapon,false,weapon.range/2)>=weapon.damage,weapon.code+' body damage');
    assert.ok(calculateWeaponDamage(weapon,true,weapon.range/2)>calculateWeaponDamage(weapon,false,weapon.range/2),weapon.code+' headshot damage');
  }
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
