# DORONIUM FACTORY — 3D WebGL Integration

Date: 2026-11-02
Repository: Rockey-Jason/doldol-site
Branch: main

## Delivered

- Added `doronium-factory/world3d.js`, a Three.js 0.180.0 WebGL renderer.
- Replaced the factory map's Canvas 2D draw path with a 3D scene while retaining the existing simulation and account save layer.
- Added a 3D tile world, fog, lighting, shadows, resource formations, tree models, player engineer, and procedural machine models.
- Connected pointer raycasting, drag camera movement, zoom, player movement, selection highlights, and machine state indicators.
- Kept the existing factory URL and main-site entry links.
- Kept the existing local save keys and Supabase cloud save key unchanged.
- Added JavaScript syntax and renderer contract checks to the factory GitHub Actions workflow.
- Updated the game README with the new renderer and explicit remaining validation.

## Verification

- GitHub Actions Doronium Factory validation passed on commit `c9b090a6d89ceef70de066482b6259d16f433c71`.
- GitHub Pages deployment passed on the same commit.
- Later commits add small renderer/picking/cache/documentation refinements; their workflows are tracked separately and must complete before release sign-off.
- No real browser automation, mobile-device profiling, or long-session soak test was executed in this integration pass.

## Important scope boundary

This is a browser-delivered 3D WebGL game integration, not a native Godot export. The repository audit did not find a Godot project root. Machine visuals are procedural primitives, not a finished authored asset pack. Existing simulation systems are preserved, but this work does not certify full conformance to the entire v4.5 specification, including every item ownership, deterministic replay, failure, logistics, fluid, and save-migration requirement.

## Next release gates

1. Verify actual rendered gameplay in current Chrome, Edge, Safari, Android Chrome, and iOS Safari.
2. Run build/place/rotate/select/harvest/production/research/fusion/relay/core/ending regression tests.
3. Test guest and signed-in saves, account switching, cloud conflict recovery, and legacy save compatibility.
4. Profile low-end mobile GPU/CPU and memory over at least 60 minutes.
5. Replace placeholder procedural machine geometry with authored models, materials, and animation.
6. Reconcile every requirement in `Docs/SPEC_GAP_MATRIX.md` against implemented code and executable tests.
