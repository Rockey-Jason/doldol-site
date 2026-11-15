# ROCKEY 30-minute free quality checks

ROCKEY uses a scheduled GitHub Actions workflow for automated checks. The workflow is deliberately configured **without OpenAI API, Codex, paid AI services, or API keys**.

## Schedule
- GitHub Actions requests a run every 30 minutes using `7,37 * * * *` (UTC).
- GitHub may delay scheduled starts during platform load; this is not a hard real-time guarantee.
- A run can also be started manually from the Actions tab.
- Pushes to ROCKEY client/server files and the Dori Life/site validation files trigger checks.

## Each cycle
1. Installs the existing client and server dependencies without changing package lockfiles.
2. Builds and type-checks the ROCKEY client.
3. Builds the ROCKEY server and runs the non-combat network QA tests.
4. Validates Dori Life animation choreography and site files.
5. Removes temporary dependencies and generated build output from the runner.

## Cost and AI behavior
- This workflow does not read or use OPENAI_API_KEY.
- It does not call the OpenAI API or Codex.
- It does not create AI-generated code changes or pull requests.
- The repository is public and the workflow uses standard GitHub-hosted runners. GitHub documents standard runner usage on public repositories as free.
- This configuration removes OpenAI API usage charges from the recurring ROCKEY checks. It does not change any separate billing settings on external accounts.

For additional safety, delete the now-unused OPENAI_API_KEY repository secret from **Settings → Secrets and variables → Actions**. The workflow no longer references it, so leaving it stored does not cause API usage, but removing unused secrets is recommended.

## What this workflow does not do
These runs perform build, static validation, and automated tests only. They do not autonomously edit ROCKEY source code, merge changes, or deploy the site. Site deployment remains controlled by the separate Pages workflow.

## Manual run
Open the repository's **Actions** tab, select **ROCKEY 30-minute free quality checks**, and choose **Run workflow**.
