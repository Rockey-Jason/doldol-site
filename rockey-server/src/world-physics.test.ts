import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthoritativeDebris,stepAuthoritativeDebris} from './world-physics.js';

test('destruction debris is deterministic for the same server event id',()=>{
  const a=createAuthoritativeDebris('room:42',1,2,3,6,12);
  const b=createAuthoritativeDebris('room:42',1,2,3,6,12);
  assert.deepEqual(a,b);
  assert.equal(a.length,12);
  assert.equal(new Set(a.map(piece=>piece.id)).size,12);
});

test('server debris simulation advances, collides with floor and eventually sleeps',()=>{
  const bodies=createAuthoritativeDebris('room:floor',0,1,0,4,8);
  const initialY=bodies[0].y;
  for(let i=0;i<1000;i++)stepAuthoritativeDebris(bodies,.05,[],()=>0);
  assert.ok(bodies[0].y>=bodies[0].size*.5-.001);
  assert.ok(bodies[0].y!==initialY);
  assert.ok(bodies.every(body=>Number.isFinite(body.x)&&Number.isFinite(body.y)&&Number.isFinite(body.z)));
});

test('debris resolves against static cover volumes',()=>{
  const bodies=createAuthoritativeDebris('room:wall',0,1,-.1,4,1);
  const body=bodies[0];
  body.x=0;body.y=1;body.z=0;body.vx=0;body.vy=0;body.vz=-4;
  stepAuthoritativeDebris([body],.05,[{x:0,z:-.2,hx:2,hz:.1,top:3}],()=>0);
  assert.ok(body.z>-.31);
  assert.ok(body.vz>=0);
});
