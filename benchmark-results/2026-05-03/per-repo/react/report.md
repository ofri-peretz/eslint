# ILB-Wild — react

> Pinned: `main` · 230K ⭐ · UI Library (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 37 |
| Lines of code | 4,539 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 1 runs) | **1439 ms** (±0, CV 0%) |
| Per-file lint cost | 38.89 ms/file |
| Peak RSS | 207 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 0 / 45 | 0% |
| secure-coding | 0 / 28 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0 | 0.81 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.55 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.41 ms |
| `browser-security/no-clickjacking` | 0 | 0.38 ms |
| `secure-coding/no-insecure-comparison` | 0 | 0.33 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.31 ms |
| `browser-security/no-unsafe-inline-csp` | 0 | 0.28 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.27 ms |
| `secure-coding/detect-object-injection` | 0 | 0.26 ms |
| `secure-coding/detect-non-literal-regexp` | 0 | 0.24 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0.81 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.55 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.41 ms | 0 |
| `browser-security/no-clickjacking` | 0.38 ms | 0 |
| `secure-coding/no-insecure-comparison` | 0.33 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.31 ms | 0 |
| `browser-security/no-unsafe-inline-csp` | 0.28 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.27 ms | 0 |
| `secure-coding/detect-object-injection` | 0.26 ms | 0 |
| `secure-coding/detect-non-literal-regexp` | 0.24 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/react-dom/src/**/*.{js,ts}`
