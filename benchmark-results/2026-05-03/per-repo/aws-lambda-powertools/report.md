# ILB-Wild — aws-lambda-powertools

> Pinned: `main` · 2K ⭐ · Lambda Tooling

## Summary

| Metric | Value |
|---|---|
| Files linted | 260 |
| Lines of code | 40,704 |
| Total findings | 5 (5 errors, 0 warnings) |
| Findings density | **0.12 / kLoC** |
| Files with findings | 1 (0.4%) |
| Wall-clock (median, 1 runs) | **1297 ms** (±0, CV 0%) |
| Per-file lint cost | 4.99 ms/file |
| Peak RSS | 224 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 0 / 14 | 0% |
| node-security | 0 / 33 | 0% |
| secure-coding | 1 / 28 | 3.6% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 5 | 1.11 ms |
| `node-security/detect-child-process` | 0 | 3 ms |
| `lambda-security/no-env-logging` | 0 | 2.18 ms |
| `node-security/lock-file` | 0 | 2.18 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.93 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.65 ms |
| `lambda-security/no-secrets-in-env` | 0 | 0.63 ms |
| `node-security/no-buffer-overread` | 0 | 0.61 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.54 ms |
| `node-security/no-zip-slip` | 0 | 0.52 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/detect-child-process` | 3 ms | 0 |
| `lambda-security/no-env-logging` | 2.18 ms | 0 |
| `node-security/lock-file` | 2.18 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.11 ms | 5 |
| `secure-coding/no-graphql-injection` | 0.93 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.65 ms | 0 |
| `lambda-security/no-secrets-in-env` | 0.63 ms | 0 |
| `node-security/no-buffer-overread` | 0.61 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.54 ms | 0 |
| `node-security/no-zip-slip` | 0.52 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/schemas/cognito.ts:138 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/schemas/cognito.ts:179 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/schemas/cognito.ts:513 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/schemas/cognito.ts:562 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/schemas/cognito.ts:608 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/*/src/**/*.ts`
