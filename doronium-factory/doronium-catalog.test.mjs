import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_DORONIUM_IDS, SAFE_LEGACY_DORONIUM_MAP, AMBIGUOUS_LEGACY_DORONIUM_IDS,
  planDoroniumMigration, selectQualifiedDoroniumManifest
} from "./doronium-catalog.js";

test("canonical Doronium catalog has exactly the fifteen B9 identifiers", () => {
  assert.equal(CANONICAL_DORONIUM_IDS.length, 15);
  assert.equal(new Set(CANONICAL_DORONIUM_IDS).size, 15);
  assert.ok(CANONICAL_DORONIUM_IDS.every(id => id.startsWith("ITEM_DORONUM_")));
});

test("legacy migration maps only explicitly equivalent variants", () => {
  assert.equal(Object.keys(SAFE_LEGACY_DORONIUM_MAP).length, 11);
  assert.equal(SAFE_LEGACY_DORONIUM_MAP.doronium_normal, "ITEM_DORONUM_NORMAL");
  assert.equal(SAFE_LEGACY_DORONIUM_MAP.doronium_clear, "ITEM_DORONUM_TRANSLUCENT");
  for (const id of AMBIGUOUS_LEGACY_DORONIUM_IDS) assert.equal(SAFE_LEGACY_DORONIUM_MAP[id], undefined);
});

test("migration audit preserves ambiguous legacy items and does not mutate input", () => {
  const state = { inventory: {
    doronium_normal: 5, doronium_prismatic: 3, doronium_void: 2, ironOre: 9
  }};
  const before = structuredClone(state);
  const report = planDoroniumMigration(state);
  assert.deepEqual(state, before);
  assert.equal(report.applied, false);
  assert.equal(report.mapped[0].targetID, "ITEM_DORONUM_NORMAL");
  assert.equal(report.unresolved.reduce((sum, row) => sum + row.quantity, 0), 5);
  assert.equal(report.unaffected[0].itemID, "ironOre");
});

test("canonical manifest requires 100 of each exact ID from individually eligible stacks", () => {
  const stacks = CANONICAL_DORONIUM_IDS.map((itemID, index) => ({
    runtimeID: "IS-" + index, itemID, quantity: 60, quality: 95, purity: 91, synthetic: false
  })).concat(CANONICAL_DORONIUM_IDS.map((itemID, index) => ({
    runtimeID: "IS-B-" + index, itemID, quantity: 40, quality: 90, purity: 90, synthetic: false
  })));
  const result = selectQualifiedDoroniumManifest(stacks, 100);
  assert.equal(result.valid, true);
  assert.equal(result.totalQuantity, 1500);
  assert.equal(result.manifest.length, 30);
});

test("canonical manifest rejects aggregate-quality substitution, synthetic inputs and legacy aliases", () => {
  const stacks = CANONICAL_DORONIUM_IDS.map((itemID, index) => ({
    runtimeID: "IS-" + index, itemID, quantity: 100, quality: 100, purity: 100, synthetic: false
  }));
  stacks[0] = { ...stacks[0], quality: 89 };
  stacks[1] = { ...stacks[1], synthetic: true };
  stacks.pop();
  stacks.push({ runtimeID: "IS-legacy", itemID: "doronium_blue", quantity: 100, quality: 100, purity: 100, synthetic: false });
  const result = selectQualifiedDoroniumManifest(stacks, 100);
  assert.equal(result.valid, false);
  assert.equal(result.manifest.length, 0);
  assert.equal(result.errors.length, 3);
});
