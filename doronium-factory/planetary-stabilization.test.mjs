import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePlanetaryStabilization, PLANETARY_POWER_FLOOR } from "./planetary-stabilization.js";

function fixture() {
  const sites = {
    relay: [{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }],
    core: { x: 40, y: 40 }
  };
  const buildings = [
    { uid: "GEN-A", type: "coalgen", x: 1, y: 1, fuelTimer: 120, status: "RUNNING" },
    { uid: "GEN-B", type: "coalgen", x: 2, y: 1, fuelTimer: 120, status: "RUNNING" },
    ...sites.relay.map((site, index) => ({
      uid: "RELAY-" + (index + 1), type: "relay", ...site, layer: "surface", status: "RUNNING"
    })),
    { uid: "CORE-1", type: "core", ...sites.core, layer: "surface", status: "INSTALLED" }
  ];
  const ids = buildings.map(item => item.uid);
  const state = {
    fusionDone: true,
    research: ["planet"],
    relaySites: [true, true, true],
    coreInstalled: true,
    sites,
    buildings
  };
  const power = {
    networks: [{ networkID: "POWER-1", nodeIDs: ids, generationKW: 3600 }],
    allocations: Object.fromEntries(
      ["RELAY-1", "RELAY-2", "RELAY-3", "CORE-1"].map(id => [
        id, { id, ratio: 1, status: "RUNNING", demandKW: 300 }
      ])
    )
  };
  return { state, power };
}

test("endgame gate requires Infinity Fusion, planetary research and all three relays", () => {
  const { state, power } = fixture();
  state.fusionDone = false;
  state.research = [];
  state.relaySites[2] = false;
  const result = evaluatePlanetaryStabilization(state, power);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("INFINITY_FUSION_INCOMPLETE"));
  assert.ok(result.blockers.includes("PLANETARY_RESEARCH_LOCKED"));
  assert.ok(result.blockers.includes("RELAY_PROGRESS_INCOMPLETE"));
});

test("saved relay booleans cannot replace missing physical relay buildings", () => {
  const { state, power } = fixture();
  state.buildings = state.buildings.filter(item => item.uid !== "RELAY-2");
  const result = evaluatePlanetaryStabilization(state, power);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("RELAY_BUILDING_MISSING"));
});

test("every relay and the core must receive at least 80 percent power", () => {
  const { state, power } = fixture();
  power.allocations["RELAY-2"].ratio = PLANETARY_POWER_FLOOR - 0.001;
  power.allocations["RELAY-2"].status = "PAUSED_POWER";
  const result = evaluatePlanetaryStabilization(state, power);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("RELAY_POWER_UNSTABLE"));
});

test("planetary relay network must be one connected network with generation", () => {
  const { state, power } = fixture();
  power.networks = [
    { networkID: "POWER-A", nodeIDs: ["GEN-A", "RELAY-1", "RELAY-2"], generationKW: 1800 },
    { networkID: "POWER-B", nodeIDs: ["GEN-B", "RELAY-3", "CORE-1"], generationKW: 1800 }
  ];
  const result = evaluatePlanetaryStabilization(state, power);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("PLANETARY_NETWORK_SPLIT"));
});

test("installation preflight allows an uninstalled core only when the physical core is powered", () => {
  const { state, power } = fixture();
  state.coreInstalled = false;
  state.buildings.find(item => item.type === "core").status = "IDLE";
  const installCheck = evaluatePlanetaryStabilization(state, power, { requireCoreInstalled: false });
  const endingCheck = evaluatePlanetaryStabilization(state, power);
  assert.equal(installCheck.ready, true);
  assert.equal(endingCheck.ready, false);
  assert.ok(endingCheck.blockers.includes("CORE_NOT_INSTALLED"));
});

test("only a fully installed, powered and connected endgame network passes", () => {
  const { state, power } = fixture();
  const result = evaluatePlanetaryStabilization(state, power);
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.relayNodeIDs.length, 3);
  assert.equal(result.coreNodeID, "CORE-1");
  assert.equal(result.powerNetworkID, "POWER-1");
  assert.equal(result.generationKW, 3600);
});

test("a battery-only disconnected reserve cannot substitute for live generation", () => {
  const { state, power } = fixture();
  power.networks[0].generationKW = 0;
  const result = evaluatePlanetaryStabilization(state, power);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("PLANETARY_GENERATION_UNAVAILABLE"));
});
