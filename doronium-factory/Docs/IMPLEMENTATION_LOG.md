## 2026-11-08 follow-up — canonical Infinity output migration (in progress)

- Separated the finished Infinity product ID from the 15 canonical input IDs as `ITEM_DORONUM_INFINITY`; the fifteen input types and their total requirement remain exactly 15 × 100 = 1,500.
- Added the old `infinity` item key as an explicit, unambiguous migration alias. Existing inventory, metadata, produced/gathered/sold counters, machine output buffers, contract cargo, active fusion output fields, completion buffers and prior fusion settlement records are remapped without discarding saved quantities.
- The live fusion settlement default and in-game final output now write the canonical product ID. The codex retains its legacy display alias for 3D preview compatibility while displaying canonical inventory counts.
- Added save-migration and fusion-output regression assertions, and updated the ownership E2E assertion to expect the canonical output ID.
- Commits: `027ab950` (canonical alias and save migration), `da92fd74` (fusion settlement default), `d1c3fc04` (factory UI/live output), `c7e57a68` (migration test), `8e9521c9` (fusion tests), `6ac98336` (ownership E2E expectation), `025a3efc` and `d7daf2ee` (sales-ledger migration and test).
- Static validation was green on the earlier checkpoint; the latest browser regression and full validation for the current branch head must finish before this update can be treated as green.

This is an ID/data-integrity correction, not completion of the complete Infinity safety/interlock path or the remaining v4.5 master roadmap.
## 2026-11-08 — simulation integrity and browser regression corrections (in progress)

- Corrected two isolated E2E production fixtures. Powered machine tests now instantiate coal generators and pass the real `currentPower()` allocation object into machine ticks; they no longer pass a numeric placeholder that the runtime cannot interpret.
- Ported the missing deterministic runtime primitives from the separate integrity branch without replacing v4.5's newer qualified reservation, quarantine or canonical-data implementation:
  - named deterministic RNG streams persisted in save state;
  - bounded event queue with stable sequence IDs, idempotency keys, retryable failed events and bounded journal;
  - deterministic fixed-step budget capped at ten ticks per animation frame while retaining backlog.
- Quest rewards now enter the simulation event queue and are applied through an idempotent event handler, rather than directly mutating the economy from the quest-check function.
- Added unit tests for ordered/idempotent reward events, retry behavior, deterministic RNG streams, event counter validation and maximum ten-tick catch-up.
- Commits on `codex/doronium-v4.5-completion`: `09149a1d` (E2E power fixtures), `d73de1f` (runtime primitives), `14c504a` (unit tests), `a24a7fb` (quest/catch-up integration).
- Static validation passed on commit `a24a7fb` in run [42428272002](https://github.com/Rockey-Jason/doldol-site/actions/runs/42428272002). The browser-regression job was still running at the time this entry was written; do not treat it as passed until the run concludes.

The above closes only the event/step-budget gap. It does not finish the full 12-phase master roadmap: the 2048m world conversion, all-fluid live networks, all-machine failure coverage, global ownership-ledger adoption, canonical recipes/models and complete Infinity migration/interlocks, full contract catalog, real multi-device account conflict tests, physical mobile-device testing and 60-minute wall-clock soak remain open. The v4.5 branch remains a development candidate, not a completed release.


## 2026-11-04 — v4.5 completion implementation pass (work in progress)

This pass adds and wires the following additional behavior on branch `codex/doronium-v4.5-completion`:

- Cloud save writes now call the owner-scoped `save_doronium_factory_state` compare-and-swap RPC. A stale save is rejected and the local snapshot remains intact. The migration is tracked in `supabase/migrations/20261104080000_add_doronium_factory_revision_compare_and_swap.sql`; the connected project has RLS enabled on `dori_cloud_storage` and the RPC is SECURITY INVOKER with EXECUTE granted to authenticated, not anon.
- Construction placement now reserves money and ItemStacks before installation, validates multi-tile footprint/bounds/slope/foundation/occupancy, and rolls back on an installation callback failure. The factory construction panel now has saved blueprint, duplicate, rotate and atomic multi-building placement controls.
- The factory uses graph-based logistics for existing conveyor routes and building outputs. The separate runtime includes routing preview, splitter/sorter lane choice, backpressure and full-loop deadlock diagnosis.
- Three sample delivery contracts are connected to the inventory UI. Each contract reserves individually qualified stacks, consumes five packaging-stage material sets, dispatches a single shipment, tracks transit risk/insurance and allows one reward claim.
- Explicit power mode is connected to the live tick loop. Adjacent power-cable tiles form isolated networks; consumers are allocated by priority; transformers cap throughput; batteries charge/discharge in kW against kJ storage and settle once per simulation tick. Legacy saves retain the shared-grid behavior until the player places a cable. Underground and surface power nodes are kept in different layers.
- Underground miners are now buildable only in matching underground deposits. Mine generators burn coal for power, miners extract one matching ore per eight powered seconds, create periodic stone byproducts, track drill wear, and require repair material/time at end of drill life. Mine structures are rendered in the underground scene and do not appear in the surface building layer.
- Demolition now refuses buildings with buffered input/output, active progress or outstanding failure-repair state.

### Validation at this checkpoint

- The Node/static validation job passed at the current implementation checkpoint (run: [41742193482](https://github.com/Rockey-Jason/doldol-site/actions/runs/41742193482), `validate-web-game`).
- Playwright has additional scenarios for blueprint save/duplicate/rotate/place, disconnected power networks and battery charge settlement, underground mining yield and drill repair. The latest browser-regression run is still required before these scenarios can be considered passed.
- A helper module being unit-tested is not evidence that every related UI or live subsystem is complete. In particular, FluidNetwork and full ownership-ledger adoption are still not wired end-to-end; the canonical Doronum registry is not yet the live recipe/Infinity source; and the resumable fusion helper is not yet replacing the old in-game fusion entry points.
- Do not merge or publish as a completed v4.5 release until the latest browser regression and Pages build pass and the remaining Phase gates below are closed.


## 2026-11-04 follow-up — live transaction and power corrections (not release-ready)

- Fixed a logistics graph edge case where a production machine feeding the first conveyor was treated as a conveyor node during connected-component construction. Added a regression fixture with an east-facing machine output, two belts and a downstream sink. The test fixture was corrected to point east; the test has not yet been confirmed green on the latest CI run.
- Reworked the active in-game Infinity Fusion path to reserve all 15 current variant inputs as one qualified batch. Each selected stack is individually checked for Quality >= 90, Purity >= 90 and synthetic=false. Reservations remain locked while the job runs; the final commit consumes 1,500 units and issues one output. Missing Fusion hardware now leaves the job in a recoverable error state rather than discarding it. A player cancellation releases the reservation allocations and is idempotent. Existing in-progress legacy saves are resumed using their already-consumed-input state to avoid deleting saved progress.
- The live Fusion path still uses the old runtime variant IDs, not the canonical ITEM_DORONUM_* manifest. This is a known blocking gap; the new transaction safeguards do not make the canonical item/recipe migration complete.
- Converted the factory's internal power design units to kW at the live network boundary (100kW per design unit). Battery capacity remains kJ; the battery's 8/4 design-unit charge/discharge limits now resolve to 800/400kW. Transformer 30 resolves to 3,000kW. Fusion stage demands now match 500, 1,000, 1,500, 2,500, 3,500, 4,500 and 5,000kW, with a 5MW machine rating. A live per-network preflight checks the Fusion machine and cooling allocation before inputs are reserved.
- Added a browser regression for 15-stack reservation rollback/cancel, and updated the battery test to expect 40kJ from 400kW over a 0.1s tick. These new browser tests are not yet reported as passed.
- Demolition now blocks active Fusion, buffered fluid and conveyor cargo to prevent silent loss. The test harness duplicate fluid hooks were removed.
- Supabase production verification: public.dori_cloud_storage has RLS enabled, SELECT/INSERT/UPDATE policies restrict rows to auth.uid() = user_id, no client DELETE policy exists, save_revision is NOT NULL, and save_doronium_factory_state is SECURITY INVOKER with EXECUTE granted to authenticated (not anon). This verifies the cloud-save boundary only; it does not validate gameplay state authoritativeness or all other site RPCs.

### Latest verification state

- A prior static-validation job passed before the most recent follow-up edits. The latest static job and expanded Playwright browser job must run again against the newest branch commit.
- The browser regression has not yet been observed passing after the machine-output logistics fix, kW scaling and Fusion rollback test addition.
- Main branch/Pages deployment was not changed. Physical mobile-device testing, 60-minute soak, full canonical recipe/ID migration, all-fluid types, all-machine failure profiles, full ownership-ledger adoption and story/ending gates remain open.


## 2026-11-04 — cloud-save server validation and regression checkpoint

- Applied Supabase migration 20261104051630, also tracked in supabase/migrations/20261104051630_fix_doronium_factory_cloud_save_validation_and_updated_at.sql.
- The owner-scoped SECURITY INVOKER RPC now checks the storage key, expected revision, JSON object envelope, Doronium Factory game tag when present, schemaVersion 1–4, FNV checksum string format when present, state/player/inventory/buildings/runtime JSON types, and the existing 5MB payload limit. The UPDATE branch now refreshes updated_at as well as save_revision.
- Verified against the connected Supabase project: dori_cloud_storage has RLS enabled; SELECT/INSERT/UPDATE policies scope rows to auth.uid() = user_id; no DELETE policy exists; save_revision is NOT NULL; the RPC is SECURITY INVOKER and executable by authenticated, not anon. The Supabase security advisor returned no finding mentioning dori_cloud_storage.
- Ran a database negative test with a malformed player-state envelope; the RPC rejected it with the expected validation SQLSTATE and no save row was written.
- Confirmed E2E hooks are gated by both localhost/127.0.0.1/::1 and the ?e2e flag, so a production GitHub Pages URL cannot enable the test API merely by adding a query parameter.
- Validation checkpoint 41778308536 passed: static validation and browser-regression jobs both succeeded. The static suite reported 93 tests passed, 0 failed. Playwright reported result PASS with desktop and mobile-emulation WebGL renderers, visible mobile touch pad, and a virtual one-hour regression. Browser screenshots were uploaded as the workflow artifact.
- The browser audit reported 29 resources, 18 recipes, 31 buildings and 18 research nodes with no data-validator errors or warnings. These counts are evidence of current data consistency only; they do not satisfy the v4.5.0 full-catalog requirement.
- The test result does not establish real-device Android/iOS compatibility, a 60-minute wall-clock memory soak, full server-authoritative multiplayer economy, all canonical Doronum recipe/model integration, all machine FailureProfiles, or completion of the story/ending gates. Main remains untouched; PR #11 remains draft.


## 2026-11-09 — live inventory custody transaction integration (partial)

- Development code checkpoint: `4ce7ad0089bebe71cd61e6bbaf136c3d175a2a9f`.
- `takeItem` and `takeItems` now commit through `commitOwnedItemReservations`. Before changing stack quantities, the bridge rebuilds and validates the live custody snapshot, then journals each reservation allocation through a deterministic reservation-scoped `consumeCustody` transaction. Only after every allocation is accepted does it commit the runtime reservation and refresh the legacy inventory projection. Invalid custody, rejected journal operations, or a failed reservation commit restore the runtime, ledger and inventory snapshot; callers release the temporary reservation.
- Manual `supplyMachine` now uses a real inventory-to-machine transfer path. It reserves the exact item stacks, journals `transferCustody` from the reservation's `ACTIVE_JOB` owner to the target `MACHINE_INPUT` owner, commits the inventory reservation, preserves weighted quality/purity and conservative synthetic metadata in the machine buffer, then rebuilds and validates custody. Recipe input lookups are canonicalized before reading the existing buffer so legacy aliases cannot cause a second supply.
- Added Playwright coverage against the actual live factory functions: the smelter receives exactly 2 canonical iron ore and 1 coal; both transfers are journaled; direct and batch wood consumption journal exactly 2 units and leave 1; duplicate shipment custody IDs block the next consume without changing inventory or leaving a reservation behind.
- The first browser attempt (runs 42547186786 / 42547192181) exposed an E2E measurement-order mistake: the field labelled “inventory after transfer” was read after the test's two intentional wood consumptions. The capture now occurs immediately after the transfer and before consumption. The correction is in commit `4ce7ad0`; it did not change the game transaction logic.
- Validation for the corrected code commit: push run [42547328811](https://github.com/Rockey-Jason/doldol-site/actions/runs/42547328811) and PR run [42547333131](https://github.com/Rockey-Jason/doldol-site/actions/runs/42547333131) both succeeded. Static validation and Node unit tests: **128 passed, 0 failed, 0 cancelled, 0 skipped**. Playwright browser regression: **PASS**, desktop WebGL and 390×844 mobile WebGL emulation; the virtual soak executed 36,000 ticks / 32,400 simulated seconds. This remains a virtual soak, not a 60-minute wall-clock test or physical Android/iOS validation.
- Ownership remains **PARTIAL**. The ledger is still a validated custody snapshot plus transaction/consumption journal, not the sole authoritative owner state. Production recipe buffer consumption, active-job custody, completion output, conveyors, world drops, independent warehouse storage, shipment cargo, demolition, fusion and crash/reconnect recovery still need live transaction integration and cross-domain conservation tests.
- No main merge, deployment, production database/schema change or live-user save mutation was performed.


## 2026-11-09 — Fusion runtime and adjacent PR reconciliation

- The current live branch already routes the Fusion UI and fixed-tick game loop through `startInfinityFusion`, `tickInfinityFusion`, `cancelInfinityFusion` and `recoverInfinityFusion`. The current Playwright suite executes the live seven-stage job for exactly 260 simulated seconds, forces a power pause below the 0.80 floor, resumes with 15 reservations preserved, and asserts stage 7, 1,500 inputs consumed, zero open reservations and exactly one canonical Infinity output. It also tests failed/passed independent cooling and pressure-sensor diagnostics, reservation cancellation and idempotent settlement replay. Do not report live Fusion integration as absent; the remaining gap is save/cloud reload or process-restart recovery, full critical-failure interlock coverage and authoritative output custody.
- PR #10 was compared file-by-file against the current branch. Its `doronium-catalog.js` migration/catalog API is superseded by the expanded `canonical-data.js`; its `factory.js` and `simulation-core.js` are older snapshots with fewer live systems and weaker qualified-reservation coverage; its `world3d.js` lacks the current canonical crystal-model additions. No safe direct cherry-pick was identified.
- PR #9 was compared by module and integration surface. The current branch has evolved equivalents for cloud-save CAS (`cloud-save-runtime.js` plus owner-scoped RPC), fixed ticks/RNG/events (`simulation-core.js`), fluid pressure/temperature/conservation (`fluid-runtime.js`), custody transactions (`ownership-runtime.js`) and graph logistics (`logistics-runtime.js`). Its standalone segment/parcel conveyor state is not drop-in compatible with the current `building.item` graph; its fluid-tank reservation model is not wired to current building buffers; its older custody ledger is weaker than ownership-runtime v2. PR #9's edge-by-edge power-loss path solver remains a useful porting reference because the current `network-runtime.js` applies per-consumer loss rather than a full path-edge loss model. No incompatible module was blindly merged.
- PR #8 remains a separate Godot 4 architecture and was not merged or used to replace the requested Three.js/WebGL browser game.
- Repository reconciliation: current main `c4e7c3d`; current development branch before this log update `e09c8c2`; PR #11 remains draft. Main and development history are diverged (331 commits ahead / 168 behind at the code checkpoint, before this documentation-only commit); PR #11's computed merge base remains `26e8805`. GitHub's `mergeable=true` indicator is not a substitute for file-by-file reconciliation, so no merge or deployment was attempted.


## 2026-11-09 — live production custody transaction checkpoint

- Runtime code checkpoint: `88604b631b9fbf68b9f797f77fdbd822bf2e0a6e`.
- Added `completeProductionCustody` to `ownership-runtime.js`. A production-completion transaction now consumes every active-job input stack through child idempotent consumption entries and creates exactly one machine-output custody record. The operation snapshots the ledger and rolls back all consumed entries, transaction records and ID counters if any input or output validation fails. Replaying the same transaction returns the prior result; reusing its key with a different payload is rejected.
- The live `consumeRecipe` path now journals both machine-buffer input transfers and inventory-reservation transfers into the machine's `ACTIVE_JOB` custody. Per-machine `productionSequence` provides a save-persistent job identity. Item stacks, buffer quantities, metadata, reservations and consumed fluid are restored together when any reservation, transfer or final custody audit fails.
- The live `createOutput` path now validates the current custody snapshot, atomically consumes the active-job input custody and creates the exact `MACHINE_OUTPUT` custody record. After commit it clears the active-input projection and rebuilds the snapshot, so a completed recipe no longer leaves phantom input custody alongside its output.
- Machine-input and active-input custody IDs are canonicalized during snapshot rebuild, including legacy aliases. The browser entry was cache-busted to `factory.js?v=45`, and the ownership module import to `ownership-runtime.js?v=5`.
- Added unit tests for exactly-once production completion, transaction-key payload conflicts, and full rollback when one input is missing. Added a real live-smelter Playwright scenario that splits the recipe across one buffered iron-ore unit and inventory iron ore/coal, confirms all three units enter the active job, completes the 12-second simulated smelting recipe, and verifies exactly three input units are consumed, one iron plate is output, no active-job custody remains, and the rebuilt ledger is valid.
- Final validation on the code checkpoint: Node suite **130 passed, 0 failed, 0 cancelled, 0 skipped**. Push workflow [42550511913](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550511913) and PR workflow [42550516843](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550516843) both completed successfully. Playwright browser regression: **PASS**; desktop WebGL and 390×844 mobile-emulation WebGL; virtual soak **36,000 ticks / 32,400 simulated seconds**.
- The first browser attempt exposed a test measurement-order issue: the helper read `activeMeta` after the simulated job had already completed. The test now captures active-job state immediately after the first machine tick. The final browser run verifies the full production lifecycle; no runtime workaround or production-data change was used to hide the failure.
- Ownership remains **PARTIAL**. The ledger is still a validated custody snapshot plus transaction history, not yet the authoritative source for every runtime domain. Live conveyor-to-conveyor/machine/storage/market movement, warehouse stock, world drops, shipment cargo settlement, demolition, Fusion output custody, and crash/reconnect recovery remain open. This checkpoint does not close the 2,048m world, five non-water fluid types, full canonical recipe source, full machine failures/skills/contracts, physical-device testing or 60-minute wall-clock soak.
- No main merge, GitHub Pages/Render deployment, production database/schema change, or live-user save mutation was performed.


## 2026-11-09 — live conveyor custody transaction integration (partial)

- Runtime code checkpoint: 1be3e174248d59b74b49ff650d4e7cf1ea628bc7.
- Machine outputs now receive a per-building, save-persisted custody stack ID (MACHINE_OUTPUT:<building UID>:<output sequence>). The ownership snapshot reads explicit custody IDs from machine outputs and conveyor cargo, while old saves without the new field retain the previous deterministic fallback ID. This prevents a later output from reusing a stack ID already transferred into inventory.
- Live tickBelts now journals machine-output → conveyor, conveyor → conveyor, and conveyor → player-inventory transfers for storage/warehouse collection through transferCustody. The same stack ID, quantity and quality/purity/synthetic metadata are preserved. Transaction IDs are scoped by source building, simulation tick and persisted transfer sequence. The source buffer, target cargo, runtime stacks, inventory projections, metadata and ownership ledger are restored if the post-transfer ownership audit fails.
- Automated market routes now use consumeCustody before crediting sale proceeds; the sale path is implemented but still needs its own dedicated live browser scenario. Conveyor-to-machine input remains on the legacy direct addInput path and is not yet journal-authoritative.
- Added a runtime unit test for a single stack moving across two conveyor owners into player inventory, including exact-payload replay and transaction-key conflict rejection. Added a real Playwright fixture that creates a machine output, moves it through two ordered belts, collects it through storage, and asserts three transfer journal entries, stable stack identity, exact quantity 2, no residual machine/conveyor owner, final PLAYER_INVENTORY custody and a valid final snapshot.
- Validation: 131 Node tests passed, 0 failed/cancelled/skipped. Push CI https://github.com/Rockey-Jason/doldol-site/actions/runs/42553161038 and PR CI https://github.com/Rockey-Jason/doldol-site/actions/runs/42553165969 both completed successfully. Playwright browser regression: PASS, desktop WebGL and 390×844 mobile-emulation WebGL. The 36,000-tick / 32,400-simulated-second soak is virtual time, not a 60-minute wall-clock test or physical Android/iOS validation.
- Remaining ownership gaps: conveyor-to-machine transfer, partial-stack splitting through belts, independent warehouse stock, world drops, shipment cargo/delivery settlement, demolition/salvage, Fusion output custody and crash/reconnect recovery. The ownership ledger is still a rebuilt custody snapshot plus journals, not yet the single authoritative state for every runtime domain.
- Repository checkpoint: main c4e7c3d685eaa9dff41449a02ed1f398f3ec6a5f; development code checkpoint 1be3e174248d59b74b49ff650d4e7cf1ea628bc7; PR #11 remains open/draft. Current main comparison is 341 commits ahead / 168 behind from merge base 26e88058b6d416d79459fee107aff4a5beb3d7e3. PR #8/#9 remain draft and PR #10 remains open/non-draft. No merge, deployment, production DB/schema mutation or real-user save change was performed.


## 2026-11-10 — live conveyor-to-machine custody hardening (partial)

- Tested code checkpoint: `ad114a4d18b42ef33ff1679efd593c3a4dbc0acf` (runtime change `d9a4350aeae5083061f645f290198b734bebc38f`, live fixture `1438b932efd30da346f942190d4f516caa76668f`, browser assertions `ad114a4d18b42ef33ff1679efd593c3a4dbc0acf`).
- Hardened `transferBuildingCargoToMachine`:
  - An already-committed exact transaction replay is now rejected as a no-op before the destination input projection can be applied a second time.
  - The custody transfer, destination input/metadata update, source clearing, completion-buffer clear, and post-transfer audit now run inside an exception boundary.
  - Any thrown projection error restores the source cargo/status/transfer sequence, target input and metadata/status, item runtime/inventory/meta projections, ownership ledger including journals, and dirty flag.
- Extended the live browser fixture to cover exact transaction replay and a destination-input exception (frozen input object), in addition to successful conveyor-to-machine transfer and conflicting transaction-key rollback.
- Isolated runtime verification against the fetched production helper and the actual `ownership-runtime.js` implementation: successful transfer, exact replay rejection, and exception rollback **3/3 passed**. Factory and Playwright smoke source syntax compilation **2/2 passed** in the V8 harness.
- These isolated checks are not the full Node suite and are not a Playwright browser run. GitHub Actions lookup returned no workflow run for the current code checkpoint; therefore current-head Node/Playwright status is **UNVERIFIED**, not passed. The latest previously confirmed full validation is run [42433376139](https://github.com/Rockey-Jason/doldol-site/actions/runs/42433376139) on the earlier checkpoint `924c054555911aa38fe8e105c346f61231c0f8b4`; it is baseline evidence only and does not validate the new conveyor-to-machine code.
- The automatic-mine regression remains in `e2e/factory-smoke.mjs`: after 81 fixed ticks it asserts a non-null `ITEM_IRON_ORE` output, exact one-unit yield, deposit decrement, power RUNNING, and drill wear. The earlier browser run passed, but the same scenario has not yet been re-executed on this code checkpoint.
- Ownership remains **PARTIAL / CRITICAL**. The new conveyor-to-machine path is implemented and covered by a browser scenario, but independent warehouse stock, world drops, partial-stack parcel transfers, shipment settlement, demolition/salvage, Fusion output custody, and crash/reconnect recovery remain outside one authoritative live transaction boundary.
- No main merge, Pages/Render deployment, production database/schema/permission/function change, or live-user save mutation was performed.


## 2026-11-11 — shipment cargo custody and failed-delivery recovery (partial)

**Code checkpoint before documentation:** `c397cf171db9e5ba6da3e51f9a1e475ec7076252`  
**Main HEAD at comparison:** `293a1e8a147648763777abb6e41dd903fa22a82c`  
**Main comparison:** development branch is 355 commits ahead / 280 behind; common merge base remains `26e88058b6d416d79459fee107aff4a5beb3d7e3`. PR #11 remains open and unmerged.

### Live code changes

- Added `SHIPMENT_CARGO` as an explicit ownership domain. Shipment dispatch now requires a valid ownership ledger and verifies the exact qualified reservation allocations before mutation.
- Each reservation allocation is transferred from its reservation-scoped `ACTIVE_JOB` custody record into `SHIPMENT_CARGO` using a deterministic transaction ID. The reservation is committed only after every custody transfer succeeds.
- Dispatch snapshots runtime inventory, metadata, ownership journal, shipment fields and contract events. Any transfer/commit/post-validation failure restores the original reservation, item quantities, ledger and shipment state.
- Qualified delivery consumes each shipment custody stack into the consumed journal exactly once. Failed delivery transfers each cargo stack into a persisted `worldDrops` entry with the same custody stack ID and `WORLD_DROP` owner, rather than falsely labeling the cargo as warehouse stock.
- `rebuildOwnershipLedger` now reconstructs in-transit `SHIPMENT_CARGO` records and persisted world-drop records. New delivered/failed shipments are excluded from the active custody snapshot after their consumed/drop transfer; their journal history remains. Legacy shipments without the new custody version retain the prior snapshot interpretation for save compatibility.
- The live dispatch UI rebuilds and validates the custody snapshot before committing a shipment. Runtime module cache versions were bumped.

### Tests and evidence

- Contract runtime test source executed against the fetched production modules in an isolated V8 harness: **8/8 passed**. This includes reservation qualification, packaging, shipment dispatch, delivery consumption, cancellation, corrupt-reservation rejection, custody-failure rollback and failed-shipment world-drop transfer.
- The exact live `rebuildOwnershipLedger` function was extracted from the current factory source and exercised with the production runtime modules: delivered cargo (2 units) was consumed once; failed cargo (2 units) moved to `WORLD_DROP`; both rebuilt snapshots and the final ledger validated.
- Factory source syntax and Playwright smoke source async syntax compilation: **2/2 passed**.
- GitHub Actions lookup for the current code checkpoint returned no workflow runs and no combined status entries. Therefore the full Node workflow and real Playwright browser regression remain **UNVERIFIED**; the isolated V8 checks are not reported as Node or Playwright passes.
- The browser regression now includes a live fixture for successful delivery, consumed-journal conservation, failed delivery and world-drop custody. It must still run in GitHub Actions before this change is considered browser-verified.

### Remaining ownership and shipping gaps

- World drops now have a persisted custody domain, but player pickup/rendering and drop cleanup are not yet integrated.
- Independent warehouse stock, partial-stack conveyor parcels, demolition/salvage, Fusion output custody, and crash/reconnect recovery remain open.
- Contract rewards are still client-applied; server-authoritative settlement, full contract catalog and route-derived risk remain open.
- Overall item ownership and shipping remain **PARTIAL / CRITICAL**. No global conservation or release-completion claim is made.

No main merge, GitHub Pages/Render deployment, production database/schema/permission/function change, or real-user save/balance/reward mutation was performed.


## 2026-11-12 — failed-shipment world-drop recovery interaction

**Code checkpoint:** `5704223f163a8fc478422a40cecb30fc3978aeaf`  
**Main HEAD at comparison:** `cde4215b05413d627dbacb86e8a2683a708788f4`  
**PR #11:** open / draft, base `26e88058b6d416d79459fee107aff4a5beb3d7e3`  
**Branch divergence:** 364 commits ahead / 578 behind; common merge base remains `26e88058b6d416d79459fee107aff4a5beb3d7e3`.

### Live code changes

- Failed-shipment world drops now preserve the player's current layer and mine depth as well as their tile coordinates. A failed shipment in mine layer 3 therefore remains a mine-layer drop rather than being relocated to the surface.
- Added visible world-drop markers to the Three.js scene and the 2D compatibility renderer. The WebGL scene signature now includes world-drop identity, quantity, coordinates and layer, so adding/removing a drop rebuilds the marker set instead of leaving stale meshes.
- Added proximity pickup through the existing E interaction and action button. The action button temporarily uses the same E interaction path, so touch users can collect a drop without relying on a physical keyboard.
- Pickup validates the current custody snapshot and requires the exact `WORLD_DROP` owner, drop ID, canonical item ID, quantity and unused runtime Stack ID.
- The same custody Stack ID becomes the inventory runtime Stack ID. Quantity, quality, purity and `synthetic` metadata are preserved; the drop is removed only after the custody transfer, inventory projection and rebuilt ledger all validate.
- Pickup uses the deterministic transaction key `WORLD_DROP_PICKUP:<dropID>`. Duplicate input cannot create a second inventory stack. Transfer conflicts and failures during inventory projection fail closed and restore the original runtime, world-drop list, inventory projection and ownership journal.
- Added E2E fixtures for visual materialization, action-button pickup, keyboard pickup, exact Stack ID/metadata preservation and repeated-input idempotency. The fallback renderer now reports its visible surface-drop count for diagnostics.
- Runtime cache version for `world3d.js` was advanced to `v=21`.

### Tests and evidence

- Current `contract-runtime.test.mjs` source executed against the fetched production canonical-data, simulation-core, ownership-runtime and contract-runtime modules in an isolated V8 harness: **8/8 passed**, including failed-shipment world-drop layer/depth preservation.
- The exact live `rebuildOwnershipLedger` and `pickupNearbyWorldDrop` functions were extracted from the current factory source and exercised with the production ownership and simulation modules:
  - successful pickup preserved Stack ID, 2-unit quantity, quality 97, purity 98 and `synthetic=false`;
  - repeated pickup returned false and left one transfer journal entry;
  - an injected inventory-sync exception rolled back the drop, inventory, runtime stack and transaction;
  - a conflicting transaction ID was rejected without consuming or duplicating the drop.
  - all resulting custody snapshots validated.
- Async JavaScript syntax compilation for `factory.js`, `world3d.js`, `contract-runtime.js`, `contract-runtime.test.mjs` and `e2e/factory-smoke.mjs`: **5/5 passed**. This is a V8 syntax check, not the Node CI workflow.
- GitHub Actions lookup and combined commit-status lookup for code checkpoint `5704223f163a8fc478422a40cecb30fc3978aeaf` returned no workflow runs and no status entries. Native Node `--test` and the real Playwright browser regression therefore remain **UNVERIFIED**; the new browser scenarios are committed but have not been observed running.
- Android/iOS hardware playthrough and a 60-minute physical wall-clock soak remain **UNVERIFIED**.

### Current ownership and release gaps

- World drops are now persisted, rendered and recoverable through the live E/action interaction, but the full pickup flow still needs the committed Playwright browser regression to run.
- Independent warehouse stock and warehouse-to-inventory transactions remain incomplete. The current storage collection path still projects back into player inventory.
- Partial-stack conveyor parcels, sorter/splitter/merger/lift/curve/multi-lane routing, deadlock recovery, demolition/salvage, Infinity output custody, and restart/reconnect conservation across all owner domains remain open.
- The six-fluid live network, canonical catalog integration across every recipe/model/research/UI, live Fusion runtime integration, 2,048m × 2,048m save-safe world migration, full contract catalog and server-authoritative rewards remain incomplete.
- All 12 roadmap stages remain PARTIAL or UNVERIFIED; no final 20-item checklist entry is promoted to COMPLETE by this change.

### Cross-PR and deployment boundary

- PR #9 overlaps this work in `factory.js` and `e2e/factory-smoke.mjs`; PR #10 overlaps in `factory.js` and `world3d.js`. Their current PR-head versions were compared file by file and do not contain the current shipment-custody/world-drop pickup implementation. No older file was wholesale copied or cherry-picked over the current branch.
- PR #8 remains a separate Godot 4 implementation and was not integrated into the selected Three.js/WebGL game.
- Main remains `cde4215b05413d627dbacb86e8a2683a708788f4`. PR #11 remains open/draft and unmerged. No main merge, Pages/Render deployment, production DB/schema/permission/function change, user-save mutation, or real-user balance/reward mutation was performed.


## 2026-11-13 — deterministic power/fluid network identity

**Code commit:** `1b097e9c727666c34ff3d84e6308269e09d052cd`  
**Main HEAD:** `759e02e7425499ac86ab89b364963f7f13f10230`  
**PR #11:** open / draft; recorded base `26e88058b6d416d79459fee107aff4a5beb3d7e3`  
**Current comparison:** 367 commits ahead / 661 behind main; merge base remains `26e88058b6d416d79459fee107aff4a5beb3d7e3`.

### Code changes

- Power network IDs no longer depend on the current component's ordinal position. Each connected component now uses its lexicographically smallest stable node ID as its encoded anchor.
- Fluid network IDs use the same deterministic anchor rule. Adding an unrelated network or changing input array order no longer renumbers an unchanged network.
- Added a power-network regression test and a fluid-network regression test for unrelated-component insertion and reversed input order.
- No save schema, item ownership, inventory, account, production database, or live-user data was changed.

### Verification

- GitHub Actions run [43348303525](https://github.com/Rockey-Jason/doldol-site/actions/runs/43348303525) was triggered for this code commit.
- `validate-web-game`: **SUCCESS**. JavaScript parsing and required runtime-contract checks completed.
- Node unit suite: **135/135 passed, 0 failed**. Both new stable-network-ID tests are included in this count.
- `browser-regression`: **IN_PROGRESS at the time of this log entry**. It is not counted as a pass; current-head Playwright and virtual-soak acceptance remain pending.
- The prior code checkpoint `e5ccc9291126f27fe5e07d4bab906f4cf27b10f2` had a successful full validation/browser run [43135156090](https://github.com/Rockey-Jason/doldol-site/actions/runs/43135156090), including the automatic mine-output assertion. That prior result is not substituted for the current commit's pending browser job.
- Physical Android/iOS testing and a 60-minute elapsed wall-clock soak remain **UNVERIFIED**.

### Remaining highest-priority gaps

- Power: actual edge-by-edge transmission loss, persistent topology identity across topology merges/splits, and diagnostic/priority behavior still need broader integration.
- Fluids: six fluid types exist in the solver, but live extraction and consumption remain predominantly WATER; the five non-water source/consumer chains are not complete.
- Ownership remains PARTIAL / CRITICAL across conveyor parcels, independent warehouse stock, demolition, Fusion output custody, and restart/reconnect conservation.

No main merge, GitHub Pages/Render deployment, production database/schema/permission/function change, or real-user save/balance/reward mutation was performed.


## 2026-11-14 — current-head battery settlement regression investigation

**Starting code checkpoint:** `4a3d364115543d50f370b44ac613db79d1ab0c0f`  
**Main HEAD at inspection:** `918311b833aed6c66f8e4ead899d08f973cfed57`  
**PR #11:** open / draft / unmerged; recorded base `26e88058b6d416d79459fee107aff4a5beb3d7e3`  
**Comparison:** 368 commits ahead / 710 behind main; merge base remains `26e88058b6d416d79459fee107aff4a5beb3d7e3`.

### Current-head CI evidence

- Run [43348668440](https://github.com/Rockey-Jason/doldol-site/actions/runs/43348668440) completed on the starting HEAD.
- `validate-web-game`: **SUCCESS**.
- `browser-regression`: **FAILURE** at `doronium-factory/e2e/factory-smoke.mjs:392`: the live 400kW battery charger did not satisfy the expected 40kJ storage increase after one 0.1-second tick.
- The browser run stopped at this battery assertion. The later automatic-mine and advanced-miner output assertions (smoke lines 461–483) were **not reached** on this HEAD. The previously reported mine-output regression therefore remains **UNVERIFIED on the current HEAD**.
- Run [43348303525](https://github.com/Rockey-Jason/doldol-site/actions/runs/43348303525) was **CANCELLED**, not a successful browser run. Run [43135156090](https://github.com/Rockey-Jason/doldol-site/actions/runs/43135156090) succeeded on older code checkpoint `e5ccc9291126f27fe5e07d4bab906f4cf27b10f2` and is not current-head evidence.

### Code/test changes in this checkpoint

- The power browser regression now separately asserts that the battery is in the generator's cable-connected component and that the pure solver calculates 400kW / 40kJ before testing live tick settlement.
- The failing assertion now prints the battery's live energy, connected network and battery-change journal so the next CI run identifies whether the defect is topology, allocation or settlement.
- Added a Node unit test reproducing the same cable topology and 0.1-second 400kW charging case, including the explicit `applyPowerBatteryChanges` settlement boundary.
- This is diagnostic hardening, **not a claim that the live settlement defect is fixed**. The live cause must be isolated from the next CI evidence before changing production power logic.

### Remaining blockers

- Highest priority: isolate and fix the live battery settlement failure, then rerun the full Playwright browser regression.
- Automatic mine output and advanced mining assertions must be reached and pass on the new current HEAD.
- Power edge transmission loss and diagnostics, non-water fluid integration, global ownership conservation, Fusion restart/interlock recovery, full research/skill coverage, 2,048m world migration and full contract catalog remain incomplete.
- Physical Android/iOS, two-device cloud recovery and 60-minute elapsed wall-clock soak remain **UNVERIFIED**.

No main merge, Pages/Render deployment, production database/schema/permission/function change, real-user save mutation, or balance/reward mutation was performed.
