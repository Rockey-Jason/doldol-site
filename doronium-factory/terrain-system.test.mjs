import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_W, WORLD_H, MINE_W, MINE_H, MINE_LEVELS,
  MINE_ENTRANCES, PRIMARY_MINE_ID, mineFloorY, mineDepositKey,
  mineTunnelAt, mineEntranceAt, nearestMineInstanceId,
  makeMineDeposits, createMineInstances, migrateMineInstances
} from "./terrain-system.js";

function tunnelCells(mineId) {
  const cells=[];
  for(let z=0;z<MINE_H;z++)for(let x=0;x<MINE_W;x++)if(mineTunnelAt(x,z,mineId))cells.push(x+","+z);
  return cells;
}

test("the world keeps its save-compatible surface dimensions and five mine depths",()=>{
  assert.equal(WORLD_W,192);
  assert.equal(WORLD_H,160);
  assert.equal(MINE_W,40);
  assert.equal(MINE_H,24);
  assert.equal(MINE_LEVELS,5);
  assert.equal(MINE_ENTRANCES.length,5);
  assert.equal(new Set(MINE_ENTRANCES.map(m=>m.id)).size,5);
  assert.equal(new Set(MINE_ENTRANCES.map(m=>m.x+","+m.y)).size,5);
});

test("each surface entrance resolves to one stable mine identity",()=>{
  for(const entry of MINE_ENTRANCES){
    assert.equal(mineEntranceAt(entry.x,entry.y)?.id,entry.id);
    assert.equal(nearestMineInstanceId(entry.x,entry.y),entry.id);
  }
  assert.equal(PRIMARY_MINE_ID,"mine_72_42");
});

test("each mine has a deterministic, distinct and navigable tunnel layout",()=>{
  const first=tunnelCells(PRIMARY_MINE_ID);
  assert.ok(first.includes("3,12"));
  assert.ok(first.includes("36,12"));
  const layouts=MINE_ENTRANCES.map(m=>tunnelCells(m.id));
  assert.ok(layouts.every(cells=>cells.length>0));
  assert.ok(layouts.every(cells=>cells.includes("3,12")&&cells.includes("36,12")));
  assert.equal(new Set(layouts.map(cells=>cells.join("|"))).size,5,
    "Every mine must have a distinct tunnel footprint");
  for(const entry of MINE_ENTRANCES){
    assert.deepEqual(tunnelCells(entry.id),tunnelCells(entry.id),
      "A seeded tunnel must remain deterministic across reads");
  }
});

test("the original primary mine keeps its legacy tunnel footprint and deposit coordinates",()=>{
  const expected=[
    "2,10","37,14","8,5","13,18","19,6","24,18","29,4","36,20","3,8","6,16"
  ];
  for(const cell of expected){
    const [x,z]=cell.split(",").map(Number);
    assert.equal(mineTunnelAt(x,z,PRIMARY_MINE_ID),true,cell);
  }
  const deposits=makeMineDeposits(PRIMARY_MINE_ID,827142);
  assert.equal(deposits[mineDepositKey(1,8,12)].type,"stone");
  assert.equal(deposits[mineDepositKey(1,8,12)].amount,48);
  assert.equal(deposits[mineDepositKey(2,17,12)].type,"aluminumOre");
  assert.equal(deposits[mineDepositKey(2,17,12)].amount,18);
});

test("each mine owns independent deterministic ore nodes inside its own tunnel",()=>{
  const mines=createMineInstances(827142);
  assert.deepEqual(Object.keys(mines).sort(),MINE_ENTRANCES.map(m=>m.id).sort());
  const ids=Object.keys(mines);
  const first=mines[ids[0]],second=mines[ids[1]];
  assert.notStrictEqual(first,second);
  assert.notStrictEqual(first.deposits,second.deposits);
  assert.notStrictEqual(first.elevatorBuffers,second.elevatorBuffers);
  assert.notStrictEqual(first.player,second.player);
  assert.notEqual(first.seed,second.seed);
  for(const entry of MINE_ENTRANCES){
    const mine=mines[entry.id];
    assert.equal(mine.id,entry.id);
    assert.equal(mine.name,entry.name);
    assert.equal(mine.geology,entry.geology);
    assert.equal(mine.currentLevel,1);
    assert.equal(mine.player.level,1);
    assert.ok(Object.keys(mine.deposits).length>=20);
    for(const [key,node] of Object.entries(mine.deposits)){
      assert.equal(key,mineDepositKey(node.level,node.x,node.z));
      assert.ok(node.level>=1&&node.level<=MINE_LEVELS);
      assert.ok(node.x>=0&&node.x<MINE_W&&node.z>=0&&node.z<MINE_H);
      assert.equal(mineTunnelAt(node.x,node.z,entry.id),true,
        "Deposit "+entry.id+"/"+key+" must be in that mine's reachable tunnel/gallery");
      assert.ok(node.amount>=0&&node.amount<=node.max);
      assert.ok(node.depthY>=mineFloorY(node.level)&&node.depthY<=mineFloorY(node.level)+30,
        "Deposit height must remain within its assigned underground level");
    }
  }
  const amountA=first.deposits[Object.keys(first.deposits)[0]].amount;
  const amountB=second.deposits[Object.keys(second.deposits)[0]].amount;
  const keyA=Object.keys(first.deposits)[0];
  first.deposits[keyA].amount=0;
  assert.equal(second.deposits[Object.keys(second.deposits)[0]].amount,amountB);
  assert.equal(makeMineDeposits(ids[0],827142)[keyA].amount,amountA);
});

test("same world seed recreates the same ore records and different seeds alter other mines",()=>{
  const a=createMineInstances(827142);
  const a2=createMineInstances(827142);
  const b=createMineInstances(827143);
  for(const entry of MINE_ENTRANCES){
    assert.deepEqual(a[entry.id].deposits,a2[entry.id].deposits);
    if(entry.id!==PRIMARY_MINE_ID)assert.notDeepEqual(a[entry.id].deposits,b[entry.id].deposits);
  }
});

test("legacy shared mine saves migrate into the primary mine without losing stock",()=>{
  const generated=createMineInstances(827142),primary=generated[PRIMARY_MINE_ID];
  const key="1:8:12",legacy={...primary.deposits};
  legacy[key]={...legacy[key],amount:7};
  const buffers={"3":{ironOre:{quantity:4,quality:92,purity:90,synthetic:false}}};
  const migrated=migrateMineInstances({
    worldSeed:827142,legacyMineDeposits:legacy,legacyMineElevatorBuffers:buffers
  });
  assert.equal(Object.keys(migrated).length,5);
  assert.equal(migrated[PRIMARY_MINE_ID].deposits[key].amount,7);
  assert.equal(migrated[PRIMARY_MINE_ID].elevatorBuffers["3"].ironOre.quantity,4);
  for(const entry of MINE_ENTRANCES.slice(1)){
    assert.ok(Object.keys(migrated[entry.id].deposits).length>0);
    assert.deepEqual(migrated[entry.id].elevatorBuffers,{});
  }
});

test("saved multi-mine deposits, player locations and elevator buffers round-trip independently",()=>{
  const initial=createMineInstances(827142),ids=MINE_ENTRANCES.map(m=>m.id);
  const a=initial[ids[0]],b=initial[ids[1]],depositKey=Object.keys(b.deposits)[0];
  b.currentLevel=4;b.player={x:12.5,z:15.5,yaw:.8,pitch:-.2,level:4};
  b.deposits[depositKey].amount=3;
  b.elevatorBuffers["4"]={quartz:{quantity:9,quality:96,purity:93,synthetic:false}};
  const restored=migrateMineInstances({worldSeed:827142,mineInstances:initial});
  assert.equal(restored[ids[1]].currentLevel,4);
  assert.deepEqual(restored[ids[1]].player,b.player);
  assert.equal(restored[ids[1]].deposits[depositKey].amount,3);
  assert.equal(restored[ids[1]].elevatorBuffers["4"].quartz.quantity,9);
  assert.equal(restored[ids[0]].currentLevel,1);
  assert.deepEqual(restored[ids[0]].elevatorBuffers,{});
  assert.notStrictEqual(restored[ids[0]].deposits,restored[ids[1]].deposits);
});
