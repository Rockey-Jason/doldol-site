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


## 2026-11-09 follow-up — current evidence supersedes earlier blockers above

This section supersedes the **immediate mining-regression blocker** and the statement that the live resumable Fusion runtime was not connected. The earlier 2026-11-08 audit remains as historical evidence, but its open-blocker wording is no longer the current branch status.

### Repository and CI checkpoint

- Code commit: 4ce7ad0089bebe71cd61e6bbaf136c3d175a2a9f; subsequent documentation checkpoints: e09c8c230adfa6002c1e44fabef8d650ff8cba2b and current pre-audit-update branch HEAD ea1868eb241d509cb71934e3c38f3c1dcda7cbbd.
- Main HEAD: c4e7c3d685eaa9dff41449a02ed1f398f3ec6a5f. Development and main remain diverged: **333 commits ahead / 168 behind** at the current pre-audit-update comparison; merge base 26e88058b6d416d79459fee107aff4a5beb3d7e3.
- PR #11 remains open and draft. GitHub reports mergeable=true, but the merge base is old and the histories are diverged; no merge or deployment was attempted.
- Code validation: push run [42547328811](https://github.com/Rockey-Jason/doldol-site/actions/runs/42547328811) and PR run [42547333131](https://github.com/Rockey-Jason/doldol-site/actions/runs/42547333131) both **SUCCESS**. The following documentation checkpoints also passed both push and PR workflows: [42547722392](https://github.com/Rockey-Jason/doldol-site/actions/runs/42547722392), [42547726569](https://github.com/Rockey-Jason/doldol-site/actions/runs/42547726569), [42548204968](https://github.com/Rockey-Jason/doldol-site/actions/runs/42548204968), [42548208865](https://github.com/Rockey-Jason/doldol-site/actions/runs/42548208865).
- Latest static suite: **128 tests passed, 0 failed, 0 cancelled, 0 skipped**. Latest Playwright browser run: **PASS**, WebGL desktop and 390×844 mobile viewport emulation. The soak executed 36,000 fixed 0.1-second ticks; the accelerated in-game clock reached 32,400 seconds. This is still a virtual run, not a 60-minute wall-clock test.

### Corrected live regressions

- Automatic iron mining no longer fails the browser output assertion. The live test places a mine generator and iron drill, confirms the deposit remains 28 at installation, then confirms exactly one ITEM_IRON_ORE is emitted, the deposit becomes 27, drill durability decreases, and the connected generator reports RUNNING. Advanced mining and drill repair E2E also pass.
- Live Fusion is connected to the game loop through startInfinityFusion, tickInfinityFusion, cancelInfinityFusion and recoverInfinityFusion. Playwright verifies 15 individually qualified canonical reservations (100 each), seven stages totaling 260 simulated seconds, a power-loss pause below the 0.80 floor with all reservations retained, successful resume, exactly 1,500 inputs consumed, and one canonical Infinity output. Independent cooling/pressure diagnostics, cancellation and idempotent settlement replay are also tested.
- Live inventory ownership integration was expanded: takeItem and takeItems journal actual reservation consumption; manual supplyMachine journals transfers from reserved inventory into the machine-input owner. E2E confirms two exact input transfers, direct and batch consumption of two wood, one wood remaining, and fail-closed behavior when duplicate shipment custody IDs corrupt the ownership snapshot.
- The ledger is **not yet authoritative across all domains**. Production recipe buffer → active job → completion output, conveyor parcels, world drops, independent warehouse, shipment cargo, demolition, fusion output custody and crash/reconnect restoration remain separately mutated or snapshot-rebuilt.

### Updated 12-area status

| Area | Status | Current evidence and remaining blocker |
|---|---|---|
| 1. World and terrain | PARTIAL | 192×160 tile world, two continents, 8 biomes, elevations, 5 mine levels and chunk culling; still does not meet the 2,048m×2,048m target or full streaming/unit migration |
| 2. Exploration and survival | PARTIAL | First-/third-person, movement, mining, health/hunger/thirst and touch controls exist; complete PC/mobile playthrough, death/recovery and long-session save restore remain |
| 3. Construction and blueprints | PARTIAL | Flattening/foundation, footprint checks, escrow/rollback and blueprints exist; all port/footprint/dismantle/crash cases remain |
| 4. Mining and resources | PARTIAL | Automatic and advanced mining, depletion, power, drill wear/repair E2E now pass; all deposit classes, levels, byproducts and full-session cases remain |
| 5. Production and canonical recipes | PARTIAL | 15-input manifest and canonical models validate, but live recipes still read legacy maps; current research data has 19 entries while the master target states 18 |
| 6. Power | PARTIAL | Connected networks, priority allocation, battery kJ and transformer caps exist; current solver applies consumer-level loss rather than full edge-by-edge path loss, and persistent stable IDs/diagnostics need work |
| 7. Fluids | PARTIAL | Six fluid types, pressure/temperature/leak/mass-balance helpers exist; the actual game path is still predominantly water, without all five other source/consumer chains and fluid reservations |
| 8. Logistics | PARTIAL | Conveyor graph, machine output and manual inventory-to-machine input transfers exist; persistent parcel custody, full sorter/splitter/merger/lift/curve/multi-lane assets and automated deadlock recovery remain |
| 9. Item ownership | PARTIAL / CRITICAL | Live direct/batch consumption, machine supply, recipe-buffer/inventory-to-active-job transfers, and atomic active-job-to-machine-output completion are journaled and E2E-tested; conveyor, drops, warehouse, shipment, demolition, Fusion and recovery remain non-authoritative |
| 10. Failures and skills | PARTIAL | Five machine failure profiles, repair path and 20 skill nodes exist; all-machine failure coverage and every skill effect are not live/verified |
| 11. Shipping, Fusion and ending | PARTIAL / CRITICAL | Live 7-stage/260-second Fusion and exactly-once in-memory output pass E2E; shipping still has 3 sample contracts, while Fusion save/restart recovery, complete critical interlocks and the 3-relay/core/planet-ending regression remain |
| 12. Saves, security, performance and release | PARTIAL / UNVERIFIED | Owner-scoped CAS/RLS and local recovery exist; authenticated two-device conflicts, complete server-authoritative rewards, physical hardware, memory leak and 60-minute wall-clock soak remain unverified |

### Updated 20 acceptance checks

1. PC full campaign: **PARTIAL** — desktop WebGL smoke passes; full start-to-ending playthrough is not complete.
2. Mobile full campaign: **UNVERIFIED** — 390×844 touch/WebGL emulation passes; no physical Android/iOS device was available.
3. First-/third-person switching: **PARTIAL** — modes exist, but complete campaign/input regression remains.
4. 2,048m×2,048m world: **NOT IMPLEMENTED** — current world remains 192×160 tiles.
5. Flattening and foundations: **PARTIAL** — live placement rules exist; all footprints/ports/rollback/dismantle cases are incomplete.
6. Underground mining: **PARTIAL** — automatic and advanced mine E2E passes; complete deposit/miner catalog and session recovery remain.
7. Canonical 15 Doronum inputs: **PARTIAL** — manifest/15 models validate, but not every live recipe/research/model/UI source is canonical.
8. No item duplication/loss: **PARTIAL** — direct/batch consumption, machine supply, recipe completion and machine-output → two conveyor segments → storage/player-inventory custody are journaled and E2E-tested; conveyor-to-machine, drops, warehouse, shipment, demolition, Fusion and recovery remain open.
9. Conveyors and automatic mining: **PARTIAL** — automatic mining passes and a live machine-output → belt → belt → storage route preserves one stack ID and quantity; conveyor-to-machine, parcel splitting, full asset catalog and deadlock recovery remain.
10. Power and batteries: **PARTIAL** — kW/kJ allocation and batteries exist; edge-loss solver and stable network identity remain.
11. Six fluids/pressure/temperature: **PARTIAL** — six types and generic solver exist; only water is substantially live in-game.
12. Machine states/failure/maintenance: **PARTIAL** — five profiles and repair path exist; not all machines/states/failures are covered.
13. 18 research / 20 skills: **PARTIAL** — 20 skill nodes exist but effects are incomplete; live research count is 19, not the stated 18.
14. Seven-stage Fusion: **COMPLETE for the live in-memory runtime path** — E2E executes all seven stages for 260 simulated seconds, including power pause/resume; save/restart recovery remains under check 16.
15. Exactly one Infinity output: **COMPLETE for the tested in-memory settlement path** — live E2E verifies one output and idempotent settlement replay; restored-save replay remains under check 16.
16. Cloud save/recovery: **PARTIAL** — owner-scoped CAS/revision conflict and local backup exist; two-device/process-restart E2E remains.
17. Server authority/security: **PARTIAL** — RLS/CAS save boundary exists; game rewards and all economy mutations are not proven fully server-authoritative.
18. 60-minute wall-clock test: **UNVERIFIED** — 36,000 virtual ticks are not 60 minutes of elapsed wall time.
19. Physical PC/mobile performance: **UNVERIFIED** — browser WebGL and mobile emulation only; no physical device/thermal/memory soak.
20. Start-to-ending full regression: **PARTIAL** — mining/Fusion subflows pass, but full campaign, three relays, core and planet stabilization are not end-to-end complete.

No overall release completion is claimed. Main, GitHub Pages, Render, production DB/schema, balances, rewards and real-user save data remain untouched.


## 2026-11-09 latest production-custody and repository checkpoint

This section supersedes the prior ownership wording above. The earlier audit checkpoints remain historical; the following is the current development-branch evidence.

### Repository / PR reconciliation

- Main HEAD: `c4e7c3d685eaa9dff41449a02ed1f398f3ec6a5f`.
- Development branch HEAD: `dffb359d5910402e42e6bf614958f42b42e860e2`; production code checkpoint: `88604b631b9fbf68b9f797f77fdbd822bf2e0a6e`.
- PR #11 remains open and draft, with GitHub's mergeable flag true. It still targets the old base `26e88058b6d416d79459fee107aff4a5beb3d7e3`; current main comparison is **339 commits ahead / 168 behind**, merge base `26e88058b6d416d79459fee107aff4a5beb3d7e3`. No merge was attempted.
- PR #8 remains the separate Godot implementation; PR #9 remains draft and PR #10 remains open/non-draft. All three are unmerged. Their histories and factory/runtime files differ from the current branch; no broad cherry-pick or merge was performed.
- Latest code-checkpoint push/PR CI: [42550511913](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550511913) and [42550516843](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550516843), both successful. Documentation-checkpoint push/PR CI: [42550885030](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550885030) and [42550889500](https://github.com/Rockey-Jason/doldol-site/actions/runs/42550889500), both successful.

### Live production custody result

- Recipe start now transfers buffered machine ingredients and reserved player-inventory ingredients into the same `ACTIVE_JOB` owner, with exact transfer journal entries and rollback of item/fluid/runtime state if any reservation or audit fails.
- Recipe completion now commits one `PRODUCTION_COMPLETE` transaction: every active-job input is consumed exactly once through child journal entries, then exactly one `MACHINE_OUTPUT` custody record is created. Failed input validation/output creation rolls back the entire ledger operation; transaction replay is idempotent and payload conflicts are rejected.
- The Playwright live-smelter fixture verifies one buffered iron-ore unit plus one inventory iron-ore unit and one coal unit (three total) enter the active job, are consumed exactly once, and become one iron plate. It verifies no active-job custody remains and the final rebuilt ownership snapshot is valid.
- Node suite: **130 passed, 0 failed, 0 cancelled, 0 skipped**. Playwright browser regression: **PASS** on desktop WebGL and 390×844 mobile viewport emulation; virtual soak **36,000 fixed ticks / 32,400 simulated seconds**. This is not a physical Android/iOS test or a 60-minute wall-clock soak.

### Remaining status

- Item ownership is still **PARTIAL / CRITICAL**: conveyor parcel movement, storage/warehouse, world drops, shipment cargo settlement, demolition/salvage, Fusion output custody, and crash/reconnect recovery still need authoritative transactions and cross-domain conservation tests.
- The other blockers remain: 2,048m×2,048m world conversion/streaming; five non-water fluid paths; complete canonical recipe source; 19-vs-18 research-count reconciliation; all skill effects and all-machine failure coverage; complete contract catalog and route risk; Fusion cloud/process-restart recovery and complete interlocks; authenticated two-device saves; physical hardware, memory-leak and wall-clock soak; complete start-to-ending campaign regression.
- **All 12 roadmap areas remain PARTIAL, blocked or UNVERIFIED.** The 20 acceptance checks are not all green. No release-ready or overall-complete claim is made.
- No main merge, GitHub Pages/Render deployment, production database/schema change, balances/rewards change, or real-user save mutation was performed.


## 2026-11-09 latest live logistics custody checkpoint

This update supersedes the previous conveyor-ownership status for the development branch only.

- Development code checkpoint: 1be3e174248d59b74b49ff650d4e7cf1ea628bc7; main remains c4e7c3d685eaa9dff41449a02ed1f398f3ec6a5f.
- The live output and belt snapshot now carry stable explicit custody stack IDs. Actual machine-output → belt 1 → belt 2 → storage/player inventory movement commits three idempotent transfer transactions with one unchanged stack ID. The storage handoff creates the inventory runtime stack using that same ID rather than minting a replacement. The market sink uses a consumption journal before adding proceeds.
- Playwright verified the full tested path with exact quantity conservation and a valid final owner. Node suite 131/131; push CI https://github.com/Rockey-Jason/doldol-site/actions/runs/42553161038 and PR CI https://github.com/Rockey-Jason/doldol-site/actions/runs/42553165969 succeeded. Desktop WebGL and 390×844 mobile-emulation WebGL passed. The 36,000-tick run is virtual simulation time only.
- Still partial: conveyor-to-machine input is legacy/un-journaled; sale needs a dedicated E2E; independent warehouse stock, world drops, shipment, demolition, Fusion output and recovery remain open. No cross-domain all-item conservation claim is justified.
- Repository comparison: current main c4e7c3d; development code checkpoint 1be3e17; PR #11 remains open/draft, 341 ahead / 168 behind from old merge base 26e8805. PR #8/#9 are draft, #10 is open/non-draft. No merge or deployment was attempted.
- All 12 master roadmap areas and 20 acceptance checks are still PARTIAL, blocked or UNVERIFIED. No release-ready claim is made. Main, Pages, Render, production database, balances, rewards and live saves remain untouched.
