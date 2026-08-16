# AGENTS.md - AI Assistant Context

> **Purpose**: Context file for LLMs (Claude, GPT, Gemini, etc.) working on this repository.
>
> **See also:** [ARCHITECTURE.md](./ARCHITECTURE.md) for this repo's bird's-eye map, and [`../agents/ARCHITECTURE.md`](../agents/ARCHITECTURE.md) for the broader **Interlace** ecosystem (how this repo fits with `agents/` and `serverless/`). For the synchronised viewport breakpoint contract shared across `eslint`, `agents`, and `serverless`, see [BREAKPOINTS.md](./BREAKPOINTS.md).

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
- **docs/CICD.md (planned)** - CI/CD workflow documentation with state diagrams
- **[docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md)** - Which ESLint majors we support and why; refresh via `npm run stats:eslint-versions`

### For Contributing

- **CONTRIBUTING.md (planned)** - How to contribute, commit guidelines, PR process

### For Coverage Gaps

- **packages/eslint-plugin-secure-coding/RULETESTER-COVERAGE-LIMITATIONS.md (planned)** - When `c8 ignore` is acceptable

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

## Evaluation infrastructure (gap-closure)

Every measurable claim about Interlace or peers reduces to a row in
[`distribution/EVALUATION_METRICS.md`](./distribution/EVALUATION_METRICS.md).
Each row points at one of these scripts; outputs land under
`benchmark-results/`. CI workflows under `.github/workflows/` enforce
the gates.

| Script | npm script | Output | CI workflow |
| :--- | :--- | :--- | :--- |
| `scripts/ilb-resource-profile.ts` | `npm run ilb:resource-profile` | `benchmark-results/resource-profile.{json,md}` | (manual / scheduled) |
| `scripts/fetch-peer-health.ts` | `npm run peer-health` | `benchmark-results/peer-health.{json,md}` | `peer-health.yml` (weekly Monday cron) |
| `scripts/audit-cve-rule-latency.ts` | `npm run audit:cve-latency[:strict]` | `benchmark-results/cve-rule-latency.{json,md}` | `cve-latency.yml` (PR + nightly) |
| `scripts/audit-api-surface.ts` | `npm run audit:api-surface[:strict]` | `.agent/api-surface-manifest.json` + `benchmark-results/api-surface-coverage.md` | `api-surface.yml` (PR gate) |
| `scripts/check-per-rule-budget.ts` | `npm run check:per-rule-budget[:soft]` | `benchmarks/budgets/per-rule-p95.json` + `benchmark-results/per-rule-budget-check.md` | `per-rule-budget.yml` (PR gate) |

Schemas for the three JSON artifacts live at
`scripts/schemas/{cve-rule-latency,api-surface-manifest,per-rule-budget}.schema.json`.
Unit tests at `scripts/__tests__/gap-closure.test.ts` (`npx vitest run scripts/__tests__/`).

**Repo invariant:** never reintroduce `(gap)` markers into
EVALUATION_METRICS.md. Adding a metric without a measurement is a
documentation regression — write the script, wire the npm command,
add the workflow, then update the metrics table.

The public-facing surface for this whole system is
[`/docs/getting-started/concepts/transparency`](apps/docs/content/docs/getting-started/concepts/transparency.mdx).

---

## Plugin Scope Rules

**README logo row: Interlace + ESLint + oxlint + the SDK/protocol the plugin targets.**
Every plugin that lints a specific platform, protocol or SDK opens its README with the same
centred row, all marks at `height="90"`, `&nbsp;&nbsp;` between them. The SDK mark links to
that SDK's npm page — it is what tells a reader (and a search engine) which package this
plugin is for. Plugins with no external target (`secure-coding`, `maintainability`, …) keep
the two-mark row.

Marks are **self-hosted** in `apps/docs/public/` and referenced as
`https://eslint.interlace.tools/<name>-logo.svg`. Never hotlink a third-party CDN: npm
proxies README images through GitHub camo with long-lived caching, so an external URL that
moves leaves a broken image that is painful to flush.

> ⚠️ **Deploy the docs site before publishing a package whose README references a new mark.**
> camo caches aggressively; if it fetches a 404 first, the broken image sticks around long
> after the asset lands. Order: merge → docs deploy → verify the SVG is 2xx → release.

Source marks from [simple-icons](https://simpleicons.org) (CC0) where available, recoloured
`#8b949e` so they read on light and dark GitHub themes. If simple-icons does not carry a
brand, treat that as a signal the mark is restricted rather than something to work around —
**OpenAI is the live example: simple-icons 404s on it.** Ship the row without that mark
rather than sourcing the logo elsewhere, unless the brand's guidelines have been read and
clearly permit it.

**Naming: every security plugin is `eslint-plugin-<ecosystem>-security`.** The suffix is
what tells a consumer the package is protective rather than stylistic, and it keeps the
family scannable on npm. No exceptions for new packages. `eslint-plugin-pg`,
`eslint-plugin-jwt` and `eslint-plugin-secure-coding` predate the convention and are
grandfathered — renaming a published package is a separate decision with its own cost
(npm deprecate + republish, every config example, the live awesome-list entries).

When creating or reviewing rules, ensure they're in the correct plugin:

**The decisive test — apply it before anything else:** *can this rule fire on
code whose only dependency is the language and the platform?*

- **Yes** → `secure-coding` (language), `node-security` (Node runtime/stdlib),
  `browser-security` (DOM/BOM/transport).
- **No — it needs driver, framework or SDK X installed** → X's own protective
  plugin. Never the code-agnostic three, no matter how generic the *vulnerability
  class* sounds.

The vulnerability class is not the scope test; the detection gate is. SQL
injection is a universal class, but detecting it means matching `.query()` /
`.raw()` sinks that only exist in a DB driver — so it lives in `pg` and the other
per-driver plugins, not in `secure-coding`. The recurring failure is name
association: every `no-*-injection` rule drifts toward `secure-coding` because
its siblings are there.

Two smells that mean you are in the wrong plugin:

1. You compare against a package identifier (`'sequelize'`, `'multer'`, `'cors'`)
   anywhere in the detection path.
2. Two plugins would report the same line, and you are reaching for a dedupe
   test to make that acceptable. Fix the placement instead — no rule can detect
   that another plugin is installed, so the duplicate reaches the user.

Enforced by `npm run lint:taxonomy` (`scripts/lint-plugin-taxonomy.ts`, gated in
the fast quality job). Violations predating the guard are listed in its
`GRANDFATHERED` array with the reason and the migration target.

### A name is not a type

The sibling of the AST-not-printed-source doctrine, and the systemic cause
behind #504, #505, #506 and four already-fixed rules:

| rule                             | inferred from            | reality                |
| -------------------------------- | ------------------------ | ---------------------- |
| `no-timing-unsafe-compare`       | a variable named `token` | compared to a literal  |
| `jwt/no-decode-without-verify`   | a method named `decode`  | a TOML parser          |
| `no-sensitive-data-exposure`     | the word `password`      | English prose          |
| `detect-suspicious-dependencies` | a name near `react`      | preact, a real package |
| `no-xpath-injection`             | `//` in printed text     | a PEM certificate      |

**Do not report — or suppress — based on a SUBSTRING of an identifier's
spelling.** `propName.includes('phone')` matches `phoneBookLength`;
`objectName.includes('app')` matches `appleCount`; `name.includes('react')`
matches `preact`. Resolve the identifier to an import, a call target, or a
value first.

Two things that are explicitly *not* this, because the distinction is the
whole point:

- **Exact membership.** `REQUEST_ROOTS.has(node.name)` matching `req`/`request`
  is a naming convention, not an inference. It stays.
- **Whole-word matching after tokenising.** Split the name on camelCase and
  separators, then match words — `login`, `dialog`, `catalog` and `blog` all
  contain "log" and none is a logger. This is the *fix*, not the defect.

Suppression counts too, and is the quieter half: withholding a finding because
a callee name contains `encrypt` means `decrypt` reads as safe, and a wrong
guess there is a false negative nobody sees.

Enforced by `npm run lint:name-inference` (`scripts/lint-name-inference.ts`,
same quality job). The 25 existing sites are listed in its `REGISTERED` array
with the direction (`report` / `suppress`) and the reason — as debt, not as an
exemption. A rule that leaves the list must be deleted from it; a stale entry
fails the gate.

| If the rule...                                                  | It belongs in...                   |
| --------------------------------------------------------------- | ---------------------------------- |
| Fires with no dependency installed — pure language semantics    | `eslint-plugin-secure-coding`      |
| Needs a SQL driver or ORM (`.query()`, `.raw()`, `.execute()`)  | `eslint-plugin-pg` + the per-driver plugins |
| Checks Vercel AI SDK patterns (`generateText`, `streamText`)    | `eslint-plugin-vercel-ai-security` |
| Checks OpenAI SDK patterns (`openai.chat.completions`)          | `eslint-plugin-openai-security`    |
| Detects agentic patterns (tools, autonomous agents) across SDKs | `eslint-plugin-agentic-security`   |

---

## Quality Checklist for New Rules

Before approving any new ESLint rule:

1. **Conceptual Fit**: Is it in the right plugin?
2. **Coverage**: ≥90% line coverage — a floor, never evidence of correctness (see below)
3. **Performance**: O(n) complexity, single AST pass
4. **Documentation**: Rule docs with OWASP mapping
5. **Messages**: Clear, actionable error messages
6. **ESLint Peer Dep**: Package declares `"eslint": "^8.40.0 || ^9.0.0 || ^10.0.0"` — see [docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md)

See **[docs/QUALITY_STANDARDS.md](./docs/QUALITY_STANDARDS.md)** for the full checklist.

### Coverage is a floor, not a correctness signal

Coverage measures which lines ran. It says nothing about whether the assertion
attached to them was right. Every defect fixed on 2026-08-10 ran inside a
passing test, in a package at 100% coverage.

The failure mode is specific and it has a shape. From `no-xpath-injection`
before #490:

```js
describe('Coverage - branch gaps', () => {
  // id 55 false arm + id 62 false arm: no interpolation, dangerous XPath template
  { code: 'const xpath = `//users/..`', errors: [{ messageId: 'dangerousXpathExpression' }] },
```

A block named for branch coverage, a comment naming branch IDs, and a fixture
asserting that a hardcoded string never passed to any evaluator is a
vulnerability. It was written to make a branch execute, and to do that it
declared the bug correct. When the rule was fixed, the test failed — it was
pinning the defect. Four fixtures in that block were of this kind.

A 100% *gate* is what produces that: it pressures you to write tests that
reach branches instead of tests that challenge behaviour.

So:

- **Keep coverage as a floor.** Do not cite it as evidence a rule is correct,
  in a PR description, a changeset, or a claim in `CLAIMS.md`.
- **A fixture added to reach a branch must still assert behaviour someone
  would defend out loud.** If you cannot say why the expected outcome is right
  without referring to the branch it covers, the fixture is pinning
  implementation, not behaviour.
- **Pair it with evidence coverage cannot give.** Mutation-verify — revert the
  rule and confirm named fixtures turn red — and run the corpus scan, which
  answers the question coverage cannot: *is this true about code we did not
  write?* Both are the convention in #546 and should stay the convention.

### Reporting posture: report the finding, let the consumer scope it

Some rules are correct detections whose advice is arguably wrong in a
particular context. `express-security/require-helmet` and
`require-rate-limiting` firing on single-purpose demo apps in
`express/examples/*` is the canonical case — 92 findings across four rules
that are not false positives at all (#517).

**We report them, at their normal severity.** We do not silently exclude
`examples/`, `demo/` or `fixtures/` paths, and we do not lower severity to
`warn` to make the number smaller. The consumer knows their repo; we do not.
Someone who genuinely does not want Helmet in a demo directory disables the
rule *there, explicitly* — an ESLint override or a disable comment — and that
decision is visible in their config, where it belongs.

Two things follow, and both are the point:

- A path exclusion we ship is a decision made silently on behalf of every
  consumer, including the ones whose `examples/` directory is production code.
- Driving these findings to zero would mean deleting real detections. "0
  findings" is not the goal and has repeatedly been misread as "0 false
  positives" in this campaign. It is not the same measurement.

When a rule's finding count is dominated by this class, say so in the audit
rather than tuning the rule.

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
| `NVD_API_KEY`       | secret | CWE/CVE data sync (manual via CLI)                                     | optional |
| `DEV_TO_API_KEY`    | secret | dev.to article sync (`docs-data.yml`)                                  | optional |
| `RELEASE_BOT_PAT`   | secret | Self-approve Version PR so auto-merge can land it without manual click | optional |
| `SCORECARD_REPO_TOKEN` | secret | Branch-protection check in OSSF Scorecard                           | optional |
| `TURBO_TOKEN`       | secret | Vercel Remote Cache token (free for OSS) — 50–80% CI build speedup     | optional |
| `TURBO_TEAM`        | var    | Vercel team slug, paired with `TURBO_TOKEN`                            | optional |

All are optional — workflows fall back gracefully when unset.

---

## Local preview of the docs site

The plain path, and the one to use by default:

```bash
npm run dev --workspace docs   # http://localhost:3000
```

A container is available for sandboxes and clean-machine checks:

```bash
docker compose -f compose.dev.yml up
```

Non-obvious facts both paths depend on:

- **One install at the root.** npm workspaces hoist every workspace's deps.
  `tsx` is a devDependency of `@interlace/benchmarks` only, and the docs `dev`
  script relies on it resolving from the hoisted root.
- **`@interlace/ui` must be built first.** It exports from `dist/`, so
  `npm run build --workspace @interlace/ui` has to run before `next dev`.
  `@interlace/benchmarks` exports its `.ts` sources directly and needs no build.
- **`LEFTHOOK=0` in containers.** The root `prepare` installs git hooks, which
  are meaningless in a container and fail without a git identity.
- **`sync-plugin-stats.ts` is local-only.** It reads each plugin's
  `src/index.ts` and writes `apps/docs/src/data/plugin-stats.json`. No network.
  The docs `dev` script runs it for you.

### Remote sandboxes

Next blocks unknown hostnames in dev, so a sandbox that serves the preview
through its own hostname must declare it:

```bash
DEV_ALLOWED_ORIGINS=3000-my-sandbox.example docker compose -f compose.dev.yml up
```

`DEV_ALLOWED_ORIGINS` is comma-separated, dev-only, and empty by default —
unset, the dev server behaves exactly as stock.

Providers get an **overlay**, layered on the repo's own compose file rather than
replacing it:

```bash
docker compose -f compose.dev.yml -f sandboxes/<provider>/compose.override.yml up
```

See [`sandboxes/`](./sandboxes/) for the set we support and how each is run —
today that is [Base44](./sandboxes/base44/README.md). The rule is a location, not
a prohibition: a
provider's name, env-var spelling and port scheme may appear **in its own
overlay** and nowhere else — not in `apps/docs/next.config.mjs`, not in
`compose.dev.yml`, not in the `Dockerfile`. Anything a sandbox needs from the app
goes through a generic hook the repo would expose anyway.

That is what keeps trying a provider cheap and leaving one free: adding or
dropping a sandbox is a change to one directory.
`scripts/__tests__/dev-preview-vendor-neutral.test.ts` enforces it.

