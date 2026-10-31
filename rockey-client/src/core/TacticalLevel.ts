import * as THREE from 'three';
import type { RockeyMap } from '../catalog';

type ColliderAdder=(x:number,y:number,z:number,hx:number,hy:number,hz:number)=>void;
type Breakable={root:THREE.Group;position:THREE.Vector3;radius:number;broken:boolean};

/**
 * Walkable two-storey combat structures. Every structural surface gets a matching
 * Rapier cuboid; stair treads are real collision geometry, not decorative ramps.
 */
export function addTacticalLevel(scene:THREE.Scene,map:RockeyMap,isMobile:boolean,addCollider:ColliderAdder){
  const wall=new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x786044:0x34495c,roughness:.88});
  const floor=new THREE.MeshStandardMaterial({color:0x283747,roughness:.82,metalness:.16});
  const trim=new THREE.MeshStandardMaterial({color:0x71889a,roughness:.38,metalness:.82});
  const dark=new THREE.MeshStandardMaterial({color:0x111d2b,roughness:.65,metalness:.35});
  const glass=new THREE.MeshPhysicalMaterial({color:map.light,emissive:map.light,emissiveIntensity:.16,roughness:.14,metalness:.18,transparent:true,opacity:.42});
  const glow=new THREE.MeshStandardMaterial({color:map.light,emissive:map.light,emissiveIntensity:1.65});
  const breakable:Breakable[]=[];
  const add=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,collide=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    mesh.position.set(x,y,z);mesh.castShadow=!isMobile;mesh.receiveShadow=!isMobile;parent.add(mesh);
    if(collide)addCollider(x,y,z,sx/2,sy/2,sz/2);
    return mesh;
  };
  const makeBuilding=(cx:number,cz:number,front:number)=>{
    const root=new THREE.Group();root.position.set(cx,0,cz);scene.add(root);
    const w=8.8,d=9.6,h=4.25,t=.38;
    // Ground slab and upper deck. The upper deck has a stairwell opening.
    add(root,floor,0,.0,0,w,.28,d,true);
    add(root,floor,0,4.05,1.45,w,.28,6.7,true);
    // Four walls are segmented to leave a generous central entrance and firing lanes.
    add(root,wall,-w/2+t/2,h/2,0,t,h,d,true);
    add(root,wall,w/2-t/2,h/2,0,t,h,d,true);
    add(root,wall,0,h/2,-d/2+t/2,w,h,t,true);
    add(root,wall,-2.95,h/2,d/2-t/2,2.9,h,t,true);
    add(root,wall,2.95,h/2,d/2-t/2,2.9,h,t,true);
    // Interior cross-wall leaves a doorway into a rear room.
    add(root,wall,-1.95,2.05,-.55,.32,4.1,.32,true);
    add(root,wall,1.95,2.05,-.55,.32,4.1,.32,true);
    add(root,wall,0,2.05,-2.05,4.2,4.1,.32,true);
    // Upper level parapets and an open balcony overlooking the main room.
    add(root,wall,-4.18,4.58,1.45,.28,1.0,6.7,true);
    add(root,wall,4.18,4.58,1.45,.28,1.0,6.7,true);
    add(root,wall,0,4.58,-1.75,8.2,1.0,.28,true);
    // Stair flight along the right wall; individual treads are walkable.
    const steps=13,run=4.85,rise=3.9;
    for(let i=0;i<steps;i++){
      const y=(i+1)*rise/steps;
      const z=2.35-(i+.5)*run/steps;
      add(root,i%2?trim:floor,3.05,y/2,z,1.05,y,.42,true);
      if(!isMobile&&i%3===0)add(root,trim,3.05,y+.035,z,.96,.045,.34);
    }
    // Rails and warm practical fixtures.
    add(root,trim,3.62,2.05,-.1,.08,4.1,.08);
    add(root,trim,2.48,2.05,-.1,.08,4.1,.08);
    for(const y of [2.7,4.45]){
      add(root,dark,0,y,-4.45,1.25,.24,.3);
      add(root,glow,0,y-.12,-4.27,.82,.055,.08);
    }
    // Reinforced observation windows, inset behind the exterior wall line.
    for(const side of [-1,1]){
      const win=add(root,glass,side*4.27,2.85,-1.2,.035,1.0,1.8);
      win.material=glass;
      add(root,trim,side*4.3,3.38,-1.2,.09,.08,1.95);
      add(root,trim,side*4.3,2.32,-1.2,.09,.08,1.95);
    }
    // Tactical crates and electrical cabinets are visual breakables; their
    // debris is spawned by the caller when an explosion overlaps their radius.
    for(let i=0;i<4;i++){
      const x=(i%2?1:-1)*(2.2+(i%2)*.15),z=(i<2?2.35:-2.8);
      const prop=new THREE.Group();prop.position.set(x,.62,z);root.add(prop);
      add(prop,dark,0,0,0,1.0,1.18,.92);
      add(prop,trim,0,.48,0,1.04,.08,.96);
      add(prop,glow,0,.12,-.47,.52,.055,.025);
      breakable.push({root:prop,position:new THREE.Vector3(cx+x,.62,cz+z),radius:1.15,broken:false});
    }
    // Small interior cover gives both floors usable combat positions.
    add(root,dark,-2.8,.58,-1.2,1.25,1.15,.65,true);
    add(root,dark,2.0,4.72,2.7,1.35,1.0,.7,true);
    return root;
  };
  // Buildings sit on opposite flanks, keeping the original centre lane readable.
  makeBuilding(-17.2,-1.5,1);
  makeBuilding(17.2,-1.5,-1);

  const destroyNear=(point:THREE.Vector3,radius:number,spawn:(p:THREE.Vector3,count:number,impulse:number)=>void)=>{
    let destroyed=0;
    for(const item of breakable){
      if(item.broken||item.position.distanceTo(point)>radius+item.radius)continue;
      item.broken=true;item.root.visible=false;destroyed++;
      spawn(item.position.clone(),isMobile?3:7,3.6);
    }
    return destroyed;
  };
  return {destroyNear};
}
