# ILB-Wild — cal.com

> Pinned: `27fc24c9063bec9442552139dd37bdc2e4a82ca8` · 35K ⭐ · Full-Stack SaaS

## Summary

| Metric | Value |
|---|---|
| Files linted | 328 |
| Lines of code | 15,960 |
| Total findings | 13 (3 errors, 10 warnings) |
| Findings density | **0.81 / kLoC** |
| Files with findings | 12 (3.7%) |
| Wall-clock (median, 3 runs) | **2265 ms** (±68, CV 3%) |
| Per-file lint cost | 6.91 ms/file |
| Peak RSS | 478 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 1 / 46 | 2.2% |
| node-security | 2 / 43 | 4.7% |
| secure-coding | 0 / 34 | 0% |
| express-security | 0 / 28 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/no-timing-unsafe-compare` | 10 | 13.28 ms |
| `browser-security/no-credentials-in-query-params` | 2 | 3.35 ms |
| `node-security/no-math-random-crypto` | 1 | 7.5 ms |
| `browser-security/no-http-urls` | 0 | 65.54 ms |
| `express-security/require-helmet` | 0 | 37.48 ms |
| `secure-coding/no-privilege-escalation` | 0 | 27.08 ms |
| `secure-coding/no-ldap-injection` | 0 | 25.25 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 21.91 ms |
| `browser-security/no-innerhtml` | 0 | 18.24 ms |
| `browser-security/no-eval` | 0 | 16.05 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `browser-security/no-http-urls` | 65.54 ms | 0 |
| `express-security/require-helmet` | 37.48 ms | 0 |
| `secure-coding/no-privilege-escalation` | 27.08 ms | 0 |
| `secure-coding/no-ldap-injection` | 25.25 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 21.91 ms | 0 |
| `browser-security/no-innerhtml` | 18.24 ms | 0 |
| `browser-security/no-eval` | 16.05 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 14.57 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 13.28 ms | 10 |
| `browser-security/no-websocket-eval` | 12.47 ms | 0 |

## Sample findings (first 15)

- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/webhook/app-credential/route.ts:26 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-math-random-crypto` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/teams/create/route.ts:23 — 🔒 CWE-338 OWASP:A04-Cryptographic CVSS:5.3 \| Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values. \| CRITICAL Fix: Use crypto.ran
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/sync/helpscout/route.ts:46 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/recorded-daily-video/route.ts:49 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/recorded-daily-video/route.ts:72 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/webhookTriggers/route.ts:11 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/syncAppMeta/route.ts:22 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/monthlyDigestEmail/route.ts:20 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/downgradeUsers/route.ts:16 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/checkSmsPrices/route.ts:15 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/changeTimeZone/route.ts:27 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/cron/bookingReminder/route.ts:19 — 🔒 CWE-208 OWASP:A02-Security CVSS:5.9 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-ti
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/(main-nav)/teams/page.tsx:26 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `apps/web/app/**/*.{ts,tsx}`
