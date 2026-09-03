# ILB-Wild — strapi

> Pinned: `main` · 66K ⭐ · Headless CMS

## Summary

| Metric | Value |
|---|---|
| Files linted | 77 |
| Lines of code | 7,342 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1350 ms** (±0, CV 0%) |
| Per-file lint cost | 17.53 ms/file |
| Peak RSS | 212 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |
| express-security | 0 / 10 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/lock-file` | 0 | 1.63 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.73 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 0.6 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.54 ms |
| `node-security/detect-child-process` | 0 | 0.41 ms |
| `node-security/no-buffer-overread` | 0 | 0.41 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.4 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.36 ms |
| `node-security/no-zip-slip` | 0 | 0.36 ms |
| `secure-coding/no-insecure-comparison` | 0 | 0.29 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 1.63 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.73 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 0.6 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.54 ms | 0 |
| `node-security/detect-child-process` | 0.41 ms | 0 |
| `node-security/no-buffer-overread` | 0.41 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.4 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.36 ms | 0 |
| `node-security/no-zip-slip` | 0.36 ms | 0 |
| `secure-coding/no-insecure-comparison` | 0.29 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/core/strapi/src/**/*.ts`
