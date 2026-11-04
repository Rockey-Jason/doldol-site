/* Optimistic cloud-save compare-and-swap adapter. It never overwrites on revision mismatch. */
export async function writeCloudSave(client,{storageKey,userId,value,expectedRevision}={}){
 if(!client||typeof client.rpc!=="function")throw new TypeError("Supabase RPC client required");
 if(typeof userId!=="string"||!userId.trim())throw new TypeError("authenticated user ID required");
 if(storageKey!=="doronium_factory_infinite_industry_v1")throw new TypeError("unsupported save key");
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new TypeError("invalid expected revision");
 if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("save envelope must be an object");
 const {data,error}=await client.rpc("save_doronium_factory_state",{p_storage_key:storageKey,p_storage_value:value,p_expected_revision:expectedRevision});
 if(error)throw error;
 const row=Array.isArray(data)?data[0]:data;
 if(!row||typeof row.saved!=="boolean")throw new Error("INVALID_CLOUD_SAVE_RESPONSE");
 if(!row.saved)return {saved:false,revision:Number.isSafeInteger(Number(row.revision))?Number(row.revision):expectedRevision,updatedAt:row.updated_at||null};
 const revision=Number(row.revision);
 if(!Number.isSafeInteger(revision)||revision<=expectedRevision)throw new Error("INVALID_CLOUD_SAVE_REVISION");
 return {saved:true,revision,updatedAt:row.updated_at||null};
}

export async function readCloudSaveSnapshot(client,{storageKey="doronium_factory_infinite_industry_v1"}={}){
 if(!client||typeof client.from!=="function")throw new TypeError("Supabase query client required");
 if(storageKey!=="doronium_factory_infinite_industry_v1")throw new TypeError("unsupported save key");
 const {data,error}=await client.from("dori_cloud_storage").select("storage_value,updated_at,save_revision").eq("storage_key",storageKey).eq("is_deleted",false).maybeSingle();
 if(error)throw error;
 if(!data)return {exists:false,revision:0,updatedAt:null,envelope:null};
 const revision=Number(data.save_revision);
 if(!Number.isSafeInteger(revision)||revision<0)throw new Error("INVALID_REMOTE_SAVE_REVISION");
 if(!data.storage_value||typeof data.storage_value!=="object"||!data.storage_value.state)throw new Error("INVALID_REMOTE_SAVE_ENVELOPE");
 return {exists:true,revision,updatedAt:data.updated_at||data.storage_value.savedAt||null,envelope:data.storage_value};
}
export async function replaceCloudSaveAfterExplicitConflict(client,{storageKey="doronium_factory_infinite_industry_v1",userId,value,beforeWrite}={}){
 const latest=await readCloudSaveSnapshot(client,{storageKey});
 if(typeof beforeWrite==="function")await beforeWrite(latest);
 const result=await writeCloudSave(client,{storageKey,userId,value,expectedRevision:latest.revision});
 return {...result,previous:latest};
}
