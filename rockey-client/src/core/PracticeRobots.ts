import * as THREE from 'three';

export type PracticeRobotRole = 'melee' | 'ranged' | 'thrower' | 'scout' | 'tank';
type GroundSampler = (x:number,z:number,footY:number)=>number|null;
type DamagePlayer = (damage:number,source:string)=>void;
type DamageNotice = (position:THREE.Vector3,damage:number,headshot:boolean)=>void;

type RobotSpec = {
  role:PracticeRobotRole;name:string;hp:number;speed:number;range:number;
  cooldown:number;damage:number;preferred:number;body:number;glow:number;
};

type Bot = {
  id:string;spec:RobotSpec;root:THREE.Group;head:THREE.Mesh;
  healthFill:THREE.Mesh;health:number;alive:boolean;respawnAt:number;
  nextAttackAt:number;nextThinkAt:number;moveX:number;moveZ:number;
  patrolAngle:number;hitUntil:number;limbs:THREE.Group[];
};

type Bolt = {mesh:THREE.Mesh;velocity:THREE.Vector3;age:number;damage:number;source:string};
type Grenade = {mesh:THREE.Mesh;velocity:THREE.Vector3;age:number;source:string;damage:number;radius:number};
type Blast = {mesh:THREE.Mesh;age:number;life:number};

const SPECS:RobotSpec[]=[
  {role:'melee',name:'BREACHER',hp:155,speed:3.65,range:1.85,cooldown:1180,damage:15,preferred:1.25,body:0x34485f,glow:0xff536e},
  {role:'ranged',name:'SENTINEL',hp:115,speed:2.15,range:25,cooldown:1540,damage:11,preferred:13,body:0x344d68,glow:0x5acbff},
  {role:'thrower',name:'BOMBER',hp:135,speed:2.45,range:17,cooldown:4200,damage:28,preferred:10,body:0x5d4935,glow:0xffb84d},
  {role:'scout',name:'STRIDER',hp:100,speed:3.35,range:14,cooldown:1920,damage:8,preferred:7,body:0x354b4e,glow:0x6af0c3},
  {role:'tank',name:'BULWARK',hp:440,speed:1.38,range:2.75,cooldown:2680,damage:25,preferred:2,body:0x4a3b55,glow:0xc08cff}
];

export interface PracticeRobotSystem {
  update(now:number,dt:number,player:THREE.Vector3,enabled:boolean):void;
  hitMeshes():THREE.Object3D[];
  damageObject(object:THREE.Object3D,damage:number,now:number):boolean;
  damageInRadius(position:THREE.Vector3,radius:number,damage:number,now:number):number;
  reset(enabled:boolean):void;
  dispose():void;
}

export function createPracticeRobots(
  scene:THREE.Scene,
  mapLight:number,
  isMobile:boolean,
  blockers:THREE.Object3D[],
  sampleGround:GroundSampler,
  damagePlayer:DamagePlayer,
  damageNotice:DamageNotice,
  notify:(message:string)=>void
):PracticeRobotSystem {
  const bots:Bot[]=[];
  const bolts:Bolt[]=[];
  const grenades:Grenade[]=[];
  const blasts:Blast[]=[];
  const raycaster=new THREE.Raycaster();
  const scratch=new THREE.Vector3();
  const targetScratch=new THREE.Vector3();
  void mapLight;
  const boltGeometry=new THREE.SphereGeometry(.105,10,8);
  const grenadeGeometry=new THREE.DodecahedronGeometry(.17,0);
  const blastGeometry=new THREE.SphereGeometry(1,18,12);
  const positions:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[
    [-14,12],[-6,6],[0,-7],[14,12],[6,6]
  ];
  let active=false;

  const material=(color:number,metalness=.58,roughness=.34,emissive=0)=>new THREE.MeshStandardMaterial({
    color,metalness,roughness,emissive,emissiveIntensity:emissive?1.15:0
  });
  const makeBox=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
    mesh.position.set(x,y,z);mesh.castShadow=!isMobile;mesh.receiveShadow=!isMobile;
    parent.add(mesh);return mesh;
  };
  const makeJoint=(parent:THREE.Object3D,mat:THREE.Material,x:number,y:number,z:number,r:number)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),mat);
    mesh.position.set(x,y,z);mesh.castShadow=!isMobile;parent.add(mesh);return mesh;
  };
  const specs=SPECS.map(spec=>({
    spec,body:material(spec.body,.72,.3),dark:material(0x121d2a,.48,.4),
    metal:material(0x8698a8,.9,.26),glow:material(spec.glow,.32,.22,spec.glow),
    glass:new THREE.MeshPhysicalMaterial({color:spec.glow,emissive:spec.glow,emissiveIntensity:.65,metalness:.22,roughness:.12,clearcoat:1})
  }));

  const createBot=(index:number):Bot=>{
    const kit=specs[index],spec=kit.spec,id='practice-bot-'+spec.role;
    const root=new THREE.Group();root.name='rockey-practice-robot-'+spec.role;
    root.userData.robotId=id;root.position.set(positions[index][0],0,positions[index][1]);
    const base=makeJoint(root,kit.dark,0,.16,0,.48);base.scale.set(1.35,.23,1.05);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,7,24),kit.glow);
    ring.rotation.x=Math.PI/2;ring.position.y=.13;root.add(ring);
    const pelvis=makeBox(root,kit.dark,0,.72,0,.64,.36,.44);
    const torso=new THREE.Group();torso.position.set(0,1.12,0);torso.userData.isTorso=true;root.add(torso);
    const chest=makeBox(torso,kit.body,0,.2,0,.96,.84,.58);
    makeBox(torso,kit.metal,0,.2,-.305,.62,.5,.045);
    const core=makeJoint(torso,kit.glow,0,.2,-.34,.16);core.scale.set(1,.9,.48);
    for(const side of [-1,1]){
      const shoulder=makeJoint(torso,kit.metal,side*.59,.38,0,.19);
      const arm=new THREE.Group();arm.position.set(side*.62,.28,0);torso.add(arm);
      makeBox(arm,kit.body,0,-.23,0,.22,.49,.25);
      makeJoint(arm,kit.glow,0,-.46,-.01,.11);
      const fist=makeBox(arm,kit.dark,0,-.56,-.025,.28,.2,.3);
      if(spec.role==='melee'||spec.role==='tank'){
        const blade=makeBox(arm,kit.glow,side*.18,-.55,-.02,.08,.44,.09);
        blade.rotation.z=side*-.28;
      }
      arm.userData.side=side;
    }
    const headGroup=new THREE.Group();headGroup.position.set(0,.78,0);torso.add(headGroup);
    const head=makeBox(headGroup,kit.metal,0,0,0,.58,.46,.48);
    head.userData.robotHead=true;head.userData.robotId=id;
    makeBox(headGroup,kit.dark,0,-.04,-.25,.44,.17,.035);
    const visor=makeBox(headGroup,kit.glow,0,.015,-.277,.36,.075,.025);visor.userData.robotHead=true;visor.userData.robotId=id;
    for(const side of [-1,1]){
      const antenna=makeBox(headGroup,kit.glow,side*.2,.3,0,.035,.2,.035);antenna.rotation.z=side*.22;
    }
    if(spec.role==='ranged'||spec.role==='scout'){
      const barrel=makeBox(torso,kit.dark,0,-.12,-.49,.22,.22,.58);
      makeBox(torso,kit.glow,0,-.1,-.79,.13,.13,.08);
    }else if(spec.role==='thrower'){
      const pack=makeBox(torso,kit.dark,0,.23,.38,.62,.58,.28);
      for(const side of [-1,1])makeBox(torso,kit.glow,side*.24,.23,.54,.12,.36,.035);
    }else if(spec.role==='tank'){
      const shoulderL=makeBox(torso,kit.body,-.69,.42,0,.42,.34,.7);
      const shoulderR=makeBox(torso,kit.body,.69,.42,0,.42,.34,.7);
      makeBox(torso,kit.glow,0,.53,-.34,.58,.065,.035);
    }
    const limbs:THREE.Group[]=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*(spec.role==='tank'?.25:.19),.58,0);root.add(leg);
      makeBox(leg,kit.body,0,-.22,0,spec.role==='tank'?.34:.23,.48,.3);
      makeJoint(leg,kit.metal,0,-.46,-.02,.13);
      makeBox(leg,kit.dark,0,-.58,-.09,.36,.16,.48);
      leg.userData.side=side;limbs.push(leg);
    }
    const healthBase=makeBox(root,kit.dark,0,2.55,0,.95,.105,.09);
    healthBase.position.z=-.02;
    const healthFill=makeBox(root,kit.glow,-.01,2.56,-.065,.88,.052,.035);
    healthFill.position.x=0;
    const labelCore=makeBox(root,kit.glow,0,2.34,0,.42,.045,.045);
    labelCore.visible=spec.role==='tank';
    root.traverse(object=>{
      if(object instanceof THREE.Mesh){object.userData.robotId=id;object.userData.hitZone=object.userData.robotHead?'head':'body';}
    });
    scene.add(root);
    return {id,spec,root,head,healthFill,health:spec.hp,alive:true,respawnAt:0,nextAttackAt:performance.now()+800+index*320,nextThinkAt:0,
      moveX:0,moveZ:0,patrolAngle:index*1.3,hitUntil:0,limbs};
  };

  for(let i=0;i<SPECS.length;i++)bots.push(createBot(i));

  const isBlocked=(origin:THREE.Vector3,direction:THREE.Vector3,distance:number)=>{
    raycaster.set(origin,direction);raycaster.near=.15;raycaster.far=Math.max(.2,distance-.55);
    return raycaster.intersectObjects(blockers,false).length>0;
  };
  const clearLine=(bot:Bot,player:THREE.Vector3)=>{
    scratch.set(player.x,player.y+.12,player.z);
    targetScratch.copy(bot.root.position);targetScratch.y+=1.38;
    const direction=scratch.clone().sub(targetScratch),distance=direction.length();
    if(distance<.1)return true;
    direction.normalize();return !isBlocked(targetScratch,direction,distance);
  };
  const showHealth=(bot:Bot)=>{
    bot.healthFill.scale.x=Math.max(.001,.88*bot.health/bot.spec.hp);
    bot.healthFill.position.x=-.44+(.44*bot.health/bot.spec.hp);
    const fillMat=bot.healthFill.material as THREE.MeshStandardMaterial;
    fillMat.color.setHex(bot.health/bot.spec.hp<.28?0xff4f65:bot.spec.glow);
    fillMat.emissive.setHex(bot.health/bot.spec.hp<.28?0xff4f65:bot.spec.glow);
  };
  const spawnBolt=(bot:Bot,player:THREE.Vector3,now:number)=>{
    const origin=bot.root.position.clone().add(new THREE.Vector3(0,1.42,0));
    const target=player.clone().add(new THREE.Vector3(0,.35,0));
    const direction=target.sub(origin).normalize();
    const mesh=new THREE.Mesh(boltGeometry,specs[SPECS.indexOf(bot.spec)].glow);
    mesh.position.copy(origin);scene.add(mesh);
    bolts.push({mesh,velocity:direction.multiplyScalar(bot.spec.role==='scout'?24:18),age:0,damage:bot.spec.damage,source:bot.spec.name});
    bot.nextAttackAt=now+bot.spec.cooldown;
  };
  const spawnGrenade=(bot:Bot,player:THREE.Vector3,now:number)=>{
    const origin=bot.root.position.clone().add(new THREE.Vector3(0,1.45,0));
    const mesh=new THREE.Mesh(grenadeGeometry,material(bot.spec.glow,.55,.28,bot.spec.glow));
    mesh.position.copy(origin);scene.add(mesh);
    const target=player.clone().add(new THREE.Vector3(0,.1,0));
    const travel=target.sub(origin),horizontal=Math.hypot(travel.x,travel.z);
    const flight=THREE.MathUtils.clamp(horizontal/8.5,.55,1.35);
    const velocity=new THREE.Vector3(travel.x/flight,Math.max(4.2,(travel.y+.5*9.8*flight*flight)/flight),travel.z/flight);
    grenades.push({mesh,velocity,age:0,source:bot.spec.name,damage:bot.spec.damage,radius:4.4});
    bot.nextAttackAt=now+bot.spec.cooldown;
  };
  const spawnBlast=(position:THREE.Vector3,radius:number,now:number)=>{
    const mat=new THREE.MeshBasicMaterial({color:0xffa64d,transparent:true,opacity:.7,depthWrite:false});
    const mesh=new THREE.Mesh(blastGeometry,mat);mesh.position.copy(position);mesh.scale.setScalar(.35);scene.add(mesh);
    blasts.push({mesh,age:0,life:.52});
    const distance=position.distanceTo(new THREE.Vector3(playerState.x,position.y,playerState.z));
    if(distance<radius){
      const attenuation=1-distance/radius;
      damagePlayer(Math.max(4,Math.round(24*attenuation)),'BLAST');
    }
  };
  let playerState={x:0,y:.92,z:20};

  const damageBot=(bot:Bot,amount:number,position:THREE.Vector3,headshot:boolean,now:number)=>{
    if(!bot.alive||amount<=0)return;
    const damage=Math.max(1,Math.round(amount*(headshot?1.3:1)));
    bot.health=Math.max(0,bot.health-damage);bot.hitUntil=now+180;showHealth(bot);
    damageNotice(position,damage,headshot);
    if(bot.health<=0){
      bot.alive=false;bot.root.visible=false;bot.respawnAt=now+6500;
      notify('ROBOT DESTROYED · '+bot.spec.name);
    }
  };

  const system:PracticeRobotSystem={
    update(now,dt,player,enabled){
      active=enabled;
      if(!enabled){for(const bot of bots)bot.root.visible=false;return;}
      playerState={x:player.x,y:player.y,z:player.z};
      const step=Math.min(.08,Math.max(.001,dt));
      for(const bot of bots){
        if(!bot.alive){
          if(now>=bot.respawnAt){
            bot.health=bot.spec.hp;bot.alive=true;bot.root.visible=true;
            const index=bots.indexOf(bot),spawn=positions[index];
            const ground=sampleGround(spawn[0],spawn[1],0)??0;
            bot.root.position.set(spawn[0],ground,spawn[1]);showHealth(bot);
            bot.nextAttackAt=now+1000;bot.nextThinkAt=0;
            notify('ROBOT REINFORCEMENTS · '+bot.spec.name);
          }
          continue;
        }
        const dx=player.x-bot.root.position.x,dz=player.z-bot.root.position.z;
        const distance=Math.hypot(dx,dz);
        const visible=distance<bot.spec.range&&clearLine(bot,player);
        if(now>=bot.nextThinkAt){
          bot.nextThinkAt=now+(isMobile?115:80);
          const nx=distance>.001?dx/distance:0,nz=distance>.001?dz/distance:1;
          let move=0;
          if(bot.spec.role==='ranged'||bot.spec.role==='thrower'){
            move=distance>bot.spec.preferred+2?1:distance<bot.spec.preferred-2?-.75:0;
            if(bot.spec.role==='ranged'&&distance<bot.spec.range&&visible)move*=.5;
          }else if(bot.spec.role==='scout'){
            bot.patrolAngle+=step*1.7;
            move=distance>5?1:.28;
            bot.moveX=-nz*Math.cos(bot.patrolAngle)+nx*Math.sin(bot.patrolAngle)*.35;
            bot.moveZ=nx*Math.cos(bot.patrolAngle)+nz*Math.sin(bot.patrolAngle)*.35;
          }else move=distance>bot.spec.preferred?.95:distance<bot.spec.preferred*.68?-.35:0;
          if(bot.spec.role!=='scout'){
            bot.moveX=nx*move;bot.moveZ=nz*move;
            if(distance>bot.spec.range*.82){
              const side=bot.patrolAngle%2<1?1:-1;
              bot.moveX+=-nz*.22*side;bot.moveZ+=nx*.22*side;
              bot.patrolAngle+=.37;
            }
          }
          const length=Math.hypot(bot.moveX,bot.moveZ);
          if(length>1){bot.moveX/=length;bot.moveZ/=length;}
        }
        const moveDistance=bot.spec.speed*step;
        if(Math.hypot(bot.moveX,bot.moveZ)>.02){
          const nextX=THREE.MathUtils.clamp(bot.root.position.x+bot.moveX*moveDistance,-27,27);
          const nextZ=THREE.MathUtils.clamp(bot.root.position.z+bot.moveZ*moveDistance,-27,27);
          const eye=bot.root.position.clone().add(new THREE.Vector3(0,1.05,0));
          const desired=new THREE.Vector3(nextX,eye.y,nextZ);
          const direction=desired.sub(eye),length=direction.length();
          let canMove=length<.04||!isBlocked(eye,direction.normalize(),length);
          if(canMove){
            const floor=sampleGround(nextX,nextZ,bot.root.position.y);
            if(floor!==null&&Math.abs(floor-bot.root.position.y)<.75)bot.root.position.set(nextX,floor,nextZ);
            else canMove=false;
          }
          if(!canMove){
            const side=bot.patrolAngle%2<1?1:-1;
            const oldMoveX=bot.moveX,oldMoveZ=bot.moveZ;
            bot.moveX=-oldMoveZ*side;bot.moveZ=oldMoveX*side;
            const alternativeX=bot.root.position.x+bot.moveX*moveDistance*1.35;
            const alternativeZ=bot.root.position.z+bot.moveZ*moveDistance*1.35;
            if(Math.abs(alternativeX)<27&&Math.abs(alternativeZ)<27){
              const altFloor=sampleGround(alternativeX,alternativeZ,bot.root.position.y);
              if(altFloor!==null&&Math.abs(altFloor-bot.root.position.y)<.75)bot.root.position.set(alternativeX,altFloor,alternativeZ);
            }
          }
          bot.root.rotation.y=Math.atan2(-bot.moveX,-bot.moveZ);
        }
        const newDx=player.x-bot.root.position.x,newDz=player.z-bot.root.position.z,newDistance=Math.hypot(newDx,newDz);
        const inSight=newDistance<bot.spec.range&&clearLine(bot,player);
        if(now>=bot.nextAttackAt&&inSight){
            if(bot.spec.role==='melee'&&newDistance<bot.spec.range){
            bot.nextAttackAt=now+bot.spec.cooldown;bot.hitUntil=now+250;
            damagePlayer(bot.spec.damage,bot.spec.name);
          }else if(bot.spec.role==='tank'&&newDistance<bot.spec.range){
            bot.nextAttackAt=now+bot.spec.cooldown;bot.hitUntil=now+360;
            if(newDistance<3.6)damagePlayer(bot.spec.damage,bot.spec.name);
          }else if(bot.spec.role==='thrower'&&newDistance>4.8&&newDistance<bot.spec.range){
            spawnGrenade(bot,player,now);
          }else if((bot.spec.role==='ranged'||bot.spec.role==='scout')&&newDistance>2.6){
            spawnBolt(bot,player,now);
          }
        }
        const motion=Math.min(1,Math.hypot(bot.moveX,bot.moveZ));
        bot.root.children.forEach(child=>{if(child instanceof THREE.Group&&child.position.y===.58){
          child.rotation.x=Math.sin(now*.009+(Number(child.userData.side)||0)*Math.PI)*motion*.45;
        }});
        const torso=bot.root.children.find(child=>child instanceof THREE.Group&&child.userData.isTorso===true);
        if(torso){torso.rotation.z=Math.sin(now*.002+bots.indexOf(bot))*.018+(now<bot.hitUntil?Math.sin(now*.08)*.08:0);torso.position.y=1.12+Math.sin(now*.003+bots.indexOf(bot))*.025;}
        bot.head.rotation.y=Math.sin(now*.0014+bots.indexOf(bot))*.12;
      }
      for(let i=bolts.length-1;i>=0;i--){
        const bolt=bolts[i];bolt.age+=step;bolt.mesh.position.addScaledVector(bolt.velocity,step);
        if(bolt.mesh.position.distanceTo(player.clone().add(new THREE.Vector3(0,.35,0)))<.55){
          damagePlayer(bolt.damage,bolt.source);scene.remove(bolt.mesh);bolts.splice(i,1);continue;
        }
        if(bolt.age>2.2){scene.remove(bolt.mesh);bolts.splice(i,1);}
      }
      for(let i=grenades.length-1;i>=0;i--){
        const grenade=grenades[i];grenade.age+=step;grenade.velocity.y-=9.8*step;
        grenade.mesh.position.addScaledVector(grenade.velocity,step);
        grenade.mesh.rotation.x+=step*4;grenade.mesh.rotation.z+=step*3;
        const near=grenade.mesh.position.distanceTo(player)<.75;
        if(grenade.age>1.35||near){
          const blast=grenade.mesh.position.clone();scene.remove(grenade.mesh);
          spawnBlast(blast,grenade.radius,now);grenades.splice(i,1);
        }
      }
      for(let i=blasts.length-1;i>=0;i--){
        const blast=blasts[i];blast.age+=step;const progress=blast.age/blast.life;
        blast.mesh.scale.setScalar(.35+progress*4.0);
        (blast.mesh.material as THREE.MeshBasicMaterial).opacity=.72*(1-progress);
        if(progress>=1){scene.remove(blast.mesh);(blast.mesh.material as THREE.Material).dispose();blasts.splice(i,1);}
      }
    },
    hitMeshes(){return bots.filter(bot=>bot.alive&&bot.root.visible).map(bot=>bot.root);},
    damageObject(object,damage,now){
      let current:THREE.Object3D|null=object,botId:string|undefined,headshot=false;
      while(current){
        if(typeof current.userData.robotId==='string')botId=current.userData.robotId;
        if(current.userData.robotHead===true||current.userData.hitZone==='head')headshot=true;
        current=current.parent;
      }
      const bot=bots.find(item=>item.id===botId);
      if(!bot)return false;
      const position=object.getWorldPosition(new THREE.Vector3());
      damageBot(bot,damage,position,headshot,now);return true;
    },
    damageInRadius(position,radius,damage,now){
      let hits=0;
      for(const bot of bots){
        if(!bot.alive)continue;
        const distance=bot.root.position.distanceTo(position);
        if(distance>radius)continue;
        const amount=Math.max(1,Math.round(damage*(1-distance/radius)));
        damageBot(bot,amount,bot.root.position.clone().add(new THREE.Vector3(0,1.2,0)),false,now);hits++;
      }
      return hits;
    },
    reset(enabled){
      active=enabled;
      const now=performance.now();
      bots.forEach((bot,index)=>{
        const spawn=positions[index],floor=sampleGround(spawn[0],spawn[1],0)??0;
        bot.health=bot.spec.hp;bot.alive=true;bot.respawnAt=0;bot.nextAttackAt=now+1200+index*280;bot.nextThinkAt=0;
        bot.root.position.set(spawn[0],floor,spawn[1]);bot.root.rotation.set(0,0,0);bot.root.visible=enabled;showHealth(bot);
      });
      for(const bolt of bolts)scene.remove(bolt.mesh);bolts.length=0;
      for(const grenade of grenades){scene.remove(grenade.mesh);(grenade.mesh.material as THREE.Material).dispose();}grenades.length=0;
      for(const blast of blasts){scene.remove(blast.mesh);(blast.mesh.material as THREE.Material).dispose();}blasts.length=0;
    },
    dispose(){
      for(const bolt of bolts)scene.remove(bolt.mesh);bolts.length=0;
      for(const grenade of grenades){scene.remove(grenade.mesh);(grenade.mesh.material as THREE.Material).dispose();}grenades.length=0;
      for(const blast of blasts){scene.remove(blast.mesh);(blast.mesh.material as THREE.Material).dispose();}blasts.length=0;
      for(const bot of bots){scene.remove(bot.root);}
      specs.forEach(kit=>[kit.body,kit.dark,kit.metal,kit.glow,kit.glass].forEach(mat=>mat.dispose()));
    }
  };
  return system;
}
