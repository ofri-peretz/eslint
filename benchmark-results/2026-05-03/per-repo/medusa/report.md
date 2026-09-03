# ILB-Wild — medusa

> Pinned: `develop` · 28K ⭐ · E-commerce Backend

## Summary

| Metric | Value |
|---|---|
| Files linted | 709 |
| Lines of code | 40,632 |
| Total findings | 2 (0 errors, 2 warnings) |
| Findings density | **0.05 / kLoC** |
| Files with findings | 1 (0.1%) |
| Wall-clock (median, 1 runs) | **1422 ms** (±0, CV 0%) |
| Per-file lint cost | 2.01 ms/file |
| Peak RSS | 259 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 0 / 33 | 0% |
| secure-coding | 1 / 28 | 3.6% |
| express-security | 0 / 10 | 0% |
| pg | 0 / 13 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-insecure-comparison` | 2 | 0.85 ms |
| `node-security/lock-file` | 0 | 4.56 ms |
| `secure-coding/no-graphql-injection` | 0 | 1.66 ms |
| `node-security/detect-child-process` | 0 | 1.16 ms |
| `node-security/no-buffer-overread` | 0 | 1.11 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 1.08 ms |
| `node-security/no-zip-slip` | 0 | 1.04 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.82 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.81 ms |
| `secure-coding/no-improper-sanitization` | 0 | 0.78 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 4.56 ms | 0 |
| `secure-coding/no-graphql-injection` | 1.66 ms | 0 |
| `node-security/detect-child-process` | 1.16 ms | 0 |
| `node-security/no-buffer-overread` | 1.11 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.08 ms | 0 |
| `node-security/no-zip-slip` | 1.04 ms | 0 |
| `secure-coding/no-insecure-comparison` | 0.85 ms | 2 |
| `secure-coding/no-unchecked-loop-condition` | 0.82 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.81 ms | 0 |
| `secure-coding/no-improper-sanitization` | 0.78 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/utils/default-policy-operations.ts:5 — 🔒 CWE-208 \| Secret comparison with !== can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/utils/default-policy-operations.ts:5 — 🔒 CWE-208 \| Secret comparison with !== can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/medusa/src/**/*.ts`
