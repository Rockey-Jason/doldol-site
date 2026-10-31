# ROCKEY OVERHAUL 07 QA Guide

## Automated checks
From `rockey-server/` run:

```sh
npm install
npm test
npm run build
```

The test suite includes the weapon/combat regression tests plus deterministic packet-loss (1/5/10/20%), variable-latency (50–300ms), reordering, two-bone IK math and soak-summary checks.

## Live WebSocket impairment testing
Start a real match with at least one other player. In the browser developer console:

```js
// 1% packet loss, 50–300ms one-way delay
window.RockeyNetworkQA.setProfile(1, 50, 300);

// Run 5%, 10%, and 20% loss cases
window.RockeyNetworkQA.setProfile(5, 50, 300);
window.RockeyNetworkQA.setProfile(10, 50, 300);
window.RockeyNetworkQA.setProfile(20, 50, 300);

// Restore normal networking
window.RockeyNetworkQA.clear();
```

This opt-in test affects gameplay WebSocket messages in both directions, including heartbeat pings. It is intentionally disabled by default. It can cause disconnects and match disruption; use a private/practice test session, not a ranked match.

## PC / mobile benchmark
The game emits `rockey:performance` events containing device class, FPS, 1% low, frame time, pixel ratio, heap (when Chromium exposes it), GPU resource counts, draw calls, triangles, debris and network RTT/jitter.

```js
window.addEventListener('rockey:performance', e => console.table(e.detail));
```

Run once on a desktop browser and once on a physical mobile device. Record device/browser, map, quality setting, resolution, average FPS and 1% low. Do not compare unlike maps or settings.

## 60-minute soak test
Enter a match/training session, then run:

```js
window.addEventListener('rockey:soak-sample', e => console.log('SOAK', e.detail));
window.addEventListener('rockey:soak-stop', e => console.log('SOAK COMPLETE', e.detail));
window.RockeyQA.startSoakTest(); // default 60 minutes
```

To stop early: `window.RockeyQA.stopSoakTest()`.

The soak timer samples once per minute while the game render loop is active. Keep the tab foregrounded and avoid device sleep. Heap data is JS heap only where supported; it does not include GPU/native allocations.

## Movement and weapon inspection checklist
- Walk, sprint, stop, jump, land, traverse each stair direction, stand on every roof/bridge/basement landing, and repeat at different frame rates.
- Inspect each weapon's support-hand and trigger-hand contact during idle, aim, fire, reload, reload cancel and weapon switch.
- Repeat the complete combat regression suite after any weapon, reload, hit trace, grenade, smoke, or movement change.

## Important limits
Automated network simulations are not measurements of the public server's real-world network. The 60-minute soak and physical PC/mobile benchmarks require a live browser session on the target hardware. The current destruction replication makes initial debris generation deterministic from the same event ID on each client; it is not server-authoritative per-fragment rigid-body transform replication.
