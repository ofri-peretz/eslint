# ILB-Wild — langchain-js

> Pinned: `main` · 15K ⭐ · AI Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 243 |
| Lines of code | 47,922 |
| Total findings | 2 (2 errors, 0 warnings) |
| Findings density | **0.04 / kLoC** |
| Files with findings | 2 (0.8%) |
| Wall-clock (median, 1 runs) | **1341 ms** (±0, CV 0%) |
| Per-file lint cost | 5.52 ms/file |
| Peak RSS | 224 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| vercel-ai-security | 0 / 19 | 0% |
| node-security | 0 / 33 | 0% |
| secure-coding | 1 / 28 | 3.6% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 2 | 0.87 ms |
| `node-security/lock-file` | 0 | 1.62 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.62 ms |
| `node-security/no-zip-slip` | 0 | 0.4 ms |
| `node-security/no-buffer-overread` | 0 | 0.34 ms |
| `vercel-ai-security/require-validated-prompt` | 0 | 0.32 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.31 ms |
| `node-security/detect-child-process` | 0 | 0.3 ms |
| `secure-coding/detect-non-literal-regexp` | 0 | 0.27 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.26 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 1.62 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 0.87 ms | 2 |
| `secure-coding/no-graphql-injection` | 0.62 ms | 0 |
| `node-security/no-zip-slip` | 0.4 ms | 0 |
| `node-security/no-buffer-overread` | 0.34 ms | 0 |
| `vercel-ai-security/require-validated-prompt` | 0.32 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.31 ms | 0 |
| `node-security/detect-child-process` | 0.3 ms | 0 |
| `secure-coding/detect-non-literal-regexp` | 0.27 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.26 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/utils/uuid/nil.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/langchain-js/libs/langchain-core/src/utils/uuid/max.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `libs/langchain-core/src/**/*.ts`
