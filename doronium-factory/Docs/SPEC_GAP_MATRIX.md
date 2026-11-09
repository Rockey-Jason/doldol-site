

## 2026-11-04 incremental implementation status — not a release gate

The current development branch adds live integrations beyond the 2026-11-03 audit:

| Area | New implementation | Remaining completion gate |
|---|---|---|
| Cloud save | Authenticated owner-scoped CAS RPC using `save_revision`; server rejects malformed envelope/state shape, unsupported schema and payloads >5MB; updates `updated_at`; RLS owner-only and SECURITY INVOKER | Real account two-device conflict/recovery UI; decide whether to revoke direct table INSERT/UPDATE after all clients migrate to RPC; gameplay authority is still client-side for this single-player save |
| Construction | Live footprint checks, material/money escrow and rollback | All building footprints/art/ports, full dismantle inventory handling and crash recovery for pending transactions |
| Blueprint | Save current selection/factory, duplicate, rotate and atomic placement UI | Port connectivity validation, complete blueprint migration/import/export UX and all special placement rules |
| Power | Live per-consumer allocations, explicit cable-connected networks, transformer cap and battery kJ charge/discharge; generator/consumer/transformer/battery ratings now convert internal design units to kW; Infinity stage demands are 500kW→5MW | Transmission-loss calibration, storage dispatch policy review, grid diagnostics/visualizer, full generator/relay hardware integration and current browser regression |
| Mine automation | Underground layer-specific miners, coal-fuelled mine generator, per-deposit depletion, byproducts, drill wear and repair | All mineral deposits/levels, mining profile failures, drill component crafting, actual in-device/browser regression and mine logistics |
| Logistics | Live graph-based conveyor routing and machine-output entry; manual inventory-to-machine-input transfers now journaled and browser-tested; non-conveyor-to-first-belt crash regression remains covered | All sorter/splitter/merger/lift/curve/multi-lane buildings as player-usable assets, automated deadlock recovery, stable stack identity across belts and full logistics custody recovery |
| Shipping | Three sample contracts, five packaging steps, qualified reservation, transit outcome/insurance and idempotent reward | Full contract catalog, route-derived risk, packaging model/assets, server-side reward authority and comprehensive delivery recovery tests |
| Failure | Five production machine profiles are connected to live machine processing and repair UI | Profiles/outcomes for every machine, failure distribution validation, failure/residue loss ledger and hardware/session regression |
| Fluid | Pipe/pump/valve/tank are placeable and connected to live fixed-tick water flow; valve controls, live volume/pressure inspector, pump power and Dori Farm fluid-buffer consumption are connected | Oil/petroleum/molten-metal/lava/chemical source/extractor paths, port-direction validation, leak/failure integration, persistent fluid ownership ledger and full conservation/browser regression |
| Item ownership | Live single/batch inventory consumption; manual inventory-to-machine-input supply; recipe buffer and inventory reservations transfer into active-job custody; completed recipes atomically consume active inputs and create one machine-output custody record; rollback/idempotency and live-smelter E2E pass | Still not one source of truth: conveyors, world drops, independent warehouse, shipment cargo settlement, demolition, Fusion output and recovery remain separate snapshot or mutation paths; preserve stack identity and add cross-domain conservation/rollback tests |
| Canonical Doronum | 15 canonical input IDs and separate `ITEM_DORONUM_INFINITY` output ID; legacy alias migration/quarantine; 15 crystal models/shapes; manifest audit passes | Manifest is not yet the sole live source: `recipeFor` still reads legacy `RECIPES`/`VARIANT_RECIPES`/`PURIFICATION_RECIPES`, and `CANONICAL_RECIPE_REGISTRY` wraps those objects; complete recipe/model/research/UI/campaign cross-reference and quarantine review UI |
| Infinity | Live `startInfinityFusion`/`tickInfinityFusion`/`cancelInfinityFusion`/`recoverInfinityFusion` path; 15 canonical input IDs ×100 individually quality/purity/synthetic checked and reserved; seven stages totaling 260 simulated seconds; independent cooling/pressure diagnostics and power-pause resume; live E2E verifies 1,500 inputs consumed and exactly one canonical output | Add cloud-save/reload and process-restart recovery E2E; finish critical failure/temperature/pressure/cooling interlock coverage; integrate output into authoritative completion/custody ledger and verify replay after restored saves |

The latest branch checkpoint passed static validation and Playwright browser regression (run 41778308536). It passed desktop/mobile-emulation WebGL smoke, the virtual one-hour scenario, and the newly added power/fluid/Fusion/mining/logistics regression checks. This is not a physical Android/iOS test or a 60-minute wall-clock soak. No live main-branch deployment is claimed here.

**Overall v4.5.0 status remains Partial/Conflict.** The incremental work above must not be mistaken for release completion. The original completion declaration rule remains in force.


## 2026-11-08 runtime integrity update — partial

The branch now includes a persisted deterministic RNG-stream API, an ordered/idempotent event queue with bounded retry journal, idempotent quest reward processing, and a maximum-ten-fixed-tick catch-up budget. Unit coverage has been added for event ordering/deduplication/retry, RNG replay, and catch-up backlog preservation. The latest static validation passed; browser regression is pending. These changes do not close the separate ownership-ledger, all-fluid, world-scale, canonical-recipe/model or Infinity interlock gates above.

**Do not mark the project complete from this update.** Remaining gates and the distinction between virtual and physical tests continue to apply.


The legacy Infinity finished-product migration is now implemented and covered by migration/fusion tests on the development branch. Its final verification is pending; this does not close the recipe/model source-of-truth or full Infinity interlock gates.


## 2026-11-08 — 12-area master roadmap status

The complete deficiency assessment is recorded in `Docs/PROJECT_AUDIT.md`. Current result: **all 12 areas remain PARTIAL, blocked or UNVERIFIED; no overall completion claim is valid**.

| Master area | Current status | Acceptance blocker |
|---|---|---|
| 1 World/terrain | Partial | 192×160 tile world does not meet 2,048m×2,048m contract; coordinate/save migration and streaming unresolved |
| 2 Exploration/survival | Partial | Full PC/mobile, death/recovery and long-session regression |
| 3 Construction | Partial | All ports/footprints/dismantle/cancel/crash recovery not covered |
| 4 Mining | Partial | The previously failing automatic-mine output regression now passes the latest Playwright run; all deposits/levels, byproducts, failure profiles and hardware testing remain incomplete |
| 5 Production/canonical data | Partial | Canonical manifest is not yet the universal live recipe/model/research source; current live research catalog has 19 entries while the master acceptance target states 18, so the count contract must be reconciled |
| 6 Power | Partial | Transmission losses, all devices, diagnostics and topology regression |
| 7 Fluids | Partial | Only water path is substantially live; five other fluid paths incomplete |
| 8 Logistics | Partial | Manual inventory-to-machine supply is journaled; full transport asset catalog, conveyor custody, deadlock recovery and end-to-end logistics conservation remain |
| 9 Ownership | Partial / critical | Direct/batch inventory consumption and manual machine-input transfers are journaled; the ledger is not yet the single source of truth across production, belts, drops, warehouse, shipping, fusion and recovery |
| 10 Failure/skills | Partial | Full failure and skill-effect integration/coverage |
| 11 Shipping/Fusion/ending | Partial / critical | Full shipping contract catalog and server-authoritative settlement; Fusion save/reload recovery and complete safety/failure interlocks; full planetary ending regression |
| 12 Saves/security/performance/release | Partial / unverified | Real two-device, physical-device, 60-minute wall-clock and final release tests |

Release gates: cancelled or pending CI is not a pass. Mobile emulation is not a physical-device test. A virtual one-hour test is not a 60-minute wall-clock soak. PR-only work is not main/deployed work.


## 2026-11-09 — live item transaction checkpoint

The latest corrected code commit `4ce7ad0` passed both push and PR validation workflows (128/128 Node tests and Playwright PASS). The new browser case verifies real manual inventory-to-machine custody transfers, single/batch consumption journaling, exact inventory deltas, and fail-closed behavior when a duplicate shipment custody key corrupts the snapshot. The earlier automatic mining output-null browser regression is also green in this checkpoint.

This improves one important ownership path but does **not** close global item ownership. The ledger still mirrors several independently mutated domains. Continue with recipe-buffer/active-job/completion transitions and then conveyor, warehouse, world-drop, shipment, demolition and Fusion custody. Keep the 2,048m×2,048m world, five non-water fluid types, 19-vs-18 research count, complete canonical recipe/model source, full Fusion interlocks/recovery, physical-device tests and real 60-minute soak open.

**Current result remains PARTIAL / NOT RELEASE-READY.** Mobile viewport emulation and 36,000 virtual ticks are not substitutes for physical devices or a wall-clock soak. Main, Pages deployment and production data remain unchanged.


## 2026-11-09 — Fusion and cross-PR status correction

The live Fusion runtime is **implemented and browser-tested**: 15 individually qualified canonical input reservations, seven simulated stages / 260 seconds, power pause/resume, independent cooling and pressure diagnostics, cancellation, and exactly-once canonical output settlement. Its remaining release blockers are cloud-save/process-restart recovery, full critical-failure interlock coverage and output custody integration. The canonical catalog still does not drive every live recipe: `recipeFor` continues to use the legacy recipe maps.

PR #10's catalog/factory/simulation/world files are older than the current equivalents. PR #9's cloud-save, deterministic, fluid, custody and logistics modules have current evolved counterparts; its edge-level power-loss and segment/parcel conveyor models are not drop-in compatible and were not blindly merged. PR #8 remains the separate Godot implementation and was not merged.

**Overall status remains PARTIAL / NOT RELEASE-READY.** The 260-second Fusion and 36,000-tick soak values are simulated time, not a 60-minute wall-clock soak. Physical PC/mobile hardware and cloud restart recovery remain UNVERIFIED.


## 2026-11-09 — production lifecycle custody checkpoint

The live recipe lifecycle is now journaled end-to-end for the current machine production path:

- **Recipe start:** machine-buffer inputs move from `MACHINE_INPUT` to `ACTIVE_JOB` through idempotent custody transfers. Inventory ingredients are reserved, transferred from their reservation owner into the same machine job, and removed from the player inventory only after the journal accepts every allocation.
- **Recipe completion:** one `PRODUCTION_COMPLETE` transaction consumes all active-job ingredient records and creates one `MACHINE_OUTPUT` record. Missing inputs or an output collision roll the ledger operation back. A post-commit snapshot rebuild verifies that the output remains owned and no active-input quantity is duplicated.
- **Verification:** checkpoint `88604b631b9fbf68b9f797f77fdbd822bf2e0a6e`; Node tests **130/130**; push CI [42550511913](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550511913) and PR CI [42550516843](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550516843) both successful. Playwright confirms the real smelter recipe's 3 input units become exactly 1 output unit with a valid final custody snapshot. The 36,000-tick virtual soak remains simulated time, not a 60-minute wall-clock test.
- **Remaining ownership gate:** the output still needs journaled transfer through conveyor segments into machines, storage/warehouse, and market; independent warehouse stock, world drops, shipment cargo and delivery settlement, demolition, Fusion output, and crash/reconnect recovery still need the same authoritative transaction boundary.

**Overall status remains PARTIAL / NOT RELEASE-READY.** No production or main-branch changes were made.
