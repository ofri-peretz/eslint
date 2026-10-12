# ILB-Wild — twentyhq

> Pinned: `2e5ccd9b860bdf046d7b52b4fccdb46404954044` · 30K ⭐ · CRM (NestJS)

## Summary

| Metric | Value |
|---|---|
| Files linted | 5,094 |
| Lines of code | 418,887 |
| Total findings | 239 (204 errors, 35 warnings) |
| Findings density | **0.57 / kLoC** |
| Files with findings | 212 (4.2%) |
| Wall-clock (median, 3 runs) | **15702 ms** (±1720, CV 10.3%) |
| Per-file lint cost | 3.08 ms/file |
| Peak RSS | 1141 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| nestjs-security | 3 / 10 | 30% |
| node-security | 6 / 43 | 14% |
| secure-coding | 6 / 34 | 17.6% |
| postgresql-security | 0 / 13 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 167 | 453.48 ms |
| `nestjs-security/no-exposed-private-fields` | 12 | 44.72 ms |
| `secure-coding/no-log-injection` | 10 | 31.08 ms |
| `node-security/no-self-signed-certs` | 8 | 20.13 ms |
| `node-security/detect-suspicious-dependencies` | 8 | 82.14 ms |
| `secure-coding/no-sensitive-data-exposure` | 7 | 91.06 ms |
| `node-security/no-arbitrary-file-access` | 7 | 50.5 ms |
| `secure-coding/no-graphql-injection` | 5 | 122.69 ms |
| `nestjs-security/require-validation-pipe-whitelist` | 4 | 11.45 ms |
| `secure-coding/no-redos-vulnerable-regex` | 3 | 1562.86 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `postgresql-security/no-unsafe-query` | 1807.45 ms | 0 |
| `secure-coding/no-redos-vulnerable-regex` | 1562.86 ms | 3 |
| `nestjs-security/require-guards` | 558.7 ms | 0 |
| `secure-coding/no-privilege-escalation` | 492.63 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 453.48 ms | 167 |
| `secure-coding/no-ldap-injection` | 410.16 ms | 0 |
| `node-security/no-weak-hash-algorithm` | 212.19 ms | 0 |
| `node-security/no-timing-unsafe-compare` | 150.6 ms | 0 |
| `secure-coding/no-graphql-injection` | 122.69 ms | 5 |
| `secure-coding/no-homoglyph-identifiers` | 121.18 ms | 0 |

## Sample findings (first 15)

- `node-security/no-self-signed-certs` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider.ts:40 — 🔒 CWE-295 OWASP:A02-Security CVSS:7.4 \| rejectUnauthorized: false disables TLS certificate validation, enabling man-in-the-middle attacks. Any certificate will be accepted, including self-signed and expired ones. \| CRITICAL Fix: Remove
- `node-security/no-self-signed-certs` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider.ts:91 — 🔒 CWE-295 OWASP:A02-Security CVSS:7.4 \| rejectUnauthorized: false disables TLS certificate validation, enabling man-in-the-middle attacks. Any certificate will be accepted, including self-signed and expired ones. \| CRITICAL Fix: Remove
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/gmail/utils/parse-gmail-network-error.util.ts:1 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/gmail/utils/parse-gmail-api-error.util.ts:1 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/gmail/utils/is-gmail-network-error.util.ts:1 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/gmail/utils/is-gmail-api-error.util.ts:1 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/gmail/mocks/gmail-api-error-mocks.ts:1 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/connected-account/refresh-tokens-manager/drivers/google/utils/parse-google-oauth-error.util.ts:1 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/utils/parse-gaxios-error.util.ts:3 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/detect-suspicious-dependencies` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-get-events.service.ts:4 — 🔒 CWE-506 OWASP:A08-Software CVSS:9.8 \| Suspicious package name detected - possible typosquatting \| HIGH Fix: Verify package authenticity on npm registry \| https://cwe.mitre.org/data/definitions/506.html
- `node-security/require-dependency-integrity` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/utils/render-apollo-playground.util.ts:8 — 🔒 CWE-494 OWASP:A08-Software CVSS:8.1 \| External resource loaded without integrity hash - supply chain risk \| HIGH Fix: Add integrity="sha384-..." and crossorigin="anonymous" attributes \| https://cwe.mitre.org/data/definitions/494.html
- `node-security/no-self-signed-certs` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.service.ts:39 — 🔒 CWE-295 OWASP:A02-Security CVSS:7.4 \| rejectUnauthorized: false disables TLS certificate validation, enabling man-in-the-middle attacks. Any certificate will be accepted, including self-signed and expired ones. \| CRITICAL Fix: Remove
- `node-security/no-self-signed-certs` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.service.ts:74 — 🔒 CWE-295 OWASP:A02-Security CVSS:7.4 \| rejectUnauthorized: false disables TLS certificate validation, enabling man-in-the-middle attacks. Any certificate will be accepted, including self-signed and expired ones. \| CRITICAL Fix: Remove
- `nestjs-security/no-exposed-private-fields` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/metadata-modules/webhook/dtos/webhook.dto.ts:35 — 🔒 CWE-200 OWASP:A01-Broken CVSS:7.5 \| Sensitive field "secret" may be exposed in API responses \| HIGH [GDPR,HIPAA,PCI-DSS,SOC2] Fix: Add @Exclude() decorator or use class-transformer to exclude from responses \| https://docs.nestjs.com/t
- `nestjs-security/no-missing-validation-pipe` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/metadata-modules/webhook/controllers/webhook.controller.ts:63 — 🔒 CWE-20 OWASP:A06-Insecure CVSS:8.6 \| Parameter @Body() updateWebhookDto receives user input without ValidationPipe \| HIGH [SOC2,PCI-DSS,HIPAA,GDPR] Fix: Add @UsePipes(ValidationPipe) or use global validation: app.useGlobalPipes(new Va

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 1 warmup + 3 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/twenty-server/src/**/*.ts`
