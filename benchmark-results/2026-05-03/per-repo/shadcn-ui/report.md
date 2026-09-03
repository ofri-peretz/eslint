# ILB-Wild — shadcn-ui

> Pinned: `main` · 100K ⭐ · UI Library

## Summary

| Metric | Value |
|---|---|
| Files linted | 117 |
| Lines of code | 22,551 |
| Total findings | 2 (2 errors, 0 warnings) |
| Findings density | **0.09 / kLoC** |
| Files with findings | 1 (0.9%) |
| Wall-clock (median, 1 runs) | **1359 ms** (±0, CV 0%) |
| Per-file lint cost | 11.62 ms/file |
| Peak RSS | 223 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 0 / 45 | 0% |
| secure-coding | 2 / 28 | 7.1% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 1 | 1.22 ms |
| `secure-coding/no-graphql-injection` | 1 | 1.98 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.71 ms |
| `browser-security/no-clickjacking` | 0 | 0.62 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.58 ms |
| `secure-coding/no-ldap-injection` | 0 | 0.5 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.48 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.46 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 0.41 ms |
| `secure-coding/no-improper-sanitization` | 0 | 0.41 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-graphql-injection` | 1.98 ms | 1 |
| `secure-coding/no-hardcoded-credentials` | 1.22 ms | 1 |
| `secure-coding/no-xpath-injection` | 0.71 ms | 0 |
| `browser-security/no-clickjacking` | 0.62 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.58 ms | 0 |
| `secure-coding/no-ldap-injection` | 0.5 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.48 ms | 0 |
| `secure-coding/no-unchecked-loop-condition` | 0.46 ms | 0 |
| `secure-coding/no-sensitive-data-exposure` | 0.41 ms | 0 |
| `secure-coding/no-improper-sanitization` | 0.41 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/mcp/index.ts:321 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-graphql-injection` — /Users/ofri/repos/ofriperetz.dev/oos/shadcn-ui/packages/shadcn/src/mcp/index.ts:419 — 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 \| Unsafe interpolation in GraphQL query \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use GraphQL variables instead of string interpolation \| https://graphql.org/learn/queries/#variables

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/**/*.{ts,tsx}`
