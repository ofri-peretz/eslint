# ILB-Wild — next.js

> Pinned: `v15.1.0` · 131K ⭐ · Full-Stack Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 918 |
| Lines of code | 125,311 |
| Total findings | 62 (54 errors, 8 warnings) |
| Findings density | **0.49 / kLoC** |
| Files with findings | 39 (4.2%) |
| Wall-clock (median, 3 runs) | **8758 ms** (±61, CV 0.7%) |
| Per-file lint cost | 9.54 ms/file |
| Peak RSS | 843 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| browser-security | 4 / 46 | 8.7% |
| node-security | 8 / 43 | 18.6% |
| secure-coding | 3 / 34 | 8.8% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `browser-security/no-http-urls` | 21 | 248.69 ms |
| `node-security/detect-non-literal-fs-filename` | 6 | 27.46 ms |
| `secure-coding/no-redos-vulnerable-regex` | 5 | 3465.53 ms |
| `node-security/no-shell-injection` | 5 | 6.55 ms |
| `secure-coding/no-log-injection` | 4 | 7.59 ms |
| `browser-security/no-innerhtml` | 4 | 106.82 ms |
| `browser-security/require-postmessage-origin-check` | 3 | 8.63 ms |
| `node-security/no-toctou-vulnerability` | 3 | 29.03 ms |
| `node-security/detect-child-process` | 2 | 20.19 ms |
| `node-security/no-math-random-crypto` | 2 | 26.88 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-redos-vulnerable-regex` | 3465.53 ms | 5 |
| `browser-security/no-http-urls` | 248.69 ms | 21 |
| `secure-coding/no-privilege-escalation` | 154.16 ms | 0 |
| `secure-coding/no-ldap-injection` | 123.68 ms | 0 |
| `browser-security/no-innerhtml` | 106.82 ms | 4 |
| `browser-security/no-eval` | 87.44 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 75.84 ms | 0 |
| `browser-security/no-websocket-eval` | 71.27 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 68.77 ms | 0 |
| `browser-security/no-websocket-innerhtml` | 66.95 ms | 0 |

## Sample findings (first 15)

- `node-security/detect-child-process` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/trace/upload-trace.ts:25 — ⚠️ CWE-78 OWASP:A05-Injection CVSS:9.8 \| Command injection detected \| CRITICAL [SOC2,PCI-DSS,ISO27001,NIST-CSF] Fix: Use execFile/spawn with {shell: false} and array args \| https://owasp.org/www-community/attacks/Command_Injection
- `node-security/detect-child-process` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/telemetry/storage.ts:254 — ⚠️ CWE-78 OWASP:A05-Injection CVSS:9.8 \| Command injection detected \| CRITICAL [SOC2,PCI-DSS,ISO27001,NIST-CSF] Fix: Use execFile/spawn with {shell: false} and array args \| https://owasp.org/www-community/attacks/Command_Injection
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/match-local-pattern.ts:27 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `node-security/no-math-random-crypto` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/router.ts:615 — 🔒 CWE-338 OWASP:A04-Cryptographic CVSS:5.3 \| Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values. \| CRITICAL Fix: Use crypto.ran
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/router.ts:1101 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/router.ts:1110 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/adapters.tsx:114 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://f" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `secure-coding/no-unsafe-regex-construction` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/utils/path-match.ts:49 — 🔒 CWE-400 OWASP:A06-Insecure CVSS:7.5 \| Dynamic regex flags: Dynamic flags can lead to unexpected behavior or security issues \| HIGH Fix: Use static flags instead of dynamic flags \| https://owasp.org/www-community/attacks/Regular_expres
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/utils/parse-relative-url.ts:35 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/utils/parse-relative-url.ts:42 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/shared/lib/router/utils/as-path-to-search-params.ts:4 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `secure-coding/no-log-injection` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/server/render.tsx:973 — 🔒 CWE-117 OWASP:A09-Logging CVSS:5.3 \| Log message embeds req.url directly - a CR/LF in that value forges a log record \| MEDIUM Fix: Log it as a structured field (logger.info({ value }, "message")) or strip CR/LF/control characters firs
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/server/next-server.ts:1759 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html
- `node-security/detect-eval-with-expression` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/server/load-manifest.ts:88 — 🔒 CWE-94 OWASP:A05-Injection CVSS:9.8 \| vm.runInNewContext() compiles and runs its first argument as JavaScript, and that argument is not written out in full here. The vm module is NOT a security boundary — Node documents it as such — beca
- `browser-security/no-http-urls` — /Users/ofri/repos/ofriperetz.dev/oos/next.js/packages/next/src/server/base-server.ts:1348 — ⚠️ CWE-319 OWASP:A02-Cryptographic CVSS:5.3 \| HTTP URL detected: "http://n" \| MEDIUM Fix: Use HTTPS or add to allowedHosts config \| https://cwe.mitre.org/data/definitions/319.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/next/src/**/*.{ts,tsx}`
