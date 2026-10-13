# ILB-Wild — nestjs-typeorm

> Pinned: `c71e849084b892dfde62bd70318d2983459f69f5` · 2K ⭐ · NestJS Module

## Summary

| Metric | Value |
|---|---|
| Files linted | 16 |
| Lines of code | 803 |
| Total findings | 0 (0 errors, 0 warnings) |
| Findings density | **0 / kLoC** |
| Files with findings | 0 (0.0%) |
| Wall-clock (median, 3 runs) | **1564 ms** (±10, CV 0.7%) |
| Per-file lint cost | 97.75 ms/file |
| Peak RSS | 285 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| nestjs-security | 0 / 10 | 0% |
| node-security | 0 / 43 | 0% |
| secure-coding | 0 / 34 | 0% |
| postgresql-security | 0 / 13 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `postgresql-security/no-unsafe-query` | 0 | 57.71 ms |
| `nestjs-security/require-guards` | 0 | 12.87 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 2.24 ms |
| `secure-coding/no-ldap-injection` | 0 | 2.14 ms |
| `secure-coding/no-privilege-escalation` | 0 | 1.89 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 1.64 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 1.32 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 1.01 ms |
| `secure-coding/no-graphql-injection` | 0 | 1 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.95 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `postgresql-security/no-unsafe-query` | 57.71 ms | 0 |
| `nestjs-security/require-guards` | 12.87 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 2.24 ms | 0 |
| `secure-coding/no-ldap-injection` | 2.14 ms | 0 |
| `secure-coding/no-privilege-escalation` | 1.89 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 1.64 ms | 0 |
| `secure-coding/no-sensitive-data-exposure` | 1.32 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 1.01 ms | 0 |
| `secure-coding/no-graphql-injection` | 1 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.95 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `lib/**/*.ts`
