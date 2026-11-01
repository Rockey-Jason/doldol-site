# DORONUM FACTORY — INFINITE INDUSTRY (Native 3D)

A standalone 3D factory automation and exploration game for Windows/Linux desktop and Android. It is a Godot project, not a browser game and not a Unity project.

## Engine

- Godot **4.7.2-stable**
- GDScript
- 3D world, third-person player controller, physics collision and raycast interaction
- Compatibility renderer (OpenGL 3.3 / OpenGL ES 3.0 target)

Godot 4.7.2 is the official stable release selected for this project.

## Open and run

1. Install Godot 4.7.2 Standard.
2. Import the `DoronumFactory3D/project.godot` file in the Godot Project Manager.
3. Press F6/F5 or use the Play button.

## Controls

### PC
- WASD: move
- Mouse right button: capture mouse and look around
- Mouse move while captured: camera look
- Mouse wheel: zoom
- E / left mouse: interact / place selected building
- Shift: sprint
- Space: jump
- B: construction, I: inventory, T: research, M: mission log
- Esc: release mouse / pause

### Mobile
- Left virtual stick: move
- Drag the right side: look around
- E button: interact / place building
- Touch the right-side HUD tabs for building, crafting, inventory, research, skills and missions

## Progression and endgame

The project data includes the 18 canonical research entries, 20 skill nodes, the 15 canonical Doronium IDs, and the 7-stage/260-second ideal Infinity Fusion sequence. Fusion requires the 15 input types ×100 with each input verified as non-synthetic, Quality ≥90 and Purity ≥90. Fusion completion alone does not end the story: all three separate relay sites, the central core, the inspected Infinity Doronum and the 60-second planetary stabilization sequence are required.

## Save

The native game currently saves locally in the player's Godot user data directory. Save data is versioned and stores the world seed, player state, inventory and item metadata, buildings, machine buffers/jobs, research, skills, story, relays, fusion and stabilization state. Account login / cross-device cloud sync is not yet connected to the native build.

## Validation

Run the data contract validator:

```bash
python3 DoronumFactory3D/tools/validate_data.py
```

The GitHub Actions workflow runs that validator and opens the project in Godot headless mode to check script parsing and startup. Desktop/Android export and in-game device testing remain separate release gates until those jobs actually pass.
