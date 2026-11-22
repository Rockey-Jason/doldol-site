export interface DebrisBodyState {
  id:string;x:number;y:number;z:number;vx:number;vy:number;vz:number;
  rx:number;ry:number;rz:number;wx:number;wy:number;wz:number;size:number;sleeping:boolean;
}
export interface DebrisCover {x:number;z:number;hx:number;hz:number;top:number;bottom?:number;}
export function seededRandom(seed:string){
  let state=Array.from(seed).reduce((value,char)=>(Math.imul(value^char.charCodeAt(0),16777619)>>>0),2166136261);
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}
export function createAuthoritativeDebris(eventId:string,x:number,y:number,z:number,radius:number,count=12):DebrisBodyState[]{
  const random=seededRandom(eventId);
  return Array.from({length:Math.max(1,Math.min(32,count))},(_,index)=>{
    const angle=random()*Math.PI*2,speed=2.2+random()*radius*.55;
    const size=.12+random()*.2;
    return {id:eventId+':fragment:'+index,x:x+(random()-.5)*.8,y:y+random()*.5,z:z+(random()-.5)*.8,
      vx:Math.cos(angle)*speed,vy:2.4+random()*speed*.55,vz:Math.sin(angle)*speed,
      rx:random()*Math.PI,ry:random()*Math.PI,rz:random()*Math.PI,
      wx:(random()-.5)*12,wy:(random()-.5)*12,wz:(random()-.5)*12,size,sleeping:false};
  });
}
export function stepAuthoritativeDebris(
  bodies:DebrisBodyState[],delta:number,cover:readonly DebrisCover[],
  floorAt:(x:number,z:number,y:number)=>number
):DebrisBodyState[]{
  const dt=Math.max(0,Math.min(.05,delta));
  for(const body of bodies){
    if(body.sleeping)continue;
    body.vy-=18*dt;
    body.x+=body.vx*dt;body.y+=body.vy*dt;body.z+=body.vz*dt;
    body.rx+=body.wx*dt;body.ry+=body.wy*dt;body.rz+=body.wz*dt;
    const floor=floorAt(body.x,body.z,body.y)+body.size*.5;
    if(body.y<floor){
      body.y=floor;
      if(Math.abs(body.vy)<.9){body.vy=0;body.vx*=.72;body.vz*=.72;body.wx*=.55;body.wy*=.55;body.wz*=.55;}
      else body.vy=Math.abs(body.vy)*.24;
      body.vx*=.84;body.vz*=.84;
    }
    for(const wall of cover){
      const inside=body.x+body.size*.5>wall.x-wall.hx&&body.x-body.size*.5<wall.x+wall.hx&&
        body.z+body.size*.5>wall.z-wall.hz&&body.z-body.size*.5<wall.z+wall.hz&&
        body.y+body.size*.5>(wall.bottom??0)&&body.y-body.size*.5<wall.top;
      if(!inside)continue;
      const dx=Math.min(Math.abs(body.x-(wall.x-wall.hx)),Math.abs((wall.x+wall.hx)-body.x));
      const dz=Math.min(Math.abs(body.z-(wall.z-wall.hz)),Math.abs((wall.z+wall.hz)-body.z));
      if(dx<dz){body.x+=body.x<wall.x?-body.size*.55:body.size*.55;body.vx*=-.28;}
      else{body.z+=body.z<wall.z?-body.size*.55:body.size*.55;body.vz*=-.28;}
      body.vy*=.82;
    }
    if(Math.hypot(body.vx,body.vy,body.vz)<.16&&Math.hypot(body.wx,body.wy,body.wz)<.35){body.sleeping=true;body.vx=body.vy=body.vz=body.wx=body.wy=body.wz=0;}
  }
  return bodies;
}
