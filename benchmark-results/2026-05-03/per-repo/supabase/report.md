# ILB-Wild — supabase

> Pinned: `master` · 78K ⭐ · Database Platform

## Summary

| Metric | Value |
|---|---|
| Files linted | 2,042 |
| Lines of code | 295,982 |
| Total findings | 12 (12 errors, 0 warnings) |
| Findings density | **0.04 / kLoC** |
| Files with findings | 4 (0.2%) |
| Wall-clock (median, 1 runs) | **1749 ms** (±0, CV 0%) |
| Per-file lint cost | 0.86 ms/file |
| Peak RSS | 387 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 4 / 45 | 8.9% |
| pg | 0 / 13 | 0% |
| jwt | 0 / 13 | 0% |
| node-security | 0 / 33 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `browser-security/no-credentials-in-query-params` | 4 | 2.5 ms |
| `browser-security/detect-mixed-content` | 3 | 0.74 ms |
| `browser-security/no-http-urls` | 3 | 1.36 ms |
| `browser-security/no-clickjacking` | 2 | 3.65 ms |
| `node-security/lock-file` | 0 | 11.82 ms |
| `node-security/no-zip-slip` | 0 | 7.29 ms |
| `node-security/require-dependency-integrity` | 0 | 3.06 ms |
| `node-security/no-buffer-overread` | 0 | 2.87 ms |
| `node-security/detect-suspicious-dependencies` | 0 | 2.09 ms |
| `browser-security/no-innerhtml` | 0 | 1.76 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 11.82 ms | 0 |
| `node-security/no-zip-slip` | 7.29 ms | 0 |
| `browser-security/no-clickjacking` | 3.65 ms | 2 |
| `node-security/require-dependency-integrity` | 3.06 ms | 0 |
| `node-security/no-buffer-overread` | 2.87 ms | 0 |
| `browser-security/no-credentials-in-query-params` | 2.5 ms | 4 |
| `node-security/detect-suspicious-dependencies` | 2.09 ms | 0 |
| `browser-security/no-innerhtml` | 1.76 ms | 0 |
| `node-security/detect-child-process` | 1.75 ms | 0 |
| `node-security/no-data-in-temp-storage` | 1.63 ms | 0 |

## Sample findings (first 15)

- `browser-security/no-clickjacking` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/Storage/AnalyticsBuckets/index.tsx:1 — 🔒 CWE-1021 \| No frame-busting code to prevent clickjacking \| HIGH
   Fix: Add frame-busting JavaScript to prevent framing \| https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/OrganizationInvite/OrganizationInvite.tsx:44 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/OrganizationInvite/OrganizationInvite.tsx:44 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/OrganizationInvite/OrganizationInvite.tsx:45 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/OrganizationInvite/OrganizationInvite.tsx:45 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht
- `browser-security/detect-mixed-content` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/JwtSecrets/illustrations.tsx:7 — 🔒 CWE-311 OWASP:A04-Cryptographic CVSS:7.5 \| Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context \| MEDIUM
   Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/311.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/JwtSecrets/illustrations.tsx:7 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://www.w3.org/2000/svg" \| MEDIUM
   Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/detect-mixed-content` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/JwtSecrets/illustrations.tsx:139 — 🔒 CWE-311 OWASP:A04-Cryptographic CVSS:7.5 \| Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context \| MEDIUM
   Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/311.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/JwtSecrets/illustrations.tsx:139 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://www.w3.org/2000/svg" \| MEDIUM
   Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/detect-mixed-content` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/JwtSecrets/illustrations.tsx:248 — 🔒 CWE-311 OWASP:A04-Cryptographic CVSS:7.5 \| Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context \| MEDIUM
   Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/311.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/JwtSecrets/illustrations.tsx:248 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://www.w3.org/2000/svg" \| MEDIUM
   Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/no-clickjacking` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/apps/studio/components/interfaces/Account/TOTPFactors/index.tsx:1 — 🔒 CWE-1021 \| No frame-busting code to prevent clickjacking \| HIGH
   Fix: Add frame-busting JavaScript to prevent framing \| https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `apps/studio/components/**/*.{ts,tsx}`
