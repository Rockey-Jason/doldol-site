# ROCKEY 30-minute maintenance cycle

This repository contains a scheduled, AI-assisted maintenance workflow for ROCKEY.

## Schedule
- GitHub Actions cron: `7,37 * * * *` (UTC), requesting a run every 30 minutes.
- GitHub may delay scheduled starts during platform load; this is not a hard real-time guarantee.
- Scheduled workflows run from the latest commit on the default branch.

## Each maintenance cycle
1. Installs existing client and server dependencies without changing lockfiles.
2. Runs the client build, server build, and non-combat network QA simulation tests.
3. When the repository secret `OPENAI_API_KEY` exists, runs the official Codex GitHub Action with a strict non-combat scope.
4. Allows inspection and edits only to:
   - `rockey-client/src/style.css`
   - `rockey-client/src/network/GameSocket.ts`
   - `rockey-client/index.html`
   - `rockey-server/src/auth.ts`
   - `rockey-server/src/qa-simulation.ts`
   - `rockey-server/src/qa-simulation.test.ts`
5. Rejects new files and changes outside that allowlist.
6. Runs the build and allowed tests, exports the patch, then applies it in a separate job and repeats the checks.
7. Opens or updates one **draft** pull request. It never merges or deploys automatically.

The maintenance agent is forbidden from inspecting or changing combat/gameplay source. Work is limited to presentation styling, accessibility, responsive layout, connection resilience, account authentication and non-combat QA. Each cycle makes at most one evidence-based improvement; when no safe improvement is justified, it records that no change was needed.

## One-time setup required
Add an `OPENAI_API_KEY` as a repository Actions secret under **Settings → Secrets and variables → Actions**. Never put the key in source files, workflow YAML, issues, or chat. Until the secret is configured, the scheduled workflow still runs build and QA checks, but skips AI-assisted code repair and draft PR creation.

API use may incur charges; review the account and billing settings with a parent or guardian before enabling it.

## Review and release
Review the single draft PR and its Actions report. Only merge changes after reviewing the diff and successful checks. The existing Pages deployment workflow handles publishing after a human-reviewed merge.

## Manual run
Open the repository's **Actions** tab, select **ROCKEY 30-minute maintenance**, and choose **Run workflow**.
