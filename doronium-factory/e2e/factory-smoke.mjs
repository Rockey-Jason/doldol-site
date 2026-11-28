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
  assert.equal(audit.catalogValidation.valid, true, "Every catalogue recipe must resolve all input and output items");
  assert.ok(audit.catalogItemCount >= 250, "The full item, equipment, machine and packaging catalogue must be registered");
  assert.ok(audit.catalogRecipeCount >= 200, "The full production, construction and packaging recipes must be registered");
  assert.equal(audit.catalogMachineCount, 50, "All 50 machine designs must be registered in the encyclopedia");
  assert.equal(audit.buildingCount, 69, "46 new installable machine definitions plus legacy facilities must be registered");
  assert.equal(audit.runtimeValidation.valid, true, "Initial item stacks and reservations must validate");
  assert.equal(audit.mineValidation.valid, true, "Every independent mine tunnel and deposit registry must validate");
  assert.equal(audit.mineCount, 5, "The five surface entrances must each have an independent mine instance");
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
  assert.equal(audit.buildingCount, 69, "Legacy facilities and all 46 additional catalogue machine definitions must be registered");
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
  await openPanel(desktop, "catalog");
  await desktop.locator("#catalog-search").fill("도로늄");
  assert.ok(await desktop.locator(".catalog-card").count() > 0, "The encyclopedia must search Doronium items");
  await desktop.locator("#catalog-search").fill("");
  await desktop.locator("#catalog-mode").selectOption("recipes");
  assert.ok(await desktop.locator(".catalog-recipe-card").count() >= 150, "The encyclopedia must list the full production and packaging recipe catalogue");
  await desktop.locator("#catalog-mode").selectOption("machines");
  assert.ok(await desktop.locator(".catalog-machine-card").count() >= 45, "The encyclopedia must list the new industrial machine designs");
  await desktop.locator("#catalog-category").selectOption("power");
  assert.ok(await desktop.locator(".catalog-machine-card").count() >= 3, "Power facilities must be filterable by category");
  await desktop.locator("#catalog-category").selectOption("all");
  const migration = await desktop.evaluate(() => window.__doroniumFactoryTest.saveMigrationTest());
  assert.equal(migration.worldVersion, 6, "Legacy saves must upgrade to the independent-mine world schema");
  assert.equal(migration.legacyAmount, 7, "The original depleted legacy vein must preserve its remaining amount");
  assert.equal(migration.newOrePresent, true, "The migrated mine must backfill missing legacy mineral definitions");
  assert.equal(migration.newOreType, "aluminumOre", "New mineral deposits must keep their canonical type");
  assert.equal(migration.otherMineCount, 4, "A legacy mine save must initialize the other four mine instances");
  assert.equal(migration.otherMineIndependent, true, "New mine deposits must not share the legacy mine's deposit map");
  assert.equal(migration.saveValid, true, "Migrated world state must pass the save runtime validator");
  assert.equal(migration.mineValid, true, "Migrated independent mine state must pass mine topology and deposit validation");
  const expandedSystems = await desktop.evaluate(() => window.__doroniumFactoryTest.expandedSystemsTest());
  assert.equal(expandedSystems.bridge.placed, true, "A bridge machine item must install on a river tile");
  assert.equal(expandedSystems.bridge.walkable, true, "A placed bridge must become a walkable path across water");
  assert.ok(expandedSystems.treeNutrition.amount > 0, "Tree nutrition must restore depleted tree resources");
  assert.ok(expandedSystems.accelerated.boostUntil > 0, "Tree growth accelerator must create a timed growth effect");
  assert.equal(expandedSystems.permanent.enabled, true, "Permanent tree catalyst must enable passive tree regrowth");
  assert.equal(expandedSystems.elevator.after - expandedSystems.elevator.before, 2, "An elevator must transfer buffered mine items back into the warehouse");
  assert.equal(expandedSystems.elevator.remaining, 2, "The elevator must preserve the untransferred floor buffer");
  assert.equal(expandedSystems.waterElevatorRejectsSolid, true, "Water elevators must reject solid items");
  assert.equal(expandedSystems.transformer.count, 1, "A transformer must register in the factory grid");
  assert.ok(expandedSystems.transformer.near > 0, "A nearby machine must receive power through a connected transformer");
  assert.equal(expandedSystems.transformer.far, 0, "A remote machine outside the grid must be disconnected");
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
  assert.ok(rendererAudit.scene.nodeBatchDrawCalls <= 12, "Trees, Dori trees and water should be rendered in a small number of instanced batches");
  assert.ok(rendererAudit.scene.nodeBatchInstances > 0, "Visible surface resources must be present in instanced batches");
  assert.ok(rendererAudit.scene.terrainChunkCount <= 30, "The terrain should use larger culling chunks to reduce draw calls");
  assert.ok(rendererAudit.performance.drawCalls < 180, "The initial scene should avoid excessive WebGL draw calls");
  assert.equal(rendererAudit.scene.terrainGeometryType, "BufferGeometry", "The surface must use smooth heightfield meshes, not stacked tile cubes");
  assert.equal(rendererAudit.scene.terrainSurfaceModel, "smoothed-heightfield", "Terrain metadata must expose the continuous surface renderer");
  assert.ok(rendererAudit.scene.terrainSubdivisionsPerTile >= 2 && rendererAudit.scene.terrainSubdivisionsPerTile <= 4, "Terrain subdivision must adapt to device performance while retaining smooth slopes");
  assert.ok(Math.abs(rendererAudit.scene.terrainSampleHeight - Math.round(rendererAudit.scene.terrainSampleHeight / 3) * 3) > 0.01,
    "The renderer must use smooth non-quantized terrain heights instead of cached stepped height values");
  assert.ok(rendererAudit.scene.terrainVertexCount > 100000, "The expanded planet must expose a dense continuous terrain mesh");
  assert.equal(rendererAudit.scene.treeCanopyLayers, 3, "Trees must use layered natural low-poly canopies");
  const desktopCursor = await desktop.locator("#world-canvas").evaluate(el => getComputedStyle(el).cursor);
  assert.equal(desktopCursor, "none", "Desktop canvas must hide the OS mouse pointer");
  await desktop.keyboard.press("b");
  await desktop.locator("#control-column").waitFor({ state: "visible" });
  await desktop.keyboard.press("c");
  assert.equal(await desktop.locator("#panel-catalog").evaluate(el => el.classList.contains("active")), true,
    "The catalogue menu must be reachable through keyboard hotkeys");
  await desktop.keyboard.press("Escape");
  assert.equal(await desktop.locator("#control-column").evaluate(el => el.classList.contains("panel-open")), false,
    "Escape must close the keyboard menu");

  const movementStart = await desktop.evaluate(() => window.__doroniumFactoryTest.setupMovementTest());
  assert.deepEqual(movementStart, {x:72,z:52,viewMode:"first",paused:false},
    "The real-input test must begin on a clear, unpaused first-person surface");
  const beforeKeyboardMove = await desktop.evaluate(() => window.__doroniumFactoryTest.motion());
  await desktop.keyboard.down("w");
  assert.ok((await desktop.evaluate(() => window.__doroniumFactoryTest.heldKeys())).includes("w"),
    "A real browser W keydown must enter the movement input state");
  await desktop.waitForTimeout(350);
  await desktop.keyboard.up("w");
  const afterKeyboardMove = await desktop.evaluate(() => window.__doroniumFactoryTest.motion());
  assert.ok(afterKeyboardMove.z < beforeKeyboardMove.z,
    "A real browser WASD keydown/keyup pair must move the engineer through a clear tile");
  await desktop.keyboard.down("Space");
  assert.ok((await desktop.evaluate(() => window.__doroniumFactoryTest.heldKeys())).includes(" "),
    "The physical Space key must be normalized into the jump action state");
  await desktop.waitForFunction(() => window.__doroniumFactoryTest.motion().y > 0,
    {timeout:3000});
  const airborne = await desktop.evaluate(() => window.__doroniumFactoryTest.motion());
  assert.ok(airborne.y > 0 && !airborne.grounded,
    "The Space key must initiate a real vertical jump");
  await desktop.keyboard.up("Space");
  await desktop.waitForFunction(() => window.__doroniumFactoryTest.motion().grounded,
    {timeout:3000});
  const landed = await desktop.evaluate(() => window.__doroniumFactoryTest.motion());
  assert.equal(landed.grounded, true, "The engineer must land after a normal jump");
  assert.equal(landed.y, 0, "The jump must settle back onto the ground plane");
  await desktop.evaluate(() => window.__doroniumFactoryTest.holdKeyForTest("w"));
  assert.deepEqual(await desktop.evaluate(() => window.__doroniumFactoryTest.heldKeys()), ["w"],
    "The input regression fixture must establish a held movement key");
  await desktop.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.deepEqual(await desktop.evaluate(() => window.__doroniumFactoryTest.heldKeys()), [],
    "Losing browser focus must clear held movement and action keys");
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
  const primaryMine = miningAfter.mines[miningAfter.player.mineId];
  assert.equal(primaryMine.levels["1"].deposits["8,12"].amount, 10, "A successful mouse Use action must reduce only the active mine's vein by two");
  assert.equal(miningAfter.player.layer, "mine", "The Use button must preserve the underground layer");
  const mineIsolation = await desktop.evaluate(() => window.__doroniumFactoryTest.mineIsolationTest());
  assert.equal(mineIsolation.harvested, true, "A deposit in the selected mine must be harvestable");
  assert.equal(mineIsolation.afterA, mineIsolation.beforeA - 2, "The selected mine's own ore deposit must decrease");
  assert.equal(mineIsolation.afterB, mineIsolation.beforeB, "Mining one entrance must leave another mine's ore unchanged");
  assert.equal(mineIsolation.enteredA, mineIsolation.idA, "The first entrance must select its own independent mine");
  assert.equal(mineIsolation.enteredB, mineIsolation.idB, "The second entrance must select a different mine instance");
  assert.equal(mineIsolation.levelOnA, 3, "Entering the first mine must restore its own remembered depth");
  assert.equal(mineIsolation.levelOnB, 1, "Entering a different mine must start at that mine's remembered depth");
  assert.equal(mineIsolation.mineALevel, 3, "Descending in the second mine must not change the first mine's saved depth");
  assert.equal(mineIsolation.mineBLevel, 2, "Descending must update only the active mine's depth");
  assert.equal(mineIsolation.surfaceBuildingBlocked, true, "The fixture must place a surface building over the same tile coordinates");
  assert.equal(mineIsolation.mineCellWalkable, true, "Surface buildings must not block an underground tunnel cell");
  assert.equal(mineIsolation.minePathAvailable, true, "Underground pathfinding must ignore the surface building grid");
  assert.equal(mineIsolation.tunnelMapsDistinct, true, "Separate mine entrances must not share their tunnel topology");
  assert.equal(mineIsolation.depositMapsDistinct, true, "Separate mine entrances must not share their deposit maps");
  assert.equal(mineIsolation.valid, true, "All mine instances must remain structurally valid after independent mining");
  const toolGuard = await desktop.evaluate(() => window.__doroniumFactoryTest.toolGuard());
  assert.equal(toolGuard.tool, "axe", "The tool guard must register the equipped axe");
  assert.equal(toolGuard.after, toolGuard.before, "An axe must not mine stone");
  const construction = await desktop.evaluate(() => window.__doroniumFactoryTest.constructionRules());
  assert.equal(construction.standardWithoutFoundation, false, "A standard conveyor must require land preparation");
  assert.equal(construction.adaptiveWithoutFoundation, true, "An adaptive conveyor must bridge unprepared terrain");
  assert.ok(construction.adaptiveBeltTilts.length >= 1, "The adaptive belt must expose terrain-derived deck pitch and roll");
  assert.ok(construction.adaptiveBeltTilts.some(s => Math.abs(s.x) > 0.01 || Math.abs(s.z) > 0.01), "The adaptive belt must actually tilt to match uneven ground");
  assert.equal(construction.standardWithFoundation, true, "A standard conveyor must place on a prepared foundation");

  await openPanel(desktop, "build");

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
  // interactAt opens the selected facility details modal; dismiss it before opening another panel.
  await desktop.locator("#modal-x").click();
  await desktop.waitForFunction(() => !document.querySelector("#modal-overlay")?.classList.contains("show"));
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

  const fusionSetup = await desktop.evaluate(() => window.__doroniumFactoryTest.prepareFusionTest());
  assert.ok(fusionSetup.power.gen >= 40 && fusionSetup.power.ratio >= 0.8, "Fusion test rig must have sufficient power");
  await openPanel(desktop, "factory");
  await desktop.locator("#machine-fusion").click();
  await desktop.locator('[data-modal-action="1"]').click();
  const fusionReserved = await desktop.evaluate(() => window.__doroniumFactoryTest.fusionStatus());
  assert.equal(fusionReserved.job.inputCustody, "reserved", "Starting Fusion must reserve inputs instead of immediately consuming them");
  assert.equal(fusionReserved.activeReservations, 15, "Every one of the 15 variant inputs must receive one reservation");
  assert.equal(fusionReserved.valid, true, "Fusion reservations must preserve runtime invariants");
  assert.ok(Object.values(fusionReserved.stock).every(value => value === 100), "Reserved inputs must remain visible in warehouse totals");
  assert.ok(Object.values(fusionReserved.available).every(value => value === 0), "Reserved inputs must not be spendable elsewhere");
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.attemptSpendFusionInput()), false, "Other transactions must not spend a reserved Fusion input");

  await desktop.locator("#machine-fusion-cancel").click();
  const fusionCancelled = await desktop.evaluate(() => window.__doroniumFactoryTest.fusionStatus());
  assert.equal(fusionCancelled.job, null, "The player must be able to cancel an active Fusion job");
  assert.equal(fusionCancelled.activeReservations, 0, "Manual cancellation must release all 15 input reservations");
  assert.equal(fusionCancelled.valid, true, "Manually cancelled Fusion state must remain valid");
  assert.ok(Object.values(fusionCancelled.available).every(value => value === 100), "Manual cancellation must return all 1,500 inputs");

  await desktop.locator("#machine-fusion").click();
  await desktop.locator('[data-modal-action="1"]').click();
  const fusionRestarted = await desktop.evaluate(() => window.__doroniumFactoryTest.fusionStatus());
  assert.equal(fusionRestarted.job.inputCustody, "reserved", "Fusion must be restartable after a safe cancellation");
  assert.equal(fusionRestarted.activeReservations, 15, "Restart must create one fresh reservation per variant");
  assert.equal(await desktop.evaluate(() => window.__doroniumFactoryTest.attemptSpendFusionInput()), false, "Restarted Fusion inputs must again be locked");

  const fusionRecovery = await desktop.evaluate(() => window.__doroniumFactoryTest.removeFusionMachineForRecoveryTest());
  assert.equal(fusionRecovery.status.job, null, "A missing Fusion machine must safely cancel the job");
  assert.equal(fusionRecovery.status.activeReservations, 0, "Recovery must release all 15 reservations");
  assert.equal(fusionRecovery.status.valid, true, "Recovered Fusion state must pass runtime validation");
  assert.ok(Object.values(fusionRecovery.status.available).every(value => value === 100), "Recovery must return all 1,500 reserved inputs unchanged");

  const reservationGuards = await desktop.evaluate(() => window.__doroniumFactoryTest.reservationGuardTest());
  assert.deepEqual(reservationGuards.machineInput, {}, "Machine supply must not copy reserved ingredients into its input buffer");
  assert.equal(reservationGuards.moneyAfter, reservationGuards.moneyBefore, "Selling locked inventory must not mint currency");
  assert.equal(reservationGuards.soldAfter, reservationGuards.soldBefore, "A rejected sale must not increase the sales ledger");
  assert.deepEqual(reservationGuards.survivalAfter, reservationGuards.survivalBefore, "Reserved food and water must not grant survival effects");
  assert.deepEqual(reservationGuards.tree, { cooldown: 0, meat: 2 }, "A Dori tree must not yield fruit or start its cooldown without unreserved water");
  assert.deepEqual(reservationGuards.farm, { status: "NO_INPUT", progress: 59, meat: 2 }, "An automated Dori farm must pause without unreserved water");
  assert.deepEqual(reservationGuards.stock, { water: 8, doriMeat: 2, blue: 100 }, "All reserved inventory totals must remain intact");
  assert.deepEqual(reservationGuards.available, { water: 0, doriMeat: 0, blue: 0 }, "All test inputs must remain reserved");
  assert.equal(reservationGuards.runtimeValid, true, "All reservation-guard checks must preserve valid runtime state");
  assert.equal(reservationGuards.construction.attempted, true, "A clear building site must be found for the reserved-material test");
  assert.equal(reservationGuards.construction.placed, false, "Reserved materials must not pay for a new building");
  assert.equal(reservationGuards.construction.moneyAfter, reservationGuards.construction.moneyBefore, "A rejected construction must not charge currency");
  assert.equal(reservationGuards.construction.buildingsAfter, reservationGuards.construction.buildingsBefore, "A rejected construction must not place a free building");
  assert.deepEqual(reservationGuards.coalGenerator, { fuelTimer: 0, status: "NO_INPUT", power: 0, stock: 1, available: 0, runtimeValid: true }, "A coal generator must not receive free fuel from a reserved coal stack");

  const researchUi = await desktop.evaluate(() => window.__doroniumFactoryTest.researchAndFacilityPopupTest());
  assert.equal(researchUi.countdown, "남은 시간 17초", "Research cards must show the exact remaining seconds");
  assert.equal(researchUi.popupCountdown, "남은 시간 17초", "Selecting a research lab must open a management popup with the live countdown");
  assert.equal(researchUi.popupVisible, true, "Selecting a facility must open its management popup");
  assert.equal(researchUi.requirementsIncludeNames, true, "Research requirements must show exact Korean resource names: " + JSON.stringify(researchUi.researchText));
  assert.equal(researchUi.shortageVisible, true, "Research UI must identify the exact missing quantity for unavailable resources");
  assert.match(researchUi.popupText, /연구 관리 열기/, "The research-lab popup must provide direct access to research management");

  const syntheticIsolation = await desktop.evaluate(() => window.__doroniumFactoryTest.syntheticReservationIsolationTest());
  assert.equal(syntheticIsolation.aggregate.synthetic, true, "Legacy aggregate metadata should reflect the reserved synthetic stack in this test");
  assert.equal(syntheticIsolation.errorCode, null, "A reactor must not reject non-synthetic inputs because an unrelated synthetic stack is reserved");
  assert.equal(syntheticIsolation.activeMeta.synthetic, false, "The reactor must consume only the available non-synthetic Dori Meat");
  assert.equal(syntheticIsolation.activeMeta.quality, 96, "Reactor input quality must come from the available non-synthetic stack");
  assert.equal(syntheticIsolation.total, 10, "The reserved synthetic stack must remain in total inventory");
  assert.equal(syntheticIsolation.available, 0, "All remaining Dori Meat should be reserved after the valid batch is consumed");
  assert.deepEqual(syntheticIsolation.reservedStack, [true], "The separately reserved synthetic stack must remain untouched");
  assert.equal(syntheticIsolation.runtimeValid, true, "Synthetic reservation isolation must preserve runtime invariants");

  const provenance = await desktop.evaluate(() => window.__doroniumFactoryTest.reservationMetadataTest());
  assert.ok(Math.abs(provenance.aggregateMeta.quality - 84.5) < 0.001, "The compatibility inventory metadata should reflect both high-grade reserved and lower-grade free stacks");
  assert.equal(provenance.suppliedMeta.quality, 70, "Machine input quality must come from the actual free stacks consumed, not the aggregate inventory average");
  assert.equal(provenance.suppliedMeta.purity, 75, "Machine input purity must preserve the actual consumed stack provenance");
  assert.equal(provenance.suppliedMeta.synthetic, false, "Machine input synthetic status must come from the actual consumed stacks");
  assert.equal(provenance.reservedStack[0].stack.quality, 99, "Reserved high-grade material must remain in its original stack");
  assert.equal(provenance.stock, 3, "Manual supply must leave the reserved quantity untouched");
  assert.equal(provenance.available, 0, "The remaining high-grade stack must remain locked");
  assert.deepEqual(provenance.machineInput, { doronium_normal: 3, quartz: 2, water: 8 }, "Machine supply must transfer the intended recipe quantities");
  assert.equal(provenance.runtimeValid, true, "Provenance-preserving supply must maintain valid runtime state");

  await desktop.screenshot({ path: path.join(artifactDir, "doronium-desktop.png"), fullPage: true });
  // Free the desktop WebGL context before testing persistence and other render contexts.
  await desktop.close();

  const saveContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const savePage = await saveContext.newPage();
  capture(savePage, "save-reload");
  await boot(savePage);
  const saveProbe = await savePage.evaluate(() => window.__doroniumFactoryTest.prepareSaveReloadTest());
  assert.equal(saveProbe.saved, true, "The game must successfully write a validated local save");
  await savePage.reload({ waitUntil: "domcontentloaded" });
  await savePage.waitForFunction(() => !!window.__doroniumFactoryTest, { timeout: 45000 });
  await savePage.waitForFunction(() => {
    const canvas = document.querySelector("#world-canvas");
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 30000 });
  const restoredSave = await savePage.evaluate(() => window.__doroniumFactoryTest.snapshot());
  assert.equal(restoredSave.money, saveProbe.money, "Currency must survive a full page reload");
  assert.equal(restoredSave.player.x, saveProbe.x, "Player X position must survive a full page reload");
  assert.equal(restoredSave.player.y, saveProbe.y, "Player Y position must survive a full page reload");
  assert.equal(restoredSave.survival.health, saveProbe.health, "Survival state must survive a full page reload");
  assert.equal(restoredSave.inventory.ironOre, saveProbe.ironOre, "Inventory quantities must survive a full page reload");
  assert.equal(restoredSave.player.mineId, saveProbe.mineID, "The selected mine identity must survive a full page reload");
  assert.equal(restoredSave.player.mineLevel, saveProbe.mineLevel, "The selected mine depth must survive a full page reload");
  assert.equal(restoredSave.mines[saveProbe.mineID].currentLevel, saveProbe.mineLevel, "The mine's independent depth progress must survive a full page reload");
  assert.equal(restoredSave.mines[saveProbe.mineID].levels["3"].deposits[saveProbe.depositKey].amount, saveProbe.depositAmount,
    "A depleted ore vein must survive a full page reload without affecting other mines");
  const restoredRuntime = await savePage.evaluate(() => window.__doroniumFactoryTest.audit().runtimeValidation);
  const restoredMineAudit = await savePage.evaluate(() => window.__doroniumFactoryTest.audit().mineValidation);
  assert.equal(restoredMineAudit.valid, true, "Reloaded mine topology and deposit state must validate");
  assert.equal(restoredRuntime.valid, true, "Restored item stacks and reservations must pass runtime validation");
  await saveContext.close();

  const mouseContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const mouseLookPage = await mouseContext.newPage();
  capture(mouseLookPage, "desktop-pointer-lock");
  await boot(mouseLookPage);
  await mouseLookPage.evaluate(() => window.__doroniumFactoryTest.setViewMode("first"));
  assert.equal(await mouseLookPage.evaluate(() => window.__doroniumFactoryTest.viewMode()), "first",
    "The mouse-look regression must run in first-person mode");
  await mouseLookPage.locator("#world-canvas").click({ position: { x: 720, y: 450 } });
  await mouseLookPage.waitForFunction(
    () => document.pointerLockElement === document.querySelector("#world-canvas"),
    { timeout: 8000 }
  );
  const lockedYawBefore = await mouseLookPage.evaluate(() => window.__doroniumFactoryTest.motion().yaw);
  const lockedPitchBefore = await mouseLookPage.evaluate(() => window.__doroniumFactoryTest.motion().pitch);
  // Chromium headless does not always emit native relative mouse deltas after pointer lock.
  // Dispatch the same browser MouseEvent payload produced by a physical locked-pointer move.
  await mouseLookPage.evaluate(() => document.dispatchEvent(new MouseEvent("mousemove", {
    bubbles: true, movementX: 64, movementY: 24
  })));
  const lockedYawAfter = await mouseLookPage.evaluate(() => window.__doroniumFactoryTest.motion().yaw);
  const lockedPitchAfter = await mouseLookPage.evaluate(() => window.__doroniumFactoryTest.motion().pitch);
  assert.notEqual(lockedYawAfter, lockedYawBefore, "Pointer-locked mouse movement must rotate the player camera");
  assert.notEqual(lockedPitchAfter, lockedPitchBefore, "Pointer-locked vertical mouse movement must tilt the camera");
  await mouseLookPage.keyboard.press("Escape");
  assert.equal(await mouseLookPage.evaluate(() => document.pointerLockElement), null, "Escape must release desktop pointer lock");
  await mouseContext.close();

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
  const mobileFrame = await mobile.locator("#world-frame").evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, height: rect.height, viewportHeight: window.innerHeight, viewportWidth: window.innerWidth };
  });
  assert.ok(mobileFrame.top <= 1 && mobileFrame.height >= mobileFrame.viewportHeight - 1,
    "Mobile game world must fill the viewport without a clipped 530px height cap");
  assert.equal(await mobile.locator("#mobile-hud-toggle").isVisible(), true,
    "The compact status toggle must be available on touch devices");
  for (const selector of [".top-resource-strip", ".world-clock", ".world-coordinate", ".survival-card", ".view-switcher", ".target-label"]) {
    assert.equal(await mobile.locator(selector).isVisible(), false,
      "Secondary mobile HUD panel must start hidden: " + selector);
  }
  await mobile.locator("#mobile-hud-toggle").click();
  assert.equal(await mobile.locator("#game-root").evaluate(el => el.classList.contains("mobile-hud-expanded")), true,
    "The status toggle must expand the mobile HUD");
  for (const selector of [".top-resource-strip", ".world-clock", ".world-coordinate", ".survival-card", ".view-switcher"]) {
    assert.equal(await mobile.locator(selector).isVisible(), true,
      "The expanded status HUD must restore its information panel: " + selector);
  }
  await mobile.locator("#mobile-hud-toggle").click();
  assert.equal(await mobile.locator("#game-root").evaluate(el => el.classList.contains("mobile-hud-expanded")), false,
    "The status toggle must collapse the mobile HUD again");
  const landscapeShell = await mobile.locator("#game-root").evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { transform: getComputedStyle(el).transform, width: el.offsetWidth, height: el.offsetHeight, rectWidth: rect.width, rectHeight: rect.height };
  });
  assert.notEqual(landscapeShell.transform, "none",
    "Portrait phone viewports must rotate the complete game into a landscape-only presentation");
  assert.ok(landscapeShell.width >= mobileFrame.viewportHeight - 1 && landscapeShell.height >= mobileFrame.viewportWidth - 1,
    "The rotated phone game shell must be laid out in landscape dimensions and cover the portrait viewport after rotation");
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
