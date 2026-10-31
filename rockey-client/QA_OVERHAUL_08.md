# ROCKEY OVERHAUL 08 — Advanced Physics & Validation

## Implemented in source
- Server-owned deterministic debris creation and 20 Hz fixed-step simulation. The server applies gravity, floor response, static cover AABB response, angular motion and sleep state. Full debris state is sent at 10 Hz and included in match start/resume/world-state recovery.
- Client rigid-fragment rendering now consumes the server snapshots; local client-only rigid debris spawning was removed from the destruction presentation path.
- First-person articulated finger chains solve two-bone reach toward per-weapon grip/foregrip/trigger anchors defined in the procedural weapon model coordinate system.
- Foot IK now samples world-space ground normals and blends foot pitch/roll as well as hip/knee reach. Local and remote rigs use the same surface sampler.
- Snapshot processing discards stale out-of-order server timestamps. Reconnect attempts use capped exponential backoff with jitter and retry when the browser reports network-online or returns to the foreground. The server's existing 30-second reconnect grace resumes the same match and returns authoritative world state.
- Device tiers use mobile/desktop class, CPU core count and device-memory hints to select rendering caps, shadow resolution, bloom and adaptive FPS targets.
- The soak report now calculates heap, geometry and texture growth and flags suspicious growth. Heap is JS heap only where the browser exposes it.
- Combat regression suite includes every weapon definition, reload transfer/cancel invariants and all tactical item definitions.
- Character locomotion, sprint, aim and airborne transitions use damped animation blends.

## Automated validation
From `rockey-server/`:
```sh
npm install
npm test
npm run build
```

## Live checks
Movement capture:
```js
window.addEventListener('rockey:movement-check-stop', e => console.table(e.detail.samples));
window.RockeyQA.startMovementCheck();
// traverse stairs, bridge, basement, roof and repeated jump/land cycles
window.RockeyQA.stopMovementCheck();
```

Network recovery and impairment:
```js
window.RockeyNetworkQA.setProfile(1, 50, 300);
window.RockeyNetworkQA.setProfile(5, 50, 300);
window.RockeyNetworkQA.setProfile(10, 50, 300);
window.RockeyNetworkQA.setProfile(20, 50, 300);
window.RockeyNetworkQA.clear();
```
Use private/practice sessions. Impairment can interrupt gameplay. On normal connection loss, the client retries with backoff; the server reconnect grace is 30 seconds.

PC/mobile profile:
```js
window.addEventListener('rockey:performance', e => console.table(e.detail));
```
Collect separate runs on physical desktop and mobile devices; device profiles are hints and do not replace measurements.

60-minute soak:
```js
window.addEventListener('rockey:soak-sample', e => console.log('SOAK', e.detail));
window.addEventListener('rockey:soak-stop', e => console.log('SOAK REPORT', e.detail));
window.RockeyQA.startSoakTest(); // 60 minutes
```
Keep the game tab foregrounded and prevent device sleep. The report includes heapGrowthMb, geometryGrowth, textureGrowth and suspectedLeak.

## Limits that require physical playtesting
- Build and automated tests cannot certify hand-to-weapon visual contact, foot planting on every stair tread, or animation quality at all frame rates.
- The debris system is server-authoritative for its simulated fragment transforms and static cover/floor response; it is a lightweight custom rigid-fragment simulation, not a general-purpose server Rapier world with full collision meshes.
- No physical PC/mobile FPS measurements or completed 60-minute soak are claimed until someone runs these procedures on target devices.
