# ILB-Wild — payload

> Pinned: `744a8a88d5eefe246fe3c63dc35922539b1eb709` · 35K ⭐ · Headless CMS

## Summary

| Metric | Value |
|---|---|
| Files linted | 635 |
| Lines of code | 67,381 |
| Total findings | 16 (5 errors, 11 warnings) |
| Findings density | **0.24 / kLoC** |
| Files with findings | 8 (1.3%) |
| Wall-clock (median, 3 runs) | **3448 ms** (±86, CV 2.5%) |
| Per-file lint cost | 5.43 ms/file |
| Peak RSS | 734 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 2 / 43 | 4.7% |
| secure-coding | 4 / 34 | 11.8% |
| express-security | 0 / 28 | 0% |
| mongodb-security | 2 / 16 | 12.5% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `mongodb-security/no-bypass-middleware` | 6 | 0.76 ms |
| `mongodb-security/no-unbounded-find` | 4 | 1.06 ms |
| `secure-coding/no-improper-sanitization` | 1 | 8.69 ms |
| `node-security/detect-eval-with-expression` | 1 | 10.13 ms |
| `secure-coding/no-redos-vulnerable-regex` | 1 | 163.29 ms |
| `node-security/no-toctou-vulnerability` | 1 | 14.9 ms |
| `secure-coding/no-fail-open-auth` | 1 | 7.66 ms |
| `secure-coding/no-weak-password-recovery` | 1 | 9.12 ms |
| `mongodb-security/no-unsafe-query` | 0 | 213.7 ms |
| `express-security/require-helmet` | 0 | 120.72 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `mongodb-security/no-unsafe-query` | 213.7 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 163.29 ms | 1 |
| `express-security/require-helmet` | 120.72 ms | 0 |
| `secure-coding/no-ldap-injection` | 75.95 ms | 0 |
| `secure-coding/no-privilege-escalation` | 48.61 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 39.48 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 27.24 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 26.27 ms | 0 |
| `node-security/detect-child-process` | 17.21 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 16.46 ms | 0 |

## Sample findings (first 15)

- `mongodb-security/no-unbounded-find` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/up.ts:112 — ℹ️ CWE-400 OWASP:A04-Insecure CVSS:4.3 \| find() without limit() may return excessive data \| LOW Fix: Add .limit(100) or appropriate limit to the query \| https://www.mongodb.com/docs/manual/reference/method/cursor.limit/
- `mongodb-security/no-bypass-middleware` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/up.ts:153 — ℹ️ CWE-284 OWASP:A01-Broken CVSS:5.3 \| This method bypasses Mongoose middleware hooks \| MEDIUM Fix: Use findOne + save() pattern to ensure middleware runs \| https://mongoosejs.com/docs/middleware.html
- `mongodb-security/no-unbounded-find` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/up.ts:176 — ℹ️ CWE-400 OWASP:A04-Insecure CVSS:4.3 \| find() without limit() may return excessive data \| LOW Fix: Add .limit(100) or appropriate limit to the query \| https://www.mongodb.com/docs/manual/reference/method/cursor.limit/
- `mongodb-security/no-bypass-middleware` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/up.ts:204 — ℹ️ CWE-284 OWASP:A01-Broken CVSS:5.3 \| This method bypasses Mongoose middleware hooks \| MEDIUM Fix: Use findOne + save() pattern to ensure middleware runs \| https://mongoosejs.com/docs/middleware.html
- `mongodb-security/no-bypass-middleware` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/up.ts:245 — ℹ️ CWE-284 OWASP:A01-Broken CVSS:5.3 \| This method bypasses Mongoose middleware hooks \| MEDIUM Fix: Use findOne + save() pattern to ensure middleware runs \| https://mongoosejs.com/docs/middleware.html
- `mongodb-security/no-unbounded-find` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/down.ts:60 — ℹ️ CWE-400 OWASP:A04-Insecure CVSS:4.3 \| find() without limit() may return excessive data \| LOW Fix: Add .limit(100) or appropriate limit to the query \| https://www.mongodb.com/docs/manual/reference/method/cursor.limit/
- `mongodb-security/no-bypass-middleware` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/down.ts:78 — ℹ️ CWE-284 OWASP:A01-Broken CVSS:5.3 \| This method bypasses Mongoose middleware hooks \| MEDIUM Fix: Use findOne + save() pattern to ensure middleware runs \| https://mongoosejs.com/docs/middleware.html
- `mongodb-security/no-unbounded-find` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/down.ts:100 — ℹ️ CWE-400 OWASP:A04-Insecure CVSS:4.3 \| find() without limit() may return excessive data \| LOW Fix: Add .limit(100) or appropriate limit to the query \| https://www.mongodb.com/docs/manual/reference/method/cursor.limit/
- `mongodb-security/no-bypass-middleware` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/down.ts:107 — ℹ️ CWE-284 OWASP:A01-Broken CVSS:5.3 \| This method bypasses Mongoose middleware hooks \| MEDIUM Fix: Use findOne + save() pattern to ensure middleware runs \| https://mongoosejs.com/docs/middleware.html
- `mongodb-security/no-bypass-middleware` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/versions/migrations/localizeStatus/mongo/down.ts:132 — ℹ️ CWE-284 OWASP:A01-Broken CVSS:5.3 \| This method bypasses Mongoose middleware hooks \| MEDIUM Fix: Use findOne + save() pattern to ensure middleware runs \| https://mongoosejs.com/docs/middleware.html
- `secure-coding/no-improper-sanitization` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/utilities/sanitizeUserDataForEmail.ts:50 — 🔒 CWE-116 \| HTML escaping misses dangerous characters \| MEDIUM Fix: Escape all HTML special characters: & < > " ' \| https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- `node-security/detect-eval-with-expression` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/utilities/dynamicImport.ts:27 — 🔒 CWE-95 OWASP:A05-Injection CVSS:9.8 \| Use template literals instead of eval() for string interpolation \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Replace eval() with template literals: `Hello ${name}` \| https://owasp.org/www-community/attack
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/uploads/fetchAPI-multipart/isEligibleRequest.ts:2 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Self-loop quantifier (exponential backtracking): A quantifier reaches itself via the parent loop. An attacker can craft input that triggers exponential backtracking. \| CRITICAL Fix: Atomic group,
- `node-security/no-toctou-vulnerability` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/database/migrations/createMigration.ts:14 — 🔒 CWE-367 OWASP:A04-Cryptographic CVSS:7 \| Time-of-check Time-of-use race condition detected \| HIGH Fix: Act on the result and handle the failure — open/unlink and catch ENOENT — instead of checking first. Not a finding if the path is i
- `secure-coding/no-fail-open-auth` — /Users/ofri/repos/ofriperetz.dev/oos/payload/packages/payload/src/auth/executeAuthStrategies.ts:29 — 🔒 CWE-636 OWASP:A10-Mishandling CVSS:8.1 \| Security check fails open — the catch block swallows the error and execution continues into the code the check was guarding \| HIGH Fix: Rethrow, return a deny value, or send a 401/403 from the

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/payload/src/**/*.ts`
