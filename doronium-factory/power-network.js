/* A17.1 graph-based power allocation. All losses/capacities are explicit data, never guessed. */
const finite = n => Number.isFinite(Number(n));
const nonNegative = n => finite(n) && Number(n) >= 0;
const unit = n => finite(n) && Number(n) >= 0 && Number(n) <= 1;
const compareID = (a,b) => String(a.id).localeCompare(String(b.id));
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

function normalizeNodeSet(input, errors) {
  const nodes = new Map();
  for (const node of input || []) {
    if (!node?.id || typeof node.id !== "string" || nodes.has(node.id)) {
      errors.push("INVALID_OR_DUPLICATE_NODE:" + String(node?.id));
      continue;
    }
    nodes.set(node.id, { id: node.id });
  }
  return nodes;
}

function addEdge(edges, nodes, edge, type, errors) {
  const id = String(edge?.id || "");
  const from = String(edge?.fromNodeID || edge?.from || "");
  const to = String(edge?.toNodeID || edge?.to || "");
  if (!id || !from || !to || from === to || !nodes.has(from) || !nodes.has(to) ||
      !nonNegative(edge.capacityKW) || !unit(edge.lossRatio ?? 0) ||
      (type === "transformer" && !unit(edge.efficiency))) {
    errors.push("INVALID_POWER_EDGE:" + id);
    return;
  }
  edges.push({
    id, from, to, type, capacityRemainingKW: Number(edge.capacityKW),
    efficiency: type === "transformer" ? Number(edge.efficiency) : 1,
    lossRatio: Number(edge.lossRatio ?? 0),
    enabled: edge.enabled !== false
  });
}

function buildAdjacency(nodes, edges) {
  const adjacency = new Map([...nodes.keys()].map(id => [id, []]));
  for (const edge of edges) {
    if (!edge.enabled || edge.capacityRemainingKW <= 0) continue;
    adjacency.get(edge.from).push({ nodeID: edge.to, edge, forward: true });
    adjacency.get(edge.to).push({ nodeID: edge.from, edge, forward: false });
  }
  for (const list of adjacency.values()) list.sort((a,b) =>
    a.nodeID.localeCompare(b.nodeID) || a.edge.id.localeCompare(b.edge.id));
  return adjacency;
}

function components(nodes, adjacency) {
  const visited = new Set(), groups = [];
  for (const start of [...nodes.keys()].sort()) {
    if (visited.has(start)) continue;
    const queue = [start], members = [];
    visited.add(start);
    for (let index=0; index<queue.length; index++) {
      const id = queue[index]; members.push(id);
      for (const next of adjacency.get(id) || []) {
        if (visited.has(next.nodeID)) continue;
        visited.add(next.nodeID); queue.push(next.nodeID);
      }
    }
    members.sort();
    groups.push(members);
  }
  return groups;
}

/* Dijkstra: least cumulative transmission loss, then fewest hops, then stable edge ID. */
function findPath(start, goal, adjacency) {
  if (start === goal) return { edges: [], factor: 1 };
  const best = new Map([[start, { cost: 0, hops: 0, path: [] }]]);
  const pending = new Set([start]);
  while (pending.size) {
    const currentID = [...pending].sort((a,b) => {
      const A=best.get(a),B=best.get(b);
      return A.cost-B.cost || A.hops-B.hops || a.localeCompare(b);
    })[0];
    pending.delete(currentID);
    const current = best.get(currentID);
    if (currentID === goal) {
      let factor=1;
      for (const step of current.path) factor*=step.efficiency*(1-step.lossRatio);
      return { edges: current.path, factor };
    }
    for (const next of adjacency.get(currentID) || []) {
      if (!next.edge.enabled || next.edge.capacityRemainingKW <= 0) continue;
      const efficiency = next.edge.efficiency;
      const factor = efficiency*(1-next.edge.lossRatio);
      if (!(factor>0)) continue;
      const cost = current.cost - Math.log(factor);
      const candidate = {
        cost, hops: current.hops+1,
        path: current.path.concat([{edgeID:next.edge.id,efficiency,lossRatio:next.edge.lossRatio}])
      };
      const previous=best.get(next.nodeID);
      if (!previous || cost<previous.cost-1e-12 ||
          (Math.abs(cost-previous.cost)<=1e-12 && candidate.hops<previous.hops)) {
        best.set(next.nodeID,candidate);pending.add(next.nodeID);
      }
    }
  }
  return null;
}

function deliveredCapacityFromPath(path, edgeByID) {
  if (!path.edges.length) return Number.POSITIVE_INFINITY;
  let before=1, limit=Number.POSITIVE_INFINITY;
  for (const step of path.edges) {
    const edge=edgeByID.get(step.edgeID);
    const after=before*step.efficiency*(1-step.lossRatio);
    limit=Math.min(limit,edge.capacityRemainingKW*after);
    before=after;
  }
  return limit;
}
function consumePathCapacity(path, edgeByID, sourceKW) {
  let before=sourceKW;
  for (const step of path.edges) {
    const edge=edgeByID.get(step.edgeID);
    edge.capacityRemainingKW=Math.max(0,edge.capacityRemainingKW-before);
    before*=step.efficiency*(1-step.lossRatio);
  }
}

function validateAttachments(items, nodes, label, errors, idField="nodeID") {
  const seen=new Set(),valid=[];
  for (const item of items||[]) {
    const id=String(item?.id||""),node=String(item?.[idField]||"");
    if (!id || seen.has(id) || !nodes.has(node)) {
      errors.push("INVALID_"+label+":"+(id||node));continue;
    }
    seen.add(id);valid.push(item);
  }
  return valid;
}

export function resolvePowerNetworks(input = {}) {
  const dt=Number(input.dtSeconds);
  const errors=[];
  if (!finite(dt) || dt<=0) errors.push("INVALID_DT_SECONDS");
  const nodes=normalizeNodeSet(input.nodes,errors);
  const edges=[];
  for (const edge of input.cables||[]) addEdge(edges,nodes,edge,"cable",errors);
  for (const edge of input.transformers||[]) addEdge(edges,nodes,edge,"transformer",errors);
  const generators=validateAttachments(input.generators,nodes,"GENERATOR",errors);
  const consumers=validateAttachments(input.consumers,nodes,"CONSUMER",errors);
  const batteries=validateAttachments(input.batteries,nodes,"BATTERY",errors);
  for (const generator of generators) if (!nonNegative(generator.availableKW)) errors.push("INVALID_GENERATOR_POWER:"+generator.id);
  for (const consumer of consumers) if (!nonNegative(consumer.requiredKW)) errors.push("INVALID_CONSUMER_POWER:"+consumer.id);
  for (const battery of batteries) {
    if (!nonNegative(battery.energyKJ)||!nonNegative(battery.capacityKJ)||
        Number(battery.energyKJ)>Number(battery.capacityKJ)||
        !nonNegative(battery.maxOutputKW)||!nonNegative(battery.maxInputKW)||
        !unit(battery.chargeEfficiency??1)||!(Number(battery.chargeEfficiency??1)>0)||
        !unit(battery.dischargeEfficiency??1)||!(Number(battery.dischargeEfficiency??1)>0)) {
      errors.push("INVALID_BATTERY:"+battery.id);
    }
  }
  if (errors.length) return { valid:false,errors,networks:[],consumers:{} };

  const edgeByID=new Map(edges.map(edge=>[edge.id,edge]));
  if(edgeByID.size!==edges.length)return {valid:false,errors:["DUPLICATE_POWER_EDGE_ID"],networks:[],consumers:{}};
  const adjacency=buildAdjacency(nodes,edges),groups=components(nodes,adjacency),networkResults=[],consumerResults={};
  const componentForNode=new Map();
  groups.forEach((members,index)=>members.forEach(id=>componentForNode.set(id,index)));

  for(const [index,members] of groups.entries()){
    const networkID="PWR-"+members[0];
    const memberSet=new Set(members);
    const localEdges=edges.filter(edge=>memberSet.has(edge.from)&&memberSet.has(edge.to));
    const localAdj=buildAdjacency(nodes,localEdges);
    const localGenerators=generators.filter(item=>memberSet.has(item.nodeID)).sort(compareID)
      .map(item=>({ ...item,remainingKW:Number(item.availableKW) }));
    const localBatteries=batteries.filter(item=>memberSet.has(item.nodeID)).sort(compareID)
      .map(item=>({ ...item,energyKJ:Number(item.energyKJ) }));
    const localConsumers=consumers.filter(item=>memberSet.has(item.nodeID)).sort((a,b)=>
      Number(a.priority??100)-Number(b.priority??100)||compareID(a,b));
    const edgeState=new Map(localEdges.map(edge=>[edge.id,edge]));
    const sourceOrder=[
      ...localGenerators.map(source=>({kind:"generator",source})),
      ...localBatteries.map(source=>({kind:"battery",source}))
    ];
    const results=[];
    for(const consumer of localConsumers){
      let remaining=Number(consumer.requiredKW),suppliedKW=0;
      for(const sourceEntry of sourceOrder){
        if(remaining<=1e-9)break;
        const source=sourceEntry.source;
        let sourceAvailable=sourceEntry.kind==="generator"?source.remainingKW:
          Math.min(Number(source.maxOutputKW),dt>0?source.energyKJ*Number(source.dischargeEfficiency??1)/dt:0);
        if(sourceAvailable<=1e-9)continue;
        const path=findPath(source.nodeID,consumer.nodeID,localAdj);
        if(!path)continue;
        const edgeLimit=deliveredCapacityFromPath(path,edgeState);
        const delivered=Math.min(remaining,sourceAvailable*path.factor,edgeLimit);
        if(delivered<=1e-9)continue;
        const sourceDraw=delivered/path.factor;
        consumePathCapacity(path,edgeState,sourceDraw);
        if(sourceEntry.kind==="generator")source.remainingKW=Math.max(0,source.remainingKW-sourceDraw);
        else source.energyKJ=Math.max(0,source.energyKJ-sourceDraw*dt/Number(source.dischargeEfficiency??1));
        suppliedKW+=delivered;remaining-=delivered;
      }
      const ratio=consumer.requiredKW===0?1:clamp(suppliedKW/consumer.requiredKW,0,1);
      consumerResults[consumer.id]={
        networkID,requiredKW:consumer.requiredKW,suppliedKW,powerRatio:ratio,
        status:ratio>=1?"RUNNING":ratio>=.8?"BROWNOUT_RUNNING":"PAUSED_POWER",
        progressMultiplier:ratio>=.8?ratio:0
      };
      results.push(consumerResults[consumer.id]);
    }

    const chargeRequests=localBatteries.filter(b=>b.maxInputKW>0&&b.energyKJ<b.capacityKJ)
      .sort((a,b)=>Number(a.chargePriority??100)-Number(b.chargePriority??100)||compareID(a,b));
    for(const battery of chargeRequests){
      let needStoredKJ=Number(battery.capacityKJ)-battery.energyKJ;
      const efficiency=Number(battery.chargeEfficiency??1);
      for(const generator of localGenerators){
        if(needStoredKJ<=1e-9)break;
        const inputCap=Number(battery.maxInputKW),generatorAvailable=generator.remainingKW;
        const path=findPath(generator.nodeID,battery.nodeID,localAdj);
        if(!path)continue;
        const sourceLimit=Math.min(generatorAvailable,inputCap/Math.max(path.factor,1e-12));
        const storedLimitKW=needStoredKJ/(dt*efficiency);
        const deliver=Math.min(sourceLimit*path.factor,storedLimitKW);
        const sourceDraw=deliver/path.factor;
        if(deliver<=1e-9)continue;
        const pathCapacity=deliveredCapacityFromPath(path,edgeState);
        const actualDeliver=Math.min(deliver,pathCapacity);
        if(actualDeliver<=1e-9)continue;
        const actualSourceDraw=actualDeliver/path.factor;
        consumePathCapacity(path,edgeState,actualSourceDraw);
        generator.remainingKW=Math.max(0,generator.remainingKW-actualSourceDraw);
        const stored=actualDeliver*dt*efficiency;
        battery.energyKJ=Math.min(Number(battery.capacityKJ),battery.energyKJ+stored);
        needStoredKJ-=stored;
      }
    }
    networkResults.push({
      networkID,nodeIDs:members,
      generatorAvailableKW:localGenerators.reduce((sum,g)=>sum+Number(g.availableKW),0),
      generatorUsedKW:localGenerators.reduce((sum,g)=>sum+Number(g.availableKW)-g.remainingKW,0),
      batteryEnergyKJ:localBatteries.reduce((sum,b)=>sum+b.energyKJ,0),
      consumers:results
    });
  }
  return {
    valid:true,errors:[],networks:networkResults,consumers:consumerResults,
    batteries:Object.fromEntries(batteries.map(b=>[b.id,{energyKJ:batteries.find(x=>x.id===b.id)?.energyKJ??b.energyKJ}]))
  };
}
