# ILB-Wild — sst

> Pinned: `dev` · 22K ⭐ · Serverless Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 194 |
| Lines of code | 66,791 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1395 ms** (±0, CV 0%) |
| Per-file lint cost | 7.19 ms/file |
| Peak RSS | 221 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 0 / 14 | 0% |
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/lock-file` | 0 | 0.86 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 0.77 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.41 ms |
| `lambda-security/no-secrets-in-env` | 0 | 0.33 ms |
| `node-security/no-zip-slip` | 0 | 0.32 ms |
| `node-security/no-buffer-overread` | 0 | 0.24 ms |
| `lambda-security/no-hardcoded-credentials-sdk` | 0 | 0.23 ms |
| `node-security/detect-child-process` | 0 | 0.22 ms |
| `secure-coding/detect-object-injection` | 0 | 0.2 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.19 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 0.86 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 0.77 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.41 ms | 0 |
| `lambda-security/no-secrets-in-env` | 0.33 ms | 0 |
| `node-security/no-zip-slip` | 0.32 ms | 0 |
| `node-security/no-buffer-overread` | 0.24 ms | 0 |
| `lambda-security/no-hardcoded-credentials-sdk` | 0.23 ms | 0 |
| `node-security/detect-child-process` | 0.22 ms | 0 |
| `secure-coding/detect-object-injection` | 0.2 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.19 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `platform/src/**/*.ts`
