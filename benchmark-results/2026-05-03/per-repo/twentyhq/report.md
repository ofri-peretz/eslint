# ILB-Wild — twentyhq

> Pinned: `main` · 30K ⭐ · CRM (NestJS)

## Summary

| Metric | Value |
|---|---|
| Files linted | 4,978 |
| Lines of code | 411,003 |
| Total findings | 29 (25 errors, 4 warnings) |
| Findings density | **0.07 / kLoC** |
| Files with findings | 11 (0.2%) |
| Wall-clock (median, 1 runs) | **1825 ms** (±0, CV 0%) |
| Per-file lint cost | 0.37 ms/file |
| Peak RSS | 368 MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
| nestjs-security | 1 / 6 | 16.7% |
| node-security | 0 / 33 | 0% |
| secure-coding | 4 / 28 | 14.3% |
| pg | 0 / 13 | 0% |

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
| `secure-coding/no-hardcoded-credentials` | 22 | 2.84 ms |
| `secure-coding/detect-object-injection` | 3 | 1.57 ms |
| `nestjs-security/no-exposed-debug-endpoints` | 2 | 0.81 ms |
| `secure-coding/detect-non-literal-regexp` | 1 | 1.09 ms |
| `secure-coding/no-redos-vulnerable-regex` | 1 | 0.72 ms |
| `node-security/lock-file` | 0 | 12.15 ms |
| `secure-coding/no-graphql-injection` | 0 | 5.73 ms |
| `secure-coding/no-unchecked-loop-condition` | 0 | 2.64 ms |
| `node-security/detect-suspicious-dependencies` | 0 | 2.23 ms |
| `node-security/no-buffer-overread` | 0 | 2.1 ms |

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
| `node-security/lock-file` | 12.15 ms | 0 |
| `secure-coding/no-graphql-injection` | 5.73 ms | 0 |
| `secure-coding/no-hardcoded-credentials` | 2.84 ms | 22 |
| `secure-coding/no-unchecked-loop-condition` | 2.64 ms | 0 |
| `node-security/detect-suspicious-dependencies` | 2.23 ms | 0 |
| `node-security/no-buffer-overread` | 2.1 ms | 0 |
| `secure-coding/no-xpath-injection` | 2.01 ms | 0 |
| `nestjs-security/require-guards` | 1.75 ms | 0 |
| `node-security/no-zip-slip` | 1.74 ms | 0 |
| `secure-coding/detect-object-injection` | 1.57 ms | 3 |

## Sample findings (first 15)

- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/microsoft/mocks/microsoft-api-examples.ts:38 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CHANGE_KEY or secret management service \| https://cwe.mitre.org/data/definitions
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/microsoft/mocks/microsoft-api-examples.ts:51 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CONVERSATION_ID or secret management service \| https://cwe.mitre.org/data/defini
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/microsoft/mocks/microsoft-api-examples.ts:107 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CHANGE_KEY or secret management service \| https://cwe.mitre.org/data/definitions
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/microsoft/mocks/microsoft-api-examples.ts:196 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CHANGE_KEY or secret management service \| https://cwe.mitre.org/data/definitions
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/modules/messaging/message-import-manager/drivers/microsoft/mocks/microsoft-api-examples.ts:209 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded Secret key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CONVERSATION_ID or secret management service \| https://cwe.mitre.org/data/defini
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/workspace-migration/workspace-migration-runner/constants/workspace-migration-action-handler-metadata-key.constant.ts:2 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.WORKSPACE_MIGRATION_ACTION_HANDLER_METADATA_KEY or secret management service \| http
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/workspace-cleaner/constants/user-workspace-deletion-warning-sent-key.constant.ts:2 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.USER_WORKSPACE_DELETION_WARNING_SENT_KEY or secret management service \| https://cwe
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/constants/twenty-cli-application-registration.constant.ts:2 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.UNIVERSAL_IDENTIFIER or secret management service \| https://cwe.mitre.org/data/defi
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/constants/page-layout-widget-seeds.constant.ts:11 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CUSTOMER_COMPANIES_BY_SIZE or secret management service \| https://cwe.mitre.org/dat
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/constants/page-layout-widget-seeds.constant.ts:12 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CUSTOMER_ANNUAL_RECURRING_REVENUE or secret management service \| https://cwe.mitre.
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/constants/page-layout-widget-seeds.constant.ts:13 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CUSTOMER_REVENUE_DISTRIBUTION or secret management service \| https://cwe.mitre.org/
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/constants/page-layout-widget-seeds.constant.ts:16 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.CUSTOMER_LINKEDIN_DISTRIBUTION or secret management service \| https://cwe.mitre.org
- `secure-coding/no-hardcoded-credentials` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/workspace-manager/dev-seeder/core/constants/page-layout-widget-seeds.constant.ts:19 — 🔒 CWE-798 OWASP:A04-Cryptographic CVSS:9.8 \| Hard-coded API key detected \| CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR]
   Fix: Use environment variable: process.env.TEAM_GEOGRAPHIC_DISTRIBUTION or secret management service \| https://cwe.mitre.org/d
- `nestjs-security/no-exposed-debug-endpoints` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/metadata-modules/permissions/constants/admin-role-label.constants.ts:1 — 🔒 CWE-489 \| Debug endpoint exposed without authentication \| HIGH
   Fix: Remove debug endpoints from production or add authentication \| https://cwe.mitre.org/data/definitions/489.html
- `secure-coding/detect-non-literal-regexp` — /Users/ofri/repos/ofriperetz.dev/oos/twentyhq/packages/twenty-server/src/engine/metadata-modules/logic-function/constants/handler.contant.ts:8 — ⚠️ CWE-400 OWASP:A06-Insecure CVSS:7.5 \| ReDoS vulnerability detected \| CRITICAL
   Fix: Restructure regex to avoid nested quantifiers \| https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS

## Methodology

- ILB-Wild v1.0 — `scripts/ilb-wild.mjs`
- 0 warmup + 1 measured runs, cache cleared between runs
- ESLint v9 via `tsx` (source-tree builds)
- Per-rule timing via `TIMING=all` (parsed from stderr)
- Peak RSS via `process.resourceUsage().maxRSS` in worker
- Glob: `packages/twenty-server/src/**/*.ts`
