/* Deterministic, renderer-independent runtime primitives for Doronium Factory. */
export const DEFAULT_FIXED_STEP_SECONDS = 0.1;
const MAX_UINT32 = 0xffffffff;
const STAGE_INDEX = new Map();

function finiteInteger(value, fallback = 0, minimum = 0) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= minimum ? n : fallback;
}
function hash32(value) {
  const text = String(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function normalizeWorldSeed(value) {
  const n = Number(value);
  if (Number.isSafeInteger(n) && n >= 0 && n <= MAX_UINT32) return n >>> 0;
  return hash32(value ?? "DORONIUM_FACTORY");
}

export function createRandomStream(seed, namespace = "default", restored = null) {
  const normalizedSeed = normalizeWorldSeed(seed);
  const initialState = (hash32(normalizedSeed + ":" + String(namespace)) || 0x6d2b79f5) >>> 0;
  let state = restored && Number.isSafeInteger(restored.state) && restored.state > 0
    ? restored.state >>> 0 : initialState;
  let index = restored ? finiteInteger(restored.index, 0) : 0;

  function nextUint32() {
    let x = state >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state = x >>> 0 || 0x6d2b79f5;
    index++;
    return state;
  }
  return Object.freeze({
    nextUint32,
    next: () => nextUint32() / 0x100000000,
    snapshot: () => ({ state, index }),
    restore(snapshot) {
      if (!snapshot || !Number.isSafeInteger(snapshot.state) || snapshot.state <= 0 ||
          !Number.isSafeInteger(snapshot.index) || snapshot.index < 0) {
        throw new TypeError("INVALID_RANDOM_STREAM_SNAPSHOT");
      }
      state = snapshot.state >>> 0;
      index = snapshot.index;
      return true;
    }
  });
}

export function createRandomStreams(seed, namespaces = []) {
  const normalizedSeed = normalizeWorldSeed(seed);
  const streams = new Map();
  for (const namespace of namespaces) {
    const key = String(namespace);
    if (key) streams.set(key, createRandomStream(normalizedSeed, key));
  }
  return Object.freeze({
    stream(namespace) {
      const key = String(namespace || "default");
      if (!streams.has(key)) streams.set(key, createRandomStream(normalizedSeed, key));
      return streams.get(key);
    },
    next(namespace) { return this.stream(namespace).next(); },
    snapshot() {
      return Object.fromEntries([...streams.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([key, stream]) => [key, stream.snapshot()]));
    },
    restore(snapshot) {
      if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
        throw new TypeError("INVALID_RANDOM_STREAMS_SNAPSHOT");
      }
      streams.clear();
      for (const [key, value] of Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b))) {
        streams.set(key, createRandomStream(normalizedSeed, key, value));
      }
      return true;
    }
  });
}

export function createDeterministicEventQueue(snapshot = {}) {
  let nextSequence = finiteInteger(snapshot.nextSequence, 1, 1);
  const queue = Array.isArray(snapshot.queue) ? clone(snapshot.queue) : [];
  const processed = new Set(Array.isArray(snapshot.processedKeys) ? snapshot.processedKeys.map(String) : []);
  const queuedKeys = new Set(queue.map(event => event.idempotencyKey).filter(Boolean).map(String));

  return Object.freeze({
    enqueue(event) {
      if (!event || !Number.isSafeInteger(event.tick) || event.tick < 0 ||
          !event.stage || typeof event.stage !== "string" ||
          !event.idempotencyKey || typeof event.idempotencyKey !== "string") {
        return { accepted: false, reason: "INVALID_EVENT" };
      }
      const key = event.idempotencyKey;
      if (processed.has(key) || queuedKeys.has(key)) return { accepted: false, reason: "DUPLICATE_EVENT" };
      const item = { ...clone(event), sequence: nextSequence++ };
      queue.push(item);
      queuedKeys.add(key);
      return { accepted: true, sequence: item.sequence };
    },
    drain({ throughTick = Number.MAX_SAFE_INTEGER, stageOrder = [], handle = () => {} } = {}) {
      const stageMap = new Map(stageOrder.map((stage, index) => [stage, index]));
      const order = (a, b) => a.tick - b.tick ||
        (stageMap.get(a.stage) ?? Number.MAX_SAFE_INTEGER) - (stageMap.get(b.stage) ?? Number.MAX_SAFE_INTEGER) ||
        a.sequence - b.sequence;
      queue.sort(order);
      let count = 0;
      while (queue.length && queue[0].tick <= throughTick) {
        const event = queue[0];
        handle(clone(event));
        queue.shift();
        queuedKeys.delete(event.idempotencyKey);
        processed.add(event.idempotencyKey);
        count++;
      }
      return count;
    },
    snapshot() {
      return { nextSequence, queue: clone(queue), processedKeys: [...processed].sort() };
    },
    get size() { return queue.length; },
    hasProcessed(key) { return processed.has(String(key)); }
  });
}

/* Run a mutation against a draft. A rejected or throwing operation never mutates target. */
export function runAtomicStateTransaction(target, operation) {
  if (!target || typeof target !== "object" || Array.isArray(target) || typeof operation !== "function") {
    return { ok: false, reason: "INVALID_TRANSACTION_TARGET" };
  }
  let draft;
  try { draft = clone(target); }
  catch (error) { return { ok: false, reason: "CLONE_FAILED", error }; }
  try {
    const value = operation(draft);
    if (value === false || (value && typeof value === "object" && value.ok === false)) {
      return { ok: false, reason: value?.reason || "TRANSACTION_REJECTED", value };
    }
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, draft);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, reason: "TRANSACTION_ABORTED", error };
  }
}

/* Never discards accumulated simulation time: excess ticks remain as backlog. */
export function advanceFixedStepAccumulator(accumulatorSeconds, elapsedSeconds,
  stepSeconds = DEFAULT_FIXED_STEP_SECONDS, maxTicks = 10) {
  const accumulator = Number(accumulatorSeconds);
  const elapsed = Number(elapsedSeconds);
  const step = Number(stepSeconds);
  const limit = Number(maxTicks);
  if (!Number.isFinite(accumulator) || accumulator < 0 ||
      !Number.isFinite(elapsed) || elapsed < 0 ||
      !Number.isFinite(step) || step <= 0 ||
      !Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError("INVALID_FIXED_STEP_ARGUMENT");
  }
  const total = accumulator + elapsed;
  const available = Math.floor((total + step * 1e-9) / step);
  const ticks = Math.min(available, limit);
  const remainder = Math.max(0, total - ticks * step);
  return {
    ticks,
    accumulator: remainder,
    backlogTicks: Math.floor((remainder + step * 1e-9) / step),
    consumedSeconds: ticks * step,
    pendingSeconds: remainder
  };
}

export function registerSimulationStages(stages) {
  if (!Array.isArray(stages) || new Set(stages).size !== stages.length ||
      stages.some(stage => typeof stage !== "string" || !stage)) {
    throw new TypeError("INVALID_SIMULATION_STAGE_ORDER");
  }
  STAGE_INDEX.clear();
  stages.forEach((stage, index) => STAGE_INDEX.set(stage, index));
  return Object.freeze([...stages]);
}
export function compareSimulationEvents(a, b) {
  return (Number(a?.tick) || 0) - (Number(b?.tick) || 0) ||
    (STAGE_INDEX.get(a?.stage) ?? Number.MAX_SAFE_INTEGER) -
      (STAGE_INDEX.get(b?.stage) ?? Number.MAX_SAFE_INTEGER) ||
    (Number(a?.sequence) || 0) - (Number(b?.sequence) || 0);
}
