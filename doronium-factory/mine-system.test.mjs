import test from "node:test";
import assert from "node:assert/strict";
import {makeMineDeposits,MINE_LEVELS} from "./terrain-system.js";
import {
  MINE_ENTRANCES,createMineRegistry,getMine,getMineLevel,mineIdFromEntrance,
  mineTunnelAt,migrateMineRegistry,validateMineRegistry
} from "./mine-system.js";

function pathExists(layer,start=[3,12],goal=[36,12]){
  const queue=[start],seen=new Set([start.join(",")]);
  for(let head=0;head<queue.length;head++){
    const [x,z]=queue[head];
    if(x===goal[0]&&z===goal[1])return true;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=nx+","+nz;
      if(!seen.has(key)&&mineTunnelAt(layer,nx,nz)){seen.add(key);queue.push([nx,nz]);}
    }
  }
  return false;
}
function tunnelSignature(layer){return Object.keys(layer.tunnels).filter(key=>layer.tunnels[key]).sort().join("|");}
function firstDeposit(layer){
  const [key,node]=Object.entries(layer.deposits)[0]||[];
  assert.ok(key&&node,"Mine level must contain at least one ore deposit");
  return {key,node};
}

test("five entrances create five deterministic independent mine registries",()=>{
  const first=createMineRegistry(827142),second=createMineRegistry(827142),otherSeed=createMineRegistry(827143);
  assert.equal(Object.keys(first).length,5);
  assert.deepEqual(first,second,"The same world seed must reconstruct the same mines");
  assert.notDeepEqual(first,otherSeed,"A different world seed must create a different mine atlas");
  assert.equal(validateMineRegistry(first).valid,true);
  assert.equal(new Set(Object.keys(first)).size,5);
  for(const entrance of MINE_ENTRANCES){
    const id=mineIdFromEntrance(entrance.x,entrance.z);
    assert.equal(first[id].name,entrance.name);
    assert.equal(first[id].currentLevel,1);
    assert.equal(Object.keys(first[id].levels).length,MINE_LEVELS);
  }
});

test("every generated mine floor has connected access, a distinct cave shape and deposits on walkable cells",()=>{
  const registry=createMineRegistry(827142);
  for(const mine of Object.values(registry)){
    for(let level=1;level<=MINE_LEVELS;level++){
      const layer=getMineLevel(registry,mine.id,level);
      assert.ok(mineTunnelAt(layer,3,12),"The entrance lift cell must be walkable");
      assert.ok(mineTunnelAt(layer,36,12),"The depth lift cell must be walkable");
      assert.equal(pathExists(layer),true,"The entrance and depth lift must connect");
      for(const [key,node] of Object.entries(layer.deposits)){
        const [x,z]=key.split(",").map(Number);
        assert.equal(node.mineId,mine.id);
        assert.equal(node.level,level);
        assert.equal(node.x,x);
        assert.equal(node.z,z);
        assert.equal(mineTunnelAt(layer,x,z),true);
        assert.ok(node.amount>0&&node.max>=node.amount);
      }
    }
  }
  const shapeSignatures=Object.values(registry).map(m=>tunnelSignature(getMineLevel(registry,m.id,1)));
  assert.equal(new Set(shapeSignatures).size,5,"Each entrance must have its own generated cave shape");
});

test("mining and changing depth in one mine cannot mutate another mine",()=>{
  const registry=createMineRegistry(827142);
  const [mineA,mineB]=Object.values(registry);
  const aLevel1=getMineLevel(registry,mineA.id,1);
  const bLevel1=getMineLevel(registry,mineB.id,1);
  const a=firstDeposit(aLevel1),b=firstDeposit(bLevel1);
  const bBefore=b.node.amount;
  a.node.amount-=Math.min(2,a.node.amount);
  mineA.currentLevel=3;
  assert.notEqual(a.node.amount,bBefore);
  assert.equal(b.node.amount,bBefore);
  assert.equal(mineB.currentLevel,1);
  assert.notEqual(aLevel1,bLevel1);
  assert.notEqual(aLevel1.tunnels,bLevel1.tunnels);
  assert.notEqual(aLevel1.deposits,bLevel1.deposits);
});

test("legacy shared mine progress migrates to the nearest mine without copying depletion to others",()=>{
  const generated=createMineRegistry(827142),legacy=makeMineDeposits();
  legacy["1:8:12"]={...legacy["1:8:12"],amount:7};
  const targetID=mineIdFromEntrance(30,64);
  const migrated=migrateMineRegistry({
    generatedMines:generated,
    legacyDeposits:legacy,
    player:{layer:"mine",surfacePosition:{x:30,y:64},mineLevel:2},
    mergeLegacyDefaults:true
  });
  const target=getMineLevel(migrated,targetID,1).deposits["8,12"];
  assert.equal(target.amount,7);
  assert.equal(target.mineId,targetID);
  assert.equal(target.level,1);
  assert.equal(migrated[targetID].legacyLayout,true);
  for(const mine of Object.values(migrated)){
    if(mine.id===targetID)continue;
    const other=getMineLevel(migrated,mine.id,1).deposits["8,12"];
    if(other)assert.notEqual(other.amount,7,"Legacy depleted quantity must not leak into another mine");
  }
  assert.equal(validateMineRegistry(migrated).valid,true);
});

test("legacy migration backfills newly registered deposits and keeps stored amounts",()=>{
  const generated=createMineRegistry(827142),legacy=makeMineDeposits();
  const newOre=Object.entries(legacy).find(([,node])=>node.type==="aluminumOre");
  assert.ok(newOre);
  const [key,node]=newOre;
  const stored={...node,amount:7};
  const oldDeposits={...legacy,[key]:stored};
  const migrated=migrateMineRegistry({
    generatedMines:generated,
    legacyDeposits:oldDeposits,
    player:{surfacePosition:{x:72,y:42}},
    mergeLegacyDefaults:true
  });
  const id=mineIdFromEntrance(72,42);
  const [level,x,z]=key.split(":").map(Number);
  const restored=getMineLevel(migrated,id,level).deposits[x+","+z];
  assert.equal(restored.type,"aluminumOre");
  assert.equal(restored.amount,7);
  assert.ok(restored.max>=7);
  assert.ok(Object.keys(getMineLevel(migrated,id,1).deposits).length>=1);
  assert.equal(validateMineRegistry(migrated).valid,true);
});

test("modern mine saves merge into generated defaults and preserve independent level progress",()=>{
  const generated=createMineRegistry(827142);
  const [mineA,mineB]=Object.values(generated);
  const stored=structuredClone(mineA);
  const layer=stored.levels["4"];
  const {node}=firstDeposit(layer);
  const savedAmount=Math.max(0,node.amount-3);
  node.amount=savedAmount;
  stored.currentLevel=4;
  const restored=migrateMineRegistry({
    generatedMines:generated,
    incomingMines:{[mineA.id]:stored}
  });
  assert.equal(restored[mineA.id].currentLevel,4);
  assert.equal(firstDeposit(getMineLevel(restored,mineA.id,4)).node.amount,savedAmount);
  assert.ok(getMine(restored,mineB.id),"Mines missing from a partial save must be restored from deterministic defaults");
  assert.equal(restored[mineB.id].currentLevel,1);
  assert.notEqual(restored[mineA.id].levels["1"],restored[mineB.id].levels["1"]);
  assert.equal(validateMineRegistry(restored).valid,true);
});

test("invalid entrance and off-map tunnel coordinates are never walkable",()=>{
  const registry=createMineRegistry(827142),mine=Object.values(registry)[0],level=getMineLevel(registry,mine.id,1);
  assert.equal(mineTunnelAt(level,-1,12),false);
  assert.equal(mineTunnelAt(level,40,12),false);
  assert.equal(mineTunnelAt(null,3,12),false);
  assert.equal(mineTunnelAt(level,3.2,12),true);
});
