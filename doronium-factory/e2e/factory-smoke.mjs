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
async function openPanel(page, panel) {
  const panelRoot = page.locator('#control-column');
  if (!(await panelRoot.isVisible())) await page.locator('#game-menu-toggle').click();
  await page.locator('[data-panel="' + panel + '"]').click();
  await panelRoot.waitFor({ state: 'visible' });
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
  const perfBefore = await desktop.evaluate(() => window.__doroniumFactoryTest.inspect3D());
  assert.equal(perfBefore.terrainChunkCount, 30, "The optimized 192×160 world must use 30 larger independently cullable terrain chunks");
  await desktop.waitForTimeout(600);
  const perfAfter = await desktop.evaluate(() => window.__doroniumFactoryTest.inspect3D());
  assert.equal(perfAfter.rebuildCount, perfBefore.rebuildCount, "Static frames must not rebuild the full world scene");
  assert.ok(perfAfter.renderCount - perfBefore.renderCount < 50, "The main loop must render at most once per 60Hz frame");
  assert.ok(perfAfter.pixelRatio > 0 && perfAfter.pixelRatio <= perfAfter.basePixelRatio, "Adaptive render resolution must remain within device limits");

  const audit = await desktop.evaluate(() => window.__doroniumFactoryTest.audit());
  assert.equal(audit.dataValidation.valid, true, "All game data references and research dependencies must validate");
  assert.equal(audit.runtimeValidation.valid, true, "Initial item stacks and reservations must validate");
  assert.equal(audit.variantCount, 15, "15 canonical Doronium variants must be present");
  assert.equal(audit.uniqueVariants, 15, "Variant IDs must be unique");
  assert.equal(audit.uniqueCrystalModels, 15, "All 15 variants must have 3D models");
  assert.equal(audit.uniqueCrystalShapes, 15, "Each variant must use a distinct geometry family");
  assert.equal(audit.allCrystalModels, true, "Every variant must resolve to a crystal model");
  assert.equal(audit.researchCount, 18, "18 research nodes must be present");
  assert.equal(audit.skillNodeCount, 20, "The separate specialization tree must define twenty real skill nodes");
  assert.equal(audit.skillGroupCount, 5, "The skill tree must contain five specialization groups");
  assert.equal(audit.skillTreeValidation.valid, true, "All skill prerequisites and tiers must validate");
  assert.equal(audit.skillStateValidation.valid, true, "Skill points and unlocked nodes must validate");
  assert.equal(audit.buildingCount, 23, "23 facility definitions, including the adaptive conveyor, must be present");
  assert.equal(audit.worldWidth, 192, "The world must be expanded to 192 tiles wide");
  assert.ok(audit.outerResourceCount > 20, "The expanded continent must contain natural resource patches");
  assert.equal(audit.worldHeight, 160, "The world must be expanded to 160 tiles high");
  assert.equal(audit.mineLevels, 5, "The mine must expose five depth levels");
  assert.equal(audit.biomeCount, 8, "Eight distinct surface biomes must be generated");
  assert.ok(audit.terrainHeightRange[1] - audit.terrainHeightRange[0] > 90, "Terrain must have pronounced valleys, ridgelines and highlands");
  assert.equal(audit.surfaceHasExposedOre, false, "Surface mineral deposits must be removed");
  assert.equal(audit.simulationStep, 0.1, "Simulation must use a fixed 0.1-second step");
  assert.equal(audit.variantRecipeCount, 14, "All fourteen non-base crystal recipes must be defined");
  assert.equal(audit.variantRecipesValid, true, "All variant recipe inputs must resolve");
  assert.equal(audit.researchGraphValid, true, "Research prerequisites must exist and form an acyclic graph");
  assert.equal(audit.fusionStageCount, 7, "Infinity fusion must contain seven stages");
  assert.equal(audit.fusionIdealDuration, 260, "Ideal fusion-stage duration must total 260 seconds");
  assert.equal(audit.recipeInputsValid, true, "All recipe input IDs must resolve");
  assert.equal(audit.buildingMaterialsValid, true, "All construction material IDs must resolve");

  await openPanel(desktop, "inventory");
  assert.equal(await desktop.locator("[data-crystal]").count(), 16, "15 normal variants plus Infinity must be listed");
  await desktop.locator('[data-crystal="doronium_blue"]').click();
  await desktop.waitForSelector("#crystal-preview-canvas");
  const preview = await desktop.evaluate(() => {
    const c = document.querySelector("#crystal-preview-canvas");
    return { width: c.width, height: c.height, visible: c.getBoundingClientRect().width > 0 };
  });
  assert.ok(preview.visible && preview.width > 0 && preview.height > 0, "3D crystal preview must render to a visible canvas");
  await desktop.locator("#modal-x").click();
  await openPanel(desktop, "research");
  assert.equal(await desktop.locator("[data-skill]").count(), 20, "All twenty specialization nodes must be visible");
  await desktop.locator('[data-skill="FIELD_SURVEYOR"]').click();
  await desktop.locator('[data-modal-action="1"]').click();
  const skillUnlock = await desktop.evaluate(() => window.__doroniumFactoryTest.snapshot().skills);
  assert.deepEqual(skillUnlock.unlockedSkillIDs, ["FIELD_SURVEYOR"], "A confirmed first-tier skill must unlock and persist in state");
  assert.equal(skillUnlock.availablePoints, 0, "Unlocking a skill must spend exactly one point");
  await desktop.locator("#panel-close").click();
  const rendererAudit = await desktop.evaluate(() => ({
    scene: window.__doroniumFactoryTest.inspect3D(),
    performance: window.__doroniumFactoryTest.inspectPerformance()
  }));
  assert.ok(rendererAudit.scene.nodeBatchDrawCalls <= 8, "Trees, Dori trees and water should be rendered in a small number of instanced batches");
  assert.ok(rendererAudit.scene.nodeBatchInstances > 0, "Visible surface resources must be present in instanced batches");
  assert.ok(rendererAudit.scene.terrainChunkCount <= 30, "The terrain should use larger culling chunks to reduce draw calls");
  assert.ok(rendererAudit.performance.drawCalls < 180, "The initial scene should avoid excessive WebGL draw calls");

  const adventureStart = await desktop.evaluate(() => {
    const api = window.__doroniumFactoryTest;
    api.setViewMode("first");
    return api.move3D("w", 0.3);
  });
  assert.ok(adventureStart.z < 52, "First-person WASD movement must move the engineer through the expanded 3D world");
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.viewMode()), "first");
  const firstPersonVisual = await desktop.evaluate(() => window.__doroniumFactoryTest.inspect3D());
  assert.equal(firstPersonVisual.playerVisible, false, "The third-person avatar must be hidden in first-person");
  assert.equal(firstPersonVisual.firstPersonHandsVisible, true, "First-person arms and the mining tool must be rendered");
  await desktop.evaluate(() => window.__doroniumFactoryTest.setViewMode("third"));
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.viewMode()), "third", "Third-person camera must be selectable");
  const thirdPersonVisual = await desktop.evaluate(() => window.__doroniumFactoryTest.inspect3D());
  assert.equal(thirdPersonVisual.playerVisible, true, "The engineer avatar must be visible in third-person");
  assert.equal(thirdPersonVisual.firstPersonHandsVisible, false, "First-person hands must be hidden in third-person");
  await desktop.evaluate(() => window.__doroniumFactoryTest.setViewMode("map"));
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.viewMode()), "map", "Factory strategy view must remain available");
  const mapVisual = await desktop.evaluate(() => window.__doroniumFactoryTest.inspect3D());
  assert.equal(mapVisual.playerVisible, true, "The engineer avatar must reappear in the strategy map");
  assert.equal(mapVisual.firstPersonHandsVisible, false, "First-person hands must stay hidden in the strategy map");
  await desktop.evaluate(() => window.__doroniumFactoryTest.setViewMode("first"));

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSurvivalTest());
  assert.equal(await desktop.locator("#control-column").evaluate(el => el.classList.contains("panel-open")), false, "The panel overlay must be closed before testing the adventure HUD");
  await desktop.locator('[data-tool="pickaxe"]').waitFor({ state: "visible" });
  await desktop.locator("#eat-button").waitFor({ state: "visible" });
  await desktop.locator("#drink-button").waitFor({ state: "visible" });
  assert.equal(await desktop.evaluate(() => document.pointerLockElement === document.querySelector("#world-canvas")), false, "Desktop controls must remain clickable without automatic pointer lock");
  await desktop.locator("#eat-button").click();
  const fed = await desktop.evaluate(() => ({ survival: window.__doroniumFactoryTest.survival(), inventory: window.__doroniumFactoryTest.snapshot().inventory }));
  assert.equal(fed.survival.hunger, 88, "Clicking the desktop Eat button must restore hunger");
  assert.equal(fed.survival.health, 100, "Eating Dori Meat must restore a small amount of health");
  assert.equal(fed.inventory.doriMeat, 1, "Clicking Eat must consume exactly one Dori Meat");
  await desktop.locator("#drink-button").click();
  const hydrated = await desktop.evaluate(() => ({ survival: window.__doroniumFactoryTest.survival(), inventory: window.__doroniumFactoryTest.snapshot().inventory }));
  assert.equal(hydrated.survival.thirst, 92, "Clicking the desktop Drink button must restore thirst");
  assert.equal(hydrated.inventory.water, 2, "Clicking Drink must consume exactly one water");
  const depleted = await desktop.evaluate(() => window.__doroniumFactoryTest.survivalTick(5, true));
  assert.ok(depleted.health < 100, "Hunger and thirst depletion must damage health");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupMiningTest());
  const miningBefore = await desktop.evaluate(() => ({ stone: window.__doroniumFactoryTest.snapshot().inventory.stone || 0 }));
  await desktop.locator("#action-button").click();
  const miningAfter = await desktop.evaluate(() => window.__doroniumFactoryTest.snapshot());
  assert.equal(miningAfter.inventory.stone, miningBefore.stone + 2, "Clicking the desktop Use button must mine the aimed stone vein");
  assert.equal(miningAfter.mineDeposits["1:8:12"].amount, 10, "A successful mouse Use action must reduce the vein by two");
  assert.equal(miningAfter.player.layer, "mine", "The Use button must preserve the underground layer");
  const toolGuard = await desktop.evaluate(() => window.__doroniumFactoryTest.toolGuard());
  assert.equal(toolGuard.tool, "axe", "The tool guard must register the equipped axe");
  assert.equal(toolGuard.after, toolGuard.before, "An axe must not mine stone");
  const construction = await desktop.evaluate(() => window.__doroniumFactoryTest.constructionRules());
  assert.equal(construction.standardWithoutFoundation, false, "A standard conveyor must require land preparation");
  assert.equal(construction.adaptiveWithoutFoundation, true, "An adaptive conveyor must bridge unprepared terrain");
  assert.ok(construction.adaptiveBeltTilts.length >= 1, "The adaptive belt must expose terrain-derived deck pitch and roll");
  assert.ok(construction.adaptiveBeltTilts.some(s => Math.abs(s.x) > 0.01 || Math.abs(s.z) > 0.01), "The adaptive belt must actually tilt to match uneven ground");
  assert.equal(construction.standardWithFoundation, true, "A standard conveyor must place on a prepared foundation");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupBlueprintTest());
  await openPanel(desktop, "build");
  await desktop.locator("#blueprint-name").fill("회귀 테스트 설계도");
  await desktop.locator("#blueprint-save").click();
  assert.equal(await desktop.locator(".blueprint-card").count(), 1, "The in-game UI must save a multi-building blueprint");
  await desktop.locator('.blueprint-card [data-blueprint-action="duplicate"]').first().click();
  assert.equal(await desktop.locator(".blueprint-card").count(), 2, "Blueprint duplication must create a separate saved entry");
  await desktop.locator('.blueprint-card [data-blueprint-action="place"]').first().click();
  await desktop.locator('.blueprint-card [data-blueprint-action="rotate"]').first().click();
  const blueprintResult = await desktop.evaluate(() => window.__doroniumFactoryTest.blueprintPlaceAt(20, 20));
  assert.equal(blueprintResult.ok, true, "Rotated blueprint placement must commit atomically");
  assert.equal(blueprintResult.buildings.length, 4, "A two-building blueprint must install both buildings, exactly once");
  assert.deepEqual(blueprintResult.buildings.slice(-2).map(b => [b.x, b.y]), [[20, 20], [20, 21]], "A 90-degree rotation must rotate the full blueprint layout");
  assert.equal(blueprintResult.money, 999976, "Blueprint money must be charged once for the complete transaction");

  const powerSetup = await desktop.evaluate(() => window.__doroniumFactoryTest.setupPowerTopologyTest());
  assert.equal(powerSetup.near.ratio, 1, "A smelter connected to the solar generator through cables must receive full power");
  assert.equal(powerSetup.far.ratio, 0, "A disconnected smelter must not receive power from another network");
  assert.notEqual(
    powerSetup.power.networks.find(n => n.nodeIDs.includes("P-SMELTER-1"))?.networkID,
    powerSetup.power.networks.find(n => n.nodeIDs.includes("P-SMELTER-2"))?.networkID,
    "Cable topology must create separate power network IDs"
  );
  const powerTick = await desktop.evaluate(() => window.__doroniumFactoryTest.powerTopologyTick());
  assert.ok(powerTick.battery > 0.39 && powerTick.battery < 0.41, "The battery must charge by 0.4kJ during one 0.1-second tick at 4kW");
  assert.equal(powerTick.far.ratio, 0, "A remote grid must remain isolated after a simulation tick");

  const miningSetup = await desktop.evaluate(() => window.__doroniumFactoryTest.setupMiningAutomationTest());
  assert.equal(miningSetup.generator, true, "A mine generator must be placeable in an underground tunnel");
  assert.equal(miningSetup.miner, true, "An iron drill must install on a matching underground iron deposit");
  assert.equal(miningSetup.deposit.amount, 28, "Installing a drill must not consume the deposit");
  const miningResult = await desktop.evaluate(() => window.__doroniumFactoryTest.runMiningAutomationTest());
  assert.equal(miningResult.output.id, "ironOre", "The automatic miner must extract its matching mineral");
  assert.equal(miningResult.output.qty, 1, "One extraction cycle must produce exactly one ore");
  assert.equal(miningResult.depositAmount, 27, "One extraction cycle must reduce the source deposit exactly once");
  assert.ok(miningResult.drillDurability < 1000, "Extraction must wear the drill");
  assert.equal(miningResult.power.status, "RUNNING", "The underground generator must power the connected drill");
  const repairResult = await desktop.evaluate(() => window.__doroniumFactoryTest.runDrillRepairTest());
  assert.equal(repairResult.ok, true, "A worn drill must consume repair materials and return to service");
  assert.equal(repairResult.drillDurability, 1000, "Repair must restore drill durability");

  const synthetic = await desktop.evaluate(() => window.__doroniumFactoryTest.syntheticGuard());
  assert.equal(synthetic.status, "ERROR", "Reactor must reject synthetic Dori Meat");
  assert.equal(synthetic.remaining, 10, "Rejected synthetic inputs must not be consumed");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSoak());
  const beltRebuildBefore = await desktop.evaluate(() => window.__doroniumFactoryTest.inspect3D().rebuildCount);
  const beltCap = await desktop.evaluate(() => window.__doroniumFactoryTest.loadBeltVisual("ironOre", 24));
  assert.equal(beltCap.beltItemMeshes, 8, "A large conveyor stack must be represented by at most eight lightweight visual meshes");
  const beltBefore = await desktop.evaluate(() => window.__doroniumFactoryTest.loadBeltVisual("ironOre", 8));
  assert.equal(beltBefore.beltItemMeshes, 8, "A belt stack of eight units must create eight individual 3D item meshes");
  assert.equal(beltBefore.rebuildCount, beltRebuildBefore, "Changing belt cargo must not rebuild the full terrain scene");
  const beltAfter = await desktop.evaluate(() => {
    window.__doroniumFactoryTest.runSeconds(0.2);
    return window.__doroniumFactoryTest.inspect3D();
  });
  assert.ok(beltAfter.beltItemPositions.some((z, i) => Math.abs(z - beltBefore.beltItemPositions[i]) > 0.1), "Conveyor item meshes must animate along the belt according to the simulation move timer");

  await desktop.evaluate(() => window.__doroniumFactoryTest.setupSoak());
  const machineInteraction = await desktop.evaluate(() => window.__doroniumFactoryTest.interactAt(2, 2));
  assert.equal(machineInteraction.selectedBuilding, "test-smelter", "Clicking a facility must select the correct machine");
  assert.ok(machineInteraction.path > 0, "Engineer must path toward an adjacent interaction tile instead of teleporting into the machine");
  await openPanel(desktop, "build");
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
  // Free the desktop WebGL context before creating the mobile WebGL context.
  await desktop.close();

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
  assert.ok(moved.x !== 72 || moved.y !== 52, "Touch movement control must move the engineer");
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
} catch (error) {
  console.error(error);
  if (failures.length) console.error(failures.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
