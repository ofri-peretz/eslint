# ILB-Wild — three.js

> Pinned: `r170` · 105K ⭐ · 3D Graphics Engine
>
> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.

## Summary

| Metric | Value |
|---|---|
| Files linted | 750 |
| Lines of code | 179,177 |
| Total findings | 1549 (46 errors, 1503 warnings) |
| Findings density | **8.65 / kLoC** |
| Files with findings | 164 (21.9%) |
| Wall-clock (median, 3 runs) | **4069 ms** (±885, CV 20.6%) |
| Per-file lint cost | 5.43 ms/file |
| Peak RSS | 620 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 2 / 45 | 4.4% |
| secure-coding | 9 / 29 | 31% |
| node-security | 3 / 37 | 8.1% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/detect-object-injection` | 1090 | 88.34 ms |
| `secure-coding/no-unlimited-resource-allocation` | 193 | 36.84 ms |
| `node-security/no-buffer-overread` | 118 | 27.02 ms |
| `secure-coding/no-unchecked-loop-condition` | 62 | 36.95 ms |
| `node-security/no-timing-unsafe-compare` | 32 | 24.89 ms |
| `secure-coding/no-redos-vulnerable-regex` | 23 | 20.04 ms |
| `secure-coding/no-xpath-injection` | 11 | 16.93 ms |
| `secure-coding/no-unsafe-deserialization` | 6 | 20.84 ms |
| `secure-coding/no-xxe-injection` | 5 | 9.38 ms |
| `node-security/no-math-random-crypto` | 4 | 12.99 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/detect-object-injection` | 88.34 ms | 1090 |
| `secure-coding/no-hardcoded-credentials` | 58.17 ms | 0 |
| `node-security/lock-file` | 53.27 ms | 0 |
| `secure-coding/no-graphql-injection` | 37.52 ms | 0 |
| `secure-coding/no-unchecked-loop-condition` | 36.95 ms | 62 |
| `secure-coding/no-unlimited-resource-allocation` | 36.84 ms | 193 |
| `node-security/no-buffer-overread` | 27.02 ms | 118 |
| `node-security/no-timing-unsafe-compare` | 24.89 ms | 32 |
| `secure-coding/no-improper-sanitization` | 24.3 ms | 0 |
| `browser-security/no-clickjacking` | 20.98 ms | 0 |

## Sample findings (first 15)

- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:105 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `browser-security/detect-mixed-content` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:133 — 🔒 CWE-311 OWASP:A04-Cryptographic CVSS:7.5 \| Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context \| MEDIUM Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/311.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/utils.js:133 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://www.w3.org/1999/xhtml" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:582 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:584 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Texture.js:633 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Source.js:135 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Source.js:137 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/textures/Source.js:186 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:1917 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:1983 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:1987 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| HIGH [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:2010 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:2734 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution
- `secure-coding/detect-object-injection` — /Users/ofri/repos/ofriperetz.dev/oos/three.js/src/renderers/WebGLRenderer.js:2967 — ⚠️ CWE-915 OWASP:A01-Broken CVSS:9.8 \| Object injection/Prototype pollution (incl. model/tool outputs) \| MEDIUM [SOC2,PCI-DSS,ISO27001] Fix: Use Map or property whitelisting \| https://portswigger.net/web-security/prototype-pollution

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `src/**/*.{js,ts}`
