# AGENTS.md - AI Assistant Context

> **Purpose**: Context file for LLMs (Claude, GPT, Gemini, etc.) working on this repository.
>
> **See also:** [ARCHITECTURE.md](./ARCHITECTURE.md) for this repo's bird's-eye map, and [`../agents/ARCHITECTURE.md`](../agents/ARCHITECTURE.md) for the broader **Interlace** ecosystem (how this repo fits with `agents/` and `serverless/`).

## Repository Overview

This is a **monorepo** containing ESLint plugins for security-focused static analysis.

| Directory                                   | Purpose                            |
| ------------------------------------------- | ---------------------------------- |
| `packages/eslint-plugin-secure-coding`      | Framework-agnostic security rules  |
| `packages/eslint-plugin-vercel-ai-security` | Vercel AI SDK security rules       |
| `packages/eslint-plugin-openai-security`    | OpenAI SDK security rules          |
| `packages/eslint-plugin-agentic-security`   | Agentic AI security patterns       |
| `packages/eslint-devkit`                    | Shared utilities for rule creation |

---

## Key Documentation

### For Code Reviews & Releases

- **[docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md)** - Production-ready checklist for ESLint rules
- **[docs/CICD.md](./docs/CICD.md)** - CI/CD workflow documentation with state diagrams
- **[docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md)** - Which ESLint majors we support and why; refresh via `npm run stats:eslint-versions`

### For Contributing

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - How to contribute, commit guidelines, PR process

### For Coverage Gaps

- **[packages/eslint-plugin-secure-coding/RULETESTER-COVERAGE-LIMITATIONS.md](./packages/eslint-plugin-secure-coding/RULETESTER-COVERAGE-LIMITATIONS.md)** - When `c8 ignore` is acceptable

---

## Quick Commands

This repo uses **npm + Turborepo + Changesets**. There is **no** Nx, no pnpm.
The Quality Gate (`.github/workflows/quality.yml`) is the single required
status check on `main` — see its `needs:` list for what runs on every PR.

```bash
# Tests / build / typecheck — affected only on PRs, full graph on push to main.
npx turbo run test --filter=...[origin/main]
npx turbo run build --filter=...[origin/main]
npx turbo run typecheck --filter=...[origin/main]

# Lint — oxlint is the fast pass; ESLint flat config covers the long tail.
npm run oxlint
npx eslint .

# Workflow conventions linter (annotates the YAML inline in PR review).
npm run lint:workflows

# Release lifecycle — see CONTRIBUTING.md "Versioning & Releases (Changesets)".
npm run changeset                      # add a changeset to a PR
npm run release:status                 # what's queued + last 3 tags / package
npm run release:reconcile              # diff git tags / npm / GH Releases
npm run release:reconcile:backfill     # create missing tags
npm run release:reconcile:releases     # create missing GH Releases
npm run release:notes <pkg-dir> <ver>  # preview a GH Release body
```

---

## Docs deploy is **manual only**

`apps/docs` is a Next.js app deployed to Vercel. **It does not auto-deploy.**

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

## Plugin Scope Rules

When creating or reviewing rules, ensure they're in the correct plugin:

| If the rule...                                                  | It belongs in...                   |
| --------------------------------------------------------------- | ---------------------------------- |
| Applies to any JavaScript/TypeScript code                       | `eslint-plugin-secure-coding`      |
| Checks Vercel AI SDK patterns (`generateText`, `streamText`)    | `eslint-plugin-vercel-ai-security` |
| Checks OpenAI SDK patterns (`openai.chat.completions`)          | `eslint-plugin-openai-security`    |
| Detects agentic patterns (tools, autonomous agents) across SDKs | `eslint-plugin-agentic-security`   |

---

## Quality Checklist for New Rules

Before approving any new ESLint rule:

1. **Conceptual Fit**: Is it in the right plugin?
2. **Coverage**: ≥90% line coverage
3. **Performance**: O(n) complexity, single AST pass
4. **Documentation**: Rule docs with OWASP mapping
5. **Messages**: Clear, actionable error messages
6. **ESLint Peer Dep**: Package declares `"eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"` — see [docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md)

See **[docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md)** for the full checklist.

---

## OWASP Coverage

This repository provides rules mapping to:

- **OWASP Top 10 2021** (Web Security)
- **OWASP Top 10 for LLM Applications 2025** (AI Security)
- **OWASP Agentic Top 10 2026** (Agentic AI Security)
- **OWASP Mobile Top 10 2024** (Mobile Security)

Each plugin's README contains an OWASP coverage matrix.

---

## Branch Protection

- `main` is protected — no direct pushes; auto-managed via
  `scripts/setup-branch-protection.sh`.
- Single required check: **Quality Gate** (the aggregate job from
  `quality.yml`). New gates added under `quality.yml` auto-propagate via
  the aggregate's `needs:` — branch protection updates automatically.
- 1 PR review required, with CODEOWNERS + stale-review dismissal.
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

What's *not* in T2 (cloud-only, intentional):

- CodeQL — runs on GitHub's infrastructure with security-events upload.
- Lighthouse — needs a clean Chrome instance.
- Storybook a11y full crawl — needs Playwright on a clean box.
- ILB cross-version matrix — multi-node-version, multi-eslint-version axes.

### T3 — CI on promote (workflow_dispatch + ready_for_review + label)

The heavy workflows (CodeQL, Lighthouse, Storybook test-runner, Storybook
a11y, benchmark, check-links, ILB matrix, oxlint-parity, `quality-full.yml`)
**do not run automatically on every WIP push.** They fire only when a PR is
"promoted":

- The PR is marked **ready-for-review** (out of draft), OR
- The PR is labelled **`run-full-ci`**, OR
- A maintainer manually triggers via `gh workflow run <name>.yml`, OR
- Weekly Sunday cron (04:05 → 04:35 UTC, staggered) for drift detection.

Each heavy workflow has a `gate` job that decides `run=true` / `run=false`.
Downstream jobs `needs: gate` + `if: needs.gate.outputs.run == 'true'`. A
skipped gate surfaces as a workflow-level "skipped" status, not a failing
required check.

Workflows that always auto-run on every PR push (T0 fast loop):

| Workflow | Runtime | What it gates |
|---|---|---|
| `quality.yml` | ~30s | oxlint, markdown, lockfile, workflows, changelog |
| `docs.yml` | ~45s | docs structure validation |
| `a11y.yml` | ~60s | axe scan of route archetypes |
| `changesets-pr.yml` | ~21s (Changeset present) | every PR has a changeset |

### Triggering a full CI run on a draft PR

```bash
gh pr edit <PR-number> --add-label run-full-ci
```

Or via the GitHub UI: PR sidebar → Labels → `run-full-ci`. The label persists
across pushes — subsequent commits re-run the full battery until you remove
it. Drop the label or mark the PR ready-for-review when you're confident.

---

## Secrets / variables

| Name | Type | Purpose | Required? |
|------|------|---------|-----------|
| `NPM_TOKEN`         | secret | First-publish fallback (existing packages use OIDC Trusted Publishers) | optional |
| `CODECOV_TOKEN`     | secret | Coverage uploads (`codecov.yml`)                                       | optional |
| `NVD_API_KEY`       | secret | CWE/CVE data sync (`cve-sync.yml`)                                     | optional |
| `DEV_TO_API_KEY`    | secret | dev.to article sync (`docs-data.yml`)                                  | optional |
| `RELEASE_BOT_PAT`   | secret | Self-approve Version PR so auto-merge can land it without manual click | optional |
| `SCORECARD_REPO_TOKEN` | secret | Branch-protection check in OSSF Scorecard                           | optional |
| `TURBO_TOKEN`       | secret | Vercel Remote Cache token (free for OSS) — 50–80% CI build speedup     | optional |
| `TURBO_TEAM`        | var    | Vercel team slug, paired with `TURBO_TOKEN`                            | optional |

All are optional — workflows fall back gracefully when unset.
