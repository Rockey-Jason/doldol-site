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


## 2026-11-14 — current-head battery and automatic-mining regression passed

**Validated code checkpoint:** `c6971ed215d58b2c68ff75e3f262d6ded222c87b`  
**Main HEAD at validation:** `918311b833aed6c66f8e4ead899d08f973cfed57`  
**PR #11:** open / draft / unmerged; base `26e88058b6d416d79459fee107aff4a5beb3d7e3`  
**Comparison:** 369 commits ahead / 710 behind main; merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`.

### Code and test changes

- Added a 0.1-second power-network unit case for the actual fixture topology: an 800kW solar generator supplies a 400kW smelter and charges the connected battery at 400kW, producing 40kJ.
- Added an explicit settlement check using `applyPowerBatteryChanges`; the solver remains pure before settlement and changes the battery to 40kJ only when settlement is applied.
- Strengthened the Playwright power fixture to verify that the battery and generator are in the same cable-connected network, that the solver reports 400kW / 40kJ, and that the live tick persists approximately 40kJ. Failure output now includes the network and battery journal.
- No production power formula, save format, inventory, ownership, account or cloud-save code was changed. The previous 4a3 checkpoint's battery assertion failure did **not** reproduce on this diagnostic checkpoint; the retained regression now passes.

### Verified CI

- GitHub Actions run [43543405015](https://github.com/Rockey-Jason/doldol-site/actions/runs/43543405015): **SUCCESS** on the exact code checkpoint above.
- `validate-web-game`: **SUCCESS**.
- Node unit tests: **136/136 passed, 0 failed, 0 cancelled, 0 skipped**. The new 400kW / 40kJ battery case is included.
- Playwright `browser-regression`: **SUCCESS**. The smoke result reported `PASS`, desktop renderer `webgl`, and mobile-emulation renderer `webgl`.
- The complete browser smoke continued beyond the battery gate and passed the automatic iron-miner and advanced canonical-crystal-miner output assertions. The earlier mine-output-null failure is therefore **not reproduced on this current code checkpoint**.
- Virtual soak: **36,000 simulated ticks / approximately 32,400 simulated seconds** passed. This is not a 60-minute elapsed wall-clock soak and is not physical-device evidence.

### Current acceptance status

- Stage 6 (power) remains **PARTIAL**: battery charge/settlement smoke now passes, but edge-by-edge transmission loss, persistent topology identity through merges/splits and full diagnostics remain.
- Stage 5 (ownership/logistics) remains **PARTIAL / CRITICAL**: not every item owner domain and restart/reconnect path is authoritative or globally conservation-verified.
- Stage 7 (fluids) remains **PARTIAL**: the generic six-fluid solver exists, but live non-water extraction/production/consumption chains remain incomplete.
- Stages 1–4 and 8–12 remain PARTIAL or UNVERIFIED as recorded in the gap matrix. The 2,048m×2,048m world, all-machine failure coverage, full research/skill effects, complete Fusion interlocks/recovery/output custody, full contract catalog and server-authoritative rewards remain open.
- Physical Android/iOS and PC hardware validation, two-device cloud-save recovery and a 60-minute elapsed wall-clock soak remain **UNVERIFIED**.

No main merge, Pages/Render deployment, production DB/schema/permission/function change, real-user save mutation, or balance/reward mutation was performed.


## 2026-11-15 — live contract packaging material custody journal

**Validated code checkpoint:** `3f77fb0cf36836004f1137c3e24164a3c6ec6528`  
**Main HEAD:** `4fa34b0fa1eb3afee4d858488af344a91e632e2b`  
**PR #11:** open / draft / unmerged; base `main`; mergeable `false`  
**Comparison:** 372 commits ahead / 793 behind main; merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`.

### Code changes

- `advancePackagingStage` now accepts an explicit atomic reservation-commit callback. When a live `ownershipLedger` exists, the stage fails closed with `OWNERSHIP_COMMIT_REQUIRED` if no custody-aware callback is supplied; only the package-material reservations are released, while the qualified cargo reservation and shipment stage remain unchanged.
- The live `packageDeliveryContract` UI path and browser E2E use `commitOwnedItemReservations(..., { reason: "contract-packaging" })`. Package-material inputs now create `CONSUME` transaction records and consumed-journal entries before the inventory projection is committed. Ownership snapshot rebuilds retain those journals.
- Added three unit regressions: missing custody callback fails closed, the callback is invoked for package material, and callback failure releases only the package reservation without consuming inventory.
- The live shipment E2E now verifies that one five-stage package consumes exactly 18 material units across 7 custody transactions, and two shipments retain 36 units across 14 transactions after snapshot rebuilds.
- The first browser run [43662223596](https://github.com/Rockey-Jason/doldol-site/actions/runs/43662223596) exposed a separate nondeterministic battery fixture: the live animation loop advanced the fixture battery before the explicit one-tick assertion, so the test observed 80kJ rather than the isolated 40kJ delta. The E2E fixture now pauses the background loop and executes exactly one explicit tick, with an assertion that the starting battery charge is zero. No production power formula was changed.

### Verification

- Final CI run [43662545937](https://github.com/Rockey-Jason/doldol-site/actions/runs/43662545937): **SUCCESS** on the validated code checkpoint.
- `validate-web-game`: **SUCCESS**; Node unit tests **139/139 passed, 0 failed, 0 cancelled, 0 skipped**.
- Playwright `browser-regression`: **SUCCESS**; complete smoke result `PASS`, desktop renderer `webgl`, mobile-emulation renderer `webgl`.
- The browser run passed the new packaging-consumption assertions and completed the virtual soak at **36,000 fixed ticks / approximately 3,600 simulated seconds**. The conservation fixture reported ore balance 50,000 and coal balance 30,000.
- Mobile viewport/touch emulation and virtual soak are not physical-device tests or a 60-minute elapsed wall-clock soak.

### Remaining highest-priority gaps

- Stage 5 remains **PARTIAL / CRITICAL**: package-material consumption is now journaled, but independent warehouse stock, every owner-domain transfer, demolition/salvage, Fusion custody, restart/reconnect recovery and global cross-domain conservation remain open.
- Stage 11 remains **PARTIAL**: all five packaging stages now use custody transactions, but the full contract catalog, route-derived risk/insurance and server-authoritative reward settlement remain open.
- Six-fluid live integration, canonical recipe source-of-truth, full Fusion interlocks/recovery, all skill effects, 2,048m world migration, full campaign and all-machine failure coverage remain incomplete.
- Physical Android/iOS/PC validation, two-device cloud recovery and the 60-minute elapsed wall-clock soak remain **UNVERIFIED**.

PR #8 remains the separate Godot implementation and was not integrated. PR #9 overlaps five files with PR #11 and PR #10 overlaps five files; neither was wholesale merged or cherry-picked. No main merge, GitHub Pages/Render deployment, production DB/schema/permission/function change, real-user save mutation, or balance/reward mutation was performed.
## 2026-11-16 — live Infinity Fusion custody settlement

### Code changes

- `fusion-runtime.js` now settles the canonical Infinity output through `completeProductionCustody`: every reserved allocation is consumed from its exact `ACTIVE_JOB` custody record under a stable `FUSION_COMPLETE:<jobID>` transaction, then exactly one output stack is registered as `PLAYER_INVENTORY` owned by `player`.
- Qualified Fusion reservations must belong to `INFINITY:<jobID>`. The settlement records its custody transaction ID, validates the resulting ledger, and rolls back runtime inventory, reservations, output, stats, settlement journal and ownership ledger together if any custody step fails.
- The live factory rebuilds the ownership snapshot immediately after reservation and immediately before the final Fusion tick. If the snapshot is invalid, Fusion is cancelled before starting or fails closed before consuming inputs.
- Unit and browser tests now verify 1,500 consumed input units, one output custody record, 16 idempotent transaction entries (one parent plus 15 input entries), snapshot-rebuild journal retention, duplicate-settlement protection and preservation of all reserved inputs when custody validation fails.
- First CI attempt [43786962282](https://github.com/Rockey-Jason/doldol-site/actions/runs/43786962282) failed only because the new rollback test expected zero where `stackTotals` intentionally returned `undefined` for an absent output key. The test assertion was normalized; no production-code defect was indicated by that failure.

### Verification

- **Code checkpoint:** `3a4c8c57cb7420508471e524cb0145e19c3291c6`.
- Final CI run [43787044004](https://github.com/Rockey-Jason/doldol-site/actions/runs/43787044004): **SUCCESS**.
- `validate-web-game`: **SUCCESS**; Node unit tests **141/141 passed, 0 failed, 0 cancelled, 0 skipped**.
- Playwright `browser-regression`: **SUCCESS**; smoke result `PASS`; desktop renderer `webgl`, mobile-emulation renderer `webgl`.
- The browser run passed the live Fusion custody assertions and virtual soak at **36,000 fixed ticks**; conservation fixture reported ore balance **50,000** and coal balance **30,000**.
- This virtual soak is not a 60-minute elapsed wall-clock test. Mobile emulation is not physical Android/iOS hardware testing.

### Remaining highest-priority gaps

- Stage 5 remains **PARTIAL / CRITICAL**: independent warehouse stock, demolition/salvage, every other owner-domain transfer, restart/reconnect recovery and global cross-domain conservation remain open.
- Stage 10 remains **PARTIAL**: full safety interlocks, fault/cooling/sensor coverage and persisted restart/reconnect recovery remain open; legacy already-consumed jobs do not retroactively gain per-input consumption records.
- Six-fluid live integration, canonical recipe source-of-truth, all skill effects, the 2,048m×2,048m world migration, full contract catalog, all-machine failure coverage and the complete campaign remain incomplete.
- Physical PC/Android/iOS validation, two-device cloud recovery and the 60-minute elapsed wall-clock soak remain **UNVERIFIED**.

### Branch and release boundary

- Main HEAD: `ac459063e65675bcddadde25babe447346b34043`.
- PR #11 remains open/draft/unmerged and is not mergeable. It is **375 commits ahead / 822 behind** main from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`.
- PR #8 remains the separate Godot implementation and was not integrated. PR #9 overlaps `factory.js` and `e2e/factory-smoke.mjs`; PR #10 overlaps `factory.js`. Their older overlapping changes were reviewed but not wholesale merged or cherry-picked.
- No main merge, GitHub Pages/Render deployment, production DB/schema/permission/function change, real-user save mutation or balance/reward mutation was performed.


## 2026-11-17 — independent warehouse custody and recovery

- **Code checkpoint:** `44ddf1009a5f0ee1422392c004f49db06ec3e7af`.
- Added `warehouse-runtime.js` with atomic, transaction-journal-backed `storeWarehouseStack` and `withdrawWarehouseStack`. Both operations reject exact replay projections and conflicting transaction payloads without duplicating stock or mutating the prior ledger/warehouse snapshot.
- Integrated storage/warehouse buildings as a real `WAREHOUSE` owner domain. `rebuildOwnershipLedger` includes every persisted warehouse stack; machine-output and conveyor intake commit custody exactly once; withdrawal preserves the original Stack ID and item metadata when returning to player inventory.
- Added an inspector stock panel and per-stack withdrawal control. Demolition is blocked while warehouse stock remains. Failed warehouse intake restores the source cargo and target stock snapshot.
- Updated the conservation test helper and virtual soak to include warehouse stock. The prior inventory-only soak assertion was invalid after the new independent owner domain; the corrected assertion checks stored warehouse quantity and includes it in iron/coal conservation balances.
- Added four unit tests: independent warehouse intake, same-stack withdrawal and metadata preservation, replay rejection, and conflicting withdrawal transaction rollback.
- **CI:** [43998126414](https://github.com/Rockey-Jason/doldol-site/actions/runs/43998126414) **SUCCESS**. Static/runtime validation passed; Node suite **145/145 passed, 0 failed, 0 cancelled, 0 skipped**; Playwright browser regression **PASS**. Desktop renderer and mobile-emulation renderer both reported WebGL. The browser route verified four custody transfers (machine output → belt 1 → belt 2 → WAREHOUSE → player), warehouse demolition protection, and the actual inspector withdrawal button. Virtual soak completed **36,000 ticks**; warehouse stored one iron plate; ore balance was **50,000** and coal balance **30,000**.
- **CI debugging trail:** run [43997263414](https://github.com/Rockey-Jason/doldol-site/actions/runs/43997263414) caught the warehouse transaction being precommitted and then replayed by the helper; the commit path was made single-owner. Run [43997494385](https://github.com/Rockey-Jason/doldol-site/actions/runs/43997494385) caught a browser-test counter measured after withdrawal; the test now snapshots stock count before the action. Run [43997698514](https://github.com/Rockey-Jason/doldol-site/actions/runs/43997698514) showed the virtual soak still asserted player inventory; warehouse stock was added to the conservation ledger and the soak now asserts the warehouse projection. The final complete run above passed.
- **Next highest-risk work:** integrate remaining live owner-domain transfers (including warehouse-to-machine sourcing, world drops, shipment custody, active jobs and completion buffers) with rollback/idempotency; then continue the six-fluid live topology. Global conservation is still not proven.
- **Main:** `dea761fcf51643e4550dc6a1948cee01b79e1ac2`. **PR #11:** open/draft/unmerged, mergeable false; 380 ahead / 887 behind main from merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. PR #8 remains separate Godot; PR #9/#10 overlaps were reviewed but not wholesale integrated.
- This was a virtual one-hour simulation, not a 60-minute elapsed wall-clock soak. Mobile viewport emulation is not physical Android/iOS testing. Physical devices, two-device cloud recovery and actual wall-clock soak remain **UNVERIFIED**.
- No main merge, deployment, production DB/schema/RLS/function mutation, real-user save change or coin/balance/reward mutation was performed.


## 2026-11-17 — desktop keyboard-first usability

- **Code checkpoint:** `20c7f4619c9b40f33cb66d3a0ba2e8ec3cf826f6` (desktop keyboard controls, HUD legend and E2E assertions).
- Expanded desktop shortcuts: WASD/arrow movement, E interaction/mining, Space jump, Q eat, R drink, B/O/I/T/J panel navigation, V/M camera/map, 4/5 tool selection, X building rotation, +/- zoom, C recenter, F fullscreen, P pause, [/] simulation speed and H help. Escape now closes an open modal or panel and cancels placement; repeated one-shot keydown events are ignored. Text-entry fields retain normal typing and focused buttons retain native Space/Enter activation.
- Resolved the existing F shortcut collision: O opens factory overview; F remains fullscreen.
- Added a persistent in-world keyboard legend and desktop-focused keycap styling. Mobile touch controls remain available.
- Extended Playwright browser regression to cover Q/R inventory and survival effects, B/I panel navigation, Escape close, and E underground mining. These assertions are committed but are **not yet verified**.
- **CI status:** the GitHub commit-workflow lookup for the current code checkpoint returned no workflow runs, and the combined commit status returned no checks. Do not treat this as a pass; Node/Playwright validation remains **PENDING / UNVERIFIED** until a real CI run reports terminal success.
- **Remaining:** run the full factory validation workflow and fix any first failing assertion; manually verify desktop keyboard usability in a physical desktop browser. Physical PC and mobile device testing remains separate from browser emulation.
- No main merge, deployment, production DB/schema/RLS/function mutation, real-user save change or balance/reward mutation was performed.


## 2026-11-17 — mine geology, coal abundance and render-cost pass

- **Code checkpoint:** `c74f47049a504054f67d6e1880c5aaecc78e08a4` (mine layout, coal v3, instanced mine props, lazy construction, and E2E coverage).
- **Audit findings:** the mine already had five depth levels and instanced rock/floor/roof/ore batches, but its excavated network was dominated by the legacy broad main drift and a small number of chambers. Coal seam v2 provided only roughly eight generated seams per level. The renderer also built the current level's underground scene on every full scene rebuild, including unrelated surface-only refreshes. Ore visual updates recomputed the same InstancedMesh bounds repeatedly for the four rocks belonging to one seam. Coal material was too metallic/glossy for matte coal.
- **Plan executed:** add a connected secondary haulage drift, cross-cuts and larger working chambers while retaining all legacy tunnel coordinates; add a save-additive coal seam v3 across all five levels; improve mine support bracing and coal surface response; skip underground geometry construction while the player is on the surface; batch GPU instance updates and bounding-sphere refreshes once per changed material batch; add regression coverage for reachability, per-level coal, visual props, draw-call caps and surface refresh behavior.
- **Coal audit (deterministic generation replay, not CI):** 104 reachable coal deposits and 20,177 units total. Per level: L1 20 nodes / 3,958 units; L2 22 / 4,034; L3 21 / 4,190; L4 20 / 4,058; L5 21 / 3,937. v3 adds 12 new seams per level, each 180–300 units. Existing v1/v2 keys are not overwritten; incoming saved amounts continue to override generated defaults, preserving mined-out deposits.
- **Tunnel audit (deterministic algorithm replay, not CI):** 504 walkable cells in a 40×24 mine grid; all 504 are orthogonally reachable from the main entrance (3,12). The layout remains below 70% open cells and preserves existing legacy tunnel positions.
- **Rendering changes:** coal is now rough/matte with very low metalness/emissive response; additional diagonal timber braces are instanced (no per-brace draw call); mine ore updates now upload/recalculate once per affected ore batch. The mine scene is constructed only when the player is underground; surface-only scene rebuilds clear stale mine visual references without constructing mine meshes.
- **Regression coverage added:** mine-system test now verifies complete orthogonal connectivity, at least 100 coal seams / 18,000 coal units overall, and at least 18 seams / 3,500 units on every level. Playwright verifies mine stats, timber braces, rock details, ore draw-call and light caps, plus no mine rebuild on surface-only refresh.
- **Verification status:** formal Node and Playwright tests are **PENDING / UNVERIFIED**. The GitHub workflow-run lookup and combined commit status for the latest PR head returned no runs/checks; do not describe the committed assertions as passed. The deterministic counts above are source-algorithm replay only. Real desktop/mobile hardware performance, sustained frame-time and 60-minute wall-clock soak remain **UNVERIFIED**.
- **Scope boundary:** only PR #11 development branch changed. No main merge, Pages/Render deployment, production database/schema/RLS/function mutation, live-user save/economy change or reward/balance change was performed. Natural Doronium veins remain prohibited.


### Mine regression workflow wiring follow-up

- Added `node --check doronium-factory/mine-system.test.mjs`, `node --test doronium-factory/mine-system.test.mjs`, and a required-file assertion to `.github/workflows/doronium-factory-validation.yml`. The mine test previously existed but was not included in the validation workflow's test command.
- **Workflow checkpoint:** `fc54186d7a2e8a0a34fddf8ec8529f93e88c9ba5` (PR #11 head). GitHub workflow-run and combined-status lookups still return no runs/checks, so the suite remains **PENDING / UNVERIFIED**.


## 2026-11-17 — integrated mine geology, environment, safety, transport and performance pass

- **Code checkpoint:** `41b073af547afbd86bbb36e63ed371d084f1930e`.
- **Geology and mineral presentation:** added deterministic six-profile host-rock strata by depth and location (limestone, shale, sandstone, basalt, granite, slate), per-tile color variation, and distinct ore geometry/material profiles. Coal is rendered as flattened dark stratified seams rather than reflective metallic lumps. Existing seam-v3 distribution remains additive and preserves saved depletion.
- **Mine environment:** added per-depth groundwater ingress, humidity and gas accumulation, ventilation and drainage toggles. Environment simulation continues for each level containing an underground facility even when the player is on the surface. Normalization is in-place to avoid allocating replacement environment objects on every simulation tick.
- **Safety and support:** support integrity decays over time; water, gas and support condition feed a deterministic risk assessment. Manual pickaxe mining and automated mine drills both stop at the safety threshold. A critical condition reveals an emergency return-to-surface action. Support reinforcement consumes two owned wood and two owned stone, and support beam colors update by integrity band.
- **Equipment and haulage:** ventilation ducts and fans are instanced/animated; water pools respond to environment state; underground drill rigs rotate while their miner is active; a rail cart can be mounted at the station, increases player movement speed, follows the player and can be dismounted with K. The cart is currently a player-operated local transport vehicle, not yet a multi-station automatic ore-haulage network.
- **Exploration:** added a compact per-level mine map showing tunnels, current player position and mineral deposits, plus depth, coordinates, water, humidity, gas, support and risk HUD values. Keyboard actions: M map, N ventilation, G pump, U reinforce support, K cart. Touch buttons remain available on mobile.
- **Rendering optimization:** mine geology, roof/floor/wall detail, ores, timber supports, ducts, rails, puddles and work props remain batched/instanced. Mine visual buffers update only when their coarse appearance band changes. Coal visual clusters are flattened; ore instance GPU uploads and bounds refresh are batched by type. Surface-only scene rebuilds do not reconstruct the mine. Renderer diagnostics now report FPS/frame time, draw calls, triangles, geometry/texture counts and browser heap bytes when supported.
- **Regression coverage committed:** Node tests for deterministic geology, ore profiles, legacy environment migration, ventilation/gas, pump/water, support reinforcement, off-screen mine-level simulation and safety limits. Playwright desktop/mobile coverage for per-level coal, tunnel visuals, environmental controls, resource-cost support repair, map, cart, emergency evacuation, manual/automated safety interlocks, animated drill presence and render resource budgets.
- **Verification status:** source changes and regression assertions are committed, but the latest GitHub workflow-run and combined-status queries returned no runs/checks. Node/Playwright test execution therefore remains **PENDING / UNVERIFIED**. Browser heap/resource metrics will be emitted by CI when the browser suite runs; no actual output has yet been observed. Physical PC/Android/iOS tests and a 60-minute elapsed wall-clock soak remain **UNVERIFIED**.
- **Remaining gaps:** full mine-cart track routing and automatic ore delivery, more advanced pump/pipe networks, localized support wear and non-graphic passage-closure events, visual review of screenshots on real hardware, and measured device-specific FPS/heap targets remain open. The current safety model stops work and offers evacuation; it does not simulate player injury or a physical cave-in animation.
- **Scope boundary:** PR #11 development branch only. No main merge, Pages/Render deployment, production database/schema/RLS/function mutation, live-user save/economy change or reward/balance change was performed. Natural Doronium veins remain prohibited.


### Mine unit verification and HUD refresh follow-up

- Added a full-render HUD refresh so loading or restoring a save directly into a mine, test fixture setup, and other full UI refreshes also reveal the underground operations card immediately.
- **Code checkpoint:** `dfad15f538e929fd71b13191b65f975080e708b5`.
- **Local Node verification:** executed `node --test mine-system.test.mjs mine-runtime.test.mjs` using the current PR #11 source files. Verified Git blob hashes before running: `mine-runtime.js` `da4d1ffc4676cf5d559a712ab811c27819e3e75d`, `mine-runtime.test.mjs` `6454048c09c3157db309db4c55db3c359a061f3a`, `terrain-system.js` `186eb060c3efb907316ee70760f48540c817c6b0`, and `mine-system.test.mjs` `8a75610f2a1599a17565e989e9d9992cac8f8f22`. Result: **12 passed, 0 failed, 0 cancelled, 0 skipped**.
- **Still pending:** the full browser Playwright suite and GitHub Actions result; the workflow-run and combined-status lookup on the latest PR head still must be checked. Desktop/mobile emulation performance budget assertions are committed but have not yet been executed. Physical device tests and 60-minute wall-clock soak remain **UNVERIFIED**.


### Mine lighting audit and map wayfinding refinement

- Updated underground light diagnostics to include the two lift lamps and every mine-generator point light, not only gallery work lights. This makes the reported mine light count representative of the static underground scene.
- The layer map now marks the surface-return lift (E) and the down-lift (D), and emphasizes the engineer position; the legend wraps on narrow screens.
- **Code checkpoint:** `b1e0a1c72b040c3796856ad73b48f4f72a640209` (HTML/CSS entry checkpoint; renderer light accounting commit `2727beb586e19ee056bd589db49f6c6eb35be046`). Mine helper unit tests remain **12/12 passed** on exact PR source blob copies. Full browser regression and hardware profiling remain pending/unverified.


## 2026-11-18 — mine infrastructure completion pass (implementation checkpoint)

- **Code checkpoint before this documentation update:** PR #11 head reported as `a8a5067c3175d98fad22218394cffce8902363f2`. The branch is still PR #11 only; main has not been merged or deployed.
- **Geology and ore visuals:** the renderer now creates deterministic mineral-specific vein streaks in one instanced batch, layered host-rock color variation, and flattened coal seams. Vein decoration is visual-only and does not mutate deposit quantity, item custody, or mining output.
- **Connected drainage network:** added mine-only build parts for pump, pipes, and collection tank. Four-way adjacency determines connected networks; water moves only when a connected pump/pipe/tank component exists, the level pump switch is enabled, and the pump is powered/running. Flow is capped by pump rate, available water, and tank capacity. The previous fake pump effect in the general environment tick was removed. Tank storage is persisted with the building state.
- **Local support system:** each level has 11 independently persisted timber support sections (six along the main drift and five along the secondary haulage drift). Local humidity/water/drill load wears each section; warning at 55%, passage closure at 8%, local mining and automated drills respect the affected section, and repair restores/reopens that section using owned materials. Both drift support frames receive local condition colors. Closed passages appear as red barriers and are excluded from walking, map, and rail pathfinding.
- **Multi-station automatic rail:** added station build items and a multi-station cart route that follows only cells with rendered rail track. Curved drift height transitions use diagonal rail joints; speed uses actual diagonal segment length. The cart loads existing miner output into a persistent manifest and reserves the original machine buffer, then delivers via the canonical inventory/ownership path at a terminal station. Cancellation, station removal, and save-load reconciliation release or restore reservations without duplicating output. New closures/occupied facilities trigger a safe reroute; routes that no longer connect stop and release cargo.
- **Mine events and navigation:** local support warning/closure events are logged, toasted, rendered and reflected in the map. Selecting a mineral deposit draws a safe walkable route to the nearest approach tile, accounting for mine buildings and closed sections. Weakened supports are amber; closed sections are red; lift locations, player position, mineral deposits, and the route are shown.
- **Performance work:** veins, supports, closure barriers, ducts, rail and drainage props are batched/instanced. Support color buffers update only when a condition band changes; visual scene signature includes closure state. Diagnostics expose FPS, average frame time, DPR, draw calls, triangles, geometry/texture counts and optional Chrome heap bytes.
- **Automated regression added:** unit tests cover 11 support sections per level, local wear/closure/reopen, connected versus disconnected drainage, track-only rail routes, diagonal bends, secondary-drift rerouting, saved cargo reservation restore/cancel, and deterministic vein segments. Browser regression covers visible infrastructure, drainage toggle/flow, local support repair/closure, rail cargo settlement, mineral route guidance, one simulated hour, 10-second desktop/mobile-emulation performance samples, and an opt-in elapsed 60-minute desktop browser soak (`DORONIUM_MINE_60M=1`).
- **Compatibility:** the new `mineInfrastructure` object is lazily created during save hydration; legacy support and route records receive defaults without replacing existing mine deposits or output ownership. No Supabase schema/RLS/functions, production save data, economy balance, or reward logic was changed.
- **Verification status:** the GitHub Actions workflow is configured for both push and pull-request events and includes syntax checks, mine unit tests, required-file checks and the Playwright browser job. The latest connector lookups returned no workflow runs and no commit statuses, and the browser suite has not been executed in this environment. Therefore all new tests remain **PENDING / UNVERIFIED**; no pass count is claimed. The optional true 60-minute browser soak and physical PC/Android/iOS profiling also remain **UNVERIFIED**.
- **Acceptance status:** feature code is integrated, but the overall mine improvement list remains **PARTIAL** until CI, browser screenshots, 60-minute wall-clock soak and real-device FPS/memory measurements have been observed. Do not mark release-ready, merge or deploy from this checkpoint.
