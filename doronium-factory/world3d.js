/* DORONIUM FACTORY — real-time 3D world renderer (Three.js)
 * Keeps the existing deterministic simulation and save schema; this module is presentation/input only.
 */
const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const palette = {
  ground: [0x193a3d, 0x1b4142, 0x203f40, 0x244746],
  water: 0x155b78, wood: 0x397b53, stone: 0x71818b, ironOre: 0x8c9ba7,
  copperOre: 0xc77d49, coal: 0x323b49, quartz: 0x65b5c9, goldOre: 0xd9b65c,
  diamond: 0x82e2ed, dori: 0x45b68b, relaySite: 0x65d8e4, coreSite: 0xc1a6ff
};
const buildingColor = {
  belt:0x6c8e9a, storage:0x627d8c, warehouse:0x617d91, solar:0x2c6c9b,
  wind:0x7babb8, coalgen:0x4c5d69, pump:0x3187a0, minerIron:0x74838e,
  minerCopper:0xb9794b, minerCoal:0x4c5866, doriFarm:0x3d8b69, smelter:0x9a6149,
  wiremill:0x9a8a5a, assembler:0x5e829e, lab:0x796ca4, market:0x9b895e,
  reactor:0x2d91a4, variantLab:0x4b91a8, cooling:0x5e9eb4, fusion:0x6254a4,
  relay:0x4e9fa7, core:0x8b72c5
};

export function createWorld3D(canvas, getState) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071522);
  scene.fog = new THREE.FogExp2(0x071522, 0.00062);
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const camera = new THREE.OrthographicCamera(-380,380,260,-260,1,6000);
  const target = new THREE.Vector3(18*32,0,14*32);
  let zoom = 1, width = 1, height = 1, lastSignature = "", hover = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPick = new THREE.Mesh(new THREE.PlaneGeometry(36*32,28*32), new THREE.MeshBasicMaterial({visible:false, side:THREE.DoubleSide}));
  groundPick.rotation.x = -Math.PI/2; groundPick.position.set(17.5*32,-0.15,13.5*32); scene.add(groundPick);
  const worldRoot = new THREE.Group(); scene.add(worldRoot);
  const machineRoot = new THREE.Group(); scene.add(machineRoot);
  const nodeRoot = new THREE.Group(); scene.add(nodeRoot);
  const markerRoot = new THREE.Group(); scene.add(markerRoot);
  const ambient = new THREE.HemisphereLight(0xb9e6ef,0x15242a,1.65); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe4b8,2.7);
  sun.position.set(-420,720,360); sun.castShadow=true; sun.shadow.mapSize.set(1536,1536);
  sun.shadow.camera.left=-900; sun.shadow.camera.right=900; sun.shadow.camera.top=900; sun.shadow.camera.bottom=-900;
  sun.shadow.bias=-0.00025; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x4a9fc1,0.8); fill.position.set(450,260,-500); scene.add(fill);
  const mat = (color, metalness=0.25, roughness=0.58, emissive=0x000000) => new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:0.35});
  const mats = {
    steel:mat(0x405a6d,0.72,0.34), dark:mat(0x142838,0.48,0.48), trim:mat(0x8ba6ae,0.62,0.32),
    cyan:mat(0x2b9cae,0.35,0.25,0x0b6170), gold:mat(0xd3ad62,0.55,0.3,0x55370b),
    glass: new THREE.MeshPhysicalMaterial({color:0x62c7df,metalness:0.18,roughness:0.12,transparent:true,opacity:0.76,transmission:0.12}),
    green:mat(0x2d8d65,0.18,0.65), crystal: new THREE.MeshPhysicalMaterial({color:0x66d8ee,metalness:0.25,roughness:0.12,transmission:0.28,transparent:true,opacity:0.92,emissive:0x063c5b,emissiveIntensity:0.8})
  };
  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const cylGeo = new THREE.CylinderGeometry(0.5,0.5,1,12);
  const sphereGeo = new THREE.SphereGeometry(1,14,10);
  const coneGeo = new THREE.ConeGeometry(0.5,1,8);
  const makeBox=(parent,x,y,z,sx,sy,sz,material,cast=true)=>{const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m};
  const makeCyl=(parent,x,y,z,r,h,material,segments=12)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m};
  const makeSphere=(parent,x,y,z,r,material)=>{const m=new THREE.Mesh(sphereGeo,material);m.position.set(x,y,z);m.scale.set(r,r,r);m.castShadow=true;parent.add(m);return m};
  const sharedGeometry=new Set([boxGeo,cylGeo,sphereGeo,coneGeo]);
  const sharedMaterials=new Set(Object.values(mats));
  function clear(group){for(const o of [...group.children]){group.remove(o);o.traverse(child=>{if(child.geometry&&!sharedGeometry.has(child.geometry))child.geometry.dispose();if(child.material){const list=Array.isArray(child.material)?child.material:[child.material];for(const material of list)if(!sharedMaterials.has(material))material.dispose();}});}}
  function cameraUpdate(){const span=440/zoom;camera.left=-span*width/height/2;camera.right=span*width/height/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();camera.position.set(target.x+500,720,target.z+620);camera.lookAt(target.x,0,target.z);}
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);cameraUpdate();}
  const tileMeshes=[];
  function rebuild(state){
    clear(worldRoot);clear(machineRoot);clear(nodeRoot);clear(markerRoot);
    const tileGeo=new THREE.BoxGeometry(31.7,2.2,31.7);
    const tileMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.92});
    const count=36*28, tiles=new THREE.InstancedMesh(tileGeo,tileMat,count);tiles.receiveShadow=true;
    const dummy=new THREE.Object3D(), color=new THREE.Color();let n=0;
    for(let z=0;z<28;z++)for(let x=0;x<36;x++){
      const node=state.nodes?.[x+","+z], seen=!!state.seen?.[x+","+z];
      const y=(node?.type==="water"?-1.0:0)+(Math.sin(x*1.7+z*.9)*0.12);
      dummy.position.set(x*32,y,z*32);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();tiles.setMatrixAt(n,dummy.matrix);
      const base=palette.ground[(x*13+z*7)%palette.ground.length];
      color.setHex(!seen?0x071522:node?.type==="water"?palette.water:base);tiles.setColorAt(n,color);n++;
    }
    worldRoot.add(tiles);
    const grid=new THREE.GridHelper(36*32,36,0x37636b,0x29484f);grid.position.set(17.5*32,0.25,13.5*32);grid.material.transparent=true;grid.material.opacity=0.28;worldRoot.add(grid);
    const waterMat=new THREE.MeshStandardMaterial({color:0x0b6382,transparent:true,opacity:0.62,roughness:0.2,metalness:0.15});
    for(const [key,node] of Object.entries(state.nodes||{})){
      const [x,z]=key.split(",").map(Number);if(!state.seen?.[key]||node.type==="water")continue;
      const g=new THREE.Group();g.position.set(x*32,0,z*32);nodeRoot.add(g);
      if(node.type==="wood"||node.type==="dori"){
        const trunk=node.type==="dori"?mats.gold:mat(0x654a32,0,0.9);makeCyl(g,0,6,0,2.5,12,trunk,7);
        for(let i=0;i<3;i++){const crown=new THREE.Mesh(coneGeo,node.type==="dori"?mats.green:mat(0x286d4e,0,0.9));crown.position.set((i-1)*2,15+i*2,0);crown.scale.set(12-i*1.4,15-i*2,12-i*1.4);crown.castShadow=true;g.add(crown);}
        if(node.type==="dori"){const orb=makeSphere(g,0,22,0,4,mats.crystal);orb.scale.set(0.7,1.15,0.7);}
      } else if(node.type==="relaySite"||node.type==="coreSite"){
        makeCyl(g,0,2,0,9,4,mats.dark,8);makeCyl(g,0,12,0,2,18,mats.trim,8);makeSphere(g,0,24,0,node.type==="coreSite"?5:3,mats.crystal);
      } else {
        const col=palette[node.type]||0x778995;
        for(let i=0;i<4;i++){const crystal=new THREE.Mesh(coneGeo,mat(col,0.35,0.28,col));crystal.position.set(((i%2)-.5)*8,4+(i%3)*2,(Math.floor(i/2)-.5)*8);crystal.scale.set(5+(i%2)*2,9+(i%3)*2,5+(i%2)*2);crystal.rotation.z=(i-1)*.13;crystal.castShadow=true;g.add(crystal);}
      }
    }
    for(const b of state.buildings||[]) addBuilding(b,state);
    addPlayer(state);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(7,0.35,8,40),new THREE.MeshBasicMaterial({color:0xf2d28a,transparent:true,opacity:0.7}));
    ring.rotation.x=Math.PI/2;ring.position.set((state.player.x)*32,2,(state.player.y)*32);markerRoot.add(ring);
    if(state.selectedBuilding){const b=state.buildings.find(v=>v.uid===state.selectedBuilding);if(b){const r=new THREE.Mesh(new THREE.TorusGeometry(15,0.65,8,48),new THREE.MeshBasicMaterial({color:0x70e7e9}));r.rotation.x=Math.PI/2;r.position.set(b.x*32,3,b.y*32);markerRoot.add(r);}}
    if(state.hoverCell&&state.selectedBuild){const h=state.hoverCell;const r=new THREE.Mesh(new THREE.BoxGeometry(29,1,29),new THREE.MeshBasicMaterial({color:0xf2d17d,transparent:true,opacity:0.28}));r.position.set(h.x*32,2,h.y*32);markerRoot.add(r);}
  }
  function addBuilding(b,state){
    const d=(state.buildingDefs||[]).find(v=>v.id===b.type);
    const g=new THREE.Group();g.position.set(b.x*32,1,b.y*32);g.rotation.y=-(b.dir||0)*Math.PI/2;machineRoot.add(g);
    const color=buildingColor[b.type]||0x54758a, shell=mat(color,0.62,0.34), active=b.status==="RUNNING";
    makeBox(g,0,3,0,25,5,25,mats.dark);
    makeBox(g,0,7,0,20,7,20,shell);
    makeBox(g,0,11,0,17,1.2,17,mats.trim);
    if(b.type==="belt"){
      makeBox(g,0,4,0,27,2,27,mats.steel);
      for(let i=-1;i<=1;i++)makeBox(g,i*7,5.2,0,2,0.6,22,mats.trim);
      makeBox(g,0,6,0,5,1,5,mats.gold);
    } else if(b.type==="solar"){
      makeBox(g,0,9,0,24,1.2,17,mat(0x17618d,0.65,0.2));for(let i=-1;i<=1;i++)makeBox(g,i*7,9.8,0,.6,.5,17,mats.trim);
    } else if(b.type==="wind"){
      makeCyl(g,0,26,0,1.3,32,mats.trim,10);const hub=makeSphere(g,0,43,0,2.5,mats.gold);
      for(let i=0;i<3;i++){const blade=makeBox(g,0,56,0,2,19,1,mats.trim);blade.rotation.z=i*Math.PI*2/3;}
    } else if(["minerIron","minerCopper","minerCoal","pump"].includes(b.type)){
      makeCyl(g,0,17,0,5,17,mats.trim,10);makeCyl(g,0,27,0,2,8,mats.gold,10);
      makeBox(g,0,35,0,16,4,13,shell);
    } else if(b.type==="doriFarm"){
      makeCyl(g,0,15,0,4,24,mats.gold,8);for(let i=0;i<5;i++){const orb=makeSphere(g,Math.cos(i*1.25)*8,26+Math.sin(i*1.25)*4,Math.sin(i*1.25)*8,5,mats.green);}
      makeSphere(g,0,31,0,4,mats.crystal);
    } else if(["smelter","coalgen","reactor","fusion","core"].includes(b.type)){
      makeCyl(g,0,22,0,b.type==="fusion"?10:7,25,shell,12);
      makeCyl(g,0,37,0,b.type==="fusion"?7:4,8,mats.trim,12);
      makeSphere(g,0,43,0,b.type==="fusion"?8:5,b.type==="fusion"||b.type==="reactor"?mats.crystal:mats.gold);
      for(let i=0;i<4;i++){const pipe=makeCyl(g,Math.cos(i*Math.PI/2)*12,13,Math.sin(i*Math.PI/2)*12,1.3,18,mats.trim,8);pipe.rotation.z=Math.PI/2;}
    } else if(["lab","variantLab"].includes(b.type)){
      makeBox(g,0,20,0,17,22,17,mats.glass);makeCyl(g,0,34,0,3,12,mats.gold,10);makeSphere(g,0,42,0,5,mats.crystal);
    } else if(b.type==="cooling"){
      makeCyl(g,0,20,0,9,28,mats.glass,14);makeCyl(g,0,36,0,7,5,mats.trim,14);
    } else {
      makeBox(g,0,17,0,20,15,20,shell);makeBox(g,0,26,0,13,3,13,mats.trim);
    }
    const glow=new THREE.Mesh(new THREE.TorusGeometry(b.type==="fusion"?13:10,0.7,8,40),new THREE.MeshBasicMaterial({color:active?0x5de5d4:0x496c7c,transparent:true,opacity:active?0.85:0.22}));
    glow.rotation.x=Math.PI/2;glow.position.y=4;g.add(glow);
    if(b.output){makeSphere(g,10,23,10,2.4,mats.gold);}
    g.userData={type:b.type,uid:b.uid,active};
  }
  function addPlayer(state){
    const g=new THREE.Group();g.position.set(state.player.x*32,1,state.player.y*32);markerRoot.add(g);
    makeCyl(g,0,9,0,4.3,13,mat(0x315d76,0.15,0.72),10);
    makeSphere(g,0,19,0,4.5,mat(0xe0b98b,0.05,0.82));
    makeBox(g,0,23,0,8,2.2,7,mats.gold);
    makeBox(g,-5,7,0,3,8,3,mats.dark);makeBox(g,5,7,0,3,8,3,mats.dark);
  }
  function signature(s){return [s.player?.x,s.player?.y,s.buildings?.map(b=>[b.uid,b.type,b.x,b.y,b.dir,b.status,b.output?.qty].join(":")).join("|"),Object.keys(s.seen||{}).length,Object.keys(s.nodes||{}).length,s.selectedBuilding,s.selectedBuild,s.hoverCell?.x,s.hoverCell?.y].join(";");}
  function render(state){if(!state)return;resizeIfNeeded();const sig=signature(state);if(sig!==lastSignature){rebuild(state);lastSignature=sig;}
    const t=performance.now()*0.001;sun.intensity=2.25+Math.sin(t*.08)*.18;
    machineRoot.children.forEach(g=>{if(g.userData?.type==="wind"){const blade=g.children.find(o=>o.geometry?.type==="BoxGeometry"&&o.position.y>45);if(blade)blade.rotation.y=t*1.6;}});
    renderer.render(scene,camera);
  }
  function resizeIfNeeded(){const r=canvas.getBoundingClientRect();if(Math.abs(r.width-width)>1||Math.abs(r.height-height)>1)resize();}
  function pickTile(clientX,clientY){const r=canvas.getBoundingClientRect();pointer.x=((clientX-r.left)/r.width)*2-1;pointer.y=-((clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(groundPick,false)[0];if(!hit)return null;const x=Math.floor(hit.point.x/32+0.5),z=Math.floor(hit.point.z/32+0.5);return x>=0&&z>=0&&x<36&&z<28?{x,z}:null;}
  function pan(dx,dy){const scale=1/zoom;target.x=clamp(target.x-dx*0.9*scale,0,35*32);target.z=clamp(target.z-dy*0.9*scale,0,27*32);cameraUpdate();}
  function setZoom(value){zoom=clamp(value,.55,1.8);cameraUpdate();}
  function center(x,y){target.set(x*32,0,y*32);cameraUpdate();}
  resize();cameraUpdate();
  return {render,pickTile,pan,setZoom,center,get zoom(){return zoom;}};
}
