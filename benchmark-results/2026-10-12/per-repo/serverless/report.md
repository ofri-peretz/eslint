# ILB-Wild — serverless

> Pinned: `e0d19d20755233c7297b1c955cc781268fdb0e56` · 46K ⭐ · Serverless Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 609 |
| Lines of code | 128,897 |
| Total findings | 106 (28 errors, 78 warnings) |
| Findings density | **0.82 / kLoC** |
| Files with findings | 51 (8.4%) |
| Wall-clock (median, 3 runs) | **4567 ms** (±132, CV 2.8%) |
| Per-file lint cost | 7.5 ms/file |
| Peak RSS | 713 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 6 / 14 | 42.9% |
| node-security | 4 / 43 | 9.3% |
| secure-coding | 6 / 34 | 17.6% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `lambda-security/no-error-swallowing` | 50 | 5.35 ms |
| `lambda-security/no-unbounded-batch-processing` | 12 | 2.39 ms |
| `secure-coding/no-redos-vulnerable-regex` | 10 | 884.36 ms |
| `node-security/no-zip-slip` | 8 | 17.74 ms |
| `lambda-security/no-missing-authorization-check` | 5 | 3.5 ms |
| `secure-coding/no-sensitive-data-exposure` | 4 | 35.43 ms |
| `lambda-security/require-timeout-handling` | 3 | 2.37 ms |
| `lambda-security/no-overly-permissive-iam-policy` | 3 | 1.84 ms |
| `secure-coding/no-unsafe-deserialization` | 2 | 34.05 ms |
| `node-security/require-stream-error-handler` | 2 | 6.61 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 884.36 ms | 10 |
| `lambda-security/no-hardcoded-credentials-sdk` | 176.14 ms | 0 |
| `secure-coding/no-privilege-escalation` | 158.18 ms | 0 |
| `secure-coding/no-ldap-injection` | 127.34 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 71.49 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 68.38 ms | 1 |
| `secure-coding/no-sensitive-data-exposure` | 35.43 ms | 4 |
| `node-security/no-timing-unsafe-compare` | 35.19 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 34.05 ms | 2 |
| `node-security/no-unsafe-buffer-alloc` | 32.35 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/https/index.js:241 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/yaml-ast-parser.js:80 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| YAML parsing may execute code during deserialization \| HIGH Fix: Use yaml.safeLoad() or disable code execution \| https://www.npmjs.com/package/js-yaml#loadstr---options-
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/yaml-ast-parser.js:126 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| YAML parsing may execute code during deserialization \| HIGH Fix: Use yaml.safeLoad() or disable code execution \| https://www.npmjs.com/package/js-yaml#loadstr---options-
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/index.js:109 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive entry path used without validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Validate paths before extraction \| https://snyk.io/research/zip-slip-vulnerability
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/index.js:110 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive entry path used without validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Validate paths before extraction \| https://snyk.io/research/zip-slip-vulnerability
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/index.js:143 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive entry path used without validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Validate paths before extraction \| https://snyk.io/research/zip-slip-vulnerability
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/index.js:324 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/index.js:345 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/utils/fs/index.js:412 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive extraction without path validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Use safe extraction libraries or validate all paths \| https://snyk.io/research/zip-slip-vulnerability
- `secure-coding/no-fail-open-auth` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/lib/runners/core/core.js:378 — 🔒 CWE-636 OWASP:A10-Mishandling CVSS:8.1 \| Security check fails open — the catch block swallows the error and execution continues into the code the check was guarding \| HIGH Fix: Rethrow, return a deny value, or send a 401/403 from the
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/lib/runners/compose/index.js:88 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/lib/runners/cfn/aws/Stack.js:166 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `secure-coding/no-redos-vulnerable-regex` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/lib/resolvers/placeholders.js:69 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Cross-quantifier trade (polynomial backtracking): Two quantifiers can exchange characters, enabling polynomial backtracking on crafted input. \| HIGH Fix: Atomic group, possessive quantifier, or re
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/lib/resolvers/providers/terraform/terraform.js:131 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/serverless/packages/sf-core/src/lib/resolvers/providers/terraform/terraform.js:270 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/**/*.{js,ts}`
