# ILB-Wild — babel

> Pinned: `3b4cbdcfb7f974cad9bc11681353bf515cd72559` · 43K ⭐ · Compiler (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 41 |
| Lines of code | 24,412 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 3 runs) | **1533 ms** (±224, CV 16.2%) |
| Per-file lint cost | 37.39 ms/file |
| Peak RSS | 115 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| secure-coding | 0 / 29 | 0% |
| node-security | 0 / 37 | 0% |

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
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/babel-parser/src/**/*.{js,ts}`
