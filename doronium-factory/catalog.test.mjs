import test from "node:test";
import assert from "node:assert/strict";
import { CATALOG_ITEMS, CATALOG_RECIPES, CATALOG_MACHINES, CATALOG_PACKAGE_TARGETS, CATALOG_MACHINE_ROWS, validateCatalog } from "./catalog.js";
test("catalog inputs and outputs reference known resources", () => {
  const result = validateCatalog();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.ok(result.itemCount >= 150);
  assert.ok(result.recipeCount >= 150);
});
test("every machine has a unique ID and a construction recipe", () => {
  const ids = CATALOG_MACHINES.map(machine => machine.id);
  assert.equal(new Set(ids).size, ids.length);
  const machineRecipes = new Set(Object.values(CATALOG_RECIPES).map(recipe => recipe.output));
  for (const [itemId] of CATALOG_MACHINE_ROWS) {
    assert.ok(CATALOG_ITEMS[itemId], "missing machine item: " + itemId);
    assert.ok(machineRecipes.has(itemId), "missing machine construction recipe: " + itemId);
  }
});
test("every Doronium product supports three packaging stages", () => {
  assert.ok(CATALOG_PACKAGE_TARGETS.length >= 15);
  for (const [itemId] of CATALOG_PACKAGE_TARGETS) {
    for (const prefix of ["pack1_", "pack2_", "pack3_"]) assert.ok(CATALOG_ITEMS[prefix + itemId]);
    for (const stage of ["package1_", "package2_", "package3_"]) assert.ok(CATALOG_RECIPES[stage + itemId]);
  }
});
test("all recipes have valid time and output quantity", () => {
  for (const [id, recipe] of Object.entries(CATALOG_RECIPES)) {
    assert.ok(recipe.name && recipe.station, "missing metadata: " + id);
    assert.ok(Number.isFinite(recipe.time) && recipe.time > 0, "invalid duration: " + id);
    assert.ok(Number.isInteger(recipe.qty) && recipe.qty > 0, "invalid output: " + id);
  }
});