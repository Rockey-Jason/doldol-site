# ROCKEY BUILD 02

ROCKEY is a browser-based Three.js + Rapier 3D competitive FPS module for the Dori Site.

## Client
- Folder: rockey-client
- Install: cd rockey-client && npm install
- Dev: npm run dev
- Typecheck/build: npm run build
- Vite output: repository-root /rockey/

The client uses the current Dori Site Supabase Auth session. The public publishable/anon key is intended for browser use. Never put a service-role secret in client files.

### Client features
- Five distinct maps: Training Facility, Neon District, Frostline, Orbital Dock and Canyon Relay
- Ten weapons with individual damage, headshot multiplier, rate of fire, magazine, reload and range
- Primary/secondary loadout selection
- Friends search, requests, online status and invite actions
- Global leaderboard and season rewards overview
- Live match spectator entry and match replay viewer
- First-person / third-person, keyboard/mouse and touch controls
- Low / Balanced / High graphics presets and persisted sensitivity
- Mobile lower pixel ratio, disabled shadows and held-fire touch control

## Server
- Folder: rockey-server
- Install: cd rockey-server && npm install
- Dev: npm run dev
- Build: npm run build
- Start: npm start
- WebSocket endpoint: /ws
- Health endpoint: /health

Required private Render environment variables:
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
ALLOWED_ORIGINS

SUPABASE_SERVICE_ROLE_KEY must contain the actual project secret, set only in Render's private Environment settings. Never commit it.

### Server features
- Supabase access-token verification and Dori Site ban/suspension checks
- Existing site account mapping; ROCKEY profile created on first verified connection
- Friends and multi-recipient private-room invites
- Matchmaking by mode and selected map
- Server-authoritative movement, jump, ammo, reload, weapon switch, hit detection and scoring
- Request rate limits and repeated suspicious-input checks
- Reconnect grace period of 30 seconds
- Live spectator snapshots
- Match replay capture at 5 frames per second and server persistence
- Ranked match rating and season-point updates
- Server-issued season reward items and weapon mastery

This is a feature-complete BUILD 02 foundation for these requested systems, not a public competitive launch certification. Anti-cheat is server-side validation and rate limiting, not a commercial anti-cheat product. The in-memory matchmaker/private-room coordinator uses one server instance; horizontal scaling requires a shared queue/coordinator and reconnect store. Load tests, security review and real multi-device playtests are still required.

## Database
- 20261030115224_rockey_core_schema.sql: core isolated ROCKEY tables
- 20261030120902_rockey_build_02_social_seasons_catalogues_replays.sql: seasons, maps, weapons, rewards, replay storage and ranked RPCs
- 20261030121200_rockey_private_room_multi_friend_invites.sql: multiple invited friends per private room

The migrations are applied to the configured Supabase project. All ROCKEY tables use RLS. Client roles are read-only; server writes use the service role. Existing Dori Site wallet, bank, stock and achievements tables are not changed by ROCKEY migrations.

## Render deployment
Service: rockey-game-server
Branch: feature/rockey-foundation
Root directory: repository root
Build command: cd rockey-server && npm install && npm run build
Start command: cd rockey-server && npm start
Health check: /health
Region: Singapore

After creating the service, replace the placeholder SUPABASE_SERVICE_ROLE_KEY with the actual private secret in Render Environment settings. The server process may deploy without it, but authenticated profile, social, match persistence and replay requests cannot work until it is configured.

## GitHub Pages
The ROCKEY client build check runs in .github/workflows/rockey-ci.yml. The existing Pages deploy workflow is on main; this feature branch is not published to the production Pages site until PR #1 is reviewed and merged. Do not merge without reviewing the changes and completing the private Render secret setup.

## Known limitations
- The matchmaking and private-room coordinator is single-instance in-memory.
- The replay viewer plays stored matches from an overhead spectator camera; pause/seek controls are not included.
- Spectating is available for rooms running on this process.
- A user must sign in to ROCKEY once before appearing in friend search.
- Friend-to-friend online invites require both users online.
- Real gameplay, latency, balance, reconnect under network loss and mobile device compatibility need hands-on testing.
