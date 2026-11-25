/* DORONIUM FACTORY — save-safe, independent mine instance state. */
const isObject=value=>value&&typeof value==="object"&&!Array.isArray(value);
const coordinate=value=>Number.isFinite(Number(value))?Math.floor(Number(value)):0;
export function mineInstanceIDForEntrance(x,y){
  return "mine:"+coordinate(x)+":"+coordinate(y);
}
export function createMineInstanceState({mineDeposits,mineEnvironment,mineInfrastructure}={}){
  return {
    version:1,
    mineDeposits:isObject(mineDeposits)?mineDeposits:{},
    mineEnvironment:isObject(mineEnvironment)?mineEnvironment:{},
    mineInfrastructure:isObject(mineInfrastructure)?mineInfrastructure:{version:1,supports:{},closures:{},events:[],railRoutes:{},lastUpdated:0}
  };
}
export function ensureMineInstance(state,id,createDefault){
  if(!isObject(state))throw new TypeError("mine-state-required");
  const key=String(id||"").trim();
  if(!key)throw new TypeError("mine-instance-id-required");
  if(!isObject(state.mineInstances))state.mineInstances={};
  let instance=state.mineInstances[key];
  if(!isObject(instance)){
    // One-time, non-destructive migration: the first visited entrance inherits
    // the player's existing mine save. Later entrances receive fresh state.
    const canMigrate=state.mineInstanceMigrationComplete!==true&&
      isObject(state.mineDeposits)&&isObject(state.mineEnvironment);
    if(canMigrate){
      instance=createMineInstanceState({
        mineDeposits:state.mineDeposits,
        mineEnvironment:state.mineEnvironment,
        mineInfrastructure:state.mineInfrastructure
      });
      state.mineInstanceMigrationComplete=true;
    }else{
      const defaults=typeof createDefault==="function"?createDefault():{};
      instance=createMineInstanceState(defaults);
    }
    state.mineInstances[key]=instance;
  }else{
    instance=createMineInstanceState(instance);
    state.mineInstances[key]=instance;
  }
  return instance;
}
export function saveActiveMineInstance(state){
  if(!isObject(state)||state.player?.layer!=="mine")return null;
  const id=state.mineInstanceID||state.player.mineInstanceID;
  if(!id)return null;
  const instance=ensureMineInstance(state,id);
  instance.mineDeposits=state.mineDeposits;
  instance.mineEnvironment=state.mineEnvironment;
  instance.mineInfrastructure=state.mineInfrastructure;
  return instance;
}
export function activateMineInstance(state,id,createDefault){
  if(!isObject(state))throw new TypeError("mine-state-required");
  if(state.player?.layer==="mine")saveActiveMineInstance(state);
  const instance=ensureMineInstance(state,id,createDefault);
  state.mineInstanceID=String(id);
  if(!isObject(state.player))state.player={};
  state.player.mineInstanceID=String(id);
  state.mineDeposits=instance.mineDeposits;
  state.mineEnvironment=instance.mineEnvironment;
  state.mineInfrastructure=instance.mineInfrastructure;
  return instance;
}
