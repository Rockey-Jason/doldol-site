# Doronium Factory — Project Audit

- Audit date: 2026-11-28
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
| Items | `simulation-core.js`, ItemStack, per-stack reservation, split/merge, metadata-preserving consumption and validation | Partial |
| Data validation | `game-data-validation.js` | Implemented for present static registries; not the complete spec registry |
| Production | `production-runtime.js` | Partial |
| Failure | `failure-runtime.js` | Partial; primitives and deterministic RNG exist, but no live machine profiles/outcomes are active |
| Skill | `skill-runtime.js` | Partial; 20-node graph/runtime and some live modifiers |
| Save | `save-store.js` | New checksum/backup/recovery layer; pending CI/runtime verification |
| Cloud | Supabase `dori_cloud_storage`, existing per-account key | Partial; schema compatibility checked in code, external session not exercised here |
| Tests | Node tests and Playwright WebGL regression | CI run #1125 succeeded: 47/47 Node tests, desktop/mobile-emulation WebGL, reservation regression and virtual soak; virtual soak is not wall-clock soak |

## Confirmed code facts

- Fixed simulation step constant: 0.1 seconds.
- Static Stage order contains 18 entries. Several stages are trace-only/no-op handlers; machine environment, quality, wear and progress are not yet separated into all 18 independent authoritative passes.
- Runtime schema v4 stores ItemStack records, reservation data, failure PRNG state and bounded failure event journal.
- ItemStack split/merge uses a 5000-item stack ceiling. Reservation quantity/allocation invariants are validated. Manual machine supply now records quality, purity and synthetic state from the exact consumed stacks rather than the aggregate inventory summary.
- Machine processing includes power ratio gating, temperature/pressure ramp and safety bands, condition wear and one-result completion buffer.
- Failure hazard calculation uses reference duration and exposure time. Actual grade outcomes are deliberately not applied without validated profiles.
- Main static data defines 15 legacy Doronium variants, 18 research records, 23 building definitions, 10 main campaign quests and seven Infinity stages. The 15 legacy variant IDs do **not** match the exact B9 canonical Infinity manifest; see `SPEC_GAP_MATRIX.md`.
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
6. Infinity stage power target units conflict with current power economy. The current legacy 15×100 input set is now transactionally reserved, locked, committed only on success, and returned on cancellation or machine loss; canonical ID migration and end-to-end reload/resume validation remain open.
7. Shipping contracts, packaging stages, Lore Archive and chapter music asset set are incomplete.
8. Engineer skills are partially wired; a node being purchasable does not imply every described bonus is active.


## 2026-11-16 re-audit — changes verified

- Infinity Fusion no longer deducts its 1,500 inputs at the start. It reserves each of the 15 existing variants at 100 per variant, validates every allocated stack's quality, purity and synthetic flag, and commits the full reservation only after all seven stages finish.
- The Fusion detail panel displays stage progress and offers **퓨전 중단 · 원료 반환** for new reserved jobs. Cancelling, losing the machine, or failing reservation validation releases the held inputs. A player can restart the process after cancellation.
- Reservation-aware spending now protects manual machine supply, direct sale, food/water consumption, Dori tree harvest, automated Dori farms, construction, foundation placement, research, core installation, and coal-generator fuel.
- takeItemDetailed carries metadata from the actually consumed stacks into manually supplied machine buffers; a reserved high-grade stack can no longer contaminate the metadata of a different free stack.
- E2E regression coverage verifies reserved materials cannot be sold, supplied, eaten, harvested, used for construction, or burned as fuel. It also verifies exact per-stack quality/purity transfer.
- Latest verified code commit: 6eeafc918065b87a0f7007254f05a6c4a0501573. Validation run [#1125](https://github.com/Rockey-Jason/doldol-site/actions/runs/43893004656) passed both jobs.

## 2026-11-28 — Phase 1 foundation hardening

- **Reservation ledger integrity:** `commitItemReservations()` now validates every active reservation and aggregates allocations per physical ItemStack before mutating inventory. Corrupted/overlapping reservations fail closed without partially consuming stock. Node regression cases cover both a valid 4+6 split reservation and an invalid 7+7 overlap against a stack of 10.
- **Input lifecycle:** held movement/jump keys and continuous mining are cleared on browser-window blur and when the page becomes hidden. Physical Space is recognized through `KeyboardEvent.code === "Space"` as well as the normalized key value.
- **Browser regression quality:** the Playwright test now drives actual W/Space key events on a clear fixture tile, checks movement, takeoff and landing, verifies held-key cleanup after blur, and writes a local save that must survive a full page reload with currency, player coordinates, survival health, inventory and runtime invariants intact.
- **Cache coherency:** the factory entry cache is now `factory.js?v=66`; its simulation-core import is `simulation-core.js?v=6`. No save key, save schema, world dimension, Supabase key, or user save was changed.
- **Verified commit under test:** `d67399553c48d56f08028e8b7a1a916bb3cf0c40`, PR [#50](https://github.com/Rockey-Jason/doldol-site/pull/50).
- **Doromium Factory CI run #1695:** [run 46128713179](https://github.com/Rockey-Jason/doldol-site/actions/runs/46128713179) succeeded. Node/static job passed **54/54** tests. Playwright browser regression passed with desktop WebGL and mobile-emulation WebGL, actual keyboard movement/jump/landing, focus-loss input reset, save/reload restoration, factory/power/resource checks and a 36,000-tick virtual-hour soak. It produced 296 iron plates and preserved ore-equivalent 50,000 and coal-equivalent 30,000 ledger balances. Mobile emulation at 390×844 verified the touch pad and movement from (72,52) to (73,52). Desktop/mobile screenshots were uploaded as artifact 15257006896.
- **Release boundary:** PR #50 remains a review branch; `main` and the live Pages game have not been changed by this pass. The separate site-wide quality gate still fails in `scripts/validate-runtime-polish.mjs:32` because the app shell lacks the versioned homepage-cache declaration; this check is outside the files changed by this game-only PR and is recorded rather than bypassed.
- **Remaining limitations:** CI mobile is browser emulation, not physical Android/iOS; no real wall-clock 60-minute soak or authenticated Supabase session was exercised. The canonical world-size/coordinate conflict, incomplete authoritative tick stages, graph-based power/fluid networks, and unconnected live failure profiles remain tracked in `SPEC_GAP_MATRIX.md` for their appropriate later phases.

## 2026-11-28 — Phase 2 world and independent-mine foundation

- **Five stable mine instances:** the five surface entrances now resolve to stable IDs (`mine_72_42`, `mine_30_64`, `mine_108_56`, `mine_160_91`, `mine_48_142`). Each owns its geology label, deterministic seed, tunnel footprint, ore deposits, current depth, underground player location/yaw/pitch and elevator buffers.
- **Independent generation and rendering:** non-primary mines use distinct deterministic tunnel layouts and deposit placement constrained to their own tunnel/galleries. Three.js renders only the active mine's walls, floor, ore nodes, shaft markers and geology palette; changing `player.mineId` invalidates the scene signature so the correct mine is rebuilt. Surface entrances also use distinct geology-based palettes.
- **Gameplay links:** entering an entrance carries its mine ID; exiting persists that mine's depth and player location. Depth progression and manual ore extraction affect only the active mine. Auto-miners and item/water/maglev elevators are assigned to a mine, can select a different mine in the facility panel, and read/write that mine's own deposits or floor buffers.
- **Save compatibility:** worldVersion is now 6. Version-5 shared `mineDeposits` and `mineElevatorBuffers` are migrated into the primary mine without deleting ore or stored items. Older mine-linked equipment without a mine ID stays linked to the primary mine to preserve its existing buffer access. New mines are created for the other entrances; saved per-mine depth/player/deposit/buffer state round-trips independently. The existing 192×160 surface and 40×24 × 5-level mine dimensions were deliberately not resized.
- **Automated coverage:** added `terrain-system.test.mjs` for stable entrance IDs, distinct deterministic tunnel layouts, ore-in-tunnel constraints, object isolation, seed reproducibility, version-5 migration and multi-mine round-trip. Playwright now switches between mine A and mine B and checks different geology/tunnel signatures, player location/depth, deposit amounts and elevator inventory.
- **Verified source commit:** `f13e3c7ea763d40b615f18fa8d3acdde7143c0b9` on `phase2/independent-mines-world-20261128`.
- **Doromium Factory validation run #1803:** [run 46134168654](https://github.com/Rockey-Jason/doldol-site/actions/runs/46134168654) succeeded. Static/syntax and Node tests passed **62/62**. Playwright browser regression passed with desktop WebGL and mobile-emulation WebGL, independent mine switching, old-save migration, mine-specific deposits/buffers/player progress, all existing factory interaction checks, and the virtual-hour production soak. The soak retained **36,000 fixed ticks**, **296 iron plates**, ore-equivalent balance **50,000** and coal-equivalent balance **30,000**. The 390×844 mobile-emulation test retained the touch pad and movement. Screenshots uploaded as artifact **15259266353**.
- **Remaining boundaries:** this verifies browser emulation, not physical Android/iOS or low-end hardware; no authenticated Supabase session or wall-clock hour soak was run. The overall world-size Gate remains Conflict: this pass preserves the legacy 192×160 surface and coordinate system; canonical 2048m×2048m migration still requires a separate compatibility design. No main-branch merge or Pages deployment is performed by this feature branch.

## Verification boundaries

- GitHub source audit is not a substitute for opening the live game on multiple real devices.
- Playwright's mobile profile is emulation, not an actual Android/iOS test.
- The virtual one-hour test executes 36,000 fixed simulation ticks; it does not observe the app for a real wall-clock hour.
- CI and Pages deployment results must be recorded from their actual workflow runs.
- No Unity project/build is part of the approved browser-game target.
