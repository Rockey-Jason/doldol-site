/* Transactional custody for the existing 15-variant Infinity Fusion recipe.
   The caller supplies the current game IDs; this module does not alias legacy IDs
   to the separate canonical v4.5.0 manifest. */
import {
  ensureItemStacks, reserveItemBatch, releaseItemReservation,
  commitItemReservations
} from "./simulation-core.js";

export const FUSION_INPUT_COUNT = 100;
export const FUSION_VARIANT_COUNT = 15;
export const FUSION_RESERVATION_OWNER = "infinity-fusion";

function validManifest(itemIDs) {
  return Array.isArray(itemIDs)
    && itemIDs.length === FUSION_VARIANT_COUNT
    && itemIDs.every(id => typeof id === "string" && id.length > 0)
    && new Set(itemIDs).size === FUSION_VARIANT_COUNT;
}

export function validateFusionReservations(state, itemIDs, reservationIDs) {
  if (!validManifest(itemIDs) || !Array.isArray(reservationIDs)
      || reservationIDs.length !== FUSION_VARIANT_COUNT
      || new Set(reservationIDs).size !== FUSION_VARIANT_COUNT) return false;

  const runtime = ensureItemStacks(state);
  const byStack = new Map(runtime.itemStacks.map(stack => [stack.runtimeID, stack]));
  const seenItems = new Set();

  for (const reservationID of reservationIDs) {
    const reservation = runtime.reservations?.[reservationID];
    if (!reservation || reservation.status !== "reserved"
        || reservation.ownerID !== FUSION_RESERVATION_OWNER
        || seenItems.has(reservation.itemID)
        || !itemIDs.includes(reservation.itemID)
        || reservation.quantity !== FUSION_INPUT_COUNT) return false;
    seenItems.add(reservation.itemID);

    let allocated = 0;
    for (const allocation of reservation.allocations || []) {
      const stack = byStack.get(allocation.stackID);
      const quantity = Number(allocation.quantity);
      if (!stack || stack.itemID !== reservation.itemID
          || !Number.isSafeInteger(quantity) || quantity <= 0
          || stack.quality < 90 || stack.purity < 90 || stack.synthetic) return false;
      allocated += quantity;
    }
    if (allocated !== FUSION_INPUT_COUNT) return false;
  }
  return seenItems.size === FUSION_VARIANT_COUNT
    && itemIDs.every(id => seenItems.has(id));
}

export function reserveFusionInputs(state, itemIDs) {
  if (!validManifest(itemIDs)) {
    return { ok: false, reason: "INVALID_INPUT_MANIFEST", reservationIDs: [] };
  }

  const requirements = Object.fromEntries(itemIDs.map(id => [id, FUSION_INPUT_COUNT]));
  const reservationIDs = reserveItemBatch(state, requirements, FUSION_RESERVATION_OWNER);
  if (!reservationIDs || reservationIDs.length !== FUSION_VARIANT_COUNT) {
    return { ok: false, reason: "INSUFFICIENT_OR_RESERVED_INPUTS", reservationIDs: [] };
  }

  if (!validateFusionReservations(state, itemIDs, reservationIDs)) {
    releaseFusionInputs(state, reservationIDs);
    return { ok: false, reason: "INPUT_QUALITY_OR_PROVENANCE_REJECTED", reservationIDs: [] };
  }
  return { ok: true, reason: null, reservationIDs: [...reservationIDs] };
}

export function releaseFusionInputs(state, reservationIDs) {
  if (!Array.isArray(reservationIDs)) return 0;
  let released = 0;
  for (const reservationID of reservationIDs) {
    if (releaseItemReservation(state, reservationID)) released++;
  }
  return released;
}

export function commitFusionInputs(state, itemIDs, reservationIDs) {
  if (!validateFusionReservations(state, itemIDs, reservationIDs)) {
    return { ok: false, reason: "FUSION_RESERVATION_INVALID", consumed: [] };
  }
  const consumed = commitItemReservations(state, reservationIDs);
  if (!consumed) {
    return { ok: false, reason: "FUSION_COMMIT_REJECTED", consumed: [] };
  }
  const total = consumed.reduce((sum, stack) => sum + stack.quantity, 0);
  if (total !== FUSION_VARIANT_COUNT * FUSION_INPUT_COUNT) {
    return { ok: false, reason: "FUSION_CONSUMPTION_MISMATCH", consumed };
  }
  return { ok: true, reason: null, consumed, total };
}
