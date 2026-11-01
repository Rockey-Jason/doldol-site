# DORONUM FACTORY — INFINITE INDUSTRY

Native 3D game project built with Godot 4.4.1. Unity is not used. This is not a browser game.

## Run

1. Install Godot 4.4.1 Standard (not .NET).
2. Open this folder as a project in Godot.
3. Run scenes/main.tscn.

## Desktop controls

- WASD: move
- Shift: sprint
- Space: jump
- E: interact / gather / operate a machine
- B: construction mode
- I: inventory
- F: factory overview
- H: hide/show HUD
- Right mouse: capture camera
- Escape: release mouse / pause
- Left click on terrain: place selected building

The game starts with the mouse visible so the HUD can be used immediately. Right-click the world to capture the camera; press Escape to release it.

## Canonical endgame

- World: 2048m × 2048m, X/Z bounds ±1024m.
- Doronum is manufactured; it never appears as a natural ore deposit.
- A natural Dori Meat Tree needs 2L water, grows for 60 seconds and yields 1 non-synthetic Dori Meat without being destroyed.
- Normal Doronum requires 10 non-synthetic Dori Meat.
- Infinity Fusion accepts exactly the 15 canonical item IDs in GameData.DORONUM_IDS, 100 each, 1500 total. Every selected lot must be non-synthetic and have unrounded Quality and Purity ≥90.
- Fusion runs seven persisted stages with the exact 500/1200/1800/2500/3500/4500/5000°C targets, 100/500/1000/5000/10000/15000/20000MPa targets, 0.5/1/1.5/2.5/3.5/4.5/5MW demands and 20/25/30/35/40/50/60 seconds ideal progress.
- Ideal RUNNING time is 260 seconds. Ramp time, power pauses, interlock pauses and recovery add wall-clock time.
- Infinity is committed to an output buffer once. It does not automatically end the game.
- Three independent relays, the central core and three stabilization phases are required. The ending then unlocks Infinite Industry free play.

## Simulation

Authoritative production, world-tree growth, research and fusion use a 0.10-second fixed tick. Production pauses below PowerRatio 0.80 and brownout progress scales by the actual ratio. Saves use checksums, a temporary file and a rolling backup. Offline production is disabled.

## Known implementation choices / gaps

- Equal input MaterialWeight/PurityWeight values are currently an explicit NCP for recipes whose source table does not yet provide individual weights. Replace them with per-input canonical values after full recipe-data extraction.
- The default safe temperature/pressure tolerance for ordinary recipes is ±10% pending individual machine/fault profiles.
- Several side systems from the full reference (shipping economy, complete contracts, fluids/pipes, full skill tree, all 40 audio tracks, complete animation/VFX inventories and final production-line acceptance tests) are not yet complete.
- Rusted Doronum purification and special/limited batch supply require their dedicated purifier/contract implementation before the Infinity path can be considered complete.
- Windows/Linux export and smoke tests are performed by the GitHub Actions workflow. They are not claimed as passed until that workflow completes successfully.
