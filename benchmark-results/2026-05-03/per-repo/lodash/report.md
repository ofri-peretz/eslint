# ILB-Wild — lodash

> Pinned: `main` · 60K ⭐ · Utility Library (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 4 |
| Lines of code | 951 |
| Total findings | 58 (0 errors, 58 warnings) |
| Findings density | **60.99 / kLoC** |
| Files with findings | 3 (75.0%) |
| Wall-clock (median, 1 runs) | **1269 ms** (±0, CV 0%) |
| Per-file lint cost | 317.25 ms/file |
| Peak RSS | 221 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| secure-coding | 2 / 28 | 7.1% |
| node-security | 0 / 33 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 42 | 1.69 ms |
| `secure-coding/no-insecure-comparison` | 16 | 0.7 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.99 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 0.63 ms |
| `node-security/no-zip-slip` | 0 | 0.47 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.45 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.45 ms |
| `node-security/no-buffer-overread` | 0 | 0.44 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.39 ms |
| `secure-coding/no-improper-sanitization` | 0 | 0.38 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/detect-object-injection` | 1.69 ms | 42 |
| `secure-coding/no-graphql-injection` | 0.99 ms | 0 |
| `secure-coding/no-insecure-comparison` | 0.7 ms | 16 |
| `secure-coding/no-hardcoded-credentials` | 0.63 ms | 0 |
| `node-security/no-zip-slip` | 0.47 ms | 0 |
| `secure-coding/no-unchecked-loop-condition` | 0.45 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.45 ms | 0 |
| `node-security/no-buffer-overread` | 0.44 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.39 ms | 0 |
| `secure-coding/no-improper-sanitization` | 0.38 ms | 0 |

## Sample findings (first 15)

- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_mapping.js:271 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_convertBrowser.js:15 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: typeof _ === 'function' \| https://cwe.mitre.org/data/definitio
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_convertBrowser.js:15 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: typeof _.runInContext === 'function' \| https://cwe.mitre.org/d
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:17 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: n === 2 \| https://cwe.mitre.org/data/definitions/697.html
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:32 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: n === 2 \| https://cwe.mitre.org/data/definitions/697.html
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:49 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:49 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:83 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:83 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:85 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:91 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (!=) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (!==) instead: start !== lastIndex \| https://cwe.mitre.org/data/definitions/6
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:115 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:115 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:139 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: typeof name === 'function' \| https://cwe.mitre.org/data/defini
- `secure-coding/no-insecure-comparison` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:147 — 🔒 CWE-697 OWASP:A06-Insecure CVSS:5.3 \| Insecure comparison operator (==) detected - can lead to type coercion vulnerabilities \| HIGH
   Fix: Use strict equality (===) instead: func === null \| https://cwe.mitre.org/data/definitions/697.htm

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `fp/**/*.js`
