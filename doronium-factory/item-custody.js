/* Single-owner item custody ledger. Renderer and inventory projections are deliberately excluded. */
export const ITEM_OWNER_DOMAINS = Object.freeze([
  "PLAYER_INVENTORY", "WORLD_DROP", "MACHINE_INPUT_BUFFER", "MACHINE_OUTPUT_BUFFER",
  "CONVEYOR_SEGMENT", "WAREHOUSE", "ACTIVE_JOB_CUSTODY", "COMPLETION_BUFFER", "CONSUMED_LEDGER"
]);
const validDomains = new Set(ITEM_OWNER_DOMAINS);
const clone = value => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const validQuantity = value => Number.isSafeInteger(value) && value > 0;

export function createItemCustodyLedger() {
  return {
    schemaVersion: 1,
    nextTransferId: 1,
    entries: {},
    transferKeys: {},
    events: []
  };
}

function normalizeOwner(owner) {
  if (!owner || !validDomains.has(owner.domain) || typeof owner.id !== "string" || !owner.id.trim()) return null;
  return { domain: owner.domain, id: owner.id };
}

export function registerCustodyStack(ledger, stack, owner) {
  const normalizedOwner = normalizeOwner(owner);
  if (!ledger || !normalizedOwner || !stack || typeof stack.stackID !== "string" ||
      !stack.stackID || !stack.itemID || !validQuantity(stack.quantity)) {
    return { ok: false, reason: "INVALID_STACK_OR_OWNER" };
  }
  if (Object.hasOwn(ledger.entries, stack.stackID)) return { ok: false, reason: "STACK_ALREADY_OWNED" };
  ledger.entries[stack.stackID] = {
    stackID: stack.stackID,
    itemID: String(stack.itemID),
    quantity: stack.quantity,
    metadata: {
      quality: Number.isFinite(Number(stack.quality)) ? Number(stack.quality) : 90,
      purity: Number.isFinite(Number(stack.purity)) ? Number(stack.purity) : 90,
      synthetic: !!stack.synthetic,
      packaging: stack.packaging ?? null,
      provenance: stack.provenance ?? null
    },
    owner: normalizedOwner,
    version: 1
  };
  return { ok: true, entry: clone(ledger.entries[stack.stackID]) };
}

function hasProcessedKey(ledger, key) {
  return Object.hasOwn(ledger.transferKeys, key);
}

export function transferCustodyStack(ledger, {
  stackID, from, to, quantity, transferKey, splitStackID = null, tick = 0
} = {}) {
  if (!ledger || typeof stackID !== "string" || !transferKey || typeof transferKey !== "string") {
    return { ok: false, reason: "INVALID_TRANSFER" };
  }
  if (hasProcessedKey(ledger, transferKey)) {
    return { ok: true, duplicate: true, transferID: ledger.transferKeys[transferKey] };
  }
  const entry = ledger.entries[stackID];
  const source = normalizeOwner(from);
  const destination = normalizeOwner(to);
  const qty = Number(quantity);
  if (!entry || !source || !destination || !validQuantity(qty)) return { ok: false, reason: "INVALID_TRANSFER" };
  if (entry.owner.domain !== source.domain || entry.owner.id !== source.id) return { ok: false, reason: "OWNER_MISMATCH" };
  if (qty > entry.quantity) return { ok: false, reason: "INSUFFICIENT_CUSTODY" };
  if (qty < entry.quantity && (!splitStackID || typeof splitStackID !== "string" ||
      !splitStackID || Object.hasOwn(ledger.entries, splitStackID))) {
    return { ok: false, reason: "INVALID_SPLIT_STACK_ID" };
  }

  const transferID = "CUSTODY-" + ledger.nextTransferId++;
  let movedID = stackID;
  if (qty === entry.quantity) {
    entry.owner = destination;
    entry.version++;
  } else {
    entry.quantity -= qty;
    entry.version++;
    movedID = splitStackID;
    ledger.entries[movedID] = {
      ...clone(entry),
      stackID: movedID,
      quantity: qty,
      owner: destination,
      version: 1
    };
  }
  const event = {
    transferID, transferKey, sourceStackID: stackID, movedStackID: movedID,
    itemID: entry.itemID, quantity: qty, from: source, to: destination,
    tick: Number.isSafeInteger(tick) && tick >= 0 ? tick : 0
  };
  ledger.transferKeys[transferKey] = transferID;
  ledger.events.push(event);
  return { ok: true, duplicate: false, transferID, movedStackID: movedID, event: clone(event) };
}

export function consumeCustodyStack(ledger, args = {}) {
  return transferCustodyStack(ledger, {
    ...args,
    to: { domain: "CONSUMED_LEDGER", id: String(args?.to?.id || "consumption") }
  });
}

export function validateItemCustodyLedger(ledger) {
  const errors = [];
  if (!ledger || ledger.schemaVersion !== 1 || !ledger.entries || typeof ledger.entries !== "object") {
    return { valid: false, errors: ["INVALID_CUSTODY_LEDGER"] };
  }
  for (const [key, entry] of Object.entries(ledger.entries)) {
    if (key !== entry?.stackID) errors.push("STACK_KEY_MISMATCH:" + key);
    if (!entry?.itemID || !validQuantity(entry.quantity)) errors.push("INVALID_STACK:" + key);
    if (!normalizeOwner(entry?.owner)) errors.push("INVALID_OWNER:" + key);
  }
  const transferIDs = new Set();
  for (const event of ledger.events || []) {
    if (!event?.transferID || transferIDs.has(event.transferID)) errors.push("DUPLICATE_TRANSFER_ID:" + event?.transferID);
    transferIDs.add(event?.transferID);
    if (ledger.transferKeys?.[event.transferKey] !== event.transferID) errors.push("TRANSFER_KEY_MISMATCH:" + event.transferKey);
  }
  for (const [key, transferID] of Object.entries(ledger.transferKeys || {})) {
    if (!transferIDs.has(transferID)) errors.push("ORPHAN_TRANSFER_KEY:" + key);
  }
  return { valid: errors.length === 0, errors, stackCount: Object.keys(ledger.entries).length, transferCount: transferIDs.size };
}
