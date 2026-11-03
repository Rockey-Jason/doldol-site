/* B9 canonical Doronium item registry. Legacy aliases are intentionally conservative. */
export const DORONIUM_CATALOG_VERSION = 1;
export const CANONICAL_DORONIUM_IDS = Object.freeze([
  "ITEM_DORONUM_NORMAL", "ITEM_DORONUM_YELLOW", "ITEM_DORONUM_ULTRA",
  "ITEM_DORONUM_BLUE", "ITEM_DORONUM_RED", "ITEM_DORONUM_IRON",
  "ITEM_DORONUM_ORANGE", "ITEM_DORONUM_SLIGHTLY_RUSTED", "ITEM_DORONUM_RUSTED",
  "ITEM_DORONUM_TRANSLUCENT", "ITEM_DORONUM_THERMAL_CRYSTAL",
  "ITEM_DORONUM_COLD_CRYSTAL", "ITEM_DORONUM_BLACK",
  "ITEM_DORONUM_SPECIAL_EDITION", "ITEM_DORONUM_LIMITED_EDITION"
]);

export const CANONICAL_DORONIUM_ITEMS = Object.freeze([
  { id: "ITEM_DORONUM_NORMAL", label: "일반 도로늄", legacyIDs: ["doronium_normal"] },
  { id: "ITEM_DORONUM_YELLOW", label: "옐로 도로늄", legacyIDs: [] },
  { id: "ITEM_DORONUM_ULTRA", label: "울트라 도로늄", legacyIDs: [] },
  { id: "ITEM_DORONUM_BLUE", label: "블루 도로늄", legacyIDs: ["doronium_blue"] },
  { id: "ITEM_DORONUM_RED", label: "레드 도로늄", legacyIDs: ["doronium_red"] },
  { id: "ITEM_DORONUM_IRON", label: "아이언 도로늄", legacyIDs: ["doronium_iron"] },
  { id: "ITEM_DORONUM_ORANGE", label: "오렌지 도로늄", legacyIDs: ["doronium_orange"] },
  { id: "ITEM_DORONUM_SLIGHTLY_RUSTED", label: "약간 녹슨 도로늄", legacyIDs: [] },
  { id: "ITEM_DORONUM_RUSTED", label: "녹슨 도로늄", legacyIDs: [] },
  { id: "ITEM_DORONUM_TRANSLUCENT", label: "반투명 도로늄", legacyIDs: ["doronium_clear"] },
  { id: "ITEM_DORONUM_THERMAL_CRYSTAL", label: "열 결정 도로늄", legacyIDs: ["doronium_thermal"] },
  { id: "ITEM_DORONUM_COLD_CRYSTAL", label: "냉 결정 도로늄", legacyIDs: ["doronium_cold"] },
  { id: "ITEM_DORONUM_BLACK", label: "블랙 도로늄", legacyIDs: ["doronium_black"] },
  { id: "ITEM_DORONUM_SPECIAL_EDITION", label: "스페셜 에디션 도로늄", legacyIDs: ["doronium_special"] },
  { id: "ITEM_DORONUM_LIMITED_EDITION", label: "리미티드 에디션 도로늄", legacyIDs: ["doronium_limited"] }
]);

export const SAFE_LEGACY_DORONIUM_MAP = Object.freeze(
  Object.fromEntries(CANONICAL_DORONIUM_ITEMS.flatMap(item =>
    item.legacyIDs.map(legacyID => [legacyID, item.id])
  ))
);

export const AMBIGUOUS_LEGACY_DORONIUM_IDS = Object.freeze([
  "doronium_crystal", "doronium_resonant", "doronium_prismatic", "doronium_void"
]);

export function planDoroniumMigration(state) {
  const sourceStacks = Array.isArray(state?.runtime?.itemStacks) && state.runtime.itemStacks.length
    ? state.runtime.itemStacks
    : Object.entries(state?.inventory || {}).map(([itemID, quantity], index) => ({
        runtimeID: "LEGACY-" + index, itemID, quantity
      }));
  const mapped = [], unresolved = [], unaffected = [];
  for (const stack of sourceStacks) {
    const itemID = String(stack?.itemID || "");
    const quantity = Math.max(0, Math.floor(Number(stack?.quantity) || 0));
    if (quantity <= 0) continue;
    if (SAFE_LEGACY_DORONIUM_MAP[itemID]) {
      mapped.push({
        stackID: String(stack.runtimeID || ""), sourceID: itemID,
        targetID: SAFE_LEGACY_DORONIUM_MAP[itemID], quantity
      });
    } else if (AMBIGUOUS_LEGACY_DORONIUM_IDS.includes(itemID)) {
      unresolved.push({
        stackID: String(stack.runtimeID || ""), sourceID: itemID, quantity,
        reason: "NO_CANONICAL_EQUIVALENCE_IN_V4_5_SPEC"
      });
    } else {
      unaffected.push({ stackID: String(stack.runtimeID || ""), itemID, quantity });
    }
  }
  return {
    catalogVersion: DORONIUM_CATALOG_VERSION,
    safeMappingCount: mapped.length,
    unresolvedCount: unresolved.length,
    mapped, unresolved, unaffected,
    applied: false
  };
}

/* Builds an exact stack-level input manifest. No aliases, aggregates or averages are accepted. */
export function selectQualifiedDoroniumManifest(stacks, quantityPerVariant = 100) {
  const required = Number(quantityPerVariant);
  if (!Number.isSafeInteger(required) || required <= 0 || !Array.isArray(stacks)) {
    return { valid: false, errors: ["INVALID_MANIFEST_ARGUMENT"], manifest: [] };
  }
  const manifest = [];
  const errors = [];
  for (const itemID of CANONICAL_DORONIUM_IDS) {
    let remaining = required;
    for (const stack of stacks) {
      if (remaining <= 0) break;
      if (stack?.itemID !== itemID || !Number.isSafeInteger(stack.quantity) || stack.quantity <= 0 ||
          !Number.isFinite(Number(stack.quality)) || Number(stack.quality) < 90 ||
          !Number.isFinite(Number(stack.purity)) || Number(stack.purity) < 90 ||
          stack.synthetic !== false) continue;
      const quantity = Math.min(remaining, stack.quantity);
      manifest.push({
        stackID: String(stack.runtimeID || stack.stackID || ""),
        itemID, quantity,
        quality: Number(stack.quality), purity: Number(stack.purity), synthetic: false
      });
      remaining -= quantity;
    }
    if (remaining > 0) errors.push("INSUFFICIENT_QUALIFIED_INPUT:" + itemID + ":" + remaining);
  }
  return {
    valid: errors.length === 0,
    errors,
    manifest: errors.length === 0 ? manifest : [],
    totalQuantity: errors.length === 0 ? manifest.reduce((sum, row) => sum + row.quantity, 0) : 0
  };
}
