# ILB-Wild — webpack

> Pinned: `b29de5fcd3d22cff32b807b4a58ed02134852c20` · 65K ⭐ · Build Tool (FP corpus)
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 587 |
| Lines of code | 158,661 |
| Total findings | 1120 (143 errors, 977 warnings) |
| Findings density | **7.06 / kLoC** |
| Files with findings | 179 (30.5%) |
| Wall-clock (median, 3 runs) | **3100 ms** (±183, CV 5.8%) |
| Per-file lint cost | 5.28 ms/file |
| Peak RSS | 607 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| node-security | 11 / 37 | 29.7% |
| secure-coding | 11 / 29 | 37.9% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 491 | 31.48 ms |
| `secure-coding/no-unlimited-resource-allocation` | 178 | 33.16 ms |
| `secure-coding/no-unchecked-loop-condition` | 132 | 39.81 ms |
| `node-security/no-timing-unsafe-compare` | 131 | 18.18 ms |
| `secure-coding/no-redos-vulnerable-regex` | 54 | 33.39 ms |
| `secure-coding/detect-non-literal-regexp` | 23 | 8.27 ms |
| `node-security/detect-non-literal-fs-filename` | 22 | 6.55 ms |
| `secure-coding/no-unsafe-regex-construction` | 20 | 5.12 ms |
| `secure-coding/no-improper-sanitization` | 12 | 13.57 ms |
| `node-security/no-buffer-overread` | 10 | 27.76 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 55.27 ms | 0 |
| `secure-coding/no-unchecked-loop-condition` | 39.81 ms | 132 |
| `secure-coding/no-redos-vulnerable-regex` | 33.39 ms | 54 |
| `secure-coding/no-unlimited-resource-allocation` | 33.16 ms | 178 |
| `secure-coding/detect-object-injection` | 31.48 ms | 491 |
| `node-security/lock-file` | 31.12 ms | 0 |
| `node-security/no-buffer-overread` | 27.76 ms | 10 |
| `secure-coding/no-graphql-injection` | 25.14 ms | 0 |
| `secure-coding/no-weak-password-recovery` | 18.86 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 18.77 ms | 4 |

## Sample findings (first 15)

- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:90 — 🔒 CWE-208 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-time comparison \| https://node
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:101 — 🔒 CWE-208 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-time comparison \| https://node
- `node-security/no-timing-unsafe-compare` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:111 — 🔒 CWE-208 \| Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret. \| HIGH Fix: Use crypto.timingSafeEqual() for constant-time comparison \| https://node
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:120 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/validateSchema.js:133 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:115 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/no-unchecked-loop-condition` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:133 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Loop condition may cause DoS through excessive iterations \| MEDIUM Fix: Limit collection size before iteration \| https://cwe.mitre.org/data/definitions/400.html
- `secure-coding/no-unchecked-loop-condition` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:148 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Loop condition may cause DoS through excessive iterations \| MEDIUM Fix: Limit collection size before iteration \| https://cwe.mitre.org/data/definitions/400.html
- `secure-coding/no-unchecked-loop-condition` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:162 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Loop condition may cause DoS through excessive iterations \| MEDIUM Fix: Limit collection size before iteration \| https://cwe.mitre.org/data/definitions/400.html
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:217 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:258 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:259 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:270 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:278 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/webpack/lib/cli.js:290 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `lib/**/*.js`
