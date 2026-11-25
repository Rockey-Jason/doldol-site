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
test("metallurgical processes retain the specification temperature and pressure windows", () => {
  const bands = {
    sandstone_compression: [20, 300, 100, 300],
    steel_compression: [1300, 1800, 100, 1200],
    titanium_compression: [1700, 2200, 200, 1500],
    carbon_compression: [1500, 2500, 1000, 2500],
    molten_iron: [1450, 1700, 0, 500],
    molten_gold: [950, 1200, 0, 300],
    molten_diamond: [3500, 5000, 8000, 15000],
    molten_neodymium: [1800, 2800, 300, 1800],
    neodymium_magnet_melt: [1100, 1500, 500, 2000],
    molten_copper: [1000, 1300, 0, 300],
    molten_nickel: [1400, 1700, 0, 500],
    molten_lead: [300, 500, 0, 200],
    molten_chromium: [1800, 2100, 100, 700],
    rubber_from_sap: [150, 350, 0, 50]
  };
  for (const [id, expected] of Object.entries(bands)) {
    const recipe = CATALOG_RECIPES[id];
    assert.ok(recipe, "missing process recipe: " + id);
    assert.deepEqual([recipe.safeTemperatureMin, recipe.safeTemperatureMax, recipe.safePressureMin, recipe.safePressureMax], expected, "incorrect safe process window: " + id);
  }
  assert.ok(CATALOG_RECIPES.molten_iron.stations.includes("doronium_electric_furnace"));
  assert.ok(CATALOG_RECIPES.molten_iron.stations.includes("furnace"));
});

test("all recipes have valid time and output quantity", () => {
  for (const [id, recipe] of Object.entries(CATALOG_RECIPES)) {
    assert.ok(recipe.name && recipe.station, "missing metadata: " + id);
    assert.ok(Number.isFinite(recipe.time) && recipe.time > 0, "invalid duration: " + id);
    assert.ok(Number.isInteger(recipe.qty) && recipe.qty > 0, "invalid output: " + id);
  }
});