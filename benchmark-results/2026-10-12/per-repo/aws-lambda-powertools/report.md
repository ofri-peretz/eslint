# ILB-Wild — aws-lambda-powertools

> Pinned: `d47e092dc571154a221e7886539f8ff40443ca91` · 2K ⭐ · Lambda Tooling

## Summary

| Metric | Value |
|---|---|
| Files linted | 260 |
| Lines of code | 40,714 |
| Total findings | 38 (3 errors, 35 warnings) |
| Findings density | **0.93 / kLoC** |
| Files with findings | 12 (4.6%) |
| Wall-clock (median, 3 runs) | **2142 ms** (±147, CV 6.6%) |
| Per-file lint cost | 8.24 ms/file |
| Peak RSS | 509 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| lambda-security | 3 / 14 | 21.4% |
| node-security | 1 / 43 | 2.3% |
| secure-coding | 0 / 34 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `lambda-security/no-unvalidated-event-body` | 25 | 2.59 ms |
| `lambda-security/no-error-swallowing` | 7 | 2.54 ms |
| `node-security/no-unbounded-decompression` | 3 | 3.35 ms |
| `lambda-security/no-unbounded-batch-processing` | 3 | 1.5 ms |
| `secure-coding/no-ldap-injection` | 0 | 36.54 ms |
| `secure-coding/no-privilege-escalation` | 0 | 31.29 ms |
| `lambda-security/no-hardcoded-credentials-sdk` | 0 | 26.98 ms |
| `node-security/no-weak-hash-algorithm` | 0 | 16.69 ms |
| `secure-coding/no-hardcoded-credentials` | 0 | 15.18 ms |
| `node-security/no-timing-unsafe-compare` | 0 | 12.28 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `secure-coding/no-ldap-injection` | 36.54 ms | 0 |
| `secure-coding/no-privilege-escalation` | 31.29 ms | 0 |
| `lambda-security/no-hardcoded-credentials-sdk` | 26.98 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 16.69 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 15.18 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 12.28 ms | 0 |
| `secure-coding/no-graphql-injection` | 9.54 ms | 0 |
| `node-security/no-unsafe-buffer-alloc` | 8.75 ms | 0 |
| `secure-coding/no-unlimited-resource-allocation` | 8.48 ms | 0 |
| `secure-coding/no-xxe-injection` | 8.26 ms | 0 |

## Sample findings (first 15)

- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/tracer/src/Tracer.ts:343 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `node-security/no-unbounded-decompression` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/schemas/cloudwatch.ts:70 — 🔒 CWE-409 OWASP:A04-Cryptographic CVSS:7.5 \| zlib.gunzipSync() buffers the whole decompressed result in memory with no maxOutputLength cap. A few KB of crafted input can expand to gigabytes and exhaust the heap (decompression bomb). \| HIGH
- `node-security/no-unbounded-decompression` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/helpers/index.ts:9 — 🔒 CWE-409 OWASP:A04-Cryptographic CVSS:7.5 \| zlib.gunzipSync() buffers the whole decompressed result in memory with no maxOutputLength cap. A few KB of crafted input can expand to gigabytes and exhaust the heap (decompression bomb). \| HIGH
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parser/src/helpers/index.ts:59 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parameters/src/ssm/SSMProvider.ts:794 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/parameters/src/base/transformValue.ts:77 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/logger/src/Logger.ts:1080 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `lambda-security/no-unbounded-batch-processing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/kafka/src/consumer.ts:32 — ⚠️ CWE-770 OWASP:A04-Cryptographic CVSS:5.5 \| Processing event.records without size check. Large batches may cause timeout or memory exhaustion. \| MEDIUM Fix: Validate batch size before processing: if (event.Records.length > MAX_BATCH) t
- `lambda-security/no-unbounded-batch-processing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/kafka/src/consumer.ts:33 — ⚠️ CWE-770 OWASP:A04-Cryptographic CVSS:5.5 \| Processing event.records without size check. Large batches may cause timeout or memory exhaustion. \| MEDIUM Fix: Validate batch size before processing: if (event.Records.length > MAX_BATCH) t
- `lambda-security/no-unbounded-batch-processing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/kafka/src/consumer.ts:269 — ⚠️ CWE-770 OWASP:A04-Cryptographic CVSS:5.5 \| Processing event.records without size check. Large batches may cause timeout or memory exhaustion. \| MEDIUM Fix: Validate batch size before processing: if (event.Records.length > MAX_BATCH) t
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/jmespath/src/utils.ts:286 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `node-security/no-unbounded-decompression` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/jmespath/src/PowertoolsFunctions.ts:46 — 🔒 CWE-409 OWASP:A04-Cryptographic CVSS:7.5 \| zlib.gunzipSync() buffers the whole decompressed result in memory with no maxOutputLength cap. A few KB of crafted input can expand to gigabytes and exhaust the heap (decompression bomb). \| HIGH
- `lambda-security/no-error-swallowing` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/idempotency/src/IdempotencyHandler.ts:201 — ⚠️ CWE-390 OWASP:A10-Mishandling CVSS:5 \| Catch block swallows error without logging. Security incidents may go undetected. \| MEDIUM Fix: Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsReq
- `lambda-security/no-unvalidated-event-body` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/event-handler/src/http/utils.ts:105 — 🔒 CWE-20 OWASP:A06-Insecure CVSS:8 \| Lambda handler uses event.headers without validation. This can lead to injection attacks. \| HIGH [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Validate event input using Middy validator, Zod, or Joi before use \| ht
- `lambda-security/no-unvalidated-event-body` — /Users/ofri/repos/ofriperetz.dev/oos/aws-lambda-powertools/packages/event-handler/src/http/utils.ts:105 — 🔒 CWE-20 OWASP:A06-Insecure CVSS:8 \| Lambda handler uses event.headers without validation. This can lead to injection attacks. \| HIGH [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Validate event input using Middy validator, Zod, or Joi before use \| ht

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/*/src/**/*.ts`
