import * as THREE from 'three';
import { MAPS, WEAPONS, type RockeyWeapon } from '../catalog';

export interface RemotePlayer {
  id: string; name: string; x: number; y: number; z: number;
  yaw: number; health: number; team: number; alive?: boolean; connected?: boolean;
}
export interface ReplayFrame {
  t: number;
  players: RemotePlayer[];
}
export interface GameInstance {
  activate(mode: string, team?: number, spawn?: { x: number; y: number; z: number; yaw: number }, weaponCode?: string, secondaryWeapon?: string): void;
  setRemotePlayers(players: RemotePlayer[]): void;
  reconcileLocalPlayer(player: RemotePlayer): void;
  setScore(a: number, b: number, round: number): void;
  setHealth(value: number): void;
  setAmmo(ammo: number, reserve: number): void;
  setWeapon(weaponCode: string, ammo?: number, reserve?: number): void;
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
  scene.fog = new THREE.Fog(map.fog, 48, 145);

  const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 180);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xe5f5ff, 0x526579, 2.35));
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const sun = new THREE.DirectionalLight(0xfff1d8, 3.1);
  sun.position.set(-15, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const blue = new THREE.PointLight(map.light, 70, 55);
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

  for (const b of map.cover) {
    box(b.x, b.top / 2, b.z, b.hx, b.top / 2, b.hz);
    const led = new THREE.Mesh(new THREE.BoxGeometry(b.hx * 1.7, 0.055, 0.08), glow);
    led.position.set(b.x, b.top + 0.08, b.z + b.hz + 0.025);
    scene.add(led);
  }
  box(0, 2.2, -30, 30, 2.2, 0.6);
  box(0, 2.2, 30, 30, 2.2, 0.6);
  box(-30, 2.2, 0, 0.6, 2.2, 30);
  box(30, 2.2, 0, 0.6, 2.2, 30);

  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.92, 20));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.52, 0.34).setFriction(0), body);
  const controller = world.createCharacterController(0.02);
  controller.setMaxSlopeClimbAngle(Math.PI / 4);
  controller.enableAutostep(0.35, 0.22, true);
  controller.enableSnapToGround(0.18);

  const avatar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.78, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0x183b65, metalness: 0.6, roughness: 0.3 })
  );
  avatar.castShadow = true;
  scene.add(avatar);

  const gun = new THREE.Group();
  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x8cecff })
  );
  muzzleFlash.position.set(0.24, -0.22, -1.2);
  muzzleFlash.visible = false;
  gun.add(muzzleFlash);
  camera.add(gun);
  scene.add(camera);

  function rebuildGun(code: string) {
    gun.scale.set(1, 1, 1);
    for (const child of [...gun.children]) {
      if (child === muzzleFlash) continue;
      gun.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material.dispose());
      }
    }

    const accent = new THREE.Color(
      code === 'R16' ? 0x4aa8ff : code === 'R9' ? 0xffd166 :
      code === 'VIPER' ? 0x54e6b0 : code === 'THUNDER' ? 0xff8a45 :
      code === 'LONGSHOT' ? 0xa8d8ff : code === 'HELIX' ? 0xb18aff :
      code === 'BASTION' ? 0xffc45f : code === 'NOVA' ? 0xff748e :
      code === 'ARC' ? 0x57efff : code === 'PULSE' ? 0xbe8cff : map.light
    );
    const metal = new THREE.MeshStandardMaterial({
      color: code === 'R16' ? 0x254b75 : code === 'R9' ? 0x65522c : code === 'VIPER' ? 0x204b3c :
        code === 'THUNDER' ? 0x61422d : code === 'LONGSHOT' ? 0x263c53 : code === 'HELIX' ? 0x44305f :
        code === 'BASTION' ? 0x4b4528 : code === 'NOVA' ? 0x542b3c : code === 'ARC' ? 0x204c58 :
        code === 'PULSE' ? 0x3b2b60 : 0x1c2d46,
      metalness: 0.88, roughness: 0.24
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
      const plushSphere=(x:number,y:number,z:number,sx:number,sy:number,sz:number,material:THREE.Material)=>{
        const part=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),material);
        part.position.set(x,y,z);
        part.scale.set(sx,sy,sz);
        part.castShadow=true;
        part.receiveShadow=true;
        gun.add(part);
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

      // Keep the whole plush comfortably small in the first-person view.
      gun.scale.setScalar(.76);
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
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.42,16),dark);
      scope.rotation.x = Math.PI/2;
      scope.position.set(0.24,0.13,-0.43);
      gun.add(scope);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.061,0.061,0.012,16),glowPart);
      lens.rotation.x = Math.PI/2;
      lens.position.set(0.24,0.13,-0.65);
      gun.add(lens);
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
  }
  rebuildGun('R16');

  const enemyMat = new THREE.MeshStandardMaterial({ color: 0x8a3149, metalness: 0.5, roughness: 0.35 });
  const allyMat = new THREE.MeshStandardMaterial({ color: 0x267aa5, metalness: 0.5, roughness: 0.35 });
  const remotes = new Map<string, THREE.Group>();
  const practiceTargets: THREE.Group[] = [];
  const projectiles: Array<{mesh:THREE.Mesh;trail:THREE.Line;direction:THREE.Vector3;travelled:number;maxDistance:number;age:number}> = [];
  const damagePopups: THREE.Sprite[] = [];
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
  let yaw = 0;
  let pitch = 0;
  let vertical = 0;
  let mode = 'practice';
  let currentWeaponCode = 'R16';
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
  const weaponMotion:Record<string,{kick:number;reloadTilt:number;roll:number}> = {
    R16:{kick:.82,reloadTilt:.12,roll:.06},R9:{kick:.95,reloadTilt:.2,roll:.12},
    VIPER:{kick:.48,reloadTilt:.09,roll:.04},THUNDER:{kick:1.28,reloadTilt:.38,roll:.2},
    LONGSHOT:{kick:1.35,reloadTilt:.46,roll:.1},HELIX:{kick:.88,reloadTilt:.16,roll:.08},
    BASTION:{kick:.56,reloadTilt:.28,roll:.22},NOVA:{kick:1.16,reloadTilt:.22,roll:.14},
    ARC:{kick:.62,reloadTilt:.1,roll:.04},PULSE:{kick:.72,reloadTilt:.14,roll:.08},DORI:{kick:0,reloadTilt:.05,roll:.05}
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
  let seq = 0;
  let lastInput = 0;
  let jumpPending = false;
  let lastShot = 0;
  let reloadAt = 0;
  let raf = 0;
  let previous = performance.now();

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
    currentWeaponCode = code;
    currentWeapon = WEAPONS[code];
    ammo = nextAmmo === undefined ? currentWeapon.magazine : Math.max(0,Math.min(currentWeapon.magazine,nextAmmo));
    reserve = nextReserve === undefined ? currentWeapon.reserve : Math.max(0,nextReserve);
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
  function spawnProjectile(origin:THREE.Vector3,direction:THREE.Vector3,code:string,range:number) {
    const color=projectileColors[code]||0xffffff;
    const blocker=new THREE.Raycaster(origin,direction,0,range).intersectObjects(raycastMeshes,false)[0];
    const visibleRange=blocker?Math.max(.15,blocker.distance):range;
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color,toneMapped:false}));
    const start=origin.clone().addScaledVector(direction,.5);mesh.position.copy(start);scene.add(mesh);
    const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([start.clone().addScaledVector(direction,-.55),start]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.78,toneMapped:false}));
    scene.add(trail);projectiles.push({mesh,trail,direction:direction.clone().normalize(),travelled:0,maxDistance:visibleRange,age:0});
  }
  function showDamageAt(position:THREE.Vector3,damage:number,headshot:boolean) {
    const label=document.createElement('canvas');label.width=256;label.height=112;
    const ctx=label.getContext('2d');if(!ctx)return;
    ctx.font='bold 46px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=8;ctx.strokeStyle='rgba(10,18,30,.88)';ctx.strokeText((headshot?'HEADSHOT  ':'')+damage,128,56);
    ctx.fillStyle=headshot?'#ffe08a':'#ffffff';ctx.fillText((headshot?'HEADSHOT  ':'')+damage,128,56);
    const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});
    const sprite=new THREE.Sprite(material);sprite.position.copy(position).add(new THREE.Vector3(.78,1.55,0));sprite.scale.set(1.45,.64,1);
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

  function stopMobileFire() {
    if (mobileFireTimer) window.clearInterval(mobileFireTimer);
    mobileFireTimer = 0;
  }

  function fire() {
    const now = performance.now();
    if (!active || now - lastShot < currentWeapon.fireInterval || ammo <= 0 || now < reloadAt) return;
    lastShot = now;
    const melee=currentWeapon.category==='MELEE';
    if(!melee)ammo-=1;
    gunKick = Math.min(1.8,gunKick+(weaponMotion[currentWeaponCode]?.kick||.82));
    camera.updateMatrixWorld(true);
    const origin=camera.getWorldPosition(new THREE.Vector3());
    const direction=camera.getWorldDirection(new THREE.Vector3());
    if(melee){doriSwingStart=now;playMeleeSound();}else{playFireSound(currentWeaponCode);spawnProjectile(origin,direction,currentWeaponCode,currentWeapon.range);}
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

    if(!melee){
      const flashMaterial=muzzleFlash.material as THREE.MeshBasicMaterial;
      flashMaterial.color.setHex(projectileColors[currentWeaponCode]||0xffffff);
      muzzleFlash.visible = true;
      window.setTimeout(() => { if(!disposed)muzzleFlash.visible = false; }, 70);
    }
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
        mesh = new THREE.Group();
        const model = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.34, 0.78, 5, 10),
          (player.team === localTeam ? allyMat : enemyMat).clone()
        );
        model.castShadow = true;
        mesh.add(model);
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
    const remoteBlend=1-Math.exp(-18*dt);
    gunKick*=Math.exp(-17*dt);
    const reloadProgress=reloadAnimationStart?THREE.MathUtils.clamp((now-reloadAnimationStart)/Math.max(1,reloadAnimationDuration),0,1):1;
    if(reloadProgress>=1)reloadAnimationStart=0;
    const reloadWave=reloadAnimationStart?Math.sin(reloadProgress*Math.PI):0;
    const switchProgress=switchAnimationStart?THREE.MathUtils.clamp((now-switchAnimationStart)/380,0,1):1;
    if(switchProgress>=1)switchAnimationStart=0;
    const switchWave=switchAnimationStart?Math.sin(switchProgress*Math.PI):0;
    const doriProgress=doriSwingStart?THREE.MathUtils.clamp((now-doriSwingStart)/300,0,1):1;
    if(doriProgress>=1)doriSwingStart=0;
    const doriWave=doriSwingStart?Math.sin(doriProgress*Math.PI):0;
    const motion=weaponMotion[currentWeaponCode]||weaponMotion.R16;
    gun.position.set(0,-reloadWave*(.14+motion.reloadTilt*.34)-switchWave*.18,gunKick*.11+reloadWave*.34+switchWave*.28);
    gun.rotation.set(reloadWave*(.42+motion.reloadTilt)+switchWave*.38,doriWave*1.2,reloadWave*(.22+motion.roll)+switchWave*.28);
    for(let i=projectiles.length-1;i>=0;i--){
      const shot=projectiles[i];shot.age+=dt;const step=130*dt;shot.travelled+=step;
      shot.mesh.position.addScaledVector(shot.direction,step);
      shot.trail.geometry.setFromPoints([shot.mesh.position.clone().addScaledVector(shot.direction,-.62),shot.mesh.position]);
      if(shot.age>.42||shot.travelled>=shot.maxDistance){scene.remove(shot.mesh,shot.trail);disposeObjectResources(shot.mesh);shot.trail.geometry.dispose();(shot.trail.material as THREE.Material).dispose();projectiles.splice(i,1);}
    }
    for(let i=damagePopups.length-1;i>=0;i--){
      const popup=damagePopups[i],age=(now-Number(popup.userData.startedAt||now))/1000;
      popup.position.y=Number(popup.userData.baseY||popup.position.y)+age*.62;
      (popup.material as THREE.SpriteMaterial).opacity=Math.max(0,1-age/.9);
      if(age>=.9){scene.remove(popup);const material=popup.material as THREE.SpriteMaterial;material.map?.dispose();material.dispose();damagePopups.splice(i,1);}
    }
    for(const mesh of remotes.values()){
      const data=mesh.userData;
      if(typeof data.targetX!=='number')continue;
      mesh.position.x=THREE.MathUtils.lerp(mesh.position.x,data.targetX,remoteBlend);
      mesh.position.y=THREE.MathUtils.lerp(mesh.position.y,data.targetY,remoteBlend);
      mesh.position.z=THREE.MathUtils.lerp(mesh.position.z,data.targetZ,remoteBlend);
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
      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7.1 : 5.4;
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
    activate(nextMode: string, team = 0, serverSpawn?: { x: number; y: number; z: number; yaw: number }, weaponCode = 'R16', secondaryWeapon = 'R9') {
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
      rebuildGun(currentWeaponCode);
      hp = 100; ammo = currentWeapon.magazine; reserve = currentWeapon.reserve; vertical = 0;
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
      reloadAt = 0;
      updateHud(hp, ammo, reserve, currentWeapon.name);
    },
    setWeapon(code: string, nextAmmo?: number, nextReserve?: number) {
      setWeaponLocal(code,nextAmmo,nextReserve);
    },
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
      if(audioContext){void audioContext.close();audioContext=null;noiseBuffer=null;}
      for(const shot of projectiles){shot.trail.geometry.dispose();(shot.trail.material as THREE.Material).dispose();}
      for(const popup of damagePopups){const material=popup.material as THREE.SpriteMaterial;material.map?.dispose();material.dispose();}
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