# DORONIUM FACTORY — BUILD 02 · 3D INTERACTION & REGRESSION

Date: 2026-11-02
Repository: Rockey-Jason/doldol-site
Branch: main

## Delivered in the browser game

- Procedural, facility-specific 3D assemblies for all 22 catalogued facilities: conveyors, storage, power generation, mining, water pumping, Dori farming, smelting, wire processing, assembly, research, reactors, fusion, cooling, relays, market and planetary core.
- State-driven animation for wind rotors, pump/cooling fans, mining drills, furnace vents, wire rollers, assembler arms, research samples, reactor coils and status rings.
- Conveyor payloads are rendered as individual 3D item meshes. Their position follows the same `moveTimer` used by the authoritative belt transfer simulation; item ID and quantity changes rebuild the visual stack.
- Engineer pathfinding uses four-way grid routing and blocks machine/resource footprints. Clicking a resource or machine moves the engineer into an adjacent interaction tile before the interaction is performed.
- Phone-sized touch movement controls and two-pointer orbit/pinch camera gestures.
- A 3D crystal codex for all 15 canonical Doronium variants plus a separate Infinity specimen. Each standard variant maps to a distinct geometry family and material/emissive treatment.
- Reactor synthetic-input preflight now rejects synthetic Dori Meat before consuming it.
- The 3D scene signature no longer changes on every 0.1-second tick; only relevant world/model changes trigger a scene rebuild. This avoids rebuilding the entire map ten times per simulated second.

## Automated regression suite

GitHub Actions runs:
1. JavaScript syntax and runtime contract checks.
2. Chromium desktop WebGL initialization.
3. 15 variant/15 unique crystal-geometry, 18 research node and 22 facility catalog checks.
4. Research dependency graph acyclicity, recipe/material reference checks and seven-stage / 260-second ideal fusion duration.
5. Distinct conveyor mesh count and actual item movement across fixed ticks.
6. Synthetic reactor input rejection without consumption.
7. Night-time low-power behavior, machine pause below the 0.8 power ratio, and no input consumption while paused.
8. Machine-footprint path collision.
9. A virtual 3,600-second production run using exactly 36,000 fixed 0.1-second ticks, including solar generation, smelting, conveyor transfer and storage.
10. Resource conservation assertions for the tested iron route: initial iron ore equivalent and coal equivalent must be conserved across inventory, machine buffers, in-process jobs, outputs and belt payloads.
11. 390×844 touch-enabled Chromium emulation with visible movement pad and engineer movement.

## What these checks do not certify

- The virtual one-hour run is accelerated deterministic simulation, not a 60-minute wall-clock soak.
- Phone-sized Chromium emulation is not a physical Android/iPhone test and does not measure real-device thermal throttling, GPU memory pressure or battery behavior.
- Facility models are code-generated procedural meshes, not bespoke artist-authored production assets.
- The tested recipe/power/logistics path is a focused regression, not proof that every recipe and every possible factory topology has been exhaustively tested.
- The existing power calculation is a global generation/consumption pool; it is not yet a spatially connected electrical network with per-wire topology.
- The existing game does not yet certify the complete v4.5 specification for item GUID ownership/reservations, full fluid graph conservation, deterministic subsystem replay, time-based failure/salvage, save checksums/migrations and every fusion/ending edge case. See `Docs/SPEC_GAP_MATRIX.md` for the remaining audited gaps.

The existing browser save keys and Supabase account save integration are unchanged.
