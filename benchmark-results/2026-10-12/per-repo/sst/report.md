# ILB-Wild — sst

> Pinned: `ec2847b92af0763abb7bb8177b8265f046b7443c` · 22K ⭐ · Serverless Framework

## Summary

| Metric | Value |
|---|---|
| Files linted | 194 |
| Lines of code | 66,817 |
| Total findings | 5 (5 errors, 0 warnings) |
| Findings density | **0.07 / kLoC** |
| Files with findings | 3 (1.5%) |
| Wall-clock (median, 3 runs) | **2366 ms** (±93, CV 3.8%) |
| Per-file lint cost | 12.2 ms/file |
| Peak RSS | 591 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 0 / 14 | 0% |
| node-security | 3 / 43 | 7% |
| secure-coding | 0 / 34 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `node-security/no-zip-slip` | 3 | 7.86 ms |
| `node-security/no-toctou-vulnerability` | 1 | 10.06 ms |
| `node-security/require-stream-error-handler` | 1 | 1.85 ms |
| `lambda-security/no-hardcoded-credentials-sdk` | 0 | 80.77 ms |
| `secure-coding/no-ldap-injection` | 0 | 47 ms |
| `secure-coding/no-privilege-escalation` | 0 | 37.68 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 24.03 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 21.95 ms |
| `secure-coding/no-xpath-injection` | 0 | 9.78 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 11.8 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `lambda-security/no-hardcoded-credentials-sdk` | 80.77 ms | 0 |
| `secure-coding/no-ldap-injection` | 47 ms | 0 |
| `secure-coding/no-privilege-escalation` | 37.68 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 24.03 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 21.95 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 11.8 ms | 0 |
| `node-security/no-toctou-vulnerability` | 10.06 ms | 1 |
| `secure-coding/no-xpath-injection` | 9.78 ms | 0 |
| `secure-coding/no-graphql-injection` | 9.59 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 9.3 ms | 0 |

## Sample findings (first 15)

- `node-security/no-toctou-vulnerability` — /Users/ofri/repos/ofriperetz.dev/oos/sst/platform/src/components/cloudflare/helpers/wrangler.ts:196 — 🔒 CWE-367 OWASP:A04-Cryptographic CVSS:7 \| Time-of-check Time-of-use race condition detected \| HIGH Fix: Act on the result and handle the failure — open/unlink and catch ENOENT — instead of checking first. Not a finding if the path is i
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/sst/platform/src/components/aws/ssr-site.ts:1799 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive entry path used without validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Validate paths before extraction \| https://snyk.io/research/zip-slip-vulnerability
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/sst/platform/src/components/aws/ssr-site.ts:1814 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive entry path used without validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Validate paths before extraction \| https://snyk.io/research/zip-slip-vulnerability
- `node-security/no-zip-slip` — /Users/ofri/repos/ofriperetz.dev/oos/sst/platform/src/components/aws/ssr-site.ts:1818 — 🔒 CWE-22 OWASP:A01-Broken CVSS:7.5 \| Archive entry path used without validation \| HIGH [SOC2,PCI-DSS,HIPAA,ISO27001] Fix: Validate paths before extraction \| https://snyk.io/research/zip-slip-vulnerability
- `node-security/require-stream-error-handler` — /Users/ofri/repos/ofriperetz.dev/oos/sst/platform/src/components/aws/function.ts:2470 — 🔒 CWE-248 OWASP:A10-Mishandling CVSS:7.5 \| .pipe() forwards data but not errors. A stream that emits 'error' with no listener throws inside the EventEmitter, which is an uncaught exception — the process exits. A single request for a missin

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `platform/src/**/*.ts`
