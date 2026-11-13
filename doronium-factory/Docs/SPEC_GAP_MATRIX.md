

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
| 8 Logistics | Partial | Machine output → conveyor → conveyor → storage/player-inventory custody transfers and market-sale consumption are journaled; conveyor-to-machine, partial parcel splits, full sorter/splitter/merger/lift/curve/multi-lane assets and deadlock recovery remain |
| 9 Ownership | Partial / critical | Direct/batch consumption, manual supply, recipe active-job completion, machine-output/conveyor segment transfers and storage-to-inventory collection are journaled and E2E-tested; conveyor-to-machine, independent warehouse, drops, shipment, demolition, Fusion and recovery remain non-authoritative |
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


## 2026-11-09 — live conveyor custody checkpoint

The machine-output-to-storage route now uses the same item identity across three committed ownership transfers: MACHINE_OUTPUT → CONVEYOR (belt 1) → CONVEYOR (belt 2) → PLAYER_INVENTORY (storage collection). The live Playwright fixture verifies that quantity 2 remains quantity 2, the original stack ID is unchanged, no source/segment custody remains, and the final ownership snapshot is valid. The automated market route also journals a consumeCustody sale before crediting money, but its dedicated E2E test remains outstanding.

Updated status: roadmap area 8 Logistics and area 9 Item ownership remain PARTIAL / CRITICAL. Conveyor-to-machine transfer, partial-stack parcels, independent warehouse stock, world drops, shipment settlement, demolition, Fusion output and recovery are still open. This is not a global conservation proof or release-completion claim.


## 2026-11-10 — master acceptance status and conveyor custody hardening

**Code checkpoint:** `ad114a4d18b42ef33ff1679efd593c3a4dbc0acf`  
**Documentation checkpoint before this matrix update:** `45e68499754fcc3938a12eda5e78bb6b65644a4e`  
**Main HEAD at comparison:** `a66f653b0ad597bfa6b2a0e900a4a8928dbce3fc`  
**PR #11:** open, draft, not merged. The comparison is still diverged: 347 commits ahead / 254 behind from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. No merge-base refresh or main merge was attempted.

### 12 master roadmap areas

| # | Area | Status | Current evidence / remaining acceptance blocker |
|---:|---|---|---|
| 1 | Code, data, dependencies, entry points and save audit | PARTIAL | Audit and versioned local/cloud save paths exist; full legacy-save/device conflict and complete runtime-domain audit remain open. |
| 2 | World and terrain | PARTIAL | Three.js terrain, height variation, two landmasses and underground layers exist; actual map remains 192×160 tiles, not 2,048m×2,048m. Coordinate/save migration and full streaming/unloading remain open. |
| 3 | Player, exploration, survival and mining | PARTIAL | First/third-person, PC controls, mobile controls/emulation, survival values and underground miners exist; full campaign, death/recovery, all deposits and physical-device coverage remain open. |
| 4 | Terrain preparation and construction | PARTIAL | Flattening, foundations, footprint checks, blueprint rotation/placement and escrow rollback exist; all building port/collision/dismantle/crash-recovery cases are not complete. |
| 5 | Items, ownership and logistics | PARTIAL / CRITICAL | Inventory consumption, production lifecycle, machine-output/conveyor/storage and conveyor-to-machine custody paths have transaction journaling. The ledger is still a rebuilt snapshot, not the authoritative source for warehouse stock, world drops, shipments, demolition, Fusion and recovery; partial-stack parcel flow remains open. |
| 6 | Power grid | PARTIAL | Network allocation, generators, batteries, transformers and kW/kJ handling exist; transmission losses, stable network diagnostics and complete dispatch/priority validation remain open. |
| 7 | Fluid grid | PARTIAL | Water pump/pipe/valve/tank flow is live; OIL, PETROLEUM, MOLTEN_METAL, LAVA and CHEMICAL still lack complete live source-to-consumer conservation paths. |
| 8 | Machine state, failures and maintenance | PARTIAL | State transitions and five production-machine failure profiles are connected; every production/support machine, residue ledger and full failure/recovery coverage remain open. |
| 9 | Production, research and skills | PARTIAL | Production and skill runtimes exist; the live research count is 19 while the master target says 18, and all 20 skill effects are not yet proven in live gameplay. |
| 10 | Canonical Doronum and Infinity | PARTIAL / CRITICAL | Fifteen canonical input IDs, quality/purity/synthetic checks, reservation, seven stages and exactly-once output logic exist; the manifest is not the sole live recipe source, and cloud/process-restart recovery, complete interlocks and output custody remain open. |
| 11 | Shipping, contracts and economy | PARTIAL | Three sample contracts and staged packaging/transit/reward logic exist; full contract catalog, route-derived risk and server-authoritative settlement remain open. |
| 12 | Save, security, performance and release | PARTIAL / UNVERIFIED | Owner-scoped CAS and local versioned saves exist; two-device conflict/recovery, server-authoritative gameplay, physical hardware and wall-clock soak evidence remain unverified. |

### 20 final acceptance checklist

| # | Acceptance item | Status | Evidence / blocker |
|---:|---|---|---|
| 1 | Complete PC playthrough | PARTIAL | Desktop WebGL/browser smoke exists; full campaign from new save through ending is not demonstrated. |
| 2 | Complete mobile playthrough | PARTIAL | Mobile viewport/WebGL emulation exists; real Android/iOS playthrough is unverified. |
| 3 | First/third-person switching | PARTIAL | Both view modes are implemented; full-playthrough input/camera regression remains. |
| 4 | 2,048m×2,048m world | NOT IMPLEMENTED | Current world is 192×160 tiles; target-scale conversion is not complete. |
| 5 | Flattening and foundations | PARTIAL | Runtime and browser scenarios exist; all slopes, footprints, ports, cancel and reload rollback are not proven. |
| 6 | Underground mining | PARTIAL | Layer-specific miners, fuelled generator, depletion, byproducts, drill wear/repair and browser assertions exist; latest-head browser rerun is not verified. |
| 7 | Fifteen canonical Doronum IDs | PARTIAL | Canonical validation and 15 models pass audit assertions; universal manifest-driven recipe/model/research integration is incomplete. |
| 8 | No item duplication or loss | PARTIAL / CRITICAL | Several live paths are journaled, including conveyor-to-machine; independent domains and cross-domain conservation are incomplete. |
| 9 | Conveyors and automatic mining | PARTIAL | Graph routing and mining exist; full sorter/splitter/merger/lift/curve/multi-lane behavior, deadlock recovery and full custody remain open. |
| 10 | Power and batteries | PARTIAL | Live allocations, batteries and transformer behavior exist; transmission-loss and diagnostic acceptance remain. |
| 11 | Six fluids, pressure and temperature | PARTIAL | Water flow only is substantially live; five other fluid paths and complete thermal/leak/failure conservation are open. |
| 12 | Machine states, failures and maintenance | PARTIAL | Runtime state/failure logic exists for a subset of machines; all-machine coverage is incomplete. |
| 13 | Research 18 / skills 20 | PARTIAL | Current research catalog has 19 entries (contract mismatch); skill tree has 20 nodes but all effects are not live-verified. |
| 14 | Seven-stage Fusion | PARTIAL | Live seven-stage / 260 simulated-second path exists; complete interlock and restart recovery acceptance remains. |
| 15 | Exactly one Infinity output | PARTIAL | Exactly-once settlement and browser assertions exist; latest-head browser rerun and authoritative output custody/recovery remain. |
| 16 | Cloud save and recovery | PARTIAL | Owner-scoped revision CAS exists; real two-device conflict, reload and process-restart recovery are not verified. |
| 17 | Server authority and security | PARTIAL | Owner-scoped CAS/RLS boundary exists; gameplay reward/state authority is not fully server-side. |
| 18 | 60-minute wall-clock test | UNVERIFIED | 36,000 virtual ticks are simulated time, not a 60-minute elapsed-time soak. |
| 19 | Physical PC/mobile performance | UNVERIFIED | Browser/viewport emulation is not physical PC, Android or iOS hardware validation. |
| 20 | Full new-save-to-ending regression | PARTIAL | Individual gates and the planetary stabilization fixture exist; a complete campaign playthrough is still missing. |

**No checklist item is COMPLETE.** The world-size requirement is not implemented; physical-device and wall-clock requirements remain unverified. Do not equate emulation, virtual ticks, helper tests or PR-only code with release acceptance.

### 2026-11-10 code change and verification boundary

- `transferBuildingCargoToMachine` now rejects exact committed replays before applying machine-input projection and rolls back the source, target, item projections, ownership journal and sequence when destination projection throws.
- The browser fixture now asserts successful conveyor-to-machine transfer, transaction-key conflict rollback, exact replay rejection and exception rollback.
- Isolated V8 execution of the fetched production helper with the actual ownership-runtime functions passed: success transfer, exact replay rejection and exception rollback (**3/3**). Factory and Playwright smoke source syntax compilation passed (**2/2**).
- This is not the Node suite or a real Playwright run. No Actions run was returned for code checkpoint `ad114a4d18b42ef33ff1679efd593c3a4dbc0acf`; latest-head Node/browser status remains **UNVERIFIED**. The previously successful run [42433376139](https://github.com/Rockey-Jason/doldol-site/actions/runs/42433376139) belongs to earlier checkpoint `924c054555911aa38fe8e105c346f61231c0f8b4` and is not evidence for the new transfer code.
- The mine-output-null browser regression remains asserted in `e2e/factory-smoke.mjs` after 81 fixed ticks; it passed in the earlier browser checkpoint but has not been rerun on the current code checkpoint.

### Cross-PR and deployment boundary

- Main is currently `a66f653b0ad597bfa6b2a0e900a4a8928dbce3fc`; PR #11 still has an old merge base and is 347 ahead / 254 behind. Do not use GitHub's mergeable flag as a safety proof.
- PR #10 is open/non-draft and PR #9 is open/draft; their older catalog, factory, simulation, world, power, fluid, logistics and custody files were not blindly merged. PR #8 remains the separate Godot project and was not merged into the Three.js/WebGL game.
- PR #11 remains draft/open. No main merge, Pages/Render deployment, production database mutation, production save mutation or real-user reward/balance change was performed.


## 2026-11-11 — shipment custody integration checkpoint

**Code checkpoint:** `c397cf171db9e5ba6da3e51f9a1e475ec7076252`  
**Main HEAD:** `293a1e8a147648763777abb6e41dd903fa22a82c`  
**Branch divergence:** 355 ahead / 280 behind from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`.

### Updated roadmap evidence

| Master area | Status | New evidence | Remaining acceptance blocker |
|---|---|---|---|
| 5. Items, ownership and logistics | PARTIAL / CRITICAL | Shipment reservation allocations now transfer into explicit `SHIPMENT_CARGO` custody; delivery consumes the cargo journal exactly once; failed delivery moves the same stack identity into persisted `WORLD_DROP` custody; dispatch/settlement rollback and rebuild checks are covered by unit and live-fixture source. | World-drop pickup/rendering, independent warehouse stock, partial conveyor parcels, demolition, Fusion output custody, restart/reconnect recovery and global cross-domain conservation remain open. |
| 11. Shipping, contracts and economy | PARTIAL | Shipment cargo no longer disappears from custody or masquerades as warehouse stock; failed cargo has a persisted world-drop record. | Full contract catalog, route-derived risk, server-authoritative reward settlement, world-drop recovery UX and full delivery/reload E2E remain open. |

### Updated 20-item acceptance evidence

| # | Item | Status | Update |
|---:|---|---|---|
| 8 | No item duplication or loss | PARTIAL / CRITICAL | Dispatch, delivered-cargo consumption and failed-cargo world-drop transitions now have explicit transaction IDs and rollback; this is not a proof across every owner domain. |
| 9 | Conveyors and automatic mining | PARTIAL | No change to sorter/splitter/merger/lift/curve/multi-lane, deadlock recovery or full logistics custody acceptance. |
| 11 | Six fluids, pressure and temperature | PARTIAL | No change; five non-water live fluid paths remain incomplete. |
| 15 | Exactly one Infinity output | PARTIAL | No change; authoritative output custody and restart recovery remain open. |

All 12 roadmap areas remain PARTIAL or UNVERIFIED; no final checklist item is COMPLETE.

### Verification boundary

- Production contract-runtime test source executed against the current fetched runtime modules in an isolated V8 harness: **8/8 passed**.
- The current factory's actual `rebuildOwnershipLedger` function was exercised with the current ownership/contract/simulation modules: delivery consumed 2 units once; failed delivery preserved 2 units as a world drop; rebuilt ledgers validated.
- Factory source and Playwright smoke source syntax compilation: **2/2 passed**.
- GitHub Actions lookup for code checkpoint `c397cf171db9e5ba6da3e51f9a1e475ec7076252` returned no workflow runs and no combined status entries. Full Node CI and actual Playwright browser regression remain **UNVERIFIED**. The new browser scenario is committed but has not been observed running.
- Physical Android/iOS playthrough and 60-minute wall-clock soak remain **UNVERIFIED**.

### Integration boundary

- New shipment records use custody version 1 and the `SHIPMENT_CARGO` owner type. Legacy shipment records without this marker retain the earlier snapshot mapping to avoid silently rewriting existing saves.
- The `worldDrops` state is now a persisted custody source, but no player pickup/render/cleanup path has been completed.
- Contract reward application is still client-side and is not server-authoritative.
- PR #11 remains open and unmerged. Main remains `293a1e8a147648763777abb6e41dd903fa22a82c`; no merge, deployment, production DB change or user-save mutation was performed.


## 2026-11-12 — world-drop pickup and recovery checkpoint

**Code checkpoint:** `5704223f163a8fc478422a40cecb30fc3978aeaf`  
**Main HEAD:** `cde4215b05413d627dbacb86e8a2683a708788f4`  
**PR #11:** open / draft; old base `26e88058b6d416d79459fee107aff4a5beb3d7e3`  
**Current divergence:** 364 ahead / 578 behind from that merge base.

### Roadmap status updates

| Master area | Status | New code evidence | Remaining acceptance blocker |
|---|---|---|---|
| 5. Items, ownership and logistics | PARTIAL / CRITICAL | Failed-shipment cargo now has a layer-aware persisted world drop, a WebGL/fallback visual, E/action-button pickup, same-Stack-ID transfer to player inventory, transaction journal entry, post-transfer ledger rebuild and rollback on failure. | Independent warehouse stock, every owner-domain transfer, partial parcel movement, demolition/salvage, Fusion custody, reconnect recovery, global conservation and real browser E2E remain open. |
| 11. Shipping, contracts and economy | PARTIAL | Failed cargo can now be recovered in the player's current surface/mine layer; its original quantity and metadata survive pickup. | Full contract catalog, route-derived risk/insurance, server-authoritative reward settlement and full delivery/reload browser E2E remain open. |

### 20-item acceptance updates

| # | Item | Status | Evidence / limitation |
|---:|---|---|---|
| 8 | Item duplication/loss prevention | PARTIAL / CRITICAL | World-drop-to-player pickup now has exact Stack ID preservation, transaction idempotency, custody validation and rollback in the live function harness. This does not prove conservation across every owner domain. |
| 9 | Conveyors and automatic mining | PARTIAL | No change to advanced routing/deadlock completeness. Existing mine-output-null Playwright regression still needs a current-head browser run. |
| 16 | Cloud save/recovery | PARTIAL | World drops are part of the state snapshot and rebuild from saved state, but reload/reconnect recovery has not been browser-verified. |
| 18 | 60-minute wall-clock test | UNVERIFIED | No physical 60-minute run was performed. |
| 19 | PC/mobile hardware performance | UNVERIFIED | No physical Android/iOS device run was performed. |

### Verification record

- Contract runtime test source against fetched production modules: **8/8 passed** in an isolated V8 harness.
- Actual factory pickup/rebuild functions against production ownership/simulation modules: success, duplicate-input rejection, simulated inventory-sync rollback and conflicting transaction rejection all passed; custody validation remained valid.
- Syntax compilation of the five changed runtime/test sources: **5/5 passed**.
- No GitHub Actions run or combined status entry was returned for `5704223f163a8fc478422a40cecb30fc3978aeaf`. Native Node test-runner results and actual Playwright browser regression are **UNVERIFIED**, not passed.
- Physical Android/iOS and 60-minute wall-clock acceptance remain **UNVERIFIED**.

### PR reconciliation

- PR #9 overlaps `factory.js` and `e2e/factory-smoke.mjs`; PR #10 overlaps `factory.js` and `world3d.js`. Their PR-head files were inspected; they are older implementations and do not contain this shipment/world-drop pickup path. No broad cherry-pick was made.
- PR #8 is the separate Godot project; it remains excluded from the chosen Three.js/WebGL architecture.
- Main has advanced to `cde4215b05413d627dbacb86e8a2683a708788f4`. The development branch is 364 commits ahead and 578 behind. PR #11 is still open/draft with the old merge base; no merge or deployment is authorized.
- Overall project remains **PARTIAL / NOT RELEASE-READY**. All 12 master roadmap stages remain PARTIAL or UNVERIFIED.


## 2026-11-13 — stable network identity and current acceptance status

### Implemented in this checkpoint

- `solvePowerNetworks` and `buildFluidNetworks` now derive each network ID from the encoded smallest sorted node ID in that connected component. Unrelated network insertion and input-order changes no longer renumber an unchanged component.
- New unit tests cover both power and fluid network identity stability.
- Current code commit: `1b097e9c727666c34ff3d84e6308269e09d052cd`.
- Main HEAD: `759e02e7425499ac86ab89b364963f7f13f10230`.
- PR #11 remains open/draft. Current comparison: **367 ahead / 661 behind** from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. No merge or deployment was attempted.

### 12-stage master roadmap status

| Stage | Status | Current evidence / blocker |
|---:|---|---|
| 1. Code/data/save audit and stabilization | PARTIAL | Runtime modules, save compatibility and CI are audited; complete account/device recovery is not verified. |
| 2. World and terrain | PARTIAL | 192×160 finite tile world, terrain variation and underground levels exist; 2,048m×2,048m target and full chunk streaming/unit migration remain incomplete. |
| 3. Player, exploration, survival and mining | PARTIAL | First/third person, survival, mine interaction and automated mining exist; full PC/mobile campaign and physical-device validation remain. |
| 4. Terrain preparation and construction | PARTIAL | Flattening, foundations, footprints, blueprints and rollback helpers exist; complete port, dismantle and crash-recovery coverage remains. |
| 5. Items, ownership and logistics | PARTIAL / CRITICAL | Stack IDs, reservations, production custody, conveyors, shipment cargo and world-drop pickup exist; one authoritative ledger across every domain and global conservation remain incomplete. |
| 6. Power network | PARTIAL | kW/kJ allocation, batteries, transformers and stable component IDs exist; edge-by-edge loss, persistent merge/split identity and diagnostics remain. |
| 7. Six-fluid network | PARTIAL | Six fluid types, pressure/temperature, leak and conservation solver exist; live source/extraction/recipe/consumer integration is still water-dominant. |
| 8. Machine states, failures and maintenance | PARTIAL | Failure profiles and repair paths exist; all-machine state/failure/residue coverage remains incomplete. |
| 9. Production, research and skills | PARTIAL | Production and 20 skill nodes exist; canonical recipe source-of-truth integration, all skill effects and the 18-stage research target remain unresolved. |
| 10. Canonical Doronum and Infinity | PARTIAL | Canonical input validation and live seven-stage/260-second Fusion path exist; complete interlocks, save/restart recovery and end-to-end output custody remain. |
| 11. Shipping, contracts and economy | PARTIAL | Three sample contracts, packaging and custody-aware dispatch exist; full catalog, route risk/insurance and server-authoritative rewards remain. |
| 12. Save, security, performance and release | PARTIAL / UNVERIFIED | Local/cloud CAS and RLS foundations exist; two-device conflict recovery, physical devices, memory soak and 60-minute wall-clock test remain unverified. |

### 20-item acceptance checklist

| # | Acceptance item | Status | Evidence / remaining blocker |
|---:|---|---|---|
| 1 | PC full campaign | PARTIAL | Desktop WebGL smoke/regression exists; full start-to-ending playthrough remains. |
| 2 | Mobile full campaign | UNVERIFIED | Browser viewport/touch emulation is not a physical Android/iOS playthrough. |
| 3 | First-/third-person switching | PARTIAL | Both modes exist; full campaign and all input paths remain. |
| 4 | 2,048m×2,048m world | NOT IMPLEMENTED | Current world remains 192×160 tiles. |
| 5 | Flattening and foundations | PARTIAL | Core placement rules exist; all footprints, ports, dismantle and rollback cases remain. |
| 6 | Underground mining | PARTIAL | Automatic/advanced miner scenarios are in browser regression; all deposits, levels, failures and recovery remain. |
| 7 | Canonical 15 Doronum inputs | PARTIAL | Manifest and input qualification exist; all live recipe/model/research/UI sources are not yet canonical. |
| 8 | No item duplication/loss | PARTIAL / CRITICAL | Several live transitions are journaled; global cross-domain conservation is not proven. |
| 9 | Conveyors and automatic mining | PARTIAL | Basic routing and mining exist; parcel splitting, full belt catalog and automated deadlock recovery remain. |
| 10 | Power and batteries | PARTIAL | Allocation, storage settlement and stable component IDs exist; edge loss and full diagnostic behavior remain. |
| 11 | Six fluids, pressure and temperature | PARTIAL | Generic six-fluid solver exists; five non-water live source/consumer chains remain incomplete. |
| 12 | Machine states, failures and repair | PARTIAL | Core states and repair path exist; all-machine coverage remains. |
| 13 | 18 research / 20 skills | PARTIAL | 20 skill nodes exist but effects are incomplete; current research data count does not match the 18-stage target. |
| 14 | Seven-stage Fusion | PARTIAL | Live in-memory 260-second path is tested; full safety interlocks and restart recovery remain. |
| 15 | Exactly one Infinity output | PARTIAL | In-memory settlement is idempotent; save/reconnect replay and custody recovery remain. |
| 16 | Cloud save and recovery | PARTIAL | Owner-scoped CAS/RLS and local backup exist; two-device/process-restart recovery remains. |
| 17 | Server authority and security | PARTIAL | Save boundary has owner-scoped controls; all economy/reward mutations are not proven server-authoritative. |
| 18 | 60-minute wall-clock test | UNVERIFIED | Virtual 36,000 ticks are not 60 minutes of elapsed time. |
| 19 | Physical PC/mobile performance | UNVERIFIED | No physical PC, Android or iOS soak was run. |
| 20 | Full start-to-ending regression | PARTIAL | Subflows are covered; full campaign, three relays, core and planetary ending remain. |

### CI and release boundary

- Run [43348303525](https://github.com/Rockey-Jason/doldol-site/actions/runs/43348303525): static/runtime validation **SUCCESS**; Node unit suite **135/135 passed, 0 failed**; browser-regression was still **IN_PROGRESS** when this matrix entry was written and is not counted as a pass.
- Prior full run [43135156090](https://github.com/Rockey-Jason/doldol-site/actions/runs/43135156090) succeeded on the previous HEAD, but does not replace current-HEAD E2E evidence.
- PR #8 remains the separate Godot branch and is not integrated. PR #9 and #10 remain unmerged older development branches; no wholesale merge/cherry-pick was performed.
- No main merge, deployment, production DB mutation, real-user save mutation, or balance/reward mutation was performed.

**Overall: NOT COMPLETE / NOT RELEASE-READY.** No final acceptance item is promoted to COMPLETE by this checkpoint.
