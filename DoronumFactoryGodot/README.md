# DORONUM FACTORY — INFINITE INDUSTRY

A native, standalone 3D factory/exploration game built with **Godot 4.4.1 Standard**. Unity is not used, and the runtime is not a browser page.

## Open and run

1. Install Godot 4.4.1 Standard (not .NET).
2. Import the `DoronumFactoryGodot` folder.
3. Open `scenes/main.tscn` and press Play.

The CI workflow is configured to export Windows, Linux and Android arm64 builds. Do not treat an export as available until the corresponding workflow artifact exists.

## Controls

**PC**
- WASD: move
- Shift: sprint
- Space: jump
- E: interact, gather or collect a machine output
- B: construction mode
- I: inventory
- F: factory overview
- H: hide/show HUD
- Right mouse: capture camera; move mouse to look
- Escape: release mouse / pause
- Left click on terrain: place selected building

**Android**
- On-screen D-pad: move
- RUN: sprint
- JUMP: jump
- E: interact / gather
- Swipe on the right side: camera
- Tap terrain while building mode is active: place the selected building

## Core game systems

- Seeded 2048m × 2048m world with biome regions, finite ore deposits and six POI/story areas
- Third-person player, mining tools, tool condition, repairs and inventory lot metadata
- 18 research nodes, 20 engineer skills and a 15-point milestone ledger
- Fixed 0.10s production simulation, generators, solar/wind, machine loads and a persistent 500kWh Fusion power buffer
- Furnaces, compressors, fabrication, alloy chains, miners, conveyors, warehouses and Dori Meat Tree automation
- 15 canonical Doronum variants (Normal plus 14 variants), edition batch contracts and Rusted Doronum purification
- One-time Research Point Ledger, unique per-node research samples and analysis
- Versioned local save with checksum, temporary write, rolling backup, world depletion/tree persistence and schema-1 migration

## Final technology path

1. Complete the 18-node research tree and restore the four BLUE FURNACE INCIDENT records.
2. Reach the First Factory and restore Archive, Cooling Core and Resonance Chamber POIs.
3. Complete the Doronum/Fusion research and final safety diagnostics.
4. Produce exactly 100 qualifying units of each of the 15 canonical Doronum IDs. Each consumed lot must be natural (`synthetic=false`) with unrounded Quality and Purity ≥90.
5. Build and maintain the Infinity Fusion Machine, Fusion Power Buffer, Containment Shield, Emergency Cooling System, Pressure Calibration Rig and Cooling Stabilizer. Charge the independent buffer to at least 400kWh.
6. Start the atomic 15×100 reservation. The seven persisted stages use the canonical temperature, pressure, power and ideal-time targets; ramping, brownouts and failures extend wall-clock time.
7. Collect the single Infinity output, install three distinct Stabilization Relays and the Core, then complete the three timed planetary synchronization phases (60/90/120 seconds).
8. The ending unlocks Infinite Industry free play.

See `FINAL_TECH_ACCEPTANCE.md` for the acceptance checklist and `SPEC_GAP_MATRIX.md` for honest implementation status.

## Save data

Native saves live in Godot's `user://doronium_factory_save.json`. The save stores world seed, depleted resources, tree growth, inventory lots, buildings, research, skills, story flags, power buffer, fusion job/manifest, relays and ending state. Browser prototype localStorage is not imported.

## Known gaps

- The 3D world and factory visuals are procedural blockout assets; final custom meshes, detailed character/machine animations, VFX and the complete 40-track score are not yet supplied.
- Power is currently a global supply/load model with a dedicated Fusion battery, not the full per-port network/priority graph.
- Conveyors have basic automatic transfer; splitters, mergers, cycle validation, precise spacing and full backpressure ownership are not complete.
- Shipping/contract economy exists only for the two final edition-material contracts; the full contract board, timed shipping routes, prices and market simulation remain incomplete.
- Water is currently a tree-watering resource; the full graph-based fluid/pipe/tank/valve system is not complete.
- Several of the 20 skill nodes currently provide data/UI or selected active modifiers; every passive effect and Blueprint workflow still needs implementation.
- Full end-to-end campaign playtesting, save corruption fixtures, Android device testing and the native exports must pass before calling the build release-ready.
