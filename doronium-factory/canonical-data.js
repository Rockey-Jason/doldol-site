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
export function applyDoronumMigration(state){
 if(!state||typeof state!=="object"||!state.runtime||!Array.isArray(state.runtime.itemStacks))return {version:CANONICAL_ITEM_MIGRATION_VERSION,changes:[],quarantined:[],requiresUserResolution:false};
 const plan=planDoronumMigration(state.runtime.itemStacks),map=new Map(plan.changes.map(x=>[x.from,x.to]));
 for(const change of plan.changes){
  const stack=state.runtime.itemStacks.find(x=>x.runtimeID===change.stackID);if(!stack)continue;
  stack.sourceItemID??=change.from;stack.itemID=change.to;stack.migrationVersion=CANONICAL_ITEM_MIGRATION_VERSION;
 }
 for(const item of plan.quarantined){
  const stack=state.runtime.itemStacks.find(x=>x.runtimeID===item.stackID);if(!stack)continue;
  stack.quarantined=true;stack.quarantineReason=item.reason;stack.sourceItemID??=item.itemID;
 }
 for(const reservation of Object.values(state.runtime.reservations||{}))if(map.has(reservation.itemID))reservation.itemID=map.get(reservation.itemID);
 const remapRecord=record=>{
  if(!record||typeof record!=="object")return;
  for(const [from,to] of map)if(Object.hasOwn(record,from)){record[to]=(Number(record[to])||0)+(Number(record[from])||0);delete record[from]}
 };
 remapRecord(state.inventory);remapRecord(state.meta);remapRecord(state.stats?.produced);remapRecord(state.stats?.gathered);
 for(const building of state.buildings||[]){
  if(building.input)remapRecord(building.input);
  if(building.output&&map.has(building.output.id))building.output.id=map.get(building.output.id);
  if(map.has(building.variant))building.variant=map.get(building.variant);
 }
 for(const shipment of state.contractRuntime?.shipments||[])if(map.has(shipment.itemID))shipment.itemID=map.get(shipment.itemID);
 for(const transaction of Object.values(state.constructionLedger||{}))if(transaction.materials)remapRecord(transaction.materials);
 state.canonicalDoronumMigrationVersion=CANONICAL_ITEM_MIGRATION_VERSION;
 state.canonicalDoronumQuarantine=plan.quarantined.map(x=>({stackID:x.stackID,itemID:x.itemID,quantity:x.quantity,reason:x.reason}));
 return plan;
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

/* Canonical 15-item presentation/physical/recipe catalog from the v4.5 spec.
   The live factory must consume this catalog only after all referenced raw
   materials, machine IDs and save migrations exist. */
const doronumEntry=(id,name,role,recipeRefs,useCaseTags,recipe=null,acquisition=null,extra={})=>({
 id,name,role,recipeRefs,useCaseTags,
 presentationProfileID:"PRESENTATION_"+id,
 physicalProfileID:"PHYSICAL_"+id,
 modelProfileID:id,
 presentationProfile:{id:"PRESENTATION_"+id,metalness:0.8,roughness:0.18,emissionMode:"STATE_DEPENDENT",lods:[0,1,2],inventoryOrthographicIcon:true},
 physicalProfile:{id:"PHYSICAL_"+id,provenance:"MANUFACTURED",naturalOre:false,syntheticAllowed:false,productionMetadataRequired:true,infinityQualityMin:90,infinityPurityMin:90},
 modelRequirements:{lods:[0,1,2],inventoryOrthographicIcon:true,turntable360:true},
 naturalOre:false,syntheticAllowed:false,requiresProductionMetadata:true,
 infinityInput:{required:true,qualityMin:90,purityMin:90,synthetic:false,quantity:100},
 recipe,acquisition,...extra
});
export const CANONICAL_DORONUM_CATALOG=Object.freeze([
 doronumEntry("ITEM_DORONUM_NORMAL","Normal Doronum","high-density energy storage",["RECIPE_DORONUM_COMPRESSOR_NORMAL"],["energy-storage","variant-base","research-sample"],{
  machineID:"BUILDING_DORONUM_COMPRESSOR",inputs:{doriMeat:10},outputQuantity:1,durationSec:null,targetTemperatureC:null,targetPressureMPa:null,
  stabilization:["THERMAL","PRESSURE","RESONANCE"],syntheticInputForbidden:true,lockedRatio:"10:1",requiresFinalRecipeData:true
 }),
 doronumEntry("ITEM_DORONUM_YELLOW","Yellow Doronum","energy conduction and precision output stabilization",["RECIPE_DORONUM_YELLOW"],["circuitry","power-regulation"],{
  machineID:"BUILDING_DORONUM_REFINEMENT_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_GOLD_INGOT":2,"ITEM_QUARTZ":1},outputQuantity:1,durationSec:45,targetTemperatureC:700,targetPressureMPa:300
 }),
 doronumEntry("ITEM_DORONUM_ULTRA","Ultra Doronum","high-density high-stress industrial components",["RECIPE_DORONUM_ULTRA"],["advanced-compression","actuator","shielding"],{
  machineID:"BUILDING_ULTRA_MATERIAL_PRESS",inputs:{"ITEM_DORONUM_NORMAL":3,"ITEM_DIAMOND":1,"ITEM_TITANIUM_PLATE":2},outputQuantity:1,durationSec:90,targetTemperatureC:1200,targetPressureMPa:1000,requiresCooling:true,requiresInspection:true
 }),
 doronumEntry("ITEM_DORONUM_BLUE","Blue Doronum","low-temperature and cooling stability",["RECIPE_DORONUM_BLUE"],["cooling-loop","cold-stabilizer"],{
  machineID:"BUILDING_DORONUM_REFINEMENT_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_COLD_CRYSTAL_RAW":2,"ITEM_QUARTZ":2},outputQuantity:1,durationSec:60,targetTemperatureC:400,targetPressureMPa:200,requiresCoolingLoop:true
 }),
 doronumEntry("ITEM_DORONUM_RED","Red Doronum","high-temperature and thermal-shock resistance",["RECIPE_DORONUM_RED"],["heat-resistant-module"],{
  machineID:"BUILDING_DORONUM_REFINEMENT_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_HEAT_CRYSTAL":2,"ITEM_CHROME_INGOT":2},outputQuantity:1,durationSec:60,targetTemperatureC:1400,targetPressureMPa:500
 }),
 doronumEntry("ITEM_DORONUM_IRON","Iron Doronum","high-load and wear-resistant structure",["RECIPE_DORONUM_IRON"],["heavy-frame","mining-head","high-pressure-ram","anchor"],{
  machineID:"BUILDING_REINFORCED_DORONUM_PRESS",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_STEEL_PLATE":3,"ITEM_MAGNETITE":2},outputQuantity:1,durationSec:75,targetTemperatureC:900,targetPressureMPa:700
 }),
 doronumEntry("ITEM_DORONUM_ORANGE","Orange Doronum","conduction and power stabilization",["RECIPE_DORONUM_ORANGE"],["transformer-module","energy-transfer","magnetic-field"],{
  machineID:"BUILDING_DORONUM_REFINEMENT_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_COPPER_WIRE":10,"ITEM_GOLD_INGOT":1},outputQuantity:1,durationSec:55,targetTemperatureC:800,targetPressureMPa:400
 }),
 doronumEntry("ITEM_DORONUM_SLIGHTLY_RUSTED","Slightly Rusted Doronum","oxidation analysis and corrosion research",["RECIPE_DORONUM_SLIGHTLY_RUSTED"],["failure-analysis","corrosion-research","special-contract"],{
  machineID:"BUILDING_CONTROLLED_ATMOSPHERE_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_IRON_ORE":1,"FLUID_WATER_L":1},outputQuantity:1,durationSec:40,targetTemperatureC:null,targetPressureMPa:null,requiresFinalRecipeData:true,qualityPurityPolicy:"no-purity-loss-if-infinity-eligible"
 }),
 doronumEntry("ITEM_DORONUM_RUSTED","Rusted Doronum","oxidation, recovery and purification research",["RECIPE_DORONUM_RUSTED_OXIDATION","RECIPE_PURIFY_RUSTED_DORONUM"],["oxidation-research","material-recovery","lore-contract"],{
  machineID:"BUILDING_CONTROLLED_ATMOSPHERE_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_IRON_ORE":2,"FLUID_WATER_L":3},outputQuantity:1,durationSec:60,targetTemperatureC:null,targetPressureMPa:null,requiresFinalRecipeData:true,purificationRequiredForInfinity:true,qualityPurityGuaranteed:false
 }),
 doronumEntry("ITEM_DORONUM_TRANSLUCENT","Translucent Doronum","optical sensors and precision light-energy transfer",["RECIPE_DORONUM_TRANSLUCENT"],["optical-sensor","inspection","photonic-transfer"],{
  machineID:"BUILDING_OPTICAL_REFINEMENT_CHAMBER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_QUARTZ":4,"ITEM_DIAMOND":1},outputQuantity:1,durationSec:90,targetTemperatureC:650,targetPressureMPa:500,requiresTransmissionShader:true
 }),
 doronumEntry("ITEM_DORONUM_THERMAL_CRYSTAL","Thermal Crystal","thermal stabilization and heat exchange",["RECIPE_DORONUM_THERMAL_CRYSTAL"],["thermal-stabilizer","heat-exchange","high-temperature-process"],{
  machineID:"BUILDING_THERMAL_STABILIZER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_HEAT_CRYSTAL":3},outputQuantity:1,durationSec:75,targetTemperatureC:1100,targetPressureMPa:600
 }),
 doronumEntry("ITEM_DORONUM_COLD_CRYSTAL","Cold Crystal","low-temperature stabilization and cooling safety",["RECIPE_DORONUM_COLD_CRYSTAL"],["cooling-stabilizer","cooling-loop","safe-shutdown"],{
  machineID:"BUILDING_COOLING_STABILIZER",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_COLD_CRYSTAL_RAW":3},outputQuantity:1,durationSec:75,targetTemperatureC:250,targetPressureMPa:400
 }),
 doronumEntry("ITEM_DORONUM_BLACK","Black Doronum","energy absorption and peak-load buffering",["RECIPE_DORONUM_BLACK"],["energy-absorption","load-buffer","peak-stabilization"],{
  machineID:"BUILDING_ABSORPTION_PRESS",inputs:{"ITEM_DORONUM_NORMAL":1,"ITEM_CARBON_POWDER":5,"ITEM_DIAMOND":1},outputQuantity:1,durationSec:100,targetTemperatureC:1000,targetPressureMPa:800,bufferCapacityUnit:"kJ",peakAbsorptionUnit:"kW",unboundedEnergyForbidden:true
 }),
 doronumEntry("ITEM_DORONUM_SPECIAL_EDITION","Special Edition Doronum","special contracts and story restoration records",["RECIPE_SPECIAL_EDITION_BATCH"],["special-contract","story-recovery","precision-manufacturing"],null,{
  researchID:"SPECIAL_EDITION_BATCH",contractID:"SECURITY_MANUFACTURING_CONTRACT",productionLineID:"BUILDING_SPECIAL_EDITION_LINE",campaignSupplyMustCoverInfinityQuantity:100,bonusSupplyMayBeLimited:true
 }),
 doronumEntry("ITEM_DORONUM_LIMITED_EDITION","Limited Edition Doronum","limited-supply campaign and high-difficulty contracts",["RECIPE_LIMITED_EDITION_BATCH"],["limited-contract","legacy-batch","infinity-input-test"],null,{
  productionLineID:"BUILDING_FIRST_FACTORY_LEGACY_BATCH_LINE",requiresLineRepair:true,contractID:"LIMITED_EDITION_CONTRACT",maximumCampaignSupply:100,repeatableRecipe:false
 })
]);
export function validateCanonicalDoronumCatalog(catalog=CANONICAL_DORONUM_CATALOG){
 const errors=[],ids=new Set(),profiles=new Set();
 for(const item of catalog||[]){
  if(!item||typeof item.id!=="string"){errors.push("invalid-catalog-item");continue}
  if(ids.has(item.id))errors.push("duplicate-id:"+item.id);ids.add(item.id);
  for(const key of ["presentationProfileID","physicalProfileID","modelProfileID"])if(!item[key])errors.push("missing-"+key+":"+item.id);
  for(const key of [item.presentationProfileID,item.physicalProfileID,item.modelProfileID]){if(profiles.has(key))errors.push("duplicate-profile:"+key);profiles.add(key)}
  if(item.naturalOre!==false||item.syntheticAllowed!==false||item.requiresProductionMetadata!==true)errors.push("invalid-provenance-policy:"+item.id);
  if(item.presentationProfile?.id!==item.presentationProfileID||item.presentationProfile?.emissionMode!=="STATE_DEPENDENT"||item.presentationProfile?.metalness<.7||item.presentationProfile?.metalness>.9||item.presentationProfile?.roughness<.1||item.presentationProfile?.roughness>.25)errors.push("invalid-presentation-profile:"+item.id);
  if(item.physicalProfile?.id!==item.physicalProfileID||item.physicalProfile?.provenance!=="MANUFACTURED"||item.physicalProfile?.naturalOre!==false||item.physicalProfile?.syntheticAllowed!==false||item.physicalProfile?.infinityQualityMin!==90||item.physicalProfile?.infinityPurityMin!==90)errors.push("invalid-physical-profile:"+item.id);
  if(!Array.isArray(item.recipeRefs)||!item.recipeRefs.length)errors.push("missing-recipe-refs:"+item.id);
  if(!Array.isArray(item.useCaseTags)||!item.useCaseTags.length)errors.push("missing-use-cases:"+item.id);
  if(![0,1,2].every(level=>item.modelRequirements?.lods?.includes(level))||item.modelRequirements?.inventoryOrthographicIcon!==true)errors.push("incomplete-model-requirements:"+item.id);
  if(item.recipe){
   if(!item.recipe.machineID||!item.recipe.inputs||Object.keys(item.recipe.inputs).length===0)errors.push("incomplete-recipe:"+item.id);
   for(const [input,quantity] of Object.entries(item.recipe.inputs||{}))if(!Number.isFinite(Number(quantity))||Number(quantity)<=0)errors.push("invalid-recipe-input:"+item.id+":"+input);
   if(item.recipe.durationSec!==null&&(!Number.isFinite(Number(item.recipe.durationSec))||Number(item.recipe.durationSec)<=0))errors.push("invalid-recipe-duration:"+item.id);
   if(item.recipe.targetTemperatureC!==null&&(!Number.isFinite(Number(item.recipe.targetTemperatureC))||Number(item.recipe.targetTemperatureC)<0))errors.push("invalid-recipe-temperature:"+item.id);
   if(item.recipe.targetPressureMPa!==null&&(!Number.isFinite(Number(item.recipe.targetPressureMPa))||Number(item.recipe.targetPressureMPa)<0))errors.push("invalid-recipe-pressure:"+item.id);
  }else if(!item.acquisition)errors.push("missing-acquisition:"+item.id);
 }
 if(ids.size!==15)errors.push("canonical-count-not-15:"+ids.size);
 return {valid:errors.length===0,errors,count:ids.size};
}

export function auditCanonicalDoronumIntegration({
 catalog=CANONICAL_DORONUM_CATALOG,resources={},buildings=[],recipes={},research=[],fluidTypes=[],modelIDs=[]
}={}){
 const resourceIDs=new Set(Object.keys(resources)),buildingIDs=new Set(buildings.map(x=>x?.id)),recipeIDs=new Set(Object.keys(recipes)),researchIDs=new Set(research.map(x=>x?.id));
 const missingCanonicalItems=[],missingModels=[],missingRawResources=new Set(),missingMachines=new Set(),missingRecipes=new Set(),missingResearch=new Set(),missingFluids=new Set();
 for(const item of catalog||[]){
  if(!resourceIDs.has(item.id))missingCanonicalItems.push(item.id);
  if(!new Set(modelIDs).has(item.modelProfileID))missingModels.push(item.modelProfileID);
  for(const recipeRef of item.recipeRefs||[])if(!recipeIDs.has(recipeRef))missingRecipes.add(recipeRef);
  if(item.recipe){
   if(!buildingIDs.has(item.recipe.machineID))missingMachines.add(item.recipe.machineID);
   for(const input of Object.keys(item.recipe.inputs||{})){
    if(input.startsWith("FLUID_")){
     const fluid=input.slice(6).replace(/_L$/,"");
     if(!new Set(fluidTypes).has(fluid))missingFluids.add(fluid);
    }else if(!resourceIDs.has(input))missingRawResources.add(input);
   }
  }
  if(item.acquisition?.researchID&&!researchIDs.has(item.acquisition.researchID))missingResearch.add(item.acquisition.researchID);
 }
 const result={
  complete:!missingCanonicalItems.length&&!missingModels.length&&!missingRawResources.size&&!missingMachines.size&&!missingRecipes.size&&!missingResearch.size&&!missingFluids.size,
  missingCanonicalItems:missingCanonicalItems.sort(),
  missingModels:missingModels.sort(),
  missingRawResources:[...missingRawResources].sort(),
  missingMachines:[...missingMachines].sort(),
  missingRecipes:[...missingRecipes].sort(),
  missingResearch:[...missingResearch].sort(),
  missingFluids:[...missingFluids].sort()
 };
 result.missingCount=Object.values(result).filter(Array.isArray).reduce((n,values)=>n+values.length,0);
 return result;
}
