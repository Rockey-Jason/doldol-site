export type NetworkProfile={lossPercent:number;minDelayMs:number;maxDelayMs:number;seed?:number};
export type NetworkResult={sent:number;delivered:number;dropped:number;lossPercent:number;minDelayMs:number;maxDelayMs:number;averageDelayMs:number;maxDelayMsObserved:number;reordered:number};

/** Deterministic transport simulator used by automated QA. It models packet loss,
 * variable one-way delay and reordering without touching production sockets. */
export function simulateNetwork(profile:NetworkProfile,packetCount=2000):NetworkResult{
  const loss=Math.max(0,Math.min(100,profile.lossPercent));
  const min=Math.max(0,Math.min(5000,profile.minDelayMs));
  const max=Math.max(min,Math.min(5000,profile.maxDelayMs));
  let state=(profile.seed??0x524f434b)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const deliveries:number[]=[];
  let dropped=0,totalDelay=0,maxObserved=0;
  for(let i=0;i<packetCount;i++){
    if(random()*100<loss){dropped++;continue;}
    const delay=min+random()*(max-min);
    deliveries.push(i*50+delay);totalDelay+=delay;maxObserved=Math.max(maxObserved,delay);
  }
  let reordered=0;
  for(let i=1;i<deliveries.length;i++)if(deliveries[i]<deliveries[i-1])reordered++;
  const delivered=deliveries.length;
  return {sent:packetCount,delivered,dropped,lossPercent:packetCount?dropped/packetCount*100:0,
    minDelayMs:min,maxDelayMs:max,averageDelayMs:delivered?totalDelay/delivered:0,
    maxDelayMsObserved:maxObserved,reordered};
}

export function solveTwoBoneIK(upper:number,lower:number,vertical:number,forward:number){
  const distance=Math.max(.001,Math.min(upper+lower-.001,Math.hypot(vertical,forward)));
  const kneeCos=Math.max(-1,Math.min(1,(upper*upper+lower*lower-distance*distance)/(2*upper*lower)));
  const knee=Math.PI-Math.acos(kneeCos);
  const hipCos=Math.max(-1,Math.min(1,(upper*upper+distance*distance-lower*lower)/(2*upper*distance)));
  const target=Math.atan2(forward,-vertical);
  const bend=Math.atan2(lower*Math.sin(knee),upper+lower*Math.cos(knee));
  return {hip:target-bend,knee,distance};
}

export type SoakSample={elapsedMs:number;fps:number;frameMs:number;heapMb:number|null;geometries:number;textures:number;drawCalls:number};
export function summarizeSoak(samples:SoakSample[]){
  if(!samples.length)return {samples:0,durationMs:0,fpsMin:0,fpsAverage:0,heapGrowthMb:null,geometryGrowth:0,textureGrowth:0};
  const first=samples[0],last=samples[samples.length-1];
  const heaps=samples.filter(s=>s.heapMb!==null);
  return {samples:samples.length,durationMs:last.elapsedMs,
    fpsMin:Math.min(...samples.map(s=>s.fps)),
    fpsAverage:samples.reduce((sum,s)=>sum+s.fps,0)/samples.length,
    heapGrowthMb:heaps.length>=2?(heaps[heaps.length-1].heapMb!-heaps[0].heapMb!):null,
    geometryGrowth:last.geometries-first.geometries,textureGrowth:last.textures-first.textures};
}
