import test from "node:test";import assert from "node:assert/strict";
import {CANONICAL_DORONUM_IDS,INFINITY_REQUIREMENTS,CANONICAL_DORONUM_CATALOG,validateCanonicalDoronumCatalog,auditCanonicalDoronumIntegration,planDoronumMigration,validateInfinityManifest,applyDoronumMigration} from "./canonical-data.js";
test("canonical manifest is exactly 15 unique IDs and 1500 total inputs",()=>{assert.equal(CANONICAL_DORONUM_IDS.length,15);assert.equal(new Set(CANONICAL_DORONUM_IDS).size,15);assert.equal(Object.values(INFINITY_REQUIREMENTS).reduce((a,b)=>a+b,0),1500)});
test("ambiguous legacy IDs are quarantined rather than guessed",()=>{const p=planDoronumMigration([{runtimeID:"S1",itemID:"doronium_crystal",quantity:10},{runtimeID:"S2",itemID:"doronium_normal",quantity:10}]);assert.equal(p.changes[0].to,"ITEM_DORONUM_NORMAL");assert.equal(p.quarantined[0].itemID,"doronium_crystal");assert.equal(p.requiresUserResolution,true)});
test("Infinity requires per-stack quality, purity, non-synthetic canonical inputs",()=>{const stacks=CANONICAL_DORONUM_IDS.map(itemID=>({runtimeID:itemID,itemID,quantity:100,quality:95,purity:95,synthetic:false}));assert.equal(validateInfinityManifest(stacks).valid,true);stacks[0].synthetic=true;assert.equal(validateInfinityManifest(stacks).valid,false)});

test("canonical Doronum catalog defines all 15 unique IDs with model, physical and presentation profiles",()=>{
 const result=validateCanonicalDoronumCatalog();
 assert.equal(result.valid,true,result.errors.join(", "));
 assert.equal(result.count,15);
 assert.equal(CANONICAL_DORONUM_CATALOG.length,15);
 assert.ok(CANONICAL_DORONUM_CATALOG.every(item=>item.modelRequirements.lods.join(",")==="0,1,2"&&item.modelRequirements.inventoryOrthographicIcon));
});
test("canonical recipes retain the locked Normal 10:1 ratio and specified stage process data",()=>{
 const normal=CANONICAL_DORONUM_CATALOG.find(item=>item.id==="ITEM_DORONUM_NORMAL");
 const ultra=CANONICAL_DORONUM_CATALOG.find(item=>item.id==="ITEM_DORONUM_ULTRA");
 const rusted=CANONICAL_DORONUM_CATALOG.find(item=>item.id==="ITEM_DORONUM_RUSTED");
 assert.equal(normal.recipe.inputs.doriMeat,10);
 assert.equal(normal.recipe.outputQuantity,1);
 assert.equal(normal.recipe.lockedRatio,"10:1");
 assert.equal(ultra.recipe.durationSec,90);
 assert.equal(ultra.recipe.targetTemperatureC,1200);
 assert.equal(ultra.recipe.targetPressureMPa,1000);
 assert.equal(rusted.recipe.purificationRequiredForInfinity,true);
 assert.equal(rusted.recipe.qualityPurityGuaranteed,false);
});
test("Special and Limited Doronum require campaign acquisition and cannot be silently repeat-crafted",()=>{
 const special=CANONICAL_DORONUM_CATALOG.find(item=>item.id==="ITEM_DORONUM_SPECIAL_EDITION");
 const limited=CANONICAL_DORONUM_CATALOG.find(item=>item.id==="ITEM_DORONUM_LIMITED_EDITION");
 assert.equal(special.acquisition.campaignSupplyMustCoverInfinityQuantity,100);
 assert.equal(limited.acquisition.maximumCampaignSupply,100);
 assert.equal(limited.acquisition.repeatableRecipe,false);
});

test("integration audit exposes canonical dependencies that are not yet in the live registries",()=>{
 const result=auditCanonicalDoronumIntegration({resources:{},buildings:[],recipes:{},research:[],fluidTypes:["WATER","OIL"]});
 assert.equal(result.complete,false);
 assert.equal(result.missingCanonicalItems.length,15);
 assert.ok(result.missingMachines.length>0);
 assert.ok(result.missingRawResources.length>0);
 assert.ok(result.missingRecipes.length>0);
});

test("save migration remaps unambiguous aliases, preserves active reservations and quarantines ambiguous legacy stacks",()=>{
 const state={
  inventory:{doronium_normal:100,doronium_void:7},
  meta:{doronium_normal:{quality:95,purity:96}},
  stats:{produced:{doronium_normal:4},gathered:{}},
  buildings:[{variant:"doronium_blue",input:{doronium_normal:2},output:{id:"doronium_normal",qty:1}}],
  contractRuntime:{shipments:[{itemID:"doronium_normal"}]},
  runtime:{itemStacks:[
   {runtimeID:"IS-1",itemID:"doronium_normal",quantity:100,quality:95,purity:96,synthetic:false},
   {runtimeID:"IS-2",itemID:"doronium_void",quantity:7,quality:95,purity:96,synthetic:false}
  ],reservations:{"RS-1":{reservationID:"RS-1",itemID:"doronium_normal",status:"reserved",allocations:[{stackID:"IS-1",quantity:10}]}}}
 };
 const result=applyDoronumMigration(state);
 assert.equal(result.changes.length,1);
 assert.equal(state.runtime.itemStacks[0].itemID,"ITEM_DORONUM_NORMAL");
 assert.equal(state.runtime.reservations["RS-1"].itemID,"ITEM_DORONUM_NORMAL");
 assert.equal(state.runtime.itemStacks[1].itemID,"doronium_void");
 assert.equal(state.runtime.itemStacks[1].quarantined,true);
 assert.equal(state.runtime.itemStacks[1].quarantineReason,"canonical-equivalence-not-defined");
 assert.equal(state.inventory.ITEM_DORONUM_NORMAL,100);
 assert.equal(state.inventory.doronium_normal,undefined);
 assert.equal(state.stats.produced.ITEM_DORONUM_NORMAL,4);
 assert.equal(state.buildings[0].variant,"ITEM_DORONUM_BLUE");
 assert.equal(state.buildings[0].output.id,"ITEM_DORONUM_NORMAL");
 assert.equal(state.contractRuntime.shipments[0].itemID,"ITEM_DORONUM_NORMAL");
 assert.equal(applyDoronumMigration(state).changes.length,0,"migration must be idempotent");
});
