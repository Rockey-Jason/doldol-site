# DORONUM FACTORY — INFINITE INDUSTRY
## SPEC_GAP_MATRIX · Phase 0 baseline

Status vocabulary is restricted to: Implemented / Partial / Missing / Conflict / Not Verifiable.

Evidence scope: doronium-factory/index.html (30,201 bytes, blob 6d9c740902ef55e8a0a9a6601d9a1541ebf50409), root index.html, root package.json, and the path checks listed in PROJECT_AUDIT.md. A status describes only this inspected evidence; it does not assert that inaccessible nested Unity assets do or do not exist.

| REQ-ID | Status | Observed evidence / gap | Required action and acceptance evidence |
|---|---|---|---|
| REQ-DOC-001 | Partial | Repository and browser prototype inspected; Unity Editor baseline unavailable | Repeat audit in the actual VS Code + Unity project; record Unity version, renderer, input, scenes, saves, Console and Build Profiles |
| REQ-DOC-002 | Partial | No gameplay files were deleted or replaced during this audit | Preserve existing files and saves; review diffs and backups before any migration |
| REQ-CORE-001 | Not Verifiable | No verified Unity runtime/data/persistence modules | Map existing project modules before creating or renaming architecture |
| REQ-CORE-002 | Missing | The inspected web prototype does not expose canonical event/transaction IDs or a committed-event ledger | Implement immutable logical IDs and idempotent event commits in the authoritative runtime |
| REQ-CORE-003 | Missing | No centralized finite/range validation was found in the inspected prototype | Add shared validators for all authoritative quantities and units |
| REQ-SIM-001 | Conflict | Prototype uses a browser interval and elapsed-time delta, not a fixed 0.10-second simulation tick | Implement fixed accumulator/tick and verify catch-up behavior in Unity |
| REQ-SIM-002 | Missing | The specified 18-step tick order is not present in the prototype | Implement and test the exact ordering, including failure-before-completion |
| REQ-SIM-003 | Missing | No deterministic subsystem RNG/replay state was found | Use persisted independent RNG streams and same-seed replay tests |
| REQ-SIM-004 | Conflict | Prototype calculates offline rewards; v4.5.0 default PausePolicy disables offline production | Make Unity pause policy centralized; pause production, wear, hazards, logistics and progression |
| REQ-ITEM-001 | Missing | Prototype stores resource totals, not single-owner item quantities | Implement authoritative owner domains and atomic transfers |
| REQ-ITEM-002 | Missing | No canonical ItemStack with Quality/Purity/Synthetic/provenance was found | Add versioned ItemStack data and lineage preservation |
| REQ-ITEM-003 | Missing | No GUID/non-reuse split/merge and retired-ID ledger was found | Implement split/merge count conservation and ID retirement tests |
| REQ-ITEM-004 | Missing | No Validate → Reserve → Execute → Commit/Rollback transaction lifecycle | Implement idempotent transactions and recovery behavior |
| REQ-PROD-001 | Missing | No one-completed-job payload CompletionBuffer semantics | Implement payload batch custody and atomic delivery to output/conveyor |
| REQ-DATA-001 | Missing | No canonical finite/range validation for item scores | Reject invalid numbers without silent clamping |
| REQ-DATA-002 | Missing | Quality formula/data not found | Implement canonical independent Quality calculation and threshold tests |
| REQ-DATA-003 | Missing | Temperature/Pressure score model not found | Implement target/deviation scoring and explicit not-applicable flags |
| REQ-DATA-004 | Missing | Purity formula and weighting not found | Implement independent input-weighted Purity and precision policy |
| REQ-DATA-005 | Missing | Synthetic/provenance restrictions not found | Preserve synthetic lineage and block prohibited Doronium/Fusion inputs |
| REQ-POWER-001 | Missing | Prototype has simple generated/used power totals, not a network allocator | Implement deterministic allocation, storage, PowerRatio and boundary tests |
| REQ-MACHINE-001 | Missing | No canonical machine state machine or job lifecycle found | Implement all required states and legal transitions |
| REQ-MACHINE-002 | Missing | No ramped temperature/pressure simulation found | Implement profile-driven ramps and safe interlocks |
| REQ-MACHINE-003 | Missing | No wear/condition model found | Implement condition, stress, maintenance and BROKEN behavior |
| REQ-FAILURE-001 | Missing | No time-based hazard model found | Implement hazard-rate exposure and deterministic failure rolls |
| REQ-FAILURE-002 | Missing | No failure profiles, salvage or input disposition ledger found | Define failure outcomes per recipe/machine and test recovery |
| REQ-LOGI-001 | Missing | No logical conveyor ownership/backpressure model found | Implement logical movement, ownership transfer, blocking and cycle policy |
| REQ-FLUID-001 | Missing | No graph-based fluids/tanks/pipes/pumps/valves found | Implement volume conservation, capacity, pressure and flow validation |
| REQ-BUILD-001 | Missing | Prototype builds facility counts in UI; no world placement/ports/ghost validation | Implement grid placement, footprint, ports, cancel and refund transactions |
| REQ-WORLD-001 | Missing | No 2048m 3D world/depth coordinate model in prototype | Implement bounded surface coordinates and typed underground depth |
| REQ-WORLD-002 | Missing | No deterministic world seed/POI/chunk persistence found | Implement seed streams, stable POIs, streaming and edge validation |
| REQ-MINING-001 | Missing | No depleting deterministic resource veins found | Implement vein conservation, hardness, mining power and deterministic byproducts |
| REQ-TREE-001 | Missing | No Dori Meat Tree cycle/water/harvest/purity implementation found | Implement 60s cycle, 2L water, one yield, non-destructive regrowth and cycle idempotency |
| REQ-RESEARCH-001 | Partial | Prototype has 7 generic purchasable upgrades; canonical research graph/lab and 18 required nodes not verified | Audit existing research; implement canonical 18-node graph, samples, lab/power/time and DAG validator |
| REQ-ECON-001 | Partial | Prototype has money and a manual Doronium sell button; no canonical market ledger/anti-arbitrage proof | Implement transaction ledger, prices/costs and cycle validator |
| REQ-SHIPPING-001 | Missing | No packaging/contracts/shipping state machine found | Implement reservations, packing, transit, delivery and idempotent settlement |
| REQ-STORY-001 | Missing | No Acts, quest flags or ORBIT state found | Implement data-driven chapters, objectives and persistent flags |
| REQ-STORY-002 | Missing | No cutscene/reward idempotency or world-event lifecycle found | Implement skip-safe presentation and exactly-once rewards/events |
| REQ-INFINITY-001 | Missing | No canonical 15-input preflight found | Validate exact IDs and exact quantity 100 per type atomically |
| REQ-INFINITY-002 | Missing | No Fusion machine or seven-stage profile found | Implement machine safety, cooling, shielding and interlocks |
| REQ-INFINITY-003 | Missing | No 260s ideal seven-stage progression found | Implement stage-specific temperature, pressure, power and progress bands |
| REQ-INFINITY-004 | Missing | No staged Fusion recovery/unique output commit found | Persist stage/job/failure/reservations and produce exactly one output |
| REQ-INFINITY-005 | Missing | No three Relay + Core + stabilization ending logic found | Gate ending behind persisted Relay/Core/stabilization events |
| REQ-SAVE-001 | Conflict | Prototype saves in browser localStorage, not Unity persistent-data save storage | Keep web save as legacy; implement Unity save slots only after serializer audit |
| REQ-SAVE-002 | Missing | No immutable post-tick snapshot or safe atomic write found | Implement consistent snapshots and tested temporary/backup/replace behavior |
| REQ-SAVE-003 | Missing | No checksum/recovery UI found | Validate checksums and preserve last valid backup |
| REQ-SAVE-004 | Missing | No versioned migration/rollback system found | Migrate copies only; validate before commit; retain source save |
| REQ-PLAYER-001 | Missing | No 3D gameplay/build/inventory/machine/map input contexts found | Centralize input contexts and verify no cross-context double actions |
| REQ-PLAYER-002 | Missing | No 3D CharacterController/camera collision/interact raycast found | Implement frame-independent movement and collision-safe camera |
| REQ-UI-001 | Partial | Responsive dark-navy HUD and working browser callbacks exist; no authoritative Unity service integration | Bind UI to validated runtime commands and expose costs/errors/states |
| REQ-UI-002 | Partial | CSS transitions and reduced-motion stylesheet exist; full Unity accessibility not verified | Verify keyboard/focus, scaling, subtitles, motion and audio settings in Unity |
| REQ-ART-001 | Missing | No Unity 3D machine/world asset inventory verified | Reuse or create in-Unity modular assets; label Ready/Placeholder/Missing |
| REQ-AUDIO-001 | Missing | No Unity AudioClip manifest or 8×5 track validation found | Audit actual clips and implement one chapter music controller |
| REQ-PERF-001 | Not Verifiable | No target hardware or Unity Profiler capture | Declare hardware/load and record reproducible Profiler metrics |
| REQ-PERF-002 | Not Verifiable | No Unity soak/recovery run available | Run documented long-session and repeated load/recovery tests |
| REQ-RELEASE-001 | Not Verifiable | No Unity Build Profiles/build available | Build from Unity and record target, settings, blockers and test evidence |
| REQ-TEST-001 | Not Verifiable | No Unity Test Runner accessible | Create/execute compatible Edit/Play Mode test matrix |
| REQ-TEST-002 | Not Verifiable | No invariant/property test run accessible | Verify quantity conservation, idempotency, deterministic replay and graph reachability |
| REQ-TEST-003 | Not Verifiable | No executed test evidence available | Record actual results; never report unrun tests as passed |
| REQ-DOC-003 | Partial | This audit records accessible repository facts; Unity UI fields remain unverified | Complete the remaining Unity project environment fields in Editor |
| REQ-DOC-004 | Partial | This matrix is a repository/web-baseline gap matrix | Update statuses with exact Unity files, symbols and test evidence |
| REQ-DOC-005 | Partial | Browser prototype key and fields documented; Unity save schema unknown | Inspect Unity serializer and write migration/backup report before save work |
| REQ-DOC-006 | Partial | Phase 0 record created; no Unity compile/test/build evidence | Append each later Phase with real results |
| REQ-DOC-007 | Partial | Phase 0 decision and blockers recorded below | Re-evaluate only from actual Gate evidence |

## Phase 0 Gate decision

- Web repository baseline: Partial / documented.
- Unity project baseline: Not Verifiable.
- Unity Phase 0 Gate: Not Passed / Blocked.
- Tests run: none. No Unity Editor/Test Runner was available.
- Next allowed work: obtain/identify the actual Unity project, complete the missing environment audit, then evaluate Phase 1.
