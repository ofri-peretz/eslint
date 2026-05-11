# ILB-Wild — serverless-api-gateway-caching

> Pinned: `develop` · 200 ⭐ · Serverless Plugin

## Summary

| Metric | Value |
|---|---|
| Files linted | 6 |
| Lines of code | 802 |
| Total findings | 32 (6 errors, 26 warnings) |
| Findings density | **39.9 / kLoC** |
| Files with findings | 4 (66.7%) |
| Wall-clock (median, 1 runs) | **1229 ms** (±0, CV 0%) |
| Per-file lint cost | 204.83 ms/file |
| Peak RSS | 220 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 0 / 14 | 0% |
| node-security | 0 / 33 | 0% |
| secure-coding | 6 / 28 | 21.4% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-insecure-comparison` | 15 | 0.68 ms |
| `secure-coding/detect-object-injection` | 11 | 0.96 ms |
| `secure-coding/no-hardcoded-credentials` | 2 | 0.98 ms |
| `secure-coding/no-unlimited-resource-allocation` | 2 | 0.57 ms |
| `secure-coding/no-unchecked-loop-condition` | 1 | 0.91 ms |
| `secure-coding/no-unsafe-deserialization` | 1 | 0.55 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.84 ms |
| `secure-coding/no-xpath-injection` | 0 | 0.53 ms |
| `node-security/no-buffer-overread` | 0 | 0.52 ms |
| `lambda-security/no-secrets-in-env` | 0 | 0.47 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 0.98 ms | 2 |
| `secure-coding/detect-object-injection` | 0.96 ms | 11 |
| `secure-coding/no-unchecked-loop-condition` | 0.91 ms | 1 |
| `secure-coding/no-graphql-injection` | 0.84 ms | 0 |
| `secure-coding/no-insecure-comparison` | 0.68 ms | 15 |
| `secure-coding/no-unlimited-resource-allocation` | 0.57 ms | 2 |
| `secure-coding/no-unsafe-deserialization` | 0.55 ms | 1 |
| `secure-coding/no-xpath-injection` | 0.53 ms | 0 |
| `node-security/no-buffer-overread` | 0.52 ms | 0 |
| `lambda-security/no-secrets-in-env` | 0.47 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:79 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:85 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.API_KEY or secret management service \| https://cwe.mitre.org/data/definitions/79
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:114 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (!=) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (!==) instead: e.http !== undefined \| https://cwe.mitre.org/data/definitions/
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:133 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: e.path === endpointSettings.pathWithoutGlobalBasePath \| https:
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:134 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: `/${e.path}` === endpointSettings.pathWithoutGlobalBasePath \|
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:135 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: e.method.toUpperCase() === endpointSettings.method.toUpperCase
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:153 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: method.toUpperCase() === 'ANY' \| https://cwe.mitre.org/data/de
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:178 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: params.patchOperations.length === 0 \| https://cwe.mitre.org/da
- `secure-coding/no-unchecked-loop-condition` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:198 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Loop condition may cause DoS through excessive iterations \| MEDIUM
   Fix: Limit collection size before iteration \| https://cwe.mitre.org/data/definitions/400.html
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:230 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| eval() used for deserialization (code execution vulnerability) \| CRITICAL
   Fix: Use JSON.parse() or safe deserialization libraries \| https://cwe.mitre.org/data/definitions/502.html
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/stageCache.js:242 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: settings.cachingEnabled === undefined \| https://cwe.mitre.org/
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/restApiId.js:37 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/restApiId.js:65 — 🔒 CWE-208 \| Secret comparison with === can leak timing information \| HIGH
   Fix: Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) \| https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/cacheKeyParameters.js:4 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: resourceName === name \| https://cwe.mitre.org/data/definitions
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/serverless-api-gateway-caching/src/cacheKeyParameters.js:5 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `src/**/*.js`
