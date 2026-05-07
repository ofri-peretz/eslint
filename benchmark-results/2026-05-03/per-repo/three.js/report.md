# ILB-Wild — three.js

> Pinned: `r170` · 105K ⭐ · 3D Graphics Engine
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 727 |
| Lines of code | 175,430 |
| Total findings | 1932 (439 errors, 1493 warnings) |
| Findings density | **11.01 / kLoC** |
| Files with findings | 187 (25.7%) |
| Wall-clock (median, 1 runs) | **3389 ms** (±0, CV 0%) |
| Per-file lint cost | 4.66 ms/file |
| Peak RSS | 670 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 2 / 45 | 4.4% |
| secure-coding | 12 / 28 | 42.9% |
| node-security | 1 / 33 | 3% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 1428 | 29.99 ms |
| `secure-coding/no-unlimited-resource-allocation` | 205 | 25.02 ms |
| `node-security/no-buffer-overread` | 118 | 27.62 ms |
| `secure-coding/no-insecure-comparison` | 61 | 17.29 ms |
| `secure-coding/no-unchecked-loop-condition` | 54 | 23.57 ms |
| `secure-coding/no-unsafe-deserialization` | 21 | 13.94 ms |
| `secure-coding/no-hardcoded-credentials` | 14 | 8.64 ms |
| `secure-coding/no-xpath-injection` | 11 | 13.83 ms |
| `secure-coding/no-redos-vulnerable-regex` | 8 | 5.08 ms |
| `secure-coding/no-xxe-injection` | 5 | 6.47 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 32.66 ms | 0 |
| `secure-coding/detect-object-injection` | 29.99 ms | 1428 |
| `secure-coding/no-graphql-injection` | 28.81 ms | 0 |
| `node-security/no-buffer-overread` | 27.62 ms | 118 |
| `secure-coding/no-unlimited-resource-allocation` | 25.02 ms | 205 |
| `secure-coding/no-unchecked-loop-condition` | 23.57 ms | 54 |
| `secure-coding/no-insecure-comparison` | 17.29 ms | 61 |
| `secure-coding/no-weak-password-recovery` | 14.16 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 13.94 ms | 21 |
| `secure-coding/no-xpath-injection` | 13.83 ms | 11 |

## Sample findings (first 15)

- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:105 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `browser-security/detect-mixed-content` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:133 — 🔒 CWE-311 OWASP:A04-Cryptographic CVSS:7.5 \| Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context \| MEDIUM
   Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/311.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:133 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://www.w3.org/1999/xhtml" \| MEDIUM
   Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:399 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| eval() used for deserialization (code execution vulnerability) \| CRITICAL
   Fix: Use JSON.parse() or safe deserialization libraries \| https://cwe.mitre.org/data/definitions/502.html
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:409 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| eval() used for deserialization (code execution vulnerability) \| CRITICAL
   Fix: Use JSON.parse() or safe deserialization libraries \| https://cwe.mitre.org/data/definitions/502.html
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:531 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:540 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:563 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:582 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:584 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:633 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Source.js:135 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Source.js:137 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Source.js:186 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:1909 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001]
   Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `src/**/*.{js,ts}`
