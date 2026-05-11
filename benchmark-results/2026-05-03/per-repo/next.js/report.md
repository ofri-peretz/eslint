# ILB-Wild — next.js

> Pinned: `v15.1.0` · 131K ⭐ · Full-Stack Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 918 |
| Lines of code | 125,311 |
| Total findings | 3 (3 errors, 0 warnings) |
| Findings density | **0.02 / kLoC** |
| Files with findings | 2 (0.2%) |
| Wall-clock (median, 1 runs) | **2445 ms** (±0, CV 0%) |
| Per-file lint cost | 2.66 ms/file |
| Peak RSS | 305 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 3 / 45 | 6.7% |
| node-security | 0 / 33 | 0% |
| secure-coding | 0 / 28 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `browser-security/no-clickjacking` | 1 | 2.13 ms |
| `browser-security/detect-mixed-content` | 1 | 0.25 ms |
| `browser-security/no-http-urls` | 1 | 0.6 ms |
| `node-security/lock-file` | 0 | 6.2 ms |
| `secure-coding/no-graphql-injection` | 0 | 3.73 ms |
| `secure-coding/detect-object-injection` | 0 | 3.34 ms |
| `secure-coding/detect-non-literal-regexp` | 0 | 2.27 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 2.03 ms |
| `node-security/no-buffer-overread` | 0 | 1.88 ms |
| `secure-coding/no-improper-sanitization` | 0 | 1.87 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 6.2 ms | 0 |
| `secure-coding/no-graphql-injection` | 3.73 ms | 0 |
| `secure-coding/detect-object-injection` | 3.34 ms | 0 |
| `secure-coding/detect-non-literal-regexp` | 2.27 ms | 0 |
| `browser-security/no-clickjacking` | 2.13 ms | 1 |
| `secure-coding/no-unchecked-loop-condition` | 2.03 ms | 0 |
| `node-security/no-buffer-overread` | 1.88 ms | 0 |
| `secure-coding/no-improper-sanitization` | 1.87 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 1.78 ms | 0 |
| `secure-coding/no-xpath-injection` | 1.67 ms | 0 |

## Sample findings (first 15)

- `browser-security/no-clickjacking` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/client/components/react-dev-overlay/internal/styles/CssReset.tsx:7 — 🔒 CWE-1021 \| Transparent elements may hide clickjacking attacks \| MEDIUM
   Fix: Use frame-busting or CSP protections \| https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
- `browser-security/detect-mixed-content` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/client/components/react-dev-overlay/internal/icons/CloseIcon.tsx:10 — 🔒 CWE-311 OWASP:A04-Cryptographic CVSS:7.5 \| Detect HTTP resources in HTTPS pages detected - Literal containing http:// in HTTPS context \| MEDIUM
   Fix: Review and apply secure practices \| https://cwe.mitre.org/data/definitions/311.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/client/components/react-dev-overlay/internal/icons/CloseIcon.tsx:10 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://www.w3.org/2000/svg" \| MEDIUM
   Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/next/src/**/*.{ts,tsx}`
