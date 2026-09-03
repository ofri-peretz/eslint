# ILB-Wild — vercel-ai

> Pinned: `main` · 15K ⭐ · AI SDK

## Summary

| Metric | Value |
|---|---|
| Files linted | 1,431 |
| Lines of code | 152,090 |
| Total findings | 5 (3 errors, 2 warnings) |
| Findings density | **0.03 / kLoC** |
| Files with findings | 2 (0.1%) |
| Wall-clock (median, 1 runs) | **1673 ms** (±0, CV 0%) |
| Per-file lint cost | 1.17 ms/file |
| Peak RSS | 305 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| vercel-ai-security | 1 / 19 | 5.3% |
| node-security | 0 / 33 | 0% |
| secure-coding | 1 / 28 | 3.6% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 3 | 1.68 ms |
| `vercel-ai-security/require-request-timeout` | 2 | 0.68 ms |
| `node-security/lock-file` | 0 | 4.82 ms |
| `vercel-ai-security/no-sensitive-in-prompt` | 0 | 4.27 ms |
| `secure-coding/no-graphql-injection` | 0 | 2.22 ms |
| `node-security/no-buffer-overread` | 0 | 1.5 ms |
| `node-security/no-zip-slip` | 0 | 1.27 ms |
| `vercel-ai-security/require-validated-prompt` | 0 | 1.27 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 1.26 ms |
| `secure-coding/no-improper-sanitization` | 0 | 1.06 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 4.82 ms | 0 |
| `vercel-ai-security/no-sensitive-in-prompt` | 4.27 ms | 0 |
| `secure-coding/no-graphql-injection` | 2.22 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.68 ms | 3 |
| `node-security/no-buffer-overread` | 1.5 ms | 0 |
| `node-security/no-zip-slip` | 1.27 ms | 0 |
| `vercel-ai-security/require-validated-prompt` | 1.27 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 1.26 ms | 0 |
| `secure-coding/no-improper-sanitization` | 1.06 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 1.06 ms | 0 |

## Sample findings (first 15)

- `vercel-ai-security/require-request-timeout` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/codemod/src/codemods/v4/replace-roundtrips-with-maxsteps.ts:6 — ⚠️ CWE-400 OWASP:A05-Security CVSS:5 \| generateText call lacks timeout configuration. This can lead to denial of service. \| MEDIUM [SOC2]
   Fix: Add timeout configuration or use AbortController with setTimeout \| https://owasp.org/www-proje
- `vercel-ai-security/require-request-timeout` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/codemod/src/codemods/v4/replace-roundtrips-with-maxsteps.ts:11 — ⚠️ CWE-400 OWASP:A05-Security CVSS:5 \| generateText call lacks timeout configuration. This can lead to denial of service. \| MEDIUM [SOC2]
   Fix: Add timeout configuration or use AbortController with setTimeout \| https://owasp.org/www-proje
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/codemod/src/codemods/v4/remove-deprecated-provider-registry-exports.ts:16 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/codemod/src/codemods/v4/remove-deprecated-provider-registry-exports.ts:19 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/vercel-ai/packages/codemod/src/codemods/v4/remove-deprecated-provider-registry-exports.ts:79 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/*/src/**/*.ts`
