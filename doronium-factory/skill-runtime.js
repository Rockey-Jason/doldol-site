/* DORONIUM FACTORY — persistent 20-node Engineer specialization tree.
   Skill points come from one-time milestones; repeatable production never grants points. */
export const SKILL_POINT_CAP=15;
export const SKILL_NODES=Object.freeze([
 {id:"FIELD_SURVEYOR",group:"EXPLORATION",name:"Field Surveyor",tier:1,requires:[],effect:"스캐너 탐지 거리 +10%",description:"새로운 지형과 자원 위치를 더 넓게 탐지합니다."},
 {id:"GEOLOGICAL_READOUT",group:"EXPLORATION",name:"Geological Readout",tier:2,requires:["FIELD_SURVEYOR"],effect:"광맥 규모 범위 정밀화",description:"발견한 광맥의 규모 추정 범위를 좁혀 보여줍니다."},
 {id:"SAFE_PATHFINDER",group:"EXPLORATION",name:"Safe Pathfinder",tier:3,requires:["FIELD_SURVEYOR","GEOLOGICAL_READOUT"],effect:"위험 우회 경로 조기 표시",description:"위험 지형과 안전한 우회 경로를 더 일찍 확인합니다."},
 {id:"ARCHIVE_SPECIALIST",group:"EXPLORATION",name:"Archive Specialist",tier:4,requires:["FIELD_SURVEYOR","GEOLOGICAL_READOUT","SAFE_PATHFINDER"],effect:"Lore 단서 관계 분석",description:"수집한 기록의 연관성과 아직 발견하지 못한 단서 범주를 확인합니다."},
 {id:"STEADY_SWING",group:"EXTRACTION",name:"Steady Swing",tier:1,requires:[],effect:"도구 채굴 속도 +10%",description:"최종 채굴 속도 계산에 10% 보너스를 적용합니다."},
 {id:"VEIN_EFFICIENCY",group:"EXTRACTION",name:"Vein Efficiency",tier:2,requires:["STEADY_SWING"],effect:"부산물 확률 최대 +2%p",description:"정의된 채굴 부산물 레시피의 결정론적 확률을 최대 2%p 높입니다."},
 {id:"HARDPOINT_CALIBRATION",group:"EXTRACTION",name:"Hardpoint Calibration",tier:3,requires:["STEADY_SWING","VEIN_EFFICIENCY"],effect:"도구 내구도 소모 -10%",description:"성공한 채굴 동작에 한해 도구 내구도 소모를 줄입니다."},
 {id:"DEEP_EXTRACTION",group:"EXTRACTION",name:"Deep Extraction",tier:4,requires:["STEADY_SWING","VEIN_EFFICIENCY","HARDPOINT_CALIBRATION"],effect:"심층 위험 스캐너 강화",description:"220m 이상 구역의 위험 정보와 채굴기 정비 경고를 강화합니다."},
 {id:"PRECISE_ALIGNMENT",group:"MANUFACTURING",name:"Precise Alignment",tier:1,requires:[],effect:"정비 Condition 회복량 +10%",description:"기계 정비 또는 교정 완료 시 회복량을 높입니다."},
 {id:"RECIPE_DISCIPLINE",group:"MANUFACTURING",name:"Recipe Discipline",tier:2,requires:["PRECISE_ALIGNMENT"],effect:"허용 레시피 품질 보정 +2",description:"SkillModifier 적용이 허용된 레시피의 Quality Modifier에만 +2를 더합니다."},
 {id:"PROCESS_CONTROL",group:"MANUFACTURING",name:"Process Control",tier:3,requires:["PRECISE_ALIGNMENT","RECIPE_DISCIPLINE"],effect:"공정 센서 진단 강화",description:"센서 표시 이상을 더 일찍 감지합니다. 실제 센서값은 바꾸지 않습니다."},
 {id:"FAULT_DIAGNOSTICS",group:"MANUFACTURING",name:"Fault Diagnostics",tier:4,requires:["PRECISE_ALIGNMENT","RECIPE_DISCIPLINE","PROCESS_CONTROL"],effect:"고장 위험 원인 분석 강화",description:"고장 전 경고와 원인별 위험 분석을 개선합니다. 실패 확률을 숨기지 않습니다."},
 {id:"CONVEYOR_PLANNER",group:"LOGISTICS",name:"Conveyor Planner",tier:1,requires:[],effect:"벨트 포트 불일치 사전 경고",description:"건설 미리보기에서 벨트 연결 방향과 거리 문제를 표시합니다."},
 {id:"BUFFER_ENGINEER",group:"LOGISTICS",name:"Buffer Engineer",tier:2,requires:["CONVEYOR_PLANNER"],effect:"창고·버퍼 설치 자금 -5%",description:"새 창고 및 버퍼 시설의 산업 자금 비용만 5% 낮춥니다. 기존 시설은 소급 환급하지 않습니다."},
 {id:"BLUEPRINT_TECHNICIAN",group:"LOGISTICS",name:"Blueprint Technician",tier:3,requires:["CONVEYOR_PLANNER","BUFFER_ENGINEER"],effect:"Blueprint 저장·배치 기능 해금",description:"상대 좌표와 연결 정보를 보존하는 설계도 기능을 해금합니다."},
 {id:"FLOW_OPTIMIZATION",group:"LOGISTICS",name:"Flow Optimization",tier:4,requires:["CONVEYOR_PLANNER","BUFFER_ENGINEER","BLUEPRINT_TECHNICIAN"],effect:"상위 병목 3개 분석",description:"전력과 물류의 가장 큰 병목 세 가지를 우선 표시합니다."},
 {id:"SAMPLE_EFFICIENCY",group:"RESEARCH_DORONUM",name:"Sample Efficiency",tier:1,requires:[],effect:"허용 연구 샘플 소비량 -5%",description:"ResearchData가 샘플 절감을 허용한 연구에만 적용하며 핵심 Lore와 Infinity 재료는 줄이지 않습니다."},
 {id:"MATERIAL_ANALYST",group:"RESEARCH_DORONUM",name:"Material Analyst",tier:2,requires:["SAMPLE_EFFICIENCY"],effect:"품질·순도 기여 분석",description:"원자재와 ItemStack의 품질·순도 기여 요소를 자세히 확인합니다."},
 {id:"CRYSTAL_LATTICE",group:"RESEARCH_DORONUM",name:"Crystal Lattice",tier:3,requires:["SAMPLE_EFFICIENCY","MATERIAL_ANALYST"],effect:"결정 구조 검사 확장",description:"도로늄 변형 공정의 결정 구조 분석 정보를 확장합니다."},
 {id:"INFINITY_SAFETY",group:"RESEARCH_DORONUM",name:"Infinity Safety",tier:4,requires:["SAMPLE_EFFICIENCY","MATERIAL_ANALYST","CRYSTAL_LATTICE"],effect:"Infinity 사전 진단 강화",description:"15종×100, 품질·순도 90 이상, 비합성 입력 기준을 유지하며 사전 점검을 강화합니다."}
]);
export const SKILL_GROUPS=Object.freeze([
 {id:"EXPLORATION",name:"Exploration",label:"탐험 전문화"},
 {id:"EXTRACTION",name:"Extraction",label:"채굴 전문화"},
 {id:"MANUFACTURING",name:"Manufacturing",label:"제조 전문화"},
 {id:"LOGISTICS",name:"Logistics",label:"물류 전문화"},
 {id:"RESEARCH_DORONUM",name:"Research & Doronum",label:"연구·도로늄 전문화"}
]);
export function validateSkillTree(nodes=SKILL_NODES){
 const errors=[],ids=new Set();
 for(const node of nodes){
  if(!node?.id||ids.has(node.id))errors.push("duplicate-or-missing-skill-id:"+node?.id);
  ids.add(node.id);
  if(!Number.isInteger(node.tier)||node.tier<1||node.tier>4)errors.push("invalid-skill-tier:"+node?.id);
  if(!SKILL_GROUPS.some(group=>group.id===node.group))errors.push("invalid-skill-group:"+node?.id);
  if((node.requires||[]).length!==node.tier-1)errors.push("invalid-skill-prerequisite-count:"+node?.id);
 }
 for(const node of nodes){
  for(const dep of node.requires||[]){
   const dependency=nodes.find(item=>item.id===dep);
   if(!dependency)errors.push("missing-skill-prerequisite:"+node.id+":"+dep);
   else if(dependency.group!==node.group||dependency.tier>=node.tier)errors.push("invalid-skill-prerequisite-order:"+node.id+":"+dep);
  }
 }
 for(const group of SKILL_GROUPS){
  const members=nodes.filter(node=>node.group===group.id);
  if(members.length!==4||new Set(members.map(node=>node.tier)).size!==4||![1,2,3,4].every(tier=>members.some(node=>node.tier===tier)))errors.push("skill-group-must-have-four-tiers:"+group.id);
 }
 if(nodes.length!==20)errors.push("skill-tree-must-have-20-nodes");
 return {valid:errors.length===0,errors,nodeCount:nodes.length,groupCount:SKILL_GROUPS.length};
}
export function createSkillState(){
 return {schemaVersion:1,availablePoints:1,totalEarned:1,totalSpent:0,claimIDs:["STARTING_SKILL_POINT"],unlockedSkillIDs:[],claimHistory:[{claimID:"STARTING_SKILL_POINT",points:1}]};
}
export function normalizeSkillState(input){
 if(!input||typeof input!=="object")return createSkillState();
 const state={schemaVersion:1,availablePoints:Math.max(0,Math.floor(Number(input.availablePoints)||0)),totalEarned:Math.max(0,Math.floor(Number(input.totalEarned)||0)),totalSpent:Math.max(0,Math.floor(Number(input.totalSpent)||0)),claimIDs:Array.isArray(input.claimIDs)?[...new Set(input.claimIDs.map(String))]:[],unlockedSkillIDs:Array.isArray(input.unlockedSkillIDs)?[...new Set(input.unlockedSkillIDs.map(String))]:[],claimHistory:Array.isArray(input.claimHistory)?input.claimHistory.slice(-64):[]};
 const spent=state.unlockedSkillIDs.length;
 state.totalSpent=spent;state.availablePoints=Math.max(0,Math.min(SKILL_POINT_CAP,state.totalEarned)-spent);
 if(!state.claimIDs.length){state.claimIDs=["STARTING_SKILL_POINT"];state.totalEarned=Math.max(1,state.totalEarned);state.availablePoints=Math.max(0,Math.min(SKILL_POINT_CAP,state.totalEarned)-spent);state.claimHistory=[{claimID:"STARTING_SKILL_POINT",points:1}]}
 return state;
}
export function awardSkillPoints(state,claimID,points=1){
 const s=normalizeSkillState(state),id=String(claimID||"");
 if(!id||s.claimIDs.includes(id))return {awarded:0,reason:"DUPLICATE_OR_INVALID_CLAIM",state:s};
 const amount=Math.max(0,Math.floor(Number(points)||0)),room=Math.max(0,SKILL_POINT_CAP-s.totalEarned),awarded=Math.min(amount,room);
 if(awarded<=0)return {awarded:0,reason:"POINT_CAP_REACHED",state:s};
 s.claimIDs.push(id);s.totalEarned+=awarded;s.availablePoints=s.totalEarned-s.totalSpent;s.claimHistory.push({claimID:id,points:awarded});if(s.claimHistory.length>64)s.claimHistory.splice(0,s.claimHistory.length-64);
 return {awarded,reason:"AWARDED",state:s};
}
export function unlockSkill(state,nodeID,nodes=SKILL_NODES){
 const s=normalizeSkillState(state),node=nodes.find(item=>item.id===nodeID);
 if(!node)return {ok:false,reason:"UNKNOWN_SKILL",state:s};
 if(s.unlockedSkillIDs.includes(nodeID))return {ok:false,reason:"ALREADY_UNLOCKED",state:s};
 if(s.availablePoints<1)return {ok:false,reason:"INSUFFICIENT_POINTS",state:s};
 if(!(node.requires||[]).every(id=>s.unlockedSkillIDs.includes(id)))return {ok:false,reason:"PREREQUISITES_LOCKED",state:s};
 s.unlockedSkillIDs.push(nodeID);s.totalSpent++;s.availablePoints--;return {ok:true,reason:"UNLOCKED",state:s,node};
}
export function skillNodeStatus(state,nodeID,nodes=SKILL_NODES){
 const s=normalizeSkillState(state),node=nodes.find(item=>item.id===nodeID);
 if(!node)return "INVALID";
 if(s.unlockedSkillIDs.includes(nodeID))return "UNLOCKED";
 return (node.requires||[]).every(id=>s.unlockedSkillIDs.includes(id))&&s.availablePoints>0?"AVAILABLE":"LOCKED";
}
export function calculateSkillBonuses(state){
 const s=normalizeSkillState(state),has=id=>s.unlockedSkillIDs.includes(id);
 return {
  scannerRangeMultiplier:has("FIELD_SURVEYOR")?1.1:1,
  miningSpeedMultiplier:has("STEADY_SWING")?1.1:1,
  toolWearMultiplier:has("HARDPOINT_CALIBRATION")?.9:1,
  maintenanceRecoveryMultiplier:has("PRECISE_ALIGNMENT")?1.1:1,
  recipeQualityModifier:has("RECIPE_DISCIPLINE")?2:0,
  bufferMoneyCostMultiplier:has("BUFFER_ENGINEER")?.95:1,
  allowedResearchSampleMultiplier:has("SAMPLE_EFFICIENCY")?.95:1,
  hasMaterialAnalyst:has("MATERIAL_ANALYST"),
  hasCrystalLattice:has("CRYSTAL_LATTICE"),
  hasInfinitySafety:has("INFINITY_SAFETY")
 };
}
export function validateSkillState(state,nodes=SKILL_NODES){
 const s=normalizeSkillState(state),errors=[],ids=new Set(nodes.map(node=>node.id));
 if(s.unlockedSkillIDs.some(id=>!ids.has(id)))errors.push("unknown-unlocked-skill");
 if(new Set(s.unlockedSkillIDs).size!==s.unlockedSkillIDs.length)errors.push("duplicate-unlocked-skill");
 if(new Set(s.claimIDs).size!==s.claimIDs.length)errors.push("duplicate-skill-claim");
 if(s.totalEarned>SKILL_POINT_CAP||s.totalSpent>s.totalEarned||s.availablePoints!==s.totalEarned-s.totalSpent)errors.push("skill-point-ledger-mismatch");
 for(const id of s.unlockedSkillIDs){const node=nodes.find(item=>item.id===id);if(node&&!(node.requires||[]).every(dep=>s.unlockedSkillIDs.includes(dep)))errors.push("unmet-unlocked-skill-prerequisite:"+id)}
 return {valid:errors.length===0,errors,availablePoints:s.availablePoints,totalEarned:s.totalEarned,totalSpent:s.totalSpent,unlockedCount:s.unlockedSkillIDs.length};
}
