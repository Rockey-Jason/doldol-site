import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface RemotePlayer {
  id: string; name: string; x: number; y: number; z: number;
  yaw: number; health: number; team: number; alive?: boolean;
}
export interface GameInstance {
  activate(mode: string, team?: number, spawn?: { x: number; y: number; z: number; yaw: number }): void;
  setRemotePlayers(players: RemotePlayer[]): void;
  setScore(a: number, b: number, round: number): void;
  setHealth(value: number): void;
  setAmmo(ammo: number, reserve: number): void;
  toggleCamera(): void;
  dispose(): void;
}

const BLOCKS = [
  [0, 1.5, 0, 2.4, 1.5, 2.4],
  [-9, 1.1, -7, 3.2, 1.1, 1.1], [9, 1.1, -7, 3.2, 1.1, 1.1],
  [-9, 1.1, 7, 3.2, 1.1, 1.1], [9, 1.1, 7, 3.2, 1.1, 1.1],
  [-17, 2, 0, 1.2, 2, 4.2], [17, 2, 0, 1.2, 2, 4.2]
];

export async function createGame(
  canvas: HTMLCanvasElement,
  send: (message: Record<string, unknown> & { type: string }) => void,
  notify: (message: string) => void,
  updateHud: (hp: number, ammo: number, reserve: number, weapon: string) => void
): Promise<GameInstance> {
  await RAPIER.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a18);
  scene.fog = new THREE.Fog(0x050a18, 34, 95);

  const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 180);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0x9dbfff, 0x0a1020, 1.5));
  const sun = new THREE.DirectionalLight(0xb7d3ff, 2.3);
  sun.position.set(-15, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const blue = new THREE.PointLight(0x147dff, 70, 55);
  blue.position.set(0, 5, 0);
  scene.add(blue);

  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0));

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(60, 1, 60),
    new THREE.MeshStandardMaterial({ color: 0x0d1930, metalness: 0.72, roughness: 0.34 })
  );
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(60, 60, 0x1765ad, 0x102849);
  grid.position.y = 0.012;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.38;
  scene.add(grid);

  const solid = new THREE.MeshStandardMaterial({ color: 0x1b2c48, metalness: 0.82, roughness: 0.27 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x137cff, emissive: 0x0759c8, emissiveIntensity: 2.2 });
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

  for (const b of BLOCKS) {
    box(b[0], b[1], b[2], b[3], b[4], b[5]);
    const led = new THREE.Mesh(new THREE.BoxGeometry(b[3] * 1.7, 0.055, 0.08), glow);
    led.position.set(b[0], b[1] + 0.7, b[2] + b[5] + 0.02);
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
  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x1c2d46, metalness: 0.9, roughness: 0.22 })
  );
  gunBody.position.set(0.24, -0.23, -0.46);
  gun.add(gunBody);
  const gunLight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.5), glow);
  gunLight.position.set(0.24, -0.09, -0.42);
  gun.add(gunLight);
  camera.add(gun);
  scene.add(camera);

  const enemyMat = new THREE.MeshStandardMaterial({ color: 0x8a3149, metalness: 0.5, roughness: 0.35 });
  const remotes = new Map<string, THREE.Group>();
  const raycaster = new THREE.Raycaster();
  const keys = new Set<string>();
  const touch = { forward: 0, right: 0, jump: false };
  let yaw = 0;
  let pitch = 0;
  let vertical = 0;
  let mode = 'practice';
  let active = false;
  let disposed = false;
  let cameraMode: 'first' | 'third' = 'first';
  let hp = 100;
  let ammo = 30;
  let reserve = 90;
  let seq = 0;
  let lastInput = 0;
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

  function fire() {
    const now = performance.now();
    if (!active || now - lastShot < 100 || ammo <= 0 || now < reloadAt) return;
    lastShot = now;
    ammo -= 1;
    updateHud(hp, ammo, reserve, 'R-16');
    send({ type: 'fire', weaponCode: 'R16', sequence: ++seq });
    gun.position.z = 0.045;
    window.setTimeout(() => { gun.position.z = 0; }, 55);
  }

  function reload() {
    if (!active || ammo >= 30 || reserve <= 0 || performance.now() < reloadAt) return;
    reloadAt = performance.now() + 1500;
    if (mode === 'practice') {
      window.setTimeout(() => {
        const amount = Math.min(30 - ammo, reserve);
        ammo += amount;
        reserve -= amount;
        reloadAt = 0;
        updateHud(hp, ammo, reserve, 'R-16');
      }, 1500);
    } else {
      send({ type: 'reload' });
    }
  }

  function keyDown(event: KeyboardEvent) {
    if (event.code === 'Space') event.preventDefault();
    keys.add(event.code);
    if (event.code === 'KeyV') toggleCamera();
    if (event.code === 'KeyR') reload();
    if (event.code === 'Space') touch.jump = true;
  }
  function keyUp(event: KeyboardEvent) {
    keys.delete(event.code);
    if (event.code === 'Space') touch.jump = false;
  }
  function look(dx: number, dy: number) {
    yaw -= dx * 0.0022;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.002, -1.3, 1.3);
  }
  function pointerMove(event: PointerEvent) {
    if (document.pointerLockElement === canvas) look(event.movementX, event.movementY);
  }
  function pointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button === 0) fire();
    if (event.pointerType === 'touch') {
      (canvas as HTMLCanvasElement & { lx?: number; ly?: number }).lx = event.clientX;
      (canvas as HTMLCanvasElement & { lx?: number; ly?: number }).ly = event.clientY;
    }
  }
  function pointerDrag(event: PointerEvent) {
    if (document.pointerLockElement === canvas) return;
    if (event.pointerType !== 'touch' || !event.buttons) return;
    const element = canvas as HTMLCanvasElement & { lx?: number; ly?: number };
    if (element.lx === undefined || element.ly === undefined) return;
    look(event.clientX - element.lx, event.clientY - element.ly);
    element.lx = event.clientX;
    element.ly = event.clientY;
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
  resize();

  const pad = document.getElementById('movePad');
  const stick = document.getElementById('moveStick');
  const resetPad = () => {
    touch.forward = 0; touch.right = 0;
    if (stick instanceof HTMLElement) stick.style.transform = 'translate(0,0)';
  };
  pad?.addEventListener('pointerdown', event => {
    const rect = pad.getBoundingClientRect();
    pad.setPointerCapture(event.pointerId);
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    touch.right = THREE.MathUtils.clamp(x / (rect.width * 0.38), -1, 1);
    touch.forward = THREE.MathUtils.clamp(-y / (rect.height * 0.38), -1, 1);
    if (stick instanceof HTMLElement) stick.style.transform = 'translate(' + x * 0.35 + 'px,' + y * 0.35 + 'px)';
  });
  pad?.addEventListener('pointermove', event => {
    if (event.buttons === 0) return;
    const rect = pad.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    touch.right = THREE.MathUtils.clamp(x / (rect.width * 0.38), -1, 1);
    touch.forward = THREE.MathUtils.clamp(-y / (rect.height * 0.38), -1, 1);
    if (stick instanceof HTMLElement) stick.style.transform = 'translate(' + x * 0.35 + 'px,' + y * 0.35 + 'px)';
  });
  pad?.addEventListener('pointerup', resetPad);
  pad?.addEventListener('pointercancel', resetPad);
  document.getElementById('mobileFire')?.addEventListener('pointerdown', event => { event.preventDefault(); fire(); });
  document.getElementById('mobileJump')?.addEventListener('pointerdown', event => { event.preventDefault(); touch.jump = true; });
  document.getElementById('mobileJump')?.addEventListener('pointerup', () => { touch.jump = false; });
  document.getElementById('mobileReload')?.addEventListener('pointerdown', reload);
  document.getElementById('mobileView')?.addEventListener('pointerdown', toggleCamera);

  function setRemotePlayers(players: RemotePlayer[]) {
    const ids = new Set(players.map(player => player.id));
    for (const [id, mesh] of remotes) {
      if (!ids.has(id)) { scene.remove(mesh); remotes.delete(id); }
    }
    for (const player of players) {
      let mesh = remotes.get(player.id);
      if (!mesh) {
        mesh = new THREE.Group();
        const model = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.78, 5, 10), enemyMat.clone());
        model.castShadow = true;
        mesh.add(model);
        scene.add(mesh);
        remotes.set(player.id, mesh);
      }
      mesh.position.set(player.x, player.y - 0.08, player.z);
      mesh.rotation.y = player.yaw;
      mesh.visible = player.alive !== false && player.health > 0;
    }
  }

  function frame(now: number) {
    if (disposed) return;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;

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
      if (touch.jump && controller.computedGrounded()) { vertical = 7.2; touch.jump = false; }
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
          yaw, pitch
        });
        lastInput = now;
      }
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    activate(nextMode: string, team = 0, serverSpawn?: { x: number; y: number; z: number; yaw: number }) {
      mode = nextMode;
      active = true;
      hp = 100; ammo = 30; reserve = 90; vertical = 0;
      const spawn = serverSpawn || (mode === 'practice'
        ? { x: 0, y: 0.92, z: 20, yaw: 0 }
        : team === 0 ? { x: -20, y: 0.92, z: 17, yaw: 0 } : { x: 20, y: 0.92, z: -17, yaw: Math.PI });
      yaw = spawn.yaw;
      body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
      updateHud(hp, ammo, reserve, 'R-16');
    },
    setRemotePlayers,
    setScore(a: number, b: number, round: number) {
      const score = document.getElementById('scoreLabel');
      const label = document.getElementById('roundLabel');
      if (score) score.textContent = a + ' : ' + b;
      if (label) label.textContent = 'ROUND ' + round;
    },
    setHealth(value: number) {
      hp = Math.max(0, Math.min(100, value));
      updateHud(hp, ammo, reserve, 'R-16');
    },
    setAmmo(nextAmmo: number, nextReserve: number) {
      ammo = Math.max(0, Math.min(30, nextAmmo));
      reserve = Math.max(0, Math.min(180, nextReserve));
      reloadAt = 0;
      updateHud(hp, ammo, reserve, 'R-16');
    },
    toggleCamera,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('mousemove', pointerMove);
      canvas.removeEventListener('click', clickCanvas);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerDrag);
      world.removeCharacterController(controller);
      world.free();
      renderer.dispose();
      for (const mesh of remotes.values()) scene.remove(mesh);
    }
  };
}