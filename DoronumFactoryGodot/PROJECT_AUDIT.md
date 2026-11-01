# Project Audit

- Project root: DoroniumFactoryGodot/
- Engine: Godot 4.4.1 Standard, native 3D.
- Renderer: GL Compatibility.
- Main scene: scenes/main.tscn.
- Runtime architecture: GameState owns inventory/research/story/save; FactorySimulation owns 0.10s production/logistics ticks; PlanetWorld creates seeded terrain, biomes, deposits, trees and POIs; PlayerController owns third-person controls; GameUI owns HUD.
- Save: user://doronium_factory_save.json, schema 1, checksum, temporary write and .bak recovery.
- Build targets: Windows Desktop and Linux/X11.
- No Unity assemblies, Unity packages or browser runtime are used.

## Verification status

- Source files authored and committed.
- Godot Editor parse, smoke tests, Windows export and Linux export: Not Verifiable until the GitHub Actions workflow completes.
- In-engine Play/physics/camera/UI testing: Not Executed in this environment.
- Android export: Missing.
- Full end-to-end campaign: Partial; see SPEC_GAP_MATRIX.md.
