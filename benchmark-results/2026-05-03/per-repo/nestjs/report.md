# ILB-Wild — nestjs

> Pinned: `master` · 70K ⭐ · Backend Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 596 |
| Lines of code | 42,142 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1383 ms** (±0, CV 0%) |
| Per-file lint cost | 2.32 ms/file |
| Peak RSS | 250 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| nestjs-security | 0 / 6 | 0% |
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/lock-file` | 0 | 4.25 ms |
| `secure-coding/no-graphql-injection` | 0 | 1.73 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 1.18 ms |
| `node-security/no-buffer-overread` | 0 | 1.05 ms |
| `nestjs-security/require-guards` | 0 | 1.03 ms |
| `node-security/no-zip-slip` | 0 | 0.94 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.93 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.79 ms |
| `node-security/detect-child-process` | 0 | 0.79 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.74 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 4.25 ms | 0 |
| `secure-coding/no-graphql-injection` | 1.73 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.18 ms | 0 |
| `node-security/no-buffer-overread` | 1.05 ms | 0 |
| `nestjs-security/require-guards` | 1.03 ms | 0 |
| `node-security/no-zip-slip` | 0.94 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.93 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.79 ms | 0 |
| `node-security/detect-child-process` | 0.79 ms | 0 |
| `secure-coding/no-unchecked-loop-condition` | 0.74 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/**/*.ts`
