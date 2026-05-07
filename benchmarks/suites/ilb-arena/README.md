# FN/FP Benchmark: ESLint Security Plugin Comparison

## Overview

This benchmark compares **False Negatives** (missed vulnerabilities) and **False Positives** (incorrectly flagged safe code) across ESLint security plugins in the JavaScript ecosystem.

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
- [Benchmark Guidelines](../../BENCHMARK_GUIDELINES.md)
