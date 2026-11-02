# Doronium Factory — Project Audit

- Audit date: 2026-11-03
- Target: existing GitHub Pages implementation
- Repository: https://github.com/Rockey-Jason/doldol-site
- Decision: preserve the existing browser game and adapt the master specification to the web runtime (user-approved option A).
- Source specification: `도로늄 공장을 만드는 법.md`, v4.5.0.

## Runtime baseline

| Area | Observed implementation | Status |
|---|---|---|
| Entry point | `doronium-factory/index.html` | Implemented |
| Main game logic | `doronium-factory/factory.js` (ES module, ~114 KB at audit) | Implemented |
| 3D rendering | `world3d.js`, Three.js 0.180.0 from CDN, 2D compatibility fallback | Implemented |
| Terrain | `terrain-system.js`, 192×160 tile world, 5 mine levels | Implemented |
| Styling | `factory.css` | Implemented |
| Browser persistence | localStorage envelope, game key `doronium_factory_infinite_industry_local_v1` | Implemented |
| Cloud persistence | Supabase `dori_cloud_storage`, key `doronium_factory_infinite_industry_v1` | Implemented |
| Automated checks | `e2e/factory-smoke.mjs` Playwright smoke/regression script | Partial / execution not verified in this audit |
| Unity project | No `ProjectSettings/ProjectVersion.txt`, `Packages/manifest.json`, Unity scenes or prefabs were found in the inspected project paths | Not applicable to approved web target |

## Runtime contracts observed

- World dimensions: 192×160 logical tiles.
- Fixed simulation step constant: `STEP = 0.1` seconds.
- Initial world seed: 827142.
- Current save state declares `version: 1`, `worldVersion: 4`.
- Initial player position: (72, 52), surface layer, first-person view.
- Initial survival values: health/hunger/thirst = 100.
- Building limit: 180.
- Current save contains player, survival, tools, inventory, metadata, buildings, nodes, mine deposits, research, campaign, fusion, progression, statistics and settings.
- Machine processing is currently implemented by `tickMachine`; it uses recipe lookup, input consumption, power threshold, temperature/pressure approach, progress and output creation.
- Current power brownout threshold is 0.8 in the inspected machine path.

## Key specification conflicts requiring deliberate web adaptation

1. The master spec is Unity 6-specific, while the deployed game is a browser ES-module/Three.js application. Unity-only deliverables (Scenes, Prefabs, ScriptableObjects, CharacterController, Unity Test Runner) must be translated to equivalent web runtime modules, data contracts, DOM/Canvas UI and Playwright checks.
2. Spec world size is 2048m × 2048m; current world is 192×160 tiles. A conversion scale and migration must be defined before resizing or regenerating saved worlds.
3. Spec forbids natural Doronum veins. Current `makeMineDeposits()` includes multiple Doronum deposit rows. This is a gameplay/spec conflict and must be resolved through a versioned migration, not by silently deleting player-accessible resources.
4. README currently describes five mine levels and natural Doronum examples; documentation is inconsistent with the v4.5.0 canonical rule.
5. Spec requires globally unique non-reused ItemStack IDs and per-stack quality/purity/synthetic state. Current state primarily uses item quantity maps plus item-level metadata; this is not equivalent to stack ownership/reservation semantics.
6. Spec mandates an 18-stage fixed tick ordering. Existing machine tick logic is present, but the full game loop has not yet been proven to implement every canonical stage in that order.
7. Spec requires a single completed-job payload in each machine completion buffer. Existing machine outputs are represented by `b.output`; equivalence and capacity invariants need explicit validation.
8. Existing world generation, campaign, research, factory and save data must be preserved during staged migrations.

## Baseline limitations

- This audit is based on repository source inspection, not a live browser session.
- No actual Android/iOS hardware test was run.
- No Unity compile, Unity Play Mode or Unity build applies to the approved browser target.
- Playwright execution and production Pages deployment must be checked separately from source inspection.
- Do not mark an item as verified merely because a function or UI element exists.
