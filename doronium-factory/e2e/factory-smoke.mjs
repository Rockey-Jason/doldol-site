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
  assert.equal(audit.canonicalDoronumValidation.valid, true, "All 15 canonical Doronum definitions and their model/recipe/acquisition references must validate");
  assert.equal(audit.canonicalDoronumValidation.count, 15, "The canonical Doronum catalog must contain exactly 15 IDs");
  assert.equal(audit.canonicalCrystalModelCount, 15, "All 15 canonical Doronum variants must have separate model profiles");
  assert.equal(audit.canonicalCrystalModelShapes, 15, "Canonical Doronum variants must use 15 distinct geometry families");
  assert.equal(audit.allCanonicalCrystalModels, true, "Every canonical Doronum ID must resolve to a 3D crystal model");
  assert.equal(audit.canonicalDoronumIntegration.complete, true, "Canonical Doronum items, models, raw inputs, machines, recipe references, research, fluids and campaign contracts must all resolve");
  for (const key of ["missingRawResources", "missingMachines", "missingRecipes", "missingResearch", "missingFluids", "missingContracts", "missingProductionLines"]) assert.equal(audit.canonicalDoronumIntegration[key].length, 0, `Canonical integration has unresolved ${key}`);
  assert.equal(audit.canonicalDoronumIntegration.missingCanonicalItems.length, 0, "All 15 canonical Doronum IDs must exist in the active resource registry");
  assert.equal(audit.canonicalDoronumIntegration.missingModels.length, 0, "Every canonical item must resolve to an actual Three.js crystal model profile");
  assert.equal(audit.runtimeValidation.valid, true, "Initial item stacks and reservations must validate");
  const tickStages = await desktop.evaluate(() => window.__doroniumFactoryTest.runTickStageCoverageTest());
  assert.equal(tickStages.tickNumber, 1, "One fixed tick must execute in the stage coverage scenario");
  assert.equal(tickStages.count, 18, "Every canonical simulation phase must execute once in a fixed tick");
  assert.deepEqual(tickStages.stages, tickStages.expected, "The actual tick handler trace must exactly match the canonical 18-stage order");
  assert.deepEqual(tickStages.missing, [], "No fixed-tick simulation stage may be an empty handler");

  const ownershipCase = await desktop.evaluate(() => window.__doroniumFactoryTest.setupOwnershipLedgerTest());
  assert.equal(ownershipCase.reservation !== null, true, "The custody scenario must create a real item reservation");
  assert.equal(ownershipCase.validation.valid, true, "Every item must have exactly one valid custody owner");
  assert.equal(ownershipCase.itemTotals.ITEM_IRON_ORE, 11, "Reserved ore and in-process ore must both be represented exactly once");
  assert.equal(ownershipCase.itemTotals.coal, 2, "Machine input buffers must be represented in custody");
  assert.equal(ownershipCase.itemTotals.ironPlate, 2, "Machine output buffers must be represented in custody");
  assert.equal(ownershipCase.itemTotals.circuit, 4, "Conveyor cargo must be represented in custody");
  assert.equal(ownershipCase.itemTotals.wood, 5, "Shipment cargo must be represented in custody");
  assert.equal(ownershipCase.itemTotals.ITEM_DORONUM_INFINITY, 1, "Completion-buffer items must be represented in custody");
  const ownershipOwners = ownershipCase.ownership.custody.map(x => x.ownerType);
  for (const owner of ["PLAYER_INVENTORY","ACTIVE_JOB","MACHINE_INPUT","MACHINE_OUTPUT","CONVEYOR","COMPLETION_BUFFER"]) assert.ok(ownershipOwners.includes(owner), "Missing custody owner type: " + owner);
  const conflictGuard = await desktop.evaluate(() => window.__doroniumFactoryTest.runCloudConflictGuardTest());
  assert.equal(conflictGuard.rpcCalls, 0, "Autosaves must not call Supabase RPC while a cloud conflict is unresolved");
  assert.equal(conflictGuard.revision, 7, "A conflict must not advance the stale local revision to the newer remote revision");
  assert.equal(conflictGuard.conflictLocked, true, "The conflict lock must remain active until the player explicitly resolves it");
  assert.equal(conflictGuard.dirty, true, "The newer local state must remain marked for local persistence");


  assert.equal(audit.variantCount, 15, "15 canonical Doronium variants must be present");
  assert.equal(audit.uniqueVariants, 15, "Variant IDs must be unique");
  assert.equal(audit.uniqueCrystalModels, 15, "All 15 variants must have 3D models");
  assert.equal(audit.uniqueCrystalShapes, 15, "Each variant must use a distinct geometry family");
  assert.equal(audit.allCrystalModels, true, "Every variant must resolve to a crystal model");
  assert.equal(audit.researchCount, 19, "All 19 research nodes through planetary stabilization must be present");
  const researchState = await desktop.evaluate(() => window.__doroniumFactoryTest.audit());
  assert.equal(researchState.researchGraphValid, true, "All 19 research prerequisites must exist and form an acyclic graph");
  assert.equal(audit.skillNodeCount, 20, "The separate specialization tree must define twenty real skill nodes");
  assert.equal(audit.skillGroupCount, 5, "The skill tree must contain five specialization groups");
  assert.equal(audit.skillTreeValidation.valid, true, "All skill prerequisites and tiers must validate");
  assert.equal(audit.skillStateValidation.valid, true, "Skill points and unlocked nodes must validate");
  assert.equal(audit.buildingCount, 48, "The full factory catalog, including campaign production lines and industrial infrastructure, must be present");
  for (const id of ["powerCable","transformer","battery","mineGen","fluidPipe","fluidValve","fluidTank","fluidPump","minerAdvanced","goldSmelter","chromeSmelter","steelForge","titaniumPress","carbonMill"]) assert.ok(audit.buildingIDs.includes(id), `Missing v4.5 facility: ${id}`);
  assert.equal(audit.worldWidth, 192, "The world must be expanded to 192 tiles wide");
  assert.ok(audit.outerResourceCount > 20, "The expanded continent must contain natural resource patches");
  assert.equal(audit.worldHeight, 160, "The world must be expanded to 160 tiles high");
  assert.equal(audit.mineLevels, 5, "The mine must expose five depth levels");
  assert.equal(audit.biomeCount, 8, "Eight distinct surface biomes must be generated");
  assert.ok(audit.terrainHeightRange[1] - audit.terrainHeightRange[0] > 90, "Terrain must have pronounced valleys, ridgelines and highlands");
  assert.equal(audit.surfaceHasExposedOre, false, "Surface mineral deposits must be removed");
  assert.equal(audit.simulationStep, 0.1, "Simulation must use a fixed 0.1-second step");
  assert.equal(audit.variantRecipeCount, 12, "Twelve recipe-driven variants must be defined; Special and Limited are campaign acquisitions");
  assert.equal(audit.variantRecipesValid, true, "All variant recipe inputs must resolve");
  assert.equal(audit.researchGraphValid, true, "Research prerequisites must exist and form an acyclic graph");
  assert.equal(audit.fusionStageCount, 7, "Infinity fusion must contain seven stages");
  assert.equal(audit.fusionIdealDuration, 260, "Ideal fusion-stage duration must total 260 seconds");
  assert.equal(audit.recipeInputsValid, true, "All recipe input IDs must resolve");
  assert.equal(audit.buildingMaterialsValid, true, "All construction material IDs must resolve");

  await openPanel(desktop, "inventory");
  const quarantineCase = await desktop.evaluate(() => window.__doroniumFactoryTest.setupQuarantineInventoryTest());
  assert.equal(quarantineCase.tradable.ITEM_DORONUM_NORMAL, 3, "Canonical stock must remain tradable");
  assert.equal(quarantineCase.tradable.doronium_void, undefined, "Ambiguous legacy stock must not leak into spendable inventory");
  assert.equal(quarantineCase.quarantined.doronium_void, 5, "Ambiguous legacy stock must remain recoverable in quarantine");
  assert.equal(await desktop.locator("#quarantine-grid .quarantine-item").count(), 1, "The player must be able to see quarantined stock separately");
  assert.equal(await desktop.locator('#sell-resource option[value="doronium_void"]').count(), 0, "Quarantined stock must never be offered for market sale");
  assert.equal(await desktop.locator("#inventory-grid").innerText().then(text => text.includes("DORONIUM_VOID")), false, "Quarantined stock must not appear in normal inventory");
  const reservedInventoryCase = await desktop.evaluate(() => window.__doroniumFactoryTest.setupReservedInventoryTest());
  assert.ok(reservedInventoryCase.reservation, "The stock locking scenario must reserve a real item batch");
  assert.equal(reservedInventoryCase.total, 10, "The inventory mirror must preserve total physical stock");
  assert.equal(reservedInventoryCase.available, 3, "The spendable count must exclude reserved stock");
  assert.equal(reservedInventoryCase.reserved, 7, "The locked count must match the reservation ledger");
  assert.ok((await desktop.locator("#inventory-grid").innerText()).includes("사용 가능 3 · 예약 7"), "The inventory UI must distinguish spendable and reserved quantities");
  assert.equal(await desktop.locator('#sell-resource option[value="ITEM_IRON_ORE"]').count(), 1, "Only the three spendable ore units may be offered for sale");
  assert.equal(await desktop.locator("[data-crystal]").count(), 16, "15 normal variants plus Infinity must be listed");
  await desktop.locator('[data-crystal="ITEM_DORONUM_BLUE"]').click();
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
  assert.equal(fed.inventory.ITEM_DORI_MEAT, 1, "Clicking Eat must consume exactly one canonical Dori Meat item");
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
  assert.ok(powerTick.battery > 39.9 && powerTick.battery < 40.1, "The 400kW battery charger must store 40kJ during one 0.1-second tick");
  assert.equal(powerTick.far.ratio, 0, "A remote grid must remain isolated after a simulation tick");

  const purifiedRusted = await desktop.evaluate(() => window.__doroniumFactoryTest.runRustedPurificationTest());
  assert.equal(purifiedRusted.output.id, "ITEM_DORONUM_RUSTED", "Purification must output the same canonical rusted Doronum item");
  assert.ok(purifiedRusted.output.meta.quality >= 90, "Purified rusted Doronum must meet the Infinity quality threshold");
  assert.ok(purifiedRusted.output.meta.purity >= 90, "Purified rusted Doronum must meet the Infinity purity threshold");
  assert.equal(purifiedRusted.fluidAmountL, 0, "Purification must consume its exact water requirement");
  assert.equal(purifiedRusted.rustedRemaining, 0, "Purification must consume the unpurified source stack");
  assert.equal(purifiedRusted.carbonRemaining, 0, "Purification must consume its carbon powder input");

  const fluidRecipe = await desktop.evaluate(() => window.__doroniumFactoryTest.setupFluidRecipeConsumerTest());
  assert.equal(fluidRecipe.status, "RUNNING", "A fluid-dependent Doronum recipe must start when its water buffer is available");
  assert.equal(fluidRecipe.fluidAmountL, 0, "The recipe must consume exactly its declared fluid quantity from the live building buffer");
  assert.equal(fluidRecipe.fluidType, null, "An empty fluid buffer must clear its fluid type");
  assert.equal(fluidRecipe.normalRemaining, 0, "The recipe must consume its reserved canonical Doronum input");
  assert.equal(fluidRecipe.ironOreRemaining, 0, "The recipe must consume its canonical iron ore input");
  assert.equal(fluidRecipe.activeMeta, true, "The recipe must begin an active job through the staged machine pipeline");
  assert.equal(fluidRecipe.tickStages.length, 18, "The fluid-dependent recipe must execute inside the complete canonical tick");

  const fluidSetup = await desktop.evaluate(() => window.__doroniumFactoryTest.setupFluidNetworkTest());
  assert.equal(fluidSetup.power.allocations["F-PUMP"].status, "RUNNING", "The water pump must receive power");
  const closedValve = await desktop.evaluate(() => window.__doroniumFactoryTest.runFluidNetworkTest(false, 12));
  assert.ok(closedValve.pipeOneLiters > 1, "The pump must fill the upstream pipe");
  assert.equal(closedValve.tankLiters, 0, "A closed valve must block fluid from reaching the tank");
  const openedValve = await desktop.evaluate(() => window.__doroniumFactoryTest.runFluidNetworkTest(true, 12));
  assert.ok(openedValve.tankLiters > 0, "Opening the valve must let water reach the tank through downstream pipes");
  assert.equal(openedValve.massBalance.valid, true, "Live fluid transfer must conserve the simulated water volume");
  assert.equal(openedValve.valveOpen, true, "Valve state must remain open after live simulation");
  const fluidDrain = await desktop.evaluate(() => window.__doroniumFactoryTest.runFluidDrainTest());
  assert.equal(fluidDrain.ok, true, "Buffered fluid must transfer to a compatible tank without loss before demolition");
  assert.equal(fluidDrain.before, fluidDrain.after, "Fluid drain must conserve total liters");

  const failedFusionDiagnostics = await desktop.evaluate(() => window.__doroniumFactoryTest.runFusionDiagnosticsTest(false));
  assert.equal(failedFusionDiagnostics.passed, false, "Fusion must not pass diagnostics without an independently powered cooling and fusion network");
  assert.equal(failedFusionDiagnostics.diagnostics.allPassed, false, "A failed diagnostic must remain persisted as a failed gate");
  assert.equal(failedFusionDiagnostics.reservations, 0, "A failed preflight must not reserve any materials");
  const passedFusionDiagnostics = await desktop.evaluate(() => window.__doroniumFactoryTest.runFusionDiagnosticsTest(true));
  assert.equal(passedFusionDiagnostics.passed, true, "A powered Fusion machine with calibrated pressure sensor and emergency cooling must pass all three diagnostics");
  assert.equal(passedFusionDiagnostics.diagnostics.allPassed, true, "All three Fusion diagnostic results must be persisted");

  const fusionRollback = await desktop.evaluate(() => window.__doroniumFactoryTest.runFusionReservationCancelTest());
  assert.equal(fusionRollback.ok, true, "A 15-item Fusion reservation must be atomic and fully reversible on cancellation");
  assert.equal(fusionRollback.reservationCount, 15, "Fusion must reserve exactly one qualified allocation per required item");
  assert.equal(fusionRollback.totalAvailable, 1500, "Cancelling Fusion must return all 1,500 inputs to available inventory");
  assert.equal(fusionRollback.remainingReservations, 0, "Fusion cancellation must release every reservation");
  assert.equal(fusionRollback.secondCancel, false, "Repeating cancellation must not duplicate returned items");
  const fusionSettlement = await desktop.evaluate(() => window.__doroniumFactoryTest.runFusionSettlementTest());
  assert.equal(fusionSettlement.ok, true, "The live settlement must commit a seven-stage job exactly once");
  assert.equal(fusionSettlement.fusionDone, true, "The global Fusion completion flag must be set only after the output commit");
  assert.equal(fusionSettlement.jobStatus, "COMPLETED", "The job must persist its completed state");
  assert.equal(fusionSettlement.outputCount, 1, "Exactly one Infinity output stack must be available");
  assert.equal(fusionSettlement.produced, 1, "Production statistics must increment exactly once");
  assert.equal(fusionSettlement.inputsRemaining, 0, "All 1,500 required canonical inputs must be consumed");
  assert.equal(fusionSettlement.reservationsRemaining, 0, "All Fusion reservations must be closed after settlement");
  assert.equal(fusionSettlement.second.duplicate, true, "Repeating the same settlement ID must return the prior result without issuing another output");
  assert.equal(fusionSettlement.settlement.outputQuantity, 1, "The settlement journal must record exactly one output");

  const miningSetup = await desktop.evaluate(() => window.__doroniumFactoryTest.setupMiningAutomationTest());
  assert.equal(miningSetup.generator, true, "A mine generator must be placeable in an underground tunnel");
  assert.equal(miningSetup.miner, true, "An iron drill must install on a matching underground iron deposit");
  assert.equal(miningSetup.deposit.amount, 28, "Installing a drill must not consume the deposit");
  const miningResult = await desktop.evaluate(() => window.__doroniumFactoryTest.runMiningAutomationTest());
  assert.equal(miningResult.output.id, "ITEM_IRON_ORE", "The automatic miner must extract its matching mineral");
  assert.equal(miningResult.output.qty, 1, "One extraction cycle must produce exactly one ore");
  assert.equal(miningResult.depositAmount, 27, "One extraction cycle must reduce the source deposit exactly once");
  assert.ok(miningResult.drillDurability < 1000, "Extraction must wear the drill");
  assert.equal(miningResult.power.status, "RUNNING", "The underground generator must power the connected drill");
  const repairResult = await desktop.evaluate(() => window.__doroniumFactoryTest.runDrillRepairTest());
  assert.equal(repairResult.ok, true, "A worn drill must consume repair materials and return to service");
  assert.equal(repairResult.drillDurability, 1000, "Repair must restore drill durability");

  const advancedMiningSetup = await desktop.evaluate(() => window.__doroniumFactoryTest.setupAdvancedMiningTest());
  assert.equal(advancedMiningSetup.generator, true, "The mine generator must be placeable beside advanced mineral deposits");
  assert.equal(advancedMiningSetup.miner, true, "The advanced miner must accept supported special mineral deposits");
  const advancedMiningResult = await desktop.evaluate(() => window.__doroniumFactoryTest.runAdvancedMiningTest());
  assert.equal(advancedMiningResult.output.id, "ITEM_COLD_CRYSTAL_RAW", "Advanced mining must extract the selected canonical raw crystal");
  assert.equal(advancedMiningResult.depositAmount, advancedMiningSetup.deposit.amount - 1, "Advanced extraction must reduce its deposit exactly once");
  assert.equal(advancedMiningResult.power.status, "RUNNING", "The underground generator must power the advanced miner");

  const rawMaterialResults = await desktop.evaluate(() => window.__doroniumFactoryTest.runRawMaterialProductionTest());
  assert.equal(rawMaterialResults.length, 5, "All five canonical raw-material production lines must execute");
  for (const result of rawMaterialResults) assert.equal(result.actual, result.expected, result.type + " must produce its canonical material");

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
