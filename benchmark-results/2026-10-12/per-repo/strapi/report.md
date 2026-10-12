# ILB-Wild — strapi

> Pinned: `c5bc749feeb5b7b4f3d845b52da41277100465a8` · 66K ⭐ · Headless CMS

## Summary

| Metric | Value |
|---|---|
| Files linted | 77 |
| Lines of code | 7,342 |
| Total findings | 1 (0 errors, 1 warnings) |
| Findings density | **0.14 / kLoC** |
| Files with findings | 1 (1.3%) |
| Wall-clock (median, 3 runs) | **1771 ms** (±109, CV 6.3%) |
| Per-file lint cost | 23 ms/file |
| Peak RSS | 375 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 0 / 43 | 0% |
| secure-coding | 1 / 34 | 2.9% |
| express-security | 0 / 28 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-weak-password-recovery` | 1 | 2.23 ms |
| `express-security/require-helmet` | 0 | 17.23 ms |
| `secure-coding/no-privilege-escalation` | 0 | 15.61 ms |
| `secure-coding/no-ldap-injection` | 0 | 11.44 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 9.19 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 7.31 ms |
| `secure-coding/no-sensitive-data-exposure` | 0 | 7.21 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 6.85 ms |
| `secure-coding/no-redos-vulnerable-regex` | 0 | 5.21 ms |
| `node-security/no-toctou-vulnerability` | 0 | 4.48 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `express-security/require-helmet` | 17.23 ms | 0 |
| `secure-coding/no-privilege-escalation` | 15.61 ms | 0 |
| `secure-coding/no-ldap-injection` | 11.44 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 9.19 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 7.31 ms | 0 |
| `secure-coding/no-sensitive-data-exposure` | 7.21 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 6.85 ms | 0 |
| `secure-coding/no-graphql-injection` | 5.38 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 5.21 ms | 0 |
| `node-security/no-toctou-vulnerability` | 4.48 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-weak-password-recovery` — /Users/ofri/repos/ofriperetz.dev/oos/strapi/packages/core/strapi/src/cli/commands/admin/reset-user-password.ts:37 — 🔒 CWE-640 OWASP:A07-Authentication CVSS:8.1 \| Logging sensitive data during password recovery \| MEDIUM Fix: Never log passwords, tokens, or sensitive recovery data \| https://cwe.mitre.org/data/definitions/640.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/core/strapi/src/**/*.ts`
