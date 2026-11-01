# DORONUM FACTORY — INFINITE INDUSTRY
## Phase 0 · PROJECT_AUDIT

- Audit date: 2026-11-01
- Specification: uploaded 도로늄 공장을 만드는 법.md, canonical version v4.5.0
- Repository inspected: Rockey-Jason/doldol-site
- Default branch: main
- Scope: files retrievable through the connected GitHub repository interface
- Unity Editor / VS Code UI access: Not available in this audit session

## 1. Executive finding

The repository currently exposes a GitHub Pages website and a browser-based Doronium Factory prototype. A Unity 6 project root has not been verified.

The checked Unity marker files at the repository root were not found:

| Path | Result |
|---|---|
| ProjectSettings/ProjectVersion.txt | 404 / not found |
| Packages/manifest.json | 404 / not found |
| README.md | 404 / not found |

This does not prove that no Unity files exist anywhere in every repository subdirectory. The available repository interface did not provide a complete recursive tree listing in this audit, and Unity Editor was not available. Therefore nested Unity project roots, scenes, prefabs, scripts, packages, build settings, and Console state are Not Verifiable.

## 2. Files directly inspected

| Path | Evidence | Observed contents |
|---|---|---|
| index.html | fetched from main; 192,990 bytes; blob f7d240bfaecfe2f371aa8968ece6dbfc5b1fd430 | Existing Doldol Site homepage |
| package.json | fetched from main; 141 bytes; blob 22dce8dba053b4ac4c8a3357a5b068d9231b052e | Package name dori-news-bot; dependencies @supabase/supabase-js and nodemailer; not evidence of a Unity project |
| doronium-factory/index.html | fetched from main; 30,201 bytes; blob 6d9c740902ef55e8a0a9a6601d9a1541ebf50409 | Single-file HTML/CSS/JavaScript browser prototype |

The web prototype is the BUILD 01 deliverable added in PR #6. PR #6 was reported as merged by the repository connector. This is repository history evidence, not Unity validation evidence.

## 3. Existing browser prototype baseline

Observed in doronium-factory/index.html:

- Responsive dark-navy industrial web UI.
- 10 facility definitions and 7 research definitions.
- Simplified resource counters for money, ore, alloy, energy, and a single Doronium amount.
- Simplified ore → alloy → Doronium rate calculation.
- Browser timer loop using setInterval with elapsed-time delta; this is not the specification's fixed 0.10-second authoritative simulation tick.
- Browser persistence through localStorage key rockey_doronium_factory_v1.
- An offline reward calculation capped at 8 hours.
- No Supabase client, canonical ITEM_DORONUM_* identifiers, Quality, Purity, or Synthetic lineage were found in the inspected file.
- No Canvas or WebGL 3D runtime was found in the inspected file.

The browser prototype is useful as a visual/interaction reference only. It is not a conforming implementation of v4.5.0 and must not be treated as the Unity game's authoritative runtime.

## 4. Unity project environment

| Audit item | Status | Evidence / limitation |
|---|---|---|
| VS Code project root matches Unity project root | Not Verifiable | Neither application UI is accessible here |
| Unity version | Not Verifiable | Root ProjectSettings/ProjectVersion.txt not found |
| Render pipeline | Not Verifiable | No Unity project settings/Editor access |
| Input System and package versions | Not Verifiable | Root Packages/manifest.json not found |
| Package lock | Not Verifiable | Not inspected from a verified Unity project |
| Scenes / Build Profiles | Not Verifiable | Unity Editor unavailable |
| Scripts / asmdef / ScriptableObjects | Not Verifiable | No complete recursive project tree or Unity Editor view |
| Models / materials / shaders / animations | Not Verifiable | Unity asset inventory unavailable |
| AudioClips / fonts / icons | Not Verifiable | Unity asset inventory unavailable |
| Console compile baseline | Not Verifiable | Unity Editor unavailable |
| Test Runner availability/results | Not Verifiable | Unity Editor unavailable |
| Build target and build result | Not Verifiable | Unity Editor unavailable |
| Current Unity save schema/path | Not Verifiable | No Unity serializer/save implementation inspected |
| Browser prototype save key | Partial | rockey_doronium_factory_v1 in doronium-factory/index.html |

## 5. Canonical design constraints to preserve

These are specification-derived constraints, not claims of current implementation:

1. Surface world is 2048m × 2048m; X/Z bounds are ±1024m. Underground depth is separate from surface Y.
2. Natural Doronium and Infinity Doronium veins do not exist.
3. A Dori Meat Tree has a 60-second base growth cycle, consumes 2L water per cycle, yields one Dori Meat, regrows without being destroyed, and has base Purity 90 / maximum 100.
4. Base Doronium production is non-synthetic Dori Meat ×10 → Doronium ×1 through the specified heat, pressure, molecular rearrangement, and resonance process.
5. Simulation tick is fixed at 0.10 seconds with the exact PART IV update order.
6. PowerRatio ≥1.0 gives full progress; 0.80–below 1.0 gives proportional progress; below 0.80 pauses production progress.
7. Quality and Purity are independent values. Synthetic provenance must not be erased.
8. ItemStack ownership, reservation, split/merge, and transaction commits must conserve quantities and use non-reusable IDs.
9. Infinity inputs are the exact 15 canonical Doronium IDs ×100 each, all non-synthetic, each Quality ≥90 and Purity ≥90. Successful output is exactly one Infinity Doronium.
10. Infinity's seven ideal RUNNING stages total 260 seconds. Infinity creation alone does not trigger the ending; three Relays, Core, and Planetary Stabilization are also required.

## 6. Risks and protection decisions

| Risk | Severity | Decision |
|---|---|---|
| A browser prototype may be mistaken for the Unity project | Critical | Keep it labeled as prototype/reference; do not claim Unity completion |
| Existing localStorage saves may be lost by replacing the web prototype | High | Do not overwrite or delete the current prototype or its save key |
| No Unity project root verified | Critical | Do not create guessed scenes, packages, or replace project settings |
| Existing site contains unrelated production features | High | Keep all changes scoped; no broad homepage or site rewrite during Phase 0 |
| Current web save is local to a browser origin/profile | High | Do not claim account-wide or cross-device synchronization |
| Offline production conflicts with v4.5.0 default PausePolicy | High | Keep the difference documented; do not silently carry it into Unity |

## 7. Phase 0 outcome

Repository/web baseline: inspected to the extent shown above.

Unity Phase 0 Gate: Not Passed / Blocked. A real Unity project root and Unity Editor baseline have not been verified. The missing evidence is explicitly recorded rather than guessed.

Next required input for Phase 1: provide the actual Unity 6 project in a repository/location accessible for inspection, including ProjectSettings, Packages, and Assets, or identify the repository that contains that project. Once it is available, repeat the Phase 0 checks in VS Code and Unity Editor before implementing Phase 1.

No Unity compile, Unity Test Runner, Play Mode test, Build Profiles build, or target-hardware profiling was run during this audit.
