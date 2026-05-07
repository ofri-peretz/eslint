# ILB-Wild — appwrite

> Pinned: `main` · 48K ⭐ · BaaS Platform

## Summary

| Metric | Value |
|---|---|
| Files linted | 15 |
| Lines of code | 4,080 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1226 ms** (±0, CV 0%) |
| Per-file lint cost | 81.73 ms/file |
| Peak RSS | 209 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |
| crypto | 0 / 11 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| — | — | — |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| — | — | — |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `public/sdk-console/**/*.ts`
