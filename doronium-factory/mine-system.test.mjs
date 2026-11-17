import test from "node:test";
import assert from "node:assert/strict";
import {
  MINE_H, MINE_LEVELS, MINE_W, auditMineDeposits,
  makeMineDeposits, mineMainDriftZ, mineTunnelAt
} from "./terrain-system.js";

test("mine keeps five reachable levels, legacy shafts and connected drift access", () => {
  assert.equal(MINE_LEVELS, 5);
  assert.equal(mineTunnelAt(3, 12), true, "surface lift landing must remain reachable");
  assert.equal(mineTunnelAt(36, 12), true, "deep-level lift landing must remain reachable");
  assert.equal(mineTunnelAt(-1, 12), false);
  assert.equal(mineTunnelAt(12, MINE_H), false);
  for (const [x, z] of [[10, 7], [12, 15], [22, 8], [31, 12], [34, 18], [8, 17]]) {
    assert.equal(mineTunnelAt(x, z), true, `existing mine deposit coordinate ${x},${z} must remain accessible`);
  }
  assert.ok(mineMainDriftZ(8) >= 10 && mineMainDriftZ(8) <= 14);
  const openCells = Array.from({ length: MINE_H }, (_, z) =>
    Array.from({ length: MINE_W }, (_, x) => mineTunnelAt(x, z) ? 1 : 0).reduce((a, b) => a + b, 0)
  ).reduce((a, b) => a + b, 0);
  assert.ok(openCells > 100 && openCells < MINE_W * MINE_H * 0.7, "mine needs connected passages with solid rock left around them");
});

test("coal is distributed across every depth as substantial mineable seams", () => {
  const deposits = makeMineDeposits();
  const stats = auditMineDeposits(deposits);
  assert.equal(stats.levels, 5);
  assert.equal(stats.unreachableNodes, 0, "every generated mineral deposit must sit inside a walkable drift");
  assert.ok(stats.coalNodes >= 38, `expected at least 38 coal seam faces, got ${stats.coalNodes}`);
  assert.ok(stats.coalUnits >= 4000, `expected at least 4,000 coal units, got ${stats.coalUnits}`);
  for (let level = 1; level <= MINE_LEVELS; level++) {
    assert.ok(stats.byLevel[level].coalNodes >= 7, `level ${level} needs multiple coal seams`);
    assert.ok(stats.byLevel[level].coalUnits >= 650, `level ${level} needs a useful coal reserve`);
  }
});

test("mine deposit generation is deterministic and never creates natural Doronium veins", () => {
  const a = makeMineDeposits();
  const b = makeMineDeposits();
  assert.deepEqual(a, b);
  for (const node of Object.values(a)) {
    assert.equal(mineTunnelAt(node.x, node.z), true);
    assert.notEqual(node.type, "doronium_normal", "natural Doronium veins remain prohibited");
    assert.notEqual(node.type, "ITEM_DORONUM_NORMAL", "canonical natural Doronium veins remain prohibited");
  }
});
