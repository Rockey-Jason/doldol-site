import * as THREE from 'three';

function addSegment(parent:THREE.Object3D,start:THREE.Vector3,end:THREE.Vector3,radius:number,material:THREE.Material){
  const direction=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,Math.max(.02,direction.length()-radius*2),4,8),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.castShadow=true;parent.add(mesh);return mesh;
}

export interface FirstPersonHands {
  group:THREE.Group;
  update:(progress:number,active:boolean,walk:number,fire:number,aim:number,weaponCode?:string)=>void;
}

/** Paired first-person arms with articulated glove fingers and a reload reach/seat animation. */
export function createFirstPersonHands(parent:THREE.Group):FirstPersonHands{
  const group=new THREE.Group();group.name='first-person-hands';
  const sleeve=new THREE.MeshStandardMaterial({color:0x263e57,roughness:.82,metalness:.08});
  const sleevePlate=new THREE.MeshStandardMaterial({color:0x526a80,roughness:.55,metalness:.28});
  const glove=new THREE.MeshStandardMaterial({color:0x151e28,roughness:.9,metalness:.02});
  const gloveEdge=new THREE.MeshStandardMaterial({color:0x647586,roughness:.62,metalness:.28});
  const stitch=new THREE.MeshStandardMaterial({color:0x6da9d7,roughness:.72,metalness:.05});
  const addBox=(target:THREE.Object3D,geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);mesh.castShadow=true;target.add(mesh);return mesh;
  };
  const buildArm=(side:'left'|'right')=>{
    const arm=new THREE.Group();
    const isLeft=side==='left';
    // Forearm sleeve runs diagonally in from the lower screen edge.
    const from=isLeft?new THREE.Vector3(-.24,.17,.18):new THREE.Vector3(.25,.16,.2);
    const wrist=isLeft?new THREE.Vector3(0,0,0):new THREE.Vector3(0,0,0);
    addSegment(arm,from,wrist,.105,sleeve);
    const sleeveCuff=addBox(arm,new THREE.CylinderGeometry(.108,.108,.09,12),sleevePlate,0,.025,0,Math.PI/2,0,Math.PI/2);
    sleeveCuff.scale.set(1,1,1);
    addBox(arm,new THREE.BoxGeometry(.2,.18,.13),sleevePlate,isLeft?-.12:.12,.105,.08,0,0,isLeft?-.18:.18);
    addBox(arm,new THREE.BoxGeometry(.13,.026,.12),stitch,isLeft?-.12:.12,.11,.011,0,0,isLeft?-.18:.18);
    // Palm, raised knuckle guard and four individually articulated fingers.
    const hand=new THREE.Group();hand.position.set(0,-.025,-.02);arm.add(hand);
    addBox(hand,new THREE.BoxGeometry(.145,.13,.17),glove,0,-.015,-.025,0,0,isLeft?-.08:.08);
    addBox(hand,new THREE.BoxGeometry(.13,.035,.12),gloveEdge,0,.048,-.045);
    addBox(hand,new THREE.BoxGeometry(.11,.018,.08),sleevePlate,0,.068,-.045);
    const fingers:THREE.Group[]=[];
    for(let i=0;i<4;i++){
      const finger=new THREE.Group();finger.position.set(-.052+i*.035,-.075,-.105);hand.add(finger);
      addSegment(finger,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.045,-.016),.018,glove);
      const distal=new THREE.Group();distal.position.set(0,-.044,-.016);finger.add(distal);
      addSegment(distal,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.034,-.014),.014,glove);
      addBox(distal,new THREE.BoxGeometry(.025,.012,.025),gloveEdge,0,-.034,-.014);
      fingers.push(finger);
    }
    const thumb=new THREE.Group();thumb.position.set(isLeft?-.085:.085,-.015,-.055);hand.add(thumb);
    addSegment(thumb,new THREE.Vector3(0,0,0),new THREE.Vector3(isLeft?.04:-.04,-.045,-.045),.022,glove);
    addSegment(thumb,new THREE.Vector3(isLeft?.04:-.04,-.045,-.045),new THREE.Vector3(isLeft?.06:-.06,-.085,-.08),.018,glove);
    arm.userData.fingers=fingers;
    arm.userData.hand=hand;
    return arm;
  };
  const left=buildArm('left');
  const right=buildArm('right');
  const leftHome=new THREE.Vector3(.105,-.39,-.61);
  const rightHome=new THREE.Vector3(.39,-.39,-.20);
  left.position.copy(leftHome);right.position.copy(rightHome);
  left.rotation.set(-.08,0,-.02);right.rotation.set(-.06,0,.03);
  group.add(left,right);
  parent.add(group);

  const smooth=(value:number,a:number,b:number)=>THREE.MathUtils.smoothstep(value,a,b);
  const weaponGrip:Record<string,{left:THREE.Vector3;right:THREE.Vector3;leftRot:THREE.Vector3;rightRot:THREE.Vector3}>={
    R16:{left:new THREE.Vector3(0,0,0),right:new THREE.Vector3(0,0,0),leftRot:new THREE.Vector3(0,0,0),rightRot:new THREE.Vector3(0,0,0)},
    VIPER:{left:new THREE.Vector3(-.035,.025,.025),right:new THREE.Vector3(.015,0,.015),leftRot:new THREE.Vector3(-.04,0,.03),rightRot:new THREE.Vector3(0,0,.02)},
    R9:{left:new THREE.Vector3(-.09,.055,.08),right:new THREE.Vector3(.045,.015,.045),leftRot:new THREE.Vector3(-.12,.04,.12),rightRot:new THREE.Vector3(.04,0,-.08)},
    THUNDER:{left:new THREE.Vector3(.025,-.025,-.07),right:new THREE.Vector3(.015,-.015,-.025),leftRot:new THREE.Vector3(.10,0,-.08),rightRot:new THREE.Vector3(.04,0,.02)},
    LONGSHOT:{left:new THREE.Vector3(.055,-.035,-.12),right:new THREE.Vector3(-.015,.005,-.025),leftRot:new THREE.Vector3(.14,-.04,-.10),rightRot:new THREE.Vector3(.02,0,.04)},
    HELIX:{left:new THREE.Vector3(.015,.015,-.035),right:new THREE.Vector3(.005,0,.015),leftRot:new THREE.Vector3(.04,0,-.025),rightRot:new THREE.Vector3(0,0,.01)},
    BASTION:{left:new THREE.Vector3(.035,-.015,-.06),right:new THREE.Vector3(.005,0,-.015),leftRot:new THREE.Vector3(.08,0,-.04),rightRot:new THREE.Vector3(.02,0,.02)},
    NOVA:{left:new THREE.Vector3(-.025,.035,.035),right:new THREE.Vector3(.03,.01,.035),leftRot:new THREE.Vector3(-.08,.02,.05),rightRot:new THREE.Vector3(.03,0,-.04)},
    ARC:{left:new THREE.Vector3(.015,.015,-.025),right:new THREE.Vector3(.01,0,.015),leftRot:new THREE.Vector3(.03,0,-.02),rightRot:new THREE.Vector3(0,0,0)},
    PULSE:{left:new THREE.Vector3(.01,.01,-.02),right:new THREE.Vector3(.01,0,.01),leftRot:new THREE.Vector3(.02,0,-.02),rightRot:new THREE.Vector3(0,0,0)}
  };
  const update=(progress:number,active:boolean,walk:number,fire:number,aim:number,weaponCode='R16')=>{
    group.visible=true;
    const p=active?THREE.MathUtils.clamp(progress,0,1):0;
    const pose=weaponGrip[weaponCode]||weaponGrip.R16;
    const gripLeft=leftHome.clone().add(pose.left);
    const gripRight=rightHome.clone().add(pose.right);
    const lift=smooth(p,.10,.25);
    const reach=smooth(p,.25,.46);
    const seat=smooth(p,.52,.72);
    const returnGrip=smooth(p,.78,.98);
    // The support hand leaves the foregrip, reaches down for the magazine,
    // guides it upward, then returns to the handguard.
    // The palm travels to the magazine well, closes around the dropped mag,
    // then guides the replacement upward before returning to the foregrip.
    const magazineGrip=new THREE.Vector3(.235,-.535,-.405);
    const magazineSeat=new THREE.Vector3(.225,-.405,-.39);
    const reachPosition=gripLeft.clone().lerp(magazineGrip,lift);
    const holdBlend=THREE.MathUtils.smoothstep(p,.30,.43)*(1-THREE.MathUtils.smoothstep(p,.67,.78));
    const seatBlend=THREE.MathUtils.smoothstep(p,.69,.82);
    const heldPosition=reachPosition.clone().lerp(magazineGrip,holdBlend);
    const guidedPosition=heldPosition.lerp(magazineSeat,seatBlend);
    left.position.copy(guidedPosition.lerp(gripLeft,returnGrip));
    left.position.y+=Math.sin(performance.now()*.009)*walk*.006;
    left.rotation.set(pose.leftRot.x-.08+reach*.42-seat*.2,pose.leftRot.y+reach*.24,pose.leftRot.z-.02-reach*.38+seat*.16-returnGrip*.05);
    const curl=THREE.MathUtils.clamp(holdBlend*.98+lift*.18-seatBlend*.12,0,1);
    const leftFingers=left.userData.fingers as THREE.Group[];
    leftFingers.forEach((finger,i)=>{finger.rotation.x=-.12-curl*(i===0?.82:1.08);finger.rotation.z=(i-1.5)*.035;});
    const rightFingers=right.userData.fingers as THREE.Group[];
    rightFingers.forEach((finger,i)=>{finger.rotation.x=i===1?-.05:-.2;});
    // The firing hand briefly leaves the grip to rack the charging handle
    // after the replacement magazine is seated. The timing is shared with the
    // weapon-specific bolt/pump animation in Game.ts.
    const boltReach=smooth(p,.80,.88)*(1-smooth(p,.91,.985));
    const boltPosition=new THREE.Vector3(.24,-.105,-.43);
    right.position.copy(gripRight).lerp(boltPosition,boltReach);
    right.position.y+=Math.sin(performance.now()*.009+1)*walk*.004-fire*.018;
    right.rotation.set(pose.rightRot.x-.06+fire*.08-aim*.015+boltReach*.42,pose.rightRot.y+boltReach*.12,pose.rightRot.z+.03+Math.sin(performance.now()*.006)*walk*.008-boltReach*.28);
    rightFingers.forEach((finger,i)=>{finger.rotation.x=-.18-boltReach*(i===0?.72:1.02);});
  };
  return {group,update};
}
