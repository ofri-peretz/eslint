# ILB-Wild — lodash

> Pinned: `a02353279093cca0fea1c8cc468ffbf03bb3485b` · 60K ⭐ · Utility Library (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 4 |
| Lines of code | 951 |
| Total findings | 41 (0 errors, 41 warnings) |
| Findings density | **43.11 / kLoC** |
| Files with findings | 1 (25.0%) |
| Wall-clock (median, 3 runs) | **1341 ms** (±94, CV 7%) |
| Per-file lint cost | 335.25 ms/file |
| Peak RSS | 134 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| secure-coding | 1 / 29 | 3.4% |
| node-security | 1 / 37 | 2.7% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 40 | 2.47 ms |
| `node-security/no-timing-unsafe-compare` | 1 | 0.86 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 2.09 ms |
| `secure-coding/no-graphql-injection` | 0 | 0.95 ms |
| `secure-coding/no-unlimited-resource-allocation` | 0 | 0.51 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 0.83 ms |
| `secure-coding/no-unsafe-deserialization` | 0 | 0.47 ms |
| `secure-coding/no-improper-sanitization` | 0 | 0.41 ms |
| `node-security/no-buffer-overread` | 0 | 0.41 ms |
| `node-security/lock-file` | 0 | 0.4 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/detect-object-injection` | 2.47 ms | 40 |
| `secure-coding/no-hardcoded-credentials` | 2.09 ms | 0 |
| `secure-coding/no-graphql-injection` | 0.95 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 0.86 ms | 1 |
| `secure-coding/no-unchecked-loop-condition` | 0.83 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 0.51 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 0.47 ms | 0 |
| `secure-coding/no-improper-sanitization` | 0.41 ms | 0 |
| `node-security/no-buffer-overread` | 0.41 ms | 0 |
| `node-security/lock-file` | 0.4 ms | 0 |

## Sample findings (first 15)

- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:49 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:49 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:83 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:83 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:85 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:115 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:115 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:230 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:231 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:240 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:242 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:279 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:283 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:316 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/lodash/fp/_baseConvert.js:317 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `fp/**/*.js`
