# FN/FP Benchmark: ESLint Security Plugin Comparison

## Overview

This benchmark compares **False Negatives** (missed vulnerabilities) and **False Positives** (incorrectly flagged safe code) across ESLint security plugins in the JavaScript ecosystem.

## ESLint Version Matrix

The same fixtures run against every ESLint major we support (see [ESLint Version Support Policy](../../../docs/ESLINT_VERSION_SUPPORT.md)):

| Fixture           | ESLint Pin | Config Format | Runner            | Output Prefix |
| :---------------- | :--------- | :------------ | :---------------- | :------------ |
| `eslint8-compat`  | `^8.57.0`  | Legacy `.eslintrc.cjs` | `run-eslint8.js`  | `eslint8-`    |
| `eslint9-compat`  | `^9.0.0`   | Flat (`eslint.config.*.js`) | `run-eslint9.js`  | `eslint9-`    |
| `eslint10-compat` | `^10.0.0`  | Flat (`eslint.config.*.js`) | `run-eslint10.js` | `eslint10-`   |

Each fixture is a self-contained npm workspace. To run, `cd` into the fixture, `npm install`, then `npm run benchmark`. Results land in `benchmarks/results/ilb-arena/<prefix>-<date>.json`.

### Competitor compatibility (verified 2026-05-09 via `npm install` in each fixture)

| Competitor | v8 | v9 | v10 | Notes |
| :--- | :-: | :-: | :-: | :--- |
| `eslint-plugin-security` | ✓ (`^2.1.0`) | ✓ (`^3.0.0`) | ✓ (`^4.0.0`) | Latest series drops the peerDependency entirely |
| `eslint-plugin-no-unsanitized` | ✓ (`^4.0.2`) | ✓ (`^4.1.0`) | ✓ (`^4.1.5`) | v4.1.5 declares `eslint: "^9 \|\| ^10"` |
| `eslint-plugin-import` | ✓ (`^2.32.0`) | ✓ (`^2.32.0`) | ✗ (no published version) | As of 2026-05-09 the latest published `eslint-plugin-import@2.32.0` peer-deps cap at `^9`. Excluded from the v10 fixture; re-add when upstream ships v10 support. |

This itself is a comparison data point: **Interlace runs cleanly across all three supported majors; the de-facto industry import plugin does not yet support v10.** The runner reports `status: "CRASHED"` for any plugin that fails to load at runtime.

## Plugins Under Test

| Plugin                         | Version | Rules | Last Updated       |
| ------------------------------ | ------- | ----- | ------------------ |
| **Interlace Ecosystem**        | Various | 245   | Weekly             |
| `eslint-plugin-security`       | 3.x     | 13    | 2023 (maintenance) |
| `eslint-plugin-no-unsanitized` | 4.x     | 4     | 2024               |

## Methodology

### Fixture Categories

#### 1. Vulnerable Code (`fixtures/vulnerable/`)

Code samples with **known security vulnerabilities** covering:

- SQL Injection (CWE-89)
- Command Injection (CWE-78)
- Path Traversal (CWE-22)
- Hardcoded Credentials (CWE-798)
- JWT Vulnerabilities (CWE-757, CWE-347)
- XSS (CWE-79)
- Prototype Pollution (CWE-1321)
- Insecure Randomness (CWE-330)
- Weak Cryptography (CWE-328)
- Timing Attacks (CWE-208)
- NoSQL Injection (CWE-943)
- SSRF (CWE-918)

#### 2. Safe Code (`fixtures/safe/`)

Code samples with **secure patterns** that should NOT trigger warnings:

- Validated/sanitized inputs
- Parameterized queries
- Allowlist validations
- Timing-safe comparisons
- Proper path resolution

### Metrics

| Metric                        | Formula                                         |
| ----------------------------- | ----------------------------------------------- |
| **False Negative Rate (FNR)** | FN / (FN + TP)                                  |
| **False Positive Rate (FPR)** | FP / (FP + TN)                                  |
| **Precision**                 | TP / (TP + FP)                                  |
| **Recall**                    | TP / (TP + FN)                                  |
| **F1 Score**                  | 2 × (Precision × Recall) / (Precision + Recall) |

Where:

- **TP (True Positive)**: Correctly flagged vulnerable code
- **TN (True Negative)**: Correctly ignored safe code
- **FP (False Positive)**: Incorrectly flagged safe code
- **FN (False Negative)**: Missed vulnerable code

## Running the Benchmark

```bash
npm run benchmark:fn-fp
```

## Results

See `results/fn-fp-comparison/YYYY-MM-DD.json` for detailed results.

## References

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE Database](https://cwe.mitre.org/)
- [ILB README — philosophy, methodology, statistical rigor](../../README.md)
