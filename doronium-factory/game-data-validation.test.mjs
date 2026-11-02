import test from "node:test";
import assert from "node:assert/strict";
import { validateGameData } from "./game-data-validation.js";

const good={
  resources:{wood:{},iron:{},plate:{}},
  recipes:{smelt:{inputs:{iron:2,wood:1},output:"plate",time:5,qty:1}},
  variantRecipes:{},
  buildings:[{id:"furnace",recipe:"smelt",materials:{wood:2},unlock:"heat"}],
  research:[{id:"heat",need:{iron:1},requires:[]},{id:"steel",need:{plate:1},requires:["heat"]}]
};

test("valid registry resolves item, recipe, building and research references",()=>{
  const result=validateGameData(good);
  assert.equal(result.valid,true);
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.counts,{resources:3,recipes:1,buildings:1,research:2});
});

test("validator catches missing item, recipe, research and prerequisite references",()=>{
  const invalid={
    resources:{wood:{}},
    recipes:{bad:{inputs:{ore:1},output:"missing",time:0}},
    buildings:[{id:"furnace",recipe:"missing",materials:{stone:2},unlock:"lost"}],
    research:[{id:"one",need:{ore:2},requires:["missing"]}]
  };
  const result=validateGameData(invalid);
  assert.equal(result.valid,false);
  for(const code of ["recipe-bad-input-unknown-item:ore","recipe-unknown-output:bad:missing","recipe-invalid-duration:bad","building-unknown-recipe:furnace:missing","building-unknown-research:furnace:lost","research-one-sample-unknown-item:ore","research-unknown-prerequisite:one:missing"])assert.ok(result.errors.includes(code),code);
});

test("validator detects duplicate IDs and research cycles",()=>{
  const result=validateGameData({
    resources:{wood:{}},recipes:{},variantRecipes:{},
    buildings:[{id:"x"},{id:"x"}],
    research:[{id:"a",requires:["b"]},{id:"b",requires:["a"]},{id:"a",requires:[]}]
  });
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(x=>x.startsWith("duplicate-building-id:")));
  assert.ok(result.errors.some(x=>x.startsWith("duplicate-research-id:")));
  assert.ok(result.errors.some(x=>x.startsWith("research-cycle:")));
});
