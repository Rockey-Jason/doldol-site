# ROCKEY 30-minute maintenance cycle

This repository contains a scheduled, AI-assisted maintenance workflow for ROCKEY.

## Schedule
- GitHub Actions schedule: `7,37 * * * *` (UTC), which requests a run every 30 minutes.
- GitHub schedules can start late during platform load and are not a hard real-time guarantee.
- The schedule runs from the repository's default branch.

## What each cycle does
1. Installs the existing client and server dependencies without changing lockfiles.
2. Runs the client build, server build, and the non-combat network QA simulation tests.
3. When the repository secret `OPENAI_API_KEY` exists, runs the Codex GitHub Action with a strict non-combat maintenance scope.
4. Rejects any generated patch that changes a file outside the approved allowlist.
5. Re-runs all checks after the patch.
6. Opens or updates one **draft** pull request. It never merges or deploys automatically.

The automation is intentionally limited to account, menu/lobby/social UI, mobile responsiveness, accessibility, connection reliability, non-combat QA, and related stability. It must not change weapon or combat behavior.

## One-time setup required
The GitHub Actions secret `OPENAI_API_KEY` must be added in the repository's **Settings → Secrets and variables → Actions**. Do not put the key in source files, workflow YAML, issues, or chat. The Codex step is skipped until this secret exists; the build and QA checks still run.

## Review and release
Review the single draft PR created/updated by the workflow. Only merge changes after reviewing the diff and checks. The existing Pages deployment workflow handles publishing after a human-reviewed merge.

## Manual run
Open the repository's **Actions** tab, select **ROCKEY 30-minute maintenance**, and choose **Run workflow**.
