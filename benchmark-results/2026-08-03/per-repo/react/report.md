# ILB-Wild — react

> Pinned: `d5736f098edee62c44f27b053e6e48f5fa443803` · 230K ⭐ · UI Library (FP corpus)
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
| Wall-clock (median, 3 runs) | **1301 ms** (±668, CV 39.5%) |
| Per-file lint cost | 35.16 ms/file |
| Peak RSS | 119 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 0 / 45 | 0% |
| secure-coding | 0 / 29 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0 | 1.18 ms |
| `secure-coding/detect-object-injection` | 0 | 0.64 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.57 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.51 ms |
| `browser-security/no-clickjacking` | 0 | 0.43 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.39 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.33 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.26 ms |
| `secure-coding/no-weak-password-recovery` | 0 | 0.3 ms |
| `browser-security/no-innerhtml` | 0 | 0.28 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 1.18 ms | 0 |
| `browser-security/no-unsafe-eval-csp` | 0.76 ms | 0 |
| `secure-coding/detect-object-injection` | 0.64 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.57 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.51 ms | 0 |
| `browser-security/no-clickjacking` | 0.43 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.39 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.33 ms | 0 |
| `secure-coding/no-weak-password-recovery` | 0.3 ms | 0 |
| `browser-security/no-innerhtml` | 0.28 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/react-dom/src/**/*.{js,ts}`
