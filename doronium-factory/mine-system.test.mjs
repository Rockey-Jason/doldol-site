import test from "node:test";
import assert from "node:assert/strict";
import {
  MINE_H, MINE_LEVELS, MINE_W, auditMineDeposits,
  makeMineDeposits, mineMainDriftZ, mineTunnelAt
} from "./terrain-system.js";

test("mine keeps five reachable levels, legacy shafts and connected drift access", () => {
  assert.equal(MINE_LEVELS, 5);
  assert.equal(mineTunnelAt(3, 12), true, "surface lift landing must remain reachable");
  assert.equal(mineTunnelAt(36, 12), true, "deep-level lift landing must remain reachable");
  assert.equal(mineTunnelAt(-1, 12), false);
  assert.equal(mineTunnelAt(12, MINE_H), false);
  for (const [x, z] of [[10, 7], [12, 15], [22, 8], [31, 12], [34, 18], [8, 17]]) {
    assert.equal(mineTunnelAt(x, z), true, `existing mine deposit coordinate ${x},${z} must remain accessible`);
  }
  assert.ok(mineMainDriftZ(8) >= 10 && mineMainDriftZ(8) <= 14);
  const openCells = Array.from({ length: MINE_H }, (_, z) =>
    Array.from({ length: MINE_W }, (_, x) => mineTunnelAt(x, z) ? 1 : 0).reduce((a, b) => a + b, 0)
  ).reduce((a, b) => a + b, 0);
  assert.ok(openCells > 100 && openCells < MINE_W * MINE_H * 0.7, "mine needs connected passages with solid rock left around them");
  const pending=[[3,12]],visited=new Set(["3:12"]);
  while(pending.length){
    const [x,z]=pending.shift();
    for(const [nx,nz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){
      const key=nx+":"+nz;
      if(!visited.has(key)&&mineTunnelAt(nx,nz)){visited.add(key);pending.push([nx,nz]);}
    }
  }
  assert.equal(visited.size,openCells,"all galleries, cross-cuts and chambers must connect to the main entrance");
});

test("coal is distributed across every depth as substantial mineable seams", () => {
  const deposits = makeMineDeposits();
  const stats = auditMineDeposits(deposits);
  assert.equal(stats.levels, 5);
  assert.equal(stats.unreachableNodes, 0, "every generated mineral deposit must sit inside a walkable drift");
  assert.ok(stats.coalNodes >= 100, `expected at least 100 distributed coal seams, got ${stats.coalNodes}`);
  assert.ok(stats.coalUnits >= 18000, `expected at least 18,000 mineable coal units, got ${stats.coalUnits}`);
  for (let level = 1; level <= MINE_LEVELS; level++) {
    assert.ok(stats.byLevel[level].coalNodes >= 18, `level ${level} needs at least 18 coal seams`);
    assert.ok(stats.byLevel[level].coalUnits >= 3500, `level ${level} needs at least 3,500 coal units`);
  }
});

test("mine deposit generation is deterministic and never creates natural Doronium veins", () => {
  const a = makeMineDeposits();
  const b = makeMineDeposits();
  assert.deepEqual(a, b);
  for (const node of Object.values(a)) {
    assert.equal(mineTunnelAt(node.x, node.z), true);
    assert.notEqual(node.type, "doronium_normal", "natural Doronium veins remain prohibited");
    assert.notEqual(node.type, "ITEM_DORONUM_NORMAL", "canonical natural Doronium veins remain prohibited");
  }
});

 
test("seeded mine instances add reachable stone and ore pockets without natural Doronium",()=>{
  const a=makeMineDeposits(12345),b=makeMineDeposits(12345),c=makeMineDeposits(54321);
  assert.deepEqual(a,b,"same mine seed must generate deterministic geology");
  const pockets=Object.values(a).filter(node=>node.generation==="mineral-pocket-v4");
  assert.ok(pockets.length>=20,"side galleries should contain abundant mineable stone and ore");
  assert.ok(pockets.some(node=>node.type==="stone"),"stone deposits should fill otherwise sparse galleries");
  assert.ok(pockets.some(node=>["copperOre","ironOre","quartz","goldOre","diamond"].includes(node.type)),"additional mineral pockets should vary by depth");
  assert.equal(pockets.every(node=>mineTunnelAt(node.x,node.z)),true,"all added pockets must be reachable in existing tunnels");
  assert.notDeepEqual(a,c,"different mine seeds should create distinct pocket distributions");
  assert.equal(pockets.some(node=>String(node.type).toLowerCase().includes("doronium")),false,"natural Doronium remains forbidden");
});
