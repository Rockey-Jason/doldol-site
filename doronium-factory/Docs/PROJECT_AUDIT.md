# 2026-11-08 — full master-roadmap deficiency audit

## Executive result

The Doronium Factory v4.5 development branch is **PARTIAL / NOT RELEASE READY**. Multiple subsystems have meaningful code and helper tests, but this does not establish complete live-game integration. The master roadmap is not complete, and the project must not be declared finished.

Repository checkpoint:
- Repository: `Rockey-Jason/doldol-site`
- Main HEAD at audit: `c7fb46e2a2f95a3383d80404051fd8ffceb470ab`
- Development branch: `codex/doronium-v4.5-completion`
- PR #11: open, draft, mergeable flag true, base SHA `26e88058b6d416d79459fee107aff4a5beb3d7e3`
- Compare against current main: diverged, 289 commits ahead and 136 behind; merge base is the older base SHA above. The mergeable flag is not sufficient evidence that a wide rebase/merge is safe.
- Related PR #10 (transaction/simulation integrity), #9 (foundation hardening), and #8 (Godot architecture) remain separate open PRs. The selected implementation is the existing Three.js browser game; do not merge the Godot port without renewed architectural approval.
- No main merge or production deployment is included in this audit.

## 12-area status

| Area | Status | Verified implementation | Blocking gaps |
|---|---|---|---|
| 1. World and terrain | PARTIAL | 192×160 tile, two continents, 8 biomes, varied elevations, 5 mine levels, chunk culling | Does not meet the 2,048m×2,048m target contract; unit/coordinate/save migration needs reconciliation; no infinite chunk streaming; finite-world scale must be explicit |
| 2. Exploration and survival | PARTIAL | First-/third-person, movement, mining interaction, health/hunger/thirst, mobile touch controls | Full PC/mobile playthrough, death/recovery/save restore and long-session stability are not fully verified |
| 3. Construction and blueprints | PARTIAL | Footprint validation, escrow/rollback helper, flattening/foundation rules, blueprint save/duplicate/rotate/place | Full port-connectivity, every building footprint, all dismantle/buffer cases, crash recovery and special placements remain incomplete |
| 4. Mining and resources | PARTIAL / REGRESSION | Underground deposits, mine generator, automated miners, depletion, byproducts, drill durability/repair | Latest browser regression previously failed at mine output assertion; 8-second floating-point boundary was patched but needs a green rerun; all deposits/levels/miner classes still need end-to-end coverage |
| 5. Production and canonical recipes | PARTIAL | ItemStack metadata, 15-input canonical manifest, legacy migration/quarantine, production helpers | Canonical registry is not yet the complete source of truth for every live ItemData/recipe/research/building/model. Some raw-resource and machine references still differ |
| 6. Power | PARTIAL | Separate network solver, cable networks, per-consumer allocation, battery kJ and transformer caps; live fixed-tick path | Transmission-loss calibration, complete generator/relay integration, power diagnostics, all network topologies and real browser regression remain |
| 7. Fluids | PARTIAL / NOT FULLY LIVE | Six fluid types and generic flow/conservation helpers; live water-pump/pipe/valve/tank path and some water consumers | Oil, petroleum, molten metal, lava and chemical source/extractor/consumer paths are not fully connected to the game; leaks/failure/ownership/port-direction need live integration |
| 8. Logistics | PARTIAL | Graph routing, belt cargo, machine output entry, sorter/splitter selection and pressure analysis helpers | All sorter/splitter/merger/lift/curve/multi-lane assets, automated deadlock recovery and full custody transfer integration are incomplete |
| 9. Item ownership and transactions | PARTIAL / CRITICAL | Stable Stack IDs, reservations, qualified batch reservation, custody helper, ledger rebuild and transaction primitives | Ownership helper/ledger is not yet the single authoritative source across inventory, drops, machine buffers, belts, warehouse, active jobs, shipping, completion and consumed ledger; prove no duplication/loss across all live transitions |
| 10. Machine failures, repair and skills | PARTIAL | Core and support failure-profile definitions, failure runtime, repair path, 5 specializations and 20 skill nodes | Full live-state/failure coverage and failure/residue/recovery tests for every machine; only some skill effects connect to actual gameplay |
| 11. Shipping, Fusion and ending | PARTIAL / CRITICAL | 3 sample contracts, five packaging stages, qualified reservation, transit settlement; 7-stage Fusion UI/tick with diagnostics and reservations; canonical Infinity output ID migration | Full contract catalog/route-derived risk/server-authoritative rewards; complete integration of resumable Fusion runtime into the live start/tick path; all stage interlocks, save/crash resume, exactly-once end-to-end, 3 relay/core/ending regression |
| 12. Saves, security, performance and release | PARTIAL / UNVERIFIED | Local backup/checksum/recovery, owner-scoped CAS save RPC, RLS, static CI, WebGL/Playwright harness, rendering optimizations | Real two-device account conflict test, full gameplay authority boundaries, physical Android/iOS tests, 60-minute wall-clock soak, memory leak test, final complete campaign regression and Pages deployment smoke |

## Current CI evidence and immediate blocker

- The static validation job on commit `b97c97768ac049b98f61b1230f2264f75320171b` completed successfully. The validation workflow includes JavaScript syntax checks and the Node unit-test suite.
- Browser regression run [42428796884](https://github.com/Rockey-Jason/doldol-site/actions/runs/42428796884) failed at `doronium-factory/e2e/factory-smoke.mjs:307`: `miningResult.output` was null during automatic iron mining. This prevented the rest of that browser run from serving as a full pass.
- Commit `24d68876` added a 1e-9 completion tolerance to the 8-second miner threshold; commit `2484fc72` added a diagnostic assertion that prints miner state if output is still missing. The replacement browser run [42430418112](https://github.com/Rockey-Jason/doldol-site/actions/runs/42430418112) has static validation green; browser regression was in progress when this audit text was prepared. Do not mark the miner fixed until the browser job completes successfully.
- A virtual 36,000-tick hour is not a 60-minute physical wall-clock soak. Browser mobile emulation is not an Android/iOS physical-device test.

## P0 / P1 remediation order

1. Restore a green browser baseline, beginning with mine power/extraction/output and the complete Playwright regression.
2. Make the item custody ledger authoritative across all state domains and prove conservation/idempotency in live flows.
3. Complete canonical 15-item recipes/models/research and the separate canonical Infinity finished-product ID; preserve legacy saves.
4. Integrate all six fluids into real production and storage paths with mass-conservation tests.
5. Finish live Fusion runtime/safety interlocks/recovery and the exact 1,500-in/one-out settlement.
6. Finish machine failure/repair outcomes, skill effects, shipping/catalog/route logic, power loss diagnostics.
7. Reconcile 2,048m world units and legacy save migration without adding natural Doronium ore.
8. Complete authenticated two-device saves, real device tests, memory/60-minute soak, and final campaign/ending regressions.

The complete acceptance gates, not just module existence, determine completion. Each subsystem requires live integration and tests. Unrun, cancelled or unavailable checks remain UNVERIFIED.

## Integrity and release guardrails

- Keep current Three.js architecture; do not switch to the Godot PR.
- Preserve old saves; ambiguous legacy item IDs must be quarantined, not guessed.
- Never add naturally generated Doronium veins.
- Do not treat helper tests as proof that the game uses those helpers.
- Keep all unverified real-device, multi-device and wall-clock checks explicitly unverified.
- Keep PR #11 as a development PR until current-main reconciliation and all release gates are actually satisfied. Do not merge or deploy solely because a PR is marked mergeable.




## 2026-11-04 follow-up audit note

A development branch `codex/doronium-v4.5-completion` now includes live construction escrow/footprints, blueprint UI, graph-based conveyor transfers, three shipping contracts, explicit cable-based power networks with batteries/transformers, underground automatic miners and a mine generator, plus a machine repair path. It also includes the owner-scoped CAS save RPC migration and client adapter.

The 2026-11-04 static CI job passed at checkpoint run [41742193482](https://github.com/Rockey-Jason/doldol-site/actions/runs/41742193482). Browser regressions were expanded after the earlier report to cover blueprint placement, isolated power and battery settlement, mine extraction and drill repair; these require the current browser job's success result before promotion.

The following remain explicitly unverified or incomplete: FluidNetwork is not wired to live pipes/pumps/tanks/recipes; ItemOwnershipLedger is not yet the source of truth across every domain; canonical Doronum IDs are not the active registry/recipe source; the existing live Infinity entry points have not been replaced by the resumable fusion runtime; full failure profiles for every machine, all story/ORBIT/lore/music assets, every building/automation asset, the 2048m world conversion and physical-device soak are not complete. The RLS/CAS inspection does not constitute a real authenticated multi-device production user test.

Therefore the whole v4.5.0 release still fails the completion gate at this point. Keep the PR as draft and do not deploy/merge on the basis of partial module coverage.
