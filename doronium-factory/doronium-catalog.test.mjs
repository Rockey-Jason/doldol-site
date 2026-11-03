import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_DORONUM_IDS, CANONICAL_INFINITY_ID, DORONUM_LEGACY_ID_MAP,
  UNMAPPED_LEGACY_DORONUM_IDS, migrateCanonicalDoronumState,
  registerCanonicalDoronumResources
} from "./doronium-catalog.js";

test("canonical manifest contains exactly the fifteen specification IDs",()=>{
  assert.equal(CANONICAL_DORONUM_IDS.length,15);
  assert.equal(new Set(CANONICAL_DORONUM_IDS).size,15);
  assert.deepEqual(CANONICAL_DORONUM_IDS,[
    "ITEM_DORONUM_NORMAL","ITEM_DORONUM_YELLOW","ITEM_DORONUM_ULTRA",
    "ITEM_DORONUM_BLUE","ITEM_DORONUM_RED","ITEM_DORONUM_IRON",
    "ITEM_DORONUM_ORANGE","ITEM_DORONUM_SLIGHTLY_RUSTED",
    "ITEM_DORONUM_RUSTED","ITEM_DORONUM_TRANSLUCENT",
    "ITEM_DORONUM_THERMAL_CRYSTAL","ITEM_DORONUM_COLD_CRYSTAL",
    "ITEM_DORONUM_BLACK","ITEM_DORONUM_SPECIAL_EDITION","ITEM_DORONUM_LIMITED_EDITION"
  ]);
});

test("only exact legacy semantic IDs are migrated; ambiguous IDs remain untouched",()=>{
  assert.equal(Object.keys(DORONUM_LEGACY_ID_MAP).length,12);
  for(const id of UNMAPPED_LEGACY_DORONUM_IDS)assert.equal(DORONUM_LEGACY_ID_MAP[id],undefined);
  assert.equal(DORONUM_LEGACY_ID_MAP.infinity,CANONICAL_INFINITY_ID);
});

test("save migration preserves stack quantities and per-stack metadata and is idempotent",()=>{
  const state={
    inventory:{doronium_normal:5,ITEM_DORONUM_NORMAL:2,doronium_crystal:9,infinity:1},
    meta:{doronium_normal:{quality:97,purity:96,synthetic:false}},
    stats:{produced:{doronium_normal:4,doronium_crystal:9},gathered:{doronium_blue:3}},
    runtime:{
      itemStacks:[
        {runtimeID:"IS-1",itemID:"doronium_normal",quantity:5,quality:97,purity:96,synthetic:false,packaging:null,createdTick:2},
        {runtimeID:"IS-2",itemID:"doronium_crystal",quantity:9,quality:83,purity:81,synthetic:true,packaging:"old",createdTick:3}
      ],
      reservations:{R1:{reservationID:"R1",ownerID:"job-1",itemID:"doronium_normal",quantity:2,allocations:[{stackID:"IS-1",quantity:2}],status:"reserved"}},
      reservationHistory:[{itemID:"doronium_blue"}]
    },
    buildings:[{
      variant:"doronium_blue",input:{doronium_normal:2,doronium_crystal:3},
      inputMeta:{doronium_normal:{quality:98,purity:97,synthetic:false},doronium_crystal:{quality:80,purity:85,synthetic:true}},
      output:{id:"infinity",qty:1,meta:{quality:100,purity:100,synthetic:false}}
    }],
    fusionJob:{inputManifest:[{itemID:"doronium_limited",quantity:100}]}
  };
  const result=migrateCanonicalDoronumState(state);
  assert.equal(result.migrated,true);
  assert.equal(result.changedStacks,1);
  assert.equal(state.runtime.itemStacks[0].itemID,"ITEM_DORONUM_NORMAL");
  assert.equal(state.runtime.itemStacks[0].quality,97);
  assert.equal(state.runtime.itemStacks[0].purity,96);
  assert.equal(state.runtime.itemStacks[0].synthetic,false);
  assert.equal(state.runtime.itemStacks[1].itemID,"doronium_crystal");
  assert.equal(state.runtime.reservations.R1.itemID,"ITEM_DORONUM_NORMAL");
  assert.equal(state.runtime.reservationHistory[0].itemID,"ITEM_DORONUM_BLUE");
  assert.equal(state.buildings[0].variant,"ITEM_DORONUM_BLUE");
  assert.equal(state.buildings[0].input.ITEM_DORONUM_NORMAL,2);
  assert.equal(state.buildings[0].input.doronium_crystal,3);
  assert.equal(state.buildings[0].inputMeta.ITEM_DORONUM_NORMAL.quality,98);
  assert.equal(state.buildings[0].inputMeta.doronium_crystal.synthetic,true);
  assert.equal(state.buildings[0].output.id,CANONICAL_INFINITY_ID);
  assert.equal(state.fusionJob.inputManifest[0].itemID,"ITEM_DORONUM_LIMITED_EDITION");
  assert.equal(state.inventory.ITEM_DORONUM_NORMAL,7);
  assert.equal(state.inventory.doronium_crystal,9);
  assert.equal(state.inventory[CANONICAL_INFINITY_ID],1);
  assert.equal(state.stats.produced.ITEM_DORONUM_NORMAL,4);
  assert.equal(state.stats.produced.doronium_crystal,9);
  const again=migrateCanonicalDoronumState(state);
  assert.equal(again.migrated,false);
  assert.equal(state.runtime.itemStacks.length,2);
});

test("canonical resource registration is non-destructive",()=>{
  const registry={ITEM_DORONUM_NORMAL:{name:"custom",price:1},doronium_normal:{name:"legacy"}};
  registerCanonicalDoronumResources(registry);
  assert.equal(registry.ITEM_DORONUM_NORMAL.name,"custom");
  assert.equal(registry.ITEM_DORONUM_YELLOW.name,"옐로 도로늄");
  assert.equal(registry.doronium_normal.name,"legacy");
});
