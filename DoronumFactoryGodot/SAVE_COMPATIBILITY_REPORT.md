# Save Compatibility Report

- Current schema: 1.
- Save location: Godot user://doronium_factory_save.json.
- Stored state: world seed, player position/tool, inventory lots, buildings, research, story flags, lore, fusion stage/custody/output buffer, relays/core, stabilization phase, production history and one-time event claims.
- Integrity: checksum over serialized state.
- Write strategy: temporary file, flush, rolling .bak, replace primary.
- Recovery: invalid primary falls back to .bak; future schema versions are not overwritten.
- Migration from the earlier browser prototype is not implemented. Browser localStorage data is not imported into this native game.
- Migration from the abandoned Unity branch is not implemented. This Godot project is a clean native implementation, not a runtime wrapper around Unity code.
- Crash/interrupted-write and corrupted-backup fixtures: Not Executed.
