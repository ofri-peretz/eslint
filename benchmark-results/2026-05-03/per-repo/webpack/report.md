# ILB-Wild — webpack

> Pinned: `main` · 65K ⭐ · Build Tool (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 581 |
| Lines of code | 156,040 |
| Total findings | 1847 (857 errors, 990 warnings) |
| Findings density | **11.84 / kLoC** |
| Files with findings | 298 (51.3%) |
| Wall-clock (median, 1 runs) | **3072 ms** (±0, CV 0%) |
| Per-file lint cost | 5.29 ms/file |
| Peak RSS | 669 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 8 / 33 | 24.2% |
| secure-coding | 15 / 28 | 53.6% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 745 | 22.45 ms |
| `secure-coding/no-hardcoded-credentials` | 265 | 12.92 ms |
| `secure-coding/no-unlimited-resource-allocation` | 225 | 37.82 ms |
| `secure-coding/no-insecure-comparison` | 199 | 13.54 ms |
| `secure-coding/no-unchecked-loop-condition` | 129 | 38.94 ms |
| `secure-coding/no-unsafe-deserialization` | 91 | 14.94 ms |
| `secure-coding/no-graphql-injection` | 34 | 32.12 ms |
| `secure-coding/no-redos-vulnerable-regex` | 34 | 7.36 ms |
| `secure-coding/detect-non-literal-regexp` | 23 | 6.91 ms |
| `node-security/detect-non-literal-fs-filename` | 22 | 5.3 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-unchecked-loop-condition` | 38.94 ms | 129 |
| `secure-coding/no-unlimited-resource-allocation` | 37.82 ms | 225 |
| `secure-coding/no-graphql-injection` | 32.12 ms | 34 |
| `node-security/no-buffer-overread` | 25.79 ms | 11 |
| `secure-coding/detect-object-injection` | 22.45 ms | 745 |
| `secure-coding/no-weak-password-recovery` | 16.35 ms | 0 |
| `node-security/lock-file` | 16.09 ms | 0 |
| `node-security/no-zip-slip` | 15.83 ms | 3 |
| `secure-coding/no-unsafe-deserialization` | 14.94 ms | 91 |
| `secure-coding/no-insecure-comparison` | 13.54 ms | 199 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/webpack.js:206 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/webpack.js:260 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:90 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:101 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:111 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:120 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:133 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-graphql-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:154 — 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 \| GraphQL injection vulnerability detected \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use GraphQL variables or query builders instead of string concatenation \| https://owasp.org/Top10/2025/A05_2025-I
- `secure-coding/no-graphql-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:154 — 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 \| GraphQL injection vulnerability detected \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use GraphQL variables or query builders instead of string concatenation \| https://owasp.org/Top10/2025/A05_2025-I
- `secure-coding/no-graphql-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:154 — 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 \| GraphQL injection vulnerability detected \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use GraphQL variables or query builders instead of string concatenation \| https://owasp.org/Top10/2025/A05_2025-I
- `secure-coding/no-graphql-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:154 — 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 \| GraphQL injection vulnerability detected \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use GraphQL variables or query builders instead of string concatenation \| https://owasp.org/Top10/2025/A05_2025-I
- `secure-coding/no-graphql-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:154 — 🔒 CWE-89 OWASP:A05-Injection CVSS:9.8 \| GraphQL injection vulnerability detected \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Use GraphQL variables or query builders instead of string concatenation \| https://owasp.org/Top10/2025/A05_2025-I
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/index.js:117 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/index.js:274 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/index.js:281 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/798.h

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `lib/**/*.js`
