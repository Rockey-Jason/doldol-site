# ROCKEY BUILD 01

ROCKEY is a browser-based Three.js + Rapier 3D competitive FPS module for the Dori Site.

## Client
- Folder: rockey-client
- Install: cd rockey-client && npm install
- Dev: npm run dev
- Typecheck/build: npm run build
- Vite output: repository-root /rockey/

The client uses the existing Dori Site Supabase Auth session. The public publishable/anon key is intentionally public; never add a service-role key to client files.

## Server
- Folder: rockey-server
- Install: cd rockey-server && npm install
- Dev: npm run dev
- Build: npm run build
- Start: npm start
- WebSocket endpoint: /ws
- Health endpoint: /health

Required server environment variables:
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
ALLOWED_ORIGINS

The service-role key must be configured as a private Render environment variable only.

## Database
Migration: supabase/migrations/20261030210000_rockey_core_schema.sql
It creates isolated ROCKEY tables and read-only client policies. Server-only game results are written through the service-role client.

## First playable scope
- Training Facility 3D scene
- Rapier capsule movement and obstacle collision
- First-person / third-person camera toggle
- R-16 prototype weapon, ammo and server fire-rate checks
- 1v1, 2v2, 3v3, Ranked and FFA matchmaking queues
- Private rooms with expiring shareable invite codes
- Server-authoritative health, hitscan, scoring and match results
- Supabase match history and profile statistics

This is a foundation build, not a public competitive launch. Before public launch, complete the remaining friend management UX, production anti-cheat review, reconnect rules, persistent matchmaking across multiple instances, extra maps and weapons, balance tests, load testing and mobile device testing.

## Render deployment
Create a Node web service from the repository branch feature/rockey-foundation.
Root directory: rockey-server
Build command: npm install && npm run build
Start command: npm start
Health check: /health
Region: Singapore

Set all four required server variables in Render. Do not commit .env.
