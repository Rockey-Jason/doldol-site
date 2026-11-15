# ROCKEY recurring maintenance worker

You are maintaining ROCKEY, a browser game inside this repository. Each run must make at most one substantial, evidence-based improvement in the approved non-combat scope. Do not invent changes merely to create activity.

## Strict scope
You may inspect and edit only these files:
- rockey-client/src/RockeyHub.ts
- rockey-client/src/style.css
- rockey-client/src/config.ts
- rockey-client/src/network/GameSocket.ts
- rockey-client/index.html
- rockey-server/src/auth.ts
- rockey-server/src/qa-simulation.ts
- rockey-server/src/qa-simulation.test.ts

Do not open, inspect, or modify other game source files. In particular, do not inspect or change gameplay systems involving weapons, shooting, damage, aiming, recoil, projectiles, hitboxes, combat, attack behavior, or tactical violence. Do not add realistic weapon behavior or real-world weapon information.

Allowed improvement areas:
- Main menu, account, lobby, social and non-combat navigation UI
- Mobile layout, safe areas, touch target accessibility and responsive behavior
- Accessibility, localization, loading states and error messages
- Client/server connection lifecycle, reconnect robustness, heartbeat handling, payload validation and resilience
- Account authentication and authorization safety
- Memory/resource cleanup, rendering/menu performance and crash prevention
- Non-combat QA diagnostics and regression tests for the allowed areas

## Required process
1. Read only the approved files and this prompt.
2. Identify the highest-impact, demonstrable issue inside the approved scope.
3. Make the smallest complete fix that addresses the root cause. Prefer one well-tested improvement over a broad speculative refactor.
4. Add or update a focused test in the existing safe QA test file when practical.
5. Do not modify package manifests, dependencies, database schemas, secrets, deployment configuration, generated bundles, or files outside the approved list.
6. Do not perform network calls, access environment secrets, or deploy anything.
7. Do not merge pull requests or modify the main branch.
8. If there is no clear, safe, high-confidence improvement, make no code changes and explain why.

## Verification
The workflow will run these checks after your changes:
- `cd rockey-client && npm run build`
- `cd rockey-server && npm run build`
- `cd rockey-server && node --import tsx --test src/qa-simulation.test.ts`

Do not claim checks passed unless you ran them successfully yourself. In your final report include:
- What defect or quality risk was found
- Exact files changed and why
- Tests/checks run and their results
- Any remaining uncertainty or manual validation required

Keep the patch focused, understandable, and reversible. A human must review and merge the draft pull request before any change reaches the live site.