import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from './catalog.js';
import { canRobotSee, createRobotRoster, ROBOT_PROFILES, updateRobotAI, type RobotState, type RobotTarget } from './robot-ai.js';
import { isBlockedByCover } from './world-navigation.js';

function robot(type:RobotState['type'],x=0,z=0,yaw=0):RobotState{
  const profile=ROBOT_PROFILES[type];
  return {
    id:'test-'+type.toLowerCase(),name:type+'-TEST',type,isRobot:true,team:-1,
    x,y:.92,z,yaw,pitch:0,health:profile.maxHealth,maxHealth:profile.maxHealth,
    alive:true,connected:true,state:'PATROL',lastFireAt:0,
    patrolPoints:[{x:2,z:0},{x:2,z:2},{x:0,z:2}],patrolIndex:0
  };
}
const player:RobotTarget={id:'player-1',x:0,y:.92,z:-8,alive:true,connected:true};

test('every map gets six robot spawns that fit the player-sized walkable corridors',()=>{
  for(const map of Object.values(MAPS)){
    const robots=createRobotRoster(map.cover);
    assert.equal(robots.length,6,map.id+' robot count');
    assert.deepEqual(robots.map(r=>r.type),['SENTRY','GUARDIAN','SCOUT','SENTRY','GUARDIAN','SCOUT']);
    for(const bot of robots){
      assert.equal(isBlockedByCover(map.cover,bot.x,bot.y,bot.z,.46,.86),false,map.id+' blocks '+bot.name+' spawn');
      assert.ok(bot.health>0&&bot.health===bot.maxHealth,map.id+' invalid '+bot.name+' health');
    }
  }
});

test('robot classes have distinct durability and movement roles',()=>{
  assert.ok(ROBOT_PROFILES.GUARDIAN.maxHealth>ROBOT_PROFILES.SENTRY.maxHealth);
  assert.ok(ROBOT_PROFILES.SENTRY.maxHealth>ROBOT_PROFILES.SCOUT.maxHealth);
  assert.equal(ROBOT_PROFILES.SENTRY.moveSpeed,0);
  assert.equal(ROBOT_PROFILES.GUARDIAN.moveSpeed>0,true);
  assert.equal(ROBOT_PROFILES.SCOUT.moveSpeed>ROBOT_PROFILES.GUARDIAN.moveSpeed,true);
});

test('robots only acquire players inside their forward view and without wall obstruction',()=>{
  const guard=robot('SENTRY',0,0,0);
  assert.equal(canRobotSee(guard,player,[]),true);
  assert.equal(canRobotSee(guard,{...player,x:8,z:0},[]),false,'target outside forward field of view');
  assert.equal(canRobotSee(guard,{...player,z:8},[]),false,'target behind robot');
  assert.equal(canRobotSee(guard,player,[{x:0,z:-4,hx:2,hz:.35,top:4.2}]),false,'wall blocks line of sight');
});

test('visible robots fire on cadence and apply their configured damage',()=>{
  const guard=robot('SENTRY',0,0,0);
  const attacks=updateRobotAI([guard],[player],[],.05,2000);
  assert.equal(attacks.length,1);
  assert.equal(attacks[0].target.id,player.id);
  assert.equal(attacks[0].damage,ROBOT_PROFILES.SENTRY.damage);
  assert.equal(guard.state,'ENGAGING');
  assert.equal(updateRobotAI([guard],[player],[],.05,2100).length,0,'cooldown prevents rapid repeat fire');
});

test('scout robots patrol and choose a clear movement step around cover',()=>{
  const scout=robot('SCOUT',0,0,0);
  const before={x:scout.x,z:scout.z};
  updateRobotAI([scout],[],[],.05,1000);
  assert.notDeepEqual({x:scout.x,z:scout.z},before,'scout should patrol even without a visible target');

  const wall=[{x:0,z:.8,hx:2,hz:.08,top:4.2}];
  const blockedScout=robot('SCOUT',0,0,Math.PI);
  blockedScout.patrolPoints=[{x:0,z:3}];
  updateRobotAI([blockedScout],[],wall,.05,1000);
  assert.equal(isBlockedByCover(wall,blockedScout.x,.92,blockedScout.z,.46,.86),false);
});
