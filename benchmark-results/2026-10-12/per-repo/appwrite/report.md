# ILB-Wild — appwrite

> Pinned: `a5fa09b4ceb5945d98244612a3d8d1a780533e93` · 48K ⭐ · BaaS Platform

## Summary

| Metric | Value |
|---|---|
| Files linted | 15 |
| Lines of code | 4,080 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 3 runs) | **1383 ms** (±21, CV 1.5%) |
| Per-file lint cost | 92.2 ms/file |
| Peak RSS | 297 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 0 / 43 | 0% |
| secure-coding | 0 / 34 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-ldap-injection` | 0 | 6.39 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 4.67 ms |
| `secure-coding/no-privilege-escalation` | 0 | 2.45 ms |
| `node-security/no-math-random-crypto` | 0 | 1.07 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 1.84 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 1.87 ms |
| `node-security/no-unsafe-buffer-alloc` | 0 | 1.74 ms |
| `secure-coding/no-graphql-injection` | 0 | 1.76 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 1.61 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 1.38 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-ldap-injection` | 6.39 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 4.67 ms | 0 |
| `secure-coding/no-privilege-escalation` | 2.45 ms | 0 |
| `secure-coding/no-sensitive-data-exposure` | 1.87 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 1.84 ms | 0 |
| `secure-coding/no-graphql-injection` | 1.76 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 1.74 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 1.61 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 1.38 ms | 0 |
| `secure-coding/no-xpath-injection` | 1.21 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `public/sdk-console/**/*.ts`
