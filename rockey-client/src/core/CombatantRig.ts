import * as THREE from 'three';

export interface CombatantRig {
  group: THREE.Group;
  animate: (movement:number, time:number, action?:number, recoil?:number) => void;
}

function addSegment(parent:THREE.Object3D,start:THREE.Vector3,end:THREE.Vector3,radius:number,material:THREE.Material):THREE.Mesh{
  const direction=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.025,direction.length()-radius*2),4,8),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

/** Articulated tactical operator with layered armour, webbing, gloves and segmented limbs. */
export function createCombatantRig(baseColor:number, accentColor:number):CombatantRig{
  const group=new THREE.Group();
  const fabric=new THREE.MeshStandardMaterial({color:baseColor,roughness:.84,metalness:.08});
  const armor=new THREE.MeshPhysicalMaterial({color:0x26394d,roughness:.34,metalness:.58,clearcoat:.32,clearcoatRoughness:.3});
  const dark=new THREE.MeshStandardMaterial({color:0x101923,roughness:.72,metalness:.38});
  const rubber=new THREE.MeshStandardMaterial({color:0x1b252e,roughness:.96,metalness:.02});
  const glove=new THREE.MeshStandardMaterial({color:0x26313a,roughness:.92,metalness:.02});
  const accent=new THREE.MeshStandardMaterial({color:accentColor,emissive:accentColor,emissiveIntensity:.72,roughness:.32,metalness:.34});
  const lens=new THREE.MeshPhysicalMaterial({color:accentColor,emissive:accentColor,emissiveIntensity:.32,roughness:.12,metalness:.18,clearcoat:1});
  const skin=new THREE.MeshStandardMaterial({color:0x9a795f,roughness:.9,metalness:0});
  const addBox=(parent:THREE.Object3D,geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const addSphere=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const addCylinder=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,r:number,h:number,rx=0,ry=0,rz=0)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
    mesh.castShadow=true;parent.add(mesh);return mesh;
  };

  // Core silhouette: flexible undersuit beneath a separate armoured carrier.
  const torso=new THREE.Group();group.add(torso);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.285,.53,5,12),fabric);
  body.position.y=.02;body.castShadow=true;body.receiveShadow=true;torso.add(body);
  const pelvis=addBox(torso,new THREE.BoxGeometry(.5,.25,.31),dark,0,-.34,0);
  addBox(torso,new THREE.BoxGeometry(.58,.46,.22),armor,0,.02,-.175);
  addBox(torso,new THREE.BoxGeometry(.42,.3,.055),dark,0,.015,-.3);
  addBox(torso,new THREE.BoxGeometry(.25,.055,.026),accent,0,.19,-.335);
  addBox(torso,new THREE.BoxGeometry(.12,.12,.045),lens,0,-.075,-.338);
  // Molle webbing, three magazine pouches, side utility pouches and buckle.
  addBox(torso,new THREE.BoxGeometry(.045,.46,.035),dark,-.19,.04,-.31,0,0,.18);
  addBox(torso,new THREE.BoxGeometry(.045,.46,.035),dark,.19,.04,-.31,0,0,-.18);
  for(let i=0;i<3;i++){
    const x=-.17+i*.17;
    addBox(torso,new THREE.BoxGeometry(.12,.18,.105),dark,x,-.12,-.34);
    addBox(torso,new THREE.BoxGeometry(.1,.035,.026),metalMaterial(),x,-.055,-.402);
    addBox(torso,new THREE.BoxGeometry(.08,.026,.025),accent,x,-.16,-.402);
  }
  for(const side of [-1,1]){
    addBox(torso,new THREE.BoxGeometry(.13,.2,.15),armor,side*.31,-.12,-.01,0,0,side*.12);
    addBox(torso,new THREE.BoxGeometry(.15,.11,.16),dark,side*.29,-.34,-.02);
    addBox(torso,new THREE.BoxGeometry(.09,.045,.025),accent,side*.29,-.34,-.11);
  }
  addBox(torso,new THREE.BoxGeometry(.16,.12,.045),metal,0,-.34,-.19);
  addBox(torso,new THREE.BoxGeometry(.09,.055,.025),accent,0,-.34,-.22);

  // Neck and helmet system: cheek guards, visor, optics, headset and mic boom.
  addCylinder(torso,dark,0,.43,0,.105,.18);
  const head=new THREE.Group();head.position.set(0,.66,-.005);torso.add(head);
  addSphere(head,skin,0,0,0,.19,.23,.18);
  addSphere(head,dark,0,-.115,-.045,.16,.09,.15);
  addSphere(head,armor,0,.105,.015,.235,.17,.225);
  addBox(head,new THREE.BoxGeometry(.37,.055,.26),dark,0,.205,.015);
  addBox(head,new THREE.BoxGeometry(.34,.035,.29),accent,0,.17,-.01);
  addBox(head,new THREE.BoxGeometry(.36,.11,.035),lens,0,.025,-.197);
  addBox(head,new THREE.BoxGeometry(.26,.035,.035),dark,0,-.055,-.203);
  for(const side of [-1,1]){
    addCylinder(head,armor,side*.222,-.015,0,.09,.095,0,0,Math.PI/2);
    addCylinder(head,accent,side*.275,-.015,0,.045,.035,0,0,Math.PI/2);
    addBox(head,dark,side*.12,.255,.04,.1,.055,.24,0,0,side*.24);
  }
  addSegment(head,new THREE.Vector3(.14,-.11,-.13),new THREE.Vector3(.2,-.18,-.2),.018,dark);
  addSphere(head,accent,.2,-.18,-.2,.026,.026,.026);
  // Helmet mount, rear battery and a small side rail.
  addBox(head,metal,new THREE.BoxGeometry(.12,.035,.12),0,.31,-.015);
  addBox(head,dark,new THREE.BoxGeometry(.1,.11,.16),0,.03,.205);
  addBox(head,metal,new THREE.BoxGeometry(.035,.12,.04),-.245,.02,-.015);

  // Backpack, radio, antenna, shoulder straps and hydration tube.
  const pack=addBox(group,new THREE.BoxGeometry(.38,.52,.2),dark,0,.06,.245);
  addBox(group,new THREE.BoxGeometry(.3,.17,.08),armor,0,.25,.37);
  for(const side of [-1,1]){
    addBox(group,new THREE.BoxGeometry(.13,.22,.1),dark,side*.12,-.05,.38);
    addBox(group,new THREE.BoxGeometry(.05,.36,.05),accent,side*.17,.06,.18,0,0,side*.14);
  }
  addBox(group,new THREE.BoxGeometry(.13,.2,.12),armor,-.28,.18,.12);
  addCylinder(group,metal,-.28,.34,.12,.018,.42);
  addSegment(group,new THREE.Vector3(.18,.2,.16),new THREE.Vector3(.25,.02,.1),.018,rubber);
  addSegment(group,new THREE.Vector3(.25,.02,.1),new THREE.Vector3(.24,-.16,.02),.018,rubber);

  // Articulated arms. Each hand has a palm, a thumb and individually modelled
  // two-link fingers, so the reload/weapon pose can bend the elbows and fingers.
  const arms:Array<{shoulder:THREE.Group;elbow:THREE.Group;fingers:THREE.Group[];side:number}>=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.34,.27,-.005);torso.add(shoulder);
    addSphere(shoulder,armor,0,-.015,0,.18,.17,.17);
    addBox(shoulder,new THREE.BoxGeometry(.29,.16,.29),armor,side*.01,-.04,-.015,0,0,side*.12);
    addSegment(shoulder,new THREE.Vector3(0,-.08,0),new THREE.Vector3(side*.015,-.34,-.015),.105,fabric);
    addBox(shoulder,new THREE.BoxGeometry(.19,.28,.2),armor,side*.015,-.22,-.02,0,0,side*.06);
    const elbow=new THREE.Group();elbow.position.set(side*.015,-.35,-.018);shoulder.add(elbow);
    addSphere(elbow,dark,0,0,0,.105,.105,.105);
    addBox(elbow,new THREE.BoxGeometry(.18,.14,.18),armor,0,-.01,-.025);
    addSegment(elbow,new THREE.Vector3(0,-.04,0),new THREE.Vector3(side*.015,-.29,-.035),.088,fabric);
    addBox(elbow,new THREE.BoxGeometry(.19,.26,.15),armor,side*.012,-.17,-.045,0,0,side*.04);
    addCylinder(elbow,metal,side*.012,-.3,-.045,.095,.045,0,0,0);
    const hand=new THREE.Group();hand.position.set(side*.015,-.34,-.055);elbow.add(hand);
    addBox(hand,new THREE.BoxGeometry(.135,.13,.16),glove,0,-.025,-.035);
    addBox(hand,new THREE.BoxGeometry(.11,.035,.04),dark,0,.045,-.055);
    const fingers:THREE.Group[]=[];
    for(let finger=0;finger<4;finger++){
      const pivot=new THREE.Group();pivot.position.set(-.048+finger*.032,-.07,-.09);hand.add(pivot);
      addSegment(pivot,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.065,-.008),.018,glove);
      const tip=new THREE.Group();tip.position.set(0,-.064,-.008);pivot.add(tip);
      addSegment(tip,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.044,-.012),.015,glove);
      addSphere(tip,dark,0,-.045,-.014,.016,.013,.016);
      fingers.push(pivot);
    }
    const thumb=new THREE.Group();thumb.position.set(side*.075,-.02,-.04);hand.add(thumb);
    addSegment(thumb,new THREE.Vector3(0,0,0),new THREE.Vector3(-side*.04,-.05,-.045),.023,glove);
    addSegment(thumb,new THREE.Vector3(-side*.04,-.05,-.045),new THREE.Vector3(-side*.06,-.085,-.075),.018,glove);
    arms.push({shoulder,elbow,fingers,side});
  }

  // Articulated legs with layered knee guards, shin plates, straps and boots.
  const legs:Array<{hip:THREE.Group;knee:THREE.Group;side:number}>=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group();hip.position.set(side*.17,-.39,0);group.add(hip);
    addSegment(hip,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.31,0),.12,fabric);
    addBox(hip,new THREE.BoxGeometry(.23,.29,.24),armor,0,-.16,-.01);
    addBox(hip,new THREE.BoxGeometry(.19,.16,.05),dark,0,-.13,-.14);
    addBox(hip,new THREE.BoxGeometry(.12,.055,.025),accent,0,-.13,-.17);
    const knee=new THREE.Group();knee.position.set(0,-.32,-.005);hip.add(knee);
    addSphere(knee,dark,0,0,0,.125,.12,.12);
    addBox(knee,new THREE.BoxGeometry(.22,.18,.09),armor,0,-.01,-.075);
    addBox(knee,new THREE.BoxGeometry(.12,.045,.025),accent,0,-.01,-.13);
    addSegment(knee,new THREE.Vector3(0,-.04,0),new THREE.Vector3(0,-.29,-.025),.095,fabric);
    addBox(knee,new THREE.BoxGeometry(.2,.27,.12),armor,0,-.17,-.065);
    addBox(knee,new THREE.BoxGeometry(.19,.045,.035),dark,0,-.09,-.13);
    addBox(knee,new THREE.BoxGeometry(.2,.17,.3),rubber,0,-.34,-.09);
    addBox(knee,new THREE.BoxGeometry(.19,.07,.12),dark,0,-.35,-.23);
    addBox(knee,new THREE.BoxGeometry(.12,.035,.035),accent,0,-.28,-.153);
    legs.push({hip,knee,side});
  }

  // Cable routing and small kit details on the carrier make the silhouette less
  // like a stack of primitives and more like a properly equipped operator.
  addBox(torso,new THREE.BoxGeometry(.24,.07,.035),metal,0,.27,-.306);
  addBox(torso,new THREE.BoxGeometry(.14,.1,.04),dark,.25,.16,-.19);
  addCylinder(torso,accent,.25,.16,-.22,.025,.035,Math.PI/2);
  addBox(torso,new THREE.BoxGeometry(.12,.14,.08),dark,-.31,.18,.03);
  addBox(torso,new THREE.BoxGeometry(.1,.035,.025),accent,-.31,.2,-.02);

  const animate=(movement:number,time:number,action=0,recoil=0)=>{
    const stride=Math.sin(time*9.2)*movement;
    const counter=Math.sin(time*9.2+Math.PI)*movement;
    torso.rotation.z=Math.sin(time*4.6)*movement*.018;
    torso.position.y=.015+Math.abs(Math.sin(time*9.2))*.012*movement;
    head.rotation.y=Math.sin(time*1.25)*.025;
    arms.forEach(({shoulder,elbow,fingers,side})=>{
      shoulder.rotation.x=.22+(side===1?-.06:.06)+stride*.12+recoil*.16;
      shoulder.rotation.z=side*.12+stride*side*.09+action*.08*side;
      elbow.rotation.x=.44+action*.32+(side===-1?recoil*.08:0);
      elbow.rotation.z=side*.04;
      fingers.forEach((finger,i)=>{finger.rotation.x=-.16-action*.24+(i===0?.04:0);});
    });
    legs.forEach(({hip,knee,side})=>{
      const gait=side===1?stride:counter;
      hip.rotation.x=gait*.52;
      knee.rotation.x=Math.max(0,-gait)*.62+.06;
    });
  };
  animate(0,0,0,0);
  group.userData.animatePose=animate;
  return {group,animate};
}

function metalMaterial():THREE.Material{
  return new THREE.MeshStandardMaterial({color:0x75899a,roughness:.32,metalness:.88});
}
