# ILB-Wild — medusa

> Pinned: `de51a3b99e5b66d6e085e77d91886e5676a9bf3d` · 28K ⭐ · E-commerce Backend

## Summary

| Metric | Value |
|---|---|
| Files linted | 710 |
| Lines of code | 40,755 |
| Total findings | 5 (2 errors, 3 warnings) |
| Findings density | **0.12 / kLoC** |
| Files with findings | 5 (0.7%) |
| Wall-clock (median, 3 runs) | **3792 ms** (±39, CV 1%) |
| Per-file lint cost | 5.34 ms/file |
| Peak RSS | 679 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 1 / 43 | 2.3% |
| secure-coding | 2 / 34 | 5.9% |
| express-security | 1 / 28 | 3.6% |
| postgresql-security | 0 / 13 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-unlimited-resource-allocation` | 2 | 16.83 ms |
| `secure-coding/no-sensitive-data-exposure` | 1 | 13.49 ms |
| `express-security/no-exposed-debug-endpoints` | 1 | 1.8 ms |
| `node-security/no-shell-injection` | 1 | 4.14 ms |
| `postgresql-security/no-unsafe-query` | 0 | 1082.8 ms |
| `express-security/require-helmet` | 0 | 71 ms |
| `secure-coding/no-privilege-escalation` | 0 | 71.42 ms |
| `secure-coding/no-ldap-injection` | 0 | 52.01 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 34.05 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 34.79 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `postgresql-security/no-unsafe-query` | 1082.8 ms | 0 |
| `secure-coding/no-privilege-escalation` | 71.42 ms | 0 |
| `express-security/require-helmet` | 71 ms | 0 |
| `secure-coding/no-ldap-injection` | 52.01 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 34.79 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 34.05 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 20.02 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 18.26 ms | 0 |
| `node-security/detect-child-process` | 17.21 ms | 0 |
| `node-security/no-toctou-vulnerability` | 16.94 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/commands/user.ts:68 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in logs: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2] Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html
- `express-security/no-exposed-debug-endpoints` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/commands/start.ts:315 — 🔒 CWE-489 \| Debug endpoint exposed without authentication \| HIGH Fix: Remove debug endpoints from production or add authentication \| https://cwe.mitre.org/data/definitions/489.html
- `node-security/no-shell-injection` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/commands/develop.ts:160 — 🔒 CWE-78 OWASP:A05-Injection CVSS:9.8 \| Shell command built via string concatenation or template literal. An attacker who controls any interpolated value can execute arbitrary OS commands. \| CRITICAL [SOC2,PCI-DSS,ISO27001,NIST-CSF] Fix
- `secure-coding/no-unlimited-resource-allocation` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/api/admin/uploads/middlewares.ts:14 — 🔒 CWE-770 OWASP:A04-Cryptographic CVSS:7.5 \| File operations without size limits \| MEDIUM Fix: Validate file size before operations — Not a finding if the decompressed bytes are counted against a ceiling downstream \| https://nodejs.org/
- `secure-coding/no-unlimited-resource-allocation` — /Users/ofri/repos/ofriperetz.dev/oos/medusa/packages/medusa/src/api/admin/products/middlewares.ts:41 — 🔒 CWE-770 OWASP:A04-Cryptographic CVSS:7.5 \| File operations without size limits \| MEDIUM Fix: Validate file size before operations — Not a finding if the decompressed bytes are counted against a ceiling downstream \| https://nodejs.org/

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/medusa/src/**/*.ts`
