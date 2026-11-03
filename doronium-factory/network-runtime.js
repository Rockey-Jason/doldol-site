const EPSILON = 1e-9;

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function buildComponents(nodes, edges, prefix) {
  const byID = new Map();
  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || !node.id || byID.has(node.id)) {
      throw new Error("INVALID_OR_DUPLICATE_NETWORK_NODE_ID");
    }
    byID.set(node.id, node);
  }
  const adjacency = new Map([...byID.keys()].map(id => [id, []]));
  const seenEdges = new Set();
  const validEdges = [];
  for (const edge of edges) {
    if (!edge || typeof edge.id !== "string" || !edge.id || seenEdges.has(edge.id)) {
      throw new Error("INVALID_OR_DUPLICATE_NETWORK_EDGE_ID");
    }
    seenEdges.add(edge.id);
    if (!byID.has(edge.from) || !byID.has(edge.to) || edge.from === edge.to) {
      throw new Error("NETWORK_EDGE_ENDPOINT_INVALID:" + edge.id);
    }
    if (edge.enabled === false || edge.open === false) continue;
    const capacity = edge.capacityKW == null ? Infinity : Number(edge.capacityKW);
    const loss = Number(edge.lossRatio ?? 0);
    if (!(capacity > 0) || !(loss >= 0 && loss < 1) || !Number.isFinite(loss)) {
      throw new Error("NETWORK_EDGE_CONFIGURATION_INVALID:" + edge.id);
    }
    const normalized = { ...edge, capacityKW: capacity, lossRatio: loss };
    validEdges.push(normalized);
    adjacency.get(edge.from).push({ edge: normalized, to: edge.to });
    adjacency.get(edge.to).push({ edge: normalized, to: edge.from });
  }
  for (const links of adjacency.values()) links.sort((a, b) => a.edge.id.localeCompare(b.edge.id) || a.to.localeCompare(b.to));
  const components = [], visited = new Set();
  for (const start of [...byID.keys()].sort()) {
    if (visited.has(start)) continue;
    const queue = [start], ids = [];
    visited.add(start);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      ids.push(id);
      for (const link of adjacency.get(id)) if (!visited.has(link.to)) {
        visited.add(link.to);
        queue.push(link.to);
      }
    }
    ids.sort();
    const key = ids.join("|");
    const networkID = prefix + "-" + stableHash(key);
    components.push({
      networkID, ids, nodes: ids.map(id => byID.get(id)),
      edges: validEdges.filter(edge => ids.includes(edge.from) && ids.includes(edge.to)),
      adjacency
    });
  }
  return components;
}
function shortestPath(adjacency, sourceID, targetID, residualCapacity) {
  if (sourceID === targetID) return { edges: [], weight: 0 };
  const distances = new Map([[sourceID, 0]]), previous = new Map(), visited = new Set();
  while (true) {
    let current = null, best = Infinity;
    for (const [id, distance] of distances) if (!visited.has(id) && distance < best) {
      current = id; best = distance;
    }
    if (current === null) return null;
    if (current === targetID) break;
    visited.add(current);
    for (const { edge, to } of adjacency.get(current) || []) {
      if ((residualCapacity.get(edge.id) ?? 0) <= EPSILON || visited.has(to)) continue;
      const next = best - Math.log(Math.max(EPSILON, 1 - edge.lossRatio));
      const old = distances.get(to) ?? Infinity;
      if (next < old - EPSILON) {
        distances.set(to, next);
        previous.set(to, { from: current, edge });
      }
    }
  }
  const edges = [];
  let cursor = targetID;
  while (cursor !== sourceID) {
    const step = previous.get(cursor);
    if (!step) return null;
    edges.push(step.edge);
    cursor = step.from;
  }
  edges.reverse();
  return { edges, weight: distances.get(targetID) };
}
function routePower({ sources, targetID, deliveredLimitKW, adjacency, residualCapacity }) {
  let deliveredKW = 0, lossKW = 0;
  const sourceUsage = new Map(), edgeUsage = new Map();
  const candidates = [];
  for (const source of sources) {
    if (source.availableKW <= EPSILON) continue;
    const path = shortestPath(adjacency, source.id, targetID, residualCapacity);
    if (path) candidates.push({ source, path, efficiency: Math.exp(-path.weight) });
  }
  candidates.sort((a, b) => b.efficiency - a.efficiency || a.source.id.localeCompare(b.source.id));
  for (const candidate of candidates) {
    const remaining = deliveredLimitKW - deliveredKW;
    if (remaining <= EPSILON) break;
    const { source, path, efficiency } = candidate;
    let maxSend = source.availableKW;
    let prefixEfficiency = 1;
    for (const edge of path.edges) {
      maxSend = Math.min(maxSend, (residualCapacity.get(edge.id) ?? 0) / prefixEfficiency);
      prefixEfficiency *= 1 - edge.lossRatio;
    }
    const sendKW = Math.min(maxSend, remaining / efficiency);
    if (sendKW <= EPSILON) continue;
    let throughKW = sendKW;
    for (const edge of path.edges) {
      edgeUsage.set(edge.id, (edgeUsage.get(edge.id) || 0) + throughKW);
      throughKW *= 1 - edge.lossRatio;
    }
    const delivered = throughKW;
    sourceUsage.set(source.id, (sourceUsage.get(source.id) || 0) + sendKW);
    deliveredKW += delivered;
    lossKW += sendKW - delivered;
  }
  return { deliveredKW, lossKW, sourceUsage, edgeUsage };
}
function applyRoute(usage, sources, residualCapacity) {
  for (const [id, used] of usage.sourceUsage) {
    const source = sources.find(item => item.id === id);
    source.availableKW = Math.max(0, source.availableKW - used);
  }
  for (const [id, used] of usage.edgeUsage) {
    residualCapacity.set(id, Math.max(0, (residualCapacity.get(id) ?? 0) - used));
  }
}

/**
 * Resolve connected power islands in deterministic priority order.
 * Edge records are cable/transformer links. A transformer link sets its rated
 * capacityKW and conversion lossRatio on that edge.
 *
 * Nodes: generator {generationKW}; consumer {demandKW, priority};
 * battery {storedEnergyKJ, capacityKJ, maxChargeKW, maxDischargeKW}.
 */
export function resolvePowerNetworks(state, { dtSec = 0.1, brownoutThreshold = 0.8 } = {}) {
  if (!state || !Array.isArray(state.powerNodes) || !Array.isArray(state.powerEdges)) {
    throw new Error("POWER_NETWORK_STATE_REQUIRED");
  }
  if (!(Number.isFinite(dtSec) && dtSec > 0)) throw new Error("POWER_TICK_INVALID");
  if (!(brownoutThreshold > 0 && brownoutThreshold <= 1)) throw new Error("POWER_BROWNOUT_THRESHOLD_INVALID");
  const components = buildComponents(state.powerNodes, state.powerEdges, "PN");
  const consumers = {}, batteries = {}, networks = [];
  for (const component of components) {
    const { nodes, adjacency, networkID } = component;
    const edgeResidual = new Map(component.edges.map(edge => [edge.id, edge.capacityKW]));
    const sources = [];
    let rawGenerationKW = 0;
    for (const node of nodes) {
      node.networkID = networkID;
      if (node.kind === "generator" && node.enabled !== false) {
        const generationKW = finiteNonNegative(node.generationKW);
        rawGenerationKW += generationKW;
        sources.push({ id: node.id, kind: "generator", availableKW: generationKW, node });
      } else if (node.kind === "battery" && node.enabled !== false) {
        const stored = clamp(finiteNonNegative(node.storedEnergyKJ), 0, finiteNonNegative(node.capacityKJ));
        const dischargeEfficiency = clamp(Number(node.dischargeEfficiency ?? 1), EPSILON, 1);
        const maxDischargeKW = finiteNonNegative(node.maxDischargeKW);
        const availableKW = Math.min(maxDischargeKW, stored * dischargeEfficiency / dtSec);
        sources.push({ id: node.id, kind: "battery", availableKW, node, dischargeEfficiency });
      }
    }
    const componentConsumers = nodes
      .filter(node => node.kind === "consumer" && node.enabled !== false)
      .sort((a, b) => finiteNonNegative(a.priority, 100) - finiteNonNegative(b.priority, 100) || a.id.localeCompare(b.id));
    let allocatedKW = 0, lossKW = 0;
    for (const consumer of componentConsumers) {
      const demandKW = finiteNonNegative(consumer.demandKW);
      const trialSources = sources.map(source => ({ ...source }));
      const trialEdges = new Map(edgeResidual);
      const routed = routePower({ sources: trialSources, targetID: consumer.id, deliveredLimitKW: demandKW, adjacency, residualCapacity: trialEdges });
      const ratio = demandKW <= EPSILON ? 1 : clamp(routed.deliveredKW / demandKW, 0, 1);
      if (demandKW > EPSILON && ratio < brownoutThreshold) {
        consumers[consumer.id] = { networkID, requestedKW: demandKW, suppliedKW: 0, powerRatio: 0, state: "PAUSED_POWER", progressMultiplier: 0 };
        continue;
      }
      applyRoute(routed, sources, edgeResidual);
      for (const source of sources) {
        if (source.kind === "battery") {
          const used = routed.sourceUsage.get(source.id) || 0;
          source.node.storedEnergyKJ = Math.max(0, source.node.storedEnergyKJ - used * dtSec / source.dischargeEfficiency);
          batteries[source.id] = { storedEnergyKJ: source.node.storedEnergyKJ, dischargeKW: (batteries[source.id]?.dischargeKW || 0) + used, chargeKW: 0 };
        }
      }
      allocatedKW += routed.deliveredKW;
      lossKW += routed.lossKW;
      consumers[consumer.id] = {
        networkID, requestedKW: demandKW, suppliedKW: routed.deliveredKW, powerRatio: ratio,
        state: ratio >= 1 - EPSILON ? "RUNNING" : "BROWNOUT_RUNNING",
        progressMultiplier: ratio >= 1 - EPSILON ? 1 : ratio
      };
    }
    // Only unspent generation may charge batteries. Stored energy is kJ; all rates are kW.
    const generatorSources = sources.filter(source => source.kind === "generator");
    for (const battery of nodes.filter(node => node.kind === "battery" && node.enabled !== false).sort((a, b) => a.id.localeCompare(b.id))) {
      const efficiency = clamp(Number(battery.chargeEfficiency ?? 1), EPSILON, 1);
      const emptyKJ = Math.max(0, finiteNonNegative(battery.capacityKJ) - finiteNonNegative(battery.storedEnergyKJ));
      const chargeLimitKW = Math.min(finiteNonNegative(battery.maxChargeKW), emptyKJ / (dtSec * efficiency));
      if (chargeLimitKW <= EPSILON) continue;
      const routed = routePower({ sources: generatorSources, targetID: battery.id, deliveredLimitKW: chargeLimitKW, adjacency, residualCapacity: edgeResidual });
      applyRoute(routed, generatorSources, edgeResidual);
      battery.storedEnergyKJ = Math.min(battery.capacityKJ, battery.storedEnergyKJ + routed.deliveredKW * dtSec * efficiency);
      lossKW += routed.lossKW + routed.deliveredKW * (1 - efficiency);
      batteries[battery.id] = { storedEnergyKJ: battery.storedEnergyKJ, dischargeKW: batteries[battery.id]?.dischargeKW || 0, chargeKW: routed.deliveredKW };
    }
    const generatorUsedKW = generatorSources.reduce((sum, source) => sum + Math.max(0, finiteNonNegative(source.node.generationKW) - source.availableKW), 0);
    networks.push({
      networkID, nodeIDs: component.ids, generationKW: rawGenerationKW, generatorUsedKW,
      allocatedKW, lossKW, consumerDemandKW: componentConsumers.reduce((sum, node) => sum + finiteNonNegative(node.demandKW), 0),
      unusedGenerationKW: Math.max(0, rawGenerationKW - generatorUsedKW)
    });
  }
  state.powerNetworks = networks;
  state.powerConsumerAllocations = consumers;
  state.powerBatteryState = batteries;
  return { networks, consumers, batteries };
}

function validFluidQuantity(node) {
  const quantity = Number(node.quantityL);
  const reserved = Number(node.reservedL ?? 0);
  const capacity = Number(node.capacityL);
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(reserved) || reserved < 0 || reserved > quantity + EPSILON ||
      !Number.isFinite(capacity) || capacity < quantity - EPSILON || !Number.isFinite(Number(node.contamination ?? 0)) ||
      Number(node.contamination ?? 0) < 0 || Number(node.contamination ?? 0) > 100) {
    throw new Error("FLUID_NODE_STATE_INVALID:" + node.id);
  }
  return { quantity, reserved, capacity };
}

/**
 * Move fluids once across directed/explicitly bidirectional links.
 * Transfers use a start-of-tick source snapshot, so a newly received litre
 * cannot be re-sent through a second edge during the same tick.
 */
export function tickFluidNetwork(state, { dtSec = 0.1 } = {}) {
  if (!state || !Array.isArray(state.fluidNodes) || !Array.isArray(state.fluidEdges)) {
    throw new Error("FLUID_NETWORK_STATE_REQUIRED");
  }
  if (!(Number.isFinite(dtSec) && dtSec > 0)) throw new Error("FLUID_TICK_INVALID");
  const components = buildComponents(state.fluidNodes, state.fluidEdges, "FN");
  const nodes = new Map(state.fluidNodes.map(node => [node.id, node]));
  const startAvailable = new Map(), outgoing = new Map(), incoming = new Map();
  const startTotalL = state.fluidNodes.reduce((sum, node) => sum + validFluidQuantity(node).quantity, 0);
  for (const node of state.fluidNodes) {
    const valid = validFluidQuantity(node);
    startAvailable.set(node.id, Math.max(0, valid.quantity - valid.reserved));
    outgoing.set(node.id, 0);
    incoming.set(node.id, 0);
  }
  const edgeList = state.fluidEdges.filter(edge => edge.enabled !== false && edge.open !== false).slice().sort((a, b) => a.id.localeCompare(b.id));
  let movedL = 0, deliveredL = 0, lostL = 0;
  const transfers = [];
  for (const edge of edgeList) {
    const a = nodes.get(edge.from), b = nodes.get(edge.to);
    if (!a || !b) throw new Error("FLUID_EDGE_ENDPOINT_INVALID:" + edge.id);
    if (a.valveOpen === false || b.valveOpen === false || a.enabled === false || b.enabled === false) continue;
    const aPressure = finiteNonNegative(a.pressureKPa) + (a.kind === "pump" && a.pumpActive ? finiteNonNegative(a.pumpHeadKPa) : 0);
    const bPressure = finiteNonNegative(b.pressureKPa) + (b.kind === "pump" && b.pumpActive ? finiteNonNegative(b.pumpHeadKPa) : 0);
    let source = a, target = b, pressureDelta = aPressure - bPressure;
    if (edge.bidirectional && pressureDelta < 0) {
      source = b; target = a; pressureDelta = -pressureDelta;
    }
    if (pressureDelta <= EPSILON || (source.pumpRequired && source.pumpActive !== true)) continue;
    const sourceType = source.fluidType || null, targetType = target.fluidType || null;
    if (!sourceType || (targetType && targetType !== sourceType)) continue;
    const resistance = Math.max(EPSILON, finiteNonNegative(edge.pressureResistanceKPa, 1));
    const pressureFactor = clamp(pressureDelta / resistance, 0, 1);
    const edgeRate = finiteNonNegative(edge.maxFlowLps);
    const sourceRate = finiteNonNegative(source.maxFlowLps, edgeRate);
    const targetRate = finiteNonNegative(target.maxFlowLps, edgeRate);
    const rate = Math.min(edgeRate, sourceRate || edgeRate, targetRate || edgeRate) * pressureFactor;
    const available = Math.max(0, (startAvailable.get(source.id) || 0) - outgoing.get(source.id));
    const targetSpace = Math.max(0, target.capacityL - (target.quantityL + incoming.get(target.id)));
    const gross = Math.min(available, targetSpace / Math.max(EPSILON, 1 - finiteNonNegative(edge.lossRatio)), rate * dtSec);
    if (gross <= EPSILON) continue;
    const lossRatio = Number(edge.lossRatio ?? 0);
    if (!(lossRatio >= 0 && lossRatio < 1)) throw new Error("FLUID_EDGE_LOSS_INVALID:" + edge.id);
    const delivered = gross * (1 - lossRatio), loss = gross - delivered;
    outgoing.set(source.id, outgoing.get(source.id) + gross);
    incoming.set(target.id, incoming.get(target.id) + delivered);
    movedL += gross; deliveredL += delivered; lostL += loss;
    if (!target.fluidType) target.fluidType = source.fluidType;
    const oldTargetL = target.quantityL + incoming.get(target.id) - delivered;
    const denominator = oldTargetL + delivered;
    if (denominator > EPSILON) {
      target.temperatureC = ((finiteNonNegative(target.temperatureC) * oldTargetL) + (finiteNonNegative(source.temperatureC) * delivered)) / denominator;
      target.contamination = ((finiteNonNegative(target.contamination) * oldTargetL) + (finiteNonNegative(source.contamination) * delivered)) / denominator;
    }
    transfers.push({ edgeID: edge.id, sourceID: source.id, targetID: target.id, fluidType: source.fluidType, movedL: gross, deliveredL: delivered, lostL: loss });
  }
  for (const node of state.fluidNodes) {
    node.quantityL = Math.max(0, node.quantityL - outgoing.get(node.id) + incoming.get(node.id));
  }
  const endTotalL = state.fluidNodes.reduce((sum, node) => sum + node.quantityL, 0);
  const conservationErrorL = startTotalL - endTotalL - lostL;
  if (Math.abs(conservationErrorL) > 1e-6) throw new Error("FLUID_MASS_CONSERVATION_FAILED");
  for (const component of components) for (const node of component.nodes) node.networkID = component.networkID;
  const result = { movedL, deliveredL, lostL, startTotalL, endTotalL, conservationErrorL, transfers };
  state.lastFluidTick = result;
  return result;
}
