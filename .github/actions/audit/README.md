# Interlace Audit — GitHub Action

> One-line CI integration for the [Interlace ESLint security ecosystem](https://github.com/ofri-peretz/eslint). Drop into any project's workflow, get full security linting + SARIF upload to GitHub Code Scanning Alerts. Roadmap item 6.1.

## Quick start

```yaml
# .github/workflows/security.yml
name: Security

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  security-events: write   # required for SARIF upload

jobs:
  interlace-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: ofri-peretz/eslint/.github/actions/audit@main
        with:
          path: src
          plugins: all                     # full security fleet
          fail-on: error
```

That's it. Findings will land in the **Code Scanning Alerts** tab of your repo, filterable by CWE.

## Inputs

| Input | Default | Description |
| :--- | :--- | :--- |
| `path` | `.` | Directory to lint |
| `plugins` | `secure-coding,node-security,browser-security` | Comma-separated, or `all` for the full security fleet (11 plugins) |
| `format` | `sarif` | One of `sarif` / `json` / `stylish` |
| `output-file` | (auto) | Defaults to `interlace-audit.sarif` (or `.json` / `.txt` per format) |
| `upload-sarif` | `true` | Upload SARIF to GHAS Code Scanning. Requires `permissions: security-events: write`. |
| `fail-on` | `error` | Severity ceiling: `error` / `warning` / `none` |
| `interlace-version` | `latest` | Version range for `@interlace/cli` |

## Outputs

| Output | Description |
| :--- | :--- |
| `sarif-path` | Filesystem path to the emitted SARIF file (when `format=sarif`) |
| `finding-count` | Total number of findings across all plugins |

## Recipes

### Audit pull requests, comment summary, fail on errors

```yaml
- uses: ofri-peretz/eslint/.github/actions/audit@main
  id: audit
  with:
    fail-on: error
- name: Comment finding count on PR
  if: github.event_name == 'pull_request'
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    message: |
      🛡️ **Interlace audit:** ${{ steps.audit.outputs.finding-count }} finding(s).
      View details in the Code Scanning Alerts tab.
```

### Audit only on changed files (faster CI)

```yaml
- name: Get changed files
  id: changed
  run: echo "files=$(git diff --name-only origin/main HEAD | tr '\n' ' ')" >> "$GITHUB_OUTPUT"
- uses: ofri-peretz/eslint/.github/actions/audit@main
  with:
    path: ${{ steps.changed.outputs.files }}
```

### Run with a specific Interlace version (pinned for reproducibility)

```yaml
- uses: ofri-peretz/eslint/.github/actions/audit@main
  with:
    interlace-version: '^3.1.0'
```

### Use one plugin only

```yaml
- uses: ofri-peretz/eslint/.github/actions/audit@main
  with:
    plugins: secure-coding
    fail-on: warning
```

## How it works

1. Installs `@interlace/cli` globally (provides the `interlace` binary).
2. Installs the requested `@interlace/eslint-plugin-*` packages.
3. Calls `interlace init` to generate a starter `eslint.config.mjs` if no config exists.
4. Runs `interlace audit <path> --sarif` (or the requested format).
5. Optionally uploads SARIF to GitHub Code Scanning via `github/codeql-action/upload-sarif@v3`.

## Why use this vs. raw ESLint?

- **One line vs. boilerplate.** No need to memorize plugin lists, formatter packages, or SARIF wiring.
- **GHAS-native.** Findings land in Code Scanning Alerts with CWE tags, filterable + dashboardable.
- **Auto-init.** Works in projects with no ESLint config — generates a starter and runs.
- **Fail-on policy.** Choose your gate granularity (`error` / `warning` / `none`).

## Promoting to a standalone action

Today this lives at `.github/actions/audit/` inside the main Interlace repo. To version it independently (recommended for production usage), publish it to its own repo as `interlace/audit-action`:

```bash
# In the new repo:
cp .github/actions/audit/{action.yml,README.md} ./
git tag v1
git push origin v1
```

Then consumers reference it as `uses: interlace/audit-action@v1`.
