import type { RockeyCover } from './catalog.js';
import { isBlockedByCover } from './world-navigation.js';

export type RobotKind = 'SENTRY' | 'GUARDIAN' | 'SCOUT';
export type RobotMode = 'PATROL' | 'ENGAGING' | 'DESTROYED';
export interface RobotState {
  id:string; name:string; type:RobotKind; isRobot:true; team:number;
  x:number; y:number; z:number; yaw:number; pitch:number;
  health:number; maxHealth:number; alive:boolean; connected:boolean; state:RobotMode;
  lastFireAt:number; patrolPoints:Array<{x:number;z:number}>; patrolIndex:number;
}
export interface RobotTarget {
  id:string; x:number; y:number; z:number; alive:boolean; connected:boolean;
}
export interface RobotAttack { robot:RobotState; target:RobotTarget; damage:number; }

export const ROBOT_PROFILES:Record<RobotKind,{
  maxHealth:number; moveSpeed:number; detectRange:number; attackRange:number;
  fireInterval:number; damage:number; patrol:boolean;
}> = {
  SENTRY:{maxHealth:210,moveSpeed:0,detectRange:24,attackRange:22,fireInterval:900,damage:8,patrol:false},
  GUARDIAN:{maxHealth:520,moveSpeed:.72,detectRange:20,attackRange:17,fireInterval:1120,damage:13,patrol:true},
  SCOUT:{maxHealth:145,moveSpeed:2.25,detectRange:17,attackRange:14,fireInterval:620,damage:7,patrol:true}
};

const SPAWN_GRID:number[][]=[];
for(const z of [-24,-20,-16,16,20,24]){
  for(const x of [-24,-20,-16,16,20,24])SPAWN_GRID.push([x,z]);
}

/** Six deterministic, collision-checked ground-level robots on every map. */
export function createRobotRoster(cover:readonly RockeyCover[]):RobotState[]{
  const selected:Array<{x:number;z:number}>=[];
  for(const [x,z] of SPAWN_GRID){
    if(isBlockedByCover(cover,x,.92,z,.46,.86))continue;
    if(selected.some(p=>Math.hypot(p.x-x,p.z-z)<5.2))continue;
    selected.push({x,z});
    if(selected.length===6)break;
  }
  if(selected.length!==6)throw new Error('Map has fewer than six safe robot spawn locations');
  const kinds:RobotKind[]=['SENTRY','GUARDIAN','SCOUT','SENTRY','GUARDIAN','SCOUT'];
  const numbers:Record<RobotKind,number>={SENTRY:0,GUARDIAN:0,SCOUT:0};
  return kinds.map((type,index)=>{
    const profile=ROBOT_PROFILES[type],number=++numbers[type],spawn=selected[index];
    const patrolPoints=[
      {x:spawn.x-1.25,z:spawn.z-1.25},{x:spawn.x+1.25,z:spawn.z-1.25},
      {x:spawn.x+1.25,z:spawn.z+1.25},{x:spawn.x-1.25,z:spawn.z+1.25}
    ].filter(point=>!isBlockedByCover(cover,point.x,.92,point.z,.46,.86));
    return {
      id:'robot-'+type.toLowerCase()+'-'+number,
      name:type+'-'+String(number).padStart(2,'0'),
      type,isRobot:true as const,team:-1,
      x:spawn.x,y:.92,z:spawn.z,yaw:Math.atan2(-spawn.x,-spawn.z),pitch:0,
      health:profile.maxHealth,maxHealth:profile.maxHealth,alive:true,connected:true,
      state:'PATROL' as RobotMode,lastFireAt:0,patrolPoints,patrolIndex:0
    };
  });
}

function wrapAngle(value:number):number{
  return Math.atan2(Math.sin(value),Math.cos(value));
}

function segmentHitsCover(
  ax:number,ay:number,az:number,bx:number,by:number,bz:number,box:RockeyCover
):boolean{
  const dx=bx-ax,dy=by-ay,dz=bz-az;
  let min=0,max=1;
  const axes=[
    {origin:ax,direction:dx,low:box.x-box.hx,high:box.x+box.hx},
    {origin:ay,direction:dy,low:box.bottom??0,high:box.top},
    {origin:az,direction:dz,low:box.z-box.hz,high:box.z+box.hz}
  ];
  for(const axis of axes){
    if(Math.abs(axis.direction)<1e-7){
      if(axis.origin<axis.low||axis.origin>axis.high)return false;
      continue;
    }
    let a=(axis.low-axis.origin)/axis.direction,b=(axis.high-axis.origin)/axis.direction;
    if(a>b)[a,b]=[b,a];
    min=Math.max(min,a);max=Math.min(max,b);
    if(max<min)return false;
  }
  return max>.015&&min<.985&&max>=min;
}

/** Returns true only when target is inside the robot's forward view and unobstructed. */
export function canRobotSee(robot:RobotState,target:RobotTarget,cover:readonly RockeyCover[]):boolean{
  if(!robot.alive||!target.alive||!target.connected)return false;
  const dx=target.x-robot.x,dz=target.z-robot.z;
  const distance=Math.hypot(dx,dz);
  const profile=ROBOT_PROFILES[robot.type];
  if(distance<1.2||distance>profile.detectRange||Math.abs(target.y-robot.y)>2.0)return false;
  const targetYaw=Math.atan2(-dx,-dz);
  if(Math.abs(wrapAngle(targetYaw-robot.yaw))>1.02)return false;
  const ax=robot.x,ay=robot.y+1.28,az=robot.z;
  const bx=target.x,by=target.y+1.02,bz=target.z;
  return !cover.some(box=>segmentHitsCover(ax,ay,az,bx,by,bz,box));
}

function moveRobot(robot:RobotState,angle:number,delta:number,cover:readonly RockeyCover[]):boolean{
  const profile=ROBOT_PROFILES[robot.type];
  if(profile.moveSpeed<=0)return false;
  const step=profile.moveSpeed*delta;
  const offsets=[0,.48,-.48,.96,-.96,1.55,-1.55,Math.PI];
  for(const offset of offsets){
    const heading=angle+offset;
    const nx=robot.x-Math.sin(heading)*step;
    const nz=robot.z-Math.cos(heading)*step;
    if(isBlockedByCover(cover,nx,.92,nz,.46,.86))continue;
    robot.x=nx;robot.z=nz;robot.yaw=heading;
    return true;
  }
  return false;
}

/** Authoritative 20 Hz AI: patrol, acquire visible players, pursue and fire. */
export function updateRobotAI(
  robots:RobotState[],players:readonly RobotTarget[],cover:readonly RockeyCover[],delta:number,now:number
):RobotAttack[]{
  const attacks:RobotAttack[]=[];
  for(const robot of robots){
    if(!robot.alive)continue;
    const profile=ROBOT_PROFILES[robot.type];
    let target:RobotTarget|null=null,best=Infinity;
    for(const player of players){
      if(!player.alive||!player.connected)continue;
      const distance=Math.hypot(player.x-robot.x,player.z-robot.z);
      if(distance>=best||distance>profile.detectRange)continue;
      if(canRobotSee(robot,player,cover)){target=player;best=distance;}
    }
    if(target){
      const dx=target.x-robot.x,dz=target.z-robot.z;
      const desiredYaw=Math.atan2(-dx,-dz);
      robot.yaw=desiredYaw;robot.state='ENGAGING';
      if(profile.moveSpeed>0&&best>profile.attackRange*.72)moveRobot(robot,desiredYaw,delta,cover);
      if(best<=profile.attackRange&&now-robot.lastFireAt>=profile.fireInterval&&canRobotSee(robot,target,cover)){
        robot.lastFireAt=now;
        const vertical=target.y+1.02-(robot.y+1.28);
        robot.pitch=Math.atan2(vertical,Math.max(.1,best));
        attacks.push({robot,target,damage:profile.damage});
      }
      continue;
    }
    if(robot.state!=='DESTROYED')robot.state='PATROL';
    if(profile.patrol&&robot.patrolPoints.length){
      let waypoint=robot.patrolPoints[robot.patrolIndex%robot.patrolPoints.length];
      let dx=waypoint.x-robot.x,dz=waypoint.z-robot.z;
      if(Math.hypot(dx,dz)<.45){
        robot.patrolIndex=(robot.patrolIndex+1)%robot.patrolPoints.length;
        waypoint=robot.patrolPoints[robot.patrolIndex];
        dx=waypoint.x-robot.x;dz=waypoint.z-robot.z;
      }
      const heading=Math.atan2(-dx,-dz);
      moveRobot(robot,heading,delta,cover);
    }
  }
  return attacks;
}
