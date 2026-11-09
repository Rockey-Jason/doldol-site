/* End-game gate for the three-relay planetary stabilization network. */
export const PLANETARY_POWER_FLOOR = 0.8;
const RELAY_COUNT = 3;
const GENERATOR_TYPES = new Set(["solar", "wind", "coalgen", "mineGen"]);
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function exactSiteMatch(building, site) {
  return Number(building?.x) === Number(site?.x) &&
    Number(building?.y) === Number(site?.y) &&
    building?.layer !== "mine";
}

function powerNetworkFor(power, nodeID) {
  return (power?.networks || []).find(network =>
    Array.isArray(network.nodeIDs) && network.nodeIDs.includes(String(nodeID))
  ) || null;
}

function allocationIsStable(power, nodeID) {
  const allocation = power?.allocations?.[String(nodeID)];
  return !!allocation &&
    finite(allocation.ratio, 0) >= PLANETARY_POWER_FLOOR &&
    ["RUNNING", "BROWNOUT_RUNNING"].includes(String(allocation.status));
}

/**
 * Check whether the physical relay sites and the central core are connected
 * to one powered network before allowing the planet-ending sequence.
 *
 * requireCoreInstalled=false is used only for the one-time Infinity core
 * installation preflight. The core must still physically exist and be powered.
 */
export function evaluatePlanetaryStabilization(state, power, { requireCoreInstalled = true } = {}) {
  const blockers = [];
  const add = code => { if (!blockers.includes(code)) blockers.push(code); };

  if (!state || typeof state !== "object") {
    return { ready: false, blockers: ["MISSING_GAME_STATE"], relayNodeIDs: [], coreNodeID: null, powerNetworkID: null };
  }
  if (state.fusionDone !== true) add("INFINITY_FUSION_INCOMPLETE");
  if (!Array.isArray(state.research) || !state.research.includes("planet")) add("PLANETARY_RESEARCH_LOCKED");

  const sites = Array.isArray(state.sites?.relay) ? state.sites.relay : [];
  if (sites.length !== RELAY_COUNT) add("RELAY_SITE_CONFIGURATION_INVALID");
  const relayProgress = Array.isArray(state.relaySites) ? state.relaySites : [];
  if (relayProgress.length !== RELAY_COUNT || relayProgress.some(value => value !== true)) add("RELAY_PROGRESS_INCOMPLETE");

  const relayNodeIDs = [];
  for (let index = 0; index < RELAY_COUNT; index++) {
    const site = sites[index];
    if (!site || !Number.isFinite(Number(site.x)) || !Number.isFinite(Number(site.y))) {
      add("RELAY_SITE_CONFIGURATION_INVALID");
      continue;
    }
    const matches = (state.buildings || []).filter(building =>
      building?.type === "relay" && exactSiteMatch(building, site)
    );
    if (matches.length !== 1) {
      add(matches.length > 1 ? "RELAY_SITE_DUPLICATED" : "RELAY_BUILDING_MISSING");
      continue;
    }
    const relay = matches[0];
    if (relay.failureRepair || ["BROKEN", "ERROR", "OFFLINE"].includes(String(relay.status))) add("RELAY_UNAVAILABLE");
    relayNodeIDs.push(String(relay.uid || ""));
  }
  if (new Set(relayNodeIDs).size !== RELAY_COUNT || relayNodeIDs.some(id => !id)) add("RELAY_ID_INVALID");

  const coreSites = state.sites?.core;
  const coreBuildings = (state.buildings || []).filter(building =>
    building?.type === "core" &&
    (!coreSites || exactSiteMatch(building, coreSites))
  );
  if (coreBuildings.length !== 1) add(coreBuildings.length > 1 ? "CORE_SITE_DUPLICATED" : "CORE_BUILDING_MISSING");
  const core = coreBuildings.length === 1 ? coreBuildings[0] : null;
  const coreNodeID = core ? String(core.uid || "") : null;
  if (core && !coreNodeID) add("CORE_ID_INVALID");
  if (requireCoreInstalled && (state.coreInstalled !== true || core?.status !== "INSTALLED")) add("CORE_NOT_INSTALLED");
  if (core?.failureRepair || ["BROKEN", "ERROR", "OFFLINE"].includes(String(core?.status))) add("CORE_UNAVAILABLE");

  const requiredIDs = [...relayNodeIDs, ...(coreNodeID ? [coreNodeID] : [])];
  let sharedNetwork = null;
  if (requiredIDs.length === RELAY_COUNT + 1) {
    for (const nodeID of requiredIDs) {
      if (!allocationIsStable(power, nodeID)) add(nodeID === coreNodeID ? "CORE_POWER_UNSTABLE" : "RELAY_POWER_UNSTABLE");
      const network = powerNetworkFor(power, nodeID);
      if (!network) {
        add("PLANETARY_NETWORK_DISCONNECTED");
        continue;
      }
      if (!sharedNetwork) sharedNetwork = network;
      else if (sharedNetwork !== network) add("PLANETARY_NETWORK_SPLIT");
    }
  } else {
    add("PLANETARY_NETWORK_INCOMPLETE");
  }

  if (!sharedNetwork || finite(sharedNetwork.generationKW, 0) <= 0) add("PLANETARY_GENERATION_UNAVAILABLE");
  if (sharedNetwork) {
    const networkGenerators = (state.buildings || []).filter(building =>
      GENERATOR_TYPES.has(String(building?.type)) &&
      sharedNetwork.nodeIDs.includes(String(building.uid)) &&
      !building.failureRepair &&
      (building.type === "solar" || building.type === "wind" || finite(building.fuelTimer, 0) > 0)
    );
    if (!networkGenerators.length) add("PLANETARY_GENERATOR_MISSING");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    relayNodeIDs,
    coreNodeID,
    powerNetworkID: sharedNetwork?.networkID || null,
    powerFloor: PLANETARY_POWER_FLOOR,
    generationKW: finite(sharedNetwork?.generationKW, 0)
  };
}
