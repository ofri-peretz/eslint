# ILB-Wild — supabase

> Pinned: `f0f3784633342072111117cfa4c7d3a32357bcbf` · 78K ⭐ · Database Platform

## Summary

| Metric | Value |
|---|---|
| Files linted | 763 |
| Lines of code | 90,708 |
| Total findings | 5 (4 errors, 1 warnings) |
| Findings density | **0.06 / kLoC** |
| Files with findings | 5 (0.7%) |
| Wall-clock (median, 3 runs) | **6763 ms** (±87, CV 1.3%) |
| Per-file lint cost | 8.86 ms/file |
| Peak RSS | 1031 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 5 / 46 | 10.9% |
| postgresql-security | 0 / 13 | 0% |
| jwt-security | 0 / 13 | 0% |
| node-security | 0 / 43 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `browser-security/no-innerhtml` | 1 | 75.1 ms |
| `browser-security/require-blob-url-revocation` | 1 | 5.52 ms |
| `browser-security/require-https-only` | 1 | 8.49 ms |
| `browser-security/no-credentials-in-query-params` | 1 | 13.04 ms |
| `browser-security/no-http-urls` | 1 | 334.73 ms |
| `postgresql-security/no-unsafe-query` | 0 | 2719.37 ms |
| `jwt-security/no-algorithm-none` | 0 | 112.19 ms |
| `browser-security/no-eval` | 0 | 65.8 ms |
| `browser-security/no-websocket-eval` | 0 | 59.01 ms |
| `browser-security/no-postmessage-innerhtml` | 0 | 58.21 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `postgresql-security/no-unsafe-query` | 2719.37 ms | 0 |
| `browser-security/no-http-urls` | 334.73 ms | 1 |
| `jwt-security/no-algorithm-none` | 112.19 ms | 0 |
| `browser-security/no-innerhtml` | 75.1 ms | 1 |
| `browser-security/no-eval` | 65.8 ms | 0 |
| `browser-security/no-websocket-eval` | 59.01 ms | 0 |
| `browser-security/no-postmessage-innerhtml` | 58.21 ms | 0 |
| `browser-security/no-websocket-innerhtml` | 55.15 ms | 0 |
| `browser-security/no-filereader-innerhtml` | 52.61 ms | 0 |
| `browser-security/no-worker-message-innerhtml` | 51.82 ms | 0 |

## Sample findings (first 15)

- `browser-security/no-innerhtml` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/studio/components/to-be-cleaned/TooltipListener.tsx:32 — 🔒 CWE-79 OWASP:A05-Injection CVSS:6.1 \| Assigning to innerHTML with template literal with expressions can execute malicious scripts. This is a critical XSS vulnerability. \| CRITICAL [SOC2,PCI-DSS,GDPR,ISO27001] Fix: Sanitize with DOMPur
- `browser-security/require-blob-url-revocation` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/studio/components/layouts/ProjectLayout/LayoutHeader/FeedbackDropdown/FeedbackWidget.tsx:154 — 🔒 CWE-401 OWASP:A06-Vulnerable CVSS:5.3 \| URL.createObjectURL() creates a reference that persists until explicitly revoked. Without revokeObjectURL(), memory leaks occur. \| MEDIUM Fix: Call URL.revokeObjectURL(blobUrl) when the URL is n
- `browser-security/require-https-only` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/studio/components/interfaces/Settings/Database/NetworkRestrictions/AddRestrictionModal.tsx:103 — 🔒 CWE-319 OWASP:A02-Security CVSS:7.5 \| Enforce HTTPS for all external requests detected - this is a security risk \| HIGH Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/no-credentials-in-query-params` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/studio/components/interfaces/Settings/Database/DatabaseSettings/DatabaseSettings.tsx:260 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Credentials detected in URL query parameters - this is a security risk \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Use secure methods: POST body, headers (Authorization), or secure cookies \| ht
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/supabase/studio/components/interfaces/Database/Hooks/HTTPRequestFields.tsx:85 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://api.com/path/resource" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `studio/components/**/*.{ts,tsx}`
