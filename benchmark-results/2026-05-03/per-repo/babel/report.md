# ILB-Wild — babel

> Pinned: `main` · 43K ⭐ · Compiler (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 41 |
| Lines of code | 24,416 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1482 ms** (±0, CV 0%) |
| Per-file lint cost | 36.15 ms/file |
| Peak RSS | 212 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| secure-coding | 0 / 28 | 0% |
| node-security | 0 / 33 | 0% |

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
- Glob: `packages/babel-parser/src/**/*.{js,ts}`
