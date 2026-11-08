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
