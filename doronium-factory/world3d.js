/* DORONIUM FACTORY — topographic 3D world, underground mine and industrial renderer */
import { WORLD_W, WORLD_H, MINE_W, MINE_H, biomeAt, terrainHeightAt, mineFloorY, mineTunnelAt, biomeGroundColor } from "./terrain-system.js?v=3";
let THREE = null;
try { THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js"); }
catch (error) { console.warn("Three.js CDN unavailable; using the compatibility renderer.", error); }

function createFallbackWorld(canvas) {
  const ctx = canvas.getContext("2d");
  let cx=64, cy=52, zoom=1, width=1, height=1;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function render(state) {
    if(!ctx)return;
    const r=canvas.getBoundingClientRect(); width=Math.max(1,r.width); height=Math.max(1,r.height);
    const dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=Math.floor(width*dpr); canvas.height=Math.floor(height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle="#071522";ctx.fillRect(0,0,width,height);
    const size=34*zoom,left=width/2-cx*size,top=height/2-cy*size;
    const minX=Math.max(0,Math.floor(-left/size)),maxX=Math.min(WORLD_W-1,Math.ceil((width-left)/size));
    const minY=Math.max(0,Math.floor(-top/size)),maxY=Math.min(WORLD_H-1,Math.ceil((height-top)/size));
    const buildingByCell=new Map((state.buildings||[]).filter(b=>b.layer!=="mine").map(b=>[b.x+","+b.y,b]));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=left+x*size,py=top+y*size,key=x+","+y,node=state.nodes?.[key],seen=!!state.seen?.[key];
      const biome=biomeAt(x,y);ctx.fillStyle=!seen?"#091a27":node?.type==="water"?"#14516a":({forest:"#315b42",meadow:"#3d674d",wetland:"#354f45",desert:"#92764d",highlands:"#687477",frost:"#81939a",crystal:"#3f6670",volcanic:"#5b4540"})[biome]||"#3d674d";
      ctx.fillRect(px,py,size-1,size-1);
      if(seen&&node&&node.type!=="water"){ctx.font=Math.max(10,size*.42)+"px sans-serif";ctx.textAlign="center";ctx.fillStyle="#d5e8e8";ctx.fillText(({wood:"🌲",water:"💧",dori:"🌳",mineEntrance:"⛏"})[node.type]||"◆",px+size/2,py+size*.63);}
      const b=buildingByCell.get(key);
      if(b){ctx.fillStyle=b.status==="RUNNING"?"#247c85":"#29485c";ctx.fillRect(px+size*.13,py+size*.13,size*.74,size*.74);ctx.strokeStyle="#75d4d7";ctx.strokeRect(px+size*.13,py+size*.13,size*.74,size*.74);ctx.font=Math.max(9,size*.38)+"px sans-serif";ctx.fillStyle="#e2f1f3";ctx.fillText(({fusion:"🌌",reactor:"🔷",solar:"☀️",doriFarm:"🌳",lab:"🔬"})[b.type]||"⚙️",px+size/2,py+size*.62);}
    }
    const px=left+state.player.x*size+size/2,py=top+state.player.y*size+size/2;
    ctx.beginPath();ctx.fillStyle="#f2d28a";ctx.arc(px,py,Math.max(5,size*.18),0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#071522";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText("👷",px,py+4);
    ctx.fillStyle="#d8e8ec";ctx.font="11px sans-serif";ctx.textAlign="left";ctx.fillText("WebGL 미지원 · 호환 모드",12,height-14);
  }
  function pickTile(x,y){const r=canvas.getBoundingClientRect(),size=34*zoom,left=r.width/2-cx*size,top=r.height/2-cy*size;const tx=Math.floor((x-r.left-left)/size),ty=Math.floor((y-r.top-top)/size);return tx>=0&&ty>=0&&tx<WORLD_W&&ty<WORLD_H?{x:tx,y:ty,z:ty}:null;}
  return {backend:"canvas2d-fallback",render,pickTile,pickTarget(){return null},pan(dx,dy){cx-=dx/(34*zoom);cy-=dy/(34*zoom);},orbit(dx,dy){cx-=dx/(34*zoom);cy-=dy/(34*zoom);},setZoom(v){zoom=clamp(v,.55,1.8);},center(x,y){cx=x;cy=y;},setViewMode(){},inspect(){return {machineCount:0,beltCount:0,beltItemMeshes:0,viewMode:"map",playerVisible:true,firstPersonHandsVisible:false,worldWidth:WORLD_W,worldHeight:WORLD_H,mineLevels:5}},get zoom(){return zoom;}};
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const palette = {
  ground: [0x193a3d, 0x1b4142, 0x203f40, 0x244746],
  water: 0x155b78, wood: 0x397b53, stone: 0x71818b, ironOre: 0x8c9ba7,
  copperOre: 0xc77d49, coal: 0x323b49, quartz: 0x65b5c9, goldOre: 0xd9b65c,
  diamond: 0x82e2ed, dori: 0x45b68b, relaySite: 0x65d8e4, coreSite: 0xc1a6ff
};
const buildingColor = {
  belt:0x6c8e9a, beltAdaptive:0x48b99f, storage:0x627d8c, warehouse:0x617d91, solar:0x2c6c9b,
  wind:0x7babb8, coalgen:0x4c5d69, pump:0x3187a0, minerIron:0x74838e,
  minerCopper:0xb9794b, minerCoal:0x4c5866, doriFarm:0x3d8b69, smelter:0x9a6149,
  wiremill:0x9a8a5a, assembler:0x5e829e, lab:0x796ca4, market:0x9b895e,
  reactor:0x2d91a4, variantLab:0x4b91a8, cooling:0x5e9eb4, fusion:0x6254a4,
  relay:0x4e9fa7, core:0x8b72c5
};
const crystalSpecs={
 doronium_normal:{color:0x63d8e8,shape:"octa",emissive:0x0a5265},
 doronium_blue:{color:0x288ff0,shape:"hex",emissive:0x082a70},
 doronium_red:{color:0xf05a65,shape:"tetra",emissive:0x6a0b18},
 doronium_iron:{color:0x9aa9b7,shape:"dodeca",emissive:0x343b48},
 doronium_orange:{color:0xffa344,shape:"pent",emissive:0x703007},
 doronium_thermal:{color:0xff5937,shape:"icosa",emissive:0x8b1806},
 doronium_cold:{color:0x8feaff,shape:"spike",emissive:0x17618a},
 doronium_black:{color:0x343044,shape:"block",emissive:0x401274},
 doronium_clear:{color:0xc7f7ff,shape:"square",emissive:0x427c9b},
 doronium_special:{color:0xf4d66d,shape:"ring",emissive:0x76520b},
 doronium_limited:{color:0xe7b65c,shape:"crown",emissive:0x8a5412},
 doronium_crystal:{color:0x8aafff,shape:"faceted",emissive:0x332e90},
 doronium_resonant:{color:0x55e1c3,shape:"knot",emissive:0x075e54},
 doronium_prismatic:{color:0xd68aff,shape:"tri",emissive:0x592b8d},
 doronium_void:{color:0x5b3b86,shape:"void",emissive:0x230d4a},
 infinity:{color:0xb5f5ff,shape:"infinity",emissive:0x347bcb}
};
export const DORONIUM_CRYSTAL_MODELS=Object.keys(crystalSpecs);
export const DORONIUM_CRYSTAL_MODEL_SHAPES=Object.fromEntries(Object.entries(crystalSpecs).map(([id,spec])=>[id,spec.shape]));
const itemColors={wood:0x956b43,stone:0x87929a,ironOre:0x9da8b4,copperOre:0xd58b58,coal:0x303741,water:0x3badd8,quartz:0x77c9df,goldOre:0xd9b65c,diamond:0x9bf2ff,ironPlate:0xaebbc4,wire:0xd29c45,circuit:0x48b9a2,doriMeat:0xc8796e};
function crystalGeometry(id){
 const shape=crystalSpecs[id]?.shape||"octa";
 switch(shape){
  case "octa":return new THREE.OctahedronGeometry(1,0);
  case "hex":return new THREE.CylinderGeometry(.82,.82,1.8,6,1,false);
  case "tetra":return new THREE.TetrahedronGeometry(1,0);
  case "dodeca":return new THREE.DodecahedronGeometry(1,0);
  case "pent":return new THREE.CylinderGeometry(.7,.95,1.9,5,1,false);
  case "icosa":return new THREE.IcosahedronGeometry(1,0);
  case "spike":return new THREE.ConeGeometry(.92,1.9,6,3,false);
  case "block":return new THREE.BoxGeometry(1.55,1.55,1.55);
  case "square":return new THREE.CylinderGeometry(.54,.62,1.8,4,1,false);
  case "ring":return new THREE.TorusGeometry(.72,.28,8,7);
  case "crown":return new THREE.ConeGeometry(.95,1.9,7,2,false);
  case "faceted":return new THREE.IcosahedronGeometry(1,2);
  case "knot":return new THREE.TorusKnotGeometry(.58,.18,48,8,2,3);
  case "tri":return new THREE.CylinderGeometry(.25,1,2,3,2,false);
  case "void":return new THREE.DodecahedronGeometry(1.12,2);
  case "infinity":return new THREE.TorusKnotGeometry(.78,.22,64,10,2,5);
  default:return new THREE.OctahedronGeometry(1,0);
 }
}
function makeCrystal(parent,id,x,y,z,size=4){
 const spec=crystalSpecs[id]||crystalSpecs.doronium_normal;
 const material=new THREE.MeshPhysicalMaterial({color:spec.color,metalness:.4,roughness:.15,transmission:(id==="doronium_clear"||id==="doronium_cold") ? .22 : .03,transparent:id==="doronium_clear"||id==="doronium_cold"||id==="doronium_void",opacity:id==="doronium_clear" ? .78 : .95,emissive:spec.emissive,emissiveIntensity:.55,clearcoat:.9,clearcoatRoughness:.12});
 const mesh=new THREE.Mesh(crystalGeometry(id),material);mesh.position.set(x,y,z);mesh.scale.set(size,size*1.25,size);mesh.rotation.set(.18,.22,.08);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,24),new THREE.LineBasicMaterial({color:spec.color,transparent:true,opacity:.38}));mesh.add(edges);
 mesh.userData.baseScale=mesh.scale.clone();return mesh;
}

export function createCrystalViewer(canvas,id){
  if(!THREE){
    const ctx=canvas.getContext("2d");let raf=0;
    const draw=()=>{const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);const spec=crystalSpecs[id]||crystalSpecs.doronium_normal;ctx.fillStyle="#0b1b2b";ctx.fillRect(0,0,r.width,r.height);ctx.shadowColor="#"+spec.color.toString(16).padStart(6,"0");ctx.shadowBlur=25;ctx.fillStyle="#"+spec.color.toString(16).padStart(6,"0");ctx.beginPath();ctx.moveTo(r.width/2,r.height*.18);ctx.lineTo(r.width*.68,r.height*.53);ctx.lineTo(r.width/2,r.height*.83);ctx.lineTo(r.width*.32,r.height*.53);ctx.closePath();ctx.fill();ctx.shadowBlur=0;};
    draw();return {dispose(){cancelAnimationFrame(raf);}};
  }
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:"high-performance"});}
  catch(error){console.warn("Crystal viewer WebGL unavailable",error);return {dispose(){}};}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x081827);scene.fog=new THREE.Fog(0x081827,8,18);
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(3.4,2.8,6.8);camera.lookAt(0,1,0);
  scene.add(new THREE.HemisphereLight(0xc8f2ff,0x18283b,1.9));
  const key=new THREE.DirectionalLight(0xffedcf,3.2);key.position.set(-3,6,4);scene.add(key);
  const rim=new THREE.PointLight((crystalSpecs[id]||crystalSpecs.doronium_normal).color,2.2,12);rim.position.set(2,2.8,-2);scene.add(rim);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.35,.34,48),new THREE.MeshStandardMaterial({color:0x243c50,metalness:.8,roughness:.28}));pedestal.position.y=-.48;pedestal.castShadow=true;pedestal.receiveShadow=true;scene.add(pedestal);
  const trim=new THREE.Mesh(new THREE.TorusGeometry(1.14,.035,8,48),new THREE.MeshStandardMaterial({color:0xc9a969,metalness:.7,roughness:.25,emissive:0x4a3108}));trim.position.y=-.28;scene.add(trim);
  const model=new THREE.Group();scene.add(model);const stone=makeCrystal(model,id,0,.72,0,1.05);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(3,48),new THREE.MeshStandardMaterial({color:0x10283b,metalness:.35,roughness:.78}));floor.rotation.x=-Math.PI/2;floor.position.y=-.67;scene.add(floor);
  let raf=0,alive=true;const start=performance.now();
  function resize(){const r=canvas.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;if(observer)observer.observe(canvas);resize();
  function frame(now){if(!alive)return;const t=(now-start)/1000;model.rotation.y=t*.68;stone.rotation.x=.15+Math.sin(t*.7)*.12;stone.rotation.z=Math.cos(t*.6)*.08;stone.scale.setScalar(1+Math.sin(t*1.7)*.025);rim.intensity=1.8+Math.sin(t*2)*.45;renderer.render(scene,camera);raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  return {dispose(){alive=false;cancelAnimationFrame(raf);if(observer)observer.disconnect();model.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(v=>v.dispose());}});pedestal.geometry.dispose();pedestal.material.dispose();trim.geometry.dispose();trim.material.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();}};
}

export function createWorld3D(canvas, getState) {
  if (!THREE) return createFallbackWorld(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071522);
  scene.fog = new THREE.FogExp2(0x071522, 0.00092);
  const compactDevice = window.matchMedia("(max-width: 760px)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const memoryGB = Number(navigator.deviceMemory) || 4;
  const cpuCores = Number(navigator.hardwareConcurrency) || 4;
  const lowEndDevice = compactDevice || memoryGB <= 4 || cpuCores <= 4;
  const highEndDevice = !compactDevice && memoryGB >= 12 && cpuCores >= 8;
  const shadowsEnabled = highEndDevice;
  const basePixelRatio = Math.min(Number(window.devicePixelRatio) || 1, compactDevice ? .88 : lowEndDevice ? 1.0 : highEndDevice ? 1.2 : 1.05);
  const minPixelRatio = Math.min(basePixelRatio, compactDevice ? .55 : lowEndDevice ? .6 : .65);
  let currentPixelRatio = basePixelRatio, slowFrames = 0, fastFrames = 0, renderCount = 0, rebuildCount = 0;
  let perfFrameTotal=0,perfFrameCount=0,measuredFps=60,measuredFrameMs=16.67;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:!compactDevice && memoryGB >= 8 && cpuCores >= 8, alpha:false, powerPreference:"high-performance"}); }
  catch (error) { console.warn("WebGL unavailable; using the compatibility renderer.", error); return createFallbackWorld(canvas); }
  renderer.setPixelRatio(currentPixelRatio);
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const mapCamera = new THREE.OrthographicCamera(-380,380,260,-260,1,6000);
  const gameCamera = new THREE.PerspectiveCamera(74,1,.1,1450);
  scene.add(gameCamera);
  let camera=mapCamera, activeViewMode="map";
  const target = new THREE.Vector3(64*32,terrainHeightAt(64,52),52*32);
  let zoom = 1, width = 1, height = 1, lastSignature = "", yaw = 0.68, pitch = 0.73;
  const raycaster = new THREE.Raycaster();
  let stateLayerForPicking="surface";
  const pointer = new THREE.Vector2();
  const groundPick = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W*32,WORLD_H*32), new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,colorWrite:false}));
  groundPick.rotation.x = -Math.PI/2; groundPick.position.set((WORLD_W-1)*16,-52,(WORLD_H-1)*16); scene.add(groundPick);
  const worldRoot = new THREE.Group(); scene.add(worldRoot);
  const terrainChunks = [];
  const machineRoot = new THREE.Group(); scene.add(machineRoot);
  const nodeRoot = new THREE.Group(); scene.add(nodeRoot);
  const nodeGroupsByKey = new Map();
  let nodeBatches=null,nodeHitMesh=null;
  const nodeBatchMeshes=[];
  const nodeBatchedKeys=new Set();
  const markerRoot = new THREE.Group(); scene.add(markerRoot);
  const selectionRoot = new THREE.Group(); scene.add(selectionRoot);
  const selectionRing = new THREE.Mesh(new THREE.TorusGeometry(15,.65,8,48),new THREE.MeshBasicMaterial({color:0x70e7e9}));
  selectionRing.rotation.x=Math.PI/2;selectionRoot.add(selectionRing);selectionRoot.visible=false;
  const mineRoot = new THREE.Group(); scene.add(mineRoot);
  const hoverRoot = new THREE.Group(); scene.add(hoverRoot);
  const hoverFillMaterial = new THREE.MeshBasicMaterial({color:0x6de4bb,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
  const hoverEdgeMaterial = new THREE.LineBasicMaterial({color:0x6de4bb,transparent:true,opacity:.9});
  const hoverFill = new THREE.Mesh(new THREE.BoxGeometry(30,1,30),hoverFillMaterial);
  const hoverEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(30,2,30)),hoverEdgeMaterial);
  hoverRoot.add(hoverFill,hoverEdge);hoverRoot.visible=false;
  const ambient = new THREE.HemisphereLight(0xb9e6ef,0x15242a,1.65); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe4b8,2.7);
  sun.position.set(-420,720,360); sun.castShadow=shadowsEnabled; sun.shadow.mapSize.set(shadowsEnabled?512:256,shadowsEnabled?512:256);
  sun.shadow.camera.left=-900; sun.shadow.camera.right=900; sun.shadow.camera.top=900; sun.shadow.camera.bottom=-900;
  sun.shadow.bias=-0.00025; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x4a9fc1,0.8); fill.position.set(450,260,-500); scene.add(fill);
  const mat = (color, metalness=0.25, roughness=0.58, emissive=0x000000) => new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:0.35});
  const mats = {
    steel:mat(0x405a6d,0.72,0.34), dark:mat(0x142838,0.48,0.48), trim:mat(0x8ba6ae,0.62,0.32),
    cyan:mat(0x2b9cae,0.35,0.25,0x0b6170), gold:mat(0xd3ad62,0.55,0.3,0x55370b),
    glass: new THREE.MeshPhysicalMaterial({color:0x62c7df,metalness:0.18,roughness:0.12,transparent:true,opacity:0.76,transmission:0.12}),
    green:mat(0x2d8d65,0.18,0.65), woodLeaves:mat(0x28754e,0.04,0.92), woodTrunk:mat(0x65412e,0.03,0.92), doriTrunk:mat(0x9b7044,0.08,0.85), crystal: new THREE.MeshPhysicalMaterial({color:0x66d8ee,metalness:0.25,roughness:0.12,transmission:0.28,transparent:true,opacity:0.92,emissive:0x063c5b,emissiveIntensity:0.8})
  };
  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const cylGeo = new THREE.CylinderGeometry(0.5,0.5,1,12);
  const sphereGeo = new THREE.SphereGeometry(1,14,10);
  const coneGeo = new THREE.ConeGeometry(0.5,1,8);
  const makeBox=(parent,x,y,z,sx,sy,sz,material,cast=true)=>{const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m};
  const cylinderGeometryCache = new Map([[12,cylGeo]]);
  const makeCyl=(parent,x,y,z,r,h,material,segments=12)=>{
    let geo=cylinderGeometryCache.get(segments);
    if(!geo){geo=new THREE.CylinderGeometry(.5,.5,1,segments);cylinderGeometryCache.set(segments,geo);sharedGeometry.add(geo);}
    const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(r*2,h,r*2);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const makeSphere=(parent,x,y,z,r,material)=>{const m=new THREE.Mesh(sphereGeo,material);m.position.set(x,y,z);m.scale.set(r,r,r);m.castShadow=true;parent.add(m);return m};
  const sharedGeometry=new Set([boxGeo,cylGeo,sphereGeo,coneGeo]);
  const terrainTileGeometry=new THREE.BoxGeometry(31.7,1,31.7);
  const terrainTileMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94});
  sharedGeometry.add(terrainTileGeometry);
  const firstPersonRig=new THREE.Group();gameCamera.add(firstPersonRig);
  makeBox(firstPersonRig,-.52,-.58,-1.05,.25,.34,.82,mat(0x315d76,.18,.72));
  makeBox(firstPersonRig,.52,-.58,-1.05,.25,.34,.82,mat(0x315d76,.18,.72));
  makeBox(firstPersonRig,.52,-.48,-.66,.22,.24,.42,mat(0x94714e,.12,.84));
  makeBox(firstPersonRig,.52,-.30,-.74,.92,.13,.14,mats.gold);
  makeBox(firstPersonRig,.52,-.20,-.74,.10,.38,.13,mats.trim);

  const sharedMaterials=new Set(Object.values(mats));
  sharedMaterials.add(terrainTileMaterial);
  const waterMaterial=new THREE.MeshStandardMaterial({color:0x0b6382,transparent:true,opacity:.68,roughness:.2,metalness:.15});
  const waterBlockGeometry=new THREE.BoxGeometry(29,1.2,29);
  const rippleGeometry=new THREE.BoxGeometry(8,.18,1.2);
  const rippleMaterial=new THREE.MeshBasicMaterial({color:0x6bd8e6,transparent:true,opacity:.48});
  const nodeHitGeometry=new THREE.BoxGeometry(1,1,1);
  const nodeHitMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
  const treeTrunkGeometry=new THREE.CylinderGeometry(3,3,24,8);
  const doriCrystalGeometry=crystalGeometry("doronium_normal");
  sharedMaterials.add(waterMaterial);sharedMaterials.add(rippleMaterial);sharedMaterials.add(nodeHitMaterial);
  sharedGeometry.add(waterBlockGeometry,rippleGeometry,nodeHitGeometry,treeTrunkGeometry,doriCrystalGeometry);
  function disposeObject(root){root.traverse(child=>{if(child.geometry&&!sharedGeometry.has(child.geometry))child.geometry.dispose();if(child.material){const list=Array.isArray(child.material)?child.material:[child.material];for(const material of list)if(!sharedMaterials.has(material))material.dispose();}});}
  function clear(group){for(const o of [...group.children]){group.remove(o);disposeObject(o);}}
  function syncBeltItemVisual(anim,b){
    if(!anim.itemGroup)return;
    const signature=b.item?String(b.item.id)+":"+Math.min(8,Math.max(1,Math.ceil(Number(b.item.qty)||1))):"";
    if(anim.itemSignature===signature)return;
    clear(anim.itemGroup);
    anim.itemSignature=signature;
    if(!b.item)return;
    const count=Math.min(8,Math.max(1,Math.ceil(Number(b.item.qty)||1)));
    for(let i=0;i<count;i++){
      const id=b.item.id;let mesh;
      if(crystalSpecs[id])mesh=makeCrystal(anim.itemGroup,id,0,0,0,2.0);
      else if(id==="wire"){mesh=new THREE.Mesh(new THREE.TorusGeometry(1.45,.42,7,20),mat(itemColors[id]||0xc89d57,.6,.24));anim.itemGroup.add(mesh);mesh.rotation.x=Math.PI/2;}
      else if(id==="wood"){mesh=new THREE.Mesh(new THREE.CylinderGeometry(.72,.86,2.8,8),mat(itemColors[id],.12,.82));anim.itemGroup.add(mesh);mesh.rotation.z=Math.PI/2;}
      else if(id==="stone"){mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(1.25,0),mat(itemColors[id],.05,.9));anim.itemGroup.add(mesh);mesh.scale.set(2.4,2.0,2.4);}
      else if(id==="ironOre"||id==="goldOre"){mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,0),mat(itemColors[id],.42,.38));anim.itemGroup.add(mesh);mesh.scale.set(2.35,2.0,2.35);}
      else if(id==="copperOre"||id==="quartz"||id==="diamond"){mesh=new THREE.Mesh(id==="diamond"?new THREE.OctahedronGeometry(1.2,0):new THREE.ConeGeometry(1.05,2.2,6,1),mat(itemColors[id],.38,.24));anim.itemGroup.add(mesh);mesh.scale.set(2.1,2.2,2.1);}
      else if(id==="water"||id==="doriMeat"){mesh=makeSphere(anim.itemGroup,0,0,0,1.7,new THREE.MeshPhysicalMaterial({color:itemColors[id]||0x66b9db,metalness:.05,roughness:.2,transparent:id==="water",opacity:id==="water"?.68:1,transmission:id==="water"?.45:0}));}
      else if(id==="ironPlate"){mesh=new THREE.Mesh(boxGeo,mat(itemColors[id],.78,.22));anim.itemGroup.add(mesh);mesh.scale.set(3,.55,2.5);}
      else if(id==="circuit"){mesh=new THREE.Mesh(boxGeo,mat(itemColors[id],.48,.26,0x073a35));anim.itemGroup.add(mesh);mesh.scale.set(2.6,.75,2.2);}
      else{mesh=new THREE.Mesh(boxGeo,mat(itemColors[id]||0xa8bac4,.46,.3));anim.itemGroup.add(mesh);mesh.scale.set(2.5,2.2,2.5);}
      mesh.userData.itemIndex=i;mesh.position.y=8.6;mesh.castShadow=true;
    }
  }
  function syncOutputVisual(g,anim,b){
    const signature=b.output?.id||"";
    if(anim.outputSignature===signature)return;
    if(anim.outputMesh){g.remove(anim.outputMesh);disposeObject(anim.outputMesh);anim.outputMesh=null;}
    anim.outputSignature=signature;
    if(b.output){
      if(crystalSpecs[b.output.id])anim.outputMesh=makeCrystal(g,b.output.id,11,24,10,2.6);
      else anim.outputMesh=makeSphere(g,11,24,10,2.4,mat(itemColors[b.output.id]||0xf0c46a,.3,.28));
      anim.outputMesh.userData.baseScale=anim.outputMesh.scale.clone();
    }
  }
  function cameraUpdate(){camera=mapCamera;const span=860/zoom;mapCamera.left=-span*width/height/2;mapCamera.right=span*width/height/2;mapCamera.top=span/2;mapCamera.bottom=-span/2;mapCamera.updateProjectionMatrix();const distance=1800,horizontal=Math.cos(pitch)*distance;mapCamera.position.set(target.x+Math.sin(yaw)*horizontal,Math.sin(pitch)*distance,target.z+Math.cos(yaw)*horizontal);mapCamera.lookAt(target.x,terrainHeightAt(target.x/32,target.z/32),target.z);}
  function updateGameCamera(state){
    const motion=state.playerMotion||{x:state.player.x,z:state.player.y,yaw:0,pitch:-.12,y:0};
    const px=motion.x*32,pz=motion.z*32,py=(state.player?.layer==="mine"?mineFloorY(state.player.mineLevel):surfaceY(state,Math.floor(motion.x+.5),Math.floor(motion.z+.5)) )+(Number(motion.y)||0),yaw=Number(motion.yaw)||0,pitch=Number(motion.pitch??-.12);
    const fx=-Math.sin(yaw),fz=-Math.cos(yaw);
    camera=gameCamera;
    const targetFar=state.player?.layer==="mine"?520:activeViewMode==="first"?980:1320;
    if(gameCamera.far!==targetFar){gameCamera.far=targetFar;gameCamera.updateProjectionMatrix();}
    if(activeViewMode==="first"){
      gameCamera.position.set(px,22+py,pz);
      gameCamera.rotation.order="YXZ";gameCamera.rotation.set(pitch,yaw,0);
    }else{
      const underground=state.player?.layer==="mine",distance=underground?66:112,cameraHeight=underground?21:66,lookHeight=underground?14:18;
      gameCamera.position.set(px-fx*distance,cameraHeight+py,pz-fz*distance);
      gameCamera.lookAt(px+fx*(underground?24:40),lookHeight+py,pz+fz*(underground?24:40));
    }
    gameCamera.updateMatrixWorld(true);
    if(playerModel)playerModel.visible=activeViewMode!=="first";firstPersonRig.visible=activeViewMode==="first";
  }
  function pickTarget(maxDistance=190){
    raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
    const roots=stateLayerForPicking==="mine"
      ?mineRoot.children
      :[...(nodeHitMesh&&nodeHitMesh.count?[nodeHitMesh]:[]),...nodeGroupsByKey.values(),...machineRoot.children];
    const hits=raycaster.intersectObjects(roots,true);
    for(const hit of hits){
      if(hit.distance>maxDistance)continue;
      if(hit.object===nodeHitMesh){
        const target=nodeHitMesh.userData.targets?.[hit.instanceId];
        if(target)return {...target.targetKind,...target.cell,distance:hit.distance};
        continue;
      }
      let root=hit.object;
      while(root&&root.parent!==nodeRoot&&root.parent!==machineRoot&&root.parent!==mineRoot)root=root.parent;
      if(!root?.userData?.targetKind)continue;
      return {...root.userData.targetKind,...root.userData.cell,distance:hit.distance};
    }
    return null;
  }
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);gameCamera.aspect=width/height;gameCamera.updateProjectionMatrix();cameraUpdate();}
  let playerModel=null,playerRing=null;
  function surfaceY(state,x,z){const key=x+","+z,v=state.flattened?.[key];return v&&typeof v==="object"&&Number.isFinite(v.height)?v.height:terrainHeightAt(x,z);}
  function buildMine(state){
    const level=clamp(Number(state.player?.mineLevel)||1,1,5),floorY=mineFloorY(level);
    const rock=mat(0x34414a,.12,.95),rail=mat(0x8b9aa0,.72,.42),lampMat=mat(0xf0c76c,.22,.24,0x9a5a13);
    const cells=[];for(let z=0;z<MINE_H;z++)for(let x=0;x<MINE_W;x++)if(mineTunnelAt(x,z))cells.push({x,z});
    const floorGeo=new THREE.BoxGeometry(31.7,3,31.7),floorMat=mat(0x444c50,.1,.92);
    const floors=new THREE.InstancedMesh(floorGeo,floorMat,cells.length),dummy=new THREE.Object3D();
    cells.forEach((p,i)=>{dummy.position.set(p.x*32,floorY-1.5,p.z*32);dummy.updateMatrix();floors.setMatrixAt(i,dummy.matrix);});
    floors.receiveShadow=true;mineRoot.add(floors);
    for(const p of cells){
      const x=p.x*32,z=p.z*32;
      if(!mineTunnelAt(p.x-1,p.z))makeBox(mineRoot,x-16,floorY+13,z,3,29,32,rock);
      if(!mineTunnelAt(p.x+1,p.z))makeBox(mineRoot,x+16,floorY+13,z,3,29,32,rock);
      if(!mineTunnelAt(p.x,p.z-1))makeBox(mineRoot,x,floorY+13,z-16,32,29,3,rock);
      if(!mineTunnelAt(p.x,p.z+1))makeBox(mineRoot,x,floorY+13,z+16,32,29,3,rock);
      if((p.x===8||p.x===14||p.x===20||p.x===26||p.x===32)&&p.z===12){
        for(const sx of [-13,13])makeBox(mineRoot,x+sx,floorY+13,z,2.8,26,3.4,rail);
        makeBox(mineRoot,x,floorY+26,z,29,3,3.4,rail);
      }
      if(highEndDevice&&p.x%6===0&&p.z===12){makeCyl(mineRoot,x+11,floorY+24,z,1.1,2,lampMat,8);const light=new THREE.PointLight(0xf2bd65,.55,112,2);light.position.set(x,floorY+23,z);mineRoot.add(light);}
    }
    for(const node of Object.values(state.mineDeposits||{})){
      if(node.level!==level||node.amount<=0)continue;
      const g=new THREE.Group();g.position.set(node.x*32,node.depthY,node.z*32);
      g.userData={cell:{x:node.x,z:node.z},targetKind:{kind:"resource",type:node.type,mine:true,level,depthY:node.depthY}};mineRoot.add(g);
      makeBox(g,0,-2,0,13,8,13,mat(0x1a2932,.08,.98));
      if(String(node.type).startsWith("doronium_"))makeCrystal(g,node.type,0,5,0,3.1);
      else{
        const color=palette[node.type]||0x81919d,ore=mat(color,.5,.3,color);
        for(let i=0;i<4;i++){const m=new THREE.Mesh(i%2?new THREE.OctahedronGeometry(2.7,0):new THREE.IcosahedronGeometry(2.8,0),ore);m.position.set((i%2?1:-1)*(3+i%3),4+(i%3)*1.8,(i<2?-1:1)*(2+i));m.rotation.set(i*.3,i*.6,i*.2);m.castShadow=true;g.add(m);}
      }
      if(highEndDevice){const glow=new THREE.PointLight(String(node.type).startsWith("doronium_")?0x55dcec:0x8ca8b5,.35,34,2);glow.position.y=8;g.add(glow);}
    }
    const addLift=(x,kind)=>{
      const g=new THREE.Group();g.position.set(x*32,floorY,12*32);g.userData={cell:{x,z:12},targetKind:{kind}};mineRoot.add(g);
      makeBox(g,0,4,0,19,8,19,mats.dark);makeCyl(g,0,14,0,5,20,mats.trim,10);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(10,.65,8,36),new THREE.MeshBasicMaterial({color:kind==="mineExit"?0x7ed9c3:0xf0c76c}));ring.rotation.x=Math.PI/2;ring.position.y=24;g.add(ring);
      const light=new THREE.PointLight(kind==="mineExit"?0x6ed6c1:0xf2bd65,1.15,76,2);light.position.y=23;g.add(light);
    };
    addLift(3,"mineExit");addLift(36,"mineDescend");
    for(const b of state.buildings||[]){
      if(b.layer!=="mine"||Number(b.mineLevel||1)!==level)continue;
      const g=new THREE.Group(),x=b.x*32,z=b.y*32;
      g.position.set(x,floorY+1,z);g.rotation.y=-(b.dir||0)*Math.PI/2;mineRoot.add(g);
      const dark=mat(0x172b37,.65,.45),metal=mat(0x647c88,.7,.34),accent=mat(0xd69e58,.48,.28);
      if(String(b.type).startsWith("miner")){
        makeBox(g,0,5,0,19,10,19,dark);
        makeCyl(g,0,14,0,5,10,metal,10);
        makeCyl(g,0,23,0,2.8,12,accent,8);
        const drill=new THREE.Mesh(new THREE.ConeGeometry(4,16,8),metal);drill.position.set(0,34,0);g.add(drill);
        for(const sx of [-10,10]){makeBox(g,sx,2,0,3,3,24,accent);makeCyl(g,sx,1,0,4,2,dark,8)}
      }else if(b.type==="mineGen"){
        makeBox(g,0,8,0,22,16,18,dark);makeBox(g,0,18,0,15,4,12,metal);
        makeCyl(g,0,23,0,3,8,accent,10);
        const lamp=new THREE.PointLight(0xf2bd65,.25,32,2);lamp.position.set(0,26,0);g.add(lamp);
      }else if(b.type==="powerCable"){
        makeCyl(g,0,1.6,0,2.2,3.2,accent,8);makeBox(g,0,3,0,10,1.8,10,metal);
      }
      g.userData={cell:{x:b.x,z:b.y},targetKind:{kind:"building",type:b.type,uid:b.uid}};
    }
  }
  const nodeMatrixDummy=new THREE.Object3D();
  function nodeInstance(mesh,x,y,z,sx,sy,sz,rotationY=0){
    if(!mesh)return -1;
    const index=mesh.count;
    nodeMatrixDummy.position.set(x,y,z);nodeMatrixDummy.rotation.set(0,rotationY,0);nodeMatrixDummy.scale.set(sx,sy,sz);
    nodeMatrixDummy.updateMatrix();mesh.setMatrixAt(index,nodeMatrixDummy.matrix);mesh.count=index+1;
    return index;
  }
  function createNodeBatches(state){
    nodeBatchedKeys.clear();nodeBatchMeshes.length=0;
    const totals={wood:0,dori:0,water:0};
    for(const node of Object.values(state.nodes||{}))if(Object.prototype.hasOwnProperty.call(totals,node.type))totals[node.type]++;
    const add=(geometry,material,capacity)=>{
      if(!capacity)return null;
      const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,capacity));
      mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      nodeRoot.add(mesh);nodeBatchMeshes.push(mesh);return mesh;
    };
    nodeBatches={
      woodTrunk:add(treeTrunkGeometry,mats.woodTrunk,totals.wood),
      woodCrown:add(sphereGeo,mats.woodLeaves,totals.wood*2),
      doriTrunk:add(treeTrunkGeometry,mats.doriTrunk,totals.dori),
      doriCrown:add(sphereGeo,mats.green,totals.dori*2),
      doriCrystal:add(doriCrystalGeometry,mats.crystal,totals.dori),
      water:add(waterBlockGeometry,waterMaterial,totals.water),
      ripples:add(rippleGeometry,rippleMaterial,totals.water*3)
    };
    nodeHitMesh=add(nodeHitGeometry,nodeHitMaterial,totals.wood+totals.dori+totals.water);
    if(nodeHitMesh)nodeHitMesh.userData.targets=[];
  }
  function commitNodeBatches(){
    for(const mesh of nodeBatchMeshes)if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
    if(nodeHitMesh&&nodeHitMesh.count){nodeHitMesh.instanceMatrix.needsUpdate=true;nodeHitMesh.computeBoundingSphere();}
  }
  function addSeenNodeModels(state){
    if(!nodeBatches)createNodeBatches(state);
    for(const [key,node] of Object.entries(state.nodes||{})){
      const existing=nodeGroupsByKey.get(key),visible=!!state.seen?.[key],alive=node.amount>0||node.type==="dori";
      if(!visible||!alive){
        if(existing){nodeRoot.remove(existing);clear(existing);nodeGroupsByKey.delete(key);}
        continue;
      }
      if(existing||nodeBatchedKeys.has(key))continue;
      const [x,z]=key.split(",").map(Number),worldX=x*32,worldZ=z*32,y=surfaceY(state,x,z);
      if(node.type==="wood"){
        nodeInstance(nodeBatches.woodTrunk,worldX,y+12,worldZ,1,1,1);
        nodeInstance(nodeBatches.woodCrown,worldX,y+31,worldZ,14,12.88,14);
        nodeInstance(nodeBatches.woodCrown,worldX+7,y+28,worldZ,7.6,6.4,7.6);
      }else if(node.type==="dori"){
        nodeInstance(nodeBatches.doriTrunk,worldX,y+12,worldZ,1,1,1);
        nodeInstance(nodeBatches.doriCrown,worldX,y+31,worldZ,13,11.96,13);
        nodeInstance(nodeBatches.doriCrown,worldX+7,y+28,worldZ,7.6,6.4,7.6);
        nodeInstance(nodeBatches.doriCrystal,worldX,y+40,worldZ,2.8,3.5,2.8,.22);
      }else if(node.type==="water"){
        nodeInstance(nodeBatches.water,worldX,y+1,worldZ,1,1,1);
        for(let i=0;i<3;i++)nodeInstance(nodeBatches.ripples,worldX+(i-1)*7,y+1.8,worldZ+(i%2?4:-4),1,1,1);
      }else{
        const g=new THREE.Group();g.position.set(worldX,y,worldZ);
        g.userData={cell:{x,z},targetKind:node.type==="mineEntrance"?{kind:"mineEntrance"}:{kind:"resource",type:node.type}};
        nodeRoot.add(g);nodeGroupsByKey.set(key,g);
        if(node.type==="mineEntrance"){
          const stone=mat(0x53616a,.18,.9),glow=mat(0x3c9eaa,.3,.35,0x124f59);
          makeBox(g,-13,13,0,5,29,6,stone);makeBox(g,13,13,0,5,29,6,stone);makeBox(g,0,27,0,31,6,7,stone);
          makeBox(g,0,8,-1,19,19,1.5,mat(0x02070c,.02,.98));makeBox(g,0,30,0,25,1.1,8,glow,false);
          if(highEndDevice){const lamp=new THREE.PointLight(0x56d8da,1.1,88,2);lamp.position.set(0,20,-8);g.add(lamp);}
        }else if(node.type==="relaySite"||node.type==="coreSite"){
          makeCyl(g,0,2,0,9,4,mats.dark,8);makeCyl(g,0,12,0,2,18,mats.trim,8);makeSphere(g,0,24,0,node.type==="coreSite"?5:3,mats.crystal);
        }
      }
      if(node.type==="wood"||node.type==="dori"||node.type==="water"){
        const index=nodeInstance(nodeHitMesh,worldX,y+(node.type==="water"?4:23),worldZ,27,node.type==="water"?8:48,27);
        if(index>=0)nodeHitMesh.userData.targets[index]={cell:{x,z},targetKind:{kind:"resource",type:node.type}};
      }
      nodeBatchedKeys.add(key);
    }
    commitNodeBatches();
  }
  function rebuild(state){
    clear(worldRoot);clear(machineRoot);clear(nodeRoot);clear(markerRoot);clear(mineRoot);terrainChunks.length=0;nodeGroupsByKey.clear();nodeBatches=null;nodeHitMesh=null;nodeBatchMeshes.length=0;nodeBatchedKeys.clear();selectionRoot.visible=false;
    const dummy=new THREE.Object3D(),color=new THREE.Color(),bottom=-52,chunkSize=32;
    for(let z0=0;z0<WORLD_H;z0+=chunkSize)for(let x0=0;x0<WORLD_W;x0+=chunkSize){
      const chunkWidth=Math.min(chunkSize,WORLD_W-x0),chunkHeight=Math.min(chunkSize,WORLD_H-z0);
      const tiles=new THREE.InstancedMesh(terrainTileGeometry,terrainTileMaterial,chunkWidth*chunkHeight);
      tiles.userData={chunkX:x0,chunkZ:z0,chunkWidth,chunkHeight};tiles.receiveShadow=true;
      let n=0;
      for(let z=z0;z<z0+chunkHeight;z++)for(let x=x0;x<x0+chunkWidth;x++){
        const key=x+","+z,node=state.nodes?.[key],h=surfaceY(state,x,z);
        dummy.position.set(x*32,(h+bottom)/2,z*32);dummy.scale.set(1,Math.max(1,h-bottom),1);dummy.updateMatrix();tiles.setMatrixAt(n,dummy.matrix);
        color.setHex(node?.type==="water"?palette.water:biomeGroundColor(biomeAt(x,z)));tiles.setColorAt(n,color);n++;
      }
      tiles.instanceMatrix.needsUpdate=true;if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true;
      tiles.computeBoundingSphere();worldRoot.add(tiles);terrainChunks.push(tiles);
    }
    addSeenNodeModels(state);lastVisibilityRevision=state.visibilityRevision;
    for(const key of Object.keys(state.foundation||{})){if(!state.foundation[key])continue;const [x,z]=key.split(",").map(Number);const h=surfaceY(state,x,z);makeBox(worldRoot,x*32,h+1.2,z*32,29,2.2,29,mat(0x65727a,.62,.55),false);}
    for(const key of Object.keys(state.flattened||{})){if(!state.flattened[key])continue;const [x,z]=key.split(",").map(Number);const h=surfaceY(state,x,z);const marker=new THREE.Mesh(new THREE.BoxGeometry(30,.45,30),new THREE.MeshBasicMaterial({color:0x87c4aa,transparent:true,opacity:.12,depthWrite:false}));marker.position.set(x*32,h+.15,z*32);worldRoot.add(marker);}
    for(const b of state.buildings||[])if(b.layer!=="mine")addBuilding(b,state);
    addPlayer(state);
    playerRing=new THREE.Mesh(new THREE.TorusGeometry(7,.35,8,40),new THREE.MeshBasicMaterial({color:0xf2d28a,transparent:true,opacity:.7}));playerRing.rotation.x=Math.PI/2;markerRoot.add(playerRing);


    buildMine(state);
  }
  function addBuilding(b,state){
    const g=new THREE.Group();
    g.position.set(b.x*32,surfaceY(state,b.x,b.y)+1,b.y*32);
    g.rotation.y=-(b.dir||0)*Math.PI/2;
    machineRoot.add(g);

    const active=b.status==="RUNNING";
    const main=mat(buildingColor[b.type]||0x54758a,.68,.3);
    const dark=mat(0x122637,.68,.38),light=mat(0x9bb6c1,.72,.25);
    const anim={uid:b.uid,type:b.type,fan:null,spin:null,rollers:[],rings:[],arms:[],pistons:[],particles:[],orb:null,glow:null,itemGroup:null,outputMesh:null,adaptiveSlope:null};
    const pipe=(x1,y1,z1,x2,y2,z2,r=1,material=light)=>{
      const a=new THREE.Vector3(x1,y1,z1),c=new THREE.Vector3(x2,y2,z2),d=new THREE.Vector3().subVectors(c,a);
      const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),material);
      m.position.copy(a).add(c).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
      m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
    };
    const ring=(radius,tube,y,material=mats.cyan)=>{
      const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,9,48),material);
      m.rotation.x=Math.PI/2;m.position.y=y;g.add(m);anim.rings.push(m);return m;
    };
    const lamp=(x,y,z,color=0x65dce8,power=.5)=>{
      if(!highEndDevice)return null;
      const p=new THREE.PointLight(color,power,62,2);p.position.set(x,y,z);g.add(p);anim.lights??=[];anim.lights.push(p);return p;
    };
    const legs=[-10,10];
    if(b.type==="belt"||b.type==="beltAdaptive"){
      const adaptive=b.type==="beltAdaptive";
      const deck=new THREE.Group();g.add(deck);
      if(adaptive){
        const dir=((Number(b.dir)||0)%4+4)%4;
        const localX=[[1,0],[0,1],[-1,0],[0,-1]][dir];
        const localZ=[[0,1],[-1,0],[0,-1],[1,0]][dir];
        const sample=(x,z)=>surfaceY(state,clamp(x,0,WORLD_W-1),clamp(z,0,WORLD_H-1));
        const riseX=sample(b.x+localX[0],b.y+localX[1])-sample(b.x-localX[0],b.y-localX[1]);
        const riseZ=sample(b.x+localZ[0],b.y+localZ[1])-sample(b.x-localZ[0],b.y-localZ[1]);
        const slopeX=Math.atan2(riseX,64),slopeZ=Math.atan2(riseZ,64);
        deck.rotation.z=slopeX;deck.rotation.x=-slopeZ;
        anim.adaptiveSlope={x:slopeX,z:slopeZ};
        for(const x of [-10,10])for(const z of [-8,8]){
          const groundY=Math.tan(slopeX)*x+Math.tan(slopeZ)*z;
          const supportHeight=4.25;
          makeCyl(g,x,groundY+supportHeight/2,z,1.2,supportHeight,mats.gold,8);
          makeCyl(g,x,groundY+.3,z,3,.6,main,10);
        }
      }else{
        makeBox(g,0,2.4,0,27,4,27,mats.dark);
        for(const x of [-10,10])for(const z of [-10,10])makeCyl(g,x,4,z,.9,2.2,mats.gold,8);
      }
      makeBox(deck,0,5.2,0,27,1.7,27,mats.steel);
      makeBox(deck,0,7.1,-12.6,27,3,1.4,mats.trim);
      makeBox(deck,0,7.1,12.6,27,3,1.4,mats.trim);
      for(let z=-10;z<=10;z+=4){
        const roller=makeCyl(deck,0,6.4,z,1.45,22,mats.dark,16);
        roller.rotation.z=Math.PI/2;anim.rollers.push(roller);
        for(const x of [-9,9])makeCyl(deck,x,6.4,z,1.6,1,mats.gold,10);
      }
      const track=new THREE.Group();deck.add(track);anim.itemGroup=track;
      syncBeltItemVisual(anim,b);
    } else if(b.type==="solar"){
      for(const x of [-8,8])for(const z of [-6,6])pipe(x,5,z,x,13,z,.65,mats.trim);
      const panel=new THREE.Group();panel.position.set(0,14,0);panel.rotation.x=-.25;g.add(panel);anim.spin=panel;
      makeBox(panel,0,0,0,27,1,19,mat(0x174c80,.78,.2,0x08234d));
      for(let x=-10;x<=10;x+=5)makeBox(panel,x,.7,0,.45,.35,18,mats.cyan);
      for(let z=-6;z<=6;z+=4)makeBox(panel,0,.72,z,26,.35,.45,mats.trim);
      lamp(0,10,0,0x3d9de8,.35);
    } else if(b.type==="wind"){
      makeCyl(g,0,24,0,2,38,mats.trim,12);
      makeCyl(g,0,5,0,5.8,5,dark,12);
      const rotor=new THREE.Group();rotor.position.set(0,44,0);g.add(rotor);anim.fan=rotor;
      makeSphere(rotor,0,0,0,2.8,mats.gold);
      for(let i=0;i<3;i++){
        const blade=new THREE.Group();blade.rotation.z=i*Math.PI*2/3;rotor.add(blade);
        makeBox(blade,0,9,0,2.4,18,1.2,mats.trim);
        makeBox(blade,0,17,0,4.2,3,1.8,mats.glass);
      }
      lamp(0,44,0,0x75d8e8,.25);
    } else if(["minerIron","minerCopper","minerCoal"].includes(b.type)){
      makeBox(g,0,12,0,22,16,22,main);
      for(const x of [-8,8])pipe(x,18,0,x,34,0,1.1,mats.trim);
      makeBox(g,0,34,0,15,3,15,dark);
      const drill=new THREE.Group();drill.position.set(0,9,0);g.add(drill);anim.spin=drill;
      makeCyl(drill,0,-3,0,2.2,15,mats.gold,12);
      for(let i=0;i<4;i++){const bit=new THREE.Mesh(coneGeo,mats.trim);bit.position.y=-12-i*2;bit.scale.set(3.4,3.8,3.4);drill.add(bit);}
      for(const x of [-6,6])pipe(x,7,0,x,0,0,1.3,mats.gold);
      lamp(0,25,0,0xffb65d,.42);
    } else if(b.type==="pump"){
      makeCyl(g,0,17,0,9,24,mats.glass,18);makeCyl(g,0,30,0,7,4,mats.trim,16);
      makeCyl(g,0,35,0,4.5,5,dark,12);
      const impeller=new THREE.Group();impeller.position.y=32;g.add(impeller);anim.fan=impeller;
      makeCyl(impeller,0,0,0,2,2,mats.gold,10);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;const blade=makeBox(impeller,Math.sin(a)*3,0,Math.cos(a)*3,1.6,1,9,mats.cyan);blade.rotation.y=a;}
      pipe(8,11,0,14,11,0,1.5,mats.trim);pipe(14,11,0,14,25,0,1.5,mats.trim);
      lamp(0,23,0,0x31c9eb,.65);
    } else if(b.type==="doriFarm"){
      makeBox(g,0,9,0,22,12,22,mats.green);
      const dome=new THREE.Mesh(new THREE.SphereGeometry(13,20,14,0,Math.PI*2,0,Math.PI/2),mats.glass);dome.position.y=15;g.add(dome);
      makeCyl(g,0,14,0,1.4,22,mats.gold,10);
      const tree=new THREE.Group();tree.position.y=12;g.add(tree);anim.spin=tree;
      makeCyl(tree,0,4,0,1.2,13,mats.gold,8);
      for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(3.6,10,8),mats.green);const a=i*Math.PI/3;leaf.position.set(Math.cos(a)*6,10+Math.sin(a*2),Math.sin(a)*6);leaf.scale.set(1.45,.3,.72);leaf.rotation.y=-a;tree.add(leaf);}
      anim.orb=makeCrystal(tree,"doronium_normal",0,19,0,2.1);
      lamp(0,26,0,0x65eac4,.7);
    } else if(b.type==="smelter"||b.type==="coalgen"){
      makeBox(g,0,15,0,23,22,23,main);makeBox(g,0,28,0,16,4,16,dark);
      for(const x of [-8,8]){pipe(x,8,0,x,25,0,1.4,mats.trim);makeCyl(g,x,30,0,2.1,4,mats.gold,10);}
      const chamber=makeSphere(g,0,20,0,6,mat(0xff713f,.25,.2,0xc83a0a));anim.orb=chamber;
      makeCyl(g,0,36,0,5,10,dark,12);makeCyl(g,0,42,0,3.5,3,mats.trim,12);
      for(let i=0;i<4;i++){const vent=makeBox(g,-8+i*5,32,11,2,5,2,mats.gold);vent.userData.baseY=32;anim.pistons.push(vent);}
      lamp(0,20,0,0xff6a36,1.25);
      if(b.type==="coalgen")for(const x of [-7,7]){makeCyl(g,x,46,0,2.4,10,dark,12);lamp(x,48,0,0x9cb7c6,.25);}
    } else if(b.type==="wiremill"){
      makeBox(g,0,13,0,22,18,22,main);
      for(const x of [-5,5]){const roller=makeCyl(g,x,22,0,3.4,11,mats.trim,20);roller.rotation.z=Math.PI/2;anim.rollers.push(roller);makeCyl(g,x,22,0,1.35,12,mats.gold,12).rotation.z=Math.PI/2;}
      pipe(-10,22,0,-14,22,0,.9,mats.gold);pipe(10,22,0,14,22,0,.9,mats.gold);
      lamp(0,22,0,0xd5ba6b,.4);
    } else if(b.type==="assembler"){
      makeBox(g,0,12,0,22,15,22,main);makeBox(g,0,20,0,18,2,18,dark);
      const armBase=new THREE.Group();armBase.position.set(-5,22,-3);g.add(armBase);anim.arms.push(armBase);
      makeCyl(armBase,0,2,0,3,4,mats.gold,12);
      const upper=makeBox(armBase,0,8,0,2.2,10,2.2,mats.trim);anim.arms.push(upper);
      const claw=makeBox(armBase,0,15,0,5,2,5,mats.cyan);anim.arms.push(claw);
      for(let i=0;i<4;i++)makeBox(g,-8+i*5,24,7,2.8,.7,2.8,mats.gold);
    } else if(b.type==="lab"||b.type==="variantLab"){
      makeBox(g,0,16,0,22,21,22,dark);
      const chamber=new THREE.Mesh(new THREE.CylinderGeometry(7,8,17,8,1,true),mats.glass);chamber.position.y=27;g.add(chamber);
      const orbit=new THREE.Group();orbit.position.y=30;g.add(orbit);anim.spin=orbit;
      const sample=b.type==="variantLab"?(b.variant||"doronium_blue"):"doronium_normal";
      anim.orb=makeCrystal(orbit,sample,0,0,0,4.1);ring(11,.45,30,mats.gold);
      for(let i=0;i<4;i++){const p=makeSphere(g,Math.cos(i*Math.PI/2)*10,29,Math.sin(i*Math.PI/2)*10,1.4,mats.cyan);anim.particles.push(p);}
      lamp(0,30,0,0x6adff3,.85);
    } else if(b.type==="reactor"||b.type==="fusion"){
      makeBox(g,0,12,0,24,16,24,dark);
      for(const x of [-9,9])for(const z of [-9,9])pipe(x,10,z,x,32,z,1.4,mats.gold);
      makeCyl(g,0,25,0,b.type==="fusion"?10.5:8.5,29,main,16);
      makeCyl(g,0,25,0,b.type==="fusion"?8.2:6.2,31,mats.glass,16);
      makeCyl(g,0,40,0,b.type==="fusion"?9.4:7,4,mats.trim,16);
      anim.orb=makeCrystal(g,b.type==="fusion"?"infinity":"doronium_normal",0,34,0,b.type==="fusion"?5:3.8);
      for(let i=0;i<(b.type==="fusion"?4:3);i++)ring(11+i*2,.75,17+i*8,i%2?mats.gold:mats.cyan);
      const coil=new THREE.Group();g.add(coil);anim.spin=coil;
      for(let i=0;i<8;i++){const a=i*Math.PI/4;pipe(Math.cos(a)*12,15,Math.sin(a)*12,Math.cos(a)*12,37,Math.sin(a)*12,1,mats.trim);}
      for(let i=0;i<4;i++)lamp(Math.cos(i*Math.PI/2)*13,30,Math.sin(i*Math.PI/2)*13,0x3ad6ed,.55);
    } else if(b.type==="cooling"){
      makeCyl(g,0,21,0,11,34,mats.glass,18);makeCyl(g,0,38,0,9,4,mats.trim,18);
      const fan=new THREE.Group();fan.position.y=41;g.add(fan);anim.fan=fan;
      makeCyl(fan,0,0,0,2,2,mats.gold,12);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;const blade=makeBox(fan,Math.sin(a)*4,0,Math.cos(a)*4,2,1,11,mats.cyan);blade.rotation.y=a;}
      lamp(0,24,0,0x57c9e9,.45);
    } else if(b.type==="relay"){
      makeBox(g,0,5,0,22,7,22,main);makeCyl(g,0,22,0,1.8,28,mats.trim,12);
      const dish=new THREE.Group();dish.position.set(0,34,0);g.add(dish);anim.spin=dish;
      const reflector=new THREE.Mesh(new THREE.SphereGeometry(7,16,10,0,Math.PI*2,0,Math.PI/2),mats.glass);reflector.rotation.x=Math.PI/2;dish.add(reflector);
      makeCyl(dish,0,3,0,1,8,mats.gold,8);lamp(0,37,0,0x62e6e4,.6);
    } else if(b.type==="core"){
      makeBox(g,0,8,0,23,12,23,main);anim.orb=makeCrystal(g,"infinity",0,26,0,7);
      for(let i=0;i<3;i++)ring(10+i*4,.65,23+i*4,i%2?mats.gold:mats.cyan);
      for(let i=0;i<4;i++)lamp(Math.cos(i*Math.PI/2)*13,18,Math.sin(i*Math.PI/2)*13,0x8c70ff,.55);
    } else if(b.type==="storage"||b.type==="warehouse"){
      makeBox(g,0,13,0,23,18,23,main);makeBox(g,0,23,0,19,2,19,mats.trim);
      for(const x of [-7,0,7])for(const z of [-7,0,7]){makeBox(g,x,8,z,5.5,8,5.5,((x+z)/7)%2?mats.gold:mats.steel);makeBox(g,x,12,z,4.6,.8,4.6,mats.trim);}
      for(const z of [-12,12])makeBox(g,0,9,z,20,3,1.2,dark);
    } else if(b.type==="market"){
      makeBox(g,0,12,0,22,17,22,main);makeBox(g,0,22,0,25,2,25,mats.gold);
      for(const x of [-9,9])pipe(x,5,-9,x,24,-9,1,mats.trim);
      makeBox(g,0,27,0,18,5,3,mats.cyan);
    } else {
      makeBox(g,0,14,0,22,19,22,main);makeBox(g,0,25,0,16,3,16,mats.trim);
    }
    const glow=new THREE.Mesh(new THREE.TorusGeometry(b.type==="fusion"?15:11,.65,8,40),new THREE.MeshBasicMaterial({color:active?0x5de5d4:0x496c7c,transparent:true,opacity:active ? .88 : .2}));
    glow.rotation.x=Math.PI/2;glow.position.y=5;g.add(glow);anim.glow=glow;
    if(anim.orb)anim.orb.userData.baseScale=anim.orb.scale.clone();
    syncOutputVisual(g,anim,b);
    g.userData={...anim,stateRef:b,cell:{x:b.x,z:b.y},targetKind:{kind:"building",type:b.type,uid:b.uid}};
  }
  function addPlayer(state){
    const g=new THREE.Group();g.position.set(state.player.x*32,(state.player.layer==="mine"?mineFloorY(state.player.mineLevel):surfaceY(state,state.player.x,state.player.y))+1,state.player.y*32);markerRoot.add(g);playerModel=g;
    makeCyl(g,0,9,0,4,13,mat(0x315d76,.15,.72),12);
    makeSphere(g,0,19,0,4.5,mat(0xe0b98b,.05,.82));
    makeBox(g,0,23,0,8,2.2,7,mats.gold);
    const legs=[],arms=[];
    for(const x of [-2.6,2.6])legs.push(makeBox(g,x,4.2,0,2.7,8,3.2,mats.dark));
    for(const x of [-5.5,5.5]){const a=makeBox(g,x,12,0,2.6,8,3,mats.trim);a.rotation.z=x<0?-.2:.2;arms.push(a);}
    g.userData={legs,arms};
  }
  let trackedNodes=null,trackedMineDeposits=null,trackedFlattened=null,trackedFoundation=null,stateIdentityRevision=0,lastVisibilityRevision=null;
  function signature(s){
    if(s.nodes!==trackedNodes||s.mineDeposits!==trackedMineDeposits||s.flattened!==trackedFlattened||s.foundation!==trackedFoundation){trackedNodes=s.nodes;trackedMineDeposits=s.mineDeposits;trackedFlattened=s.flattened;trackedFoundation=s.foundation;stateIdentityRevision++;}
    const machines=(s.buildings||[]).map(b=>[b.uid,b.type,b.x,b.y,b.dir,b.variant,b.layer||"surface",b.mineLevel||0].join(":")).join("|");
    return [s.sceneRevision||0,stateIdentityRevision,s.worldVersion,s.player?.layer,s.player?.mineLevel,machines].join(";");
  }
  function render(state){
    if(!state)return;resizeIfNeeded();const sig=signature(state);if(sig!==lastSignature){rebuild(state);lastSignature=sig;rebuildCount++;}
    renderCount++;
    activeViewMode=state.player?.viewMode==="map"?"map":state.player?.viewMode==="third"?"third":"first";
    const inMine=state.player?.layer==="mine";stateLayerForPicking=inMine?"mine":"surface";
    if(state.visibilityRevision!==lastVisibilityRevision){addSeenNodeModels(state);lastVisibilityRevision=state.visibilityRevision;}
    const selectedMachine=state.selectedBuilding?(state.buildings||[]).find(b=>b.uid===state.selectedBuilding&&(inMine?b.layer==="mine"&&Number(b.mineLevel||1)===Number(state.player?.mineLevel||1):b.layer!=="mine")):null;
    selectionRoot.visible=!!selectedMachine;
    if(selectedMachine)selectionRoot.position.set(selectedMachine.x*32,(inMine?mineFloorY(state.player.mineLevel):surfaceY(state,selectedMachine.x,selectedMachine.y))+3,selectedMachine.y*32);
    worldRoot.visible=!inMine;machineRoot.visible=!inMine;nodeRoot.visible=!inMine;mineRoot.visible=inMine;markerRoot.visible=true;
    const hover=state.hoverCell,showHover=!inMine&&!!hover&&!!(state.selectedBuild||state.selectedLandTool);hoverRoot.visible=showHover;
    if(showHover){const h=surfaceY(state,hover.x,hover.y);hoverRoot.position.set(hover.x*32,h+2.2,hover.y*32);const color=state.canBuildPreview?0x6de4bb:0xf2a46e;hoverFillMaterial.color.setHex(color);hoverEdgeMaterial.color.setHex(color);}
    if(inMine){activeViewMode=state.player?.viewMode==="third"?"third":"first";updateGameCamera(state);if(playerModel)playerModel.visible=activeViewMode!=="first";firstPersonRig.visible=activeViewMode==="first";}
    else if(activeViewMode==="map"){if(playerModel)playerModel.visible=true;firstPersonRig.visible=false;}else updateGameCamera(state);
    const t=performance.now()*.001;if(shadowsEnabled&&renderer.shadowMap.enabled)sun.intensity=2.25+Math.sin(t*.08)*.18;
    if(!inMine&&!state.paused)machineRoot.children.forEach(g=>{
      const a=g.userData||{},b=a.stateRef;if(!b)return;syncBeltItemVisual(a,b);syncOutputVisual(g,a,b);const running=b.status==="RUNNING";
      if(a.fan&&running){if(a.type==="wind")a.fan.rotation.z=t*2.8;else a.fan.rotation.y=t*2.5;}
      if(a.spin&&running)a.spin.rotation.y=t*1.7;
      if(running){
        for(let i=0;i<(a.rollers||[]).length;i++)a.rollers[i].rotation.x=t*4*(i%2?-1:1);
        for(let i=0;i<(a.rings||[]).length;i++)a.rings[i].rotation.y=t*(i%2?.34:-.27);
        for(let i=0;i<(a.arms||[]).length;i++)a.arms[i].rotation.z=Math.sin(t*1.8+i*.8)*.32;
        for(let i=0;i<(a.pistons||[]).length;i++){const m=a.pistons[i];if(m.geometry?.type==="BoxGeometry"&&Number.isFinite(m.userData.baseY))m.position.y=m.userData.baseY+Math.sin(t*4+i)*.7;else m.rotation.y=t*.8+i;}
        for(let i=0;i<(a.particles||[]).length;i++){const m=a.particles[i];m.position.y=29+Math.sin(t*2.5+i*1.4)*1.2;m.scale.setScalar(.92+Math.sin(t*3+i)*.12);}
      }
      if(a.orb){const p=running?1+Math.sin(t*2.2)*.045:1,v=a.orb.userData.baseScale||new THREE.Vector3(1,1,1);a.orb.scale.set(v.x*p,v.y*p,v.z*p);}
      if(a.outputMesh){const v=a.outputMesh.userData.baseScale||new THREE.Vector3(1,1,1);a.outputMesh.position.y=24+(running?Math.sin(t*2.1)*1.1:0);a.outputMesh.rotation.y=running?t*.65:0;a.outputMesh.scale.set(v.x,v.y,v.z);}
      if(a.glow)a.glow.material.opacity=running ? .66+Math.sin(t*4)*.18 : .18;
      if(a.itemGroup&&b.item){const p=clamp((b.moveTimer||0)/.75,0,1),n=a.itemGroup.children.length,cols=Math.min(6,n),rows=Math.ceil(n/cols);for(let i=0;i<n;i++){const m=a.itemGroup.children[i];m.position.x=((i%cols)-(cols-1)/2)*3.0;m.position.z=-((Math.floor(i/cols)-(rows-1)/2)*3.0)-(p-.5)*18;m.position.y=8.6+Math.sin(t*5+i)*.18;m.rotation.y=t*1.5+i*.45;m.rotation.x=Math.sin(t*2+i)*.1;}}
    });
    if(playerModel){const m=state.playerMotion||{x:state.player.x,z:state.player.y,moving:false};const base=state.player?.layer==="mine"?mineFloorY(state.player.mineLevel):surfaceY(state,Math.floor(m.x+.5),Math.floor(m.z+.5));playerModel.position.set(m.x*32,base+1+(Number(m.y)||0)+Math.sin(t*3)*(m.moving ? .13 : .025),m.z*32);if(playerRing){playerRing.position.set(m.x*32,base+2+(Number(m.y)||0),m.z*32);playerRing.visible=state.player?.layer!=="mine";}playerModel.rotation.y=m.yaw??m.facing??0;const swing=m.moving ? Math.sin(t*9)*.48 : Math.sin(t*1.5)*.035;(playerModel.userData.legs||[]).forEach((leg,i)=>leg.rotation.x=swing*(i%2?-1:1));(playerModel.userData.arms||[]).forEach((arm,i)=>arm.rotation.x=m.moving?Math.sin(t*9+i*Math.PI)*.38:0);}
    renderer.render(scene,camera);
  }
  function resizeIfNeeded(){const r=canvas.getBoundingClientRect();if(Math.abs(r.width-width)>1||Math.abs(r.height-height)>1)resize();}
  function adaptPerformanceFrame(frameMs){
    if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>250)return;
    perfFrameTotal+=frameMs;perfFrameCount++;
    if(perfFrameTotal>=1000){
      measuredFps=perfFrameCount*1000/perfFrameTotal;
      measuredFrameMs=perfFrameTotal/perfFrameCount;
      perfFrameTotal=0;perfFrameCount=0;
    }
    if(frameMs>21){slowFrames++;fastFrames=0;}
    else if(frameMs<15.5){fastFrames++;slowFrames=0;}
    else{slowFrames=Math.max(0,slowFrames-1);fastFrames=0;}
    if(slowFrames>=24){
      if(currentPixelRatio>minPixelRatio+.005){
        currentPixelRatio=Math.max(minPixelRatio,Math.round(currentPixelRatio*.86*100)/100);
        renderer.setPixelRatio(currentPixelRatio);resize();
      }else if(renderer.shadowMap.enabled){
        renderer.shadowMap.enabled=false;sun.castShadow=false;
      }
      slowFrames=0;fastFrames=0;
    }else if(fastFrames>=240&&currentPixelRatio<basePixelRatio){
      currentPixelRatio=Math.min(basePixelRatio,Math.round((currentPixelRatio+.035)*100)/100);
      renderer.setPixelRatio(currentPixelRatio);resize();fastFrames=0;slowFrames=0;
    }
  }
  function pickTile(clientX,clientY){if(stateLayerForPicking==="mine")return null;const r=canvas.getBoundingClientRect();pointer.x=((clientX-r.left)/r.width)*2-1;pointer.y=-((clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=terrainChunks.length?raycaster.intersectObjects(terrainChunks,false)[0]:null;if(hit?.instanceId===undefined||hit.instanceId===null)return null;const chunk=hit.object.userData,index=hit.instanceId,x=chunk.chunkX+(index%chunk.chunkWidth),z=chunk.chunkZ+Math.floor(index/chunk.chunkWidth);return x>=0&&z>=0&&x<WORLD_W&&z<WORLD_H?{x,y:z,z}:null;}
  function pan(dx,dy){const scale=1/zoom;target.x=clamp(target.x-dx*1.6*scale,0,(WORLD_W-1)*32);target.z=clamp(target.z-dy*1.6*scale,0,(WORLD_H-1)*32);cameraUpdate();}
  function setZoom(value){zoom=clamp(value,.55,1.8);if(activeViewMode==="map"){cameraUpdate()}else{gameCamera.fov=clamp(74-(zoom-1)*38,52,88);gameCamera.updateProjectionMatrix();}}
  function center(x,y){target.set(x*32,terrainHeightAt(x,y),y*32);cameraUpdate();}
  function orbit(dx,dy){yaw-=dx*0.004;pitch=clamp(pitch+dy*0.003,0.42,1.25);cameraUpdate();}
  resize();cameraUpdate();
  return {backend:"webgl",render,pickTile,pickTarget,pan,orbit,setZoom,center,setViewMode(mode){activeViewMode=mode==="map"||mode==="third"?"third":"first";gameCamera.fov=74;gameCamera.updateProjectionMatrix();},adaptPerformanceFrame,inspect(){const belts=machineRoot.children.filter(g=>g.userData?.itemGroup);return {machineCount:machineRoot.children.length,beltCount:belts.length,beltItemMeshes:belts.reduce((n,g)=>n+g.userData.itemGroup.children.length,0),beltItemPositions:belts.flatMap(g=>g.userData.itemGroup.children.map(m=>m.position.z)),adaptiveBeltTilts:machineRoot.children.filter(g=>g.userData?.type==="beltAdaptive").map(g=>g.userData.adaptiveSlope),viewMode:activeViewMode,playerVisible:!!playerModel?.visible,firstPersonHandsVisible:!!firstPersonRig.visible,worldWidth:WORLD_W,worldHeight:WORLD_H,mineLevels:5,terrainChunkCount:terrainChunks.length,renderCount,rebuildCount,pixelRatio:renderer.getPixelRatio(),basePixelRatio,shadowEnabled:renderer.shadowMap.enabled,qualityTier:compactDevice?"mobile":lowEndDevice?"low":shadowsEnabled?"high":"balanced",undergroundResourceNodes:mineRoot.children.filter(g=>g.userData?.targetKind?.kind==="resource").length,nodeBatchDrawCalls:nodeBatchMeshes.filter(m=>m.count>0).length,nodeBatchInstances:nodeBatchMeshes.reduce((n,m)=>n+m.count,0)};},inspectPerformance(){return {fps:Math.round(measuredFps),averageFrameMs:Number(measuredFrameMs.toFixed(2)),pixelRatio:Number(currentPixelRatio.toFixed(2)),basePixelRatio:Number(basePixelRatio.toFixed(2)),shadowEnabled:renderer.shadowMap.enabled,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,terrainChunks:terrainChunks.length,nodeBatchDrawCalls:nodeBatchMeshes.filter(m=>m.count>0).length,nodeBatchInstances:nodeBatchMeshes.reduce((n,m)=>n+m.count,0),renderCount,rebuildCount};},get zoom(){return zoom;}};
}
