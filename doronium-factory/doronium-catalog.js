/* Canonical Doronum IDs and explicit legacy-save migration.
 * IDs with no exact semantic equivalent are deliberately preserved unchanged.
 */
export const CANONICAL_DORONUM_IDS = Object.freeze([
  "ITEM_DORONUM_NORMAL",
  "ITEM_DORONUM_YELLOW",
  "ITEM_DORONUM_ULTRA",
  "ITEM_DORONUM_BLUE",
  "ITEM_DORONUM_RED",
  "ITEM_DORONUM_IRON",
  "ITEM_DORONUM_ORANGE",
  "ITEM_DORONUM_SLIGHTLY_RUSTED",
  "ITEM_DORONUM_RUSTED",
  "ITEM_DORONUM_TRANSLUCENT",
  "ITEM_DORONUM_THERMAL_CRYSTAL",
  "ITEM_DORONUM_COLD_CRYSTAL",
  "ITEM_DORONUM_BLACK",
  "ITEM_DORONUM_SPECIAL_EDITION",
  "ITEM_DORONUM_LIMITED_EDITION"
]);
export const CANONICAL_INFINITY_ID = "ITEM_DORONUM_INFINITY";
export const DORONUM_LEGACY_ID_MAP = Object.freeze({
  doronium_normal: "ITEM_DORONUM_NORMAL",
  doronium_blue: "ITEM_DORONUM_BLUE",
  doronium_red: "ITEM_DORONUM_RED",
  doronium_iron: "ITEM_DORONUM_IRON",
  doronium_orange: "ITEM_DORONUM_ORANGE",
  doronium_thermal: "ITEM_DORONUM_THERMAL_CRYSTAL",
  doronium_cold: "ITEM_DORONUM_COLD_CRYSTAL",
  doronium_black: "ITEM_DORONUM_BLACK",
  doronium_clear: "ITEM_DORONUM_TRANSLUCENT",
  doronium_special: "ITEM_DORONUM_SPECIAL_EDITION",
  doronium_limited: "ITEM_DORONUM_LIMITED_EDITION",
  infinity: CANONICAL_INFINITY_ID
});
export const UNMAPPED_LEGACY_DORONUM_IDS = Object.freeze([
  "doronium_crystal",
  "doronium_resonant",
  "doronium_prismatic",
  "doronium_void"
]);
export const DORONUM_MIGRATION_VERSION = 1;

const DISPLAY = Object.freeze({
  ITEM_DORONUM_NORMAL: ["일반 도로늄","🔷",900],
  ITEM_DORONUM_YELLOW: ["옐로 도로늄","🟡",1800],
  ITEM_DORONUM_ULTRA: ["울트라 도로늄","💠",4500],
  ITEM_DORONUM_BLUE: ["블루 도로늄","🟦",1400],
  ITEM_DORONUM_RED: ["레드 도로늄","🟥",1500],
  ITEM_DORONUM_IRON: ["아이언 도로늄","⚙️",1600],
  ITEM_DORONUM_ORANGE: ["오렌지 도로늄","🟠",1700],
  ITEM_DORONUM_SLIGHTLY_RUSTED: ["약산화 도로늄","🟤",1500],
  ITEM_DORONUM_RUSTED: ["산화 도로늄","🛡️",1800],
  ITEM_DORONUM_TRANSLUCENT: ["반투명 도로늄","💎",2600],
  ITEM_DORONUM_THERMAL_CRYSTAL: ["써멀 크리스탈","🔥",1900],
  ITEM_DORONUM_COLD_CRYSTAL: ["도로늄 콜드 크리스탈","❄️",1900],
  ITEM_DORONUM_BLACK: ["블랙 도로늄","⚫",2400],
  ITEM_DORONUM_SPECIAL_EDITION: ["스페셜 에디션 도로늄","✨",3200],
  ITEM_DORONUM_LIMITED_EDITION: ["리미티드 에디션 도로늄","🌟",5000],
  ITEM_DORONUM_INFINITY: ["인피니티 도로늄","💠",1000000]
});
export function registerCanonicalDoronumResources(resources) {
  if(!resources||typeof resources!=="object")throw new TypeError("RESOURCE_REGISTRY_REQUIRED");
  for(const id of [...CANONICAL_DORONUM_IDS,CANONICAL_INFINITY_ID]) {
    const [name,icon,price]=DISPLAY[id];
    resources[id] ??= {name,icon,price,kind:id===CANONICAL_INFINITY_ID?"final":"doronium"};
  }
  return resources;
}
function remapCountRecord(record) {
  if(!record||typeof record!=="object"||Array.isArray(record))return record;
  for(const [legacy,canonical] of Object.entries(DORONUM_LEGACY_ID_MAP)) {
    if(!Object.hasOwn(record,legacy))continue;
    const value=record[legacy];
    delete record[legacy];
    const current=record[canonical];
    if(Number.isFinite(Number(value))&&Number.isFinite(Number(current))&&current!==undefined)
      record[canonical]=Number(current)+Number(value);
    else if(current===undefined)record[canonical]=value;
  }
  return record;
}
function remapInputBuffers(building) {
  if(!building||typeof building!=="object")return;
  const before=building.input&&typeof building.input==="object"?building.input:{};
  const metadata=building.inputMeta&&typeof building.inputMeta==="object"?building.inputMeta:{};
  const next={},nextMeta={};
  for(const [sourceID,rawQuantity] of Object.entries(before)) {
    const id=DORONUM_LEGACY_ID_MAP[sourceID]||sourceID;
    const quantity=Math.max(0,Math.floor(Number(rawQuantity)||0));
    if(!quantity)continue;
    const oldQuantity=next[id]||0,oldMeta=nextMeta[id]||{quality:90,purity:90,synthetic:false};
    const meta=metadata[sourceID]||{quality:90,purity:90,synthetic:false};
    const combined=oldQuantity+quantity;
    next[id]=combined;
    nextMeta[id]={
      quality:(oldMeta.quality*oldQuantity+(Number(meta.quality)||0)*quantity)/combined,
      purity:(oldMeta.purity*oldQuantity+(Number(meta.purity)||0)*quantity)/combined,
      synthetic:!!oldMeta.synthetic||!!meta.synthetic
    };
  }
  building.input=next;
  building.inputMeta=nextMeta;
  if(DORONUM_LEGACY_ID_MAP[building.variant])building.variant=DORONUM_LEGACY_ID_MAP[building.variant];
  if(building.output&&DORONUM_LEGACY_ID_MAP[building.output.id])
    building.output={...building.output,id:DORONUM_LEGACY_ID_MAP[building.output.id]};
}
export function migrateCanonicalDoronumState(state) {
  if(!state||typeof state!=="object")throw new TypeError("SAVE_STATE_REQUIRED");
  const prior=Math.max(0,Math.floor(Number(state.canonicalDoronumMigration)||0));
  if(prior>=DORONUM_MIGRATION_VERSION)return {migrated:false,version:prior,changedStacks:0,unmapped:UNMAPPED_LEGACY_DORONUM_IDS.filter(id=>Number(state.inventory?.[id])>0)};
  const runtime=state.runtime&&typeof state.runtime==="object"?state.runtime:null;
  let changedStacks=0;
  if(Array.isArray(runtime?.itemStacks))for(const stack of runtime.itemStacks){
    const canonical=DORONUM_LEGACY_ID_MAP[stack?.itemID];
    if(canonical){stack.itemID=canonical;changedStacks++}
  }
  for(const reservation of Object.values(runtime?.reservations||{})){
    if(reservation?.itemID&&DORONUM_LEGACY_ID_MAP[reservation.itemID])
      reservation.itemID=DORONUM_LEGACY_ID_MAP[reservation.itemID];
  }
  for(const reservation of runtime?.reservationHistory||[]){
    if(reservation?.itemID&&DORONUM_LEGACY_ID_MAP[reservation.itemID])
      reservation.itemID=DORONUM_LEGACY_ID_MAP[reservation.itemID];
  }
  remapCountRecord(state.inventory);
  remapCountRecord(state.meta);
  remapCountRecord(state.stats?.produced);
  remapCountRecord(state.stats?.gathered);
  remapCountRecord(state.stats?.soldByItem);
  for(const building of state.buildings||[])remapInputBuffers(building);
  if(state.fusionJob?.inputManifest)for(const input of state.fusionJob.inputManifest){
    if(DORONUM_LEGACY_ID_MAP[input.itemID])input.itemID=DORONUM_LEGACY_ID_MAP[input.itemID];
  }
  state.canonicalDoronumMigration=DORONUM_MIGRATION_VERSION;
  return {
    migrated:true,version:DORONUM_MIGRATION_VERSION,changedStacks,
    unmapped:UNMAPPED_LEGACY_DORONUM_IDS.filter(id=>Number(state.inventory?.[id])>0)
  };
}
