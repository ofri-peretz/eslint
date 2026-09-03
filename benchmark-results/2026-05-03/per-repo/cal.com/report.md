# ILB-Wild — cal.com

> Pinned: `main` · 35K ⭐ · Full-Stack SaaS

## Summary

| Metric | Value |
|---|---|
| Files linted | 196 |
| Lines of code | 10,235 |
| Total findings | 15 (13 errors, 2 warnings) |
| Findings density | **1.47 / kLoC** |
| Files with findings | 13 (6.6%) |
| Wall-clock (median, 1 runs) | **1454 ms** (±0, CV 0%) |
| Per-file lint cost | 7.42 ms/file |
| Peak RSS | 263 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 0 / 45 | 0% |
| node-security | 1 / 33 | 3% |
| secure-coding | 2 / 28 | 7.1% |
| express-security | 0 / 10 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 12 | 1.67 ms |
| `secure-coding/no-sensitive-data-exposure` | 2 | 0.6 ms |
| `node-security/lock-file` | 1 | 4.74 ms |
| `node-security/no-zip-slip` | 0 | 2.38 ms |
| `secure-coding/no-graphql-injection` | 0 | 1.68 ms |
| `node-security/detect-suspicious-dependencies` | 0 | 1.05 ms |
| `browser-security/no-clickjacking` | 0 | 1.04 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.94 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.87 ms |
| `node-security/no-buffer-overread` | 0 | 0.86 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 4.74 ms | 1 |
| `node-security/no-zip-slip` | 2.38 ms | 0 |
| `secure-coding/no-graphql-injection` | 1.68 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.67 ms | 12 |
| `node-security/detect-suspicious-dependencies` | 1.05 ms | 0 |
| `browser-security/no-clickjacking` | 1.04 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.94 ms | 0 |
| `secure-coding/no-unchecked-loop-condition` | 0.87 ms | 0 |
| `node-security/no-buffer-overread` | 0.86 ms | 0 |
| `secure-coding/no-xpath-injection` | 0.84 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/version/route.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/tasks/cron/route.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/tasks/cleanup/route.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/me/route.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/geolocation/route.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/api/email/route.ts:1 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/settings/(settings-layout)/security/two-factor-auth/page.tsx:22 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/settings/(settings-layout)/security/password/page.tsx:10 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Common password detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitio
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/settings/(settings-layout)/security/password/page.tsx:21 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Common password detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitio
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/webhooks/new/page.tsx:16 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/settings/(admin-layout)/admin/page.tsx:5 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Common password detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitio
- `node-security/lock-file` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/settings/(admin-layout)/admin/users/[id]/edit/error.tsx:1 — 🔒 CWE-829 OWASP:A03-Software CVSS:7.5 \| Package lock file missing (package-lock.json \| yarn.lock \| pnpm-lock.yaml) for any. Commit the lock file to ensure supply chain integrity. \| HIGH
   Fix: Generate and commit the package-lock.json \| y
- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/refer/DubReferralsPage.tsx:25 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in logs: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2]
   Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html
- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(use-page-wrapper)/refer/DubReferralsPage.tsx:42 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in logs: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2]
   Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/cal.com/apps/web/app/(booking-page-wrapper)/booking/dry-run-successful/page.tsx:8 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `apps/web/app/**/*.{ts,tsx}`
