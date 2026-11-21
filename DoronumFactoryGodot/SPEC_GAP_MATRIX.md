# Specification Gap Matrix

| Area | Current status | Implemented evidence | Remaining acceptance work |
|---|---|---|---|
| Native 3D / no Unity | Partial | Godot 4.4.1 project, 3D scene, third-person controller | Main-scene boot and in-engine PC play test |
| 2048m seeded world | Partial | deterministic seed, terrain, biome regions, deposits, POIs | chunk streaming, exact underground/depth data and world-boundary validator |
| PC/mobile controls | Partial | keyboard, touch D-pad, jump/sprint/interact and right-side camera swipe | Android device layout/performance/input testing |
| Save integrity | Partial | schema 3, checksum, temp write, valid backup, schema-1 migration, resource depletion/tree growth persistence | interrupted-write and corrupt-primary/backup fixtures |
| Inventory / provenance | Partial | stack metadata, synthetic flag, atomic lot consumption, Fusion manifest | full GUID ownership/transfer/reservation audit and merge invariants |
| Mining / tools | Partial | ore power requirements, tools, condition, breakage, repair, deterministic byproduct skill | mining-speed modifier, complete tool progression balance |
| Research | Partial | 18 nodes, one-time RP ledger, first scans/recipes/lore, unique research samples | full campaign RP simulation and per-node required sample data |
| Engineer skills | Partial | 20 nodes, 15-point milestone ledger, prerequisites, one-time respec, selected active modifiers | remaining passive effects, Blueprint workflow and full UI acceptance |
| Basic/advanced recipes | Partial | furnace, alloys, titanium, magnets, sensors, tools and Doronum recipes | recipe validator, full input/output quality profiles and balance |
| Power | Partial | generators, solar, wind, global loads, brownout, persistent 500kWh Fusion buffer | per-port networks, batteries, priority allocation, weather and islanding |
| Automation/logistics | Partial | auto miners, water pump, Dori harvester, basic conveyor transfer and warehouse | splitters/mergers, lane spacing, backpressure, cycle/deadlock tests |
| Dori Meat Tree | Partial | 2L water, 60s regrowth, one meat per cycle, non-destructive regrowth and persisted tree state | automated fertilizer/irrigation, growth animation and idempotency fixtures |
| Doronum variants | Partial | 15 canonical IDs; Normal plus 14 variant recipe definitions; rusted purification; edition contracts | all recipes run through their machines with quality/purity acceptance tests |
| Story / ORBIT / First Factory | Partial | four incident lore POIs, three physical restoration POIs, ORBIT gate | all chapters/objectives/dialogue/cutscenes and skip/reload tests |
| Infinity Fusion | Partial | exact 15×100 natural manifest, unrounded ≥90 gates, atomic custody, 7 stages, measured Quality/Purity, power buffer, diagnostics and failure recovery | end-to-end 1500-input production and save/reload/fault tests |
| Planetary Stabilization | Partial | exactly three relays, core, 60/90/120s phases, post-ending free play | relay synchronization, physical power network and full ending replay tests |
| Contracts / shipping / economy | Partial | special/limited batch material contracts | contract board, deadlines, shipping routes, pricing, payouts and exploit tests |
| Fluids / pipes | Missing | tree water is represented as inventory quantity | graph-based fluids, pumps, pipes, tanks, valves, flow and conservation |
| Visual/audio | Partial | procedural terrain/building/tree meshes, animated rings, lighting, fog and glow | final custom models, player/machine animation, particles, sound effects and 40-track score |
| Native exports | Not Yet Verified | Windows/Linux/Android presets and CI export workflow | latest successful CI and install/run tests on each target |
