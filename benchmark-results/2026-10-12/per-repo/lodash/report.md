# ILB-Wild — lodash

> Pinned: `a02353279093cca0fea1c8cc468ffbf03bb3485b` · 60K ⭐ · Utility Library (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 4 |
| Lines of code | 951 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 3 runs) | **1248 ms** (±90, CV 7.1%) |
| Per-file lint cost | 312 ms/file |
| Peak RSS | 257 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| secure-coding | 0 / 34 | 0% |
| node-security | 0 / 43 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/no-timing-unsafe-compare` | 0 | 3 ms |
| `secure-coding/no-ldap-injection` | 0 | 2.81 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 2.61 ms |
| `secure-coding/no-privilege-escalation` | 0 | 1.54 ms |
| `secure-coding/no-graphql-injection` | 0 | 1.05 ms |
| `node-security/no-unsafe-buffer-alloc` | 0 | 0.94 ms |
| `secure-coding/no-fail-open-auth` | 0 | 0.86 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 0.82 ms |
| `secure-coding/no-xxe-injection` | 0 | 0.77 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.66 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/no-timing-unsafe-compare` | 3 ms | 0 |
| `secure-coding/no-ldap-injection` | 2.81 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 2.61 ms | 0 |
| `secure-coding/no-privilege-escalation` | 1.54 ms | 0 |
| `secure-coding/no-graphql-injection` | 1.05 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 0.94 ms | 0 |
| `secure-coding/no-fail-open-auth` | 0.86 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 0.82 ms | 0 |
| `secure-coding/no-xxe-injection` | 0.77 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.67 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `fp/**/*.js`
