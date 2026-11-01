# Project Audit

- Project root: `DoronumFactoryGodot/`
- Engine: Godot 4.4.1 Standard; native 3D; no Unity runtime or browser runtime.
- Main scene: `scenes/main.tscn`
- Renderer: GL Compatibility.
- Runtime architecture: `GameState` owns inventory/research/story/ledger/save; `FactorySimulation` owns fixed-tick production, power and basic logistics; `PlanetWorld` owns deterministic terrain/resources/POIs and saved world state; `PlayerController` owns third-person PC/mobile controls; `GameUI` owns tabs/HUD.
- Save schema: 2; schema-1 migration; checksum, temporary write, valid rolling backup and save revision.
- Export targets configured: Windows Desktop, Linux/X11, Android arm64.

## Verification

- Godot editor parse and Fusion smoke tests: passed on commit `e65632c13d799db2bca4f7c2e01823a1632a0623`; this earlier run still reported UI script errors and therefore is not the final validation.
- A later run reached native export but failed because export templates were not installed and the UI still had two inferred-type parse errors. Both issues have been patched; current workflow must be checked before claiming success.
- Main 3D scene boot, latest smoke test, Windows/Linux/Android exports: Not Yet Verified.
- In-engine manual play, touch-device testing and full campaign acceptance: Not Executed.
- See `SPEC_GAP_MATRIX.md` for remaining work.
