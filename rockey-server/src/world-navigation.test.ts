import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from './catalog.js';
import {resolveCeilingCollision,resolveHorizontalMovement} from './world-navigation.js';
import {isBlockedByCover,tacticalFloorHeightAt,ROCKEY_PLAYER_COLLISION,ROCKEY_UNDERPASS,ROCKEY_SKYBRIDGE} from './world-navigation.js';

test('every map keeps both ground-floor building entrances open',()=>{
  for(const map of Object.values(MAPS)){
    for(const centerX of [-17.2,17.2]){
      const innerSide=centerX<0?1:-1;
      const doorX=centerX+innerSide*4.21;
      assert.equal(isBlockedByCover(map.cover,doorX,.92,-1.5),false,
        map.id+' blocks the '+(centerX<0?'west':'east')+' building entrance');
      assert.equal(isBlockedByCover(map.cover,centerX+innerSide*3.7,.92,-1.5),false,
        map.id+' blocks the building entry corridor');
    }
  }
});

test('both mirrored second-floor stairways reach a landing and the gallery on every map',()=>{
  for(const map of Object.values(MAPS)){
    for(const centerX of [-17.2,17.2]){
      const innerSide=centerX<0?1:-1;
      const stairX=centerX+innerSide*3.05;
      let bodyY=.92;
      let previousFloor=0;
      for(let localZ=2.35;localZ>=-1.85;localZ-=.08){
        const floor=tacticalFloorHeightAt(stairX,localZ-1.5,bodyY);
        assert.ok(Number.isFinite(floor),map.id+' returned a non-finite stair height');
        assert.ok(floor>=previousFloor-.02,map.id+' stair floor unexpectedly descends while climbing');
        assert.equal(isBlockedByCover(map.cover,stairX,bodyY,localZ-1.5),false,
          map.id+' blocks the stair flight at local Z '+localZ.toFixed(2));
        previousFloor=floor;
        bodyY=floor+.92;
      }
      assert.ok(previousFloor>=3.8,map.id+' stair flight did not reach second-floor height');
      assert.equal(isBlockedByCover(map.cover,stairX,5.11,-3.25),false,
        map.id+' blocks the stair-aligned upper doorway');
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*3.9,-1.5,5.11),4.19,
        map.id+' bridge-side upper gallery has no walkable floor');
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*3.05,-3.35,5.11),4.19,
        map.id+' upper stair nose does not connect to the landing');
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*3.05,-2.6,5.11),4.19,
        map.id+' widened upper landing has a missing floor');
      assert.equal(isBlockedByCover(map.cover,centerX+innerSide*2.5,5.11,-.9),false,
        map.id+' blocks the upper cross-walk');
      assert.equal(isBlockedByCover(map.cover,centerX+innerSide*3.9,5.11,-1.5),false,
        map.id+' blocks the upper bridge entrance');
    }
  }
});

test('both roof stairwells have an opening through the roof deck',()=>{
  for(const map of Object.values(MAPS)){
    for(const centerX of [-17.2,17.2]){
      let bodyY=5.11;
      let floor=4.19;
      for(let localZ=2.75;localZ>=-.55;localZ-=.08){
        floor=tacticalFloorHeightAt(centerX,localZ-1.5,bodyY);
        assert.ok(floor>=4.19&&floor<=5.99,map.id+' roof stair height outside expected bounds');
        assert.equal(isBlockedByCover(map.cover,centerX,bodyY,localZ-1.5),false,
          map.id+' roof stairwell is sealed at local Z '+localZ.toFixed(2));
        bodyY=floor+.92;
      }
      assert.ok(floor>5.6,map.id+' roof stairway did not reach the roof deck');
    }
  }
});

test('basement stairs descend into the service level and the tunnel remains walkable',()=>{
  for(const map of Object.values(MAPS)){
    for(const centerX of [-17.2,17.2]){
      let bodyY=.92;
      let previousFloor=0;
      for(let localZ=2.25;localZ>=-2.25;localZ-=.075){
        const floor=tacticalFloorHeightAt(centerX,localZ-1.5,bodyY);
        assert.ok(floor<=previousFloor+.02,map.id+' basement stair floor unexpectedly rises while descending');
        assert.equal(isBlockedByCover(map.cover,centerX,bodyY,localZ-1.5),false,
          map.id+' blocks the basement stair flight at local Z '+localZ.toFixed(2));
        previousFloor=floor;
        bodyY=floor+.92;
      }
      assert.ok(previousFloor<=-2.4,map.id+' basement stairs did not reach the service level');
      assert.equal(tacticalFloorHeightAt(0,-1.5,-1.72),-2.64,
        map.id+' central underpass has no walkable floor');
    }
  }
});

test('basement doors on both buildings open to the service underpass',()=>{
  for(const map of Object.values(MAPS)){
    for(const centerX of [-17.2,17.2]){
      const innerSide=centerX<0?1:-1;
      const wallX=centerX+innerSide*4.12;
      const doorX=centerX+innerSide*3.9;
      assert.equal(isBlockedByCover(map.cover,wallX,-1.72,-1.5),false,
        map.id+' blocks the basement underpass doorway');
      assert.equal(tacticalFloorHeightAt(doorX,-1.5,-1.72),-2.64,
        map.id+' basement doorway has no walkable floor');
    }
  }
});


test('player capsule dimensions fit every real entrance and stair transition',()=>{
  const radius=.34+.02+.02;
  const halfHeight=.86;
  assert.ok(radius*2<1.05*2,'gallery doorway must exceed capsule diameter');
  for(const map of Object.values(MAPS)){
    for(const centerX of [-17.2,17.2]){
      const innerSide=centerX<0?1:-1;
      const stairX=centerX+innerSide*3.05;
      // Test the complete upper ramp, the stair-aligned landing and its door.
      for(let localZ=2.35;localZ>=-1.85;localZ-=.08){
        const floor=((2.35-localZ)/4.2)*4.19;
        const bodyCenter=floor+halfHeight;
        assert.equal(isBlockedByCover(map.cover,stairX,bodyCenter,localZ-1.5,radius,halfHeight),false,
          map.id+' blocks the full player capsule on the upper ramp');
      }
      assert.equal(isBlockedByCover(map.cover,stairX,4.14+halfHeight,-3.5,radius,halfHeight),false,
        map.id+' blocks the full capsule in the upper landing');
      assert.equal(isBlockedByCover(map.cover,centerX+innerSide*4.55,5.11,-1.5,radius,halfHeight),false,
        map.id+' blocks the bridge portal at capsule height');

      // The basement ramp ends flush with the service-floor elevation.
      for(let localZ=2.25;localZ>=-2.25;localZ-=.075){
        const floor=-((2.25-localZ)/4.5)*2.64;
        assert.equal(isBlockedByCover(map.cover,centerX, floor+halfHeight,localZ-1.5,radius,halfHeight),false,
          map.id+' blocks the full player capsule on the basement ramp');
      }
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*3.9,-1.5,-1.72),-2.64,
        map.id+' basement portal does not meet the service-floor height');
    }
  }
});


test('underpass roof no longer intersects the full standing player capsule',()=>{
  const actualClearance=ROCKEY_UNDERPASS.ceilingBottom-ROCKEY_UNDERPASS.floorTop;
  assert.ok(Math.abs(actualClearance-ROCKEY_UNDERPASS.clearHeight)<1e-9);
  assert.ok(actualClearance>ROCKEY_PLAYER_COLLISION.standingHeight+ROCKEY_PLAYER_COLLISION.skin,
    'underpass ceiling must leave room for the full capsule and controller skin');
  assert.equal(ROCKEY_UNDERPASS.ceilingBottom,-.28,
    'underpass roof underside must align with the split arena-floor footprint');
});


test('skybridge ceiling clears the capsule including the avatar foot offset',()=>{
  const actualClearance=ROCKEY_SKYBRIDGE.ceilingBottom-ROCKEY_SKYBRIDGE.floorTop;
  assert.ok(Math.abs(actualClearance-ROCKEY_SKYBRIDGE.clearHeight)<1e-9);
  const footOffset=.92-ROCKEY_PLAYER_COLLISION.halfHeight;
  const required=ROCKEY_PLAYER_COLLISION.standingHeight+footOffset+ROCKEY_PLAYER_COLLISION.skin;
  assert.ok(actualClearance>required,
    'skybridge ceiling must clear the standing capsule, its floor offset and controller skin');
});


const testCeiling={x:0,z:0,hx:2,hz:2,bottom:6.95,top:7.15};

test('upward movement stops at the underside of a ceiling',()=>{
  const result=resolveCeilingCollision([testCeiling],0,5.9,0,6.3);
  assert.equal(result.ceilingHit,true);
  assert.ok(Math.abs(result.y-(6.95-.86))<1e-6);
});

test('a player slightly embedded in a ceiling is returned below its underside',()=>{
  const result=resolveCeilingCollision([testCeiling],0,6.12,0,6.2);
  assert.equal(result.ceilingHit,true);
  assert.ok(Math.abs(result.y-(6.95-.86))<1e-6);
});

test('downward movement after ceiling contact remains unobstructed',()=>{
  const result=resolveCeilingCollision([testCeiling],0,6.09,0,5.9);
  assert.equal(result.ceilingHit,false);
  assert.equal(result.y,5.9);
});

test('a ceiling does not affect a player outside its horizontal footprint',()=>{
  const result=resolveCeilingCollision([testCeiling],3,5.9,0,6.3);
  assert.equal(result.ceilingHit,false);
  assert.equal(result.y,6.3);
});

test('ordinary wall volumes do not stop a jump as overhead ceilings',()=>{
  const wall={x:0,z:0,hx:2,hz:2,top:4};
  const result=resolveCeilingCollision([wall],0,.92,0,1.8);
  assert.equal(result.ceilingHit,false);
  assert.equal(result.y,1.8);
});


test('horizontal collision uses the rising destination height, not the previous frame height',()=>{
  const wall={x:1,z:0,hx:.2,hz:1,bottom:5.6,top:7};
  assert.equal(isBlockedByCover([wall],.7,4.7,.7),false,
    'the player capsule is still below the wall at the previous height');
  assert.equal(isBlockedByCover([wall],.7,5.0,.7),true,
    'the rising capsule overlaps the wall at its destination height');
  const moved=resolveHorizontalMovement([wall],0,0,.7,.7,5.0);
  assert.ok(moved.x<.5,'movement into the wall should be stopped');
  assert.ok(moved.z>.5,'the unobstructed axis should slide along the wall');
  assert.equal(isBlockedByCover([wall],moved.x,5.0,moved.z),false,
    'the resolved player position must not remain embedded');
});

test('axis-separated movement can gradually release an existing wall overlap',()=>{
  const wall={x:1,z:0,hx:.2,hz:1,bottom:5.6,top:7};
  assert.equal(isBlockedByCover([wall],.7,5.0,0),true);
  const moved=resolveHorizontalMovement([wall],.7,0,.5,0,5.0);
  assert.ok(moved.x<.7,'movement away from the wall should reduce penetration');
  assert.ok(moved.x<=.5+1e-6);
});

test('thick vertical wall sections are not misclassified as overhead ceilings',()=>{
  const wall={x:0,z:0,hx:2,hz:2,bottom:4.08,top:5.08};
  const result=resolveCeilingCollision([wall],0,3.5,0,4.5);
  assert.equal(result.ceilingHit,false);
  assert.equal(result.y,4.5);
});
