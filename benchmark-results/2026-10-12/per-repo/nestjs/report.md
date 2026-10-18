# ILB-Wild — nestjs

> Pinned: `d69b14a85e100a689499e03190459b3d59ecd87b` · 70K ⭐ · Backend Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 596 |
| Lines of code | 42,158 |
| Total findings | 9 (0 errors, 9 warnings) |
| Findings density | **0.21 / kLoC** |
| Files with findings | 9 (1.5%) |
| Wall-clock (median, 3 runs) | **2472 ms** (±43, CV 1.7%) |
| Per-file lint cost | 4.15 ms/file |
| Peak RSS | 650 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| nestjs-security | 0 / 10 | 0% |
| node-security | 0 / 43 | 0% |
| secure-coding | 2 / 34 | 5.9% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-unsafe-deserialization` | 7 | 12.56 ms |
| `secure-coding/no-sensitive-data-exposure` | 2 | 10.08 ms |
| `nestjs-security/require-guards` | 0 | 58.66 ms |
| `secure-coding/no-ldap-injection` | 0 | 56.92 ms |
| `secure-coding/no-privilege-escalation` | 0 | 53.72 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 26.73 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 23.42 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 18.51 ms |
| `node-security/no-unsafe-buffer-alloc` | 0 | 16.58 ms |
| `node-security/no-toctou-vulnerability` | 0 | 12.66 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `nestjs-security/require-guards` | 58.66 ms | 0 |
| `secure-coding/no-ldap-injection` | 56.92 ms | 0 |
| `secure-coding/no-privilege-escalation` | 53.72 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 26.73 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 23.42 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 18.51 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 16.58 ms | 0 |
| `node-security/no-toctou-vulnerability` | 12.66 ms | 0 |
| `secure-coding/no-unsafe-deserialization` | 12.56 ms | 7 |
| `secure-coding/no-redos-vulnerable-regex` | 11.58 ms | 0 |

## Sample findings (first 15)

- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/server/server-tcp.ts:94 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/server/server-redis.ts:141 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/server/server-mqtt.ts:136 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/client/client-tcp.ts:81 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/client/client-rmq.ts:357 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/client/client-redis.ts:228 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-unsafe-deserialization` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/microservices/client/client-mqtt.ts:200 — 🔒 CWE-502 OWASP:A08-Software CVSS:9.8 \| Unsafe deserialization of untrusted data (incl. model/tool output) \| HIGH Fix: Use JSON.parse() or validated safe deserialization libraries \| validate model/tool output via schema and size limits
- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/core/repl/native-functions/debug-repl-fn.ts:24 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in logs: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2] Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html
- `secure-coding/no-sensitive-data-exposure` — /Users/ofri/repos/ofriperetz.dev/oos/nestjs/packages/core/injector/opaque-key-factory/deep-hashed-module-opaque-key-factory.ts:52 — 🔒 CWE-532 OWASP:A09-Logging CVSS:5.3 \| Sensitive data detected in logs: token \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2] Fix: Redact or mask sensitive data before logging/exposing \| https://cwe.mitre.org/data/definitions/532.html

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/**/*.ts`
