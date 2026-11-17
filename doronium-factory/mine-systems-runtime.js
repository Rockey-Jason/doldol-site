/* DORONIUM FACTORY — connected mine infrastructure, local support safety,
   multi-station rail haulage and route finding. Pure deterministic runtime. */
import { MINE_W, MINE_H, mineMainDriftZ, mineTunnelAt } from "./terrain-system.js?v=6";

const LEVELS=5;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const integer=(value,fallback=0)=>Math.floor(num(value,fallback));
const keyOf=(level,x,z)=>String(level)+":"+String(x)+":"+String(z);
const cellKey=(x,z)=>String(x)+":"+String(z);
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]];
const DRAIN_TYPES=new Set(["mineDrainPipe","mineDrainPump","mineWaterTank"]);
const SUPPORT_X=[5,11,17,23,29,35];

export function ensureMineInfrastructure(state){
  if(!state||typeof state!=="object")throw new TypeError("mine-state-required");
  let infrastructure=state.mineInfrastructure;
  if(!infrastructure||typeof infrastructure!=="object"||Array.isArray(infrastructure)){
    infrastructure={version:1,supports:{},closures:{},events:[],railRoutes:{},lastUpdated:0};
    state.mineInfrastructure=infrastructure;
  }
  if(!infrastructure.supports||typeof infrastructure.supports!=="object")infrastructure.supports={};
  if(!infrastructure.closures||typeof infrastructure.closures!=="object")infrastructure.closures={};
  if(!Array.isArray(infrastructure.events))infrastructure.events=[];
  if(!infrastructure.railRoutes||typeof infrastructure.railRoutes!=="object")infrastructure.railRoutes={};
  infrastructure.version=1;
  for(let level=1;level<=LEVELS;level++){
    for(const x of SUPPORT_X){
      const z=mineMainDriftZ(x),key=keyOf(level,x,z);
      const saved=infrastructure.supports[key];
      if(!saved||typeof saved!=="object"){
        infrastructure.supports[key]={level,x,z,integrity:100,warning:false,closed:false,lastWear:0,lastRepair:0};
      }else{
        saved.level=level;saved.x=x;saved.z=z;
        saved.integrity=clamp(num(saved.integrity,100),0,100);
        saved.warning=saved.warning===true;saved.closed=saved.closed===true;
        saved.lastWear=Math.max(0,num(saved.lastWear));
        saved.lastRepair=Math.max(0,num(saved.lastRepair));
      }
      if(infrastructure.supports[key].closed)infrastructure.closures[key]=true;
    }
  }
  for(let level=1;level<=LEVELS;level++){
    const route=infrastructure.railRoutes[level];
    if(!route||typeof route!=="object")infrastructure.railRoutes[level]={enabled:false,stationIndex:0,direction:1,travelled:0,stopRemaining:0,position:null,cargo:[],delivered:0,loaded:0};
    else{
      route.enabled=route.enabled===true;
      route.stationIndex=Math.max(0,integer(route.stationIndex));
      route.direction=integer(route.direction,1)<0?-1:1;
      route.travelled=Math.max(0,num(route.travelled));
      route.stopRemaining=Math.max(0,num(route.stopRemaining));
      route.cargo=Array.isArray(route.cargo)?route.cargo:[];
      route.delivered=Math.max(0,integer(route.delivered));
      route.loaded=Math.max(0,integer(route.loaded));
    }
  }
  infrastructure.lastUpdated=Math.max(0,num(infrastructure.lastUpdated));
  return infrastructure;
}

export function mineSupportKey(level,x,z){return keyOf(level,x,z)}
export function mineSupportSections(state,level){
  const systems=ensureMineInfrastructure(state);
  return Object.values(systems.supports).filter(section=>Number(section.level)===integer(level));
}
export function nearestMineSupport(state,level,x,z){
  const sections=mineSupportSections(state,level);
  let best=null,bestDistance=Infinity;
  for(const section of sections){
    const d=Math.abs(section.x-num(x))+Math.abs(section.z-num(z));
    if(d<bestDistance){best=section;bestDistance=d}
  }
  return best?{section:best,distance:bestDistance}:null;
}
export function mineCellIsClosed(state,level,x,z){
  const systems=ensureMineInfrastructure(state),cell=cellKey(integer(x),integer(z));
  const closure=systems.closures[keyOf(level,integer(x),integer(z))];
  if(closure===true)return true;
  return Object.values(systems.supports).some(section=>section.closed&&Number(section.level)===integer(level)&&integer(section.x)===integer(x)&&integer(section.z)===integer(z));
}
export function mineCellIsSafe(state,level,x,z){
  const nearest=nearestMineSupport(state,level,x,z);
  if(!nearest||nearest.distance>5)return {safe:true,integrity:100,section:null,message:"지지대 영향 구간 밖"};
  const section=nearest.section,closed=section.closed===true||section.integrity<=8;
  return {safe:!closed&&section.integrity>12,integrity:section.integrity,section,closed,message:closed?"통로 지지대 붕괴 · 우회 경로를 이용하세요.":section.integrity<35?"지지대 위험 · 보강이 필요합니다.":section.integrity<65?"지지대 약화 · 점검이 필요합니다.":"지지대 상태 정상"};
}
export function repairMineSupport(state,level,x,z,amount=35){
  const nearest=nearestMineSupport(state,level,x,z);
  if(!nearest||nearest.distance>5)return {ok:false,reason:"NO_SUPPORT_IN_REACH"};
  const section=nearest.section,before=section.integrity;
  section.integrity=clamp(before+clamp(num(amount),0,100),0,100);
  section.lastRepair=num(state.seconds);
  if(section.integrity>30){section.warning=false;section.closed=false;delete ensureMineInfrastructure(state).closures[keyOf(level,section.x,section.z)]}
  return {ok:true,before,after:section.integrity,restored:section.integrity-before,section};
}

function activeMineLevels(state){
  const levels=new Set();
  if(state.player?.layer==="mine")levels.add(clamp(integer(state.player.mineLevel,1),1,LEVELS));
  for(const b of state.buildings||[])if(b?.layer==="mine")levels.add(clamp(integer(b.mineLevel,1),1,LEVELS));
  for(const b of state.buildings||[])if(b?.layer==="mine"&&DRAIN_TYPES.has(b.type))levels.add(clamp(integer(b.mineLevel,1),1,LEVELS));
  for(let level=1;level<=LEVELS;level++)if((state.buildings||[]).some(b=>b?.layer==="mine"&&integer(b.mineLevel,1)===level&&b.type==="mineRailStation"))levels.add(level);
  return levels;
}

function connectedDrainComponents(buildings,level){
  const nodes=(buildings||[]).filter(b=>b?.layer==="mine"&&integer(b.mineLevel,1)===level&&DRAIN_TYPES.has(b.type));
  const byCell=new Map(nodes.map(node=>[cellKey(integer(node.x),integer(node.y)),node]));
  const visited=new Set(),components=[];
  for(const node of nodes){
    const start=cellKey(integer(node.x),integer(node.y));
    if(visited.has(start))continue;
    const queue=[node],component=[],cells=new Set([start]);visited.add(start);
    for(let head=0;head<queue.length;head++){
      const current=queue[head];component.push(current);
      for(const [dx,dz] of DIRECTIONS){
        const key=cellKey(integer(current.x)+dx,integer(current.y)+dz),next=byCell.get(key);
        if(next&&!visited.has(key)){visited.add(key);cells.add(key);queue.push(next)}
      }
    }
    components.push({nodes:component,cells});
  }
  return components;
}
export function mineDrainageNetworks(state,level){
  const components=connectedDrainComponents(state.buildings,integer(level,1));
  return components.map(component=>{
    const pumps=component.nodes.filter(b=>b.type==="mineDrainPump");
    const tanks=component.nodes.filter(b=>b.type==="mineWaterTank");
    const pipes=component.nodes.filter(b=>b.type==="mineDrainPipe");
    const connected=pumps.length>0&&tanks.length>0&&pipes.length>0;
    return {connected,pumps,tanks,pipes,cellCount:component.nodes.length,storedLitres:tanks.reduce((n,t)=>n+Math.max(0,num(t.waterStoredL)),0),capacityLitres:tanks.reduce((n,t)=>n+Math.max(0,num(t.capacityL,12000)),0)};
  });
}
export function tickMineDrainage(state,dt){
  const systems=ensureMineInfrastructure(state),step=clamp(num(dt),0,1),results=[];
  if(step<=0)return {changed:false,results};
  for(const level of activeMineLevels(state)){
    const env=state.mineEnvironment?.[level];if(!env)continue;
    for(const network of mineDrainageNetworks(state,level)){
      if(!network.connected)continue;
      for(const pump of network.pumps){
        if(pump.failureRepair||pump.status!=="RUNNING"||env.pumpActive===false)continue;
        const rate=clamp(num(pump.rateLps,24),0,120);
        for(const tank of network.tanks){
          const capacity=Math.max(0,num(tank.capacityL,12000)-num(tank.waterStoredL));
          if(capacity<=0)continue;
          const available=Math.max(0,num(env.waterDepth))*30000;
          const transferred=Math.min(capacity,available,rate*step);
          if(transferred<=0)continue;
          tank.waterStoredL=num(tank.waterStoredL)+transferred;
          env.waterDepth=clamp(num(env.waterDepth)-transferred/30000,0,1);
          pump.totalPumpedLitres=Math.max(0,num(pump.totalPumpedLitres))+transferred;
          results.push({level,pumpID:pump.uid,tankID:tank.uid,litres:transferred,remainingDepth:env.waterDepth});
          break;
        }
      }
    }
  }
  systems.lastUpdated=num(state.seconds);
  return {changed:results.length>0,results};
}
export function mineDrainageSummary(state,level){
  const networks=mineDrainageNetworks(state,level);
  return {pumpCount:networks.reduce((n,x)=>n+x.pumps.length,0),tankCount:networks.reduce((n,x)=>n+x.tanks.length,0),pipeCount:networks.reduce((n,x)=>n+x.pipes.length,0),connectedNetworks:networks.filter(x=>x.connected).length,connectedPumps:networks.filter(x=>x.connected).reduce((n,x)=>n+x.pumps.length,0),storedLitres:networks.reduce((n,x)=>n+x.storedLitres,0),capacityLitres:networks.reduce((n,x)=>n+x.capacityLitres,0)};
}

export function mineRailStations(state,level){
  return (state.buildings||[]).filter(b=>b?.type==="mineRailStation"&&b.layer==="mine"&&integer(b.mineLevel,1)===integer(level,1))
    .slice().sort((a,b)=>integer(a.x)-integer(b.x)||integer(a.y)-integer(b.y));
}
export function setMineRailEnabled(state,level,enabled){
  const systems=ensureMineInfrastructure(state),stations=mineRailStations(state,level),route=systems.railRoutes[integer(level,1)];
  if(enabled&&stations.length<2)return {ok:false,reason:"TWO_STATIONS_REQUIRED",stationCount:stations.length};
  route.enabled=enabled===true;route.stationIndex=clamp(route.stationIndex,0,Math.max(0,stations.length-1));
  route.direction=1;route.travelled=0;route.stopRemaining=route.enabled?1.5:0;
  if(stations.length)route.position={x:num(stations[route.stationIndex].x),y:num(stations[route.stationIndex].y)};
  return {ok:true,enabled:route.enabled,stationCount:stations.length};
}
export function mineRailSummary(state,level){
  const stations=mineRailStations(state,level),route=ensureMineInfrastructure(state).railRoutes[integer(level,1)];
  return {stationCount:stations.length,enabled:route.enabled===true,cargoCount:route.cargo.length,loaded:route.loaded,delivered:route.delivered,position:route.position,canRun:stations.length>=2};
}
export function tickMineRailRoutes(state,dt){
  const systems=ensureMineInfrastructure(state),step=clamp(num(dt),0,1),deliveries=[],events=[];
  if(step<=0)return {changed:false,deliveries,events};
  for(let level=1;level<=LEVELS;level++){
    const stations=mineRailStations(state,level),route=systems.railRoutes[level];
    if(!route.enabled||stations.length<2)continue;
    route.stationIndex=clamp(route.stationIndex,0,stations.length-1);
    const current=stations[route.stationIndex];
    if(!route.position)route.position={x:num(current.x),y:num(current.y)};
    if(route.stopRemaining>0){
      const previous=route.stopRemaining;route.stopRemaining=Math.max(0,previous-step);
      if(previous>0&&route.stopRemaining===0){
        const terminal=route.stationIndex===0||route.stationIndex===stations.length-1;
        if(terminal&&route.cargo.length){
          for(const cargo of route.cargo)deliveries.push({level,buildingUID:cargo.buildingUID,itemID:cargo.itemID,quantity:cargo.quantity,meta:cargo.meta});
          route.delivered+=route.cargo.length;events.push({type:"RAIL_UNLOAD",level,count:route.cargo.length});route.cargo=[];
        }else{
          const available=(state.buildings||[]).filter(b=>b?.layer==="mine"&&integer(b.mineLevel,1)===level&&b.output&&!b.mineRailReserved&&!b.failureRepair);
          for(const miner of available){
            if(route.cargo.length>=12)break;
            const near=Math.abs(num(miner.x)-num(current.x))+Math.abs(num(miner.y)-num(current.y));
            if(near>5)continue;
            const output=miner.output;
            if(!output?.id||!(num(output.qty)>0))continue;
            miner.mineRailReserved=true;
            route.cargo.push({buildingUID:miner.uid,itemID:output.id,quantity:num(output.qty),meta:output.meta?{...output.meta}:{},loadedAt:route.stationIndex});
            route.loaded++;events.push({type:"RAIL_LOAD",level,buildingUID:miner.uid,itemID:output.id,quantity:num(output.qty)});
          }
        }
      }
      continue;
    }
    const nextIndex=route.stationIndex+route.direction;
    if(nextIndex<0||nextIndex>=stations.length){route.direction*=-1;route.stopRemaining=1.5;continue}
    const next=stations[nextIndex],dx=num(next.x)-num(current.x),dy=num(next.y)-num(current.y);
    const length=Math.max(1,Math.abs(dx)+Math.abs(dy)),speed=2.6*step;
    route.travelled+=speed;
    const fraction=clamp(route.travelled/length,0,1);
    route.position={x:num(current.x)+dx*fraction,y:num(current.y)+dy*fraction};
    if(fraction>=1){
      route.stationIndex=nextIndex;route.travelled=0;route.position={x:num(next.x),y:num(next.y)};route.stopRemaining=1.5;
    }
  }
  return {changed:deliveries.length>0||events.length>0,deliveries,events};
}
export function mineRoutePath(level,start,goal,closures={}){
  const sx=integer(start?.x,-1),sz=integer(start?.z??start?.y,-1),gx=integer(goal?.x,-1),gz=integer(goal?.z??goal?.y,-1);
  if(!mineTunnelAt(sx,sz)||!mineTunnelAt(gx,gz))return null;
  const closed=(x,z)=>closures[keyOf(level,x,z)]===true;
  if(closed(gx,gz))return null;
  const startKey=cellKey(sx,sz),goalKey=cellKey(gx,gz);
  if(startKey===goalKey)return [{x:sx,z:sz}];
  const queue=[{x:sx,z:sz}],came=new Map([[startKey,null]]);let found=false;
  for(let head=0;head<queue.length&&head< MINE_W*MINE_H;head++){
    const cell=queue[head];
    for(const [dx,dz] of DIRECTIONS){
      const x=cell.x+dx,z=cell.z+dz,key=cellKey(x,z);
      if(came.has(key)||!mineTunnelAt(x,z)||closed(x,z))continue;
      came.set(key,cellKey(cell.x,cell.z));
      if(key===goalKey){found=true;break}
      queue.push({x,z});
    }
    if(found)break;
  }
  if(!found)return null;
  const path=[];let cursor=goalKey;
  while(cursor!==startKey){const [x,z]=cursor.split(":").map(Number);path.push({x,z});cursor=came.get(cursor)}
  path.push({x:sx,z:sz});return path.reverse();
}

export function tickMineSupportSections(state,dt){
  const systems=ensureMineInfrastructure(state),step=clamp(num(dt),0,1),events=[];
  if(step<=0)return {changed:false,events};
  for(const level of activeMineLevels(state)){
    const env=state.mineEnvironment?.[level]||{};
    const wetness=clamp(num(env.waterDepth),0,1),humidity=clamp(num(env.humidity),0,100);
    const drills=(state.buildings||[]).filter(b=>b?.layer==="mine"&&integer(b.mineLevel,1)===level&&String(b.type).startsWith("miner")&&b.status==="RUNNING");
    for(const section of mineSupportSections(state,level)){
      if(section.closed)continue;
      const drillLoad=drills.some(b=>Math.abs(num(b.x)-section.x)+Math.abs(num(b.y)-section.z)<=5)?.0024:0;
      const wearRate=.00018+wetness*.0013+(humidity/100)*.00016+drillLoad;
      const before=section.integrity;
      section.integrity=clamp(before-wearRate*step,0,100);
      section.lastWear=num(state.seconds);
      if(!section.warning&&section.integrity<=55){
        section.warning=true;events.push({type:"SUPPORT_WARNING",level,x:section.x,z:section.z,integrity:section.integrity});
      }
      if(section.integrity<=8){
        section.closed=true;systems.closures[keyOf(level,section.x,section.z)]=true;
        events.push({type:"PASSAGE_CLOSED",level,x:section.x,z:section.z,integrity:section.integrity});
      }
    }
  }
  systems.events.push(...events.map(event=>({...event,at:num(state.seconds)})));
  if(systems.events.length>60)systems.events.splice(0,systems.events.length-60);
  return {changed:events.length>0,events};
}
export function supportSectionsSummary(state,level){
  const sections=mineSupportSections(state,level);
  return {total:sections.length,healthy:sections.filter(s=>s.integrity>55&&!s.closed).length,warning:sections.filter(s=>s.warning&&!s.closed).length,closed:sections.filter(s=>s.closed).length,minimum:sections.length?Math.min(...sections.map(s=>Math.round(s.integrity))):100};
}
export function mineVeinSegments(node){
  const seed=(Math.imul(integer(node?.x),73856093)^Math.imul(integer(node?.z),19349663)^Math.imul(integer(node?.level),83492791))>>>0;
  const type=String(node?.type||"stone"),coal=type==="coal",crystal=type.includes("CRYSTAL")||type==="quartz"||type==="diamond";
  const count=coal?5:crystal?4:3,segments=[];
  for(let i=0;i<count;i++){
    const h=((seed>>>(i*3%24))&15)/15;
    const bend=Math.sin(i*.85+(seed%97)*.01)*3.2;
    segments.push({side:i%2?1:-1,height:5+h*13,offset:(i-(count-1)/2)*3+bend,length:(coal?12:8)+(seed+i*17)%11,width:coal?1.05:crystal?1.7:.72,angle:(h-.5)*.24});
  }
  return segments;
}
