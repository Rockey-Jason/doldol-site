import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface CombatantRig {
  group: THREE.Group;
  animate: (movement:number,time:number,action?:number,recoil?:number,vertical?:number,dead?:boolean,sprint?:number,grounded?:boolean) => void;
  triggerHit: () => void;
}

/**
 * Bone-driven tactical operator. The visible body is one weighted SkinnedMesh;
 * all body pieces are merged into a single geometry and weighted to a real
 * THREE.Skeleton so limb animation is driven by bones rather than parent groups.
 */
export function createCombatantRig(baseColor:number,accentColor:number):CombatantRig{
  const group=new THREE.Group();
  group.name='rockey-skeletal-operator';

  const materials:THREE.Material[]=[
    new THREE.MeshStandardMaterial({color:baseColor,roughness:.86,metalness:.06}),
    new THREE.MeshPhysicalMaterial({color:0x26394d,roughness:.34,metalness:.58,clearcoat:.4,clearcoatRoughness:.28}),
    new THREE.MeshStandardMaterial({color:0x101923,roughness:.72,metalness:.38}),
    new THREE.MeshStandardMaterial({color:0x8295a5,roughness:.3,metalness:.88}),
    new THREE.MeshStandardMaterial({color:0x26313a,roughness:.92,metalness:.02}),
    new THREE.MeshStandardMaterial({color:accentColor,emissive:accentColor,emissiveIntensity:.7,roughness:.32,metalness:.34}),
    new THREE.MeshPhysicalMaterial({color:accentColor,emissive:accentColor,emissiveIntensity:.28,roughness:.12,metalness:.18,clearcoat:1}),
    new THREE.MeshStandardMaterial({color:0x9a795f,roughness:.9,metalness:0}),
    new THREE.MeshStandardMaterial({color:0x1b252e,roughness:.96,metalness:.02})
  ];

  const bones:THREE.Bone[]=[];
  const boneIndex=new Map<string,number>();
  const makeBone=(name:string,parent:THREE.Bone|null,x:number,y:number,z:number)=>{
    const bone=new THREE.Bone();bone.name=name;bone.position.set(x,y,z);
    if(parent)parent.add(bone);else group.add(bone);
    boneIndex.set(name,bones.length);bones.push(bone);return bone;
  };

  const root=makeBone('root',null,0,0,0);
  const pelvis=makeBone('pelvis',root,0,.98,0);
  const spine=makeBone('spine',pelvis,0,.22,0);
  const chest=makeBone('chest',spine,0,.17,0);
  const neck=makeBone('neck',chest,0,.25,0);
  const head=makeBone('head',neck,0,.11,0);
  const arms:{shoulder:THREE.Bone;elbow:THREE.Bone;hand:THREE.Bone;side:number}[]=[];
  const legs:{hip:THREE.Bone;knee:THREE.Bone;foot:THREE.Bone;side:number}[]=[];
  for(const side of [-1,1]){
    const label=side<0?'left':'right';
    const shoulder=makeBone(label+'Shoulder',chest,side*.34,.08,0);
    const elbow=makeBone(label+'Elbow',shoulder,side*.035,-.32,0);
    const hand=makeBone(label+'Hand',elbow,side*.015,-.29,-.025);
    arms.push({shoulder,elbow,hand,side});
    const hip=makeBone(label+'Hip',pelvis,side*.16,-.08,0);
    const knee=makeBone(label+'Knee',hip,0,-.38,0);
    const foot=makeBone(label+'Foot',knee,0,-.37,-.025);
    legs.push({hip,knee,foot,side});
  }

  const parts:THREE.BufferGeometry[]=[];
  const addPart=(geometry:THREE.BufferGeometry,material:number,bone:string,position:THREE.Vector3,rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1))=>{
    const index=boneIndex.get(bone);
    if(index===undefined){geometry.dispose();return;}
    const matrix=new THREE.Matrix4().compose(position,rotation,scale);
    geometry.applyMatrix4(matrix);
    const count=geometry.getAttribute('position').count;
    const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
    for(let i=0;i<count;i++){indices[i*4]=index;weights[i*4]=1;}
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    geometry.clearGroups();geometry.addGroup(0,geometry.index?geometry.index.count:count,material);
    parts.push(geometry);
  };
  const box=(bone:string,material:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0)=>{
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz));
    addPart(new THREE.BoxGeometry(sx,sy,sz),material,bone,new THREE.Vector3(x,y,z),q);
  };
  const sphere=(bone:string,material:number,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    addPart(new THREE.SphereGeometry(1,18,12),material,bone,new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(sx,sy,sz));
  };
  const capsule=(bone:string,material:number,a:THREE.Vector3,b:THREE.Vector3,r:number)=>{
    const delta=b.clone().sub(a),length=delta.length();
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    addPart(new THREE.CapsuleGeometry(r,Math.max(.025,length-r*2),5,10),material,bone,a.clone().add(b).multiplyScalar(.5),q);
  };
  const cylinder=(bone:string,material:number,x:number,y:number,z:number,r:number,h:number,rx=0,ry=0,rz=0)=>{
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz));
    addPart(new THREE.CylinderGeometry(r,r,h,12),material,bone,new THREE.Vector3(x,y,z),q);
  };

  // Torso, carrier and webbing.
  capsule('spine',0,new THREE.Vector3(0,1.08,0),new THREE.Vector3(0,1.55,0),.255);
  box('chest',1,0,1.36,-.14,.57,.43,.20);
  box('chest',2,0,1.35,-.265,.42,.30,.055);
  box('chest',5,0,1.58,-.285,.25,.045,.025);
  box('pelvis',2,0,.99,-.015,.49,.24,.3);
  box('pelvis',1,0,.91,-.15,.52,.17,.10);
  for(let i=0;i<3;i++){
    const x=-.17+i*.17;
    box('chest',2,x,1.18,-.285,.12,.17,.09);
    box('chest',3,x,1.245,-.338,.085,.025,.025);
    box('chest',5,x,1.12,-.34,.07,.022,.018);
  }
  for(const side of [-1,1]){
    box('chest',1,side*.30,1.30,-.015,.15,.21,.16,0,0,side*.12);
    box('chest',2,side*.30,1.04,-.02,.16,.12,.16);
    box('chest',5,side*.30,1.04,-.112,.09,.035,.018);
  }
  box('chest',3,0,1.02,-.19,.16,.11,.045);
  box('chest',5,0,1.02,-.218,.09,.05,.018);

  // Helmet, optics, visor, radio and backpack.
  cylinder('neck',2,0,1.66,0,.105,.18,.18);
  sphere('head',7,0,1.82,0,.18,.22,.17);
  sphere('head',1,0,1.94,.015,.225,.16,.205);
  box('head',2,0,2.075,.015,.37,.055,.25);
  box('head',5,0,2.045,-.015,.33,.035,.26);
  box('head',6,0,1.83,-.17,.35,.105,.035);
  box('head',2,0,1.72,-.18,.25,.035,.035);
  for(const side of [-1,1]){
    cylinder('head',1,side*.215,1.82,0,.09,.095,0,0,Math.PI/2);
    cylinder('head',5,side*.265,1.82,0,.045,.035,0,0,Math.PI/2);
    box('head',2,side*.12,2.11,.035,.1,.055,.20,0,0,side*.22);
  }
  box('head',3,0,2.13,-.01,.12,.035,.12);
  box('head',2,0,1.82,.18,.13,.11,.15);
  box('pelvis',2,0,1.04,.22,.38,.50,.19);
  box('pelvis',1,0,1.28,.31,.30,.15,.07);
  for(const side of [-1,1]){
    box('pelvis',2,side*.12,1.05,.37,.13,.21,.09);
    box('pelvis',5,side*.17,1.06,.325,.045,.28,.035,0,0,side*.12);
  }
  cylinder('pelvis',3,-.27,1.31,.15,.018,.43);
  box('pelvis',1,-.27,1.17,.14,.14,.20,.10);

  // Arms: weighted upper arms, forearms, elbow guards, gloves and fingers.
  for(const arm of arms){
    const s=arm.side,label=arm.side<0?'left':'right';
    sphere(label+'Shoulder',1,s*.36,1.46,0,.17,.16,.16);
    capsule(label+'Shoulder',0,new THREE.Vector3(s*.36,1.43,0),new THREE.Vector3(s*.39,1.16,-.012),.095);
    box(label+'Shoulder',1,s*.385,1.31,-.025,.205,.27,.17,0,0,-s*.08);
    sphere(label+'Elbow',2,s*.40,1.12,-.02,.105,.105,.105);
    box(label+'Elbow',1,s*.40,1.12,-.09,.19,.14,.11);
    capsule(label+'Elbow',0,new THREE.Vector3(s*.40,1.08,-.015),new THREE.Vector3(s*.415,.83,-.045),.078);
    box(label+'Elbow',1,s*.41,.97,-.065,.18,.25,.13,0,0,-s*.04);
    cylinder(label+'Hand',3,s*.415,.82,-.04,.085,.045);
    box(label+'Hand',4,s*.415,.78,-.075,.135,.12,.16);
    for(let finger=0;finger<4;finger++){
      const fx=s*.415+(finger-1.5)*.032;
      capsule(label+'Hand',4,new THREE.Vector3(fx,.755,-.14),new THREE.Vector3(fx,.705,-.15),.014);
    }
    capsule(label+'Hand',4,new THREE.Vector3(s*.48,.79,-.09),new THREE.Vector3(s*.50,.735,-.14),.018);
  }

  // Legs with independent thigh, knee and ankle bones.
  for(const leg of legs){
    const s=leg.side,label=leg.side<0?'left':'right';
    capsule(label+'Hip',0,new THREE.Vector3(s*.16,.92,0),new THREE.Vector3(s*.16,.61,-.005),.115);
    box(label+'Hip',1,s*.16,.77,-.035,.23,.25,.21);
    box(label+'Hip',2,s*.16,.78,-.155,.20,.14,.045);
    box(label+'Hip',5,s*.16,.79,-.18,.12,.035,.018);
    sphere(label+'Knee',2,s*.16,.59,-.015,.12,.115,.12);
    box(label+'Knee',1,s*.16,.59,-.095,.22,.18,.085);
    capsule(label+'Knee',0,new THREE.Vector3(s*.16,.55,-.012),new THREE.Vector3(s*.16,.25,-.035),.085);
    box(label+'Knee',1,s*.16,.39,-.08,.19,.23,.12);
    box(label+'Knee',2,s*.16,.30,-.17,.18,.06,.12);
    box(label+'Foot',8,s*.16,.115,-.115,.20,.19,.34);
    box(label+'Foot',2,s*.16,.075,-.26,.19,.055,.10);
    box(label+'Foot',5,s*.16,.18,-.285,.08,.025,.018);
  }

  const merged=mergeGeometries(parts,true);
  parts.forEach(part=>part.dispose());
  if(!merged)throw new Error('Unable to merge tactical operator geometry');
  merged.computeBoundingBox();merged.computeBoundingSphere();
  const skeleton=new THREE.Skeleton(bones);
  const mesh=new THREE.SkinnedMesh(merged,materials);
  mesh.name='operator-skinned-mesh';
  mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(skeleton);

  let hitUntil=0;
  let deathBlend=0;
  const triggerHit=()=>{hitUntil=performance.now()+230;};
  let wasGrounded=true;
  let landingUntil=0;
  const animate=(movement:number,time:number,action=0,recoil=0,vertical=0,dead=false,sprint=0,grounded=true)=>{
    const move=THREE.MathUtils.clamp(movement,0,1);
    const runBlend=THREE.MathUtils.clamp(sprint,0,1)*move;
    const walkBlend=move*(1-THREE.MathUtils.smoothstep(runBlend,0.05,.9));
    const cadence=9.2+runBlend*3.1;
    const stride=Math.sin(time*cadence)*(walkBlend*.48+runBlend);
    const counter=Math.sin(time*cadence+Math.PI)*(walkBlend*.48+runBlend);
    const airborne=grounded?0:THREE.MathUtils.clamp(Math.abs(vertical)/7,0,1);
    if(grounded&&!wasGrounded&&vertical< -1)landingUntil=performance.now()+190;
    wasGrounded=grounded;
    const landing=THREE.MathUtils.clamp((landingUntil-performance.now())/190,0,1);
    const hit=THREE.MathUtils.clamp((hitUntil-performance.now())/230,0,1);
    deathBlend=THREE.MathUtils.damp(deathBlend,dead?1:0,dead?7:11,1/60);
    const idle=1-move;
    // Lower body: gait, toe-off and alternating foot plants are independent
    // from upper-body reload/recoil poses.
    pelvis.rotation.x=deathBlend*.42+airborne*.08+landing*.11;
    pelvis.rotation.y=Math.sin(time*cadence*.5)*runBlend*.035;
    spine.rotation.x=-.018*walkBlend-.055*runBlend+airborne*.13+hit*.16+deathBlend*.52+landing*.08;
    spine.rotation.z=Math.sin(time*4.7)*walkBlend*.012+hit*.12;
    chest.rotation.x=-.02*walkBlend-.035*runBlend+airborne*.10+hit*.22+deathBlend*.28;
    chest.rotation.z=Math.sin(time*4.2)*walkBlend*.009-hit*.08;
    neck.rotation.x=airborne*-.08+hit*-.18+deathBlend*-.25+landing*-.06;
    head.rotation.x=Math.sin(time*1.3)*.018*idle+hit*.14+deathBlend*.32;
    head.rotation.y=Math.sin(time*1.15)*.025;
    arms.forEach(({shoulder,elbow,hand,side})=>{
      const gait=side<0?stride:counter;
      shoulder.rotation.x=.10+gait*.64+airborne*-.62+recoil*.10+hit*-.35+deathBlend*.7+landing*.08;
      shoulder.rotation.z=side*.08+action*.09*side+deathBlend*side*.12;
      elbow.rotation.x=.16+Math.max(0,-gait)*.62+action*.22+airborne*.42+deathBlend*-.85;
      hand.rotation.x=action*.12+airborne*.22+deathBlend*.32;
    });
    legs.forEach(({hip,knee,foot,side})=>{
      const gait=side<0?stride:counter;
      const phase=time*cadence+(side<0?0:Math.PI);
      const stance=Math.max(0,Math.cos(phase));
      const swing=Math.max(0,-Math.cos(phase));
      hip.rotation.x=gait*.78+airborne*(side<0?-.18:.18)+deathBlend*(side<0?-.65:.5)+landing*.05;
      knee.rotation.x=swing*(.38+runBlend*.56)+airborne*.32+deathBlend*.95;
      // Stance phase keeps the sole level; swing phase adds toe clearance.
      foot.rotation.x=THREE.MathUtils.lerp(gait*.12,-gait*.10,stance)+swing*.16-airborne*.18+deathBlend*-.45;
    });
    root.rotation.z=deathBlend*.95;
    root.position.y=-deathBlend*.25+landing*.035;
  };
  group.userData.animatePose=animate;
  group.userData.triggerHit=triggerHit;
  group.userData.setDead=(dead:boolean)=>{if(dead)triggerHit();};
  animate(0,0);
  return {group,animate,triggerHit};
}
