# ILB-Wild — nestjs-typeorm

> Pinned: `master` · 2K ⭐ · NestJS Module

## Summary

| Metric | Value |
|---|---|
| Files linted | 16 |
| Lines of code | 803 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1363 ms** (±0, CV 0%) |
| Per-file lint cost | 85.19 ms/file |
| Peak RSS | 206 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| nestjs-security | 0 / 6 | 0% |
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |
| pg | 0 / 13 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0 | 0.39 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.27 ms |
| `secure-coding/detect-object-injection` | 0 | 0.24 ms |
| `node-security/lock-file` | 0 | 0.24 ms |
| `node-security/no-buffer-overread` | 0 | 0.23 ms |
| `node-security/detect-child-process` | 0 | 0.2 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.17 ms |
| `pg/prevent-double-release` | 0 | 0.17 ms |
| `secure-coding/detect-non-literal-regexp` | 0 | 0.17 ms |
| `node-security/no-zip-slip` | 0 | 0.17 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0.39 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.27 ms | 0 |
| `secure-coding/detect-object-injection` | 0.24 ms | 0 |
| `node-security/lock-file` | 0.24 ms | 0 |
| `node-security/no-buffer-overread` | 0.23 ms | 0 |
| `node-security/detect-child-process` | 0.2 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.17 ms | 0 |
| `pg/prevent-double-release` | 0.17 ms | 0 |
| `secure-coding/detect-non-literal-regexp` | 0.17 ms | 0 |
| `node-security/no-zip-slip` | 0.17 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `lib/**/*.ts`
