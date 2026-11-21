import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS} from './catalog.js';
import {isBlockedByCover,tacticalFloorHeightAt} from './world-navigation.js';

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
      const stairX=centerX+innerSide*2.5;
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
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*3.55,-1.5,5.11),4.19,
        map.id+' bridge-side upper gallery has no walkable floor');
      assert.equal(tacticalFloorHeightAt(centerX+innerSide*2.5,-.9,5.11),4.19,
        map.id+' upper cross-walk does not connect the stairwell to the gallery');
      assert.equal(isBlockedByCover(map.cover,centerX+innerSide*2.5,5.11,-.9),false,
        map.id+' blocks the upper cross-walk');
      assert.equal(isBlockedByCover(map.cover,centerX+innerSide*3.55,5.11,-1.5),false,
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
