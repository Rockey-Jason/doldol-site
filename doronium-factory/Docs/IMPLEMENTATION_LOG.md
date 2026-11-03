# Doronium Factory — Implementation Log

- 작업일: 2026-11-03
- Repository: `Rockey-Jason/doldol-site`
- Target: GitHub Pages / Three.js browser game
- Baseline: `도로늄 공장을 만드는 법.md` v4.5.0
- Architecture choice: existing web game retained (user-approved option A).

## 이전까지 존재하던 작업

- 192×160 world / 8 biomes / 5 underground levels / terrain chunks and instanced world props.
- Three.js WebGL renderer and fallback.
- 15 Doronium crystal IDs/models, 18 research nodes, 23 building definitions, 10 main quests, 7-stage Infinity process.
- ItemStack runtime, stable stack identifiers, split/merge, per-stack reservations, atomic recipe ingredient consumption.
- Data-reference/research-dependency validator.
- Machine power ratio, temperature/pressure ramp and safe band, condition wear, single completion buffer.
- Failure hazard/RNG/event journal foundation (not connected to live machine outcome profiles).
- Existing Playwright smoke/regression and Node test workflow.

## This pass — change set

1. Add Engineer Skill Tree runtime: five groups, 20 nodes, 15-point ceiling, unique milestone claims, prerequisite validation and save-state ledger.
2. Wire currently supported bonuses only: scan radius, manual mining repeat rate, explicitly opted-in recipe quality modifier, and 5% Storage/Warehouse currency installation-cost discount.
3. Add skill acquisition confirmation and in-game tree UI under Research.
4. Add versioned save envelope, checksum validation, temporary write/read-back, three rolling backups, latest-valid candidate recovery and future-schema protection.
5. Integrate local-save workflow with existing account-scoped local key and Supabase cloud row; preserve legacy keys.
6. Extend unit tests and Playwright for skill tree, confirmation, save recovery and overlay closure.
7. Correct outdated mine documentation: current static mine deposit table has no natural Doronium ores.

## Validation status

The corresponding commit/Actions/Pages run IDs and their results must be filled after the workflow completes. A source update is not proof of passing tests.

## Verified execution results

- Final source commit under test: `f39aa3f869195cdd9137f209beb0a1ed155614cc`.
- Doronium validation workflow: run [41589409673](https://github.com/Rockey-Jason/doldol-site/actions/runs/41589409673) — **success**.
- Node/static validation job — **success**, all **40/40** unit tests passed; JavaScript syntax and required runtime-contract checks passed.
- Playwright browser regression job — **success**:
  - Desktop WebGL renderer and mobile-emulation WebGL renderer initialized.
  - Static scene rebuild/render budget and crystal preview checks passed.
  - 20-node / 5-group skill tree, confirmation-based skill purchase and one-point accounting passed.
  - Survival eat/drink controls, underground mining, tool guard, standard/adaptive conveyor placement checks passed.
  - Belt cargo visuals, engineer path-to-machine interaction, low-power pause and input preservation passed.
  - Virtual hour: 36,000 fixed 0.1-second ticks; simulation time advanced 3,600 seconds; 296 iron plates produced and delivered to inventory; ore-equivalent ledger balance 50,000 and coal-equivalent ledger balance 30,000 preserved.
  - Mobile viewport 390×844: touch movement pad visible and engineer moved from (72,52) to (73,52).
  - No uncaught browser JavaScript errors; desktop and mobile screenshots uploaded as workflow artifact 13209621174.
- GitHub Pages build/deployment:
  - Pages build run [41589409085](https://github.com/Rockey-Jason/doldol-site/actions/runs/41589409085) — **success**.
  - ROCKEY Pages deployment run [41589409592](https://github.com/Rockey-Jason/doldol-site/actions/runs/41589409592) — **success**.
- This is CI automation evidence. The virtual one-hour simulation is not a real wall-clock 60-minute device soak; mobile verification is browser emulation, not physical Android/iOS hardware.
- The overall v4.5.0 spec status remains **Partial/Conflict**, as listed in `SPEC_GAP_MATRIX.md`. Passing these checks does not imply that fluid networks, power topology, full shipping contracts, live failure profiles, every skill effect, all story/music assets, or the conflicting canonical world/power scales are complete.

## Known remaining scope

See `SPEC_GAP_MATRIX.md`. Overall v4.5.0 Gate remains Partial/Conflict while FluidNetwork, contract shipping, full FailureProfiles/outcomes, power topology, blueprints, all skill effect integrations, Lore/story audio, canonical Infinity power units and real-hardware soak checks remain incomplete.
