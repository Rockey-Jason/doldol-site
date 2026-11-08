

## 2026-11-04 incremental implementation status — not a release gate

The current development branch adds live integrations beyond the 2026-11-03 audit:

| Area | New implementation | Remaining completion gate |
|---|---|---|
| Cloud save | Authenticated owner-scoped CAS RPC using `save_revision`; server rejects malformed envelope/state shape, unsupported schema and payloads >5MB; updates `updated_at`; RLS owner-only and SECURITY INVOKER | Real account two-device conflict/recovery UI; decide whether to revoke direct table INSERT/UPDATE after all clients migrate to RPC; gameplay authority is still client-side for this single-player save |
| Construction | Live footprint checks, material/money escrow and rollback | All building footprints/art/ports, full dismantle inventory handling and crash recovery for pending transactions |
| Blueprint | Save current selection/factory, duplicate, rotate and atomic placement UI | Port connectivity validation, complete blueprint migration/import/export UX and all special placement rules |
| Power | Live per-consumer allocations, explicit cable-connected networks, transformer cap and battery kJ charge/discharge; generator/consumer/transformer/battery ratings now convert internal design units to kW; Infinity stage demands are 500kW→5MW | Transmission-loss calibration, storage dispatch policy review, grid diagnostics/visualizer, full generator/relay hardware integration and current browser regression |
| Mine automation | Underground layer-specific miners, coal-fuelled mine generator, per-deposit depletion, byproducts, drill wear and repair | All mineral deposits/levels, mining profile failures, drill component crafting, actual in-device/browser regression and mine logistics |
| Logistics | Live graph-based conveyor routing and machine-output entry; fixed a graph crash when a non-conveyor machine feeds the first belt; regression test added | All sorter/splitter/merger/lift/curve/multi-lane buildings as player-usable assets, automated deadlock recovery, global ownership transfer ledger and latest browser regression |
| Shipping | Three sample contracts, five packaging steps, qualified reservation, transit outcome/insurance and idempotent reward | Full contract catalog, route-derived risk, packaging model/assets, server-side reward authority and comprehensive delivery recovery tests |
| Failure | Five production machine profiles are connected to live machine processing and repair UI | Profiles/outcomes for every machine, failure distribution validation, failure/residue loss ledger and hardware/session regression |
| Fluid | Pipe/pump/valve/tank are placeable and connected to live fixed-tick water flow; valve controls, live volume/pressure inspector, pump power and Dori Farm fluid-buffer consumption are connected | Oil/petroleum/molten-metal/lava/chemical source/extractor paths, port-direction validation, leak/failure integration, persistent fluid ownership ledger and full conservation/browser regression |
| Item ownership | Custody ledger primitives exist and are tested | Migrate inventory, drops, all machine buffers, conveyors, warehouse, delivery, active jobs and consumed ledger into one source of truth |
| Canonical Doronum | Canonical 15-ID manifest; clear aliases mapped, ambiguous legacy IDs quarantined | Make canonical manifest the active ItemData/recipes/15-model catalog; explicit review UI for quarantined stacks; replace legacy Infinity entry points safely |
| Infinity | Live UI/tick now atomically reserves 15 individually qualified legacy variant IDs, holds inputs during seven stages, preserves missing-machine jobs, supports reservation cancellation, and commits one output once; stage power demands now match 500kW–5MW | Replace legacy IDs with exact canonical manifest, add all stage safety/interlock/diagnostic checks and failure exposure, canonical output CompletionBuffer/ledger, crash/resume and exactly-once end-to-end tests |

The latest branch checkpoint passed static validation and Playwright browser regression (run 41778308536). It passed desktop/mobile-emulation WebGL smoke, the virtual one-hour scenario, and the newly added power/fluid/Fusion/mining/logistics regression checks. This is not a physical Android/iOS test or a 60-minute wall-clock soak. No live main-branch deployment is claimed here.

**Overall v4.5.0 status remains Partial/Conflict.** The incremental work above must not be mistaken for release completion. The original completion declaration rule remains in force.


## 2026-11-08 runtime integrity update — partial

The branch now includes a persisted deterministic RNG-stream API, an ordered/idempotent event queue with bounded retry journal, idempotent quest reward processing, and a maximum-ten-fixed-tick catch-up budget. Unit coverage has been added for event ordering/deduplication/retry, RNG replay, and catch-up backlog preservation. The latest static validation passed; browser regression is pending. These changes do not close the separate ownership-ledger, all-fluid, world-scale, canonical-recipe/model or Infinity interlock gates above.

**Do not mark the project complete from this update.** Remaining gates and the distinction between virtual and physical tests continue to apply.
