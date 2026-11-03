# Doronium Factory — Project Audit

- Audit date: 2026-11-03
- Repository: https://github.com/Rockey-Jason/doldol-site
- Live target: https://rockey-jason.github.io/doldol-site/doronium-factory/
- Target specification: `도로늄 공장을 만드는 법.md`, v4.5.0.
- User-approved target: preserve the existing browser game (A). Unity-only deliverables are adapted to Three.js/DOM/Node/Playwright equivalents.

## Runtime baseline

| Area | Current implementation | Status |
|---|---|---|
| Entry | `doronium-factory/index.html` | Implemented |
| Runtime | `factory.js`, ES module | Partial |
| Renderer | `world3d.js`, Three.js 0.180.0 WebGL, compatibility fallback | Partial |
| Terrain | `terrain-system.js`, 192×160 tile world, 8 biomes, 5 mine levels | Conflict with canonical 2048m×2048m coordinate world |
| Items | `simulation-core.js`, ItemStack, reservation, split/merge and validation | Partial |
| Data validation | `game-data-validation.js` | Implemented for present static registries; not the complete spec registry |
| Production | `production-runtime.js` | Partial |
| Failure | `failure-runtime.js` | Partial; primitives and deterministic RNG exist, but no live machine profiles/outcomes are active |
| Skill | `skill-runtime.js` | Partial; 20-node graph/runtime and some live modifiers |
| Save | `save-store.js` | New checksum/backup/recovery layer; pending CI/runtime verification |
| Cloud | Supabase `dori_cloud_storage`, existing per-account key | Partial; schema compatibility checked in code, external session not exercised here |
| Tests | Node tests and Playwright WebGL regression | Pending latest CI run; virtual soak is not wall-clock soak |

## Confirmed code facts

- Fixed simulation step constant: 0.1 seconds.
- Static Stage order contains 18 entries. Several stages are trace-only/no-op handlers; machine environment, quality, wear and progress are not yet separated into all 18 independent authoritative passes.
- Runtime schema v4 stores ItemStack records, reservation data, failure PRNG state and bounded failure event journal.
- ItemStack split/merge uses a 5000-item stack ceiling. Recipe consumption uses reservations to avoid double spending.
- Machine processing includes power ratio gating, temperature/pressure ramp and safety bands, condition wear and one-result completion buffer.
- Failure hazard calculation uses reference duration and exposure time. Actual grade outcomes are deliberately not applied without validated profiles.
- Main static data defines 15 Doronium variants, 18 research records, 23 building definitions, 10 main campaign quests and seven Infinity stages.
- Current mine deposit list contains conventional mineral types (stone/copper/iron/coal/quartz/gold/diamond); it has no natural Doronium entries. Older prose claiming natural Doronium veins was incorrect.
- Local save key: `doronium_factory_infinite_industry_local_v1`; account suffix remains user-specific.
- Supabase table/key remain `dori_cloud_storage` / `doronium_factory_infinite_industry_v1`.
- Existing `worldVersion` migration logic is still in place. No global world-resize migration was made.

## Major gaps / conflicts

See `SPEC_GAP_MATRIX.md`. Highest-risk open items:
1. 192×160 tiles and legacy coordinate scale do not equal the 2048m×2048m spec world.
2. No full graph-based FluidNetwork, tanks/valves/flow/contamination/reservations.
3. Power uses aggregate generator/consumer totals, not isolated NetworkID topology and battery/transmission graph.
4. Conveyor logic is one-dimensional adjacency transfer, without full sorter/splitter/merger/loop policy and global ownership ledger.
5. Machine failure profiles/outcomes are not connected to live production.
6. Infinity stage power target units conflict with current power economy, and start consumes the inputs immediately rather than keeping a resumable 1500-item reservation.
7. Shipping contracts, packaging stages, Lore Archive and chapter music asset set are incomplete.
8. Engineer skills are partially wired; a node being purchasable does not imply every described bonus is active.

## Verification boundaries

- GitHub source audit is not a substitute for opening the live game on multiple real devices.
- Playwright's mobile profile is emulation, not an actual Android/iOS test.
- The virtual one-hour test executes 36,000 fixed simulation ticks; it does not observe the app for a real wall-clock hour.
- CI and Pages deployment results must be recorded from their actual workflow runs.
- No Unity project/build is part of the approved browser-game target.
