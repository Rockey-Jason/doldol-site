/* Versioned local/cloud save envelopes with checksum, read-back and three recovery copies. */
export const SAVE_SCHEMA_VERSION=4;
export const SAVE_BACKUP_COUNT=3;
export function checksumText(value){
 let hash=0x811c9dc5;
 for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,0x01000193)}
 return (hash>>>0).toString(16).padStart(8,"0");
}
export function createSaveEnvelope(state,savedAt=new Date().toISOString(),metadata={}){
 const serialized=JSON.stringify(state);
 const revision=Number(metadata?.cloudRevision);
 const cloudRevision=Number.isSafeInteger(revision)&&revision>=0?revision:null;
 return {game:"doronium-factory",version:3,schemaVersion:SAVE_SCHEMA_VERSION,gameVersion:"v4.5-web-adaptation",savedAt,cloudRevision,checksum:checksumText(serialized),state};
}
export function validateSaveEnvelope(envelope,maxSchemaVersion=SAVE_SCHEMA_VERSION){
 if(!envelope||typeof envelope!=="object"||!envelope.state||typeof envelope.state!=="object")return {valid:false,reason:"INVALID_ENVELOPE"};
 const schema=Number(envelope.schemaVersion||envelope.state.runtime?.schemaVersion||1);
 if(!Number.isSafeInteger(schema)||schema<1)return {valid:false,reason:"INVALID_SCHEMA_VERSION"};
 if(schema>maxSchemaVersion)return {valid:false,reason:"UNSUPPORTED_FUTURE_SCHEMA"};
 if(envelope.checksum&&envelope.checksum!==checksumText(JSON.stringify(envelope.state)))return {valid:false,reason:"CHECKSUM_MISMATCH"};
 return {valid:true,schemaVersion:schema,legacy:!envelope.schemaVersion||Number(envelope.version||0)<3};
}
export function decodeSave(raw,maxSchemaVersion=SAVE_SCHEMA_VERSION){
 try{
  const parsed=JSON.parse(raw);
  const isEnvelope=parsed&&typeof parsed==="object"&&parsed.state&&typeof parsed.state==="object";
  const state=isEnvelope?parsed.state:parsed;
  if(!isEnvelope&&(!state||typeof state!=="object"||(!("inventory" in state)&&!("player" in state))))return {valid:false,reason:"INVALID_ENVELOPE"};
  const envelope=isEnvelope?parsed:{game:"doronium-factory",version:0,schemaVersion:1,savedAt:state.lastSavedAt||null,state};
  const validation=validateSaveEnvelope(envelope,maxSchemaVersion);
  return validation.valid?{...validation,envelope,state:envelope.state,savedAt:envelope.savedAt||envelope.state.lastSavedAt||null,raw}:{valid:false,reason:validation.reason};
 }catch(error){return {valid:false,reason:"PARSE_ERROR",error:String(error)}}
}
export function saveCandidateKeys(key){
 return [key,key+"_tmp",...Array.from({length:SAVE_BACKUP_COUNT},(_,index)=>key+"_backup_"+(index+1))];
}
export function readBestSave(storage,key,maxSchemaVersion=SAVE_SCHEMA_VERSION){
 const primaryRaw=storage.getItem(key);
 if(primaryRaw){
  const primary=decodeSave(primaryRaw,maxSchemaVersion);
  if(primary.reason==="UNSUPPORTED_FUTURE_SCHEMA")return {...primary,source:key,blocked:true};
 }
 const valid=[];
 for(const [priority,candidateKey] of saveCandidateKeys(key).entries()){
  const raw=storage.getItem(candidateKey);
  if(!raw)continue;
  const decoded=decodeSave(raw,maxSchemaVersion);
  if(decoded.valid)valid.push({...decoded,source:candidateKey,priority});
 }
 if(!valid.length)return null;
 valid.sort((a,b)=>{
  const timeA=Date.parse(a.savedAt||"")||0,timeB=Date.parse(b.savedAt||"")||0;
  return timeB-timeA||a.priority-b.priority;
 });
 return valid[0];
}
export function writeSaveEnvelope(storage,key,state,savedAt=new Date().toISOString(),metadata={}){
 const envelope=createSaveEnvelope(state,savedAt,metadata),raw=JSON.stringify(envelope);
 storage.setItem(key+"_tmp",raw);
 const staged=decodeSave(storage.getItem(key+"_tmp"));
 if(!staged.valid)throw new Error("SAVE_TEMP_READBACK_FAILED:"+staged.reason);
 const current=storage.getItem(key);
 for(let index=SAVE_BACKUP_COUNT;index>=2;index--){
  const previous=storage.getItem(key+"_backup_"+(index-1));
  if(previous)storage.setItem(key+"_backup_"+index,previous);
 }
 if(current)storage.setItem(key+"_backup_1",current);
 storage.setItem(key,raw);
 const committed=decodeSave(storage.getItem(key));
 if(!committed.valid)throw new Error("SAVE_MAIN_READBACK_FAILED:"+committed.reason);
 storage.removeItem(key+"_tmp");
 return {savedAt,envelope,checksum:envelope.checksum};
}
export function restoreSaveCandidate(storage,key,candidate){
 if(!candidate?.valid||typeof candidate.raw!=="string")return false;
 storage.setItem(key,candidate.raw);
 if(candidate.source===key+"_tmp")storage.removeItem(key+"_tmp");
 return decodeSave(storage.getItem(key)).valid;
}
