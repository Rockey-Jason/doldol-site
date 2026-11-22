import test from 'node:test';
import assert from 'node:assert/strict';
import { ENERGY_CUBE_RULES, isEnemyInsideEnergyCube } from './energy-cube.js';

test('energy cube lasts five seconds and uses a bounded damage pulse', () => {
  assert.equal(ENERGY_CUBE_RULES.durationMs, 5_000);
  assert.equal(ENERGY_CUBE_RULES.damageIntervalMs, 500);
  assert.equal(ENERGY_CUBE_RULES.damage, 4);
  assert.equal(ENERGY_CUBE_RULES.radius, 4.6);
});

test('energy cube affects an enemy inside its radius', () => {
  assert.equal(isEnemyInsideEnergyCube(1, 0, 3, 0, 0, 0), true);
});

test('energy cube does not affect a teammate', () => {
  assert.equal(isEnemyInsideEnergyCube(0, 0, 1, 1, 0, 0), false);
});

test('energy cube does not affect an enemy outside its radius', () => {
  assert.equal(isEnemyInsideEnergyCube(1, 0, 4.7, 0, 0, 0), false);
});

test('energy cube boundary is included', () => {
  assert.equal(isEnemyInsideEnergyCube(1, 0, 4.6, 0, 0, 0), true);
});
