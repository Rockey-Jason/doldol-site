# ROCKEY BUILD 03–07 implementation status

This document describes the staged work on `feature/rockey-build-03-07-hardening`.
It is not a claim that all five builds are production-complete. The changes must pass CI and be tested in the deployed browser/server environment before merging.

## Applied in this branch

### BUILD 03 — stability
- Lazy-load the 3D game module only when training or a match is entered.
- Lazy-load Rapier from the game module so physics is not part of the initial menu load.
- Serialize game initialization when map changes are requested while a previous load is pending.
- Dispose unique scene geometries and materials when changing maps; dispose departed remote-player resources and shared player materials.
- Stop held inputs and mobile auto-fire when the page is hidden or the window loses focus.
- Use pointer IDs and pointer-capture cancellation events for touch look, movement, jump, and fire.
- Recalculate the canvas on element resize and visual viewport changes.
- Harden WebSocket authentication timeout, stale-socket replacement, JSON parsing, listener isolation, outbound payload size, and send failures.
- Schedule retry after the initial connection attempt fails, not only after an established socket closes.
- Add server WebSocket ping/pong heartbeat and reduce the maximum inbound message payload.

### BUILD 04 — combat
- The baseline already contains ten weapon definitions and server-side weapon fire-rate/ammo/damage validation.
- Add server-authoritative per-weapon recoil and synchronize the resulting aim to the shooter.
- Add local recoil in the training range.
- Add a short killer-follow killcam clip from server-captured match frames.
- Add hit/headshot marker feedback.
- Smooth remote-player position and rotation updates between server snapshots.

### BUILD 07 — delivery and responsive UI
- Add safe-area-aware mobile control positioning, compact landscape layout, larger touch targets, and reduced-motion support.
- Add pull-request CI coverage and feature branch CI matching for ROCKEY changes.
- Label the staged UI as development BUILD 03/04 rather than claiming BUILD 07 is released.

## Existing capabilities confirmed in the baseline source

- Five maps are defined in `rockey-client/src/catalog.ts`.
- Ten weapons are defined in `rockey-client/src/catalog.ts`.
- Modes include 1v1, 2v2, 3v3, ranked, and free-for-all.
- Player Hub code includes friends, friend requests/invites, leaderboard, season/rewards, loadouts, match history/replays, and live match spectator entry points.
- The game client already has muzzle flash, weapon reload handling, first/third-person camera toggle, and replay playback.

These baseline features were audited; this branch does not claim they were newly implemented or fully verified end-to-end.

## Still required before calling BUILD 03–07 complete

- BUILD 04: full weapon-specific reload/inspect animations, production sound assets/mix controls, richer hit/death effects, and balance testing for all ten weapons.
- BUILD 05: verify all five maps for spawn fairness, collision/navigation, and objective/FFA balance; verify ranked rating changes and season reward claims against the live database.
- BUILD 06: multi-device tests for friend presence, invites, disconnect/reconnect, spectator transitions, replay retrieval, and replay integrity.
- BUILD 07: browser/device performance profiling, low-memory Android testing, accessibility review, visual QA, and end-to-end regression tests.
- Production verification: check Render service health/logs, Supabase schema/RLS/migrations, GitHub Pages asset paths, and real concurrent-player sessions.

## Verification status

- Source changes are committed to this feature branch.
- GitHub Actions client/server build and dependency audit must pass before merge.
- No production deploy or live database mutation is performed by this branch update.
