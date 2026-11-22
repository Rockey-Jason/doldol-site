

## 2026-11-04 incremental implementation status — not a release gate

The current development branch adds live integrations beyond the 2026-11-03 audit:

| Area | New implementation | Remaining completion gate |
|---|---|---|
| Cloud save | Authenticated owner-scoped CAS RPC using `save_revision`; server rejects malformed envelope/state shape, unsupported schema and payloads >5MB; updates `updated_at`; RLS owner-only and SECURITY INVOKER | Real account two-device conflict/recovery UI; decide whether to revoke direct table INSERT/UPDATE after all clients migrate to RPC; gameplay authority is still client-side for this single-player save |
| Construction | Live footprint checks, material/money escrow and rollback; dismantling now fails closed for active-job inputs, legacy consumed-input metadata, machine reservations and linked completion-buffer assets, including zero-progress paused jobs | Full salvage/refund transaction journaling, all building ports/footprints, cancel and crash-recovery coverage |
| Blueprint | Save current selection/factory, duplicate, rotate and atomic placement UI | Port connectivity validation, complete blueprint migration/import/export UX and all special placement rules |
| Power | Live per-consumer allocations, explicit cable-connected networks, transformer cap and battery kJ charge/discharge; generator/consumer/transformer/battery ratings now convert internal design units to kW; Infinity stage demands are 500kW→5MW | Transmission-loss calibration, storage dispatch policy review, grid diagnostics/visualizer, full generator/relay hardware integration and current browser regression |
| Mine automation | Five underground levels, deterministic geology/veins, powered basic and advanced miners, depletion/byproducts, drill wear/repair, connected drainage, local supports, rail hauling, safety closure and map guidance; current browser regression covers these live paths | Full deposit/profile catalog, drill component crafting, all mine logistics and physical-device validation |
| Logistics | Graph-based conveyor routing; machine output → conveyor → conveyor → independent warehouse/player inventory; manual inventory-to-machine and conveyor-to-machine transfers are journaled and browser-tested; mine rail delivery and shipment routing are covered by live regression | Player-usable sorter/splitter/merger/lift/curve/multi-lane assets, automated deadlock recovery, partial parcel movement and full save/recovery coverage |
| Shipping | Three sample contracts, five packaging steps, qualified reservation, transit outcome/insurance and idempotent reward | Full contract catalog, route-derived risk, packaging model/assets, server-side reward authority and comprehensive delivery recovery tests |
| Failure | Five production machine profiles are connected to live machine processing and repair UI | Profiles/outcomes for every machine, failure distribution validation, failure/residue loss ledger and hardware/session regression |
| Fluid | Pipe/pump/valve/tank are placeable and connected to live fixed-tick water flow; valve controls, live volume/pressure inspector, pump power and Dori Farm fluid-buffer consumption are connected | Oil/petroleum/molten-metal/lava/chemical source/extractor paths, port-direction validation, leak/failure integration, persistent fluid ownership ledger and full conservation/browser regression |
| Item ownership | Inventory consumption, production active-job completion, conveyor-to-machine, machine-output/conveyor/warehouse/inventory, shipment delivery/failure → world-drop pickup, and 1,500-input/one-output Fusion settlement are journaled and E2E-tested; dismantling now blocks active machine-owned assets before deletion | Still a rebuilt snapshot rather than one authoritative source: full dismantle/salvage refund journal, partial parcel splits, global cross-domain conservation and cloud/process-restart recovery remain |
| Canonical Doronum | 15 canonical input IDs and separate `ITEM_DORONUM_INFINITY` output ID; legacy alias migration/quarantine; 15 crystal models/shapes; manifest audit passes | Manifest is not yet the sole live source: `recipeFor` still reads legacy `RECIPES`/`VARIANT_RECIPES`/`PURIFICATION_RECIPES`, and `CANONICAL_RECIPE_REGISTRY` wraps those objects; complete recipe/model/research/UI/campaign cross-reference and quarantine review UI |
| Infinity | Live seven-stage/260-simulated-second path; 15 canonical input IDs ×100 with individual quality/purity/synthetic checks; all 1,500 inputs are consumed through custody journal and exactly one canonical player-inventory output stack is created and browser-verified | Cloud-save/reload and process-restart recovery E2E; critical failure/temperature/pressure/cooling interlocks; replay after restored saves |

The latest branch checkpoint passed static validation and Playwright browser regression ([run 44653672826](https://github.com/Rockey-Jason/doldol-site/actions/runs/44653672826)): 7/7 validation groups, 183 Node test cases (7 + 149 + 27), and desktop/mobile-emulation WebGL regression. It passed the 3,600-second virtual mine soak, mining/support/drainage/rail/map/shipping/Fusion/ownership checks, and 60-second elapsed samples per desktop and mobile-emulation mine scene. This is not a physical-device test or a 60-minute wall-clock soak. No live main-branch deployment is claimed here.

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
| 3 Construction | Partial | Active machine-owned work is now protected from dismantling; full salvage/refund journaling, all ports/footprints, cancel and crash recovery remain |
| 4 Mining | Partial | Latest Playwright run passes manual mining aim, basic/advanced automatic mining, drill repair, mine safety, support, drainage/rail and route-guidance scenarios; full deposit/level/profile catalog and hardware testing remain incomplete |
| 5 Production/canonical data | Partial | Canonical manifest is not yet the universal live recipe/model/research source; current live research catalog has 19 entries while the master acceptance target states 18, so the count contract must be reconciled |
| 6 Power | Partial | Transmission losses, all devices, diagnostics and topology regression |
| 7 Fluids | Partial | Only water path is substantially live; five other fluid paths incomplete |
| 8 Logistics | Partial | Machine output → conveyor → conveyor → warehouse/inventory and conveyor-to-machine transfers are journaled; mine rail and shipment/world-drop routes are browser-tested; partial parcel splits, full sorter/splitter/merger/lift/curve/multi-lane assets and deadlock recovery remain |
| 9 Ownership | Partial / critical | Direct/batch consumption, production, conveyor-to-machine, warehouse, world-drop pickup, shipment settlement and Fusion input/output are journaled and E2E-tested; active-job/reservation/completion-buffer dismantling is blocked; the ledger is still a rebuilt snapshot and salvage/refund/global conservation/recovery remain open |
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
| 6 | Underground mining | PARTIAL | Latest Playwright run passes manual/basic/advanced mining, repair, safety, support, drainage/rail and map guidance; full deposit catalog and physical-device testing remain. |
| 7 | Fifteen canonical Doronum IDs | PARTIAL | Canonical validation and 15 models pass audit assertions; universal manifest-driven recipe/model/research integration is incomplete. |
| 8 | No item duplication or loss | PARTIAL / CRITICAL | Production, conveyor-to-machine, warehouse, shipment/world-drop and Fusion paths are journaled; active-work dismantling is fail-closed; global source-of-truth conservation, salvage/refund journaling and restart recovery remain incomplete. |
| 9 | Conveyors and automatic mining | PARTIAL | Graph routing and mining exist; full sorter/splitter/merger/lift/curve/multi-lane behavior, deadlock recovery and full custody remain open. |
| 10 | Power and batteries | PARTIAL | Live allocations, batteries and transformer behavior exist; transmission-loss and diagnostic acceptance remain. |
| 11 | Six fluids, pressure and temperature | PARTIAL | Water flow only is substantially live; five other fluid paths and complete thermal/leak/failure conservation are open. |
| 12 | Machine states, failures and maintenance | PARTIAL | Runtime state/failure logic exists for a subset of machines; all-machine coverage is incomplete. |
| 13 | Research 18 / skills 20 | PARTIAL | Current research catalog has 19 entries (contract mismatch); skill tree has 20 nodes but all effects are not live-verified. |
| 14 | Seven-stage Fusion | PARTIAL | Live seven-stage / 260 simulated-second path exists; complete interlock and restart recovery acceptance remains. |
| 15 | Exactly one Infinity output | PARTIAL | Exactly-once settlement and player-inventory custody are browser-verified; save/reconnect replay and complete interlocks remain. |
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
| 5. Items, ownership and logistics | PARTIAL / CRITICAL | Stack IDs, reservations, production custody, package-material consumption, conveyors, shipment cargo, world-drop pickup and live Infinity Fusion settlement are journaled. Storage/warehouse buildings now persist independent WAREHOUSE stock with same-stack conveyor/output intake, explicit withdrawal to player inventory, stock-aware demolition protection and E2E coverage; all other owner-domain transfers, save/reconnect recovery, demolition/salvage outside warehouse stock and global conservation remain incomplete. |
| 6. Power network | PARTIAL | kW/kJ allocation, batteries, transformers and stable component IDs exist; edge-by-edge loss, persistent merge/split identity and diagnostics remain. |
| 7. Six-fluid network | PARTIAL | Six fluid types, pressure/temperature, leak and conservation solver exist; live source/extraction/recipe/consumer integration is still water-dominant. |
| 8. Machine states, failures and maintenance | PARTIAL | Failure profiles and repair paths exist; all-machine state/failure/residue coverage remains incomplete. |
| 9. Production, research and skills | PARTIAL | Production and 20 skill nodes exist; canonical recipe source-of-truth integration, all skill effects and the 18-stage research target remain unresolved. |
| 10. Canonical Doronum and Infinity | PARTIAL | Canonical input validation and live seven-stage/260-second Fusion now journal all 1,500 reserved input units and exactly one canonical player-inventory output; complete safety interlocks, save/restart recovery and end-to-end campaign acceptance remain. |
| 11. Shipping, contracts and economy | PARTIAL | Five-stage packaging now commits all reserved material through custody transactions; dispatch and delivery custody exist. Full contract catalog, route-derived risk/insurance and server-authoritative rewards remain. |
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
| 8 | No item duplication/loss | PARTIAL / CRITICAL | The WAREHOUSE owner domain now has transaction-backed intake/withdrawal tests, replay/conflict rollback checks and a browser-tested same-stack route; live reservations, production, packaging, shipment, world-drop and Fusion paths are journaled, but global cross-domain conservation and restart/reconnect recovery are not proven. |
| 9 | Conveyors and automatic mining | PARTIAL | Machine output and conveyor cargo now auto-enter independent warehouse stock; browser regression verifies two belt hops, warehouse intake and explicit withdrawal. Parcel splitting, full belt catalog, warehouse-to-machine direct routing and automated deadlock recovery remain. |
| 10 | Power and batteries | PARTIAL | Allocation, storage settlement and stable component IDs exist; edge loss and full diagnostic behavior remain. |
| 11 | Six fluids, pressure and temperature | PARTIAL | Generic six-fluid solver exists; five non-water live source/consumer chains remain incomplete. |
| 12 | Machine states, failures and repair | PARTIAL | Core states and repair path exist; all-machine coverage remains. |
| 13 | 18 research / 20 skills | PARTIAL | 20 skill nodes exist but effects are incomplete; current research data count does not match the 18-stage target. |
| 14 | Seven-stage Fusion | PARTIAL | Live 260-second path and 1,500-input custody settlement are tested; full safety interlocks and restart recovery remain. |
| 15 | Exactly one Infinity output | PARTIAL | Settlement creates one canonical output stack and one player-inventory custody record with idempotent replay; save/reconnect replay and custody recovery remain. |
| 16 | Cloud save and recovery | PARTIAL | Owner-scoped CAS/RLS and local backup exist; two-device/process-restart recovery remains. |
| 17 | Server authority and security | PARTIAL | Save boundary has owner-scoped controls; all economy/reward mutations are not proven server-authoritative. |
| 18 | 60-minute wall-clock test | UNVERIFIED | Virtual 36,000 ticks are not 60 minutes of elapsed time. |
| 19 | Physical PC/mobile performance | UNVERIFIED | No physical PC, Android or iOS soak was run. |
| 20 | Full start-to-ending regression | PARTIAL | Subflows are covered; full campaign, three relays, core and planetary ending remain. |

### CI and release boundary

- Current CI run [43787044004](https://github.com/Rockey-Jason/doldol-site/actions/runs/43787044004) **SUCCESS** on code checkpoint `3a4c8c57cb7420508471e524cb0145e19c3291c6`: static/runtime validation passed; Node suite **141/141 passed, 0 failed, 0 cancelled, 0 skipped**; Playwright browser regression **PASS**.
- Browser smoke reported desktop `webgl` and mobile-emulation `webgl`; live Fusion tests verified 1,500 consumed input units, one canonical output custody record, idempotent replay and rollback on custody mismatch. Virtual soak passed **36,000 ticks** with ore balance 50,000 and coal balance 30,000.
- The 36,000-tick run is virtual simulation, not 60 minutes of elapsed wall-clock time. Mobile viewport emulation is not physical Android/iOS testing; physical PC/mobile validation remains **UNVERIFIED**.
- First attempt [43786962282](https://github.com/Rockey-Jason/doldol-site/actions/runs/43786962282) exposed a test-only assertion (`undefined` for an absent output key versus expected zero); the assertion was normalized and the full rerun above passed.
- Main HEAD: `ac459063e65675bcddadde25babe447346b34043`. PR #11 remains open/draft/unmerged, mergeable false; current comparison is **375 ahead / 822 behind** from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`.
- PR #8 remains separate Godot with no file overlap. PR #9 overlaps `factory.js` and `e2e/factory-smoke.mjs`; PR #10 overlaps `factory.js`. Their older overlapping implementations were reviewed but not wholesale merged/cherry-picked.
- No main merge, deployment, production DB mutation, real-user save mutation, or balance/reward mutation was performed.

**Overall: NOT COMPLETE / NOT RELEASE-READY.** No final acceptance item is promoted to COMPLETE by this checkpoint.


## 2026-11-14 — current-head battery regression status

- **Main:** `918311b833aed6c66f8e4ead899d08f973cfed57`.
- **PR #11 branch starting HEAD:** `4a3d364115543d50f370b44ac613db79d1ab0c0f`; PR remains open/draft and unmerged.
- **Divergence:** 368 ahead / 710 behind from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. Do not merge or rebase this broad divergent branch without a file-by-file reconciliation plan.
- **CI run 43348668440:** static validation passed; Playwright browser regression failed at the one-tick battery charge assertion (expected 40kJ from 400kW over 0.1 seconds). The new diagnostics and matching solver unit case are being added; battery live settlement is not yet marked fixed.
- **Automatic mining output and advanced mining E2E checks occur later in the smoke file and were not reached after the battery failure. Current-head mining acceptance is therefore **UNVERIFIED**, not failed or passed.
- Checklist #10 (power/batteries) remains **PARTIAL / REGRESSION** until the live settlement test passes. Checklist #6 and #9 remain PARTIAL; their current-head browser scenarios must run after the battery gate is fixed.
- All 12 roadmap stages remain PARTIAL or UNVERIFIED; no 20-item acceptance criterion is COMPLETE. The 2,048m×2,048m world, complete six-fluid live topology, global item ownership conservation, full contract catalog, complete Fusion recovery/interlocks, full skill effects, real-device validation and elapsed 60-minute soak remain open.
- PR #8 remains the separate Godot project and is excluded. PR #9/#10 remain unmerged overlapping branches; no wholesale cherry-pick was made.
- No main merge, deployment, production DB change or live-user save/economy mutation was performed.


## 2026-11-14 — retest outcome for battery and mining

- **Validated code checkpoint:** `c6971ed215d58b2c68ff75e3f262d6ded222c87b`.
- **CI:** [43543405015](https://github.com/Rockey-Jason/doldol-site/actions/runs/43543405015) **SUCCESS**; static validation succeeded, Node unit suite **136/136 passed**, and Playwright browser regression **passed**.
- The current Playwright run verifies the battery's cable-connected network, 400kW charging allocation, 40kJ calculation over 0.1 seconds, and live tick settlement. The prior battery failure on checkpoint `4a3d364115543d50f370b44ac613db79d1ab0c0f` did not reproduce; no speculative production-power rewrite was made.
- The same successful full smoke run passed both the basic automatic iron-miner output and advanced canonical raw-crystal miner output checks. This supersedes the earlier unverified current-head mine regression status.
- Checklist #6 (underground mining) and #9 (conveyors/automatic mining) remain **PARTIAL**, not COMPLETE: the tested miner scenarios pass, but the full mining catalog, recovery, logistics routing and all-layer gameplay remain open.
- Checklist #10 (power/batteries) remains **PARTIAL**: the 400kW / 40kJ one-tick charge integration passes; transmission loss, topology merge/split persistence and diagnostics remain.
- Virtual soak reached **36,000 simulated ticks** and passed; checklist #18 remains **UNVERIFIED** because this was not 60 minutes of elapsed wall-clock time. Checklist #2 and #19 remain **UNVERIFIED** for physical Android/iOS/PC hardware.
- Main remains `918311b833aed6c66f8e4ead899d08f973cfed57`; PR #11 remains open/draft. The branch is 369 ahead / 710 behind main from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. PR #8 remains separate Godot; PR #9/#10 were not wholesale merged.
- Overall status remains **NOT COMPLETE / NOT RELEASE-READY**. No checklist item is promoted to COMPLETE by this retest.

No main merge, deployment, production database change, or live-user save/economy mutation was performed.


## 2026-11-15 — contract packaging custody integration

- **Stage 5:** remains **PARTIAL / CRITICAL**. Package-material reservations now commit through the same custody-aware transaction boundary as live inventory consumption. The consumed journal survives ownership snapshot rebuilds. Independent warehouse stock, demolition, Fusion output custody, restart/reconnect and global conservation are still open.
- **Stage 11:** remains **PARTIAL**. The five packaging stages are connected to custody transactions and have browser coverage for exact quantities and transaction counts. The full contract catalog, route-derived risk/insurance and server-authoritative rewards are still incomplete.
- **Checklist #8:** remains **PARTIAL / CRITICAL**; no claim of global no-duplication/no-loss acceptance is made. All 20 acceptance items remain PARTIAL or UNVERIFIED; none is promoted to COMPLETE.
- **Code checkpoint:** `3f77fb0cf36836004f1137c3e24164a3c6ec6528`.
- **CI:** [43662545937](https://github.com/Rockey-Jason/doldol-site/actions/runs/43662545937) **SUCCESS**. Static/runtime validation succeeded; Node suite **139/139**; Playwright browser regression **PASS**.
- The Playwright smoke passed desktop and mobile-emulation WebGL, the 18-unit / 7-transaction first package, the 36-unit / 14-transaction two-package journal, and the virtual 36,000-tick conservation soak. This does not count as physical Android/iOS/PC testing or a 60-minute wall-clock soak.
- The earlier run [43662223596](https://github.com/Rockey-Jason/doldol-site/actions/runs/43662223596) failed at the battery test because the live animation loop advanced the unpaused fixture before the explicit one-tick assertion. The fixture is now paused during setup and explicitly runs one tick; the corrected current-head full browser run passed.
- **Main:** `4fa34b0fa1eb3afee4d858488af344a91e632e2b`. **PR #11:** open/draft/unmerged, mergeable false; 372 ahead / 793 behind main from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`.
- PR #8 remains separate Godot with no file overlap. PR #9 and #10 each overlap five files with PR #11; no wholesale merge/cherry-pick was performed.
- No main merge, deployment, production DB change or live-user save/economy mutation was performed.
## 2026-11-16 — live Infinity Fusion custody settlement

- **Stage 5:** remains **PARTIAL / CRITICAL**. Live Infinity Fusion now consumes all 1,500 reserved input units through `completeProductionCustody` and records exactly one output stack under `PLAYER_INVENTORY` custody. The parent settlement transaction and 15 input-consumption entries survive custody snapshot rebuilds. Independent warehouse stock, demolition/salvage, all other owner-domain transfers, restart/reconnect recovery and global conservation remain open.
- **Stage 10:** remains **PARTIAL**. The seven-stage / 260-second live path now has atomic input/output custody settlement. Full temperature/pressure/cooling/sensor/failure interlock acceptance, persisted restart/reconnect recovery and full campaign completion remain open.
- **Checklist #8, #14 and #15:** remain **PARTIAL**; the new tests do not prove global item conservation, all safety interlocks or save/reconnect recovery. No acceptance item is promoted to COMPLETE.
- **Code checkpoint:** `3a4c8c57cb7420508471e524cb0145e19c3291c6`.
- **CI:** [43787044004](https://github.com/Rockey-Jason/doldol-site/actions/runs/43787044004) **SUCCESS**; Node **141/141**, Playwright **PASS**; desktop and mobile-emulation WebGL; virtual soak **36,000 ticks**, ore 50,000 / coal 30,000.
- **Main:** `ac459063e65675bcddadde25babe447346b34043`. **PR #11:** open/draft/unmerged, mergeable false; **375 ahead / 822 behind** from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. PR #8 remains separate Godot; overlapping PR #9/#10 changes were reviewed and not cherry-picked.
- Physical PC/Android/iOS tests, two-device cloud recovery and 60-minute elapsed wall-clock soak remain **UNVERIFIED**. No main merge, deployment, production DB change or live-user save/economy mutation was performed.


## 2026-11-17 — independent warehouse custody integration

- **Code checkpoint:** `44ddf1009a5f0ee1422392c004f49db06ec3e7af`.
- **Stage 5 / checklist #8:** storage and warehouse buildings now own a persisted per-building `warehouseStock` projection. The canonical ownership snapshot rebuilds each stock stack under `WAREHOUSE` with the building UID as owner. Conveyor cargo and machine output use a single transaction to enter the warehouse; explicit per-stack withdrawal returns the original Stack ID and quality/purity/synthetic metadata to `PLAYER_INVENTORY`.
- **Asset safety:** a storage/warehouse building with positive stock cannot be demolished. Its inspector lists stored stacks and provides a withdrawal button. Failed/replayed/conflicting custody operations leave the stock projection and ownership ledger unchanged.
- **Conservation regression:** the virtual soak ledger now counts warehouse stock instead of assuming delivered output is still in player inventory. The 36,000-tick run produced one plate in warehouse stock and conserved 50,000 iron-ore-equivalent and 30,000 coal-equivalent.
- **CI:** [43998126414](https://github.com/Rockey-Jason/doldol-site/actions/runs/43998126414) **SUCCESS**. Static/runtime validation passed; Node **145/145 passed, 0 failed, 0 cancelled, 0 skipped**; Playwright browser regression **PASS** with desktop WebGL and mobile-emulation WebGL. The browser test exercised machine output → two conveyor segments → WAREHOUSE → player inventory, preserved the same Stack ID, verified the demolition guard and explicit withdrawal UI, then passed the virtual 36,000-tick conservation soak.
- **Earlier failures fixed before this successful run:** [43997263414](https://github.com/Rockey-Jason/doldol-site/actions/runs/43997263414) found a double-commit of the warehouse intake transaction; [43997494385](https://github.com/Rockey-Jason/doldol-site/actions/runs/43997494385) exposed a test counter sampled after successful withdrawal; [43997698514](https://github.com/Rockey-Jason/doldol-site/actions/runs/43997698514) showed the soak still counted player inventory rather than warehouse stock. The implementation and tests were corrected and the complete rerun passed.
- **Remaining Stage 5 work:** integrate every remaining owner-domain transfer with rollback/idempotency, warehouse-to-machine direct sourcing, world-drop and shipment recovery, demolition/salvage of every buffer, save/reconnect recovery and global cross-domain conservation. Stage 5 and checklist #8 remain **PARTIAL / CRITICAL**; no acceptance item is COMPLETE.
- **Main / PR boundary:** main HEAD `dea761fcf51643e4550dc6a1948cee01b79e1ac2`; PR #11 remains open/draft/unmerged and mergeable false. The branch is **380 ahead / 887 behind** main from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. PR #8 has no file overlap; PR #9 and #10 each overlap five PR #11 files and were not wholesale merged.
- PC and mobile browser emulation passed, but physical Android/iOS/PC testing, two-device save recovery and a 60-minute elapsed wall-clock soak remain **UNVERIFIED**. No main merge, deployment, production DB change, real-user save change or balance/reward mutation was performed.

**Overall: NOT COMPLETE / NOT RELEASE-READY.** All 12 roadmap stages remain PARTIAL or UNVERIFIED; no 20-item acceptance criterion is promoted to COMPLETE.


## 2026-11-17 — desktop keyboard usability overlay

| Area | Status | Evidence / remaining verification |
|---|---|---|
| PC keyboard-first movement and interaction | PARTIAL | WASD/arrow movement, E interaction/mining, Space jump, Q/R survival actions and 4/5 tool selection are wired in the live key handler. Playwright assertions were added; current run has not been observed to completion. |
| PC keyboard navigation and view controls | PARTIAL | B/O/I/T/J panels, V/M view, X rotation, +/- zoom, C recenter, F fullscreen, P pause, [/] speed, H help and Escape cancel/close are wired. |
| Desktop keyboard help and mobile compatibility | PARTIAL | In-world key legend and keycap styles added; mobile touch HUD remains intact. Physical PC and Android/iOS testing are still UNVERIFIED. |

**Verification boundary:** code checkpoint `20c7f4619c9b40f33cb66d3a0ba2e8ec3cf826f6`; CI lookup returned no workflow runs and no combined status checks. The new Playwright assertions are committed but remain **PENDING / UNVERIFIED**. Do not mark PC acceptance checklist #1 COMPLETE based on shortcut implementation alone.


## 2026-11-17 — mine realism / coal / performance pass

| Area | Status | Evidence / remaining verification |
|---|---|---|
| Five-level mine layout and legacy access | PARTIAL | Added connected secondary haulage drift, cross-cuts and larger chambers; preserves legacy tunnel coordinates. Deterministic source replay found 504 walkable cells, all orthogonally reachable from entrance (3,12). Formal Node BFS test is committed but not run yet. |
| Coal distribution and reserve | PARTIAL | Added coal-seam-v3 additive deposits: deterministic source replay predicts 104 reachable coal deposits / 20,177 units total; each level has 20–22 deposits / 3,937–4,190 units. Existing save keys and depleted amounts are preserved by additive keys and saved-state precedence. Formal generation tests are committed but not run yet. |
| Mine visual realism | PARTIAL | Rough/matte coal, additional diagonal timber braces, existing rock texture/rubble/ceiling detail, rail and work lights. More geological variety, cave water/ventilation, equipment props and actual visual review remain. |
| Mine rendering performance | PARTIAL | Underground scene is no longer rebuilt during surface-only scene refreshes; ore instance buffer/bounds work is batched once per material type. Mine geometry remains instanced and lights capped. Need CI draw-call/frame-time evidence and physical device profiling. |
| Mine regression / save compatibility | PARTIAL | Added tests for connected tunnels, per-level coal minima, reachability, brace/rock metrics, draw-call/light caps and lazy mine construction. Existing save migration is additive; explicit old-save fixture testing still required. |

**Verification boundary:** code checkpoint `c74f47049a504054f67d6e1880c5aaecc78e08a4`; docs checkpoint `06b1cbb8467cc1e8e0f00f943a756391d909d1f7`. Current GitHub workflow lookup returned no run and no combined status checks. Node/Playwright and physical device performance are **PENDING / UNVERIFIED**. The deterministic figures are a replay of the generation algorithm, not a completed CI test. Do not mark mining or performance acceptance as COMPLETE.

**Next priority loop:** (1) execute mine-system and Playwright regressions; (2) fix the first real failure; (3) inspect captured underground screenshots and verify scale/materials/lighting; (4) profile draw calls, frame time and memory on desktop and mobile; (5) add save fixtures for depleted legacy seams; (6) only then add next mine systems such as ventilation, water management, support wear/collapse, mine carts and underground navigation if they fit the current resource/ownership model.


### CI coverage follow-up

- The mine-specific test file is now included in the validation workflow's syntax check, Node test execution, and required-file assertions. The workflow wiring is committed; execution is still **PENDING / UNVERIFIED** because the current PR head has no returned workflow run or combined status.


## 2026-11-17 — integrated mine systems checkpoint

| Priority | Area | Status | Implemented | Still required |
|---:|---|---|---|---|
| 1 | Stratigraphy and ore-specific deposits | PARTIAL | Six deterministic host-rock profiles; depth/location-based strata tinting; unique coal, quartz, diamond, copper, iron and gold geometry/material response. | More complex geological layering, vein meshes and screenshot review on real devices. |
| 2 | Groundwater, drainage and humidity | PARTIAL | Per-level groundwater ingress, water-pool visuals, pump toggle, humidity model and in-place legacy-save normalization. Remote active mine levels continue ticking. | Pump/pipe placement and connected water networks; more detailed water-routing. |
| 3 | Ventilation, lighting and safety | PARTIAL | Ducts, rotating fans, bounded work lights, gas/air model, warning levels, evacuation gate and emergency return control. | Additional environmental sensors and per-gallery ventilation zoning. |
| 4 | Drills, mine carts and hauling | PARTIAL | Animated underground drill rigs; safety-aware automatic miners; interactive player-mounted rail cart and speed boost. | Multi-station track routing, automatic ore-cart freight and station scheduling. |
| 5 | Support integrity and cave-in risk | PARTIAL | Per-level support wear, amber/red support state, reinforcement using owned materials, manual/automatic mining interlocks and safe evacuation. | Localized support condition per tunnel section and safe passage-closure event behavior. No injury/cave-in animation is implemented. |
| 6 | Layer map and navigation | PARTIAL | Current-level map shows tunnels, deposits and engineer location; HUD exposes depth, coordinates and environmental data; keyboard and touch controls. | Route guidance to target veins/lifts and richer map annotations. |
| 7 | Desktop/mobile performance evidence | PARTIAL | Instanced/batched mine visuals; lazy mine build; grouped GPU updates; renderer FPS/frame-time/draw-call/triangle/resource/optional-heap diagnostics; Playwright budget assertions for desktop and mobile emulation. | Actual CI output, physical device profiling, long-duration memory/frame-time soak and measured hardware targets. |

**Code checkpoint:** `41b073af547afbd86bbb36e63ed371d084f1930e`. **Documentation checkpoint:** implementation log `836b9184c3330e52b6bf27736abb13d63deeda2f`.

**Verification status:** GitHub Actions run lookup and combined status for the latest code checkpoint returned no runs/checks. Committed unit/browser assertions remain **PENDING / UNVERIFIED**. Source-level deterministic coal/tunnel calculations are not a substitute for running Node or Playwright. Physical PC/Android/iOS and 60-minute wall-clock soak remain **UNVERIFIED**. No checklist row is promoted to COMPLETE.


### Mine unit verification follow-up

- **Code checkpoint:** `dfad15f538e929fd71b13191b65f975080e708b5`; the full-render path now refreshes the mine operations HUD.
- **Node unit tests:** current PR source blob hashes were matched to the local test copies before execution. `node --test mine-system.test.mjs mine-runtime.test.mjs` → **12 passed / 0 failed / 0 cancelled / 0 skipped**.
- **Browser suite / GitHub Actions:** still **PENDING / UNVERIFIED**. No current workflow run or combined status was returned. Physical PC/Android/iOS performance and a 60-minute wall-clock soak are also **UNVERIFIED**. No acceptance row is promoted to COMPLETE.


### Mine map and rendering audit follow-up

- The current-level map now marks the return lift (E) and descent lift (D), highlights the player position, and wraps its legend on mobile widths. The reported mine-light count now includes lift and underground-generator point lights.
- Current mine helper/unit source tests: **12 passed / 0 failed / 0 skipped / 0 cancelled** (local Node 22 execution against the exact current Git blob copies). This does not verify full browser rendering.
- **Current code checkpoint:** `b1e0a1c72b040c3796856ad73b48f4f72a640209`. Full Playwright browser regression, CI status, physical hardware FPS/heap and 60-minute soak remain **PENDING / UNVERIFIED**.


## 2026-11-18 — connected mine systems and remaining acceptance evidence

| Area | Implemented in branch | Acceptance still outstanding |
|---|---|---|
| Geological strata and ore veins | Six deterministic host-rock profiles; mineral-specific multi-segment veins; coal rendered as stratified seams; batched geometry. | Run renderer tests and inspect captured screenshots for scale/material fidelity on actual displays. |
| Groundwater and drainage | Four-way connected pump/pipe/tank networks; powered pump state; real water transfer and tank capacity; old fake-drain tick removed. | Execute drainage integration tests and observe tank/water behavior in browser; optional tank emptying/industrial reuse is not included in this pass. |
| Passage support and safety | 11 persisted support sections per level across both drifts; wear, warnings, closures, local mining/autominer interlocks, repair/reopen. | Execute support regression and inspect barrier/route visuals in Playwright and real devices. |
| Mine drills and rail haulage | Added station structures, track-only automatic multi-station route, cargo reservation and canonical inventory settlement, cancellation/save reconciliation and rerouting. | Execute route/ownership tests and validate long-duration route stability with browser logs. |
| Local events and cave-in risk | Per-section warning/closure events; actual passage barrier rather than injury animation; mining and movement respect closure. | Verify event timing and safe detours in live browser play; localized support coverage is at defined timber-frame sections. |
| Mineral route guidance | Click a deposit to calculate a safe approach route; route avoids occupied facilities and closures; map includes supports, lifts, ore and player. | Execute navigation regression and check usability on mobile touch screens. |
| Performance | Instanced geometry, grouped updates, renderer metrics, desktop/mobile-emulation budgets, 10-second elapsed samples, one-hour virtual mine simulation, opt-in real 60-minute test. | Actual Playwright run, hardware-specific FPS/heap captures, physical Android/iOS/PC sessions and wall-clock 60-minute test. |

**Code checkpoint before docs:** `a8a5067c3175d98fad22218394cffce8902363f2`. **Current PR #11 state at inspection:** open, draft, unmerged; branch compared with main as diverged (535 commits ahead, 892 behind). Re-check latest PR head before any future action.

**Test state:** unit and E2E tests are committed and wired into the validation workflow, but latest run/status queries returned no records. Treat all automated assertions as **PENDING / UNVERIFIED**, not passed. Physical hardware and real-time soak likewise remain **UNVERIFIED**. No acceptance row is marked COMPLETE.


### Final status snapshot — 2026-11-18

- **Feature implementation:** all seven requested mine areas have code paths and regression assertions in the PR branch; this is an implementation checkpoint, not a verified release.
- **Test execution:** latest GitHub Actions lookup returned no workflow runs or combined statuses. Node/Playwright assertions are **PENDING / UNVERIFIED**.
- **Hardware acceptance:** real PC/mobile FPS and memory sampling plus the elapsed 60-minute soak are **UNVERIFIED**.
- **Repository safety:** PR #11 remains draft/open/unmerged. Branch/main comparison is diverged (540 ahead / 892 behind). No deployment or main merge.


### 2026-11-18 — final mine feature and measurement coverage update

| Priority | Requested improvement | Implementation checkpoint | Verification / remaining boundary |
|---:|---|---|---|
| 1 | More complex strata and veins | Deterministic rock profiles by level and coordinate, mineral-specific material/geometry, five-segment vein decorations and batched rendering. | Node/E2E assertions committed; execution result not returned by GitHub Actions. Visual review on physical devices pending. |
| 2 | Connected drainage / pump network | Adjacent pump-pipe-tank components, real stored-litre transfer, powered-pump interlock at 0.8 allocation ratio, tank capacity and network status. | Unit/E2E coverage includes disconnected network, exact transfer, and low-/sufficient-power cases. CI result pending. |
| 3 | Passage-specific support durability | Per-section support integrity, local five-cell hazard influence, warning/closure events, local repair and safe passage reopening. | Direct movement, A* routing, manual mining and automatic rail routes use the local safety check. Unit/E2E assertions committed; CI result pending. |
| 4 | Multi-station automatic mine carts | Rail path between multiple stations on rendered tracks, secondary drift detours, source-output reservation, delivery via canonical inventory settlement and cancellation recovery. | Cargo ownership, route detours, support closure avoidance and no-duplication tests committed; CI result pending. |
| 5 | Location-specific risk / passage closure | Per-level environment plus local support hazards; non-graphic barrier event; automatic/manual extraction lockout; emergency surface return. | Browser regression includes blocked WASD entry and safe escape from the hazard zone. CI result pending. |
| 6 | Mineral route guidance | Clickable layer map, nearest safe walkable target, displayed route, route-follow action, separate visual hazard map and lift markers. | E2E checks selected deposit, route length and movement path; CI result pending. |
| 7 | Real device / long-duration performance | In-game metrics panel reports FPS, frame time, draw calls, triangles, geometry/texture counts and JS heap where supported. Browser suite now records 60-second desktop and mobile-emulation samples, plus the one-hour virtual simulation. | **Physical PC/Android/iOS** and an actual **60-minute elapsed** soak have not been performed. Emulated 60-second tests and resource/heap assertions are committed but not executed/observed yet. |

**Code checkpoint:** `6b441d2cc08ef843eb8632c2587095d3f43b1f62`. **Documentation checkpoint:** implementation log `798a90d5a1a5931ca6422c393a33e7d00f02a1ef`.

**Acceptance state:** feature code and test coverage are in the PR branch, but no area is marked COMPLETE until GitHub Actions returns successful Node and Playwright results and device-specific performance is reviewed. Current workflow-run and combined-status queries returned no entries; treat all automated assertions as **PENDING / UNVERIFIED**. PR #11 remains draft/open/unmerged. No main merge or deployment.



## 2026-11-18 — updated 12-stage and 20-item evidence after mine regression repairs

**Code checkpoint:** fb00c3a661c93c256265869a3c7834623d239885 on PR #11. The rail detour now has a west cross-cut, and empty support snapshots backfill their 55 persisted local sections. The live facility catalog is 52 unique IDs, including all four mine infrastructure facilities.

### 12-stage master roadmap

| Stage | Status | Current evidence / remaining acceptance gate |
|---:|---|---|
| 1. Audit, data, dependencies and save foundation | PARTIAL | Existing save migrations and runtime audits exist; all owner domains and two-device recovery are not authoritative end-to-end. |
| 2. World and terrain | PARTIAL | Current world is still 192×160 tiles, not 2,048m×2,048m; unit migration, streaming and unload behavior remain. Natural Doronium veins remain prohibited. |
| 3. Player, exploration, survival and mining | PARTIAL | 3D first-/third-person, touch controls, survival and mine tools exist; complete campaign/death/recovery and physical-device regression remain. |
| 4. Flattening and construction | PARTIAL | Footprint checks, foundations, escrow and rollback helpers exist; all ports, blueprints, dismantle and crash recovery are incomplete. |
| 5. Items and logistics | PARTIAL / CRITICAL | Several inventory, active-job, machine-output and conveyor transitions are journaled; not every owner domain is driven by one authoritative transaction boundary. |
| 6. Power | PARTIAL | Network allocation and batteries exist; stable network IDs, calibrated transmission loss, complete device integration and diagnostics remain. |
| 7. Fluids | PARTIAL | Connected water drainage and generic six-fluid helpers exist; OIL, PETROLEUM, MOLTEN_METAL, LAVA and CHEMICAL are not fully live through extraction, recipes and conservation. |
| 8. Machine states, failure and maintenance | PARTIAL | Shared states and several live failure profiles/repair paths exist; every machine/profile and failure recovery is not covered. |
| 9. Production, research and skills | PARTIAL | Production and 20 skill nodes exist; all skill effects are not live, and the current research catalog has 19 entries versus the master target of 18. |
| 10. Canonical Doronium and Infinity | PARTIAL / CRITICAL | Fifteen canonical IDs/models and seven-stage fusion logic exist; manifest is not the sole recipe/model source and full save/restart/interlock recovery remains. |
| 11. Shipping, contracts and economy | PARTIAL | Sample contracts, packaging and shipment custody exist; full contract catalog, route-derived risk and server-authoritative settlement remain. |
| 12. Save, security, performance and release | PARTIAL / UNVERIFIED | Local/cloud save and owner-scoped CAS/RLS exist; two-device conflict, physical devices, memory soak, 60-minute wall-clock test and release regression remain. |

### 20 acceptance checklist

| # | Acceptance item | Status | Evidence / blocker |
|---:|---|---|---|
| 1 | PC full playthrough | PARTIAL | Desktop WebGL smoke coverage exists; complete campaign to ending is not verified. |
| 2 | Mobile full playthrough | UNVERIFIED | Mobile viewport/touch emulation exists; no physical Android/iOS playthrough. |
| 3 | First-/third-person switching | PARTIAL | View modes exist; full campaign/input regression remains. |
| 4 | 2,048m×2,048m world | NOT IMPLEMENTED | Current world remains 192×160 tiles. |
| 5 | Flattening and foundations | PARTIAL | Core placement rules exist; all footprints, ports, rollback and dismantle cases remain. |
| 6 | Underground mining | PARTIAL | Mine geology, local supports, drainage and automated miners exist; current browser rerun has not yet reached the mining output assertion. |
| 7 | Fifteen canonical inputs | PARTIAL | Fifteen IDs/models validate, but not all live recipes/research/UI/buildings use one canonical manifest. |
| 8 | No item duplication or loss | PARTIAL / CRITICAL | Several transfers are journaled; conveyors-to-machines, drops, independent warehouse, shipments, demolition, Fusion and recovery are not globally authoritative. |
| 9 | Conveyors and automatic mining | PARTIAL | Automatic mining and mine rail detouring are implemented; complete logistics asset catalog, deadlock recovery and all custody transitions remain. |
| 10 | Power and batteries | PARTIAL | kW/kJ allocation and battery runtime exist; transmission loss and full network diagnostics remain. |
| 11 | Six fluids, pressure and temperature | PARTIAL | Water drainage is live; five other fluid paths and full conservation remain. |
| 12 | Machine states, failure and maintenance | PARTIAL | Shared states and several profiles exist; all machines and failure paths are not verified. |
| 13 | Research 18 / skills 20 | PARTIAL | Twenty skill nodes exist; only some effects are live and research count remains 19 versus target 18. |
| 14 | Seven-stage Fusion | PARTIAL | Seven-stage runtime exists; complete interlocks and restart recovery remain. |
| 15 | Exactly one Infinity output | PARTIAL | Exactly-one settlement paths are tested in earlier checkpoints; current authoritative custody/reload recovery is incomplete. |
| 16 | Cloud save and recovery | PARTIAL | Owner-scoped CAS and local recovery exist; two-device conflicts and process-restart gameplay recovery remain. |
| 17 | Server authority and security | PARTIAL | RLS/CAS protections exist; gameplay reward/economy authority and full abuse review remain. |
| 18 | 60-minute wall-clock test | UNVERIFIED | No real elapsed 60-minute soak has been run. |
| 19 | Physical PC/mobile performance | UNVERIFIED | In-game diagnostics and browser emulation exist; physical device measurements have not been collected. |
| 20 | Start-to-ending full regression | PARTIAL / UNVERIFIED | Browser smoke covers many systems but is not a complete campaign-to-ending acceptance run. |

**CI checkpoint:** static validation on run [44216745235](https://github.com/Rockey-Jason/doldol-site/actions/runs/44216745235) is SUCCESS (7 + 145 + 26 tests = 178 passed). Browser regression was still IN_PROGRESS at the time of this matrix update; it must not be counted as a pass. All 12 stages remain PARTIAL or UNVERIFIED; no checklist item is promoted to COMPLETE.

### Branch integration review

- main is 00dc4c9d1f3b908a4f9ef7eb17c8da996ac0f79f; its latest commit changes only doronium-factory/factory.js to improve the lab popup and research countdown. PR #11 has a structurally different, much larger factory.js and does not contain the same openBuildingManagement implementation, so the main patch was not blindly cherry-picked; an adapted research-UI port remains for a later isolated regression pass.
- PR #11 is open/draft/unmerged, 571 commits ahead and 892 behind main from merge base 26e88058b6d416d79459fee107aff4a5beb3d7e3; mergeable is false. Do not rebase/merge wholesale.
- PR #9 and #10 each overlap PR #11 in five files (factory.js, simulation-core.js, simulation-core.test.mjs, plus workflow/E2E for #9 and index.html/world3d.js for #10). They are divergent and remain unmerged; no wholesale cherry-pick.
- PR #8 is a separate Godot branch with no changed-file overlap; it is not merged into the selected Three.js/WebGL architecture.
- No main merge, deployment, production DB/schema/RLS/function mutation or live-user save/economy change was performed.


## 2026-11-19 latest verification checkpoint

- **Starting branch SHA:** c727f6aff1cc636dcd6fbe85f027bce19f432a76. PR #11 remains open/draft/unmerged and diverged from latest main; the merge base is stale. No wholesale PR #9/#10 integration and no Godot PR #8 integration were performed.
- **Previous CI:** [run 44217180680](https://github.com/Rockey-Jason/doldol-site/actions/runs/44217180680) static validation passed (7/7 validation groups; 145/145 core tests; 26/26 mine tests; 178 total), but browser-regression failed at the direct-movement assertion because the E2E-only hook exposed a coordinate object as `blocked` instead of a boolean.
- **Correction made:** the hook now returns an explicit boolean plus `blockedPosition`; Playwright additionally verifies that the blocked move preserves the exact player position and that an escape move increases distance from the weakened support. This is a test-contract correction, not a claim that the full mine system is complete.
- **New CI:** pending for the corrected commit. Keep direct-movement safety PARTIAL until browser-regression succeeds; a cancelled, pending, or unrun job is not a pass.
- **Master status:** all 12 stages remain PARTIAL or UNVERIFIED. Checklist items 2, 18 and 19 remain UNVERIFIED for physical/mobile/full elapsed testing; item 4 remains NOT IMPLEMENTED at the 2,048m×2,048m target. Item 8 remains PARTIAL/CRITICAL because not every owner domain is authoritative. Other feature items remain PARTIAL until complete end-to-end and save/reload evidence exists.
- **Next highest-risk code task:** connect ownership transactions to live reservations, consumption, completion buffers, conveyor/storage, world drops, shipping, Fusion, demolition and recovery with rollback/idempotency and end-to-end conservation tests. Do not label ownership COMPLETE from helper-only tests.
- **Safety boundary:** Three.js/WebGL retained; no natural Doronium veins; no main merge, deployment, production data mutation, or account/economy mutation.


## 2026-11-19 browser regression follow-up

- Commit `32e70d5775e0c176999932a1fa70161d2ec882c9` passed static validation in [CI run 44439331344](https://github.com/Rockey-Jason/doldol-site/actions/runs/44439331344); browser-regression failed at the aggregate virtual mine-hour invariant (`factory-smoke.mjs:437`).
- The direct-movement safety contract test passed because execution advanced beyond its assertion at line 419. The browser run did not reach automatic mining (line 642), so automatic drill output remains UNVERIFIED.
- A diagnostic-only fixture update now exposes five independent virtual-soak checks and includes the full snapshot in the Playwright assertion message. The next CI run must identify and then fix the failing runtime/fixture invariant; no soak pass is claimed.
- All 12 roadmap stages remain PARTIAL or UNVERIFIED; physical PC/mobile, real 60-minute soak, and full campaign ending remain UNVERIFIED.

## 2026-11-19 combined mine-network regression correction

- The virtual mine soak failure was traced to a test fixture placing a solid water tank at `(8,12)`, an orthogonal clearance cell required by the diagonal rail centerline transition `(8,13)→(9,12)`. The rail path's collision rejection was correct.
- The fixture now moves the tank to `(9,11)` and extends the low-profile pipe chain through `(8,12)` and `(9,12)`. A new unit test checks both continuous pump/pipe/tank connectivity and a valid two-station rail route in the same mine.
- New CI pending. The previous browser run verified the direct-movement safety assertion but did not pass the virtual soak; automatic miner output and later browser scenarios remain unverified until the new run reaches them.

## 2026-11-19 floating-point assertion follow-up

- Run [44440274166](https://github.com/Rockey-Jason/doldol-site/actions/runs/44440274166) reached the new combined drainage/rail test and passed network connection, route start, and water-transfer existence. It failed only because exact `=== 2.4` compared against `2.4000000000000004`.
- Unit assertion now uses a 1e-9 tolerance; no production quantity rounding or conservation behavior was changed. New CI pending; browser virtual soak has not yet been rerun on the corrected assertion.

## 2026-11-19 support helper regression

- Run [44440379242](https://github.com/Rockey-Jason/doldol-site/actions/runs/44440379242): static validation SUCCESS (145 core + 27 mine tests). The virtual mine soak passed all five checks with 3,600 simulated seconds, 8,000L drainage, one loaded rail cargo and exactly two ore delivered.
- Browser regression next failed because `configureMineSupportForTest` referenced `mineSupportKey` without importing the helper exported by `mine-systems-runtime.js`. The import is added and factory cache version is advanced to v70.
- Automatic miner output has not yet been reached. New browser CI pending; do not mark the mining checklist complete.

## 2026-11-19 mine map guidance regression

- Run [44440742347](https://github.com/Rockey-Jason/doldol-site/actions/runs/44440742347): static checks all SUCCESS (7/7 validation groups, 145 core tests, 27 mine tests). Combined drainage/rail virtual-hour soak passed with exact two-ore delivery and 8,000L storage.
- Browser test then found that `updateMineHud()` overwrote the map selection status, leaving `석재 · 4` instead of an explicit mineral/remaining-count/route-length label. It now preserves `광물명 · 잔량개 · 거리칸 경로` and Playwright checks that full format. Factory cache version v71.
- New CI pending; automatic miner output and subsequent browser checks remain unverified.

## 2026-11-19 manual mine aim regression

- Run [44441201729](https://github.com/Rockey-Jason/doldol-site/actions/runs/44441201729): static checks passed 7/7, core 145/145, mine 27/27. Browser passed the virtual-hour mine soak and map guidance, then manual mining failed because the test fixture pitch was positive (looking up) while the ore was below the eye line.
- Test setup now uses downward pitch `-0.35` and asserts the exact raycast target before clicking Use. Factory cache version v72. New browser CI pending; automatic mining remains unverified.

## 2026-11-20 latest verification checkpoint

- **Development HEAD:** `75b0378146b977456bac8394e498940b43fd3c3e`; PR #11 remains draft/open and unmerged.
- **CI:** [run 44653672826](https://github.com/Rockey-Jason/doldol-site/actions/runs/44653672826) completed SUCCESS. Static validation passed 7/7 validation groups and 183 Node test cases (7 + 149 + 27). Playwright browser-regression completed PASS.
- **Dismantle integrity fix:** active `activeInputQuantities`, legacy `activeMeta.consumedInputs`, active recipe snapshots, machine-owned reservations, existing ACTIVE_JOB ledger custody, and linked completion-buffer records now block dismantling even when progress is zero. The rail route is not stopped until all dismantle guards pass. Four ownership-runtime unit tests and browser fixtures for active, legacy, completion-buffer, reservation and idle-machine cases pass.
- **Mine regression:** 3,600 simulated seconds; connected pump/pipe/tank transferred 8,000L; one rail load delivered exactly two ore; all 11 support sections remained healthy; safety state stayed SAFE. Manual and basic/advanced automatic mining, drill repair, safety recovery, map guidance and renderer checks passed.
- **Renderer diagnostics:** the headless software-WebGL desktop sample measured 13 FPS / 80.0ms average frame time after 60 elapsed seconds; mobile emulation measured 17 FPS / 58.15ms after 60 elapsed seconds. Draw calls/triangles/resource counts stayed within the current test budgets, but these low software-renderer frame rates are a signal for further optimization, not proof of physical-device performance.
- **Time distinction:** the CI ran a 3,600-second virtual simulation and 60-second elapsed samples per viewport. `DORONIUM_MINE_60M` was not enabled; a real 60-minute wall-clock soak remains UNVERIFIED. Physical PC/Android/iOS tests also remain UNVERIFIED.
- **Remaining construction/ownership gate:** the new guard prevents active assets from being orphaned, but idle-building salvage/refund is not yet a journaled atomic transaction; global ownership is still a rebuilt snapshot, not a universal source of truth.
- **Repository boundary:** main remains untouched; no deployment, production DB/RLS/function change, user save/economy/reward mutation, or natural Doronium vein creation occurred.


## 2026-11-21 reservation integrity hardening — PARTIAL

- Item reservation commit now performs a full read-only preflight across all active reservations before mutating any stack. Invalid quantity types, negative/fractional quantities, allocation-total mismatch, duplicate stack allocation, aggregate overbooking, item/stack mismatch, quarantined stack references and duplicate request IDs are rejected without consuming stock.
- Spendability calculations fail closed when reservation records are malformed; affected stacks are treated as fully reserved until the record is repaired. Direct item removal now excludes quarantined legacy stacks.
- Exact dismantle transaction replay is stable after the building projection has been removed; the original transaction type is reused for payload comparison.
- **CI evidence:** [run 44853572940](https://github.com/Rockey-Jason/doldol-site/actions/runs/44853572940) has static validation 7/7, core tests 161/161 and mine tests 27/27 passing. Playwright browser regression was still in progress at this checkpoint; do not infer success from the static job.
- **Still open:** authoritative cross-domain ownership, world-drop/warehouse/shipment/fusion end-to-end conservation, six live fluid families, 2,048m world migration, full machine failure coverage, complete canonical recipe source, Fusion restart/interlock recovery, complete contracts, physical-device validation and real 60-minute soak.


## 2026-11-22 reservation compatibility and repeated-production follow-up

- Code checkpoint `334d90b56dd2eefff83cc9199447100a27e08865`; CI [44973680787](https://github.com/Rockey-Jason/doldol-site/actions/runs/44973680787) passed static validation (7/7 groups, 163 core tests, 27 mine tests) and Playwright browser regression.
- Fixed a compatibility defect where the strict reservation audit rejected oversized aggregate stacks created by older saves. Existing stack IDs and active reservation references are retained; only records marked/recognized as legacy aggregates may exceed the 5,000 new-stack cap. New stacks remain capped.
- The one-hour virtual soak now produces one plate and preserves exact conservation (ore balance 50,000; coal balance 30,000), but the smelter ends in `WAITING_INPUT` while substantial raw stock remains. This is not accepted as sustained production. The next E2E adds post-soak runtime validation, free-stock counts, active reservation inspection, a second-recipe reservation probe and a minimum of two outputs.
- The six mine improvements remain implemented and covered by prior browser/unit checks: mineral-specific multi-segment geology, connected pump/pipe/tank drainage, per-section support durability/closures, multi-station rail freight, localized safety barriers, and safe mineral-route guidance. The mine virtual soak confirms 8,000L stored, one rail cargo delivered as exactly two ore, 11/11 supports healthy, and SAFE environment.
- **Remaining release gates:** world target remains 192×160 tiles rather than 2,048m×2,048m; five non-water fluid families, universal ownership authority, full recipe/model manifest integration, complete Fusion interlocks/restart recovery, full contract catalog, 19-vs-18 research reconciliation, all 20 skill effects, physical PC/mobile profiling and an actual 60-minute elapsed soak remain open. All 12 stages and 20 acceptance items remain PARTIAL/UNVERIFIED; no item is promoted to COMPLETE.
- PR #11 remains draft/open/unmerged and diverged from main (current main SHA `d7ae78c59594595a6e1bb6c8f9dca91d4ff4a0f5`; compare: 595 ahead / 915 behind from stale merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`). PR #9/#10 remain separate divergent WebGL branches; PR #8 remains the separate Godot proposal. No wholesale integration or deployment was performed.
