# 📦 Interlace ESLint Ecosystem: Package Registry

> **Purpose**: Single source of truth for all published packages, their versions, rule counts, and complete rule listings.  
> **Last Updated**: 2026-02-02  
> **Total Published Packages**: 18  
> **Total Rules**: 332

---

## 🟢 Published Packages Summary

| Package                              | Version | Rules | Specialization                                               | npm                                                              |
| ------------------------------------ | ------- | ----- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| **eslint-plugin-browser-security**   | `1.2.0` | 52    | Browser/DOM security (XSS, CSP, postMessage)                 | [📦](https://npmjs.com/package/eslint-plugin-browser-security)   |
| **eslint-plugin-node-security**      | `4.0.1` | 31    | Node.js security (Crypto, Process, File System)              | [📦](https://npmjs.com/package/eslint-plugin-node-security)      |
| **eslint-plugin-secure-coding**      | `3.1.0` | 26    | Core security (OWASP Top 10 + Mobile Top 10)                 | [📦](https://npmjs.com/package/eslint-plugin-secure-coding)      |
| **eslint-plugin-vercel-ai-security** | `1.3.0` | 22    | Vercel AI SDK security (OWASP LLM Top 10)                    | [📦](https://npmjs.com/package/eslint-plugin-vercel-ai-security) |
| **eslint-plugin-mongodb-security**   | `8.2.0` | 19    | MongoDB & Mongoose security                                  | [📦](https://npmjs.com/package/eslint-plugin-mongodb-security)   |
| **eslint-plugin-pg**                 | `1.4.0` | 15    | PostgreSQL/node-postgres security                            | [📦](https://npmjs.com/package/eslint-plugin-pg)                 |
| **eslint-plugin-jwt**                | `2.2.0` | 13    | JWT security (Algorithm confusion, secrets)                  | [📦](https://npmjs.com/package/eslint-plugin-jwt)                |
| **eslint-plugin-crypto**             | `2.2.0` | 10    | Cryptographic best practices                                 | [📦](https://npmjs.com/package/eslint-plugin-crypto)             |
| **eslint-plugin-lambda-security**    | `1.2.0` | 16    | AWS Lambda & Middy security                                  | [📦](https://npmjs.com/package/eslint-plugin-lambda-security)    |
| **eslint-plugin-express-security**   | `1.2.0` | 14    | Express.js security (Cookies, CORS, ReDoS)                   | [📦](https://npmjs.com/package/eslint-plugin-express-security)   |
| **eslint-plugin-nestjs-security**    | `1.2.0` | 10    | NestJS security (Guards, Validation)                         | [📦](https://npmjs.com/package/eslint-plugin-nestjs-security)    |
| **eslint-plugin-import-next**        | `2.3.0` | 61    | 100x faster eslint-plugin-import replacement                 | [📦](https://npmjs.com/package/eslint-plugin-import-next)        |
| **eslint-plugin-conventions**       | `4.0.1` | 9     | Team disciplinary patterns and conventions                   | [📦](https://npmjs.com/package/eslint-plugin-conventions)        |
| **eslint-plugin-maintainability**   | `3.0.0` | 8     | Reducing cognitive load and reading ease                     | [📦](https://npmjs.com/package/eslint-plugin-maintainability)    |
| **eslint-plugin-reliability**       | `3.0.1` | 8     | Runtime stability and fault tolerance                        | [📦](https://npmjs.com/package/eslint-plugin-reliability)        |
| **eslint-plugin-modularity**        | `2.0.1` | 7     | Architecture, DDD, and module isolation                      | [📦](https://npmjs.com/package/eslint-plugin-modularity)         |
| **eslint-plugin-operability**       | `3.0.2` | 6     | Production behavior and log quality                          | [📦](https://npmjs.com/package/eslint-plugin-operability)        |
| **eslint-plugin-modernization**     | `2.0.1` | 5     | Modernizing JS to ES2022+ syntax                             | [📦](https://npmjs.com/package/eslint-plugin-modernization)      |

---

## 📋 Complete Rule Listings by Package

### eslint-plugin-secure-coding (26 rules)

> **Version**: 3.1.0 | **OWASP Coverage**: Top 10 2021 + Mobile Top 10 2024

#### Injection Prevention

| Rule                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `detect-eval-with-expression` | Detects eval() with dynamic expressions      |
| `detect-child-process`        | Detects child_process with unsanitized input |
| `no-unsafe-dynamic-require`   | Prevents dynamic require() calls             |
| `no-graphql-injection`        | Detects GraphQL injection vulnerabilities    |
| `no-ldap-injection`           | Detects LDAP injection vulnerabilities       |
| `no-xpath-injection`          | Detects XPath injection vulnerabilities      |
| `no-xxe-injection`            | Detects XXE injection vulnerabilities        |
| `no-format-string-injection`  | Detects format string vulnerabilities        |
| `no-directive-injection`      | Detects directive injection                  |

#### Secrets & Credentials

| Rule                             | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `no-hardcoded-credentials`       | Detects hardcoded passwords, API keys, secrets |
| `no-credentials-in-query-params` | Prevents credentials in URL query parameters   |
| `no-hardcoded-session-tokens`    | Detects hardcoded session tokens               |
| `no-password-in-url`             | Prevents passwords in URLs                     |

#### Regex & ReDoS

| Rule                           | Description                        |
| ------------------------------ | ---------------------------------- |
| `detect-non-literal-regexp`    | Detects non-literal regex patterns |
| `no-redos-vulnerable-regex`    | Detects ReDoS-vulnerable patterns  |
| `no-unsafe-regex-construction` | Prevents unsafe regex construction |

#### Object & Prototype Security

| Rule                        | Description                       |
| --------------------------- | --------------------------------- |
| `detect-object-injection`   | Detects prototype pollution risks |
| `no-unsafe-deserialization` | Prevents unsafe deserialization   |

#### Path & File Security

| Rule                             | Description                      |
| -------------------------------- | -------------------------------- |
| `detect-non-literal-fs-filename` | Detects path traversal risks     |
| `no-zip-slip`                    | Detects zip slip vulnerabilities |
| `no-toctou-vulnerability`        | Detects TOCTOU race conditions   |
| `no-arbitrary-file-access`       | Prevents arbitrary file access   |

#### Input Validation & XSS

| Rule                           | Description                       |
| ------------------------------ | --------------------------------- |
| `no-unvalidated-user-input`    | Detects unvalidated user input    |
| `no-unescaped-url-parameter`   | Prevents unescaped URL parameters |
| `no-improper-sanitization`     | Detects improper sanitization     |
| `no-improper-type-validation`  | Detects type validation issues    |
| `no-unvalidated-deeplinks`     | Prevents unvalidated deeplinks    |
| `require-mime-type-validation` | Requires MIME type validation     |

#### Authentication & Authorization

| Rule                              | Description                        |
| --------------------------------- | ---------------------------------- |
| `no-missing-authentication`       | Detects missing auth checks        |
| `no-privilege-escalation`         | Detects privilege escalation risks |
| `no-client-side-auth-logic`       | Prevents client-side auth logic    |
| `require-backend-authorization`   | Requires backend authorization     |
| `detect-weak-password-validation` | Detects weak password validation   |
| `no-weak-password-recovery`       | Detects weak password recovery     |

#### Session & Cookies

| Rule                         | Description                     |
| ---------------------------- | ------------------------------- |
| `no-missing-csrf-protection` | Detects missing CSRF protection |

#### Network & Headers

| Rule                          | Description                       |
| ----------------------------- | --------------------------------- |
| `no-missing-cors-check`       | Detects missing CORS checks       |
| `no-missing-security-headers` | Detects missing security headers  |
| `no-insecure-redirects`       | Prevents open redirects           |
| `no-clickjacking`             | Prevents clickjacking             |
| `no-http-urls`                | Enforces HTTPS                    |
| `require-https-only`          | Requires HTTPS only               |
| `no-permissive-cors`          | Prevents permissive CORS          |
| `no-unencrypted-transmission` | Prevents unencrypted transmission |
| `no-insecure-websocket`       | Prevents insecure WebSocket       |
| `require-url-validation`      | Requires URL validation           |
| `require-network-timeout`     | Requires network timeouts         |

#### Error Handling & Logging

| Rule                          | Description                      |
| ----------------------------- | -------------------------------- |
| `no-pii-in-logs`              | Prevents PII in logs             |
| `no-verbose-error-messages`   | Prevents verbose errors          |
| `no-debug-code-in-production` | Detects debug code               |
| `no-exposed-debug-endpoints`  | Detects exposed debug endpoints  |
| `no-sensitive-data-exposure`  | Prevents sensitive data exposure |
| `no-exposed-sensitive-data`   | Prevents exposed sensitive data  |

#### Resource Management

| Rule                               | Description                  |
| ---------------------------------- | ---------------------------- |
| `no-buffer-overread`               | Prevents buffer overread     |
| `no-unlimited-resource-allocation` | Prevents resource exhaustion |
| `no-unchecked-loop-condition`      | Detects infinite loops       |

#### Mobile Security (OWASP Mobile Top 10)

| Rule                                 | Description                   |
| ------------------------------------ | ----------------------------- |
| `no-allow-arbitrary-loads`           | M5: Insecure Communication    |
| `no-disabled-certificate-validation` | M5: Insecure Communication    |
| `detect-mixed-content`               | M5: Insecure Communication    |
| `require-dependency-integrity`       | M2: Supply Chain              |
| `detect-suspicious-dependencies`     | M2: Supply Chain              |
| `no-dynamic-dependency-loading`      | M2: Supply Chain              |
| `require-package-lock`               | M2: Supply Chain              |
| `no-tracking-without-consent`        | M6: Privacy                   |
| `require-data-minimization`          | M6: Privacy                   |
| `no-sensitive-data-in-analytics`     | M6: Privacy                   |
| `require-code-minification`          | M7: Binary Protection         |
| `no-sensitive-data-in-cache`         | M9: Insecure Data Storage     |
| `require-storage-encryption`         | M9: Insecure Data Storage     |
| `no-data-in-temp-storage`            | M9: Insecure Data Storage     |
| `require-secure-deletion`            | M9: Insecure Data Storage     |
| `require-secure-defaults`            | M8: Security Misconfiguration |
| `require-secure-credential-storage`  | M1: Improper Credential Usage |
| `require-csp-headers`                | M8: Security Misconfiguration |

#### Platform-Specific

| Rule                          | Description              |
| ----------------------------- | ------------------------ |
| `no-electron-security-issues` | Electron security issues |

---

### eslint-plugin-pg (13 rules)

> **Version**: 1.1.3 | **Specialization**: PostgreSQL/node-postgres

#### Security Rules (6)

| Rule                       | OWASP         | Description                            |
| -------------------------- | ------------- | -------------------------------------- |
| `no-unsafe-query`          | A03 Injection | SQL injection via string concatenation |
| `no-insecure-ssl`          | A02 Crypto    | Disabled SSL/TLS verification          |
| `no-hardcoded-credentials` | A02 Crypto    | Hardcoded database passwords           |
| `no-unsafe-search-path`    | A03 Injection | search_path hijacking                  |
| `no-unsafe-copy-from`      | A03 Injection | COPY FROM file path injection          |
| `no-transaction-on-pool`   | A01 Access    | Transaction race conditions            |

#### Resource Management (4)

| Rule                        | Description               |
| --------------------------- | ------------------------- |
| `no-missing-client-release` | Connection leak detection |
| `prevent-double-release`    | Double release detection  |
| `no-floating-query`         | Unhandled query promises  |
| `check-query-params`        | Parameter count mismatch  |

#### Performance & Quality (3)

| Rule                   | Description                    |
| ---------------------- | ------------------------------ |
| `no-select-all`        | SELECT \* anti-pattern         |
| `prefer-pool-query`    | pool.query() vs pool.connect() |
| `no-batch-insert-loop` | N+1 insert loop detection      |

---

### eslint-plugin-crypto (24 rules)

> **Version**: 2.0.3 | **CVE Coverage**: CVE-2023-46809, CVE-2020-36732, CVE-2023-46233

#### Core Node.js Crypto (8)

| Rule                          | Description                  |
| ----------------------------- | ---------------------------- |
| `no-weak-hash-algorithm`      | MD5, SHA1 detection          |
| `no-weak-cipher-algorithm`    | DES, RC4, Blowfish detection |
| `no-deprecated-cipher-method` | Deprecated cipher methods    |
| `no-static-iv`                | Static IV detection          |
| `no-ecb-mode`                 | ECB mode detection           |
| `no-insecure-key-derivation`  | Weak key derivation          |
| `no-hardcoded-crypto-key`     | Hardcoded encryption keys    |
| `require-random-iv`           | Random IV requirement        |

#### crypto-hash Package (1)

| Rule           | Description                 |
| -------------- | --------------------------- |
| `no-sha1-hash` | SHA1 in crypto-hash package |

#### crypto-random-string Package (2)

| Rule                        | Description                 |
| --------------------------- | --------------------------- |
| `require-sufficient-length` | Token length requirements   |
| `no-numeric-only-tokens`    | Numeric-only token weakness |

#### CryptoJS Package (3)

| Rule                      | Description              |
| ------------------------- | ------------------------ |
| `no-cryptojs`             | CryptoJS usage warning   |
| `no-cryptojs-weak-random` | CVE-2020-36732 detection |
| `prefer-native-crypto`    | Native crypto preference |

#### Advanced Security (10)

| Rule                               | CVE            | Description                |
| ---------------------------------- | -------------- | -------------------------- |
| `no-math-random-crypto`            | —              | Math.random() for crypto   |
| `no-insecure-rsa-padding`          | CVE-2023-46809 | Marvin Attack detection    |
| `require-secure-pbkdf2-digest`     | CVE-2023-46233 | PBKDF2 digest security     |
| `no-predictable-salt`              | —              | Predictable salt detection |
| `require-authenticated-encryption` | —              | AEAD requirement           |
| `no-key-reuse`                     | —              | Key reuse detection        |
| `no-self-signed-certs`             | —              | Self-signed cert detection |
| `no-timing-unsafe-compare`         | —              | Timing attack prevention   |
| `require-key-length`               | —              | Key length requirements    |
| `no-web-crypto-export`             | —              | Web Crypto key export      |

---

### eslint-plugin-jwt (13 rules)

> **Version**: 2.0.3 | **CVE Coverage**: CVE-2022-23540 (Algorithm Confusion)

#### Core Security (7)

| Rule                          | Description                     |
| ----------------------------- | ------------------------------- |
| `no-algorithm-none`           | Algorithm "none" attack         |
| `no-algorithm-confusion`      | CVE-2022-23540 detection        |
| `require-algorithm-whitelist` | Algorithm whitelist requirement |
| `no-decode-without-verify`    | jwt.decode() without verify     |
| `no-weak-secret`              | Weak secret detection           |
| `require-expiration`          | Expiration requirement          |
| `no-hardcoded-secret`         | Hardcoded JWT secrets           |

#### 2025 Vulnerability Research (6)

| Rule                          | Description               |
| ----------------------------- | ------------------------- |
| `require-issued-at`           | iat claim requirement     |
| `require-issuer-validation`   | Issuer validation         |
| `require-audience-validation` | Audience validation       |
| `no-timestamp-manipulation`   | Timestamp manipulation    |
| `require-max-age`             | Max age requirement       |
| `no-sensitive-payload`        | Sensitive data in payload |

---

### eslint-plugin-browser-security (21 rules)

> **Version**: 1.0.3 | **Coverage**: XSS, postMessage, Storage, CSP

#### XSS Prevention (2)

| Rule           | Description              |
| -------------- | ------------------------ |
| `no-innerhtml` | innerHTML XSS prevention |
| `no-eval`      | eval() prevention        |

#### postMessage Security (4)

| Rule                               | Description                 |
| ---------------------------------- | --------------------------- |
| `require-postmessage-origin-check` | Origin check requirement    |
| `no-postmessage-wildcard-origin`   | Wildcard origin prevention  |
| `no-postmessage-innerhtml`         | postMessage to innerHTML    |
| `no-worker-message-innerhtml`      | Worker message to innerHTML |

#### Storage Security (5)

| Rule                          | Description              |
| ----------------------------- | ------------------------ |
| `no-sensitive-localstorage`   | Tokens in localStorage   |
| `no-jwt-in-storage`           | JWT in browser storage   |
| `no-sensitive-sessionstorage` | Tokens in sessionStorage |
| `no-sensitive-indexeddb`      | Tokens in IndexedDB      |
| `require-blob-url-revocation` | Blob URL memory leaks    |

#### Cookie Security (3)

| Rule                          | Description              |
| ----------------------------- | ------------------------ |
| `no-sensitive-cookie-js`      | Sensitive cookies via JS |
| `no-cookie-auth-tokens`       | Auth tokens in cookies   |
| `require-cookie-secure-attrs` | Secure cookie attributes |

#### WebSocket Security (3)

| Rule                     | Description            |
| ------------------------ | ---------------------- |
| `require-websocket-wss`  | WSS requirement        |
| `no-websocket-innerhtml` | WebSocket to innerHTML |
| `no-websocket-eval`      | WebSocket data to eval |

#### Service Worker Security (2)

| Rule                            | Description             |
| ------------------------------- | ----------------------- |
| `no-dynamic-service-worker-url` | Dynamic SW URL          |
| `no-filereader-innerhtml`       | FileReader to innerHTML |

#### CSP Security (2)

| Rule                   | Description       |
| ---------------------- | ----------------- |
| `no-unsafe-inline-csp` | unsafe-inline CSP |
| `no-unsafe-eval-csp`   | unsafe-eval CSP   |

---

### eslint-plugin-vercel-ai-security (19 rules)

> **Version**: 1.1.3 | **Coverage**: OWASP LLM Top 10 2025 (100%)

| Rule                             | OWASP LLM | Description                 |
| -------------------------------- | --------- | --------------------------- |
| `require-validated-prompt`       | LLM01     | Prompt injection prevention |
| `no-sensitive-in-prompt`         | LLM02     | Sensitive info in prompts   |
| `no-training-data-exposure`      | LLM03     | Training data exposure      |
| `require-max-tokens`             | LLM04     | Token limit for DoS         |
| `require-max-steps`              | LLM04     | Step limit for DoS          |
| `require-abort-signal`           | LLM04     | Abort signal requirement    |
| `no-hardcoded-api-keys`          | LLM05     | Hardcoded API keys          |
| `no-dynamic-system-prompt`       | LLM06     | Dynamic system prompts      |
| `no-system-prompt-leak`          | LLM07     | System prompt leakage       |
| `require-embedding-validation`   | LLM08     | Embedding validation        |
| `require-output-validation`      | LLM09     | Output validation           |
| `require-tool-confirmation`      | ASI02     | Tool confirmation           |
| `require-tool-schema`            | ASI02     | Tool schema validation      |
| `no-unsafe-output-handling`      | LLM02     | Unsafe output handling      |
| `require-output-filtering`       | ASI04     | Output filtering            |
| `require-rag-content-validation` | ASI07     | RAG content validation      |
| `require-error-handling`         | ASI08     | Error handling              |
| `require-audit-logging`          | ASI10     | Audit logging               |
| `require-request-timeout`        | LLM04     | Request timeout             |

---

### eslint-plugin-express-security (9 rules)

> **Version**: 1.0.3 | **Specialization**: Express.js

| Rule                                  | Description                   |
| ------------------------------------- | ----------------------------- |
| `require-helmet`                      | Helmet middleware requirement |
| `no-permissive-cors`                  | Permissive CORS detection     |
| `require-csrf-protection`             | CSRF protection requirement   |
| `no-insecure-cookie-options`          | Insecure cookie options       |
| `require-rate-limiting`               | Rate limiting requirement     |
| `no-graphql-introspection-production` | GraphQL introspection         |
| `no-cors-credentials-wildcard`        | CORS credentials wildcard     |
| `require-express-body-parser-limits`  | Body parser limits            |
| `no-express-unsafe-regex-route`       | ReDoS in routes               |

---

### eslint-plugin-lambda-security (13 rules)

> **Version**: 1.0.3 | **Coverage**: OWASP Serverless Top 10

| Rule                              | OWASP Serverless | Description               |
| --------------------------------- | ---------------- | ------------------------- |
| `no-hardcoded-credentials-sdk`    | SAS-2            | SDK hardcoded credentials |
| `no-permissive-cors-response`     | SAS-4            | CORS in response          |
| `no-permissive-cors-middy`        | SAS-4            | CORS in Middy             |
| `no-secrets-in-env`               | SAS-3            | Secrets in env vars       |
| `no-env-logging`                  | SAS-3            | Env var logging           |
| `no-unvalidated-event-body`       | SAS-1            | Event body injection      |
| `no-missing-authorization-check`  | SAS-5            | Missing auth check        |
| `no-overly-permissive-iam-policy` | SAS-5            | Permissive IAM            |
| `no-error-swallowing`             | SAS-6            | Error swallowing          |
| `require-timeout-handling`        | SAS-7            | Timeout handling          |
| `no-unbounded-batch-processing`   | SAS-7            | Unbounded batch           |
| `no-user-controlled-requests`     | SAS-8            | SSRF prevention           |
| `no-exposed-error-details`        | SAS-9            | Error detail exposure     |

---

### eslint-plugin-nestjs-security (5 rules)

> **Version**: 1.0.4 | **Specialization**: NestJS

| Rule                         | Description                      |
| ---------------------------- | -------------------------------- |
| `require-guards`             | Guard requirement on controllers |
| `no-missing-validation-pipe` | ValidationPipe requirement       |
| `require-throttler`          | Throttler middleware             |
| `require-class-validator`    | class-validator decorators       |
| `no-exposed-private-fields`  | Private field exposure           |

---

### eslint-plugin-import-next (55 rules)

> **Version**: 2.1.0 | **Drop-in replacement for eslint-plugin-import**

#### Module Resolution (12)

| Rule                         | Description                 |
| ---------------------------- | --------------------------- |
| `no-duplicates`              | Duplicate imports           |
| `named`                      | Named export validation     |
| `default`                    | Default export validation   |
| `namespace`                  | Namespace import validation |
| `extensions`                 | File extension requirements |
| `no-self-import`             | Self-import prevention      |
| `no-unresolved`              | Unresolved import detection |
| `no-absolute-path`           | Absolute path prevention    |
| `no-useless-path-segments`   | Useless path segments       |
| `no-relative-parent-imports` | Parent import restrictions  |
| `no-relative-packages`       | Relative package imports    |
| `no-dynamic-require`         | Dynamic require()           |

#### Dependency Boundaries (8)

| Rule                         | Description                   |
| ---------------------------- | ----------------------------- |
| `no-cycle`                   | **100x faster** circular deps |
| `no-internal-modules`        | Internal module access        |
| `no-cross-domain-imports`    | Cross-domain imports          |
| `max-dependencies`           | Dependency count limits       |
| `no-extraneous-dependencies` | Extraneous dependencies       |
| `no-nodejs-modules`          | Node.js module restrictions   |
| `no-import-module-exports`   | Mixed module systems          |
| `unambiguous`                | Module system clarity         |

#### Export Style (9)

| Rule                          | Description               |
| ----------------------------- | ------------------------- |
| `export`                      | Export validation         |
| `no-default-export`           | Default export prevention |
| `prefer-default-export`       | Default export preference |
| `no-named-export`             | Named export restrictions |
| `no-mutable-exports`          | Mutable export prevention |
| `no-anonymous-default-export` | Anonymous default exports |
| `no-deprecated`               | Deprecated API usage      |
| `exports-last`                | Exports at end of file    |
| `group-exports`               | Export grouping           |

#### Import Style (11)

| Rule                             | Description             |
| -------------------------------- | ----------------------- |
| `enforce-import-order` / `order` | Import ordering         |
| `no-unassigned-import`           | Unassigned imports      |
| `first`                          | Imports at top          |
| `newline-after-import`           | Newline after imports   |
| `no-empty-named-blocks`          | Empty named blocks      |
| `no-named-as-default`            | Named as default        |
| `no-named-as-default-member`     | Named as default member |
| `no-named-default`               | Named default           |
| `no-namespace`                   | Namespace import style  |
| `no-commonjs`                    | CommonJS prevention     |
| `no-amd`                         | AMD prevention          |

#### Monorepo & Architecture (7)

| Rule                              | Description             |
| --------------------------------- | ----------------------- |
| `dynamic-import-chunkname`        | Webpack chunk names     |
| `no-restricted-paths`             | Path restrictions       |
| `enforce-dependency-direction`    | Dependency direction    |
| `consistent-type-specifier-style` | Type specifier style    |
| `prefer-node-protocol`            | `node:` protocol        |
| `no-unused-modules`               | Unused module detection |
| `no-barrel-file`                  | Barrel file prevention  |

#### Tree Shaking Optimization (4)

| Rule                            | Description              |
| ------------------------------- | ------------------------ |
| `no-barrel-import`              | Barrel import prevention |
| `no-full-package-import`        | Full package imports     |
| `prefer-direct-import`          | Direct import preference |
| `prefer-tree-shakeable-imports` | Tree-shakeable imports   |

#### Enterprise Governance (4)

| Rule                      | Description               |
| ------------------------- | ------------------------- |
| `enforce-team-boundaries` | Team boundary enforcement |
| `no-legacy-imports`       | Legacy import detection   |
| `require-import-approval` | Import approval workflow  |
| `prefer-modern-api`       | Modern API preference     |

---

## 🎯 OWASP Coverage Matrix

### OWASP Top 10 2021 → Plugin Mapping

| #       | Category                  | Primary Plugin(s)                                        | Rules                                                                          |
| ------- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **A01** | Broken Access Control     | `secure-coding`, `nestjs-security`, `lambda-security`    | `no-privilege-escalation`, `require-guards`, `no-missing-authorization-check`  |
| **A02** | Cryptographic Failures    | `crypto`, `pg`, `jwt`                                    | `no-weak-hash-algorithm`, `no-hardcoded-credentials`, `no-weak-secret`         |
| **A03** | Injection                 | `secure-coding`, `pg`, `browser-security`                | `detect-eval-with-expression`, `no-unsafe-query`, `no-innerhtml`               |
| **A04** | Insecure Design           | `secure-coding`, `nestjs-security`                       | `no-improper-type-validation`, `no-missing-validation-pipe`                    |
| **A05** | Security Misconfiguration | `secure-coding`, `express-security`, `lambda-security`   | `no-permissive-cors`, `require-helmet`, `no-exposed-error-details`             |
| **A06** | Vulnerable Components     | `secure-coding`, `import-next`                           | `detect-suspicious-dependencies`, `no-extraneous-dependencies`                 |
| **A07** | Auth Failures             | `jwt`, `secure-coding`, `express-security`               | `no-algorithm-none`, `no-missing-authentication`, `no-insecure-cookie-options` |
| **A08** | Integrity Failures        | `secure-coding`                                          | `no-unsafe-deserialization`, `no-unsafe-dynamic-require`                       |
| **A09** | Logging Failures          | `secure-coding`, `lambda-security`                       | `no-pii-in-logs`, `no-error-swallowing`                                        |
| **A10** | SSRF                      | `secure-coding`, `lambda-security`, `vercel-ai-security` | `require-url-validation`, `no-user-controlled-requests`                        |

---

## 📚 Article Writing Guidelines

### Multi-Plugin Articles

When writing articles that cover broad topics (e.g., OWASP mapping, security audits), you **MUST**:

1. **Reference ALL relevant plugins** — Don't limit to just `secure-coding`
2. **Use accurate rule names** — Reference this document for exact rule names
3. **Show SQL Injection coverage across plugins**:
   - `secure-coding`: General injection patterns
   - `pg`: PostgreSQL-specific `no-unsafe-query`
   - `browser-security`: DOM-based injection

### Example: OWASP A03 Injection Article

```javascript
// eslint.config.js - Complete Injection Protection
import secureCoding from 'eslint-plugin-secure-coding';
import pg from 'eslint-plugin-pg';
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  secureCoding.configs['owasp-top-10'],
  pg.configs.recommended,
  browserSecurity.configs.recommended,
];
```

**Rules activated**:

- `secure-coding/detect-eval-with-expression` - eval() injection
- `secure-coding/detect-child-process` - Command injection
- `secure-coding/no-ldap-injection` - LDAP injection
- `secure-coding/no-xpath-injection` - XPath injection
- `pg/no-unsafe-query` - SQL injection in PostgreSQL
- `browser-security/no-innerhtml` - DOM XSS

---

_This document should be updated after each npm release._
