/* Directed, deterministic factory logistics graph with routing, backpressure and deadlock diagnosis. */
const DIRECTIONS=Object.freeze([{x:0,y:-1,name:"N"},{x:1,y:0,name:"E"},{x:0,y:1,name:"S"},{x:-1,y:0,name:"W"}]);
const conveyorTypes=new Set(["belt","beltAdaptive","sorter","splitter","merger","conveyorLift","curvedConveyor","multiLaneConveyor"]);
const pos=(x,y)=>String(x)+","+String(y);
function dirsFor(building,item){
 const type=String(building.type||"");
 if(type==="splitter"||type==="multiLaneConveyor"){
  const start=((Number(building.routeCursor)||0)%4+4)%4;
  return [0,1,2,3].map(offset=>(start+offset)%4);
 }
 if(type==="sorter"){
  const selected=building.routes?.[item?.id]??building.defaultDirection??building.dir??1;
  const dirs=Array.isArray(selected)?selected:[selected];
  return [...new Set(dirs.map(x=>((Math.floor(Number(x)||0)%4)+4)%4))];
 }
 if(type==="curvedConveyor"&&Number.isInteger(building.curveDirection))return [((building.curveDirection%4)+4)%4];
 return [((Math.floor(Number(building.dir)||0)%4)+4)%4];
}
function hasItem(building){return !!building?.item}
export function buildLogisticsGraph(buildings=[],{conveyorTypeIDs}={}){
 const conveyorSet=new Set(conveyorTypeIDs||conveyorTypes),byID=new Map(),byPos=new Map();
 for(const b of buildings||[]){if(!b||b.uid==null)continue;byID.set(String(b.uid),b);byPos.set(pos(b.x,b.y),b)}
 const nodes=[],edges=[],outgoing=new Map(),incoming=new Map();
 const conveyors=(buildings||[]).filter(b=>conveyorSet.has(String(b.type))).sort((a,b)=>String(a.uid).localeCompare(String(b.uid)));
 for(const b of conveyors){const id=String(b.uid);nodes.push({id,type:String(b.type),x:Number(b.x),y:Number(b.y)});outgoing.set(id,[]);incoming.set(id,[])}
 for(const b of buildings||[])if(b?.uid!=null&&b.output)outgoing.set(String(b.uid),[]);
 const edgeSources=[...conveyors,...(buildings||[]).filter(b=>b?.uid!=null&&b.output&&!conveyorSet.has(String(b.type)))];
 for(const b of edgeSources){
  const from=String(b.uid),routes=dirsFor(b,b.item||b.output);
  for(const d of routes){const vector=DIRECTIONS[d],target=byPos.get(pos(Number(b.x)+vector.x,Number(b.y)+vector.y));if(!target)continue;
   const edge={from,to:String(target.uid),direction:d,targetType:String(target.type),targetIsConveyor:conveyorSet.has(String(target.type))};
   edges.push(edge);outgoing.get(from).push(edge);if(edge.targetIsConveyor){incoming.get(edge.to)?.push(edge)}
  }
 }
 // Undirected components identify isolated belt networks even when belt arrows point one-way.
 const undirected=new Map(conveyors.map(b=>[String(b.uid),new Set()]));
 for(const e of edges)if(e.targetIsConveyor){undirected.get(e.from).add(e.to);undirected.get(e.to).add(e.from)}
 const networkByID=new Map(),visited=new Set();let networkIndex=0;
 for(const id of [...undirected.keys()].sort())if(!visited.has(id)){
  const queue=[id],members=[];visited.add(id);while(queue.length){const at=queue.shift();members.push(at);for(const n of undirected.get(at))if(!visited.has(n)){visited.add(n);queue.push(n)}}
  networkIndex++;for(const member of members)networkByID.set(member,"LOGISTICS-"+networkIndex);
 }
 // Directed cycle detection by DFS, retaining exact cycle members for deadlock diagnostics.
 const colors=new Map(),stack=[],cycleSets=[];const onStack=new Set();
 function visit(id){
  colors.set(id,1);stack.push(id);onStack.add(id);
  for(const edge of outgoing.get(id)||[]){if(!edge.targetIsConveyor)continue;const next=edge.to;
   if(!colors.has(next))visit(next);
   else if(colors.get(next)===1){const start=stack.lastIndexOf(next);if(start>=0)cycleSets.push(stack.slice(start))}
  }
  stack.pop();onStack.delete(id);colors.set(id,2);
 }
 for(const id of [...outgoing.keys()].sort())if(!colors.has(id))visit(id);
 const cycles=[],cycleSeen=new Set();
 for(const cycle of cycleSets){const signature=[...cycle].sort().join("|");if(!cycleSeen.has(signature)){cycleSeen.add(signature);cycles.push([...cycle])}}
 return {nodes,edges,byID,byPos,outgoing,incoming,networkByID,cycles,conveyorTypeIDs:[...conveyorSet]};
}
export function selectLogisticsTarget(graph,source,item,{canAccept=()=>true,occupied=hasItem}={}){
 const id=String(source?.uid||"");
 const candidates=graph.outgoing.get(id)||[];
 for(const edge of candidates){const target=graph.byID.get(edge.to);if(!target)continue;
  if(edge.targetIsConveyor&&occupied(target))continue;
  if(!edge.targetIsConveyor&&!canAccept(target,item))continue;
  return {target,edge};
 }
 return null;
}
export function previewLogisticsPath(graph,startID,targetID){
 const start=String(startID),target=String(targetID);if(start===target)return [start];
 if(!graph.outgoing.has(start))return null;
 const queue=[start],came=new Map([[start,null]]);
 for(let head=0;head<queue.length;head++){
  const id=queue[head];for(const edge of graph.outgoing.get(id)||[]){const next=edge.to;if(came.has(next))continue;came.set(next,id);if(next===target){const path=[target];let cursor=id;while(cursor){path.push(cursor);cursor=came.get(cursor)}return path.reverse()}if(graph.outgoing.has(next))queue.push(next)}
 }
 return null;
}
export function analyzeLogisticsPressure(graph){
 const backpressured=[],deadlocked=[];
 for(const [id,edges] of graph.outgoing){
  const hasRoute=edges.length>0,blocked=hasRoute&&edges.every(edge=>{const target=graph.byID.get(edge.to);return edge.targetIsConveyor?hasItem(target):true});
  if(!hasRoute||blocked)backpressured.push({buildingID:id,reason:!hasRoute?"NO_ROUTE":"DOWNSTREAM_FULL"});
 }
 for(const cycle of graph.cycles){
  const full=cycle.every(id=>{const b=graph.byID.get(id);if(!hasItem(b))return false;const edges=graph.outgoing.get(id)||[];return edges.length>0&&edges.every(e=>!e.targetIsConveyor||hasItem(graph.byID.get(e.to)))});
  if(full)deadlocked.push({buildingIDs:[...cycle],itemCount:cycle.length});
 }
 return {backpressured,deadlocked,cycleCount:graph.cycles.length};
}
