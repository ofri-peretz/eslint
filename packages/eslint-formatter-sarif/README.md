# @interlace/eslint-formatter-sarif

> SARIF v2.1.0 formatter for ESLint. Emits findings consumable by GitHub Advanced Security, Microsoft Defender, GitLab Ultimate, Sonar, Snyk, and any SAST pipeline that speaks the standard.

## Install

```bash
npm install --save-dev @interlace/eslint-formatter-sarif
```

## Usage

```bash
npx eslint -f @interlace/eslint-formatter-sarif src/ > eslint.sarif
```

Then upload to GitHub Code Scanning:

```yaml
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: eslint.sarif
    category: 'interlace'
```

## What's in the output

SARIF v2.1.0 spec-compliant. Each result carries:

- `ruleId` (e.g., `secure-coding/no-hardcoded-credentials`)
- `level` (mapped from ESLint severity: 2→error, 1→warning)
- `message.text` — the lint message
- `locations` — file URI (relative to project root via `uriBaseId: PROJECTROOT`), line, column, end-line, end-column
- `properties.cwe` — the rule's CWE ID (when annotated)
- `properties.cvss`, `interlace.severity`, `interlace.asvs`, `interlace.ssdf`, `interlace.capec`, `interlace.cveExamples` — Interlace-specific metadata
- `tags` — `['eslint', 'external/cwe/cwe-NNN', ...]` — GitHub Advanced Security uses these as filters

When a finding has an auto-fix, `fixes[]` carries the artifact change (range + replacement text) so SARIF consumers can apply the fix.

## Why a custom formatter

The official `@microsoft/eslint-formatter-sarif` works for plain ESLint findings, but doesn't surface Interlace-specific metadata (CWE, CVSS, ASVS, SSDF, CAPEC, CVE examples). This formatter:

1. **Tags every finding with its CWE** in a GHAS-searchable format (`external/cwe/cwe-NNN`).
2. **Carries compliance mappings** (ASVS, SSDF, CAPEC) under `properties` for downstream RFP / audit tooling.
3. **Surfaces Interlace severity bands** (CRITICAL / HIGH / MEDIUM / LOW) alongside ESLint severity (error / warn).
4. **Emits CVE provenance** when the rule has documented CVE examples — a reviewer can click straight to the original CVE record.

## Spec

[OASIS SARIF v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html)

## Combined with the GitHub Action

For one-line CI integration that handles install + run + upload in one step, use the [Interlace audit action](https://github.com/ofri-peretz/eslint/tree/main/.github/actions/audit) which wraps this formatter automatically.

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

