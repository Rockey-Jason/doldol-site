import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from './catalog.js';
import {isBlockedByCover,tacticalFloorHeightAt,ROCKEY_PLAYER_COLLISION,ROCKEY_UNDERPASS} from './world-navigation.js';

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
      for(let localZ=2.35;localZ>=-2.55;localZ-=.08){
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
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*3.05,-.9,5.11),4.19,
        map.id+' upper cross-walk does not connect the stairwell to the gallery');
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
      for(let localZ=2.35;localZ>=-2.5;localZ-=.08){
        const floor=((2.35-localZ)/4.85)*4.19;
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
  assert.equal(actualClearance,ROCKEY_UNDERPASS.clearHeight);
  assert.ok(actualClearance>ROCKEY_PLAYER_COLLISION.standingHeight+ROCKEY_PLAYER_COLLISION.skin,
    'underpass ceiling must leave room for the full capsule and controller skin');
  assert.equal(ROCKEY_UNDERPASS.ceilingBottom,-.28,
    'underpass roof underside must align with the split arena-floor footprint');
});
