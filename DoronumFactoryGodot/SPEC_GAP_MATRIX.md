# Specification Gap Matrix

| Area | Status | Current evidence | Remaining acceptance work |
|---|---|---|---|
| Native 3D project, no Unity | Partial | Godot project, 3D scene, native player/world scripts | Editor parse and actual PC play test |
| 2048m seeded world | Partial | seeded terrain, resource clusters, biome markers, POIs | exact canonical biome/vein/depth data and boundary tests |
| Third-person movement/interact | Partial | CharacterBody3D, camera spring arm, mining/interact ray | animation controller, collision/edge-case tests |
| Inventory / quality / purity / lineage | Partial | stack metadata, atomic consumption, weighted quality/purity calculations | full GUID/merge/reservation/owner ledger invariants |
| Basic crafting / smelting | Partial | manual recipes, furnace/compressor/rolling mill recipes | full tier recipe graph and machine data validation |
| Fixed tick / power | Partial | 0.10s scheduler, power ratio, brownout pause | power ports/networks, deterministic 30/60/120 FPS tests |
| Conveyor / auto miner | Partial | miner extraction, conveyor payload, target routing, warehouse delivery | splitters/mergers/backpressure/cycle detection and unattended five-cycle acceptance |
| Dori Meat Trees | Partial | 2L water, 60s regrowth, one natural Dori Meat, regrowth | visual growth stages, same-cycle idempotency test, automated watering tests |
| Research | Partial | 18 nodes, costs, time, prerequisites, lab power gate | research samples, complete unlock audit, graph validation |
| Doronum Normal + 15 variants | Partial | normal recipe and 14 variant definitions | all machine data, exact side recipes, purifier, provenance and 90/90 verification |
| Story / ORBIT / First Factory | Partial | eight chapter data entries, four incident records, three restoration POIs | full objectives, dialogue, ORBIT progression, cutscene skip/idempotency |
| Infinity Fusion | Partial | exact 15×100 manifest, preflight, atomic custody, seven stages, 260s, failure/recovery, one output buffer | final safety/fault profile, output quality/purity formula, stage reload tests |
| Planetary Stabilization | Partial | three relays, core install, three phases, post-ending free play | relay power/cooling links, exact synchronization and replay/idempotency tests |
| Contracts / shipping / economy | Missing | none | contract board, shipping port, orders, market and economic exploit validation |
| Skills / equipment progression | Partial | starter hands and tool crafting/equipping | complete skill tree, stats, gear and durability |
| Fluids / pipes | Missing | water inventory and tree watering only | fluid ports, pipe networks, valves, capacity, flow and conservation |
| Audio / animation / VFX | Partial | procedural visual motion and lighting | 40 real track assets, player/machine animation, SFX/VFX assets |
| Save migration / corruption | Partial | schema version, checksum, temp write and backup fallback | migration fixtures, interrupted-write and rollback tests |
| Automated tests / native builds | Not Verifiable | workflow and smoke test authored | successful Godot CI run and downloadable exports |
