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
| Wall-clock (median, 3 runs) | **1710 ms** (±290, CV 17.8%) |
| Per-file lint cost | 46.22 ms/file |
| Peak RSS | 301 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 0 / 46 | 0% |
| secure-coding | 0 / 34 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0 | 5.69 ms |
| `browser-security/no-http-urls` | 0 | 7.76 ms |
| `secure-coding/no-ldap-injection` | 0 | 7.53 ms |
| `secure-coding/no-privilege-escalation` | 0 | 7.04 ms |
| `browser-security/no-innerhtml` | 0 | 3.92 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 3.79 ms |
| `browser-security/no-eval` | 0 | 3.63 ms |
| `secure-coding/no-redos-vulnerable-regex` | 0 | 2.38 ms |
| `browser-security/no-websocket-eval` | 0 | 2.52 ms |
| `secure-coding/no-graphql-injection` | 0 | 2.12 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `browser-security/no-http-urls` | 7.76 ms | 0 |
| `secure-coding/no-ldap-injection` | 7.53 ms | 0 |
| `secure-coding/no-privilege-escalation` | 7.04 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 5.69 ms | 0 |
| `browser-security/no-innerhtml` | 3.92 ms | 0 |
| `secure-coding/no-sensitive-data-exposure` | 3.79 ms | 0 |
| `browser-security/no-eval` | 3.63 ms | 0 |
| `browser-security/no-websocket-eval` | 2.52 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 2.38 ms | 0 |
| `browser-security/no-postmessage-innerhtml` | 2.23 ms | 0 |

## Sample findings (first 15)

_(no findings)_

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/react-dom/src/**/*.{js,ts}`
