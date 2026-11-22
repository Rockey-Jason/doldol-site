import * as THREE from 'three';

export interface RockeyPortalPoint { x:number; y:number; z:number; yaw:number; }

export function createEnergyCubeModel(): THREE.Group {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(.48,.48,.48),
    new THREE.MeshPhysicalMaterial({
      color:0x092b55,metalness:.82,roughness:.2,clearcoat:1,clearcoatRoughness:.12,
      emissive:0x0759be,emissiveIntensity:.85
    })
  );
  group.add(shell);
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.17,1),
    new THREE.MeshPhysicalMaterial({
      color:0x9eeaff,metalness:.12,roughness:.08,transmission:.22,thickness:.35,
      emissive:0x37baff,emissiveIntensity:2.1
    })
  );
  group.add(core);
  const rings:THREE.Mesh[]=[];
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(.34+i*.035,.018,8,40),
      new THREE.MeshStandardMaterial({
        color:i===1?0x62dfff:0xe5bd70,metalness:.9,roughness:.18,
        emissive:i===1?0x168dff:0x72501b,emissiveIntensity:.7
      })
    );
    ring.rotation.set(i*.72,i*.9,i*.48);group.add(ring);rings.push(ring);
  }
  const cornerMaterial=new THREE.MeshStandardMaterial({
    color:0xe3c17e,metalness:.94,roughness:.2,emissive:0x5a3b10,emissiveIntensity:.35
  });
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const pin=new THREE.Mesh(new THREE.OctahedronGeometry(.055,0),cornerMaterial);
    pin.position.set(sx*.205,sy*.205,sz*.205);group.add(pin);
  }
  group.userData.rings=rings;group.userData.core=core;group.userData.isRockeyEnergyCube=true;
  return group;
}

export function createRockeyPortalModel(point:RockeyPortalPoint,color:'blue'|'orange'):THREE.Group{
  const group=new THREE.Group();
  const tint=color==='blue'?0x35baff:0xff9a42;
  const glow=color==='blue'?0x087dff:0xff5c16;
  group.position.set(point.x,point.y+1.28,point.z);group.rotation.y=point.yaw;
  const base=new THREE.Mesh(
    new THREE.CylinderGeometry(.62,.72,.16,32),
    new THREE.MeshStandardMaterial({color:0x17283d,metalness:.9,roughness:.24})
  );
  base.position.y=-1.2;group.add(base);
  const ring=new THREE.Mesh(
    new THREE.TorusGeometry(.91,.105,14,64),
    new THREE.MeshPhysicalMaterial({
      color:0xe1c07b,metalness:.95,roughness:.18,emissive:glow,emissiveIntensity:.8,clearcoat:.9
    })
  );
  group.add(ring);
  const innerRing=new THREE.Mesh(
    new THREE.TorusGeometry(.79,.035,10,64),
    new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.95,toneMapped:false})
  );
  group.add(innerRing);
  const vortex=new THREE.Mesh(
    new THREE.CircleGeometry(.76,64),
    new THREE.MeshBasicMaterial({
      color:tint,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
    })
  );
  vortex.position.z=-.012;group.add(vortex);
  const innerVortex=new THREE.Mesh(
    new THREE.CircleGeometry(.5,48),
    new THREE.MeshBasicMaterial({
      color:glow,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false,toneMapped:false
    })
  );
  innerVortex.position.z=.01;group.add(innerVortex);
  const railMaterial=new THREE.MeshStandardMaterial({
    color:0xc7a867,metalness:.96,roughness:.2,emissive:glow,emissiveIntensity:.25
  });
  for(const x of [-.99,.99]){
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(.065,.08,2.35,12),railMaterial);
    rail.position.set(x,0,.025);group.add(rail);
  }
  const crown=new THREE.Mesh(new THREE.OctahedronGeometry(.16,1),new THREE.MeshStandardMaterial({
    color:tint,metalness:.25,roughness:.12,emissive:glow,emissiveIntensity:1.5
  }));
  crown.position.set(0,1.25,.02);group.add(crown);
  const crystals:THREE.Mesh[]=[];
  for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.075,0),new THREE.MeshStandardMaterial({
      color:tint,emissive:glow,emissiveIntensity:1.1,metalness:.3,roughness:.16
    }));
    crystal.position.set(Math.cos(angle)*.91,Math.sin(angle)*.91,.07);group.add(crystal);crystals.push(crystal);
  }
  const light=new THREE.PointLight(tint,2.6,7,2);light.position.z=.5;group.add(light);
  group.userData.ring=ring;group.userData.innerRing=innerRing;group.userData.vortex=vortex;
  group.userData.innerVortex=innerVortex;group.userData.crystals=crystals;group.userData.color=color;
  return group;
}

export function createRockeyEnergyFieldModel(x:number,y:number,z:number,radius:number):THREE.Group{
  const group=new THREE.Group();group.position.set(x,y+.035,z);
  const disk=new THREE.Mesh(new THREE.CircleGeometry(radius,64),new THREE.MeshBasicMaterial({
    color:0x147eff,transparent:true,opacity:.13,side:THREE.DoubleSide,depthWrite:false
  }));
  disk.rotation.x=-Math.PI/2;group.add(disk);
  const outer=new THREE.Mesh(new THREE.TorusGeometry(radius*.92,.075,8,72),new THREE.MeshBasicMaterial({
    color:0x60ddff,transparent:true,opacity:.92,toneMapped:false
  }));
  outer.rotation.x=Math.PI/2;group.add(outer);
  const middle=new THREE.Mesh(new THREE.TorusGeometry(radius*.67,.035,8,64),new THREE.MeshBasicMaterial({
    color:0x2e91ff,transparent:true,opacity:.75,toneMapped:false
  }));
  middle.rotation.x=Math.PI/2;group.add(middle);
  const inner=new THREE.Mesh(new THREE.TorusGeometry(radius*.32,.025,8,48),new THREE.MeshBasicMaterial({
    color:0xc0f7ff,transparent:true,opacity:.65,toneMapped:false
  }));
  inner.rotation.x=Math.PI/2;group.add(inner);
  const crystals:THREE.Mesh[]=[];
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),new THREE.MeshStandardMaterial({
      color:0x8deaff,emissive:0x168dff,emissiveIntensity:1.8,metalness:.25,roughness:.15,transparent:true,opacity:.88
    }));
    crystal.position.set(Math.cos(angle)*radius*.79,.2,Math.sin(angle)*radius*.79);
    crystal.scale.set(.65,1.9,.65);group.add(crystal);crystals.push(crystal);
  }
  group.add(new THREE.PointLight(0x2b9fff,4.5,radius*2.4,2));
  group.userData.outer=outer;group.userData.middle=middle;group.userData.inner=inner;
  group.userData.disk=disk;group.userData.crystals=crystals;group.userData.isEnergyField=true;
  return group;
}

export function createRockeyGateLaserModel(from:THREE.Vector3,to:THREE.Vector3,color:'blue'|'orange'):THREE.Group{
  const group=new THREE.Group();
  const tint=color==='blue'?0x56cfff:0xffa456;
  const glow=color==='blue'?0x168dff:0xff6b22;
  const direction=to.clone().sub(from),length=Math.max(.1,direction.length());
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,length,10,1,true),new THREE.MeshBasicMaterial({
    color:tint,transparent:true,opacity:.85,depthWrite:false,toneMapped:false
  }));
  beam.position.copy(from).add(to).multiplyScalar(.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(beam);
  const endpoint=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,1),new THREE.MeshBasicMaterial({color:glow,toneMapped:false}));
  endpoint.position.copy(to);group.add(endpoint);group.add(new THREE.PointLight(tint,3,5,2));
  group.userData.beam=beam;group.userData.endpoint=endpoint;return group;
}
