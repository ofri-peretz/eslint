# ILB-Wild — serverless

> Pinned: `main` · 46K ⭐ · Serverless Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 609 |
| Lines of code | 128,881 |
| Total findings | 2399 (722 errors, 1677 warnings) |
| Findings density | **18.61 / kLoC** |
| Files with findings | 376 (61.7%) |
| Wall-clock (median, 1 runs) | **2930 ms** (±0, CV 0%) |
| Per-file lint cost | 4.81 ms/file |
| Peak RSS | 565 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 6 / 14 | 42.9% |
| node-security | 10 / 33 | 30.3% |
| secure-coding | 16 / 28 | 57.1% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 1255 | 22.99 ms |
| `secure-coding/no-insecure-comparison` | 330 | 12.11 ms |
| `secure-coding/no-hardcoded-credentials` | 320 | 17.57 ms |
| `node-security/detect-non-literal-fs-filename` | 62 | 4.88 ms |
| `secure-coding/no-unchecked-loop-condition` | 55 | 24.29 ms |
| `node-security/lock-file` | 47 | 34.58 ms |
| `secure-coding/no-unlimited-resource-allocation` | 42 | 23.34 ms |
| `node-security/no-arbitrary-file-access` | 38 | 4.03 ms |
| `secure-coding/no-unsafe-deserialization` | 35 | 13.06 ms |
| `lambda-security/no-overly-permissive-iam-policy` | 27 | 4.42 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-graphql-injection` | 35.18 ms | 21 |
| `node-security/lock-file` | 34.58 ms | 47 |
| `secure-coding/no-unchecked-loop-condition` | 24.29 ms | 55 |
| `secure-coding/no-unlimited-resource-allocation` | 23.34 ms | 42 |
| `secure-coding/detect-object-injection` | 22.99 ms | 1255 |
| `node-security/no-buffer-overread` | 17.82 ms | 7 |
| `secure-coding/no-hardcoded-credentials` | 17.57 ms | 320 |
| `node-security/no-zip-slip` | 16.07 ms | 12 |
| `lambda-security/no-unvalidated-event-body` | 15.08 ms | 0 |
| `secure-coding/no-weak-password-recovery` | 15.08 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/zod/index.js:50 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/telemetry/index.js:27 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/telemetry/index.js:27 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/telemetry/helpers.js:19 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/state/index.js:261 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/state/index.js:263 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/state/index.js:268 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/state/index.js:273 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/state/index.js:281 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/state/index.js:286 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/proxy/aws.js:72 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `node-security/detect-non-literal-fs-filename` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/proxy/aws.js:91 — 🔑 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Path traversal vulnerability \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use path.resolve() with validation \| https://owasp.org/www-community/attacks/Path_Traversal
- `node-security/no-arbitrary-file-access` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/proxy/aws.js:91 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| File path from user input - path traversal vulnerability \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Validate and sanitize file paths, use allowlists \| https://cwe.mitre.org/data/definitions/22.html
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/proxy/aws.js:111 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/util/src/logger/index.js:64 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (!=) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (!==) instead: renderer.spinner._spinner !== null \| https://cwe.mitre.org/dat

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/**/*.{js,ts}`
