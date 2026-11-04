import test from "node:test";import assert from "node:assert/strict";
import {writeCloudSave,readCloudSaveSnapshot,replaceCloudSaveAfterExplicitConflict} from "./cloud-save-runtime.js";
const args={storageKey:"doronium_factory_infinite_industry_v1",userId:"user-1",value:{schemaVersion:4,state:{}},expectedRevision:3};
test("cloud CAS writes and advances the server revision",async()=>{let call;const client={rpc:async(...v)=>(call=v,{data:[{saved:true,revision:4,updated_at:"2026-11-04T00:00:00Z"}],error:null})};const r=await writeCloudSave(client,args);assert.equal(r.saved,true);assert.equal(r.revision,4);assert.equal(call[0],"save_doronium_factory_state");assert.equal(call[1].p_expected_revision,3)});
test("cloud CAS conflict never claims success",async()=>{const client={rpc:async()=>({data:[{saved:false,revision:5,updated_at:"2026-11-04T00:00:00Z"}],error:null})};const r=await writeCloudSave(client,args);assert.equal(r.saved,false);assert.equal(r.revision,5)});
test("cloud CAS propagates database errors",async()=>{const client={rpc:async()=>({data:null,error:new Error("permission denied")})};await assert.rejects(writeCloudSave(client,args),/permission denied/)});
test("cloud CAS rejects missing identity, invalid keys and revisions",async()=>{const client={rpc:async()=>({data:[{saved:true,revision:4}],error:null})};await assert.rejects(writeCloudSave(client,{...args,userId:""}),/user ID/);await assert.rejects(writeCloudSave(client,{...args,storageKey:"other"}),/save key/);await assert.rejects(writeCloudSave(client,{...args,expectedRevision:-1}),/revision/)});

function remoteClient(remote,rpc){
 return {
  from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:remote,error:null})}),
  rpc:async(...args)=>{rpc?.(...args);return {data:[{saved:true,revision:(remote?.save_revision||0)+1,updated_at:"2026-11-05T00:00:00Z"}],error:null}}
 };
}
test("remote save snapshot reads the server revision and envelope without writing",async()=>{
 const remote={save_revision:9,updated_at:"2026-11-05T00:00:00Z",storage_value:{schemaVersion:4,state:{money:900}}};
 const snapshot=await readCloudSaveSnapshot(remoteClient(remote),{});
 assert.equal(snapshot.exists,true);assert.equal(snapshot.revision,9);assert.equal(snapshot.envelope.state.money,900);
});
test("explicit local-save resolution reads the current remote revision before CAS overwrite",async()=>{
 const remote={save_revision:12,updated_at:"2026-11-05T00:00:00Z",storage_value:{schemaVersion:4,state:{money:1200}}};
 let call;
 const result=await replaceCloudSaveAfterExplicitConflict(remoteClient(remote,(...args)=>call=args),{...args,expectedRevision:3,value:{schemaVersion:4,state:{money:777}}});
 assert.equal(call[0],"save_doronium_factory_state");
 assert.equal(call[1].p_expected_revision,12,"the explicit overwrite must use the latest remote revision, not the stale local revision");
 assert.equal(result.saved,true);assert.equal(result.previous.envelope.state.money,1200);
});
test("explicit conflict resolution still detects a race after reading the remote revision",async()=>{
 const remote={save_revision:12,updated_at:"2026-11-05T00:00:00Z",storage_value:{schemaVersion:4,state:{money:1200}}};
 const client=remoteClient(remote);
 client.rpc=async()=>({data:[{saved:false,revision:13,updated_at:"2026-11-05T00:00:01Z"}],error:null});
 const result=await replaceCloudSaveAfterExplicitConflict(client,{...args,value:{schemaVersion:4,state:{money:777}}});
 assert.equal(result.saved,false);assert.equal(result.revision,13);assert.equal(result.previous.revision,12);
});
test("a missing remote save can be explicitly initialized only against revision zero",async()=>{
 const client=remoteClient(null);
 let call;
 client.rpc=async(...args)=>{call=args;return {data:[{saved:true,revision:1}],error:null}};
 const result=await replaceCloudSaveAfterExplicitConflict(client,{...args,value:{schemaVersion:4,state:{money:1}}});
 assert.equal(call[1].p_expected_revision,0);assert.equal(result.saved,true);assert.equal(result.revision,1);
});
