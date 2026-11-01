# DORONUM FACTORY — INFINITE INDUSTRY (Unity 6)

This is the native Unity game project. It is separate from the GitHub Pages browser prototype in `doronium-factory/`.

## Engine lock

- Unity 6.3 LTS — Editor 6000.3.0f1
- Universal Render Pipeline package 17.3.0
- Native 3D third-person exploration / factory simulation
- 2048m × 2048m overworld, 1 Unity unit = 1 metre
- 0.10 second deterministic simulation tick

## Open

1. Install Unity Hub and Unity Editor **6000.3.0f1**.
2. Open the `DoronumFactoryUnity` folder from Unity Hub.
3. Wait for Package Manager to resolve URP and for scripts to compile.
4. Open `Assets/DoronumFactory/Scenes/Main.unity` and press Play.

The starter scene is a real 3D scene with a generated terrain, third-person engineer, resource deposits and Dori Meat Trees. The world and machine visuals are generated at runtime from the project data; no browser runtime is used.

## PC controls

- WASD: move
- Mouse: look (right mouse button to capture)
- Shift: sprint
- Space: jump
- E: interact / harvest / inspect
- B: build menu
- I: inventory
- T: research
- M: missions
- Esc: release cursor / pause

## Canonical final progression

The project data locks the v4.5.0 canonical 18 research IDs, 20 skill nodes, 15 Infinity input IDs, Dori Meat Tree 60s / 2L / 1 yield, the 7 fusion stages (ideal 260s running time), and the three-relay → Core → Planetary Stabilization ending order.

## Validation honesty

The source tree and static data validators are checked in. A successful C# parse in an external checker is not a substitute for importing the project in Unity Editor, running Play Mode, running Unity Test Runner, or making a platform build. Those Unity Editor gates must be run on a machine with this exact editor version before this project is called release-ready.
