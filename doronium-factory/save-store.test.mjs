import test from "node:test";
import assert from "node:assert/strict";
import {createSaveEnvelope,decodeSave,readBestSave,restoreSaveCandidate,writeSaveEnvelope,validateSaveEnvelope} from "./save-store.js";

function memoryStorage(){
 const data=new Map();
 return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key),dump:()=>new Map(data)};
}

test("save envelope checksum detects tampering and permits legacy compatible saves",()=>{
 const state={version:1,runtime:{schemaVersion:4},inventory:{wood:10}};
 const envelope=createSaveEnvelope(state,"2026-11-03T00:00:00.000Z");
 assert.equal(decodeSave(JSON.stringify(envelope)).valid,true);
 const changed={...envelope,state:{...state,inventory:{wood:11}}};
 assert.equal(validateSaveEnvelope(changed).reason,"CHECKSUM_MISMATCH");
 assert.equal(decodeSave(JSON.stringify({version:2,state})).valid,true);
});

test("bare legacy state objects migrate without an envelope",()=>{
 const storage=memoryStorage(),key="factory";
 storage.setItem(key,JSON.stringify({version:1,worldVersion:4,player:{x:72,y:52},inventory:{ironOre:11}}));
 const decoded=readBestSave(storage,key);
 assert.equal(decoded.valid,true);
 assert.equal(decoded.state.inventory.ironOre,11);
 assert.equal(decoded.schemaVersion,1);
});

test("future schema is rejected without rewriting the existing save",()=>{
 const storage=memoryStorage(),key="factory";
 const old={version:3,schemaVersion:4,state:{runtime:{schemaVersion:4},inventory:{wood:10}}};
 storage.setItem(key,JSON.stringify(old));
 storage.setItem(key+"_backup_1",JSON.stringify({version:3,schemaVersion:5,state:{runtime:{schemaVersion:5}}}));
 assert.equal(readBestSave(storage,key).source,key);
 assert.equal(validateSaveEnvelope({version:3,schemaVersion:99,state:{} }).reason,"UNSUPPORTED_FUTURE_SCHEMA");
});

test("future primary data blocks rollback to an older backup",()=>{
 const storage=memoryStorage(),key="factory";
 storage.setItem(key,JSON.stringify({version:3,schemaVersion:5,savedAt:"2026-11-03T00:00:00.000Z",state:{runtime:{schemaVersion:5}}}));
 storage.setItem(key+"_backup_1",JSON.stringify(createSaveEnvelope({inventory:{wood:99}},"2026-11-02T00:00:00.000Z")));
 const result=readBestSave(storage,key);
 assert.equal(result.valid, false);
 assert.equal(result.reason, "UNSUPPORTED_FUTURE_SCHEMA");
 assert.equal(result.blocked, true);
 assert.equal(result.source, key);
});

test("atomic save rotates three backups and retains the previous main save",()=>{
 const storage=memoryStorage(),key="factory";
 writeSaveEnvelope(storage,key,{inventory:{wood:1}},"one");
 writeSaveEnvelope(storage,key,{inventory:{wood:2}},"two");
 writeSaveEnvelope(storage,key,{inventory:{wood:3}},"three");
 writeSaveEnvelope(storage,key,{inventory:{wood:4}},"four");
 assert.equal(readBestSave(storage,key).state.inventory.wood,4);
 assert.equal(JSON.parse(storage.getItem(key+"_backup_1")).state.inventory.wood,3);
 assert.equal(JSON.parse(storage.getItem(key+"_backup_2")).state.inventory.wood,2);
 assert.equal(JSON.parse(storage.getItem(key+"_backup_3")).state.inventory.wood,1);
 assert.equal(storage.getItem(key+"_tmp"),null);
});

test("corrupt main falls back to a verified backup and restores it",()=>{
 const storage=memoryStorage(),key="factory";
 writeSaveEnvelope(storage,key,{inventory:{wood:20}},"good-before");
 writeSaveEnvelope(storage,key,{inventory:{wood:20}},"good");
 storage.setItem(key,"{broken");
 const candidate=readBestSave(storage,key);
 assert.equal(candidate.source,key+"_backup_1");
 assert.equal(candidate.state.inventory.wood,20);
 assert.equal(restoreSaveCandidate(storage,key,candidate),true);
 assert.equal(readBestSave(storage,key).state.inventory.wood,20);
 assert.equal(storage.getItem(key),candidate.raw);
});

test("failed temp write never overwrites the current main save",()=>{
 const storage=memoryStorage(),key="factory";
 writeSaveEnvelope(storage,key,{inventory:{wood:7}},"good");
 const original=storage.getItem(key);
 const failing={getItem:storage.getItem,setItem:(name,value)=>{if(name===key+"_tmp")throw new Error("quota");storage.setItem(name,value)},removeItem:storage.removeItem};
 assert.throws(()=>writeSaveEnvelope(failing,key,{inventory:{wood:99}},"bad"),/quota/);
 assert.equal(storage.getItem(key),original);
});


test("cloud save base revision survives local save backups and decoding",()=>{
 const storage=memoryStorage(),key="factory";
 writeSaveEnvelope(storage,key,{inventory:{wood:12}},"rev-7",{cloudRevision:7});
 const decoded=readBestSave(storage,key);
 assert.equal(decoded.valid,true);
 assert.equal(decoded.envelope.cloudRevision,7);
 writeSaveEnvelope(storage,key,{inventory:{wood:13}},"rev-8",{cloudRevision:8});
 assert.equal(readBestSave(storage,key).envelope.cloudRevision,8);
 assert.equal(JSON.parse(storage.getItem(key+"_backup_1")).cloudRevision,7);
});
