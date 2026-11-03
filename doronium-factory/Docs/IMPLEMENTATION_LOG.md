

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
