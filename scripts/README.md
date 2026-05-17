# `scripts/` — Repo Automation

Repo-wide automation scripts. Every script in this directory is invoked from `package.json`'s `scripts` block, a `.github/workflows/*.yml` file, or another script in this directory — none are dead. Run via `npm run <name>` (the npm-script table is in [`../package.json`](../package.json)).

> **Boundary vs `tools/`:** scripts in this directory orchestrate the repo (generate, audit, sync, release). Code that gets *built* or *published* lives in [`../tools/`](../tools/) (custom ESLint rules, oxlint shims, the cwe-analytics-engine package). If a file is consumed at runtime by a package, put it in `tools/`. If it's invoked from CI or `npm run`, put it here.

## ILB Benchmark Suite (28 scripts)

The Interlace Lint Bench — see [`../benchmarks/README.md`](../benchmarks/README.md) for the philosophy and what each suite measures. These scripts run the suites and emit results into [`../benchmark-results/`](../benchmark-results/).

| Script | Purpose |
| :--- | :--- |
| `ilb-scorecard.ts` | Headline scorecard across all suites (the start-here output) |
| `ilb-leaderboard-publish.mjs` | Plugin-vs-plugin leaderboard |
| `ilb-regression-check.ts` | CI gate that fails PRs on regression vs `baseline.json` |
| `ilb-promotion-gate.mjs` | Severity / lifecycle promotion gate (warn → error) |
| `ilb-corpus-integrity.mjs` | Frozen-corpus integrity check (no silent commit drift) |
| `ilb-doc-resync.ts`, `ilb-doc-test-alignment.mjs` | Doc ↔ rule ↔ test alignment |
| `ilb-fixture-coverage.mjs`, `ilb-validate-fixtures.mjs` | Fixture inventory + validation |
| `ilb-validate-results.mjs` | Schema-check every emitted result JSON |
| `ilb-history-backfill.mjs` | Backfill `history.ndjson` from older runs |
| `ilb-federated-aggregate.mjs` | Cross-bench aggregation for the federated wild metric |
| `ilb-diff-publish.mjs` | Diff between two scorecards |
| `ilb-iso25010-report.mjs`, `ilb-mappings-report.mjs` | ISO/IEC 25010 + framework crosswalks |
| `ilb-kappa.mjs` | Multi-rater agreement (Cohen's κ) vs sonarjs / microsoft-sdl |
| `ilb-severity-audit.mjs` | Per-rule severity audit |
| `ilb-cve-synthesize.mjs` | CVE→fixture synthesis for ILB-Wild |
| `ilb-provenance.mjs` | Provenance manifest generation |
| `ilb-autofix-bench.mjs` | Autofix accuracy bench |
| `ilb-stress-test.ts`, `ilb-stress-test-docs.ts` | Stress tests (rules + docs site) |
| `ilb-fuzz.ts` | Property-based fuzz tester for rule logic |
| `ilb-wild.mjs` | Wild-corpus runner |
| `ilb-smoke.mjs` | Fast smoke test (PR gate) |
| `ilb-mcp-test.mjs` | MCP server integration test |
| `ilb-meta-url-fix.ts` | Codemod for fixing rule meta URLs |

## Audits (4 scripts)

Find structural problems across the rule fleet.

| Script | Purpose |
| :--- | :--- |
| `audit-rule.mjs` | Single-rule deep audit |
| `audit-rule-meta-completeness.mjs` | Surfaces holes in rule meta (drives [`../docs/META_HYGIENE.md`](../docs/META_HYGIENE.md)) |
| `audit-rule-portability.mjs` | Cross-plugin portability check |
| `audit-cwe-rendering.mjs` | CWE rendering correctness |

## Validators / Checks (6 scripts)

Pre-commit and CI gates that fail loudly.

| Script | Purpose |
| :--- | :--- |
| `check-markdown-links.ts` | Internal markdown link checker |
| `check-source-version-sync.ts`, `sync-source-versions.ts` | Source-code version pin alignment |
| `check-version-alignment.ts` | `package.json` ↔ lockfile ↔ npm version alignment |
| `validate-docs.ts` | Docs structure validation |
| `validate-mermaid.sh` | Mermaid diagram syntax check |
| `verify-oxlint-shims.mjs` | Oxlint shim parity check |

## Syncers (5 scripts)

Keep derived files (READMEs, tags, doc sections) in sync with their canonical sources.

| Script | Purpose |
| :--- | :--- |
| `sync-git-tags.ts` | Sync git tags with `package.json` versions |
| `sync-philosophy.ts` | Propagate the Philosophy section across plugin READMEs |
| `sync-readme-rules.ts` | Refresh per-plugin rule tables in READMEs |
| `sync-rule-docs.ts` | Refresh `apps/docs/` content from `packages/*/docs/` |
| `sync-source-versions.ts` | Sync source-code version constants |

## Generators (5 scripts)

Generate code, configs, or scaffolding.

| Script | Purpose |
| :--- | :--- |
| `build-package.mjs` | Per-package build orchestration |
| `generate-changelogs.mjs` | Generate changelog entries from conventional commits |
| `generate-oxlint-shims.mjs` | Generate oxlint shim files in `tools/oxlint-plugins/` |
| `generate-rule-tests.mjs` | Generate rule test scaffolding |
| `scaffold-mcp.mjs` | Scaffold a new MCP server |

## Content / Devto (2 scripts)

Article publishing pipeline (see [`../distribution/PUBLISHING_QUEUE.md`](../distribution/PUBLISHING_QUEUE.md)).

| Script | Purpose |
| :--- | :--- |
| `devto-publish.ts` | Publish a draft article to dev.to |
| `devto-update-tags.ts` | Bulk-update dev.to article tags |

## Docs & Coverage (4 scripts)

| Script | Purpose |
| :--- | :--- |
| `coverage-gap-analysis.mjs` | Find rules with low test coverage |
| `docs-cwe-coverage.mjs` | CWE coverage report for the docs site |
| `fix-shallow-tests.mjs` | Detect and patch shallow test files |
| `lint-workflows.mjs` | Lint `.github/workflows/*.yml` |

## CI, Release, Stats, Setup (9 scripts)

| Script | Purpose |
| :--- | :--- |
| `ci-status.ts` | Local CI status check (`npm run ci:status`) |
| `release-status.mjs` | Pending release inspection |
| `extract-changelog.mjs` | Extract per-version changelog block for release notes |
| `reconcile-tags.mjs` | Reconcile mismatched version tags |
| `setup-branch-protection.sh` | One-shot branch protection setup (`npm run setup-branch-protection`) |
| `delete-branches.sh` | Bulk-delete merged branches |
| `benchmark-plugin.ts` | Per-plugin perf benchmark |
| `codemod-lift-cwe-to-meta-docs.mjs` | Codemod: lift CWE refs into rule meta docs |
| [`fetch-eslint-version-stats.ts`](./fetch-eslint-version-stats.ts) | Refresh npm download share by ESLint major (drives [`../docs/ESLINT_VERSION_SUPPORT.md`](../docs/ESLINT_VERSION_SUPPORT.md)) |

## Conventions

- **Language:** prefer TypeScript (`.ts` via `tsx`) for new scripts. Existing `.mjs` and `.sh` scripts are fine to leave alone.
- **Invocation:** add a `package.json` `scripts` entry for any new script, even one-shot ones. Bare scripts are harder to discover.
- **Output location:** results land in [`../benchmark-results/`](../benchmark-results/) (live state) or [`../benchmarks/results/<suite>/`](../benchmarks/results/) (suite-specific dated runs).
- **Side effects:** if a script writes to disk, document the output path in its top-of-file comment.
