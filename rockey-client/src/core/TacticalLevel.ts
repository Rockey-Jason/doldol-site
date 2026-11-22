import * as THREE from 'three';
import type { RockeyMap } from '../catalog';

type ColliderAdder=(x:number,y:number,z:number,hx:number,hy:number,hz:number,rotationX?:number)=>void;
type RaycastAdder=(mesh:THREE.Object3D)=>void;
type Breakable={root:THREE.Object3D;position:THREE.Vector3;radius:number;shards:number;kind:'glass'|'light'|'prop';broken:boolean};

/**
 * Walkable tactical complex with a ground-floor office, storage rooms, upper
 * galleries, rooftop access and a connected sublevel service corridor.
 */
export function addTacticalLevel(scene:THREE.Scene,map:RockeyMap,isMobile:boolean,addCollider:ColliderAdder,addRaycast?:RaycastAdder,addGroundRaycast?:RaycastAdder){
  const wall=new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x786044:0x34495c,roughness:.88});
  const floor=new THREE.MeshStandardMaterial({color:0x283747,roughness:.82,metalness:.16});
  const trim=new THREE.MeshStandardMaterial({color:0x71889a,roughness:.38,metalness:.82});
  const dark=new THREE.MeshStandardMaterial({color:0x111d2b,roughness:.65,metalness:.35});
  const glass=new THREE.MeshPhysicalMaterial({color:map.light,emissive:map.light,emissiveIntensity:.16,roughness:.14,metalness:.18,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
  const glow=new THREE.MeshStandardMaterial({color:map.light,emissive:map.light,emissiveIntensity:1.65});
  const fabric=new THREE.MeshStandardMaterial({color:0x4b5a69,roughness:.95});
  const paper=new THREE.MeshStandardMaterial({color:0xc7c4b7,roughness:.96});
  const breakable:Breakable[]=[];
  const register=(root:THREE.Object3D,position:THREE.Vector3,radius:number,shards=6,kind:'glass'|'light'|'prop'='prop')=>{
    root.traverse(object=>{if(object instanceof THREE.PointLight)object.userData.baseIntensity=object.intensity;});
    breakable.push({root,position:position.clone(),radius,shards,kind,broken:false});
  };
  const add=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,collide=false)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    mesh.position.set(x,y,z);mesh.castShadow=!isMobile;mesh.receiveShadow=!isMobile;parent.add(mesh);
    if(collide){parent.updateWorldMatrix(true,false);const worldPoint=parent.localToWorld(new THREE.Vector3(x,y,z));addCollider(worldPoint.x,worldPoint.y,worldPoint.z,sx/2,sy/2,sz/2);}
    if(mat===floor)addGroundRaycast?.(mesh);
    if(collide||mat===wall||mat===glass)addRaycast?.(mesh);
    return mesh;
  };
  const point=(root:THREE.Object3D,x:number,y:number,z:number)=>new THREE.Vector3(root.position.x+x,root.position.y+y,root.position.z+z);

  // One continuous, walkable collider sits below the decorative stair treads.
  // The player capsule is 0.68 m wide and 1.72 m tall, so each ramp is kept
  // wider than 1.3 m and within the character controller's 45-degree slope.
  const addRamp=(root:THREE.Group,mat:THREE.Material,x:number,y:number,z:number,width:number,run:number,rise:number)=>{
    const angle=Math.atan2(rise,run);
    const length=Math.hypot(run,rise);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,.14,length),mat);
    mesh.position.set(x,y,z);mesh.rotation.x=angle;
    mesh.castShadow=!isMobile;mesh.receiveShadow=!isMobile;root.add(mesh);
    addRaycast?.(mesh);
    addGroundRaycast?.(mesh);
    root.updateWorldMatrix(true,false);
    const worldPoint=root.localToWorld(new THREE.Vector3(x,y,z));
    addCollider(worldPoint.x,worldPoint.y,worldPoint.z,width/2,.07,length/2,angle);
  };
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
    // Keep a 3.8 m clear shaft through the ground slab for the wide basement ramp.
    // The previous 1.4 m gap was narrower than the 2.9 m ramp and trapped the player.
    add(root,floor,-2.5,-.02,0,2.5,.28,d,true);
    add(root,floor,2.5,-.02,0,2.5,.28,d,true);
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
    // Align the ground-floor entrance with the stair centerline in both mirrored buildings.
    const innerSide=front>0?1:-1;
    const stairX=innerSide*3.05;
    const entranceHalfWidth=1.3;
    const entranceLeft=stairX-entranceHalfWidth;
    const entranceRight=stairX+entranceHalfWidth;
    const entranceWallMin=-w/2,entranceWallMax=w/2;
    add(root,wall,(entranceWallMin+entranceLeft)/2,h/2,d/2-t/2,entranceLeft-entranceWallMin,h,t,true);
    add(root,wall,(entranceRight+entranceWallMax)/2,h/2,d/2-t/2,entranceWallMax-entranceRight,h,t,true);
    add(root,wall,-1.95,2.05,-.55,.32,4.1,.32,true);
    add(root,wall,1.95,2.05,-.55,.32,4.1,.32,true);
    // A broad doorway replaces the old full-width partition.
    add(root,wall,-1.65,2.05,-2.05,1.5,4.1,.32,true);
    add(root,wall,1.65,2.05,-2.05,1.5,4.1,.32,true);
    add(root,wall,0,3.62,-2.05,1.2,.95,.32,true);

    // Mirror the usable layout so each building's inner side faces the skybridge.
    const officeSide=-innerSide;

    // Keep the office furniture on the outer side and clear the full stair approach.
    makeFurniture(root,officeSide*2.75,.0,1.65,'desk');
    makeFurniture(root,officeSide*2.8,0,2.95,'chair');
    makeFurniture(root,officeSide*3.2,0,-2.35,'cabinet');
    add(root,dark,officeSide*2.75,1.45,1.65,1.9,.08,1.05);
    add(root,trim,officeSide*2.75,2.14,1.65,1.9,.055,1.05);
    for(let i=0;i<3;i++){
      add(root,wall,officeSide*(3.7-i*.72),1.25,-.1,.045,2.35,.045);
    }
    // Storage racks now sit outside the stair flight and its landing.
    // Move the entrance-side storage rack away from the player approach lane.
    makeFurniture(root,officeSide*2.2,0,3.5,'rack');
    makeFurniture(root,innerSide*2.2,0,-3.5,'rack');
    makeFurniture(root,.25,0,-3.0,'desk');
    makeFurniture(root,-1.15,0,3.0,'crate');

    // Cut the gallery slab around the complete inclined stair footprint, not just
    // a narrow center slot. The previous x-slabs overlapped the ramp by up to 0.5 m,
    // creating an invisible ceiling/floor collision before the second-floor landing.
    const galleryFloorMin=-w/2,galleryFloorMax=w/2;
    const stairClearHalfWidth=1.3;
    const stairClearLeft=stairX-stairClearHalfWidth;
    const stairClearRight=stairX+stairClearHalfWidth;
    const galleryLeftWidth=stairClearLeft-galleryFloorMin;
    const galleryRightWidth=galleryFloorMax-stairClearRight;
    if(galleryLeftWidth>.2)add(root,floor,(galleryFloorMin+stairClearLeft)/2,4.05,1.45,galleryLeftWidth,.28,6.7,true);
    if(galleryRightWidth>.2)add(root,floor,(stairClearRight+galleryFloorMax)/2,4.05,1.45,galleryRightWidth,.28,6.7,true);
    // A broad landing overlaps the ramp nose and keeps a continuous collision-safe path
    // through the second-floor doorway, including the character controller's 0.34 m radius.
    add(root,floor,stairX,4.05,-1.55,3.2,.28,1.4,true);

    // Preserve the outer guardrail. Open the inner wall directly onto the skybridge.
    const outerSide=-innerSide;
    add(root,wall,outerSide*4.18,4.58,1.45,.28,1.0,6.7,true);
    // Keep the bridge-side portal at least 1.8 m clear for the full player capsule.
    add(root,wall,innerSide*4.55,4.58,-1.45,.28,1.0,.9,true);
    add(root,wall,innerSide*4.55,4.58,2.9,.28,1.0,3.8,true);

    // The stair-aligned doorway replaces the old continuous wall across the gallery.
    const galleryDoorCenter=stairX;
    const wallMin=-w/2,wallMax=w/2,doorHalfWidth=1.3;
    const galleryDoorLeft=galleryDoorCenter-doorHalfWidth;
    const galleryDoorRight=galleryDoorCenter+doorHalfWidth;
    add(root,wall,(wallMin+galleryDoorLeft)/2,4.58,-1.75,galleryDoorLeft-wallMin,1.0,.28,true);
    add(root,wall,(galleryDoorRight+wallMax)/2,4.58,-1.75,wallMax-galleryDoorRight,1.0,.28,true);

    const steps=13,run=4.2,rise=4.07;
    // Match the ramp's walking surface exactly to the ground (0.12 m) and
    // gallery (4.19 m) floor tops, removing lips at both connections.
    const rampAngle=Math.atan2(rise,run);
    const rampCenterY=(.12+4.19)/2-.07*Math.cos(rampAngle);
    addRamp(root,floor,stairX,rampCenterY,.25,1.9,run,rise);
    for(let i=0;i<steps;i++){
      const y=(i+1)*rise/steps,z=2.35-(i+.5)*run/steps;
      add(root,i%2?trim:floor,stairX,y/2,z,1.05,y,.42,false);
    }
    add(root,trim,innerSide*3.62,2.05,-.1,.08,4.1,.08);
    add(root,trim,innerSide*2.48,2.05,-.1,.08,4.1,.08);
    makeFurniture(root,officeSide*2.7,4.2,2.65,'crate');
    makeFurniture(root,officeSide*2.55,4.2,-.8,'cabinet');

    // Roof access stairs rise from the gallery to an exposed rooftop combat deck.
    // Roof landing is 1.80 m above the gallery. Match both ends exactly so
    // the ramp does not finish below the rooftop slab and leave a climbable lip.
    const roofRise=1.8,roofRun=3.01,roofAngle=Math.atan2(roofRise,roofRun);
    const roofRampCenterY=(4.19+5.99)/2-.07*Math.cos(roofAngle);
    addRamp(root,floor,0,roofRampCenterY,1.245,1.4,roofRun,roofRise);
    for(let i=0;i<8;i++){
      const y=4.28+i*.19,z=2.75-i*.43;
      add(root,i%2?trim:floor,0,y,z,1.18,.20,.48,false);
    }
    // Split the roof deck around the stairwell so the final steps are not sealed under the slab.
    add(root,floor,0,5.85,-.25,2.2,.28,1.1,true);
    add(root,floor,-2.85,5.85,0,2.65,.28,9.15,true);
    add(root,floor,2.85,5.85,0,2.65,.28,9.15,true);
    add(root,floor,0,5.85,-2.5375,1.65,.28,4.075,true);
    add(root,floor,0,5.85,3.7875,1.65,.28,1.575,true);
    for(const side of [-1,1]){
      add(root,wall,side*4.02,6.28,0,.22,.72,8.9,true);
      add(root,wall,0,6.28,side*4.43,8.1,.72,.22,true);
      add(root,trim,side*4.02,6.66,0,.28,.07,8.9);
      add(root,trim,0,6.66,side*4.43,8.1,.07,.28);
      // Guardrails protect the roof opening while keeping a 2.5 m stair lane clear.
      add(root,wall,side*1.2,6.28,1.25,.12,.72,3.5,true);
      add(root,trim,side*1.2,6.66,1.25,.16,.07,3.5);
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
      register(lightRoot,point(root,0,3.65,z),1.0,5,'light');
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
      if(side===innerSide){
        // An open portal joins the basement service room to the underpass.
        // Side-wall sections end before the 2.9 m underpass doorway.
        add(root,wall,side*4.12,-1.45,-3.7,.22,2.65,2.25,true);
        add(root,wall,side*4.12,-1.45,3.7,.22,2.65,2.25,true);
      }else{
        add(root,wall,side*4.12,-1.45,-2.85,.22,2.65,3.1,true);
        add(root,wall,side*4.12,-1.45,2.85,.22,2.65,3.1,true);
      }
      // No low sill collider here: the side portal must stay clear at player capsule height.
    }
    add(root,wall,0,-1.45,-4.38,8.2,2.65,.22,true);
    add(root,wall,0,-1.45,4.38,8.2,2.65,.22,true);
    // Match the basement ramp from the basement floor top (-2.64 m)
    // to the ground-floor top (0.12 m), including the full 2.9 m opening.
    const basementRise=-2.76,basementAngle=Math.atan2(basementRise,4.5);
    const basementCenterY=(-2.64+.12)/2-.07*Math.cos(basementAngle);
    addRamp(root,floor,0,basementCenterY,0,2.9,4.5,basementRise);
    for(let i=0;i<13;i++){
      const stepHeight=2.76/13;
      const stepY=.12-(i+.5)*stepHeight;
      const stepZ=2.25-(i+.5)*4.5/13;
      add(root,i%2?trim:floor,0,stepY,stepZ,1.45,stepHeight,.42,false);
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

  // Elevated enclosed skybridge connects both second-floor entry portals.
  const bridge=new THREE.Group();bridge.position.set(0,0,-1.5);scene.add(bridge);
  add(bridge,floor,0,4.05,0,25.6,.28,2.5,true);
  // Extra headroom prevents the standing capsule and controller skin from snagging the roof.
  add(bridge,wall,0,7.05,0,25.6,.2,2.5,true);
  for(const side of [-1,1]){
    add(bridge,trim,0,4.92,side*1.24,25.6,1.48,.12,true);
    for(let x=-11.75;x<=11.76;x+=2.15){
      const panel=new THREE.Group();panel.position.set(x,4.94,side*1.17);bridge.add(panel);
      add(panel,glass,0,0,0,1.92,1.18,.045,true);
      add(panel,trim,0,.63,0,1.98,.055,.085);
      add(panel,trim,0,-.63,0,1.98,.055,.085);
      register(panel,point(bridge,x,4.94,side*1.17),1.45,8,'glass');
    }
    for(let x=-12.1;x<=12.11;x+=2.15){
      add(bridge,trim,x,4.94,side*1.24,.095,1.5,.15,true);
      add(bridge,glow,x,5.69,side*1.24,.10,.035,.17);
    }
    // Structural columns transfer the elevated span into the arena floor.
    for(const x of [-8,0,8])add(bridge,dark,x,2.0,side*.98,.16,4.0,.16,true);
  }
  for(let x=-10;x<=10;x+=4){
    const fixture=new THREE.Group();fixture.position.set(x,6.68,0);bridge.add(fixture);
    add(fixture,dark,0,0,0,.68,.13,.36);
    add(fixture,glow,0,-.09,0,.54,.035,.25);
    const light=new THREE.PointLight(map.light,isMobile?2.5:5,6,2);light.position.set(0,-.18,0);fixture.add(light);
  }

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
  // Roof slab is also the arena floor above the tunnel. Its underside is
  // at -0.28 m, leaving 2.36 m clear above the service floor for the 1.72 m capsule.
  add(underpass,wall,0,-.14,0,25.6,.28,2.6,true);
  const underpassLamp=new THREE.PointLight(map.light,isMobile?7:13,26,2);
  underpassLamp.position.set(0,-.45,0);underpass.add(underpassLamp);

  const destroyNear=(position:THREE.Vector3,radius:number,spawn:(p:THREE.Vector3,count:number,impulse:number,kind:'glass'|'light'|'prop')=>void)=>{
    let destroyed=0;
    for(const item of breakable){
      if(item.broken||item.position.distanceTo(position)>radius+item.radius)continue;
      item.broken=true;
      item.root.visible=false;
      destroyed++;
      spawn(item.position.clone(),isMobile?Math.max(3,Math.round(item.shards*.55)):item.shards,3.6,item.kind);
    }
    return destroyed;
  };
  const resetDestruction=()=>{
    for(const item of breakable){
      item.broken=false;item.root.visible=true;
      item.root.traverse(object=>{
        if(object instanceof THREE.PointLight&&typeof object.userData.baseIntensity==='number')object.intensity=object.userData.baseIntensity;
      });
    }
  };
  return {destroyNear,resetDestruction};
}
