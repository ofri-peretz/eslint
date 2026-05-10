# ILB-Oxlint-Parity

**Goal:** prove that running our plugins through oxlint's JS-plugin tier produces the **same findings** as running them through ESLint — same rules, same files, same lines.

If parity holds, oxlint is a safe drop-in for the fast-feedback tier (~12× faster). If it doesn't, the divergence list tells us exactly which rules degrade and why.

## What it measures

For each fixture in the corpus, the suite runs:

1. **ESLint** (Tier 3) — via `eslint.benchmark.config.mjs`, all Interlace plugins loaded from `packages/*/src/index.ts`.
2. **Oxlint + Interlace JS plugins** (Tier 2) — via the generated `parity.oxlintrc.json`, plugins loaded from `dist/packages/*/src/index.js` through the [shim layer](../../../tools/oxlint-plugins).

Both outputs are normalized to `(file, rule, line, column)` tuples (message text is stripped — wording diverges legitimately). The runner reports four numbers:

| Metric | Definition | Target |
|---|---|---|
| `shared` | findings in both runtimes | maximize |
| `eslintOnly` | findings ESLint reports but oxlint misses | minimize, allowlist allowed |
| `oxlintOnly` | findings oxlint reports but ESLint misses | should be 0 |
| `parityRate` | `shared / (shared + eslintOnly + oxlintOnly)` | ≥ 0.95 |

## Why findings can legitimately diverge

- **Auto-fix-only rules:** oxlint's fixer API is partial. A rule with an autofix-only signal (no `messageId` report) may not surface.
- **Scope analysis:** the 3 pg rules using `getDeclaredVariables` can't run on oxlint.
- **Type-aware rules:** the 4 type-aware rules in the fleet are skipped on oxlint by design.

These cases live in `allowlist.json`. Anything outside the allowlist fails the suite.

## Prerequisites

```bash
npx turbo run build       # all plugins must be built — shims load from dist/
```

## Running

```bash
# Default: CWE-089 vulnerable corpus
npm run ilb:oxlint-parity

# Specific corpus
node benchmarks/suites/ilb-oxlint-parity/run.mjs --corpus benchmarks/corpus/CWE-798

# CI mode — exits non-zero if parity drops below threshold
node benchmarks/suites/ilb-oxlint-parity/run.mjs --ci --threshold 0.95
```

## Output

Result envelope: `benchmarks/results/ilb-oxlint-parity/<date>.json`

```json
{
  "suite": "ilb-oxlint-parity",
  "version": "1.0",
  "corpus": "benchmarks/corpus/CWE-089",
  "shared": 18,
  "eslintOnly": 2,
  "oxlintOnly": 0,
  "parityRate": 0.9,
  "eslintOnlyDetail": [
    { "file": "vulnerable/string-concat.js", "rule": "pg/no-unsafe-query", "line": 7 }
  ],
  "oxlintOnlyDetail": []
}
```

## Allowlist format

`allowlist.json`:

```json
{
  "eslintOnly": [
    {
      "rulePattern": "pg/no-missing-client-release",
      "reason": "uses getDeclaredVariables — oxlint does not implement scope analysis",
      "introduced": "2026-05-09"
    }
  ],
  "oxlintOnly": []
}
```

Each entry must have a `reason` and `introduced` date. Bare regressions (no allowlist entry) fail the suite.
