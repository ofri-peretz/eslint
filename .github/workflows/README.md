# `.github/workflows/` — CI / CD

Every GitHub Actions workflow for this repo. Triggered by PRs, pushes to `main`, manual dispatch, or (where applicable) cron.

> **Cron policy:** scheduled triggers across this repo are commented out by default for **quota conservation** (see commit `7fed8416`). Re-enable selectively only when the value justifies the minutes.
>
> **Lint:** all workflows are checked by `actionlint` via `npm run lint:workflows`.

## Gates (block PRs / releases)

| Workflow | What it gates |
| :--- | :--- |
| [`quality.yml`](./quality.yml) | Test, lint, typecheck across all packages — the main PR gate |
| [`release.yml`](./release.yml) | Per-package release pipeline (Trusted Publishing for `@interlace/*`, NPM_TOKEN for unscoped) |
| [`release-hygiene.yml`](./release-hygiene.yml) | Pre-release sanity (changelog completeness, version alignment) |
| [`changesets-pr.yml`](./changesets-pr.yml) | Changesets PR creation |
| [`docs.yml`](./docs.yml) | Docs governance (link integrity, structure validation) |

## Benchmark / quality measurement

| Workflow | What it produces |
| :--- | :--- |
| [`benchmark.yml`](./benchmark.yml) | ILB regression gate — fails PRs that regress any benchmark above the threshold |
| [`eslint-version-matrix.yml`](./eslint-version-matrix.yml) | Runs ILB-Arena + ILB-Juliet across **ESLint v8 / v9 / v10** matrix per [`../../docs/ESLINT_VERSION_SUPPORT.md`](../../docs/ESLINT_VERSION_SUPPORT.md) |
| [`oxlint-parity.yml`](./oxlint-parity.yml) | Oxlint shim parity check |
| [`sdk-compatibility.yml`](./sdk-compatibility.yml) | Weekly check against latest published SDK versions per [`../../docs/SDK_COMPATIBILITY_OVERVIEW.md`](../../docs/SDK_COMPATIBILITY_OVERVIEW.md) |

## Maintenance / scheduled

| Workflow | Cadence |
| :--- | :--- |
| [`cve-sync.yml`](./cve-sync.yml) | Every 3 days — pulls latest CWE/CVE data |
| [`docs-data.yml`](./docs-data.yml) | Refreshes derived docs data (rule tables, plugin stats) |
| [`npm-token-health.yml`](./npm-token-health.yml) | NPM token expiry check (Granular Access Tokens cap at 90 days) |
| [`check-links.yml`](./check-links.yml) | Markdown link integrity sweep |
| [`eslint-version-stats.yml`](./eslint-version-stats.yml) | Manual refresh of npm download share by ESLint major (drives [`../../docs/ESLINT_VERSION_SUPPORT.md`](../../docs/ESLINT_VERSION_SUPPORT.md)). Run via `gh workflow run eslint-version-stats.yml -f open_pr=true` to auto-PR drift |

## Security & supply chain

| Workflow | Purpose |
| :--- | :--- |
| [`codeql.yml`](./codeql.yml) | GitHub CodeQL static analysis |
| [`scorecard.yml`](./scorecard.yml) | OSSF Scorecard — supply-chain security score |
| [`codecov.yml`](./codecov.yml) | Coverage upload to Codecov |

## Conventions

- **Filename:** lowercase, kebab-case, `.yml`.
- **Top-of-file docstring:** explain *what the workflow does and why*, not just the trigger. The version-matrix and SDK-compat files are good templates.
- **Permissions:** start with `contents: read`, add only what's needed.
- **Concurrency:** group + cancel-in-progress for PR-triggered workflows (avoids burning minutes on superseded commits).
- **Editing pattern:** see [`../.cursor/commands/workflow-maintenance.md`](../.cursor/commands/workflow-maintenance.md) for the full checklist.
