import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateNetwork, solveTwoBoneIK, summarizeSoak } from './qa-simulation.js';

test('network QA covers 1%, 5%, 10%, and 20% packet loss reproducibly',()=>{
  for(const lossPercent of [1,5,10,20]){
    const a=simulateNetwork({lossPercent,minDelayMs:50,maxDelayMs:300,seed:12345},5000);
    const b=simulateNetwork({lossPercent,minDelayMs:50,maxDelayMs:300,seed:12345},5000);
    assert.deepEqual(a,b);
    assert.ok(Math.abs(a.lossPercent-lossPercent)<1.5,lossPercent+'% loss tolerance');
    assert.ok(a.delivered+a.dropped===a.sent);
    assert.ok(a.maxDelayMsObserved<=300);
    assert.ok(a.averageDelayMs>=50&&a.averageDelayMs<=300);
  }
});

test('network simulator exercises 50ms through 300ms latency and packet reordering',()=>{
  const result=simulateNetwork({lossPercent:0,minDelayMs:50,maxDelayMs:300,seed:77},3000);
  assert.equal(result.dropped,0);
  assert.equal(result.delivered,3000);
  assert.ok(result.averageDelayMs>50&&result.averageDelayMs<300);
  assert.ok(result.reordered>0);
});

test('two-bone foot IK solver stays finite and within reachable leg length',()=>{
  for(const target of [[-.7,0],[-.5,.15],[-.2,.25],[.1,-.2]]){
    const solved=solveTwoBoneIK(.38,.37,target[0],target[1]);
    assert.ok(Number.isFinite(solved.hip));
    assert.ok(Number.isFinite(solved.knee));
    assert.ok(solved.distance<=.749);
    assert.ok(solved.distance>=.001);
  }
});

test('soak summary detects frame-rate and resource growth',()=>{
  const summary=summarizeSoak([
    {elapsedMs:0,fps:60,frameMs:16.7,heapMb:100,geometries:100,textures:30,drawCalls:80},
    {elapsedMs:60000,fps:58,frameMs:17.2,heapMb:104,geometries:100,textures:30,drawCalls:82},
    {elapsedMs:120000,fps:55,frameMs:18.1,heapMb:108,geometries:103,textures:31,drawCalls:85}
  ]);
  assert.equal(summary.samples,3);
  assert.equal(summary.durationMs,120000);
  assert.equal(summary.heapGrowthMb,8);
  assert.equal(summary.geometryGrowth,3);
  assert.equal(summary.textureGrowth,1);
});
