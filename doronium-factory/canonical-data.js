/* Canonical v4.5.0 Doronum manifest and non-destructive legacy migration. */
export const CANONICAL_DORONUM_IDS=Object.freeze([
 "ITEM_DORONUM_NORMAL","ITEM_DORONUM_YELLOW","ITEM_DORONUM_ULTRA",
 "ITEM_DORONUM_BLUE","ITEM_DORONUM_RED","ITEM_DORONUM_IRON",
 "ITEM_DORONUM_ORANGE","ITEM_DORONUM_SLIGHTLY_RUSTED","ITEM_DORONUM_RUSTED",
 "ITEM_DORONUM_TRANSLUCENT","ITEM_DORONUM_THERMAL_CRYSTAL","ITEM_DORONUM_COLD_CRYSTAL",
 "ITEM_DORONUM_BLACK","ITEM_DORONUM_SPECIAL_EDITION","ITEM_DORONUM_LIMITED_EDITION"
]);
export const INFINITY_REQUIREMENTS=Object.freeze(Object.fromEntries(CANONICAL_DORONUM_IDS.map(id=>[id,100])));
export const INFINITY_TOTAL_INPUT=1500;
export const CANONICAL_ITEM_MIGRATION_VERSION=1;
/* Only semantically unambiguous aliases are migrated. Similar-looking legacy
   variants are quarantined rather than silently converted to a different item. */
export const LEGACY_DORONUM_ID_MAP=Object.freeze({
 doronium_normal:"ITEM_DORONUM_NORMAL",
 doronium_blue:"ITEM_DORONUM_BLUE",
 doronium_red:"ITEM_DORONUM_RED",
 doronium_iron:"ITEM_DORONUM_IRON",
 doronium_orange:"ITEM_DORONUM_ORANGE",
 doronium_thermal:"ITEM_DORONUM_THERMAL_CRYSTAL",
 doronium_cold:"ITEM_DORONUM_COLD_CRYSTAL",
 doronium_black:"ITEM_DORONUM_BLACK",
 doronium_clear:"ITEM_DORONUM_TRANSLUCENT",
 doronium_special:"ITEM_DORONUM_SPECIAL_EDITION",
 doronium_limited:"ITEM_DORONUM_LIMITED_EDITION"
});
export const UNRESOLVED_LEGACY_DORONUM_IDS=Object.freeze([
 "doronium_crystal","doronium_resonant","doronium_prismatic","doronium_void"
]);
export function planDoronumMigration(stacks=[]){
 const changes=[],quarantined=[];
 for(const stack of stacks){
  if(!stack||typeof stack.itemID!=="string")continue;
  const target=LEGACY_DORONUM_ID_MAP[stack.itemID];
  if(target)changes.push({stackID:stack.runtimeID,from:stack.itemID,to:target,quantity:stack.quantity});
  else if(UNRESOLVED_LEGACY_DORONUM_IDS.includes(stack.itemID))quarantined.push({stackID:stack.runtimeID,itemID:stack.itemID,quantity:stack.quantity,reason:"canonical-equivalence-not-defined"});
 }
 return {version:CANONICAL_ITEM_MIGRATION_VERSION,changes,quarantined,requiresUserResolution:quarantined.length>0};
}
export function validateInfinityManifest(stacks){
 const errors=[],totals=Object.fromEntries(CANONICAL_DORONUM_IDS.map(id=>[id,0]));
 for(const stack of stacks||[]){
  if(!stack||!Object.hasOwn(totals,stack.itemID))continue;
  if(!Number.isSafeInteger(stack.quantity)||stack.quantity<0)errors.push("invalid-quantity:"+stack.runtimeID);
  if(Number(stack.quality)<90)errors.push("quality-below-90:"+stack.runtimeID);
  if(Number(stack.purity)<90)errors.push("purity-below-90:"+stack.runtimeID);
  if(stack.synthetic)errors.push("synthetic-input:"+stack.runtimeID);
  totals[stack.itemID]+=Math.max(0,Number(stack.quantity)||0);
 }
 for(const id of CANONICAL_DORONUM_IDS)if(totals[id]<100)errors.push("insufficient:"+id);
 return {valid:errors.length===0,errors,totals,total:CANONICAL_DORONUM_IDS.reduce((n,id)=>n+totals[id],0)};
}
