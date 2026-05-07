# ILB-Wild — payload

> Pinned: `main` · 35K ⭐ · Headless CMS

## Summary

| Metric | Value |
|---|---|
| Files linted | 626 |
| Lines of code | 65,381 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1430 ms** (±0, CV 0%) |
| Per-file lint cost | 2.28 ms/file |
| Peak RSS | 247 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |
| express-security | 0 / 10 | 0% |
| mongodb-security | 0 / 16 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/lock-file` | 0 | 2.92 ms |
| `secure-coding/no-graphql-injection` | 0 | 1.04 ms |
| `node-security/detect-child-process` | 0 | 0.83 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 0.75 ms |
| `node-security/no-buffer-overread` | 0 | 0.74 ms |
| `secure-coding/no-ldap-injection` | 0 | 0.63 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.6 ms |
| `node-security/no-zip-slip` | 0 | 0.59 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.53 ms |
| `secure-coding/no-insecure-comparison` | 0 | 0.51 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 2.92 ms | 0 |
| `secure-coding/no-graphql-injection` | 1.04 ms | 0 |
| `node-security/detect-child-process` | 0.83 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 0.75 ms | 0 |
| `node-security/no-buffer-overread` | 0.74 ms | 0 |
| `secure-coding/no-ldap-injection` | 0.63 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.6 ms | 0 |
| `node-security/no-zip-slip` | 0.59 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.53 ms | 0 |
| `secure-coding/no-insecure-comparison` | 0.51 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/payload/src/**/*.ts`
