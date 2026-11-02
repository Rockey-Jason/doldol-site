/* Deterministic, save-resumable machine failure hazard primitives.
   A failure is only actionable when its canonical profile defines outcomes. */
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
const RISK_KEYS=["temperature","pressure","powerInstability","wear","load"];
const GRADE_KEYS=["minor","major","critical"];

export function validateFailureProfile(profile){
 const errors=[];
 if(!profile||typeof profile!=="object")return {valid:false,errors:["failure profile is missing"]};
 const probability=Number(profile.baseFailureProbability),duration=Number(profile.referenceDurationSec);
 if(!Number.isFinite(probability)||probability<0||probability>=1)errors.push("baseFailureProbability must be in [0,1)");
 if(!Number.isFinite(duration)||duration<=0)errors.push("referenceDurationSec must be > 0");
 if(!profile.loadRiskRange||!Number.isFinite(Number(profile.loadRiskRange.optimalRatio))||!Number.isFinite(Number(profile.loadRiskRange.criticalRatio))||Number(profile.loadRiskRange.optimalRatio)<0||Number(profile.loadRiskRange.criticalRatio)<=Number(profile.loadRiskRange.optimalRatio))errors.push("loadRiskRange must define optimalRatio and a greater criticalRatio");
 if(!profile.weights||typeof profile.weights!=="object")errors.push("risk weights are missing");
 else for(const key of RISK_KEYS){const w=Number(profile.weights[key]??0);if(!Number.isFinite(w)||w<0)errors.push("invalid risk weight: "+key)}
 const grades=profile.gradeDistribution;
 if(!grades||typeof grades!=="object")errors.push("gradeDistribution is missing");
 else{
  let total=0;
  for(const key of GRADE_KEYS){const p=Number(grades[key]);if(!Number.isFinite(p)||p<0||p>1)errors.push("invalid grade probability: "+key);else total+=p}
  if(Math.abs(total-1)>1e-9)errors.push("grade probabilities must sum to 1");
 }
 if(!profile.outcomes||typeof profile.outcomes!=="object")errors.push("explicit failure outcomes are missing");
 else for(const key of GRADE_KEYS)if(!profile.outcomes[key]||typeof profile.outcomes[key]!=="object")errors.push("missing outcome: "+key);
 return {valid:errors.length===0,errors};
}
function normalizedBandRisk(actual,target,min,max){
 if(!Number.isFinite(actual)||!Number.isFinite(target)||!Number.isFinite(min)||!Number.isFinite(max)||min>target||target>max||min===max)return {risk:0,valid:false,outOfBand:true};
 if(actual<min||actual>max)return {risk:1,valid:true,outOfBand:true};
 const span=Math.max(target-min,max-target);
 if(span<=0)return {risk:actual===target?0:1,valid:true,outOfBand:actual!==target};
 return {risk:clamp(Math.abs(actual-target)/span,0,1),valid:true,outOfBand:false};
}
export function calculateFailureRisks({profile,temperature,targetTemperature,safeTemperatureMin,safeTemperatureMax,pressure,targetPressure,safePressureMin,safePressureMax,powerRatio,condition,actualLoad,nominalLoad}={}){
 const temp=normalizedBandRisk(Number(temperature),Number(targetTemperature),Number(safeTemperatureMin),Number(safeTemperatureMax));
 const press=normalizedBandRisk(Number(pressure),Number(targetPressure),Number(safePressureMin),Number(safePressureMax));
 const loadRatio=Number(nominalLoad)>0?Number(actualLoad||0)/Number(nominalLoad):0;
 const loadRange=profile?.loadRiskRange||{optimalRatio:1,criticalRatio:2};
 const load=Number.isFinite(loadRatio)?clamp(Math.abs(loadRatio-Number(loadRange.optimalRatio))/Math.max(1e-9,Number(loadRange.criticalRatio)-Number(loadRange.optimalRatio)),0,1):0;
 return {temperature:temp.risk,pressure:press.risk,powerInstability:1-clamp(powerRatio,0,1),wear:1-clamp(finite(condition,100)/100,0,1),load,
  safetyFault:temp.outOfBand||press.outOfBand,temperatureBandValid:temp.valid,pressureBandValid:press.valid};
}
export function calculateFailureHazard(profile,risks,exposureSeconds){
 const validation=validateFailureProfile(profile);
 if(!validation.valid)return {valid:false,errors:validation.errors,baseHazardRate:0,hazardMultiplier:0,lambda:0,tickProbability:0};
 if(!risks||risks.safetyFault)return {valid:true,safetyFault:true,baseHazardRate:0,hazardMultiplier:0,lambda:0,tickProbability:0};
 for(const key of RISK_KEYS){const value=Number(risks[key]??0);if(!Number.isFinite(value)||value<0||value>1)return {valid:false,errors:["risk out of range: "+key],baseHazardRate:0,hazardMultiplier:0,lambda:0,tickProbability:0}}
 const baseHazardRate=-Math.log1p(-Number(profile.baseFailureProbability))/Number(profile.referenceDurationSec);
 const hazardMultiplier=1+RISK_KEYS.reduce((sum,key)=>sum+Number(risks[key]||0)*Number(profile.weights[key]||0),0);
 const lambda=baseHazardRate*hazardMultiplier,exposure=Math.max(0,finite(exposureSeconds,0));
 return {valid:true,safetyFault:false,baseHazardRate,hazardMultiplier,lambda,tickProbability:-Math.expm1(-lambda*exposure)};
}
export function nextFailureRandom(runtime){
 let state=(Number(runtime.failureRngState)>>>0)||0x6d2b79f5;
 state^=state<<13;state^=state>>>17;state^=state<<5;state>>>=0;
 runtime.failureRngState=state;runtime.failureRngIndex=Math.max(0,Math.floor(Number(runtime.failureRngIndex)||0))+1;
 return state/4294967296;
}
export function rollMachineFailure(runtime,machine,profile,hazard){
 if(!hazard?.valid||hazard.safetyFault||!(hazard.tickProbability>0))return null;
 const chance=nextFailureRandom(runtime);
 if(chance>=hazard.tickProbability)return null;
 const gradeRoll=nextFailureRandom(runtime),grades=profile.gradeDistribution;
 let cumulative=0,grade="critical";
 for(const key of GRADE_KEYS){cumulative+=Number(grades[key]);if(gradeRoll<cumulative){grade=key;break}}
 const sequence=Math.max(1,Math.floor(Number(runtime.nextFailureEventId)||1));
 runtime.nextFailureEventId=sequence+1;
 const event={failureEventID:"FAIL-"+sequence,machineID:String(machine.uid||machine.id||"unknown"),grade,createdTick:Math.max(0,Math.floor(Number(machine.tick)||0)),rngIndex:runtime.failureRngIndex,outcome:{...profile.outcomes[grade]}};
 runtime.failureEvents??=[];runtime.failureEvents.push(event);if(runtime.failureEvents.length>256)runtime.failureEvents.splice(0,runtime.failureEvents.length-256);
 return event;
}
export function advanceFailureExposure(machine,deltaSeconds,isExposed){
 const dt=Math.max(0,finite(deltaSeconds,0));
 machine.failureExposureSec=Math.max(0,finite(machine.failureExposureSec,0))+(isExposed?dt:0);
 return machine.failureExposureSec;
}
