/* Deterministic machine runtime helpers. No renderer or DOM dependencies. */
export const MIN_PRODUCTION_POWER_RATIO=0.8;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

export function resolveMachinePower(ratio,requiredPowerKW=1){
  const required=Math.max(0,finite(requiredPowerKW,0));
  const power=required===0?1:clamp(ratio,0,1);
  if(required===0||power>=1)return {status:"RUNNING",ratio:power,progressMultiplier:1,canProgress:true};
  if(power>=MIN_PRODUCTION_POWER_RATIO)return {status:"BROWNOUT_RUNNING",ratio:power,progressMultiplier:power,canProgress:true};
  return {status:"PAUSED_POWER",ratio:power,progressMultiplier:0,canProgress:false};
}
export function moveTowards(current,target,maxDelta){
  const from=finite(current,0),to=finite(target,0),step=Math.max(0,finite(maxDelta,0));
  if(Math.abs(to-from)<=step)return to;
  return from+Math.sign(to-from)*step;
}
function accuracy(actual,target,absoluteTolerance){
  if(target===0){
    const tolerance=finite(absoluteTolerance,NaN);
    if(!(tolerance>0))return 0;
    const deviation=Math.abs(actual-target)/tolerance;
    return deviation<=1?100:deviation<=3?95:deviation<=5?85:deviation<=10?70:50;
  }
  const deviation=Math.abs(actual-target)/Math.abs(target);
  return deviation<=.01?100:deviation<=.03?95:deviation<=.05?85:deviation<=.10?70:50;
}
export function advanceMachineEnvironment(machine,recipe,deltaSeconds,powerRatio){
  const dt=Math.max(0,finite(deltaSeconds,0)),power=clamp(powerRatio,0,1);
  const usesTemperature=recipe.usesTemperature??Number.isFinite(Number(recipe.temp));
  const usesPressure=recipe.usesPressure??Number.isFinite(Number(recipe.pressure));
  const targetTemperature=finite(recipe.temp,0),targetPressure=finite(recipe.pressure,0);
  const currentTemperature=finite(machine.temp,25),currentPressure=finite(machine.pressure,0);
  const tempStep=Number.isFinite(Number(recipe.temperatureRampPerSecond))?Math.max(0,Number(recipe.temperatureRampPerSecond))*dt*power:Math.abs(targetTemperature-currentTemperature)*Math.min(1,dt*.22)*power;
  const pressureStep=Number.isFinite(Number(recipe.pressureRampPerSecond))?Math.max(0,Number(recipe.pressureRampPerSecond))*dt*power:Math.abs(targetPressure-currentPressure)*Math.min(1,dt*.18)*power;
  if(usesTemperature)machine.temp=moveTowards(currentTemperature,targetTemperature,tempStep);
  if(usesPressure)machine.pressure=moveTowards(currentPressure,targetPressure,pressureStep);
  const tempTolerance=Math.max(finite(recipe.temperatureTolerance,0),finite(recipe.temperatureToleranceAbsolute,0),Math.abs(targetTemperature)*finite(recipe.temperatureToleranceRatio,.1));
  const pressureTolerance=Math.max(finite(recipe.pressureTolerance,0),finite(recipe.pressureToleranceAbsolute,0),Math.abs(targetPressure)*finite(recipe.pressureToleranceRatio,.1));
  const tempMin=finite(recipe.safeTemperatureMin,targetTemperature-tempTolerance),tempMax=finite(recipe.safeTemperatureMax,targetTemperature+tempTolerance);
  const pressureMin=finite(recipe.safePressureMin,targetPressure-pressureTolerance),pressureMax=finite(recipe.safePressureMax,targetPressure+pressureTolerance);
  const temp=finite(machine.temp,25),pressure=finite(machine.pressure,0);
  const safe=(!usesTemperature||(temp>=tempMin&&temp<=tempMax))&&(!usesPressure||(pressure>=pressureMin&&pressure<=pressureMax));
  return {safe,usesTemperature,usesPressure,temperatureQuality:usesTemperature?accuracy(temp,targetTemperature,recipe.temperatureAbsoluteTolerance):100,
    pressureQuality:usesPressure?accuracy(pressure,targetPressure,recipe.pressureAbsoluteTolerance):100,
    targetTemperature,targetPressure,tempMin,tempMax,pressureMin,pressureMax};
}
export function applyMachineWear(machine,recipe,deltaSeconds,powerRatio){
  const baseWear=Math.max(0,finite(recipe.baseWearPerSecond,0));
  const dt=Math.max(0,finite(deltaSeconds,0));
  const condition=clamp(machine.condition??machine.durability??100,0,100);
  const powerStress=1-clamp(powerRatio,0,1);
  const tempTarget=finite(recipe.temp,finite(machine.temp,0)),pressureTarget=finite(recipe.pressure,finite(machine.pressure,0));
  const tempRisk=recipe.usesTemperature===false?0:clamp(Math.abs(finite(machine.temp,0)-tempTarget)/Math.max(1,Math.abs(tempTarget)*.1),0,1);
  const pressureRisk=recipe.usesPressure===false?0:clamp(Math.abs(finite(machine.pressure,0)-pressureTarget)/Math.max(1,Math.abs(pressureTarget)*.1),0,1);
  const stress=1+tempRisk*Math.max(0,finite(recipe.temperatureWearWeight,0))+pressureRisk*Math.max(0,finite(recipe.pressureWearWeight,0))+powerStress*Math.max(0,finite(recipe.powerWearWeight,0));
  const wear=baseWear*dt*stress;
  const next=clamp(condition-wear,0,100);
  machine.condition=next;
  if("durability" in machine)machine.durability=next;
  return {condition:next,wear,stress,maintenanceRecommended:next<=25,broken:next<=0,progressMultiplier:next<=10?.8:1};
}
export function commitCompletionBuffer(machine,payload){
  if(machine.output)return false;
  if(!payload||!payload.id||!Number.isFinite(Number(payload.qty))||Number(payload.qty)<=0)return false;
  machine.output={id:String(payload.id),qty:Math.floor(Number(payload.qty)),meta:{...(payload.meta||{})}};
  return true;
}
export function clearCompletionBuffer(machine){
  if(!machine.output)return false;
  machine.output=null;return true;
}
