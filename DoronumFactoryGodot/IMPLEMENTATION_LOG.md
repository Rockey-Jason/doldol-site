# Implementation Log

## Godot native foundation

- Engine target: Godot 4.4.1 Standard.
- Branch: feature/doronum-factory-godot4.
- Implemented: native project/scene, seeded 3D world, third-person controller, HUD tabs, inventory/crafting, research data, fixed-tick simulation, power ratio, machine process temperature/pressure, quality/purity formula, ore extraction, conveyor payload routing, Dori Meat Trees, Doronum recipes, Infinity manifest/preflight/escrow, seven fusion stages, failure/recovery, output buffer, relays/core/stabilization and post-ending state.
- Partially implemented: complete machine/data graph, story objective gating, save migration, final quality profiles, logistics network, power network and endgame acceptance path.
- Missing: complete contracts/shipping/economy, fluids/pipes, full skill tree, complete art/audio/animation inventory, full 40-track score.
- Tests authored: smoke test for canonical IDs, 18 research nodes, 7 stages/260 seconds, synthetic-input rejection, 1500-item atomic escrow, recovery and 89.99 threshold rejection.
- Tests executed: Not yet.
- Native exports: Not yet.
- In-engine manual play: Not yet.


## 2026-11-02 — Runtime integrity pass

- Added machine wear/condition slowdown, hazard-based failures, recovery cooldowns and repair actions.
- Corrected upward terrain normals and preserved the fixed-tick catch-up backlog instead of dropping elapsed time.
- Added machine/warehouse StackID ownership, atomic recipe input supply, persistent warehouse storage and atomic output collection.
- Added schema 3 migration and cross-owner StackID validation.
- Added explicit manual-craft QualityProfile and weighted Quality/Purity calculations.
- Added canonical data validation and boundary tests for Quality, Purity, PowerRatio, backlog, transaction rollback, migration and Infinity escrow.
- Godot CI / smoke tests / native exports: Pending current workflow run; not yet reported as passed.
- Full campaign, Android device and in-engine manual play: Not yet executed.
