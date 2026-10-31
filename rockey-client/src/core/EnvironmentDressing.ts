import * as THREE from 'three';
import type { RockeyMap } from '../catalog';

type ColliderAdder = (x:number,y:number,z:number,hx:number,hy:number,hz:number) => void;

/**
 * Static art pass for the five ROCKEY arenas. Decorative meshes are deliberately
 * kept separate from the combat cover meshes so their detail never changes aim
 * raycasts or the dimensions of existing cover.
 */
export function addRockeyEnvironment(
  scene: THREE.Scene,
  map: RockeyMap,
  isMobile: boolean,
  addCollider?: ColliderAdder
): void {
  const accentColor = map.palette === 'amber' ? 0xffb85c :
    map.palette === 'magenta' ? 0xff72d8 :
    map.palette === 'ice' ? 0x9cecff :
    map.palette === 'cyan' ? 0x5df4f2 : 0x68bdff;
  const concrete = new THREE.MeshStandardMaterial({ color: map.palette === 'amber' ? 0x796044 : map.palette === 'magenta' ? 0x42334e : 0x33485c, roughness:.9, metalness:.08 });
  const concreteLight = new THREE.MeshStandardMaterial({ color: map.palette === 'amber' ? 0xb18b5e : map.palette === 'ice' ? 0x9ab7c5 : 0x637b8c, roughness:.82, metalness:.12 });
  const dark = new THREE.MeshStandardMaterial({ color:0x111d2b, roughness:.62, metalness:.42 });
  const metal = new THREE.MeshStandardMaterial({ color:0x64798b, roughness:.34, metalness:.86 });
  const rubber = new THREE.MeshStandardMaterial({ color:0x202b35, roughness:.94, metalness:.02 });
  const hazard = new THREE.MeshStandardMaterial({ color:map.palette==='amber'?0xe5ad54:0xd3e5ee, roughness:.62, metalness:.22 });
  const accent = new THREE.MeshStandardMaterial({ color:accentColor, emissive:accentColor, emissiveIntensity:1.2, roughness:.26, metalness:.35 });
  const glass = new THREE.MeshPhysicalMaterial({ color:map.palette==='magenta'?0x5e315e:0x173c55, emissive:accentColor, emissiveIntensity:.18, roughness:.16, metalness:.28, transparent:true, opacity:.72 });
  const randState = (map.id.split('').reduce((n,c)=>((n*33)^c.charCodeAt(0))>>>0,2166136261) || 1);
  let seed = randState;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const addBox = (parent:THREE.Object3D, material:THREE.Material, x:number,y:number,z:number,sx:number,sy:number,sz:number, rx=0,ry=0,rz=0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
    mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,rz);
    mesh.castShadow = sx>.35 && sy>.35 && sz>.35 && !isMobile;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  };
  const addCylinder = (parent:THREE.Object3D, material:THREE.Material, x:number,y:number,z:number,r:number,h:number, rx=0,ry=0,rz=0, segments=12) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);
    mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=false;parent.add(mesh);return mesh;
  };
  const addLine = (parent:THREE.Object3D, points:THREE.Vector3[], color:number, opacity=.7, radius=.018) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(10,points.length*5),radius,5,false),
      new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.35,transparent:opacity<1,opacity}));
    mesh.castShadow=false;parent.add(mesh);return mesh;
  };

  // Four modular industrial facades turn the arena perimeter into a believable
  // built space: reinforced columns, observation windows, service units, vents,
  // cable trays and practical light fixtures.
  const facade = (x:number,z:number,yaw:number,index:number) => {
    const group = new THREE.Group();group.position.set(x,0,z);group.rotation.y=yaw;
    const width = 7.2 + (index%2)*.5;
    addBox(group,concrete,0,2.42,0,width,4.84,.18);
    addBox(group,concreteLight,0,4.78,.13,width,.12,.12);
    addBox(group,dark,0,.28,.13,width,.34,.13);
    for(const side of [-1,1]){
      addBox(group,metal,side*(width/2-.11),2.42,.17,.22,4.8,.26);
      addBox(group,dark,side*(width/2-.38),2.35,.17,.12,3.9,.24);
      for(let rivet=0;rivet<(isMobile?2:5);rivet++)addCylinder(group,hazard,side*(width/2-.11),.72+rivet*.82,.315,.035,.025,Math.PI/2,0,0,8);
    }
    // Observation window with deep inset and a double frame.
    addBox(group,dark,-.34,2.95,.16,2.7,1.36,.12);
    addBox(group,glass,-.34,2.95,.235,2.42,1.08,.035);
    addBox(group,metal,-.34,3.66,.25,2.84,.09,.09);
    addBox(group,metal,-.34,2.24,.25,2.84,.09,.09);
    addBox(group,metal,-1.72,2.95,.25,.09,1.5,.09);
    addBox(group,metal,1.04,2.95,.25,.09,1.5,.09);
    addBox(group,accent,-.34,2.95,.278,.035,1.06,.018);
    addBox(group,concreteLight,-.34,1.82,.18,2.95,.16,.16);
    // Ventilation grille and a service/AC box.
    addBox(group,dark,2.2,3.05,.2,1.28,.92,.24);
    addBox(group,metal,2.2,3.05,.335,1.18,.08,.045);
    for(let slat=0;slat<(isMobile?3:5);slat++)addBox(group,metal,1.73+slat*.235,3.05,.36,.035,.62,.025);
    addCylinder(group,dark,2.2,3.05,.39,.22,.055,Math.PI/2,0,0,16);
    addCylinder(group,accent,2.2,3.05,.435,.035,.065,Math.PI/2,0,0,10);
    addBox(group,concreteLight,-2.05,1.2,.2,1.18,.76,.34);
    addBox(group,dark,-2.05,1.2,.385,.94,.53,.035);
    for(let vent=0;vent<(isMobile?2:4);vent++)addBox(group,metal,-2.39+vent*.23,1.2,.414,.055,.42,.025);
    // Utility lamp housing and the luminous diffuser are geometry, not a flat decal.
    addBox(group,dark,0,4.35,.27,1.15,.2,.42);
    addBox(group,accent,0,4.23,.31,.86,.055,.24);
    addBox(group,metal,0,4.49,.27,1.22,.055,.45);
    // Wall conduit and compact junction box.
    addBox(group,dark,-2.9,2.0,.2,.42,.62,.3);
    addBox(group,accent,-2.9,2.12,.37,.19,.045,.025);
    addLine(group,[new THREE.Vector3(-2.75,1.66,.37),new THREE.Vector3(-2.75,1.28,.37),new THREE.Vector3(-2.35,1.04,.37),new THREE.Vector3(-2.35,.64,.37)],0x263d50,.95,.035);
    // Small warning plates and fasteners.
    addBox(group,hazard,2.88,1.02,.24,.48,.15,.055,0,0,-.12);
    for(let bolt=0;bolt<(isMobile?2:4);bolt++)addCylinder(group,metal,-.65+bolt*.2,1.35,.28,.026,.025,Math.PI/2,0,0,8);
    scene.add(group);
  };

  const panels = isMobile ? [-14.3,14.3] : [-21.5,-7.2,7.2,21.5];
  // Face each facade toward the arena interior rather than the exterior wall.
  panels.forEach((x,i)=>facade(x,-29.26,Math.PI,i));
  panels.forEach((x,i)=>facade(x,29.26,0,i+4));
  panels.forEach((z,i)=>facade(-29.26,z,-Math.PI/2,i+8));
  panels.forEach((z,i)=>facade(29.26,z,Math.PI/2,i+12));

  // Continuous overhead cable runs and corner drops. The curves are fixed to
  // the perimeter so the main combat lanes remain visually open.
  const cableColor = map.palette==='amber'?0x4b3827:0x24313f;
  addLine(scene,[new THREE.Vector3(-25.5,5.35,-27.2),new THREE.Vector3(-9,5.8,-27.2),new THREE.Vector3(9,5.8,-27.2),new THREE.Vector3(25.5,5.35,-27.2)],cableColor,.95,.045);
  addLine(scene,[new THREE.Vector3(-25.5,5.35,27.2),new THREE.Vector3(-9,5.8,27.2),new THREE.Vector3(9,5.8,27.2),new THREE.Vector3(25.5,5.35,27.2)],cableColor,.95,.045);
  addLine(scene,[new THREE.Vector3(-27.2,5.35,-24),new THREE.Vector3(-27.2,5.8,0),new THREE.Vector3(-27.2,5.35,24)],cableColor,.9,.04);
  addLine(scene,[new THREE.Vector3(27.2,5.35,-24),new THREE.Vector3(27.2,5.8,0),new THREE.Vector3(27.2,5.35,24)],cableColor,.9,.04);
  for(const [x,z] of [[-25,-25],[25,-25],[-25,25],[25,25]] as const){
    addCylinder(scene,metal,x,2.6,z,.065,5.2);
    addBox(scene,dark,x,5.18,z,.34,.28,.34);
    addBox(scene,accent,x,5.18,z,.21,.07,.21);
    addBox(scene,metal,x,5.42,z,.5,.08,.5);
  }

  // Functional-looking utility pylons, floodlights and conduit brackets.
  const lampPositions = [[-17,-23],[17,-23],[-17,23],[17,23],[-24,0],[24,0]] as const;
  for(let i=0;i<lampPositions.length;i++){
    if(isMobile && i>=4)continue;
    const [x,z]=lampPositions[i];
    addCylinder(scene,dark,x,2.7,z,.16,5.35);
    addCylinder(scene,metal,x,4.95,z,.22,.18);
    addBox(scene,dark,x,5.28,z,.82,.28,.62);
    addBox(scene,accent,x,5.11,z,.66,.065,.4);
    addBox(scene,metal,x,5.44,z,.9,.07,.68);
    addBox(scene,hazard,x-.32,5.27,z-.335,.09,.22,.035);
    addBox(scene,hazard,x+.32,5.27,z-.335,.09,.22,.035);
  }

  // Floor maintenance detail: recessed drains, service plates, expansion seams,
  // impact scorches, concrete cracks and scattered aggregate.
  const floorMetal = new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x5f4c36:0x344b5e,metalness:.82,roughness:.58});
  const floorDark = new THREE.MeshStandardMaterial({color:0x202a32,metalness:.08,roughness:.98,transparent:true,opacity:.72});
  const floorSpots = isMobile ? 12 : 26;
  for(let i=0;i<floorSpots;i++){
    const x=-23+random()*46,z=-23+random()*46;
    if(Math.abs(x)<5 && Math.abs(z)<5)continue;
    const size=.65+random()*1.35;
    const group=new THREE.Group();group.position.set(x,.022,z);group.rotation.y=random()*Math.PI;
    addBox(group,floorDark,0,0,0,size,.012,.045,0,0,random()*.035);
    addBox(group,floorDark,0,0,0,.045,.012,size,0,0,random()*.035);
    scene.add(group);
  }
  for(const [x,z] of [[-19,-15],[19,15],[-21,17],[21,-17],[-4,22],[4,-22]] as const){
    addBox(scene,floorMetal,x,.028,z,1.35,.035,.86);
    addBox(scene,dark,x,.052,z,.98,.012,.55);
    for(let i=0;i<7;i++)addBox(scene,metal,x-.42+i*.14,.068,z,.035,.018,.48);
    for(const side of [-1,1])addCylinder(scene,hazard,x+side*.56,.07,z,.032,.018,0,0,0,8);
  }
  // Jagged cracks are thin line geometry on the floor and never enter raycasts.
  const crackCount=isMobile?5:11;
  for(let i=0;i<crackCount;i++){
    const x=-21+random()*42,z=-21+random()*42;
    const length=.7+random()*1.7,angle=random()*Math.PI*2;
    const points=[new THREE.Vector3(x,.035,z),
      new THREE.Vector3(x+Math.cos(angle)*length*.42,.035,z+Math.sin(angle)*length*.42),
      new THREE.Vector3(x+Math.cos(angle)*length*.72+Math.sin(angle)*.18,.035,z+Math.sin(angle)*length*.72-Math.cos(angle)*.18),
      new THREE.Vector3(x+Math.cos(angle)*length,.035,z+Math.sin(angle)*length)];
    const crack=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:map.palette==='amber'?0x59432c:0x263947,transparent:true,opacity:.75}));
    scene.add(crack);
  }

  // Reinforced supply crates with independent slats, corner guards, handles and
  // status lights. Four fixed corner stations avoid the spawn and central lanes.
  const cratePositions=[[-23,-22],[23,-22],[-23,22],[23,22]] as const;
  const crateBody = new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x775637:map.palette==='ice'?0x527183:0x304b68,roughness:.72,metalness:.34});
  const crateTop = new THREE.MeshStandardMaterial({color:map.palette==='amber'?0xb48a4f:0x526f88,roughness:.68,metalness:.42});
  const buildCrate=(x:number,z:number,scale=1,stack=false)=>{
    const group=new THREE.Group();group.position.set(x,0,z);
    const w=1.42*scale,h=.94*scale,d=1.12*scale;
    addBox(group,crateBody,0,h/2,0,w,h,d);
    addBox(group,crateTop,0,h+.035,0,w*1.03,.08,d*1.03);
    addBox(group,dark,0,h*.54,-d/2-.018,w*.72,.42*scale,.045);
    for(let side of [-1,1]){
      addBox(group,metal,side*(w/2-.075),h/2,-d/2-.045,.11,h*.93,.09);
      addBox(group,metal,side*(w/2-.075),h/2,d/2+.045,.11,h*.93,.09);
      addBox(group,hazard,side*(w/2-.14),h+.09,0,.08,.055,d*.76);
      addBox(group,dark,side*(w/2+.012),h*.52,0,.055,.28*scale,.32*scale);
    }
    for(let slat=0;slat<4;slat++)addBox(group,crateTop,0,h*.2+slat*.17*scale,-d/2-.055,w*.56,.045*scale,.035);
    addBox(group,accent,0,h*.66,-d/2-.085,.22*scale,.07*scale,.025);
    addBox(group,dark,0,h*.66,-d/2-.105,.12*scale,.025*scale,.018);
    for(let bolt=0;bolt<(isMobile?2:4);bolt++)addCylinder(group,metal,(bolt%2?1:-1)*(w/2-.16),bolt<2?.13*scale:h-.13*scale,-d/2-.07,.028*scale,.025*scale,Math.PI/2,0,0,8);
    scene.add(group);
    if(!stack)addCollider?.(x,h/2,z,w/2+.04,h/2+.02,d/2+.04);
    return group;
  };
  cratePositions.forEach(([x,z],i)=>{
    buildCrate(x,z,1,false);
    if(!isMobile && (i===1||i===2))buildCrate(x+(i===1?-.6:.6),z+(i===1?.55:-.55),.72,true);
  });

  // Themed silhouettes add identity without changing the gameplay geometry.
  if(map.palette==='amber'){
    // Weathered relay masts and fractured canyon slabs.
    for(const [x,z,rot] of [[-20,0,.12],[20,0,-.12],[-4,-24,.3],[4,24,-.3]] as const){
      const shard=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),concreteLight);
      shard.position.set(x,.72,z);shard.scale.set(.75,1.35,.45);shard.rotation.set(.12,rot,.2);shard.castShadow=!isMobile;scene.add(shard);
      addBox(scene,dark,x,1.55,z,.18,.1,.18);
      addBox(scene,accent,x,1.68,z,.12,.08,.12);
    }
  }else if(map.palette==='ice'){
    for(const [x,z] of [[-22,-4],[22,4],[-20,18],[20,-18]] as const){
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.9,0),new THREE.MeshPhysicalMaterial({color:0x9cecff,roughness:.13,metalness:.2,transparent:true,opacity:.78}));
      crystal.position.set(x,.72,z);crystal.scale.set(.55,1.35,.52);crystal.rotation.z=.16;crystal.castShadow=!isMobile;scene.add(crystal);
      addBox(scene,glass,x,.17,z,.95,.14,.8);
    }
  }else if(map.palette==='cyan'){
    for(const [x,z] of [[-21,-12],[21,12],[-21,12],[21,-12]] as const){
      addBox(scene,dark,x,.92,z,1.55,1.84,1.45);
      addBox(scene,metal,x,.92,z-.74,1.35,1.58,.055);
      for(let band=0;band<3;band++)addBox(scene,accent,x-.55+band*.55,.92,z-.79,.035,1.2,.025);
      addBox(scene,hazard,x,.2,z-.8,.54,.12,.04);
    }
  }else if(map.palette==='magenta'){
    for(const [x,z] of [[-22,-13],[22,13],[-22,13],[22,-13]] as const){
      addBox(scene,dark,x,2.1,z,1.5,4.2,.45);
      addBox(scene,accent,x,3.35,z-.245,1.2,.12,.045);
      addBox(scene,glass,x,2.15,z-.25,1.16,1.9,.04);
      addBox(scene,hazard,x,1.05,z-.29,.72,.06,.025);
    }
  }else{
    // Training facility gets low observation kiosks and lane markers.
    for(const [x,z] of [[-21,-14],[21,14],[-21,14],[21,-14]] as const){
      addBox(scene,concrete,x,.8,z,1.8,1.6,1.35);
      addBox(scene,dark,x,1.25,z-.7,1.5,.48,.045);
      addBox(scene,accent,x,1.25,z-.74,.88,.045,.02);
      addBox(scene,hazard,x,.15,z-.72,.72,.1,.045);
    }
  }

  // Short surface pipes and bundled conduits at cover-adjacent perimeter points.
  const conduitPoints=[[-24,-13],[-24,13],[24,-13],[24,13]] as const;
  for(const [x,z] of conduitPoints){
    addCylinder(scene,metal,x,.12,z,.075,2.4,0,0,Math.PI/2,12);
    addCylinder(scene,dark,x,.18,z+.28,.12,.2,Math.PI/2,0,0,12);
    addBox(scene,hazard,x,.22,z-.72,.42,.055,.08);
  }

  // A handful of broken slabs and rubble pieces make the floor read as used,
  // not as a clean training grid. Keep the count conservative on touch devices.
  const rubbleCount=isMobile?10:24;
  const rubbleMat=new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x8b704e:0x536777,roughness:.96,metalness:.03});
  for(let i=0;i<rubbleCount;i++){
    const x=-22+random()*44,z=-22+random()*44;
    if(Math.abs(x)<4 && Math.abs(z)<4)continue;
    const size=.08+random()*.22;
    const rock=new THREE.Mesh(new THREE.TetrahedronGeometry(size,0),rubbleMat);
    rock.position.set(x,size*.55+.025,z);rock.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);
    rock.scale.set(.8+random()*.8,.55+random()*.65,.8+random()*.8);rock.castShadow=false;scene.add(rock);
  }

  // Keep the glass, trim and service lights visually distinct per map.
  // All created objects are static and are disposed by Game.dispose scene traversal.
}
