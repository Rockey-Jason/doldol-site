import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ITEMS, MAPS, WEAPONS, type RockeyItemCode, type RockeyWeapon } from '../catalog';
import { addRockeyEnvironment } from './EnvironmentDressing';
import { addTacticalLevel } from './TacticalLevel';
import { createCombatantRig } from './CombatantRig';
import { createFirstPersonHands } from './FirstPersonHands';

export interface RemotePlayer {
  id: string; name: string; x: number; y: number; z: number;
  yaw: number; health: number; team: number; alive?: boolean; connected?: boolean;
}
export interface ReplayFrame {
  t: number;
  players: RemotePlayer[];
}
export interface GameInstance {
  activate(mode: string, team?: number, spawn?: { x: number; y: number; z: number; yaw: number }, weaponCode?: string, secondaryWeapon?: string, itemCode?: string, itemCount?: number, itemInventory?:Record<string,number>): void;
  setRemotePlayers(players: RemotePlayer[]): void;
  reconcileLocalPlayer(player: RemotePlayer): void;
  setScore(a: number, b: number, round: number): void;
  setHealth(value: number): void;
  setAmmo(ammo: number, reserve: number): void;
  setWeapon(weaponCode: string, ammo?: number, reserve?: number): void;
  setItem(itemCode:string,count:number,effect?:string,inventory?:Record<string,number>):void;
  selectItem(itemCode:string):void;
  useItem():void;
  showThrownItem(itemCode:string,x:number,y:number,z:number,yaw:number,pitch:number,fuseMs:number):void;
  showItemEffect(effect:string,x:number,y:number,z:number,radius:number,durationMs:number):void;
  applyRecoil(pitch: number, yaw: number): void;
  showDamageOnTarget(targetId: string, targetName: string, damage: number, headshot: boolean): void;
  showShot(x: number, y: number, z: number, yaw: number, pitch: number, weaponCode: string): void;
  playReplay(frames: ReplayFrame[]): void;
  playKillcam(frames: ReplayFrame[], killerId: string, onComplete: () => void): void;
  cancelKillcam(): void;
  setQuality(level: 'low'|'balanced'|'high'): void;
  setSensitivity(value: number): void;
  toggleCamera(): void;
  dispose(): void;
}

export async function createGame(
  canvas: HTMLCanvasElement,
  send: (message: Record<string, unknown> & { type: string }) => void,
  notify: (message: string) => void,
  updateHud: (hp: number, ammo: number, reserve: number, weapon: string) => void,
  initialMapId = 'training_facility'
): Promise<GameInstance> {
  const rapierModule = await import('@dimforge/rapier3d-compat');
  const RAPIER = rapierModule.default;
  await RAPIER.init();

  const map = MAPS[initialMapId] || MAPS.training_facility;
  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(map.background);
  scene.fog = new THREE.Fog(map.fog, 54, 158);

  const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 180);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  // Pre-filtered environment probe adds stable reflections to metal, glass and armour.
  let reflectionEnvironment:THREE.Texture|null=null;
  if(!isMobile){
    const pmrem=new THREE.PMREMGenerator(renderer);
    const room=new RoomEnvironment();
    reflectionEnvironment=pmrem.fromScene(room,.04).texture;
    scene.environment=reflectionEnvironment;
    pmrem.dispose();room.dispose();
  }
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // Cinematic three-point lighting: soft sky fill, warm key light and a cool rim.
  scene.add(new THREE.HemisphereLight(0xd9efff, 0x27364d, 2.05));
  scene.add(new THREE.AmbientLight(0xffffff, 0.28));
  const sun = new THREE.DirectionalLight(0xffe8c7, 2.7);
  sun.position.set(-15, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 512 : 1536, isMobile ? 512 : 1536);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 72;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(map.light, 1.15);
  rim.position.set(18, 10, -18);
  scene.add(rim);
  const blue = new THREE.PointLight(map.light, 52, 48, 2);
  blue.position.set(0, 5, 0);
  scene.add(blue);

  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0));

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(60, 1, 60),
    new THREE.MeshStandardMaterial({ color: map.floor, metalness: 0.18, roughness: 0.78 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(60, 60, map.grid, map.grid);
  grid.position.y = 0.012;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.18;
  scene.add(grid);

  const solid = new THREE.MeshStandardMaterial({
    color: map.palette === 'amber' ? 0x61432b : map.palette === 'magenta' ? 0x3b214b :
      map.palette === 'ice' ? 0x2c5367 : map.palette === 'cyan' ? 0x1b4658 : 0x1b2c48,
    metalness: 0.82, roughness: 0.27
  });
  const glow = new THREE.MeshStandardMaterial({
    color: map.light, emissive: map.light, emissiveIntensity: 1.8
  });
  const raycastMeshes: THREE.Object3D[] = [floor];

  function box(x: number, y: number, z: number, hx: number, hy: number, hz: number) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), solid);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    raycastMeshes.push(mesh);
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z));
  }

  const mapTrim = new THREE.MeshStandardMaterial({color:0x5b7188,metalness:.86,roughness:.3});
  const mapDark = new THREE.MeshStandardMaterial({color:0x101b2b,metalness:.68,roughness:.38});
  const mapAccent = new THREE.MeshStandardMaterial({color:map.light,emissive:map.light,emissiveIntensity:1.2,metalness:.35,roughness:.26});
  const mapHazard = new THREE.MeshStandardMaterial({color:map.palette==='amber'?0xf0b354:0xd1e8f4,metalness:.28,roughness:.55});
  const makeMapDetail=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,rx=0,ry=0,rz=0)=>{
    const part=new THREE.Mesh(geometry,material);
    part.position.set(x,y,z);part.rotation.set(rx,ry,rz);
    part.castShadow=true;part.receiveShadow=true;scene.add(part);return part;
  };

  for (const b of map.cover) {
    box(b.x, b.top / 2, b.z, b.hx, b.top / 2, b.hz);
    const led = new THREE.Mesh(new THREE.BoxGeometry(b.hx * 1.7, 0.055, 0.08), glow);
    led.position.set(b.x, b.top + 0.08, b.z + b.hz + 0.025);
    scene.add(led);

    // Raised top rails and armored corner caps make the cover read as a built structure.
    const railY=b.top+.035;
    makeMapDetail(new THREE.BoxGeometry(b.hx*1.92,.07,.12),mapTrim,b.x,railY,b.z-b.hz*.82);
    makeMapDetail(new THREE.BoxGeometry(b.hx*1.92,.07,.12),mapTrim,b.x,railY,b.z+b.hz*.82);
    makeMapDetail(new THREE.BoxGeometry(.12,.07,b.hz*1.65),mapTrim,b.x-b.hx*.9,railY,b.z);
    makeMapDetail(new THREE.BoxGeometry(.12,.07,b.hz*1.65),mapTrim,b.x+b.hx*.9,railY,b.z);

    const panelWidth=Math.max(.42,Math.min(1.35,b.hx*1.18));
    const panelHeight=Math.min(.34,b.top*.2);
    const panelY=Math.max(.28,b.top*.52);
    const panelZ=b.z+b.hz+.028;
    makeMapDetail(new THREE.BoxGeometry(panelWidth,panelHeight,.045),mapDark,b.x,panelY,panelZ);
    makeMapDetail(new THREE.BoxGeometry(panelWidth*.72,.028,.018),mapAccent,b.x,panelY+panelHeight*.2,panelZ-.027);
    makeMapDetail(new THREE.BoxGeometry(panelWidth*.42,.018,.02),mapHazard,b.x,panelY-panelHeight*.22,panelZ-.028);
    for(const side of [-1,1]){
      const bolt=makeMapDetail(new THREE.CylinderGeometry(.035,.035,.025,10),mapTrim,b.x+side*(panelWidth*.42),panelY,panelZ-.055,Math.PI/2);
      bolt.rotation.z=Math.PI/2;
      makeMapDetail(new THREE.BoxGeometry(.075,Math.min(.5,b.top*.28),.055),mapDark,b.x+side*(b.hx*.82),Math.min(b.top*.42,.9),panelZ-.025);
    }
    // Three small hazard bars on the exposed face add scale and industrial detail.
    for(let stripe=0;stripe<3;stripe++){
      makeMapDetail(new THREE.BoxGeometry(.045,.19,.018),mapHazard,
        b.x-panelWidth*.28+stripe*panelWidth*.28,Math.min(.34,b.top*.25),panelZ-.052,0,0,-.18);
    }
  }

  // Low-profile perimeter beacons and floor-side service pylons frame each map without blocking lanes.
  for(const [x,z] of [[-25,-25],[25,-25],[-25,25],[25,25],[-25,0],[25,0]] as const){
    makeMapDetail(new THREE.CylinderGeometry(.13,.19,1.15,10),mapDark,x,.58,z);
    makeMapDetail(new THREE.CylinderGeometry(.18,.18,.075,12),mapTrim,x,1.08,z);
    makeMapDetail(new THREE.TorusGeometry(.19,.025,6,18),mapAccent,x,.91,z,Math.PI/2);
    makeMapDetail(new THREE.BoxGeometry(.055,.34,.055),mapAccent,x,1.35,z);
  }

  box(0, 2.2, -30, 30, 2.2, 0.6);
  box(0, 2.2, 30, 30, 2.2, 0.6);
  box(-30, 2.2, 0, 0.6, 2.2, 30);
  box(30, 2.2, 0, 0.6, 2.2, 30);

  // Full arena dressing is separate from the combat cover and keeps all new
  // static props out of the hitscan raycast list.
  addRockeyEnvironment(scene,map,isMobile,(x,y,z,hx,hy,hz)=>{
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z));
  });
  const tacticalLevel=addTacticalLevel(scene,map,isMobile,(x,y,z,hx,hy,hz)=>{
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z));
  });

  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.92, 20));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.52, 0.34).setFriction(0), body);
  const controller = world.createCharacterController(0.02);
  controller.setMaxSlopeClimbAngle(Math.PI / 4);
  controller.enableAutostep(0.35, 0.22, true);
  controller.enableSnapToGround(0.18);

  const avatarRig=createCombatantRig(0x183b65,0x4aa8ff);
  const avatar=avatarRig.group;
  scene.add(avatar);

  const gun = new THREE.Group();
  // Declared before the first rebuildGun call because the rebuild routine resets these references.
  let magazineModel: THREE.Group | null = null;
  let boltModel: THREE.Group | null = null;
  const smokeCanvas=document.createElement('canvas');smokeCanvas.width=64;smokeCanvas.height=64;
  const smokeContext=smokeCanvas.getContext('2d');
  if(smokeContext){
    const gradient=smokeContext.createRadialGradient(32,32,2,32,32,31);
    gradient.addColorStop(0,'rgba(255,255,255,.75)');
    gradient.addColorStop(.35,'rgba(255,255,255,.42)');
    gradient.addColorStop(1,'rgba(255,255,255,0)');
    smokeContext.fillStyle=gradient;smokeContext.fillRect(0,0,64,64);
  }
  const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x8cecff,transparent:true,opacity:.95,toneMapped:false })
  );
  muzzleFlash.position.set(0.24, -0.22, -1.2);
  muzzleFlash.visible = false;
  gun.add(muzzleFlash);
  const muzzleFx=new THREE.Group();
  const muzzleFlame=new THREE.Mesh(new THREE.ConeGeometry(.075,.34,7),new THREE.MeshBasicMaterial({color:0xffd28a,transparent:true,opacity:.95,toneMapped:false}));
  muzzleFlame.rotation.x=-Math.PI/2;muzzleFlame.position.z=-.16;muzzleFx.add(muzzleFlame);
  const muzzleCore=new THREE.Mesh(new THREE.SphereGeometry(.065,8,6),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,toneMapped:false}));
  muzzleCore.scale.set(1,.7,1.65);muzzleFx.add(muzzleCore);
  const muzzleRing=new THREE.Mesh(new THREE.TorusGeometry(.095,.012,6,18),new THREE.MeshBasicMaterial({color:0xffe7b2,transparent:true,opacity:.85,toneMapped:false}));
  muzzleRing.position.z=-.045;muzzleFx.add(muzzleRing);
  const muzzleHalo=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTexture,color:0xffb66e,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));
  muzzleHalo.scale.set(.65,.65,1);muzzleHalo.position.z=-.08;muzzleFx.add(muzzleHalo);
  const muzzleLight=new THREE.PointLight(0xffa85c,0,5,2);
  muzzleFx.add(muzzleLight);muzzleFx.visible=false;gun.add(muzzleFx);
  const weaponHands=createFirstPersonHands(gun);
  camera.add(gun);
  scene.add(camera);

  function rebuildGun(code: string) {
    gun.scale.set(1, 1, 1);
    for (const child of [...gun.children]) {
      if (child === muzzleFlash || child === muzzleFx || child === weaponHands.group) continue;
      gun.remove(child);
      disposeObjectResources(child);
    }
    magazineModel = null;
    boltModel = null;

    const accent = new THREE.Color(
      code === 'R16' ? 0x4aa8ff : code === 'R9' ? 0xffd166 :
      code === 'VIPER' ? 0x54e6b0 : code === 'THUNDER' ? 0xff8a45 :
      code === 'LONGSHOT' ? 0xa8d8ff : code === 'HELIX' ? 0xb18aff :
      code === 'BASTION' ? 0xffc45f : code === 'NOVA' ? 0xff748e :
      code === 'ARC' ? 0x57efff : code === 'PULSE' ? 0xbe8cff : map.light
    );
    const metal = new THREE.MeshPhysicalMaterial({
      color: code === 'R16' ? 0x254b75 : code === 'R9' ? 0x65522c : code === 'VIPER' ? 0x204b3c :
        code === 'THUNDER' ? 0x61422d : code === 'LONGSHOT' ? 0x263c53 : code === 'HELIX' ? 0x44305f :
        code === 'BASTION' ? 0x4b4528 : code === 'NOVA' ? 0x542b3c : code === 'ARC' ? 0x204c58 :
        code === 'PULSE' ? 0x3b2b60 : 0x1c2d46,
      metalness: 0.82, roughness: 0.29, clearcoat: 0.32, clearcoatRoughness: 0.24
    });
    const glowPart = new THREE.MeshStandardMaterial({
      color: accent, emissive: accent, emissiveIntensity: 1.7,
      metalness: 0.45, roughness: 0.23
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x101b2b, metalness: 0.68, roughness: 0.34
    });

    const addBox = (x:number,y:number,z:number,sx:number,sy:number,sz:number,material:THREE.Material) => {
      const part = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
      part.position.set(x,y,z);
      part.castShadow = true;
      gun.add(part);
      return part;
    };
    const addCylinder = (x:number,y:number,z:number,length:number,radius:number,material:THREE.Material) => {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),material);
      part.rotation.x = Math.PI/2;
      part.position.set(x,y,z);
      part.castShadow = true;
      gun.add(part);
      return part;
    };

    if (code === 'DORI') {
      // A smaller, softer Pembroke Welsh Corgi plush inspired by the real Dori doll.
      const fur = new THREE.MeshStandardMaterial({color:0xc98b50,roughness:1,metalness:0});
      const cream = new THREE.MeshStandardMaterial({color:0xfff4e4,roughness:1,metalness:0});
      const pawWhite = new THREE.MeshStandardMaterial({color:0xfff8ed,roughness:1,metalness:0});
      const eye = new THREE.MeshStandardMaterial({color:0x171411,roughness:.34,metalness:0});
      const nose = new THREE.MeshStandardMaterial({color:0x38251f,roughness:.55,metalness:0});
      const shine = new THREE.MeshBasicMaterial({color:0xffffff});
      // Scale the plush around its visual center. Scaling the whole gun group
      // also pulls the model toward the camera, which can make it look larger.
      const plushModel = new THREE.Group();
      gun.add(plushModel);
      const plushSphere=(x:number,y:number,z:number,sx:number,sy:number,sz:number,material:THREE.Material)=>{
        const part=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),material);
        part.position.set(x,y,z);
        part.scale.set(sx,sy,sz);
        part.castShadow=true;
        part.receiveShadow=true;
        plushModel.add(part);
        return part;
      };

      // Short, broad body and little legs: the classic low-to-the-ground corgi shape.
      plushSphere(.24,-.31,-.47,.235,.205,.34,fur);
      plushSphere(.24,-.39,-.57,.19,.12,.27,cream); // white belly
      plushSphere(.24,-.265,-.72,.19,.18,.105,cream); // white chest bib
      plushSphere(.24,-.045,-.79,.235,.225,.225,fur); // oversized rounded head

      // White muzzle, soft cheeks and tiny dark nose.
      plushSphere(.24,-.145,-.985,.158,.105,.105,cream);
      plushSphere(.18,-.155,-.963,.082,.075,.07,cream);
      plushSphere(.30,-.155,-.963,.082,.075,.07,cream);
      plushSphere(.24,-.112,-1.078,.038,.029,.025,nose);

      // Big upright, slightly outward-pointing corgi ears.
      const leftEar=plushSphere(.105,.145,-.77,.083,.19,.085,fur);
      leftEar.rotation.z=-.27;
      const rightEar=plushSphere(.375,.145,-.77,.083,.19,.085,fur);
      rightEar.rotation.z=.27;
      plushSphere(.108,.145,-.842,.043,.105,.018,cream);
      plushSphere(.372,.145,-.842,.043,.105,.018,cream);

      // Friendly glossy eyes with tiny catchlights.
      plushSphere(.158,-.045,-.986,.027,.034,.022,eye);
      plushSphere(.322,-.045,-.986,.027,.034,.022,eye);
      plushSphere(.149,-.032,-1.006,.008,.009,.006,shine);
      plushSphere(.313,-.032,-1.006,.008,.009,.006,shine);

      // Four very short legs; the front paws and lower chest are white.
      plushSphere(.105,-.475,-.58,.073,.105,.105,fur);
      plushSphere(.375,-.475,-.58,.073,.105,.105,fur);
      plushSphere(.105,-.535,-.615,.075,.055,.09,pawWhite);
      plushSphere(.375,-.535,-.615,.075,.055,.09,pawWhite);
      plushSphere(.12,-.45,-.29,.072,.09,.095,fur);
      plushSphere(.36,-.45,-.29,.072,.09,.095,fur);

      // Tiny rounded tail, not a long fox-like tail.
      const tail=plushSphere(.24,-.245,-.105,.055,.065,.105,fur);
      tail.rotation.x=-.25;

      // Keep the plush center at its original camera-space position while
      // reducing only its visible dimensions to 22% of the original size.
      plushModel.scale.setScalar(.40);
      plushModel.position.set(.144,-.12,-.36);
      muzzleFlash.visible=false;
      metal.dispose();glowPart.dispose();dark.dispose();
      return;
    }
    const compact = code === 'R9' || code === 'NOVA';
    const shotgun = code === 'THUNDER';
    const sniper = code === 'LONGSHOT';
    const dmr = code === 'HELIX';
    const lmg = code === 'BASTION';
    const energy = code === 'ARC' || code === 'PULSE';
    const smg = code === 'VIPER';
    const burst = code === 'PULSE';
    const bodyLength = compact ? 0.49 : shotgun ? 0.68 : sniper ? 0.82 : lmg ? 0.78 : 0.66;
    const barrelLength = compact ? 0.34 : shotgun ? 0.62 : sniper ? 1.15 : dmr ? 0.86 : lmg ? 0.72 : smg ? 0.48 : 0.67;
    const bodyWidth = shotgun ? 0.3 : lmg ? 0.34 : compact ? 0.19 : 0.24;

    // Independent magazine and charging handle let reload/fire animations move
    // the small mechanical parts instead of rotating the entire weapon only.
    const magazine = new THREE.Group();
    magazine.position.set(0.24, -0.405, -0.37);
    const magWidth = lmg ? 0.19 : compact ? 0.085 : sniper ? 0.14 : 0.125;
    const magHeight = lmg ? 0.25 : compact ? 0.17 : 0.21;
    const magDepth = lmg ? 0.18 : compact ? 0.105 : 0.14;
    const magBody = new THREE.Mesh(new THREE.BoxGeometry(magWidth,magHeight,magDepth),dark);
    magBody.castShadow = true;
    magazine.add(magBody);
    const magBase = new THREE.Mesh(new THREE.BoxGeometry(magWidth*1.08,0.035,magDepth*1.08),glowPart);
    magBase.position.y = -magHeight/2 + 0.012;
    magBase.castShadow = true;
    magazine.add(magBase);
    gun.add(magazine);
    magazineModel = magazine;

    const bolt = new THREE.Group();
    bolt.position.set(0.24,-0.105,-0.43);
    const boltBody = new THREE.Mesh(new THREE.BoxGeometry(0.075,0.045,0.17),dark);
    boltBody.castShadow = true;
    bolt.add(boltBody);
    const boltAccent = new THREE.Mesh(new THREE.BoxGeometry(0.082,0.018,0.055),glowPart);
    boltAccent.position.set(0,-0.012,0.035);
    bolt.add(boltAccent);
    gun.add(bolt);
    boltModel = bolt;

    addBox(0.24,-0.23,-0.36,bodyWidth,0.19,bodyLength,metal);
    addBox(0.24,-0.105,-0.38,bodyWidth*0.68,0.055,bodyLength*0.8,glowPart);
    addBox(0.24,-0.33,-0.2,bodyWidth*0.5,0.25,0.18,dark);

    if (compact) {
      addBox(0.24,-0.42,-0.13,0.13,0.22,0.16,metal);
      addBox(0.24,-0.51,-0.12,0.1,0.04,0.13,glowPart);
    } else if (shotgun) {
      addBox(0.24,-0.42,-0.25,0.23,0.28,0.19,metal);
      addBox(0.24,-0.21,0.04,0.3,0.15,0.22,dark);
      addBox(0.24,-0.14,0.08,0.22,0.045,0.14,glowPart);
    } else if (lmg) {
      addBox(0.24,-0.47,-0.34,0.32,0.34,0.3,metal);
      addBox(0.24,-0.48,-0.34,0.22,0.07,0.24,glowPart);
      addBox(0.24,-0.2,0.08,0.28,0.14,0.26,dark);
    } else {
      addBox(0.24,-0.42,-0.28,0.15,0.29,0.16,dark);
      addBox(0.24,-0.16,0.09,0.2,0.11,0.3,dark);
    }

    if (sniper || dmr) {
      addBox(0.24,-0.005,-0.32,0.12,0.13,0.44,metal);
    } else if (energy) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.12,0.026,8,28),glowPart);
      coil.position.set(0.24,-0.22,-0.56);
      gun.add(coil);
      const coil2 = coil.clone();
      coil2.position.z = -0.22;
      gun.add(coil2);
    } else if (burst) {
      addBox(0.36,-0.2,-0.5,0.055,0.08,0.48,glowPart);
    }

    if (shotgun) {
      addCylinder(0.17,-0.19,-0.55,barrelLength,0.045,metal);
      addCylinder(0.31,-0.19,-0.55,barrelLength,0.045,metal);
      muzzleFlash.position.set(0.24,-0.19,-0.55-barrelLength/2);
    } else {
      addCylinder(0.24,-0.19,-0.55,barrelLength,0.052,metal);
      const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.065,0.012,6,18),glowPart);
      muzzleRing.position.set(0.24,-0.19,-0.55-barrelLength);
      gun.add(muzzleRing);
      muzzleFlash.position.set(0.24,-0.19,-0.58-barrelLength);
    }
    if (sniper) {
      addBox(0.24,-0.21,0.22,0.16,0.14,0.45,metal);
      addBox(0.24,-0.29,0.4,0.19,0.09,0.2,dark);
    }
    if (smg) {
      addBox(0.24,-0.35,-0.25,0.17,0.28,0.17,metal);
      addBox(0.24,-0.47,-0.25,0.11,0.05,0.13,glowPart);
    }
    if (lmg) {
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.105,0.025,6,20,Math.PI*1.6),glowPart);
      belt.position.set(0.42,-0.34,-0.35);
      belt.rotation.z = Math.PI/2;
      gun.add(belt);
    }
    if (energy) {
      const chamber = new THREE.Mesh(new THREE.SphereGeometry(0.105,12,10),glowPart);
      chamber.position.set(0.24,-0.2,-0.25);
      gun.add(chamber);
    }

    // Precision-machined weapon finish: raised top rail, side plates and vent cuts.
    // These shared visual motifs make the procedural weapons read as manufactured objects.
    const railY = shotgun || lmg ? -0.075 : -0.055;
    addBox(0.24,railY,-0.43,bodyWidth*0.34,0.026,bodyLength*0.72,dark);
    addBox(0.24,railY+0.018,-0.43,bodyWidth*0.22,0.012,bodyLength*0.58,glowPart);
    addBox(0.24-bodyWidth*0.49,-0.235,-0.39,0.018,0.105,bodyLength*0.54,dark);
    addBox(0.24+bodyWidth*0.49,-0.235,-0.39,0.018,0.105,bodyLength*0.54,dark);
    for(let vent=0;vent<3;vent++){
      addBox(0.24+bodyWidth*0.505,-0.205,-0.31+vent*0.075,0.008,0.018,0.035,glowPart);
    }
    const receiverPin = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.012,12),glowPart);
    receiverPin.rotation.z=Math.PI/2;
    receiverPin.position.set(0.24-bodyWidth*0.53,-0.285,-0.22);
    gun.add(receiverPin);
    const muzzleCollar = new THREE.Mesh(new THREE.TorusGeometry(0.057,0.009,6,20),dark);
    muzzleCollar.position.copy(muzzleFlash.position);
    muzzleCollar.position.z += 0.075;
    gun.add(muzzleCollar);

    // Clear-aperture optic: only thin rings and a reticle are rendered.
    // No glass disks or capped cylinders sit in the sight line, so the world
    // remains fully visible through every weapon's optic while aiming.
    {
      const optic = new THREE.Group();
      optic.position.set(0.24,0.13,-0.43);
      const radius = sniper || dmr ? 0.075 : 0.079;
      const tubeLength = sniper || dmr ? 0.42 : 0.38;
      const rearRing = new THREE.Mesh(new THREE.TorusGeometry(radius,0.012,8,28),glowPart);
      rearRing.position.z = tubeLength / 2;
      optic.add(rearRing);
      const frontRing = new THREE.Mesh(new THREE.TorusGeometry(radius,0.012,8,28),glowPart);
      frontRing.position.z = -tubeLength / 2;
      optic.add(frontRing);
      const reticleZ = -tubeLength / 2 + 0.008;
      const reticleMaterial = new THREE.LineBasicMaterial({color:0xff5b63,transparent:true,opacity:0.9});
      const reticle = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.043,0,reticleZ),new THREE.Vector3(0.043,0,reticleZ),
        new THREE.Vector3(0,-0.043,reticleZ),new THREE.Vector3(0,0.043,reticleZ)
      ]);
      optic.add(new THREE.LineSegments(reticle,reticleMaterial));
      gun.add(optic);
    }
  }
  rebuildGun('R16');

  const enemyMat = new THREE.MeshPhysicalMaterial({ color: 0x8a3149, metalness: 0.58, roughness: 0.31, clearcoat:.28 });
  const allyMat = new THREE.MeshPhysicalMaterial({ color: 0x267aa5, metalness: 0.58, roughness: 0.31, clearcoat:.28 });
  function createCombatantVisual(team:number){
    const isAlly=team===localTeam;
    return createCombatantRig(isAlly?0x267aa5:0x8a3149,isAlly?0x63dfff:0xff647e).group;
  }
  const remotes = new Map<string, THREE.Group>();
  const practiceTargets: THREE.Group[] = [];
  const projectiles: Array<{mesh:THREE.Mesh;trail:THREE.Line;direction:THREE.Vector3;travelled:number;maxDistance:number;age:number;impactPoint:THREE.Vector3|null;impactColor:number}> = [];
  const damagePopups: THREE.Sprite[] = [];
  const thrownItemVisuals:Array<{mesh:THREE.Mesh;velocity:THREE.Vector3;age:number;fuseMs:number}> = [];
  const timedItemEffects:Array<{group:THREE.Group;startedAt:number;endsAt:number;kind:string}> = [];
  type FxParticle={object:THREE.Object3D;material:THREE.SpriteMaterial|THREE.MeshBasicMaterial;velocity:THREE.Vector3;age:number;life:number;gravity:number;drag:number;spin:THREE.Vector3;baseScale:THREE.Vector3;kind:'smoke'|'spark'|'ember'};
  const fxParticles:FxParticle[]=[];
  const shellVisuals:Array<{mesh:THREE.Mesh;velocity:THREE.Vector3;spin:THREE.Vector3;age:number}>=[];
  type SmokeCloud={mesh:THREE.Mesh;material:THREE.ShaderMaterial;velocity:THREE.Vector3;age:number;life:number;baseScale:THREE.Vector3;spin:number};
  type DebrisPiece={mesh:THREE.Mesh;velocity:THREE.Vector3;spin:THREE.Vector3;age:number;life:number};
  const smokeClouds:SmokeCloud[]=[];
  const debrisVisuals:DebrisPiece[]=[];
  const fxParticleLimit=isMobile?76:150;
  const fxParticleGeometry=new THREE.IcosahedronGeometry(.055,0);
  const shellGeometry=new THREE.CylinderGeometry(.022,.022,.115,8);
  const smokeVolumeGeometry=new THREE.SphereGeometry(1,16,12);
  const debrisGeometry=new THREE.DodecahedronGeometry(.08,0);
  const smokeVolumeVertexShader=`varying vec3 vLocalPosition;varying vec3 vLocalNormal;void main(){vLocalPosition=position;vLocalNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const smokeVolumeFragmentShader=`uniform vec3 uColor;uniform float uTime;uniform float uOpacity;varying vec3 vLocalPosition;varying vec3 vLocalNormal;void main(){float n1=sin(vLocalPosition.x*7.1+uTime*.8)*sin(vLocalPosition.y*8.3-uTime*.6)*sin(vLocalPosition.z*6.7+uTime*.45);float n2=sin(vLocalPosition.x*15.3-uTime*.4)*sin(vLocalPosition.y*13.1+uTime*.5)*sin(vLocalPosition.z*12.7-uTime*.7);float radius=length(vLocalPosition);float edge=1.0-smoothstep(.56,.99,radius+(n1*.09+n2*.035));float wisps=smoothstep(-.78,.48,n1*.72+n2*.28);float alpha=edge*(.24+wisps*.52)*uOpacity;if(alpha<.012)discard;float light=.68+.32*max(dot(normalize(vLocalNormal),normalize(vec3(-.35,.82,.44))),0.0);gl_FragColor=vec4(uColor*light,alpha);}`;

  const projectileColors:Record<string,number>={R16:0x4aa8ff,R9:0xffd166,VIPER:0x54e6b0,THUNDER:0xff8a45,LONGSHOT:0xa8d8ff,HELIX:0xb18aff,BASTION:0xffc45f,NOVA:0xff748e,ARC:0x57efff,PULSE:0xbe8cff,DORI:0xc98a4c};

  function createPracticeTargets() {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x244b70, metalness: 0.55, roughness: 0.3,
      emissive: 0x06264b, emissiveIntensity: 0.55
    });
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x69dfff, metalness: 0.35, roughness: 0.24,
      emissive: 0x0c79b4, emissiveIntensity: 1.1
    });
    for (const [x, z] of [[-5, -10], [5, -10], [0, -20]] as const) {
      const target = new THREE.Group();
      target.position.set(x, 0, z);
      target.userData.hp = 100;
      const targetBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.8, 5, 10), bodyMaterial);
      targetBody.position.y = 1.05;
      targetBody.castShadow = true;
      target.add(targetBody);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), headMaterial);
      head.position.y = 1.82;
      head.castShadow = true;
      target.add(head);
      const core = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 32), glow);
      core.position.y = 1.05;
      target.add(core);
      scene.add(target);
      target.visible = map.id === 'training_facility';
      practiceTargets.push(target);
    }
  }
  createPracticeTargets();
  const raycaster = new THREE.Raycaster();
  const keys = new Set<string>();
  const touch = { forward: 0, right: 0, jump: false };
  let precisionAiming = false;
  const normalFov = camera.fov;
  const precisionFov = 30;
  function setPrecisionAiming(enabled:boolean) {
    if (precisionAiming === enabled) return;
    precisionAiming = enabled;
    document.body.classList.toggle('precision-aiming', enabled);
    const button=document.getElementById('mobileAim');
    button?.classList.toggle('active',enabled);
    button?.setAttribute('aria-pressed',String(enabled));
  }
  let yaw = 0;
  let pitch = 0;
  let vertical = 0;
  let mode = 'practice';
  let currentWeaponCode = 'R16';
  let currentItemCode:RockeyItemCode='GRENADE';
  let itemInventory:Record<RockeyItemCode,number>={GRENADE:2,SMOKE:1,FLASH:1,PILLS:2,ENERGY:1};
  let energyUntil=0;
  let primaryWeaponCode = 'R16';
  let secondaryWeaponCode = 'R9';
  let currentWeapon: RockeyWeapon = WEAPONS.R16;
  let localTeam = 0;
  let sensitivity = 1;
  let replayFrames: ReplayFrame[] | null = null;
  let replayStartedAt = 0;
  let replayIndex = -1;
  let replayFocusId = '';
  let killcamReturnMode = '1v1';
  let killcamComplete: (() => void) | null = null;
  let mobileFireTimer = 0;
  let audioContext: AudioContext | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let gunKick = 0;
  let movementAmount = 0;
  let aimBlend = 0;
  let fireAnimationStart = 0;
  const reloadMotionProfiles:Record<string,{dip:number;roll:number;pitch:number}> = {
    R16:{dip:.12,roll:.10,pitch:.24},R9:{dip:.18,roll:.22,pitch:.34},
    VIPER:{dip:.10,roll:.08,pitch:.16},THUNDER:{dip:.25,roll:.30,pitch:.46},
    LONGSHOT:{dip:.34,roll:.16,pitch:.62},HELIX:{dip:.20,roll:.12,pitch:.32},
    BASTION:{dip:.16,roll:.08,pitch:.28},NOVA:{dip:.19,roll:.26,pitch:.38},
    ARC:{dip:.16,roll:.10,pitch:.22},PULSE:{dip:.15,roll:.12,pitch:.24}
  };
  const magazineReloadProfiles:Record<string,{out:number;in:number;drop:number;tilt:number;roll:number}> = {
    R16:{out:.10,in:.63,drop:.24,tilt:.16,roll:.06},
    R9:{out:.08,in:.58,drop:.19,tilt:.34,roll:.18},
    VIPER:{out:.16,in:.56,drop:.28,tilt:.12,roll:.04},
    THUNDER:{out:.08,in:.68,drop:.22,tilt:.28,roll:.12},
    LONGSHOT:{out:.18,in:.72,drop:.30,tilt:.42,roll:.10},
    HELIX:{out:.13,in:.65,drop:.25,tilt:.22,roll:.08},
    BASTION:{out:.07,in:.76,drop:.17,tilt:.12,roll:.04},
    NOVA:{out:.09,in:.60,drop:.20,tilt:.38,roll:.20},
    ARC:{out:.20,in:.70,drop:.23,tilt:.18,roll:.08},
    PULSE:{out:.14,in:.64,drop:.22,tilt:.20,roll:.08}
  };
  const weaponMotion:Record<string,{kick:number;reloadTilt:number;roll:number;sway:number;bob:number;fireTilt:number;switchRoll:number}> = {
    R16:{kick:.82,reloadTilt:.12,roll:.06,sway:.75,bob:1,fireTilt:.9,switchRoll:.42},
    R9:{kick:.95,reloadTilt:.2,roll:.12,sway:.55,bob:.8,fireTilt:1.12,switchRoll:.62},
    VIPER:{kick:.48,reloadTilt:.09,roll:.04,sway:.9,bob:1.12,fireTilt:.58,switchRoll:.34},
    THUNDER:{kick:1.28,reloadTilt:.38,roll:.2,sway:.48,bob:.72,fireTilt:1.4,switchRoll:.7},
    LONGSHOT:{kick:1.35,reloadTilt:.46,roll:.1,sway:.3,bob:.42,fireTilt:1.55,switchRoll:.58},
    HELIX:{kick:.88,reloadTilt:.16,roll:.08,sway:.42,bob:.62,fireTilt:.92,switchRoll:.46},
    BASTION:{kick:.56,reloadTilt:.28,roll:.22,sway:.34,bob:.5,fireTilt:.64,switchRoll:.76},
    NOVA:{kick:1.16,reloadTilt:.22,roll:.14,sway:.52,bob:.72,fireTilt:1.3,switchRoll:.68},
    ARC:{kick:.62,reloadTilt:.1,roll:.04,sway:.7,bob:.9,fireTilt:.72,switchRoll:.38},
    PULSE:{kick:.72,reloadTilt:.14,roll:.08,sway:.62,bob:.84,fireTilt:.82,switchRoll:.44},
    DORI:{kick:0,reloadTilt:.05,roll:.05,sway:.35,bob:.42,fireTilt:0,switchRoll:.22}
  };
  let reloadAnimationStart = 0;
  let reloadAnimationDuration = 0;
  let switchAnimationStart = 0;
  let doriSwingStart = 0;
  let movePointerId: number | null = null;
  let lookPointerId: number | null = null;
  let active = false;
  let disposed = false;
  let cameraMode: 'first' | 'third' = 'first';
  let hp = 100;
  let ammo = 30;
  let reserve = 90;
  const localWeaponAmmo: Record<string,{ammo:number;reserve:number}> = {};
  let seq = 0;
  let lastInput = 0;
  let jumpPending = false;
  let lastShot = 0;
  let reloadAt = 0;
  let raf = 0;
  let previous = performance.now();
  let perfWindowStart=previous;
  let perfFrames=0;
  let smoothedFrameMs=16.7;
  let adaptivePixelRatio=Math.min(window.devicePixelRatio||1,isMobile?1.25:1.8);
  const minPixelRatio=isMobile ? .78 : 1.0;
  const maxPixelRatio=Math.min(window.devicePixelRatio||1,isMobile?1.25:1.8);
  const performanceBadge=document.createElement('div');
  performanceBadge.style.cssText='position:fixed;top:calc(env(safe-area-inset-top, 0px) + 8px);right:10px;z-index:30;padding:6px 9px;border:1px solid rgba(130,190,230,.24);border-radius:7px;background:rgba(5,13,25,.68);color:#d9edff;font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.04em;pointer-events:none;backdrop-filter:blur(8px)';
  performanceBadge.textContent='FPS -- · FRAME -- ms';
  document.body.appendChild(performanceBadge);

  const position = () => {
    const p = body.translation();
    return new THREE.Vector3(p.x, p.y, p.z);
  };
  const setCamera = (next: 'first' | 'third') => {
    cameraMode = next;
    gun.visible = next === 'first';
    avatar.visible = next === 'third';
    const button = document.getElementById('cameraBtn');
    if (button) button.textContent = 'VIEW · ' + (next === 'first' ? 'FIRST' : 'THIRD') + ' [V]';
  };
  const toggleCamera = () => setCamera(cameraMode === 'first' ? 'third' : 'first');

  function setWeaponLocal(code: string, nextAmmo?: number, nextReserve?: number) {
    if (!WEAPONS[code]) return;
    const previousCode=currentWeaponCode;
    // Keep each weapon's own magazine and reserve when it is holstered.
    if (WEAPONS[previousCode]) localWeaponAmmo[previousCode]={ammo,reserve};
    currentWeaponCode = code;
    currentWeapon = WEAPONS[code];
    const stored=localWeaponAmmo[code];
    ammo = nextAmmo === undefined ? (stored?.ammo ?? currentWeapon.magazine) : Math.max(0,Math.min(currentWeapon.magazine,nextAmmo));
    reserve = nextReserve === undefined ? (stored?.reserve ?? currentWeapon.reserve) : Math.max(0,nextReserve);
    localWeaponAmmo[code]={ammo,reserve};
    reloadAt = 0;
    rebuildGun(code);
    switchAnimationStart=performance.now();
    playSwitchSound(previousCode,code);
    updateHud(hp,ammo,reserve,currentWeapon.name);
  }

  const soundProfiles: Record<string,{base:number;crack:number;wave:OscillatorType;duration:number}> = {
    R16:{base:92,crack:1180,wave:'sawtooth',duration:.105},
    R9:{base:138,crack:1780,wave:'square',duration:.085},
    VIPER:{base:72,crack:920,wave:'sawtooth',duration:.075},
    THUNDER:{base:48,crack:620,wave:'triangle',duration:.19},
    LONGSHOT:{base:42,crack:2100,wave:'sawtooth',duration:.24},
    HELIX:{base:112,crack:1480,wave:'triangle',duration:.12},
    BASTION:{base:66,crack:840,wave:'sawtooth',duration:.11},
    NOVA:{base:165,crack:1960,wave:'square',duration:.1},
    ARC:{base:240,crack:2650,wave:'sine',duration:.16},
    PULSE:{base:185,crack:2240,wave:'triangle',duration:.13}
  };
  function getAudioContext() {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  }
  function getNoiseBuffer(ctx:AudioContext) {
    if(noiseBuffer)return noiseBuffer;
    noiseBuffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.22),ctx.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.8);
    return noiseBuffer;
  }
  function playFireSound(code:string) {
    try {
      const ctx=getAudioContext(),profile=soundProfiles[code]||soundProfiles.R16,now=ctx.currentTime;
      const master=ctx.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.22,now+.004);master.gain.exponentialRampToValueAtTime(.0001,now+profile.duration);master.connect(ctx.destination);
      const low=ctx.createOscillator();low.type=profile.wave;low.frequency.setValueAtTime(profile.base*1.7,now);low.frequency.exponentialRampToValueAtTime(profile.base*.62,now+profile.duration);low.connect(master);low.start(now);low.stop(now+profile.duration);
      const snap=ctx.createOscillator();snap.type='triangle';snap.frequency.setValueAtTime(profile.crack,now);snap.frequency.exponentialRampToValueAtTime(profile.crack*.42,now+.035);
      const snapGain=ctx.createGain();snapGain.gain.setValueAtTime(.0001,now);snapGain.gain.exponentialRampToValueAtTime(.12,now+.002);snapGain.gain.exponentialRampToValueAtTime(.0001,now+.045);snap.connect(snapGain);snapGain.connect(ctx.destination);snap.start(now);snap.stop(now+.05);
      const noise=ctx.createBufferSource();noise.buffer=getNoiseBuffer(ctx);
      const noiseGain=ctx.createGain();noiseGain.gain.setValueAtTime(.0001,now);noiseGain.gain.exponentialRampToValueAtTime(code==='THUNDER'||code==='LONGSHOT'?.16:.075,now+.002);noiseGain.gain.exponentialRampToValueAtTime(.0001,now+profile.duration*.72);noise.connect(noiseGain);noiseGain.connect(ctx.destination);noise.start(now);noise.stop(now+profile.duration);
    } catch { /* Audio is optional; gameplay must continue if the device blocks it. */ }
  }
  function playReloadSound(code:string) {
    try {
      const ctx=getAudioContext(),now=ctx.currentTime;
      const metallic=code==='LONGSHOT'||code==='BASTION'||code==='THUNDER';
      const times=metallic?[0,.24,.58]:[0,.17,.39];
      times.forEach((offset,index)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type=index===1?'triangle':'square';
        osc.frequency.setValueAtTime((metallic?520:760)*(index===2?.72:1),now+offset);
        gain.gain.setValueAtTime(.0001,now+offset);
        gain.gain.exponentialRampToValueAtTime(.075,now+offset+.004);
        gain.gain.exponentialRampToValueAtTime(.0001,now+offset+.065);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(now+offset);osc.stop(now+offset+.07);
      });
    } catch { /* Audio is optional. */ }
  }

  function playSwitchSound(from:string,to:string) {
    try {
      const ctx=getAudioContext(),now=ctx.currentTime;
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=to==='DORI'?'sine':'triangle';
      osc.frequency.setValueAtTime(from==='LONGSHOT'?420:620,now);
      osc.frequency.exponentialRampToValueAtTime(to==='DORI'?260:980,now+.16);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.2);
    } catch { /* Audio is optional. */ }
  }
  function playMeleeSound() {
    try {
      const ctx=getAudioContext(),now=ctx.currentTime;
      const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';
      osc.frequency.setValueAtTime(190,now);osc.frequency.exponentialRampToValueAtTime(72,now+.18);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.19,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.2);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.21);
    } catch { /* Audio is optional. */ }
  }
  function emitFxParticle(position:THREE.Vector3,velocity:THREE.Vector3,kind:'smoke'|'spark'|'ember',life:number,size:number,color:number){
    while(fxParticles.length>=fxParticleLimit){
      const oldest=fxParticles.shift();
      if(oldest){scene.remove(oldest.object);oldest.material.dispose();}
    }
    const material=kind==='smoke'
      ? new THREE.SpriteMaterial({map:smokeTexture,color,transparent:true,opacity:.38,depthWrite:false,toneMapped:false})
      : new THREE.MeshBasicMaterial({color,transparent:true,opacity:kind==='ember'?.95:1,toneMapped:false});
    const object:THREE.Object3D=kind==='smoke'
      ? new THREE.Sprite(material as THREE.SpriteMaterial)
      : new THREE.Mesh(fxParticleGeometry,material as THREE.MeshBasicMaterial);
    object.position.copy(position);object.scale.setScalar(size);
    object.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
    scene.add(object);
    fxParticles.push({object,material,velocity:velocity.clone(),age:0,life,gravity:kind==='smoke'?-0.12:kind==='ember'?-1.8:-4.8,drag:kind==='smoke'?.18:kind==='ember'?.8:1.7,spin:new THREE.Vector3((Math.random()-.5)*5,(Math.random()-.5)*5,(Math.random()-.5)*5),baseScale:object.scale.clone(),kind});
  }
  function spawnVolumetricSmoke(position:THREE.Vector3,velocity:THREE.Vector3,color:number,size:number,life:number,puffs=2){
    const count=isMobile?Math.min(2,puffs):puffs;
    while(smokeClouds.length+count>(isMobile?16:34)){
      const oldest=smokeClouds.shift();
      if(oldest){scene.remove(oldest.mesh);oldest.material.dispose();}
    }
    for(let i=0;i<count;i++){
      const angle=Math.random()*Math.PI*2,offset=.22+Math.random()*.42;
      const material=new THREE.ShaderMaterial({
        uniforms:{uColor:{value:new THREE.Color(color)},uTime:{value:0},uOpacity:{value:.78}},
        vertexShader:smokeVolumeVertexShader,fragmentShader:smokeVolumeFragmentShader,
        transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
      });
      const mesh=new THREE.Mesh(smokeVolumeGeometry,material);
      mesh.position.copy(position).add(new THREE.Vector3(Math.cos(angle)*size*offset,(Math.random()-.5)*size*.22,Math.sin(angle)*size*offset));
      const baseScale=new THREE.Vector3(size*(.7+Math.random()*.35),size*(.78+Math.random()*.48),size*(.7+Math.random()*.35));
      mesh.scale.copy(baseScale).multiplyScalar(.62);
      mesh.rotation.set(Math.random()*.4,Math.random()*Math.PI*2,Math.random()*.4);
      mesh.renderOrder=2;mesh.frustumCulled=false;scene.add(mesh);
      smokeClouds.push({mesh,material,velocity:velocity.clone().add(new THREE.Vector3((Math.random()-.5)*.24,.08+Math.random()*.18,(Math.random()-.5)*.24)),age:0,life:life*(.86+Math.random()*.28),baseScale,spin:(Math.random()-.5)*.38});
    }
  }
  function spawnDebrisFx(position:THREE.Vector3,count:number,impulse:number){
    const limit=isMobile?20:46;
    while(debrisVisuals.length+count>limit){
      const oldest=debrisVisuals.shift();
      if(oldest){scene.remove(oldest.mesh);(oldest.mesh.material as THREE.Material).dispose();}
    }
    for(let i=0;i<count;i++){
      const angle=Math.random()*Math.PI*2;
      const material=new THREE.MeshStandardMaterial({color:map.palette==='amber'?0x927653:map.palette==='ice'?0x718b98:0x65717d,roughness:.94,metalness:.08,transparent:true,opacity:1});
      const mesh=new THREE.Mesh(debrisGeometry,material);
      const size=.45+Math.random()*.85;
      mesh.position.copy(position).add(new THREE.Vector3((Math.random()-.5)*.35,.08+Math.random()*.22,(Math.random()-.5)*.35));
      mesh.scale.set(size*(.7+Math.random()*.6),size*(.4+Math.random()*.6),size*(.7+Math.random()*.6));
      mesh.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
      mesh.castShadow=false;scene.add(mesh);
      const speed=impulse*(.48+Math.random()*.72);
      const velocity=new THREE.Vector3(Math.cos(angle)*speed,(.55+Math.random()*.9)*speed,Math.sin(angle)*speed);
      debrisVisuals.push({mesh,velocity,spin:new THREE.Vector3((Math.random()-.5)*9,(Math.random()-.5)*10,(Math.random()-.5)*9),age:0,life:2.2+Math.random()*1.8});
    }
  }
  function spawnImpactFx(position:THREE.Vector3,direction:THREE.Vector3,color:number){
    const count=isMobile?3:6;
    for(let i=0;i<count;i++){
      const velocity=direction.clone().multiplyScalar(.7+Math.random()*1.4).add(new THREE.Vector3((Math.random()-.5)*2,Math.random()*1.8,(Math.random()-.5)*2));
      emitFxParticle(position,velocity,'spark',.22+Math.random()*.2,.035+Math.random()*.025,color);
    }
    spawnVolumetricSmoke(position,direction.clone().multiplyScalar(.08).add(new THREE.Vector3(0,.18,0)),0x8795a5,.24,.82,1);
    if(!isMobile)spawnDebrisFx(position,2,1.25);
  }
  function spawnMuzzleFx(code:string,origin:THREE.Vector3,direction:THREE.Vector3){
    const color=projectileColors[code]||0xffd28a;
    const flashMaterial=muzzleFlash.material as THREE.MeshBasicMaterial;
    flashMaterial.color.setHex(color);
    (muzzleFlame.material as THREE.MeshBasicMaterial).color.setHex(color);
    (muzzleHalo.material as THREE.SpriteMaterial).color.setHex(color);
    muzzleLight.color.setHex(color);
    muzzleFx.position.copy(muzzleFlash.position);
    muzzleFx.scale.setScalar(code==='LONGSHOT'||code==='THUNDER'?1.28:1);
    muzzleFx.visible=true;muzzleFlash.visible=true;
    const sparks=isMobile?2:4;
    for(let i=0;i<sparks;i++){
      const velocity=direction.clone().multiplyScalar(2+Math.random()*2).add(new THREE.Vector3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*1.5));
      emitFxParticle(origin,velocity,'spark',.12+Math.random()*.12,.028+Math.random()*.025,color);
    }
    emitFxParticle(origin,direction.clone().multiplyScalar(.45).add(new THREE.Vector3(0,.35,0)),'smoke',.55,.12,0xaab6c5);
    if(Math.random()>.28)emitFxParticle(origin,direction.clone().multiplyScalar(.25).add(new THREE.Vector3(0,.55,0)),'smoke',.72,.095,0x77899c);
  }
  function spawnShellCasing(origin:THREE.Vector3){
    while(shellVisuals.length>=(isMobile?8:16)){
      const oldest=shellVisuals.shift();
      if(oldest){scene.remove(oldest.mesh);(oldest.mesh.material as THREE.Material).dispose();}
    }
    const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    const mesh=new THREE.Mesh(shellGeometry,new THREE.MeshStandardMaterial({color:0xd7b56d,metalness:.9,roughness:.22}));
    mesh.position.copy(origin).addScaledVector(right,.24).addScaledVector(up,-.16);
    mesh.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
    mesh.castShadow=false;scene.add(mesh);
    const velocity=right.clone().multiplyScalar(1.45+Math.random()*.8).addScaledVector(up,.9+Math.random()*.75).add(new THREE.Vector3((Math.random()-.5)*.5,.15,(Math.random()-.5)*.5));
    shellVisuals.push({mesh,velocity,spin:new THREE.Vector3(7+Math.random()*7,5+Math.random()*6,8+Math.random()*8),age:0});
  }
  function spawnExplosionFx(position:THREE.Vector3,radius:number,durationMs:number){
    // Explosions can permanently break nearby tactical crates and cabinets.
    tacticalLevel.destroyNear(position,radius,(p,count,impulse)=>spawnDebrisFx(p,count,impulse));
    const group=new THREE.Group();group.position.copy(position);
    const coreMaterial=new THREE.MeshBasicMaterial({color:0xffa14d,transparent:true,opacity:.92,toneMapped:false,depthWrite:false});
    const core=new THREE.Mesh(new THREE.SphereGeometry(.48,14,12),coreMaterial);core.scale.set(1,.76,1);group.add(core);
    const ringMaterial=new THREE.MeshBasicMaterial({color:0xffd18a,transparent:true,opacity:.95,toneMapped:false,depthWrite:false});
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.045,7,36),ringMaterial);ring.rotation.x=Math.PI/2;group.add(ring);
    const innerMaterial=new THREE.MeshBasicMaterial({color:0xff754b,transparent:true,opacity:.75,toneMapped:false,depthWrite:false});
    const innerRing=new THREE.Mesh(new THREE.TorusGeometry(.4,.025,6,30),innerMaterial);innerRing.rotation.x=Math.PI/2;group.add(innerRing);
    const light=new THREE.PointLight(0xff934d,9,Math.max(8,radius*3),2);light.position.y=.6;group.add(light);
    scene.add(group);const now=performance.now();timedItemEffects.push({group,startedAt:now,endsAt:now+Math.max(350,durationMs),kind:'GRENADE'});
    const sparkCount=isMobile?16:30;
    for(let i=0;i<sparkCount;i++){
      const angle=Math.random()*Math.PI*2,elevation=(Math.random()-.5)*1.25;
      const velocity=new THREE.Vector3(Math.cos(angle)*Math.cos(elevation),Math.sin(elevation)+.45,Math.sin(angle)*Math.cos(elevation)).multiplyScalar(2.8+Math.random()*5.2);
      emitFxParticle(position,velocity,'ember',.45+Math.random()*.55,.045+Math.random()*.04,i%3===0?0xffe3a4:0xff7548);
    }
    for(let i=0;i<(isMobile?3:6);i++){
      const angle=Math.random()*Math.PI*2,spread=Math.random()*radius*.24;
      const puffPosition=position.clone().add(new THREE.Vector3(Math.cos(angle)*spread,.18+Math.random()*.35,Math.sin(angle)*spread));
      const velocity=new THREE.Vector3(Math.cos(angle)*(.18+Math.random()*.35),.32+Math.random()*.55,Math.sin(angle)*(.18+Math.random()*.35));
      spawnVolumetricSmoke(puffPosition,velocity,i%2?0x687583:0x92989e,.72+Math.random()*.32,2.6+Math.random()*1.5,1);
    }
    spawnDebrisFx(position,isMobile?5:11,5.7);
  }
  function spawnProjectile(origin:THREE.Vector3,direction:THREE.Vector3,code:string,range:number) {
    const color=projectileColors[code]||0xffffff;
    const blocker=new THREE.Raycaster(origin,direction,0,range).intersectObjects(raycastMeshes,false)[0];
    const visibleRange=blocker?Math.max(.15,blocker.distance):range;
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color,toneMapped:false}));
    const start=origin.clone().addScaledVector(direction,.5);mesh.position.copy(start);scene.add(mesh);
    const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([start.clone().addScaledVector(direction,-.55),start]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.78,toneMapped:false}));
    scene.add(trail);projectiles.push({mesh,trail,direction:direction.clone().normalize(),travelled:0,maxDistance:visibleRange,age:0,impactPoint:blocker?blocker.point.clone():null,impactColor:color});
  }
  function showDamageAt(position:THREE.Vector3,damage:number,headshot:boolean) {
    // Wide, high-resolution label with measured text bounds and generous padding.
    // This prevents long HEADSHOT labels or large damage values being cropped.
    const label=document.createElement('canvas');label.width=640;label.height=144;
    const ctx=label.getContext('2d');if(!ctx)return;
    const text=(headshot?'HEADSHOT  ':'')+damage;
    ctx.font='700 48px Arial';
    ctx.textAlign='center';ctx.textBaseline='middle';
    const centerX=label.width/2,centerY=label.height/2;
    ctx.lineJoin='round';ctx.lineWidth=9;ctx.strokeStyle='rgba(10,18,30,.94)';
    ctx.strokeText(text,centerX,centerY);
    ctx.fillStyle=headshot?'#ffe08a':'#ffffff';ctx.fillText(text,centerX,centerY);
    const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
    const sprite=new THREE.Sprite(material);
    sprite.position.copy(position).add(new THREE.Vector3(.78,1.55,0));
    sprite.scale.set(2.15,.484,1);
    sprite.userData.startedAt=performance.now();sprite.userData.baseY=sprite.position.y;
    scene.add(sprite);damagePopups.push(sprite);
  }
  function showDamageOnTarget(targetId:string,targetName:string,damage:number,headshot:boolean) {
    const target=remotes.get(targetId)||[...remotes.values()].find(mesh=>mesh.userData.playerName===targetName);
    if(target)showDamageAt(target.position.clone(),damage,headshot);
  }
  function showShot(x:number,y:number,z:number,shotYaw:number,shotPitch:number,weaponCode:string) {
    if(weaponCode==='DORI')return;
    const cp=Math.cos(shotPitch);
    const direction=new THREE.Vector3(-Math.sin(shotYaw)*cp,Math.sin(shotPitch),-Math.cos(shotYaw)*cp).normalize();
    spawnProjectile(new THREE.Vector3(x,y,z),direction,weaponCode,WEAPONS[weaponCode]?.range||70);
  }
  function currentItemCount(){return Math.max(0,itemInventory[currentItemCode]||0);}
  function emitItemState(){window.dispatchEvent(new CustomEvent('rockey:item-state',{detail:{itemCode:currentItemCode,inventory:{...itemInventory}}}));}
  function updateItemHud(){
    const label=document.getElementById('itemLabel'),count=document.getElementById('itemCount'),mobile=document.getElementById('mobileItem');
    const remaining=currentItemCount();
    if(label)label.textContent=ITEMS[currentItemCode].name;if(count)count.textContent=remaining+'개 남음';if(mobile)mobile.textContent='PICK';
    const button=document.getElementById('itemUseBtn') as HTMLButtonElement|null,mobileUse=document.getElementById('mobileUse') as HTMLButtonElement|null;
    if(button)button.disabled=remaining<=0;if(mobileUse)mobileUse.disabled=remaining<=0;
  }
  function setItemLocal(code:string,count:number){
    const safeCode=(code in ITEMS?code:'GRENADE') as RockeyItemCode;
    currentItemCode=safeCode;itemInventory[safeCode]=Math.max(0,Math.min(10,Math.floor(count)));updateItemHud();emitItemState();
  }
  function setItemInventory(selectedCode:string,inventory?:Record<string,number>){
    if(inventory)for(const item of Object.values(ITEMS)){const count=Number(inventory[item.code]);if(Number.isFinite(count))itemInventory[item.code]=Math.max(0,Math.min(10,Math.floor(count)));}
    if(selectedCode in ITEMS)currentItemCode=selectedCode as RockeyItemCode;
    updateItemHud();emitItemState();
  }
  function selectItem(code:string){
    if(!(code in ITEMS))return;
    const selected=code as RockeyItemCode;
    if((itemInventory[selected]||0)<=0){notify('해당 아이템이 모두 소진되었습니다.');return;}
    currentItemCode=selected;updateItemHud();emitItemState();
    if(mode!=='practice'){send({type:'item.select',itemCode:selected});return;}
    notify(ITEMS[selected].name+' 선택 · USE 버튼으로 사용');
  }
  function consumeSelectedItem(){itemInventory[currentItemCode]=Math.max(0,currentItemCount()-1);updateItemHud();emitItemState();}
  function showThrownItem(itemCode:string,x:number,y:number,z:number,throwYaw:number,throwPitch:number,fuseMs:number){
    const color=itemCode==='GRENADE'?0xe5a94d:itemCode==='SMOKE'?0xb5c3cf:0x8cecff;
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.32,emissive:color,emissiveIntensity:.25}));
    mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);const cp=Math.cos(throwPitch);
    const direction=new THREE.Vector3(-Math.sin(throwYaw)*cp,Math.sin(throwPitch),-Math.cos(throwYaw)*cp).normalize();
    thrownItemVisuals.push({mesh,velocity:direction.multiplyScalar(8.5).add(new THREE.Vector3(0,3.2,0)),age:0,fuseMs});
  }
  function showItemEffect(effect:string,x:number,y:number,z:number,radius:number,durationMs:number){
    if(effect==='FLASH'){
      const overlay=document.getElementById('flashOverlay');
      if(overlay){overlay.classList.add('active');window.setTimeout(()=>overlay.classList.remove('active'),Math.max(220,durationMs));}
      return;
    }
    const position=new THREE.Vector3(x,y,z);
    if(effect==='GRENADE'){spawnExplosionFx(position,radius,durationMs);return;}
    if(effect==='SMOKE'){
      const count=isMobile?7:14,life=Math.max(3.6,Math.min(8.2,durationMs/1000*.95));
      for(let i=0;i<count;i++){
        const angle=Math.random()*Math.PI*2,spread=Math.random()*radius*.58;
        const velocity=new THREE.Vector3(Math.cos(angle)*(.1+Math.random()*.24),.24+Math.random()*.42,Math.sin(angle)*(.1+Math.random()*.24));
        const puffPosition=position.clone().add(new THREE.Vector3(Math.cos(angle)*spread,Math.random()*.55,Math.sin(angle)*spread));
        spawnVolumetricSmoke(puffPosition,velocity,i%3===0?0x9aa7b6:0x768696,.72+Math.random()*.48,life*(.82+Math.random()*.24),1);
      }
    }
  }
  function useItem(){
    if(!active)return;if(currentItemCount()<=0){notify('선택한 아이템을 모두 사용했습니다.');return;}
    if(mode!=='practice'){send({type:'item.use',itemCode:currentItemCode});return;}
    if(currentItemCode==='PILLS'){if(hp>=100){notify('체력이 이미 가득 찼습니다.');return;}hp=Math.min(100,hp+35);consumeSelectedItem();updateHud(hp,ammo,reserve,currentWeapon.name);notify('체력 +35');return;}
    if(currentItemCode==='ENERGY'){energyUntil=performance.now()+8000;consumeSelectedItem();notify('이동 속도 100% 증가 · 8초');return;}
    camera.updateMatrixWorld(true);const origin=camera.getWorldPosition(new THREE.Vector3()),direction=camera.getWorldDirection(new THREE.Vector3());
    const impact=origin.clone().addScaledVector(direction,7.2);impact.y=Math.max(.75,impact.y);
    const usedCode=currentItemCode,fuseMs=usedCode==='GRENADE'?1050:usedCode==='SMOKE'?850:650;
    showThrownItem(usedCode,origin.x,origin.y,origin.z,yaw,pitch,fuseMs);consumeSelectedItem();
    window.setTimeout(()=>{
      if(disposed)return;showItemEffect(usedCode,impact.x,impact.y,impact.z,usedCode==='GRENADE'?6:4.5,usedCode==='SMOKE'?8000:usedCode==='FLASH'?700:480);
      if(usedCode==='GRENADE')for(const target of practiceTargets){
        if(!target.visible)continue;const distance=target.position.distanceTo(impact);if(distance>6)continue;
        const damage=Math.max(1,Math.round(78*(1-distance/6)));showDamageAt(target.position.clone(),damage,false);
        target.userData.hp=Math.max(0,Number(target.userData.hp||100)-damage);
        if(target.userData.hp<=0){target.visible=false;window.setTimeout(()=>{if(!disposed){target.userData.hp=100;target.visible=true;}},1800);}
      }
    },fuseMs);
  }

  function stopMobileFire() {
    if (mobileFireTimer) window.clearInterval(mobileFireTimer);
    mobileFireTimer = 0;
  }

  function fire() {
    const now = performance.now();
    if (!active || now - lastShot < currentWeapon.fireInterval || ammo <= 0 || now < reloadAt) return;
    lastShot = now;
    fireAnimationStart = now;
    const melee=currentWeapon.category==='MELEE';
    if(!melee){ammo-=1;localWeaponAmmo[currentWeaponCode]={ammo,reserve};}
    gunKick = Math.min(1.8,gunKick+(weaponMotion[currentWeaponCode]?.kick||.82));
    camera.updateMatrixWorld(true);
    const origin=camera.getWorldPosition(new THREE.Vector3());
    const direction=camera.getWorldDirection(new THREE.Vector3());
    if(melee){doriSwingStart=now;playMeleeSound();}else{
      playFireSound(currentWeaponCode);
      spawnProjectile(origin,direction,currentWeaponCode,currentWeapon.range);
      spawnMuzzleFx(currentWeaponCode,muzzleFlash.getWorldPosition(new THREE.Vector3()),direction);
      spawnShellCasing(origin);
    }
    updateHud(hp, ammo, reserve, currentWeapon.name);

    if (mode === 'practice') {
      const shotRay = new THREE.Raycaster(origin, direction, 0, currentWeapon.range);
      const candidates = practiceTargets.filter(target => target.visible).flatMap(target => target.children);
      const targetHit = shotRay.intersectObjects(candidates, true)[0];
      const wallHit = shotRay.intersectObjects(raycastMeshes, false)[0];
      const hit = targetHit && (!wallHit || targetHit.distance < wallHit.distance - .015) ? targetHit : null;
      if (hit) {
        const target = hit.object.parent as THREE.Group;
        const headshot=hit.object===target.children[1];
        const practiceDamage = Math.round(currentWeapon.damage * (headshot?1.3:1) * (currentWeapon.pellets || 1));
        showDamageAt(target.position.clone(),practiceDamage,headshot);
        target.userData.hp = Math.max(0, Number(target.userData.hp || 100) - practiceDamage);
        if (target.userData.hp <= 0) {
          target.visible = false;
          notify('TARGET ELIMINATED');
          window.setTimeout(() => {
            if(disposed)return;
            target.userData.hp = 100;
            target.visible = true;
          }, 2200);
        } else {
          // Damage is shown beside the struck target in-world, not in a top-center toast.
        }
      }
    } else {
      send({ type: 'fire', weaponCode: currentWeaponCode, sequence: ++seq });
    }
    if (mode === 'practice' && !melee) {
      pitch = THREE.MathUtils.clamp(pitch + Math.min(0.045,0.012+currentWeapon.damage/2500+currentWeapon.spread*0.25),-1.3,1.3);
      yaw += (Math.random()-0.5)*0.003;
    }

    // Muzzle flash lifetime and point-light intensity are animated centrally in frame().
  }

  function reload() {
    if (!active || currentWeapon.category==='MELEE' || ammo >= currentWeapon.magazine || reserve <= 0 || performance.now() < reloadAt) return;
    reloadAt = performance.now() + currentWeapon.reloadMs;
    reloadAnimationStart = performance.now();
    reloadAnimationDuration = currentWeapon.reloadMs;
    playReloadSound(currentWeaponCode);
    if (mode === 'practice') {
      window.setTimeout(() => {
        if(disposed)return;
        const amount = Math.min(currentWeapon.magazine - ammo, reserve);
        ammo += amount;
        reserve -= amount;
        localWeaponAmmo[currentWeaponCode]={ammo,reserve};
        reloadAt = 0;
        updateHud(hp, ammo, reserve, currentWeapon.name);
      }, currentWeapon.reloadMs);
    } else {
      send({ type: 'reload' });
    }
  }

  function keyDown(event: KeyboardEvent) {
    if (event.code === 'Space') event.preventDefault();
    keys.add(event.code);
    if (event.code === 'KeyV') toggleCamera();
    if (event.code === 'KeyR') reload();
    // G opens the item picker in main.ts; item use is a separate action.
    if (event.code === 'KeyQ') {
      if (mode === 'practice') {
        const next = currentWeaponCode === primaryWeaponCode ? secondaryWeaponCode : primaryWeaponCode;
        setWeaponLocal(next);
      } else {
        send({ type: 'weapon.switch' });
      }
    }
    if (event.code === 'Space') touch.jump = true;
  }
  function keyUp(event: KeyboardEvent) {
    keys.delete(event.code);
    if (event.code === 'Space') touch.jump = false;
  }
  function look(dx: number, dy: number) {
    yaw -= dx * 0.0022 * sensitivity;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.002 * sensitivity, -1.3, 1.3);
  }
  function pointerMove(event: MouseEvent) {
    if (document.pointerLockElement === canvas) look(event.movementX, event.movementY);
  }
  function pointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button === 2) { event.preventDefault(); setPrecisionAiming(true); }
    if (event.pointerType === 'mouse' && event.button === 0) fire();
    if (event.pointerType === 'touch') {
      lookPointerId = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      (canvas as HTMLCanvasElement & { lx?: number; ly?: number }).lx = event.clientX;
      (canvas as HTMLCanvasElement & { lx?: number; ly?: number }).ly = event.clientY;
    }
  }
  function pointerDrag(event: PointerEvent) {
    if (document.pointerLockElement === canvas) return;
    if (event.pointerType !== 'touch' || event.pointerId !== lookPointerId) return;
    const element = canvas as HTMLCanvasElement & { lx?: number; ly?: number };
    if (element.lx === undefined || element.ly === undefined) return;
    look(event.clientX - element.lx, event.clientY - element.ly);
    element.lx = event.clientX;
    element.ly = event.clientY;
  }
  function pointerLookEnd(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button === 2) setPrecisionAiming(false);
    if (event.pointerId !== lookPointerId) return;
    lookPointerId = null;
    const element = canvas as HTMLCanvasElement & { lx?: number; ly?: number };
    delete element.lx;
    delete element.ly;
  }
  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  function clickCanvas() {
    if (window.matchMedia('(pointer:fine)').matches && !document.pointerLockElement) {
      canvas.requestPointerLock?.();
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('pointerup', event => { if(event.pointerType==='mouse'&&event.button===2)setPrecisionAiming(false); });
  window.addEventListener('blur', () => setPrecisionAiming(false));
  document.addEventListener('contextmenu', event => { if(event.target===canvas)event.preventDefault(); });
  canvas.addEventListener('click', clickCanvas);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerDrag);
  canvas.addEventListener('pointerup', pointerLookEnd);
  canvas.addEventListener('pointercancel', pointerLookEnd);
  canvas.addEventListener('lostpointercapture', pointerLookEnd);
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  window.visualViewport?.addEventListener('resize', resize);
  const resetAllInput = () => {
    keys.clear();
    touch.forward = 0; touch.right = 0; touch.jump = false;
    resetPad();
    stopMobileFire();
    previous = performance.now();
  };
  const onVisibilityChange = () => {
    if (document.hidden) resetAllInput();
    previous = performance.now();
  };
  const onWindowBlur = () => resetAllInput();
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);
  resize();

  const pad = document.getElementById('movePad');
  const stick = document.getElementById('moveStick');
  const resetPad = () => {
    movePointerId = null;
    touch.forward = 0; touch.right = 0;
    if (stick instanceof HTMLElement) stick.style.transform = 'translate(0,0)';
  };
  const updatePad = (event: PointerEvent) => {
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const x = THREE.MathUtils.clamp(event.clientX - rect.left - rect.width / 2, -rect.width * 0.38, rect.width * 0.38);
    const y = THREE.MathUtils.clamp(event.clientY - rect.top - rect.height / 2, -rect.height * 0.38, rect.height * 0.38);
    touch.right = THREE.MathUtils.clamp(x / (rect.width * 0.38), -1, 1);
    touch.forward = THREE.MathUtils.clamp(-y / (rect.height * 0.38), -1, 1);
    if (stick instanceof HTMLElement) stick.style.transform = 'translate(' + x * 0.35 + 'px,' + y * 0.35 + 'px)';
  };
  pad?.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (movePointerId !== null) return;
    movePointerId = event.pointerId;
    pad.setPointerCapture(event.pointerId);
    updatePad(event);
  });
  pad?.addEventListener('pointermove', event => {
    if (event.pointerId !== movePointerId) return;
    updatePad(event);
  });
  pad?.addEventListener('pointerup', event => { if(event.pointerId===movePointerId)resetPad(); });
  pad?.addEventListener('pointercancel', event => { if(event.pointerId===movePointerId)resetPad(); });
  pad?.addEventListener('lostpointercapture', event => { if(event.pointerId===movePointerId)resetPad(); });
  const mobileAim = document.getElementById('mobileAim');
  const stopMobileAim = () => setPrecisionAiming(false);
  mobileAim?.addEventListener('pointerdown',event=>{event.preventDefault();mobileAim.setPointerCapture(event.pointerId);setPrecisionAiming(true);});
  mobileAim?.addEventListener('pointerup',stopMobileAim);
  mobileAim?.addEventListener('pointercancel',stopMobileAim);
  mobileAim?.addEventListener('lostpointercapture',stopMobileAim);
  const mobileFire = document.getElementById('mobileFire');
  mobileFire?.addEventListener('pointerdown', event => {
    event.preventDefault();
    mobileFire.setPointerCapture(event.pointerId);
    fire();
    stopMobileFire();
    mobileFireTimer = window.setInterval(fire,85);
  });
  mobileFire?.addEventListener('pointerup',stopMobileFire);
  mobileFire?.addEventListener('pointercancel',stopMobileFire);
  mobileFire?.addEventListener('lostpointercapture',stopMobileFire);
  const mobileJump = document.getElementById('mobileJump');
  mobileJump?.addEventListener('pointerdown', event => { event.preventDefault(); mobileJump.setPointerCapture(event.pointerId); touch.jump = true; });
  const stopJump = () => { touch.jump = false; };
  mobileJump?.addEventListener('pointerup', stopJump);
  mobileJump?.addEventListener('pointercancel', stopJump);
  mobileJump?.addEventListener('lostpointercapture', stopJump);
  document.getElementById('mobileReload')?.addEventListener('pointerdown', reload);
  document.getElementById('mobileView')?.addEventListener('pointerdown', toggleCamera);
  document.getElementById('mobileItem')?.addEventListener('pointerdown',event=>{event.preventDefault();useItem();});
  document.getElementById('itemUseBtn')?.addEventListener('click',useItem);

  function disposeObjectResources(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const attached = Array.isArray(object.material) ? object.material : [object.material];
      attached.forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
  }

  function setRemotePlayers(players: RemotePlayer[]) {
    const ids = new Set(players.map(player => player.id));
    for (const [id, mesh] of remotes) {
      if (!ids.has(id)) {
        scene.remove(mesh);
        disposeObjectResources(mesh);
        remotes.delete(id);
      }
    }
    for (const player of players) {
      let mesh = remotes.get(player.id);
      if (!mesh) {
        mesh = createCombatantVisual(player.team);
        mesh.position.set(player.x,player.y-0.08,player.z);
        mesh.rotation.y=player.yaw;
        scene.add(mesh);
        remotes.set(player.id, mesh);
      }
      mesh.userData.playerName=player.name;
      mesh.userData.targetX=player.x;
      mesh.userData.targetY=player.y-0.08;
      mesh.userData.targetZ=player.z;
      mesh.userData.targetYaw=player.yaw;
      mesh.visible = player.connected !== false && player.alive !== false && player.health > 0;
    }
  }

  function frame(now: number) {
    if (disposed) return;
    if (document.hidden) {
      previous = now;
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    perfFrames++;
    const frameMs=Math.min(100,dt*1000);
    smoothedFrameMs=smoothedFrameMs*.92+frameMs*.08;
    if(now-perfWindowStart>=2500){
      const fps=perfFrames*1000/(now-perfWindowStart);
      const target=isMobile?48:55;
      if(fps<target-5&&adaptivePixelRatio>minPixelRatio){
        adaptivePixelRatio=Math.max(minPixelRatio,adaptivePixelRatio-.1);
        renderer.setPixelRatio(adaptivePixelRatio);resize();
      }else if(fps>target+12&&adaptivePixelRatio<maxPixelRatio){
        adaptivePixelRatio=Math.min(maxPixelRatio,adaptivePixelRatio+.05);
        renderer.setPixelRatio(adaptivePixelRatio);resize();
      }
      const measuredFps=Math.round(fps);
      const measuredFrame=Math.round(smoothedFrameMs*10)/10;
      performanceBadge.textContent='FPS '+measuredFps+' · FRAME '+measuredFrame+' ms · DPR '+adaptivePixelRatio.toFixed(2);
      performanceBadge.style.color=measuredFps<target?'#ffb4a8':'#d9edff';
      window.dispatchEvent(new CustomEvent('rockey:performance',{detail:{
        fps:measuredFps,frameMs:measuredFrame,
        pixelRatio:Math.round(adaptivePixelRatio*100)/100,device:isMobile?'mobile':'desktop'
      }}));
      perfWindowStart=now;perfFrames=0;
    }
    aimBlend=THREE.MathUtils.damp(aimBlend,precisionAiming?1:0,13,dt);
    const targetFov=precisionAiming?precisionFov:normalFov;
    const nextFov=THREE.MathUtils.damp(camera.fov,targetFov,12,dt);
    if(Math.abs(nextFov-camera.fov)>.04){camera.fov=nextFov;camera.updateProjectionMatrix();}
    const remoteBlend=1-Math.exp(-18*dt);
    gunKick*=Math.exp(-17*dt);
    movementAmount*=Math.exp(-9*dt);
    const reloadProgress=reloadAnimationStart?THREE.MathUtils.clamp((now-reloadAnimationStart)/Math.max(1,reloadAnimationDuration),0,1):1;
    if(reloadProgress>=1)reloadAnimationStart=0;
    const reloadWave=reloadAnimationStart?Math.sin(reloadProgress*Math.PI):0;
    const switchProgress=switchAnimationStart?THREE.MathUtils.clamp((now-switchAnimationStart)/460,0,1):1;
    if(switchProgress>=1)switchAnimationStart=0;
    const switchWave=switchAnimationStart?Math.sin(switchProgress*Math.PI):0;
    const doriProgress=doriSwingStart?THREE.MathUtils.clamp((now-doriSwingStart)/360,0,1):1;
    if(doriProgress>=1)doriSwingStart=0;
    const doriWave=doriSwingStart?Math.sin(doriProgress*Math.PI):0;
    const motion=weaponMotion[currentWeaponCode]||weaponMotion.R16;
    const time=now*.001;
    const fireAge=fireAnimationStart?now-fireAnimationStart:9999;
    const fireWave=fireAge<260?Math.exp(-fireAge/72):0;
    if(fireAge>300)fireAnimationStart=0;
    const weaponAimBlend=currentWeapon.category==='MELEE'?0:aimBlend;
    const idleSway=Math.sin(time*1.65)*.0045*motion.sway*(1-weaponAimBlend*.82);
    const idleRoll=Math.cos(time*1.25)*.006*motion.sway*(1-weaponAimBlend*.82);
    const walkWave=Math.sin(time*10.8);
    const walkSide=Math.cos(time*5.4);
    const walkAmount=movementAmount*motion.bob*(1-weaponAimBlend*.48);
    const reloadMotion=reloadMotionProfiles[currentWeaponCode]||reloadMotionProfiles.R16;
    const reloadDip=reloadWave*(.075+reloadMotion.dip);
    const switchDip=switchWave*.16;
    const melee=currentWeapon.category==='MELEE';
    const meleeArc=doriSwingStart?Math.sin(doriProgress*Math.PI):0;
    const meleeFollow=doriSwingStart?Math.sin(doriProgress*Math.PI*2):0;

    // Hip-fire rests low and to the right. While aiming, smoothly shoulder the
    // weapon and align its optic with the camera center; release eases it back.
    gun.position.set(
      idleSway+walkSide*.012*walkAmount-weaponAimBlend*.24,
      -reloadDip-switchDip+Math.abs(walkWave)*.009*walkAmount-weaponAimBlend*.13,
      gunKick*.115+reloadWave*.19+switchWave*.24+fireWave*.025+weaponAimBlend*.075
    );
    if(melee){
      gun.rotation.set(
        -meleeArc*.52+meleeFollow*.12,
        meleeFollow*.42,
        -meleeArc*.82+idleRoll+walkSide*.018*walkAmount
      );
    }else{
      gun.rotation.set(
        (reloadWave*(.3+reloadMotion.pitch)+switchWave*.3+gunKick*.075*motion.fireTilt+fireWave*.035*motion.fireTilt)*(1-weaponAimBlend*.88),
        (idleSway*2+walkSide*.018*walkAmount+switchWave*.12)*(1-weaponAimBlend*.88),
        (reloadWave*(.12+reloadMotion.roll)+switchWave*motion.switchRoll+idleRoll+walkSide*.025*walkAmount)*(1-weaponAimBlend*.88)
      );
    }

    if(magazineModel){
      // Weapon-specific reload choreography: eject, present, seat and lock.
      const reloadActive=reloadAnimationStart>0;
      const style=magazineReloadProfiles[currentWeaponCode]||magazineReloadProfiles.R16;
      const out=THREE.MathUtils.smoothstep(reloadProgress,style.out,style.out+.18);
      const seat=THREE.MathUtils.smoothstep(reloadProgress,style.in,style.in+.16);
      const magTravel=reloadActive?out*(1-seat):0;
      magazineModel.position.set(.24,-.405-magTravel*style.drop,-.37+magTravel*.035);
      magazineModel.rotation.set(magTravel*style.tilt,0,magTravel*style.roll);
      // A crisp upward seat at the final beat sells the magazine locking in.
      const lock=reloadActive?Math.max(0,1-Math.abs(reloadProgress-(style.in+.12))/.075):0;
      magazineModel.position.y-=lock*.025;
    }
    weaponHands.group.visible=!melee;
    weaponHands.update(reloadProgress,reloadAnimationStart>0,walkAmount,fireWave,weaponAimBlend);
    if(boltModel){
      const boltKick=fireWave*.095;
      const boltReload=reloadAnimationStart?(
        currentWeaponCode==='LONGSHOT'
          ? -THREE.MathUtils.smoothstep(reloadProgress,.68,.82)*.24*(1-THREE.MathUtils.smoothstep(reloadProgress,.84,.98))
          : currentWeaponCode==='THUNDER'
            ? -Math.sin(THREE.MathUtils.clamp((reloadProgress-.48)/.28,0,1)*Math.PI)*.17
            : currentWeaponCode==='HELIX'
              ? Math.sin(THREE.MathUtils.clamp((reloadProgress-.62)/.22,0,1)*Math.PI)*.10
              : currentWeaponCode==='BASTION'
                ? Math.sin(THREE.MathUtils.clamp((reloadProgress-.78)/.18,0,1)*Math.PI)*.07
                : Math.sin(reloadProgress*Math.PI)*.045
      ):0;
      boltModel.position.z=-.43+boltKick+boltReload;
      boltModel.rotation.x=reloadAnimationStart&&currentWeaponCode==='LONGSHOT'
        ? THREE.MathUtils.smoothstep(reloadProgress,.68,.78)*.42*(1-THREE.MathUtils.smoothstep(reloadProgress,.84,.98))
        : reloadAnimationStart&&currentWeaponCode==='THUNDER'
          ? Math.sin(THREE.MathUtils.clamp((reloadProgress-.48)/.28,0,1)*Math.PI)*.22
          : 0;
    }
    for(let i=projectiles.length-1;i>=0;i--){
      const shot=projectiles[i];shot.age+=dt;const step=130*dt;shot.travelled+=step;
      shot.mesh.position.addScaledVector(shot.direction,step);
      shot.trail.geometry.setFromPoints([shot.mesh.position.clone().addScaledVector(shot.direction,-.62),shot.mesh.position]);
      if(shot.age>.42||shot.travelled>=shot.maxDistance){
        if(shot.impactPoint)spawnImpactFx(shot.impactPoint,shot.direction,shot.impactColor);
        scene.remove(shot.mesh,shot.trail);disposeObjectResources(shot.mesh);shot.trail.geometry.dispose();(shot.trail.material as THREE.Material).dispose();projectiles.splice(i,1);
      }
    }
    for(let i=fxParticles.length-1;i>=0;i--){
      const particle=fxParticles[i];particle.age+=dt;
      const lifeProgress=THREE.MathUtils.clamp(particle.age/particle.life,0,1);
      particle.velocity.y+=particle.gravity*dt;
      particle.velocity.multiplyScalar(Math.exp(-particle.drag*dt));
      particle.object.position.addScaledVector(particle.velocity,dt);
      particle.object.rotation.x+=particle.spin.x*dt;
      particle.object.rotation.y+=particle.spin.y*dt;
      particle.object.rotation.z+=particle.spin.z*dt;
      const fade=1-lifeProgress;
      particle.material.opacity=(particle.kind==='smoke'?.38:particle.kind==='ember'?.95:1)*fade;
      if(particle.kind==='smoke'){
        const growth=1+lifeProgress*1.35;
        particle.object.scale.copy(particle.baseScale).multiplyScalar(growth);
      }else{
        particle.object.scale.copy(particle.baseScale).multiplyScalar(.35+fade*.75);
      }
      if(lifeProgress>=1){
        scene.remove(particle.object);particle.material.dispose();fxParticles.splice(i,1);
      }
    }
    for(let i=shellVisuals.length-1;i>=0;i--){
      const shell=shellVisuals[i];shell.age+=dt;shell.velocity.y-=9.8*dt;
      shell.mesh.position.addScaledVector(shell.velocity,dt);
      shell.mesh.rotation.x+=shell.spin.x*dt;shell.mesh.rotation.y+=shell.spin.y*dt;shell.mesh.rotation.z+=shell.spin.z*dt;
      if(shell.mesh.position.y<.035){
        shell.mesh.position.y=.035;
        if(Math.abs(shell.velocity.y)>.42)shell.velocity.y=Math.abs(shell.velocity.y)*.28;
        else shell.velocity.y=0;
        shell.velocity.x*=Math.exp(-4.5*dt);shell.velocity.z*=Math.exp(-4.5*dt);
      }
      if(shell.age>2.4){
        scene.remove(shell.mesh);(shell.mesh.material as THREE.Material).dispose();shellVisuals.splice(i,1);
      }
    }
    if(currentWeapon.category!=='MELEE'&&fireAge<90){
      const flashStrength=Math.max(0,1-fireAge/90);
      muzzleFx.visible=true;muzzleFlash.visible=true;
      muzzleFx.scale.setScalar((currentWeaponCode==='LONGSHOT'||currentWeaponCode==='THUNDER'?1.28:1)*(.72+flashStrength*.42));
      muzzleLight.intensity=flashStrength*10;
      (muzzleFlash.material as THREE.MeshBasicMaterial).opacity=flashStrength*.92;
      (muzzleFlame.material as THREE.MeshBasicMaterial).opacity=flashStrength*.95;
      (muzzleRing.material as THREE.MeshBasicMaterial).opacity=flashStrength*.85;
      (muzzleHalo.material as THREE.SpriteMaterial).opacity=flashStrength*.8;
    }else{
      muzzleFx.visible=false;muzzleFlash.visible=false;muzzleLight.intensity=0;
    }
    for(let i=smokeClouds.length-1;i>=0;i--){
      const cloud=smokeClouds[i];cloud.age+=dt;
      const progress=THREE.MathUtils.clamp(cloud.age/cloud.life,0,1);
      cloud.velocity.y+=.12*dt;
      cloud.velocity.multiplyScalar(Math.exp(-.16*dt));
      cloud.mesh.position.addScaledVector(cloud.velocity,dt);
      cloud.mesh.rotation.y+=cloud.spin*dt;
      cloud.mesh.rotation.x+=cloud.spin*.22*dt;
      cloud.mesh.scale.copy(cloud.baseScale).multiplyScalar(.62+progress*1.72);
      cloud.material.uniforms.uTime.value=time*1.15+cloud.age*1.8;
      cloud.material.uniforms.uOpacity.value=Math.pow(1-progress,.82)*.82;
      if(progress>=1){
        scene.remove(cloud.mesh);cloud.material.dispose();smokeClouds.splice(i,1);
      }
    }
    for(let i=debrisVisuals.length-1;i>=0;i--){
      const piece=debrisVisuals[i];piece.age+=dt;piece.velocity.y-=9.8*dt;
      piece.mesh.position.addScaledVector(piece.velocity,dt);
      piece.mesh.rotation.x+=piece.spin.x*dt;piece.mesh.rotation.y+=piece.spin.y*dt;piece.mesh.rotation.z+=piece.spin.z*dt;
      if(piece.mesh.position.y<.045){
        piece.mesh.position.y=.045;
        if(Math.abs(piece.velocity.y)>.75)piece.velocity.y=Math.abs(piece.velocity.y)*.28;
        else piece.velocity.y=0;
        piece.velocity.x*=Math.exp(-4.8*dt);piece.velocity.z*=Math.exp(-4.8*dt);
      }
      const material=piece.mesh.material as THREE.MeshStandardMaterial;
      material.opacity=Math.max(0,1-piece.age/piece.life);
      if(piece.age>=piece.life){
        scene.remove(piece.mesh);material.dispose();debrisVisuals.splice(i,1);
      }
    }
    for(let i=damagePopups.length-1;i>=0;i--){
      const popup=damagePopups[i],age=(now-Number(popup.userData.startedAt||now))/1000;
      popup.position.y=Number(popup.userData.baseY||popup.position.y)+age*.62;
      (popup.material as THREE.SpriteMaterial).opacity=Math.max(0,1-age/.9);
      if(age>=.9){scene.remove(popup);const material=popup.material as THREE.SpriteMaterial;material.map?.dispose();material.dispose();damagePopups.splice(i,1);}
    }
    for(let i=thrownItemVisuals.length-1;i>=0;i--){const item=thrownItemVisuals[i];item.age+=dt;item.velocity.y-=9.8*dt;item.mesh.position.addScaledVector(item.velocity,dt);if(item.age>=item.fuseMs/1000){scene.remove(item.mesh);disposeObjectResources(item.mesh);thrownItemVisuals.splice(i,1);}}
    for(let i=timedItemEffects.length-1;i>=0;i--){
      const effect=timedItemEffects[i],age=now-effect.startedAt,remaining=effect.endsAt-now;
      if(effect.kind==='GRENADE'){
        const progress=THREE.MathUtils.clamp(age/Math.max(1,effect.endsAt-effect.startedAt),0,1);
        effect.group.scale.setScalar(.55+progress*2.2);
        effect.group.traverse(object=>{
          if(object instanceof THREE.Mesh){
            const mat=object.material as THREE.Material&{opacity?:number};
            if(typeof mat.opacity==='number')mat.opacity=Math.max(0,1-progress);
          }
          if(object instanceof THREE.PointLight)object.intensity=Math.max(0,9*(1-progress));
        });
      }
      if(remaining<=0){scene.remove(effect.group);disposeObjectResources(effect.group);timedItemEffects.splice(i,1);}
    }
    for(const mesh of remotes.values()){
      const data=mesh.userData;
      if(typeof data.targetX!=='number')continue;
      const oldX=mesh.position.x,oldY=mesh.position.y,oldZ=mesh.position.z;
      mesh.position.x=THREE.MathUtils.lerp(mesh.position.x,data.targetX,remoteBlend);
      mesh.position.y=THREE.MathUtils.lerp(mesh.position.y,data.targetY,remoteBlend);
      mesh.position.z=THREE.MathUtils.lerp(mesh.position.z,data.targetZ,remoteBlend);
      const remoteMotion=Math.min(1,Math.hypot(mesh.position.x-oldX,mesh.position.z-oldZ)/Math.max(.001,dt)/4.2);
      const animatePose=mesh.userData.animatePose;
      if(typeof animatePose==='function')animatePose(remoteMotion,time,0,0);
      if(typeof data.targetYaw==='number'){
        const delta=THREE.MathUtils.euclideanModulo(data.targetYaw-mesh.rotation.y+Math.PI,Math.PI*2)-Math.PI;
        mesh.rotation.y+=delta*remoteBlend;
      }
    }

    if (mode === 'spectator' || mode === 'replay') {
      const target = new THREE.Vector3(0,0,0);
      camera.position.lerp(new THREE.Vector3(0,22,34),1-Math.exp(-3*dt));
      camera.lookAt(target);
    } else if (mode === 'killcam') {
      const focus = remotes.get(replayFocusId);
      if (focus) {
        const yaw = focus.rotation.y;
        const desired = focus.position.clone().add(new THREE.Vector3(Math.sin(yaw)*2.8,1.45,Math.cos(yaw)*2.8));
        camera.position.lerp(desired,1-Math.exp(-7*dt));
        camera.lookAt(focus.position.clone().add(new THREE.Vector3(0,0.85,0)));
      }
    }

    if (replayFrames && replayFrames.length > 0) {
      const elapsed = now - replayStartedAt;
      let index = replayIndex;
      while (index + 1 < replayFrames.length && replayFrames[index + 1].t <= elapsed) index++;
      if (index !== replayIndex && index >= 0) {
        replayIndex = index;
        setRemotePlayers(replayFrames[index].players);
      }
      if (index >= replayFrames.length - 1 && elapsed >= replayFrames[replayFrames.length - 1].t) {
        replayFrames = null;
        if(mode==='killcam'){
          mode=killcamReturnMode;
          active=true;
          replayFocusId='';
          const complete=killcamComplete;
          killcamComplete=null;
          complete?.();
          notify('KILLCAM COMPLETE');
        }else{
          notify('REPLAY COMPLETE');
        }
      }
    }

    if (active) {
      const forward =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + touch.forward;
      const right =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.right;

      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const direction = fwd.multiplyScalar(forward).add(side.multiplyScalar(right));
      if (direction.lengthSq() > 1) direction.normalize();
      const movementTarget=Math.min(1,direction.length());
      movementAmount+=(movementTarget-movementAmount)*(1-Math.exp(-12*dt));
      const baseSpeed=keys.has('ShiftLeft')||keys.has('ShiftRight')?7.1:5.4;
      const speed=baseSpeed*(now<energyUntil?2:1)*(precisionAiming?0.5:1);
      if (controller.computedGrounded() && vertical < 0) vertical = -1;
      if (touch.jump && controller.computedGrounded()) {
        vertical = 7.2;
        touch.jump = false;
        jumpPending = true;
      }
      vertical -= 18 * dt;

      controller.computeColliderMovement(collider, {
        x: direction.x * speed * dt,
        y: vertical * dt,
        z: direction.z * speed * dt
      });
      const corrected = controller.computedMovement();
      const old = body.translation();
      body.setNextKinematicTranslation({
        x: old.x + corrected.x,
        y: old.y + corrected.y,
        z: old.z + corrected.z
      });
      world.step();

      const p = position();
      avatar.position.set(p.x, p.y - 0.08, p.z);
      avatar.rotation.y = yaw;
      avatarRig.animate(movementAmount,time,reloadWave,fireWave);
      const eye = p.clone().add(new THREE.Vector3(0, 0.58, 0));
      if (cameraMode === 'first') {
        camera.position.copy(eye);
      } else {
        const offset = new THREE.Vector3(0.7, 1.1, 3.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const desired = p.clone().add(offset);
        raycaster.set(eye, desired.clone().sub(eye).normalize());
        const hits = raycaster.intersectObjects(raycastMeshes, false);
        if (hits.length && hits[0].distance < eye.distanceTo(desired)) {
          const dir = desired.clone().sub(eye).normalize();
          desired.copy(eye).add(dir.multiplyScalar(Math.max(0.35, hits[0].distance - 0.2)));
        }
        camera.position.lerp(desired, 1 - Math.exp(-14 * dt));
      }
      const aim = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      camera.lookAt(camera.position.clone().add(aim));

      if (now - lastInput > 50) {
        send({
          type: 'input', sequence: ++seq,
          forward: THREE.MathUtils.clamp(forward, -1, 1),
          right: THREE.MathUtils.clamp(right, -1, 1),
          sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
          aim: precisionAiming,
          jump: jumpPending,
          yaw, pitch
        });
        jumpPending = false;
        lastInput = now;
      }
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    activate(nextMode: string, team = 0, serverSpawn?: { x: number; y: number; z: number; yaw: number }, weaponCode = 'R16', secondaryWeapon = 'R9', itemCode = 'GRENADE', nextItemCount?: number, nextItemInventory?:Record<string,number>) {
      mode = nextMode;
      active = nextMode !== 'spectator' && nextMode !== 'replay';
      replayFrames = null;
      replayFocusId = '';
      killcamComplete = null;
      localTeam = team;
      currentWeaponCode = WEAPONS[weaponCode] ? weaponCode : 'R16';
      primaryWeaponCode = currentWeaponCode;
      secondaryWeaponCode = WEAPONS[secondaryWeapon] ? secondaryWeapon : 'R9';
      currentWeapon = WEAPONS[currentWeaponCode];
      const safeItemCode=(itemCode in ITEMS?itemCode:'GRENADE') as RockeyItemCode;
      itemInventory={GRENADE:ITEMS.GRENADE.startingCount,SMOKE:ITEMS.SMOKE.startingCount,FLASH:ITEMS.FLASH.startingCount,PILLS:ITEMS.PILLS.startingCount,ENERGY:ITEMS.ENERGY.startingCount};
      if(nextItemInventory)for(const item of Object.values(ITEMS)){const count=Number(nextItemInventory[item.code]);if(Number.isFinite(count))itemInventory[item.code]=Math.max(0,Math.min(10,Math.floor(count)));}
      currentItemCode=safeItemCode;if(nextItemCount!==undefined)itemInventory[safeItemCode]=Math.max(0,Math.min(10,Math.floor(nextItemCount)));
      updateItemHud();emitItemState();energyUntil=0;
      rebuildGun(currentWeaponCode);
      switchAnimationStart=performance.now();
      reloadAnimationStart=0;
      reloadAnimationDuration=0;
      doriSwingStart=0;
      gunKick=0;
      movementAmount=0;
      setPrecisionAiming(false);
      camera.fov=normalFov;camera.updateProjectionMatrix();
      hp = 100; ammo = currentWeapon.magazine; reserve = currentWeapon.reserve; vertical = 0;
      for(const code of Object.keys(localWeaponAmmo))delete localWeaponAmmo[code];
      localWeaponAmmo[currentWeaponCode]={ammo,reserve};
      if (mode === 'practice') {
        for (const target of practiceTargets) {
          target.userData.hp = 100;
          target.visible = map.id === 'training_facility';
        }
      }
      const spawn = serverSpawn || (mode === 'practice'
        ? { x: 0, y: 0.92, z: 20, yaw: 0 }
        : team === 0 ? { x: -20, y: 0.92, z: 17, yaw: 0 } : { x: 20, y: 0.92, z: -17, yaw: Math.PI });
      yaw = spawn.yaw;
      body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
      updateHud(hp, ammo, reserve, currentWeapon.name);
    },
    setRemotePlayers,
    reconcileLocalPlayer(serverPlayer: RemotePlayer) {
      if (mode === 'practice' || !active) return;
      const current = body.translation();
      const error = Math.hypot(
        serverPlayer.x - current.x,
        serverPlayer.y - current.y,
        serverPlayer.z - current.z
      );
      if (error > 2.2) {
        body.setTranslation({ x: serverPlayer.x, y: serverPlayer.y, z: serverPlayer.z }, true);
        vertical = 0;
      } else if (error > 0.08) {
        const blend = 0.22;
        body.setTranslation({
          x: THREE.MathUtils.lerp(current.x, serverPlayer.x, blend),
          y: THREE.MathUtils.lerp(current.y, serverPlayer.y, blend),
          z: THREE.MathUtils.lerp(current.z, serverPlayer.z, blend)
        }, true);
      }
    },
    setScore(a: number, b: number, round: number) {
      const score = document.getElementById('scoreLabel');
      const label = document.getElementById('roundLabel');
      if (score) score.textContent = a + ' : ' + b;
      if (label) label.textContent = 'ROUND ' + round;
    },
    setHealth(value: number) {
      hp = Math.max(0, Math.min(100, value));
      updateHud(hp, ammo, reserve, currentWeapon.name);
    },
    setAmmo(nextAmmo: number, nextReserve: number) {
      ammo = Math.max(0, Math.min(currentWeapon.magazine, nextAmmo));
      reserve = Math.max(0, Math.min(240, nextReserve));
      localWeaponAmmo[currentWeaponCode]={ammo,reserve};
      reloadAt = 0;
      updateHud(hp, ammo, reserve, currentWeapon.name);
    },
    setWeapon(code: string, nextAmmo?: number, nextReserve?: number) {
      setWeaponLocal(code,nextAmmo,nextReserve);
    },
    setItem(code:string,count:number,effect?:string,inventory?:Record<string,number>){if(inventory)setItemInventory(code,inventory);else setItemLocal(code,count);if(effect==='ENERGY')energyUntil=performance.now()+8000;},
    selectItem,useItem,showThrownItem,showItemEffect,
    showDamageOnTarget,
    showShot,
    applyRecoil(nextPitch: number, nextYaw: number) {
      pitch = THREE.MathUtils.clamp(nextPitch,-1.3,1.3);
      yaw = nextYaw;
    },
    playReplay(frames: ReplayFrame[]) {
      if (!Array.isArray(frames) || frames.length===0) return notify('저장된 리플레이 프레임이 없습니다.');
      active=false;mode='replay';replayFocusId='';replayFrames=frames;
      replayStartedAt=performance.now();replayIndex=-1;
      notify('REPLAY START');
    },
    playKillcam(frames: ReplayFrame[],killerId:string,onComplete:()=>void) {
      if(!Array.isArray(frames)||frames.length<2){onComplete();return;}
      killcamReturnMode=mode;
      mode='killcam';active=false;replayFocusId=killerId;
      const firstTime=frames[0].t;
      replayFrames=frames.map(frame=>({...frame,t:Math.max(0,frame.t-firstTime)}));
      replayStartedAt=performance.now();replayIndex=-1;killcamComplete=onComplete;
      notify('KILLCAM');
    },
    cancelKillcam() {
      if(mode!=='killcam')return;
      replayFrames=null;replayFocusId='';mode=killcamReturnMode;active=false;
      const complete=killcamComplete;killcamComplete=null;complete?.();
    },
    setQuality(level: 'low'|'balanced'|'high') {
      const ratio=level==='low'?0.8:level==='balanced'?1.15:1.6;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,ratio));
      renderer.shadowMap.enabled=level==='high'&&!isMobile;
      renderer.shadowMap.needsUpdate=true;
    },
    setSensitivity(value: number) {
      sensitivity=THREE.MathUtils.clamp(value,0.4,2.2);
    },
    toggleCamera,
    dispose() {
      setPrecisionAiming(false);
      disposed = true;
      killcamComplete = null;
      replayFrames = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('mousemove', pointerMove);
      window.visualViewport?.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      resizeObserver?.disconnect();
      canvas.removeEventListener('click', clickCanvas);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerDrag);
      canvas.removeEventListener('pointerup', pointerLookEnd);
      canvas.removeEventListener('pointercancel', pointerLookEnd);
      canvas.removeEventListener('lostpointercapture', pointerLookEnd);
      world.removeCharacterController(controller);
      world.free();
      stopMobileFire();
      renderer.dispose();
      reflectionEnvironment?.dispose();
      performanceBadge.remove();
      if(audioContext){void audioContext.close();audioContext=null;noiseBuffer=null;}
      for(const shot of projectiles){shot.trail.geometry.dispose();(shot.trail.material as THREE.Material).dispose();}
      for(const popup of damagePopups){const material=popup.material as THREE.SpriteMaterial;material.map?.dispose();material.dispose();}
      for(const particle of fxParticles)particle.material.dispose();
      for(const shell of shellVisuals)(shell.mesh.material as THREE.Material).dispose();
      for(const cloud of smokeClouds)cloud.material.dispose();
      for(const piece of debrisVisuals)(piece.mesh.material as THREE.Material).dispose();
      smokeTexture.dispose();fxParticleGeometry.dispose();shellGeometry.dispose();smokeVolumeGeometry.dispose();debrisGeometry.dispose();
      // Dispose shared materials/geometries exactly once, including remote players and practice targets.
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        const attached = Array.isArray(object.material) ? object.material : [object.material];
        attached.forEach(material => materials.add(material));
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      enemyMat.dispose();
      allyMat.dispose();
      scene.clear();
    }
  };
}