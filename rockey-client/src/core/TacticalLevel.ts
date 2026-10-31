import * as THREE from 'three';
import type { RockeyMap } from '../catalog';

type ColliderAdder=(x:number,y:number,z:number,hx:number,hy:number,hz:number)=>void;
type Breakable={root:THREE.Object3D;position:THREE.Vector3;radius:number;shards:number;broken:boolean};

/**
 * Walkable tactical complex with a ground-floor office, storage rooms, upper
 * galleries, rooftop access and a connected sublevel service corridor.
 */
export function addTacticalLevel(scene:THREE.Scene,map:RockeyMap,isMobile:boolean,addCollider:ColliderAdder){
  const wall=new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x786044:0x34495c,roughness:.88});
  const floor=new THREE.MeshStandardMaterial({color:0x283747,roughness:.82,metalness:.16});
  const trim=new THREE.MeshStandardMaterial({color:0x71889a,roughness:.38,metalness:.82});
  const dark=new THREE.MeshStandardMaterial({color:0x111d2b,roughness:.65,metalness:.35});
  const glass=new THREE.MeshPhysicalMaterial({color:map.light,emissive:map.light,emissiveIntensity:.16,roughness:.14,metalness:.18,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
  const glow=new THREE.MeshStandardMaterial({color:map.light,emissive:map.light,emissiveIntensity:1.65});
  const fabric=new THREE.MeshStandardMaterial({color:0x4b5a69,roughness:.95});
  const paper=new THREE.MeshStandardMaterial({color:0xc7c4b7,roughness:.96});
  const breakable:Breakable[]=[];
  const register=(root:THREE.Object3D,position:THREE.Vector3,radius:number,shards=6)=>{
    breakable.push({root,position:position.clone(),radius,shards,broken:false});
  };
  const add=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,collide=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    mesh.position.set(x,y,z);mesh.castShadow=!isMobile;mesh.receiveShadow=!isMobile;parent.add(mesh);
    if(collide){parent.updateWorldMatrix(true,false);const worldPoint=parent.localToWorld(new THREE.Vector3(x,y,z));addCollider(worldPoint.x,worldPoint.y,worldPoint.z,sx/2,sy/2,sz/2);}
    return mesh;
  };
  const point=(root:THREE.Object3D,x:number,y:number,z:number)=>new THREE.Vector3(root.position.x+x,root.position.y+y,root.position.z+z);
  const makeFurniture=(root:THREE.Group,x:number,y:number,z:number,kind:'desk'|'rack'|'cabinet'|'chair'|'crate')=>{
    const prop=new THREE.Group();prop.position.set(x,y,z);root.add(prop);
    if(kind==='desk'){
      add(prop,dark,0,.62,0,1.65,.12,.78);
      for(const sx of [-.68,.68])add(prop,trim,sx,.29,0,.09,.58,.66,true);
      add(prop,fabric,0,.70,-.12,.8,.035,.38);
      const screen=new THREE.Group();screen.position.set(-.25,.84,-.2);prop.add(screen);
      add(screen,dark,0,.18,0,.42,.27,.055);
      add(screen,glow,0,.18,-.031,.34,.19,.012);
      add(screen,trim,0,.015,0,.08,.035,.09);
      add(prop,trim,.30,.735,.17,.20,.025,.13);
      add(prop,paper,.32,.76,.16,.14,.008,.10);
    }else if(kind==='rack'){
      for(const sx of [-.72,.72])add(prop,trim,sx,.92,0,.07,1.84,.07,true);
      for(const sy of [.22,.83,1.45])add(prop,trim,0,sy,0,1.5,.07,.72,true);
      for(let i=0;i<3;i++){
        const boxGroup=new THREE.Group();boxGroup.position.set((i-1)*.42,.34+(i%2)*.58,-.08);prop.add(boxGroup);
        add(boxGroup,fabric,0,.14,0,.34,.28,.36);
        add(boxGroup,trim,0,.29,0,.34,.025,.36);
      }
    }else if(kind==='cabinet'){
      add(prop,dark,0,.76,0,.68,1.52,.62);
      for(const sy of [.38,.78,1.18]){
        add(prop,trim,0,sy,-.33,.54,.055,.025);
        add(prop,glow,.20,sy,-.36,.06,.035,.02);
      }
      add(prop,trim,-.26,.76,-.335,.035,1.25,.018);
    }else if(kind==='chair'){
      add(prop,dark,0,.48,0,.48,.10,.48);
      add(prop,fabric,0,.86,.18,.48,.68,.12);
      add(prop,trim,0,.13,0,.08,.26,.08,true);
      for(const sx of [-.19,.19])add(prop,trim,sx,.28,0,.045,.36,.045);
    }else{
      add(prop,dark,0,.42,0,.72,.84,.72);
      add(prop,trim,0,.84,0,.76,.07,.76);
      add(prop,glow,0,.40,-.375,.36,.055,.018);
      add(prop,trim,-.23,.58,-.38,.08,.08,.02);
    }
    register(prop,point(root,x,y+.65,z),kind==='desk'?1.2:kind==='rack'?1.35:.95,kind==='rack'?10:6);
    return prop;
  };

  const makeBuilding=(cx:number,cz:number,front:number)=>{
    const root=new THREE.Group();root.position.set(cx,0,cz);scene.add(root);
    const w=8.8,d=9.6,h=4.25,t=.38;
    // The central stairwell opening connects ground level to the service sublevel.
    add(root,floor,-2.55,-.02,0,3.7,.28,d,true);
    add(root,floor,2.55,-.02,0,3.7,.28,d,true);
    add(root,floor,0,-.02,-3.25,1.4,.28,2.1,true);
    add(root,floor,0,-.02,3.25,1.4,.28,2.1,true);
    // First-floor walling leaves the entrance and internal cross-passage open.
    if(front>0){
      add(root,wall,-w/2+t/2,h/2,0,t,h,d,true);
      add(root,wall,w/2-t/2,h/2,-3.35,t,h,2.9,true);
      add(root,wall,w/2-t/2,h/2,3.35,t,h,2.9,true);
    }else{
      add(root,wall,w/2-t/2,h/2,0,t,h,d,true);
      add(root,wall,-w/2+t/2,h/2,-3.35,t,h,2.9,true);
      add(root,wall,-w/2+t/2,h/2,3.35,t,h,2.9,true);
    }
    add(root,wall,0,h/2,-d/2+t/2,w,h,t,true);
    add(root,wall,-2.95,h/2,d/2-t/2,2.9,h,t,true);
    add(root,wall,2.95,h/2,d/2-t/2,2.9,h,t,true);
    add(root,wall,-1.95,2.05,-.55,.32,4.1,.32,true);
    add(root,wall,1.95,2.05,-.55,.32,4.1,.32,true);
    // A broad doorway replaces the old full-width partition.
    add(root,wall,-1.35,2.05,-2.05,1.5,4.1,.32,true);
    add(root,wall,1.35,2.05,-2.05,1.5,4.1,.32,true);
    add(root,wall,0,3.62,-2.05,1.2,.95,.32,true);

    // A furnished office occupies one side of the lower level.
    makeFurniture(root,-2.75,.0,1.65,'desk');
    makeFurniture(root,-2.8,0,2.95,'chair');
    makeFurniture(root,-3.2,0,-2.35,'cabinet');
    add(root,dark,-2.75,1.45,1.65,1.9,.08,1.05);
    add(root,trim,-2.75,2.14,1.65,1.9,.055,1.05);
    for(let i=0;i<3;i++){
      add(root,wall,-3.7+i*.72,1.25,-.1,.045,2.35,.045);
    }
    // Storage room: tall racks, stacked supply cases and a service bench.
    makeFurniture(root,2.85,0,1.25,'rack');
    makeFurniture(root,2.85,0,-1.15,'rack');
    makeFurniture(root,2.85,0,-3.0,'cabinet');
    makeFurniture(root,.25,0,-3.0,'desk');
    makeFurniture(root,-1.15,0,3.0,'crate');

    // Upper gallery, stair flight and protected firing positions.
    add(root,floor,-.9,4.05,1.45,6.8,.28,6.7,true);
    add(root,floor,4.05,4.05,1.45,.7,.28,6.7,true);
    add(root,wall,-4.18,4.58,1.45,.28,1.0,6.7,true);
    add(root,wall,4.18,4.58,1.45,.28,1.0,6.7,true);
    add(root,wall,0,4.58,-1.75,8.2,1.0,.28,true);
    const steps=13,run=4.85,rise=3.9;
    for(let i=0;i<steps;i++){
      const y=(i+1)*rise/steps,z=2.35-(i+.5)*run/steps;
      add(root,i%2?trim:floor,3.05,y/2,z,1.05,y,.42,true);
    }
    add(root,trim,3.62,2.05,-.1,.08,4.1,.08);
    add(root,trim,2.48,2.05,-.1,.08,4.1,.08);
    makeFurniture(root,-2.7,4.2,2.65,'crate');
    makeFurniture(root,2.55,4.2,-.8,'cabinet');

    // Roof access stairs rise from the gallery to an exposed rooftop combat deck.
    for(let i=0;i<8;i++){
      const y=4.28+i*.19,z=2.75-i*.43;
      add(root,i%2?trim:floor,0,y,z,1.18,.20,.48,true);
    }
    add(root,floor,0,5.85,0,8.35,.28,9.15,true);
    for(const side of [-1,1]){
      add(root,wall,side*4.02,6.28,0,.22,.72,8.9,true);
      add(root,wall,0,6.28,side*4.43,8.1,.72,.22,true);
      add(root,trim,side*4.02,6.66,0,.28,.07,8.9);
      add(root,trim,0,6.66,side*4.43,8.1,.07,.28);
    }
    add(root,dark,-2.65,6.10,-1.2,1.3,.48,1.0,true);
    add(root,glow,-2.65,6.37,-1.2,1.1,.035,.8);
    for(let i=0;i<4;i++)add(root,trim,1.6+i*.5,5.99,2.65,.26,.16,.5,true);

    // Reinforced glass is registered as a destructible object, not merely a decal.
    for(const side of [-1,1]){
      const windowRoot=new THREE.Group();windowRoot.position.set(side*4.27,2.85,-1.2);root.add(windowRoot);
      const pane=add(windowRoot,glass,0,0,0,.035,1.0,1.8);
      add(windowRoot,trim,0,.53,0,.09,.08,1.95);
      add(windowRoot,trim,0,-.53,0,.09,.08,1.95);
      add(windowRoot,trim,0,0,-.95,.09,1.0,.08);
      add(windowRoot,trim,0,0,.95,.09,1.0,.08);
      register(windowRoot,point(root,side*4.27,2.85,-1.2),1.25,8);
      pane.material=glass;
    }

    // Ceiling fixtures and emergency lights are breakable; their light source
    // is removed together with the fitting when a blast reaches it.
    for(const z of [-2.7,1.8]){
      const lightRoot=new THREE.Group();lightRoot.position.set(0,3.65,z);root.add(lightRoot);
      add(lightRoot,dark,0,0,0,1.25,.16,.32);
      add(lightRoot,glow,0,-.10,0,1.08,.045,.23);
      const lamp=new THREE.PointLight(map.light,isMobile?4:8,7,2);lightRoot.add(lamp);
      register(lightRoot,point(root,0,3.65,z),1.0,5);
    }

    // Electrical cabinets and industrial supply crates.
    for(let i=0;i<3;i++){
      const prop=new THREE.Group();prop.position.set((i-1)*1.25,.62,-3.5);root.add(prop);
      add(prop,dark,0,0,0,.95,1.18,.92);
      add(prop,trim,0,.48,0,.99,.08,.96);
      add(prop,glow,0,.12,-.47,.52,.055,.025);
      register(prop,point(root,(i-1)*1.25,.62,-3.5),1.05,8);
    }

    // A reachable service sublevel; the two building basements meet the link tunnel.
    add(root,floor,0,-2.78,0,8.2,.28,8.9,true);
    for(const side of [-1,1]){
      add(root,wall,side*4.12,-1.45,-2.85,.22,2.65,3.1,true);
      add(root,wall,side*4.12,-1.45,2.85,.22,2.65,3.1,true);
      add(root,wall,side*4.12,-.18,0,.22,.35,1.7,true);
    }
    add(root,wall,0,-1.45,-4.38,8.2,2.65,.22,true);
    add(root,wall,0,-1.45,4.38,8.2,2.65,.22,true);
    for(let i=0;i<13;i++){
      const riseDown=(i+1)*2.45/13,stepZ=2.25-(i+.5)*4.5/13;
      add(root,i%2?trim:floor,0,-riseDown/2,stepZ,1.45,riseDown,.42,true);
    }
    add(root,wall,-2.8,-1.35,-2.75,.18,2.5,3.0,true);
    add(root,wall,2.8,-1.35,-2.75,.18,2.5,3.0,true);
    add(root,wall,-2.8,-1.35,2.75,.18,2.5,3.0,true);
    add(root,wall,2.8,-1.35,2.75,.18,2.5,3.0,true);
    makeFurniture(root,-2.9,-2.78,1.9,'rack');
    makeFurniture(root,2.9,-2.78,1.9,'cabinet');
    const basementLamp=new THREE.PointLight(map.light,isMobile?5:11,11,2);
    basementLamp.position.set(0,-.7,-2.8);root.add(basementLamp);

    const exteriorBeacon=new THREE.Group();exteriorBeacon.position.set(front*4.15,2.0,0);root.add(exteriorBeacon);
    add(exteriorBeacon,dark,0,0,0,.16,1.2,.16);
    add(exteriorBeacon,glow,0,.2,-.10,.08,.24,.035);
    register(exteriorBeacon,point(root,front*4.15,2,0),.8,4);
    return root;
  };

  makeBuilding(-17.2,-1.5,1);
  makeBuilding(17.2,-1.5,-1);

  // Enclosed underpass joins both basement rooms beneath the original combat lane.
  const underpass=new THREE.Group();underpass.position.set(0,0,-1.5);scene.add(underpass);
  add(underpass,floor,0,-2.78,0,25.6,.28,2.75,true);
  for(const side of [-1,1]){
    add(underpass,wall,0,-1.42,side*1.34,25.6,2.55,.18,true);
    add(underpass,trim,0,-.13,side*1.34,25.6,.10,.22);
    for(let x=-11;x<=11;x+=2.75){
      add(underpass,glow,x,-.34,side*1.20,.42,.045,.035);
    }
  }
  add(underpass,wall,0,-.10,0,25.6,.18,2.6,true);
  const underpassLamp=new THREE.PointLight(map.light,isMobile?7:13,26,2);
  underpassLamp.position.set(0,-.45,0);underpass.add(underpassLamp);

  const destroyNear=(position:THREE.Vector3,radius:number,spawn:(p:THREE.Vector3,count:number,impulse:number)=>void)=>{
    let destroyed=0;
    for(const item of breakable){
      if(item.broken||item.position.distanceTo(position)>radius+item.radius)continue;
      item.broken=true;
      item.root.visible=false;
      destroyed++;
      spawn(item.position.clone(),isMobile?Math.max(3,Math.round(item.shards*.55)):item.shards,3.6);
    }
    return destroyed;
  };
  return {destroyNear};
}
