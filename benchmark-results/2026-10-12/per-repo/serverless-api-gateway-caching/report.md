# ILB-Wild — serverless-api-gateway-caching

> Pinned: `542120f7483ab1ee8213ce7499b60d62b9635aa8` · 200 ⭐ · Serverless Plugin

## Summary

| Metric | Value |
|---|---|
| Files linted | 6 |
| Lines of code | 802 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 3 runs) | **1354 ms** (±53, CV 3.9%) |
| Per-file lint cost | 225.67 ms/file |
| Peak RSS | 263 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 0 / 14 | 0% |
| node-security | 0 / 43 | 0% |
| secure-coding | 0 / 34 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-privilege-escalation` | 0 | 2.61 ms |
| `lambda-security/no-hardcoded-credentials-sdk` | 0 | 3.43 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 3.26 ms |
| `secure-coding/no-ldap-injection` | 0 | 3.24 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 1.88 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 1.84 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 1.26 ms |
| `node-security/no-unsafe-buffer-alloc` | 0 | 0.94 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.98 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.96 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `lambda-security/no-hardcoded-credentials-sdk` | 3.43 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 3.26 ms | 0 |
| `secure-coding/no-ldap-injection` | 3.24 ms | 0 |
| `secure-coding/no-privilege-escalation` | 2.61 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.88 ms | 0 |
| `secure-coding/no-sensitive-data-exposure` | 1.84 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 1.26 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.98 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.96 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 0.94 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `src/**/*.js`
