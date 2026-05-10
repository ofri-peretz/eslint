# GitHub Workflow Maintenance Checklist

> **Purpose:** Consistency and best practices when editing or adding GitHub Actions workflows in this monorepo.

## 🎯 When to Use This Checklist

- Adding a new workflow file under `.github/workflows/`
- Modifying any existing workflow (CI, release, scheduled jobs, version-matrix gates)
- Changing a pattern (env block, concurrency, action version, retry logic) that other workflows mirror

## 📋 Checklist: Adding a New Workflow

### 1. File Conventions

- [ ] **Filename:** lowercase, kebab-case, `.yml` extension (e.g. `eslint-version-matrix.yml`)
- [ ] **Top-of-file docstring:** explain *what the workflow does and why*, not just the trigger. The version-matrix file is a good template.
- [ ] **Cron triggers:** if this workflow uses `schedule:`, confirm it's actually needed — quota conservation is the explicit reason cron triggers across this repo are commented out (see commit `7fed8416`)

### 2. Required Header Fields

- [ ] **`name:`** human-readable, distinct from filename
- [ ] **`on:`** specify trigger explicitly — never rely on the implicit `pull_request: [opened, synchronize]` default; declare every event you want
- [ ] **`concurrency:`** group + cancel-in-progress for any non-release workflow that can be re-triggered (avoids wasted minutes)
- [ ] **`permissions:`** start with `contents: read` and add only what the workflow needs

### 3. Job Configuration

- [ ] **`runs-on: ubuntu-latest`** unless a specific OS is required
- [ ] **`timeout-minutes:`** set explicitly (the default 360 is too lenient for a stuck job)
- [ ] **`strategy.fail-fast: false`** for matrix workflows when each cell is independent (don't kill other cells when one fails)

### 4. Standard Steps

- [ ] **Checkout:** `actions/checkout@v4`
- [ ] **Node:** `actions/setup-node@v4` with `node-version` matching `package.json`'s `engines.node`, and `cache: npm`
- [ ] **Install:** `npm ci` (uses lockfile, faster, fails on drift) — never `npm install`
- [ ] **Build / test / lint:** invoke via Turborepo (`npx turbo run <task> --filter=<scope>`). The `--filter` is what scopes work to a package; without it everything builds.

### 5. ESLint-Version Matrix Concerns (if applicable)

If the workflow exercises plugins or formatter behavior that depends on ESLint version, it MUST be in the matrix per [`docs/ESLINT_VERSION_SUPPORT.md`](../../docs/ESLINT_VERSION_SUPPORT.md). The canonical example is [`.github/workflows/eslint-version-matrix.yml`](../../.github/workflows/eslint-version-matrix.yml) — `node × eslint × bench` with v8/v9/v10.

### 6. Failure Surface

- [ ] **`continue-on-error:`** use sparingly. Only for advisory checks (e.g. ILB regression on PR smoke runs); production gates should fail loudly.
- [ ] **Artifact upload:** for any workflow that produces a result (benchmark JSON, lint report, coverage), `actions/upload-artifact@v4` with `if: always()` so the artifact survives a failed job
- [ ] **`retention-days:`** keep tight (14 is the project default for benchmark artifacts)

## 📋 Checklist: Modifying an Existing Workflow

- [ ] **Read the docstring** at top of file — most workflows in this repo explain *why* they exist and *when* to break the rule. Don't change behavior without acknowledging the rationale.
- [ ] **Pattern propagation:** if you're changing a shared pattern (e.g. node version pin, concurrency group format), grep for it across all workflows: `grep -l '<pattern>' .github/workflows/*.yml`
- [ ] **Lint:** `actionlint` is wired up via `npm run lint:workflows` — run it locally before pushing
- [ ] **Test the trigger path:** for cron-triggered workflows, you can test via `workflow_dispatch` (must be in the `on:` block)

## 📋 Checklist: Repo-Wide Pattern Change

When changing a pattern that *all* workflows share, update every file in lockstep. The current inventory + grouping lives in [`../../.github/workflows/README.md`](../../.github/workflows/README.md). Run `ls .github/workflows/` to refresh if that index is stale.

## ⚠️ Common Mistakes

- ❌ **Mixing `npm install` and `npm ci`** — workflows must use `npm ci` for reproducibility
- ❌ **Missing `concurrency:` block** on PR-triggered workflows — burns minutes on superseded commits
- ❌ **Leaving `continue-on-error: true` on a production gate** — turns a real failure into silent green
- ❌ **Hard-coding plugin names in the matrix** — use `--filter=...` patterns or read from workspaces config
- ❌ **Adding a cron trigger without commenting out** — the project policy is to leave `schedule:` commented unless explicitly justified
- ❌ **Skipping `actionlint`** — almost every YAML mistake is caught by it
