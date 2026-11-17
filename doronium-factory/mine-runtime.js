/* DORONIUM FACTORY — mine geology, environment and safety simulation.
   Pure deterministic helpers; no DOM, rendering or storage dependencies. */
export const MINE_ROCK_PROFILES = Object.freeze({
  limestone:{id:"limestone",label:"석회암",color:0x8e8980,hardness:1.05,moisture:.58,band:"sedimentary"},
  shale:{id:"shale",label:"셰일",color:0x53606a,hardness:1.18,moisture:.72,band:"layered"},
  sandstone:{id:"sandstone",label:"사암",color:0x92745c,hardness:.92,moisture:.38,band:"sedimentary"},
  basalt:{id:"basalt",label:"현무암",color:0x414c55,hardness:1.42,moisture:.26,band:"igneous"},
  granite:{id:"granite",label:"화강암",color:0x737d82,hardness:1.62,moisture:.31,band:"igneous"},
  slate:{id:"slate",label:"점판암",color:0x46515d,hardness:1.28,moisture:.64,band:"metamorphic"}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const integer=(v,fallback=0)=>Number.isFinite(Number(v))?Math.floor(Number(v)):fallback;
const ROCK_SEQUENCE=["limestone","shale","sandstone","slate","basalt","granite"];
const ORE_PROFILES=Object.freeze({
  coal:{style:"stratified-seam",color:0x252d35,roughness:.96,metalness:.025,cluster:"flat"},
  stone:{style:"host-rock",color:0x78818a,roughness:.93,metalness:.04,cluster:"angular"},
  copperOre:{style:"oxidized-vein",color:0xb96f48,roughness:.78,metalness:.16,cluster:"knotted"},
  ironOre:{style:"iron-lode",color:0x87919a,roughness:.72,metalness:.22,cluster:"angular"},
  quartz:{style:"quartz-vein",color:0x8cd6e1,roughness:.28,metalness:.08,cluster:"crystalline"},
  goldOre:{style:"native-gold-vein",color:0xd6ad53,roughness:.32,metalness:.68,cluster:"knotted"},
  diamond:{style:"deep-crystal-pocket",color:0x8ce5ef,roughness:.18,metalness:.12,cluster:"crystalline"}
});
export function mineGeologyAt(level,x,z){
  const depth=clamp(integer(level,1),1,5),gx=integer(x),gz=integer(z);
  const noise=(Math.imul(gx+depth*19,73856093)^Math.imul(gz+depth*7,19349663))>>>0;
  const band=Math.floor((gz+Math.floor(noise%5)-2)/4);
  const profile=ROCK_SEQUENCE[(depth-1+Math.abs(band)+Math.floor(noise/97)%2)%ROCK_SEQUENCE.length];
  const base=MINE_ROCK_PROFILES[profile];
  const shade=0.9+((noise>>>9)%17)/100;
  return {...base,color:(()=>{const c=base.color,r=Math.min(255,Math.round(((c>>16)&255)*shade)),g=Math.min(255,Math.round(((c>>8)&255)*shade)),b=Math.min(255,Math.round((c&255)*shade));return (r<<16)|(g<<8)|b})(),depth,band,noise,hardness:Number((base.hardness+(depth-1)*.055).toFixed(3))};
}
export function mineOreProfile(type){
  return ORE_PROFILES[String(type)]||{style:"mineral-pocket",color:0x9aa9ad,roughness:.82,metalness:.12,cluster:"angular"};
}
export function createMineEnvironment(levels=5){
  const state={};
  for(let level=1;level<=clamp(integer(levels,5),1,5);level++)state[level]={
    waterDepth:.025,humidity:clamp(38+level*5,0,100),gasLevel:5+level*1.5,
    ventilationActive:true,pumpActive:false,supportIntegrity:100,
    cartAvailable:true,warning:"SAFE",risk:0,incident:false,lastUpdate:0
  };
  return state;
}
export function ensureMineEnvironment(state){
  if(!state||typeof state!=="object")throw new TypeError("mine-state-required");
  const defaults=createMineEnvironment();
  const saved=state.mineEnvironment&&typeof state.mineEnvironment==="object"?state.mineEnvironment:{};
  state.mineEnvironment={...defaults,...saved};
  for(let level=1;level<=5;level++){
    const current=saved[level]&&typeof saved[level]==="object"?saved[level]:{};
    state.mineEnvironment[level]={...defaults[level],...current};
    const env=state.mineEnvironment[level];
    env.waterDepth=clamp(Number(env.waterDepth)||0,0,1);
    env.humidity=clamp(Number(env.humidity)||0,0,100);
    env.gasLevel=clamp(Number(env.gasLevel)||0,0,100);
    env.supportIntegrity=clamp(Number(env.supportIntegrity)||0,0,100);
    env.ventilationActive=env.ventilationActive!==false;
    env.pumpActive=env.pumpActive===true;
    env.cartAvailable=env.cartAvailable!==false;
    env.lastUpdate=Math.max(0,Number(env.lastUpdate)||0);
  }
  return state.mineEnvironment;
}
export function mineSafetyAssessment(environment){
  const env=environment&&typeof environment==="object"?environment:{};
  const gas=clamp(Number(env.gasLevel)||0,0,100);
  const water=clamp(Number(env.waterDepth)||0,0,1);
  const support=clamp(Number(env.supportIntegrity??100),0,100);
  const risk=clamp(gas*.48+water*35+(100-support)*.55,0,100);
  const stopMining=risk>=80||support<=12||water>=.96;
  const status=stopMining?"EVACUATE":risk>=45?"CAUTION":"SAFE";
  const factors=[];
  if(gas>=25)factors.push("공기 순환 저하");
  if(water>=.35)factors.push("지하수 유입");
  if(support<=65)factors.push("지지대 내구도 저하");
  return {risk:Number(risk.toFixed(1)),status,stopMining,factors,message:stopMining?"안전 한계 초과 · 채굴을 중지하고 출구로 이동하세요.":status==="CAUTION"?"환경 경고 · 환기·배수·지지대를 점검하세요.":"광산 환경 정상"};
}
function advanceMineEnvironmentLevel(state,level,dt){
  const environments=ensureMineEnvironment(state),env=environments[level];
  const step=clamp(Number(dt)||0,0,1);
  if(step<=0)return {active:true,changed:false,level,environment:env,assessment:mineSafetyAssessment(env)};
  const before=[env.waterDepth,env.humidity,env.gasLevel,env.supportIntegrity,env.warning,env.incident];
  const worker=(state.buildings||[]).find(building=>building.layer==="mine"&&Number(building.mineLevel||1)===level);
  const x=state.player?.layer==="mine"&&Number(state.player?.mineLevel)===level?state.player.x:worker?.x??20;
  const z=state.player?.layer==="mine"&&Number(state.player?.mineLevel)===level?state.player.y:worker?.y??12;
  const profile=mineGeologyAt(level,integer(x),integer(z));
  const seepage=(.000075+(level-1)*.000012)*(.8+profile.moisture*.4);
  env.waterDepth=clamp(env.waterDepth+(seepage-((env.pumpActive ? .00024 : 0)))*step,0,1);
  const ventilationTarget=env.ventilationActive?100:28;
  env.humidity=clamp(env.humidity+(38+level*5+env.waterDepth*38-((ventilationTarget-28)*.12)-env.humidity)*Math.min(1,step*.035),18,98);
  env.gasLevel=clamp(env.gasLevel+(env.ventilationActive?-.035:.018)*step,0,100);
  const wearRate=.000075+Math.max(0,env.humidity-55)*.0000012+env.waterDepth*.000065+(level-1)*.000012;
  env.supportIntegrity=clamp(env.supportIntegrity-wearRate*step,0,100);
  const assessment=mineSafetyAssessment(env);
  env.risk=assessment.risk;env.warning=assessment.status;env.incident=assessment.stopMining;
  env.lastUpdate=(Number(env.lastUpdate)||0)+step;
  const after=[env.waterDepth,env.humidity,env.gasLevel,env.supportIntegrity,env.warning,env.incident];
  const changed=after.some((value,index)=>typeof value==="number"?Math.abs(value-before[index])>=.002:value!==before[index]);
  return {active:true,changed,level,environment:env,assessment,enteredWarning:before[4]!==env.warning,enteredIncident:before[5]!==true&&env.incident};
}
export function tickMineEnvironment(state,dt){
  ensureMineEnvironment(state);
  if(state.player?.layer!=="mine")return {active:false,changed:false,level:0,assessment:null};
  const level=clamp(integer(state.player.mineLevel,1),1,5);
  return advanceMineEnvironmentLevel(state,level,dt);
}
export function tickActiveMineEnvironments(state,dt){
  ensureMineEnvironment(state);
  const levels=new Set((state.buildings||[])
    .filter(building=>building.layer==="mine")
    .map(building=>clamp(integer(building.mineLevel,1),1,5)));
  if(state.player?.layer==="mine")levels.add(clamp(integer(state.player.mineLevel,1),1,5));
  const results=[];
  for(const level of levels)results.push(advanceMineEnvironmentLevel(state,level,dt));
  return {active:results.length>0,changed:results.some(result=>result.changed),results};
}
export function toggleMineEquipment(environment,equipment){
  if(!environment||typeof environment!=="object")throw new TypeError("mine-environment-required");
  if(equipment==="ventilation")environment.ventilationActive=!environment.ventilationActive;
  else if(equipment==="pump")environment.pumpActive=!environment.pumpActive;
  else throw new RangeError("unknown-mine-equipment:"+equipment);
  return environment[equipment==="ventilation"?"ventilationActive":"pumpActive"];
}
export function reinforceMineSupports(environment,amount=28){
  if(!environment||typeof environment!=="object")throw new TypeError("mine-environment-required");
  const before=clamp(Number(environment.supportIntegrity)||0,0,100);
  environment.supportIntegrity=clamp(before+clamp(Number(amount)||0,0,100),0,100);
  const assessment=mineSafetyAssessment(environment);
  environment.risk=assessment.risk;environment.warning=assessment.status;environment.incident=assessment.stopMining;
  return {before,after:environment.supportIntegrity,restored:environment.supportIntegrity-before,assessment};
}
export function setMineCartAvailability(environment,available){
  if(!environment||typeof environment!=="object")throw new TypeError("mine-environment-required");
  environment.cartAvailable=available===true;
  return environment.cartAvailable;
}
export function mineEnvironmentSummary(environment){
  const env=environment||{};
  const assessment=mineSafetyAssessment(env);
  return {waterPercent:Math.round(clamp(Number(env.waterDepth)||0,0,1)*100),humidity:Math.round(clamp(Number(env.humidity)||0,0,100)),gas:Math.round(clamp(Number(env.gasLevel)||0,0,100)),support:Math.round(clamp(Number(env.supportIntegrity??100),0,100)),ventilationActive:env.ventilationActive!==false,pumpActive:env.pumpActive===true,cartAvailable:env.cartAvailable!==false,...assessment};
}
