# CI, release and deploy

> Moved out of AGENTS.md on 2026-11-23. The required checks are declared once, in `scripts/setup-branch-protection.sh`; `scripts/__tests__/claude-md-contract.test.ts` holds the ship-a-pr skill to that list.

## Docs deploy: no Vercel git integration

**Correction, 2026-11-23:** this section predates `auto-deploy.yml`. Every push to `main` now
dispatches `deploy-docs.yml` for turbo-affected apps; the points below still hold for the
manual path and for previews.

`apps/docs` is a Next.js app deployed to Vercel. **It does not auto-deploy via Vercel's git integration.**

- `vercel.json` sets `git.deploymentEnabled: false` — Vercel ignores pushes
  to this repo entirely (no production deploy, no PR previews).
- `deploy-docs.yml` is the single deliberate path. Trigger it from the
  Actions tab or:
  ```bash
  gh workflow run deploy-docs.yml -f environment=preview
  gh workflow run deploy-docs.yml -f environment=production
  ```
- Each deploy is gated by GitHub Environments (`docs-preview` /
  `docs-production`) — add required reviewers in Settings → Environments
  if you want an approval step before prod.

Required secret: `VERCEL_TOKEN`. Org + project IDs auto-detect from
`.vercel/project.json` when present, otherwise add `VERCEL_ORG_ID` +
`VERCEL_PROJECT_ID`.

---

## Release flow (closed-loop) — packages

A user-visible change ships in **four hands-off steps**:

1. **Feature PR** — contributor commits a `.changeset/*.md` (the
   `Changesets` PR-time check warns if missing). PR merges normally
   when the Quality Gate is green.
2. **Version PR** — `changesets-pr.yml` opens / refreshes a "Version
   Packages" PR on every push to main. It bumps every affected
   `package.json`, regenerates each `CHANGELOG.md`, and deletes the
   consumed changeset files. **Auto-merge is enabled on this PR**, so
   it merges itself when the Quality Gate is green (provided
   `RELEASE_BOT_PAT` is set, or you've approved the bot PR once).
3. **Publish** — `release.yml` fires on the resulting push to main,
   detects which packages have a version diff vs npm, and fans out a
   matrix job per package: `npm publish --provenance` + git tag + GitHub
   Release with notes from `CHANGELOG.md`.
4. **Drift watch** — `release-hygiene.yml` runs weekly, compares git
   tags ↔ npm versions ↔ GitHub Releases, and opens a tracking issue if
   anything diverges. Auto-closes the issue when drift clears.

Every step is **idempotent** — re-running after a partial failure is
always safe. Recovery flows are documented in `CONTRIBUTING.md`.

---

## Reports / where to look

When CI runs, look at these step summaries (each workflow's "Summary"
panel on its run page):

- **Quality Gate** — 9-row pass/fail table per gate.
- **Release** — per-package row with npm + GH Release links + collapsible release notes.
- **Changesets** — push side: link to Version PR; PR side: changeset present / not-needed / missing.
- **Release Hygiene** — drift table with recovery commands.
- **SDK Compatibility** — matrix-wide rollup ("X/N SDKs compatible").

Workflow filenames map 1:1 to job names in the Actions list. Dynamic
`run-name:` titles surface the PR number / commit message / mode at a
glance.

---

## Evaluation infrastructure (gap-closure)

Every measurable claim about Interlace or peers reduces to a row in
[`distribution/EVALUATION_METRICS.md`](../distribution/EVALUATION_METRICS.md).
Each row points at one of these scripts; outputs land under
`benchmark-results/`. CI workflows under `.github/workflows/` enforce
the gates.

| Script                              | npm script                             | Output                                                                                | CI workflow                            |
| :---------------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------ | :------------------------------------- |
| `scripts/ilb-resource-profile.ts`   | `npm run ilb:resource-profile`         | `benchmark-results/resource-profile.{json,md}`                                        | (manual / scheduled)                   |
| `scripts/fetch-peer-health.ts`      | `npm run peer-health`                  | `benchmark-results/peer-health.{json,md}`                                             | `peer-health.yml` (weekly Monday cron) |
| `scripts/audit-cve-rule-latency.ts` | `npm run audit:cve-latency[:strict]`   | `benchmark-results/cve-rule-latency.{json,md}`                                        | `cve-latency.yml` (PR + nightly)       |
| `scripts/audit-api-surface.ts`      | `npm run audit:api-surface[:strict]`   | `.agent/api-surface-manifest.json` + `benchmark-results/api-surface-coverage.md`      | `api-surface.yml` (PR gate)            |
| `scripts/check-per-rule-budget.ts`  | `npm run check:per-rule-budget[:soft]` | `benchmarks/budgets/per-rule-p95.json` + `benchmark-results/per-rule-budget-check.md` | `per-rule-budget.yml` (PR gate)        |

Schemas for the three JSON artifacts live at
`scripts/schemas/{cve-rule-latency,api-surface-manifest,per-rule-budget}.schema.json`.
Unit tests at `scripts/__tests__/gap-closure.test.ts` (`npx vitest run scripts/__tests__/`).

**Repo invariant:** never reintroduce `(gap)` markers into
EVALUATION_METRICS.md. Adding a metric without a measurement is a
documentation regression — write the script, wire the npm command,
add the workflow, then update the metrics table.

The public-facing surface for this whole system is
[`/docs/getting-started/concepts/transparency`](../apps/docs/content/docs/getting-started/concepts/transparency.mdx).

## Branch Protection

- `main` is protected — no direct pushes; auto-managed via
  `scripts/setup-branch-protection.sh`.
- Required checks: **oxlint (fast pass)**, **Quality (Full) Gate** (the
  aggregate job from `quality-full.yml`; new gates join its `needs:`) and
  **review**. `strict: false` — a PR need not be up to date with `main`; the
  push-to-main Quality (Full) run is the backstop (ADR 0012).
- No required human approval; conversations must be resolved before merge.
- Linear history enforced (squash/rebase only) — keeps changesets-driven
  CHANGELOGs clean.

---

## Promotion gate (three-tier CI)

Validation is layered into three tiers so cheap signal runs on every commit
while heavy gates only fire on PRs you're ready to land. The goal: keep the
fast-loop signal tight without burning GHA minutes on draft work.

### T1 — Pre-commit (lefthook, staged files, <30s)

Runs on `git commit`. Configured in `lefthook.yml`'s `pre-commit:` block.
Catches the cheap-to-detect issues: oxlint, markdownlint on staged `.md`,
oxlint shim drift, and `turbo run test --filter=...[origin/main]` (affected
packages only). Adding more here makes commits slow — keep it tight.

### T2 — Pre-push (lefthook, full local battery, ~2–4 min)

Runs on `git push`. Configured in `lefthook.yml`'s `pre-push:` block. Mirrors
the heavy CI gate so a clean local push means CI will be green:

- `turbo run typecheck` / `build` / `test`
- Full markdown lint
- Portability audit, lockfile sync, workflows lint, changelog status
- Oxlint shim drift + shim verify

Run the same battery outside of `git push` with:

```bash
npm run ci:local
```

**Always run `npm run ci:local` before marking a PR ready-for-review.**

What's _not_ in T2 (cloud-only, intentional):

- CodeQL — runs on GitHub's infrastructure with security-events upload.
- Lighthouse — needs a clean Chrome instance.
- ILB cross-version matrix — multi-node-version, multi-eslint-version axes.

### T3 — CI on promote (workflow_dispatch + ready_for_review + label)

The heavy workflows (CodeQL, benchmark, check-links, ILB matrix,
oxlint-parity, `quality-full.yml`)
**do not run automatically on every WIP push.** They fire only when a PR is
"promoted":

- The PR is marked **ready-for-review** (out of draft), OR
- The PR is labelled **`run-full-ci`**, OR
- A maintainer manually triggers via `gh workflow run <name>.yml`, OR
- A weekly cron for drift detection. The heavy workflows are staggered across
  the week, not bunched on one morning — read the day from the workflow, not
  from this list: `quality-full` Sun 04:00, `oxlint-parity` Sun 10:00,
  `codeql` Mon 03:17, `benchmark` Tue 09:00, `lighthouse` Wed 04:05,
  `check-links` Fri 04:25, `eslint-version-matrix` Sat 09:30 (all UTC).

`lighthouse` is the exception to the promote model: it has **no `pull_request`
trigger at all**. Narrowing its paths still left a 9.9-minute advisory job on
docs PRs whose verdict nobody could act on, so it is cron-only (plus
`workflow_dispatch`), where it is a hard gate that writes a scores-and-breaches
report to the job summary and files a `perf`-labelled tracking issue. To get
numbers on a branch, dispatch it by hand.

Each heavy workflow has a `gate` job that decides `run=true` / `run=false`.
Downstream jobs `needs: gate` + `if: needs.gate.outputs.run == 'true'`. A
skipped gate surfaces as a workflow-level "skipped" status, not a failing
required check.

Workflows that always auto-run on every PR push (T0 fast loop):

| Workflow            | Runtime                  | What it gates                                    |
| ------------------- | ------------------------ | ------------------------------------------------ |
| `quality.yml`       | ~30s                     | oxlint, markdown, lockfile, workflows, changelog |
| `docs.yml`          | ~45s                     | docs structure validation                        |
| `a11y.yml`          | ~60s                     | axe scan of route archetypes                     |
| `changesets-pr.yml` | ~21s (Changeset present) | every PR has a changeset                         |

### Triggering a full CI run on a draft PR

```bash
gh pr edit <PR-number> --add-label run-full-ci
```

Or via the GitHub UI: PR sidebar → Labels → `run-full-ci`. The label persists
across pushes — subsequent commits re-run the full battery until you remove
it. Drop the label or mark the PR ready-for-review when you're confident.

---

## Secrets / variables

| Name                   | Type   | Purpose                                                                | Required? |
| ---------------------- | ------ | ---------------------------------------------------------------------- | --------- |
| `CODECOV_TOKEN`        | secret | Coverage uploads (`codecov.yml`)                                       | optional  |
| `NVD_API_KEY`          | secret | CWE/CVE data sync (manual via CLI)                                     | optional  |
| `DEV_TO_API_KEY`       | secret | dev.to article sync (`docs-data.yml`)                                  | optional  |
| `RELEASE_BOT_PAT`      | secret | Self-approve Version PR so auto-merge can land it without manual click | optional  |
| `SCORECARD_REPO_TOKEN` | secret | Branch-protection check in OSSF Scorecard                              | optional  |
| `TURBO_TOKEN`          | secret | Vercel Remote Cache token (free for OSS) — 50–80% CI build speedup     | optional  |
| `TURBO_TEAM`           | var    | Vercel team slug, paired with `TURBO_TOKEN`                            | optional  |

All are optional — workflows fall back gracefully when unset.
