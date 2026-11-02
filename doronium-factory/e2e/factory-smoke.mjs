import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.DORONIUM_BASE_URL || "http://127.0.0.1:8765/doronium-factory/";
const artifactDir = process.env.ARTIFACT_DIR || "test-artifacts";
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage"
  ]
});

const failures = [];
function capture(page, label) {
  page.on("pageerror", error => failures.push(`[${label}] ${error.stack || error.message}`));
}
async function boot(page) {
  await page.goto(baseURL + "?e2e=1", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(() => !!window.__doroniumFactoryTest, { timeout: 45000 });
  await page.waitForFunction(() => {
    const c = document.querySelector("#world-canvas");
    return c && c.width > 0 && c.height > 0;
  }, { timeout: 30000 });
  return page.evaluate(() => window.__doroniumFactoryTest.backend);
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  desktop.setDefaultTimeout(120000);
  capture(desktop, "desktop");
  const backend = await boot(desktop);
  assert.equal(backend, "webgl", "Desktop must create the real WebGL renderer (not the fallback)");

  const audit = await desktop.evaluate(() => window.__doroniumFactoryTest.audit());
  assert.equal(audit.variantCount, 15, "15 canonical Doronium variants must be present");
  assert.equal(audit.uniqueVariants, 15, "Variant IDs must be unique");
  assert.equal(audit.uniqueCrystalModels, 15, "All 15 variants must have 3D models");
  assert.equal(audit.uniqueCrystalShapes, 15, "Each variant must use a distinct geometry family");
  assert.equal(audit.allCrystalModels, true, "Every variant must resolve to a crystal model");
  assert.equal(audit.researchCount, 18, "18 research nodes must be present");
  assert.equal(audit.buildingCount, 22, "22 facility definitions must be present");
  assert.equal(audit.simulationStep, 0.1, "Simulation must use a fixed 0.1-second step");
  assert.equal(audit.variantRecipeCount, 14, "All fourteen non-base crystal recipes must be defined");
  assert.equal(audit.variantRecipesValid, true, "All variant recipe inputs must resolve");
  assert.equal(audit.researchGraphValid, true, "Research prerequisites must exist and form an acyclic graph");
  assert.equal(audit.fusionStageCount, 7, "Infinity fusion must contain seven stages");
  assert.equal(audit.fusionIdealDuration, 260, "Ideal fusion-stage duration must total 260 seconds");
  assert.equal(audit.recipeInputsValid, true, "All recipe input IDs must resolve");
  assert.equal(audit.buildingMaterialsValid, true, "All construction material IDs must resolve");

  await desktop.locator('[data-panel="inventory"]').click();
  assert.equal(await desktop.locator("[data-crystal]").count(), 16, "15 normal variants plus Infinity must be listed");
  await desktop.locator('[data-crystal="doronium_blue"]').click();
  await desktop.waitForSelector("#crystal-preview-canvas");
  const preview = await desktop.evaluate(() => {
    const c = document.querySelector("#crystal-preview-canvas");
    return { width: c.width, height: c.height, visible: c.getBoundingClientRect().width > 0 };
  });
  assert.ok(preview.visible && preview.width > 0 && preview.height > 0, "3D crystal preview must render to a visible canvas");
  await desktop.locator("#modal-x").click();
  const adventureStart = await desktop.evaluate(() => {
    const api = window.__doroniumFactoryTest;
    api.setViewMode("first");
    return api.move3D("w", 0.3);
  });
  assert.ok(adventureStart.z < 14, "First-person WASD movement must move the engineer through the 3D world");
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.viewMode()), "first");
  await desktop.evaluate(() => window.__doroniumFactoryTest.setViewMode("third"));
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.viewMode()), "third", "Third-person camera must be selectable");
  await desktop.evaluate(() => window.__doroniumFactoryTest.setViewMode("map"));
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.viewMode()), "map", "Factory strategy view must remain available");
  await desktop.evaluate(() => window.__doroniumFactoryTest.setViewMode("first"));

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSurvivalTest());
  const fed = await desktop.evaluate(() => window.__doroniumFactoryTest.consumeFood());
  assert.equal(fed.hunger, 88, "Eating Dori Meat must restore hunger");
  assert.equal(fed.health, 100, "Eating Dori Meat must restore a small amount of health");
  const hydrated = await desktop.evaluate(() => window.__doroniumFactoryTest.drinkWater());
  assert.equal(hydrated.thirst, 92, "Drinking water must restore thirst");
  const depleted = await desktop.evaluate(() => {
    const api=window.__doroniumFactoryTest;
    const state=api.snapshot();
    state.survival.hunger=0;state.survival.thirst=0;
    return api.survivalTick(5);
  });
  assert.ok(depleted.health < 100, "Hunger and thirst depletion must damage health");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupMiningTest());
  const mined = await desktop.evaluate(() => window.__doroniumFactoryTest.mineTarget());
  assert.equal(mined.target?.kind, "resource", "The screen-center ray must identify a 3D resource block");
  assert.equal(mined.target?.type, "stone", "The target resource should be the aimed stone block");
  assert.ok(mined.after > mined.before, "Mining an aimed block must add resources to the inventory");
  assert.equal(mined.node, 10, "A successful mining action must reduce the world node quantity");

  await desktop.locator('[data-panel="build"]').click();

  const synthetic = await desktop.evaluate(() => window.__doroniumFactoryTest.syntheticGuard());
  assert.equal(synthetic.status, "ERROR", "Reactor must reject synthetic Dori Meat");
  assert.equal(synthetic.remaining, 10, "Rejected synthetic inputs must not be consumed");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSoak());
  const beltBefore = await desktop.evaluate(() => window.__doroniumFactoryTest.loadBeltVisual("ironOre", 8));
  assert.equal(beltBefore.beltItemMeshes, 8, "A belt stack of eight units must create eight individual 3D item meshes");
  const beltAfter = await desktop.evaluate(() => {
    window.__doroniumFactoryTest.runSeconds(0.2);
    return window.__doroniumFactoryTest.inspect3D();
  });
  assert.ok(beltAfter.beltItemPositions.some((z, i) => Math.abs(z - beltBefore.beltItemPositions[i]) > 0.1), "Conveyor item meshes must animate along the belt according to the simulation move timer");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSoak());
  const machineInteraction = await desktop.evaluate(() => window.__doroniumFactoryTest.interactAt(2, 2));
  assert.equal(machineInteraction.selectedBuilding, "test-smelter", "Clicking a facility must select the correct machine");
  assert.ok(machineInteraction.path > 0, "Engineer must path toward an adjacent interaction tile instead of teleporting into the machine");
  await desktop.locator('[data-panel="build"]').click();
  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSoak());
  const nightPower = await desktop.evaluate(() => window.__doroniumFactoryTest.setClock(0));
  assert.ok(nightPower.ratio < 0.8, "Solar-only test factory must enter a low-power state at night");
  const powerGate = await desktop.evaluate(() => window.__doroniumFactoryTest.machinePowerGate());
  assert.equal(powerGate.status, "PAUSED_POWER", "A machine below the 0.8 power ratio must pause");
  assert.equal(powerGate.ironOreAfter, powerGate.ironOreBefore, "A power-paused machine must not consume inputs");
  const power = await desktop.evaluate(() => window.__doroniumFactoryTest.setClock(8 * 3600));
  assert.ok(power.gen >= power.used, "Solar generation should cover the test smelter at the initial daytime clock");
  assert.ok(power.ratio >= 0.8, "Test factory should not start in a power-starved state");

  const occupiedPath = await desktop.evaluate(() => window.__doroniumFactoryTest.testPath(2, 2));
  assert.equal(occupiedPath, null, "Character pathfinding must not route through a machine footprint");

  const soak = await desktop.evaluate(() => {
    const result = window.__doroniumFactoryTest.runSeconds(3600);
    return {
      ticks: result.ticks,
      seconds: result.state.seconds,
      produced: result.state.stats.produced.ironPlate || 0,
      inventory: result.state.inventory.ironPlate || 0,
      beltOccupied: result.state.buildings.some(b => b.type === "belt" && !!b.item),
      ledger: window.__doroniumFactoryTest.ledger()
    };
  });
  assert.equal(soak.ticks, 36000, "A virtual hour must execute exactly 36,000 fixed 0.1-second ticks");
  assert.ok(soak.seconds >= 8 * 3600 + 3600 - 0.001, "Simulation clock must advance by one virtual hour");
  assert.ok(soak.produced > 0, "Smelter must produce during the one-hour soak");
  assert.ok(soak.inventory > 0, "Conveyor must route finished plates into storage");
  assert.equal(soak.ledger.oreBalance, 50000, "Ore + in-process and finished-plate equivalent must be conserved");
  assert.equal(soak.ledger.coalBalance, 30000, "Coal + in-process and finished-plate equivalent must be conserved");
  await desktop.screenshot({ path: path.join(artifactDir, "doronium-desktop.png"), fullPage: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobile = await mobileContext.newPage();
  capture(mobile, "mobile-emulation");
  const mobileBackend = await boot(mobile);
  assert.equal(mobileBackend, "webgl", "Mobile-emulation browser must initialize WebGL");
  assert.equal(await mobile.locator(".move-pad").isVisible(), true, "Touch movement pad must be visible on a phone-sized viewport");
  const moveChoice = await mobile.evaluate(() => {
    const api = window.__doroniumFactoryTest;
    const s = api.snapshot();
    for (const [dx, dy, value] of [[1,0,"1,0"],[0,1,"0,1"],[-1,0,"-1,0"],[0,-1,"0,-1"]]) {
      if (api.testPath(s.player.x + dx, s.player.y + dy) !== null) return value;
    }
    return null;
  });
  assert.ok(moveChoice, "There must be at least one walkable adjacent tile for mobile movement");
  await mobile.locator(`.move-pad [data-move="${moveChoice}"]`).click();
  await mobile.waitForTimeout(500);
  const moved = await mobile.evaluate(() => {
    const s = window.__doroniumFactoryTest.snapshot();
    return { x: s.player.x, y: s.player.y };
  });
  assert.ok(moved.x !== 18 || moved.y !== 14, "Touch movement control must move the engineer");
  await mobile.screenshot({ path: path.join(artifactDir, "doronium-mobile-emulation.png"), fullPage: true });

  assert.deepEqual(failures, [], "No uncaught browser JavaScript errors are allowed");
  console.log(JSON.stringify({
    result: "PASS",
    renderer: backend,
    mobileRenderer: mobileBackend,
    audit,
    soak,
    mobile: { viewport: "390x844", touchPad: "visible", moved },
    screenshots: ["doronium-desktop.png", "doronium-mobile-emulation.png"]
  }, null, 2));
  await mobileContext.close();
  await desktop.close();
} catch (error) {
  console.error(error);
  if (failures.length) console.error(failures.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
