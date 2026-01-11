# eslint-plugin-secure-coding

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  ESLint plugin for general secure coding practices and OWASP compliance.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=secure-coding)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=secure-coding)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/secure-coding](https://eslint.interlace.tools/docs/secure-coding)
>
> [!IMPORTANT]
> Rules marked with ~~strikethrough~~ are deprecated. For **complete OWASP coverage**, combine this plugin with dedicated plugins:
> | Plugin | Coverage |
> |--------|----------|
> | [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | A02 — JWT security (13 rules) |
> | [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | A02 — Cryptographic failures (24 rules) |
> | [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | A03 — SQL injection for PostgreSQL (13 rules) |
> | [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | A05/A07 — CORS, headers, cookies, CSRF for Express |
> | [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | A05/A07 — Guards, validation, throttler for NestJS |
> | [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | A05/A07 — API Gateway, Middy middleware for AWS Lambda |
> | [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | OWASP LLM + Agentic Top 10 for AI apps (19 rules) |

>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-secure-coding --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  ESLint plugin for general secure coding practices and OWASP compliance.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-secure-coding --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  ESLint plugin for general secure coding practices and OWASP compliance.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-secure-coding --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

General secure coding practices and OWASP compliance.

## Description

## Getting Started

```bash
npm install eslint-plugin-secure-coding --save-dev
```

General secure coding practices and OWASP compliance.

## Description

## Getting Started

```bash
npm install eslint-plugin-secure-coding --save-dev
```

---
### OWASP Top 10 Web 2021

| Category     | Description               | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **A01:2021** |  |  |  |  |  |  |  |  |  |
| **A02:2021** |  |  |  |  |  |  |  |  |  |
| **A03:2021** |  |  |  |  |  |  |  |  |  |
| **A04:2021** |  |  |  |  |  |  |  |  |  |
| **A05:2021** |  |  |  |  |  |  |  |  |  |
| **A06:2021** |  |  |  |  |  |  |  |  |  |
| **A07:2021** |  |  |  |  |  |  |  |  |  |
| **A08:2021** |  |  |  |  |  |  |  |  |  |
| **A09:2021** |  |  |  |  |  |  |  |  |  |
| **A10:2021** |  |  |  |  |  |  |  |  |  |
### OWASP Mobile Top 10 2024

| Category | Description                    | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **M1** |  |  |  |  |  |  |  |  |  |
| **M2** |  |  |  |  |  |  |  |  |  |
| **M3** |  |  |  |  |  |  |  |  |  |
| **M4** |  |  |  |  |  |  |  |  |  |
| **M5** |  |  |  |  |  |  |  |  |  |
| **M6** |  |  |  |  |  |  |  |  |  |
| **M7** |  |  |  |  |  |  |  |  |  |
| **M8** |  |  |  |  |  |  |  |  |  |
| **M9** |  |  |  |  |  |  |  |  |  |
| **M10** |  |  |  |  |  |  |  |  |  |
---

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|      [no-sql-injection](./docs/rules/no-sql-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-89      |      A03      |      9.8      |      Prevent SQL injection via string concatenation      |      💼      |
|      [database-injection](./docs/rules/database-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-89      |      A03      |      9.8      |      Comprehensive SQL/NoSQL/ORM injection detection      |      💼      |
|      [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-95      |      A03      |      9.8      |      Detect eval() with dynamic expressions      |      💼      |
|      [detect-child-process](./docs/rules/detect-child-process.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-78      |      A03      |      9.8      |      Detect command injection in child_process      |      💼      |
|      [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-95      |      A03      |      7.5      |      Forbid dynamic require() calls      |      💼      |
|      [no-graphql-injection](./docs/rules/no-graphql-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-943      |      A03      |      8.6      |      Prevent GraphQL injection attacks      |      💼      |
|      [no-xxe-injection](./docs/rules/no-xxe-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-611      |      A03      |      9.1      |      Prevent XML External Entity injection      |      💼      |
|      [no-xpath-injection](./docs/rules/no-xpath-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-643      |      A03      |      9.8      |      Prevent XPath injection attacks      |      💼      |
|      [no-ldap-injection](./docs/rules/no-ldap-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-90      |      A03      |      9.8      |      Prevent LDAP injection attacks      |      💼      |
|      [no-directive-injection](./docs/rules/no-directive-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-94      |      A03      |      8.8      |      Prevent template directive injection      |      💼      |
|      [no-format-string-injection](./docs/rules/no-format-string-injection.md)      | General |  General  |   General   |    General    |     Injection Prevention     |      CWE-134      |      A03      |      9.8      |      Prevent format string vulnerabilities      |      💼      |
|      [no-http-urls](./docs/rules/no-http-urls.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-319      |      M5      |      7.5      |      Prevent insecure HTTP URLs      |      💼      |
|      [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-798      |      M1      |      7.5      |      Detect hardcoded secrets      |      💼      |      🔧      |      💡      |
|      [no-credentials-in-storage-api](./docs/rules/no-credentials-in-storage-api.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-522      |      M1      |      7.5      |      Prevent credentials in localStorage      |      💼      |
|      [no-credentials-in-query-params](./docs/rules/no-credentials-in-query-params.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-598      |      M1      |      7.5      |      Detect credentials in URLs      |      💼      |
|      [no-allow-arbitrary-loads](./docs/rules/no-allow-arbitrary-loads.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-295      |      M5      |      7.5      |      Prevent insecure ATS configuration      |
|      [no-disabled-certificate-validation](./docs/rules/no-disabled-certificate-validation.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-295      |      M5      |      7.5      |      Detect disabled cert validation      |
|      [require-https-only](./docs/rules/require-https-only.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-319      |      M5      |      7.5      |      Enforce HTTPS-only connections      |      💼      |
|      [require-network-timeout](./docs/rules/require-network-timeout.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-400      |      M5      |      7.5      |      Require network timeouts      |
|      [detect-weak-password-validation](./docs/rules/detect-weak-password-validation.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-521      |      M3      |      7.5      |      Detect weak password requirements      |
|      [no-client-side-auth-logic](./docs/rules/no-client-side-auth-logic.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-602      |      M3      |      7.5      |      Prevent client-side auth      |
|      [no-hardcoded-session-tokens](./docs/rules/no-hardcoded-session-tokens.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-798      |      M3      |      9.8      |      Detect hardcoded session tokens      |      💼      |
|      [no-unvalidated-deeplinks](./docs/rules/no-unvalidated-deeplinks.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-939      |      M4      |      7.5      |      Require deeplink validation      |      💼      |
|      [require-url-validation](./docs/rules/require-url-validation.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-601      |      M4      |      7.5      |      Require URL validation      |
|      [require-mime-type-validation](./docs/rules/require-mime-type-validation.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-434      |      M4      |      7.5      |      Require MIME type validation      |
|      [no-arbitrary-file-access](./docs/rules/no-arbitrary-file-access.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-22      |      M4      |      7.5      |      Prevent path traversal      |
|      [no-pii-in-logs](./docs/rules/no-pii-in-logs.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-532      |      M6      |      7.5      |      Prevent PII in logs      |      ⚠️      |
|      [no-tracking-without-consent](./docs/rules/no-tracking-without-consent.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-359      |      M6      |      7.5      |      Require tracking consent      |
|      [no-sensitive-data-in-analytics](./docs/rules/no-sensitive-data-in-analytics.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-359      |      M6      |      7.5      |      Prevent PII in analytics      |
|      [require-data-minimization](./docs/rules/require-data-minimization.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-213      |      M6      |      7.5      |      Identify excessive data collection      |
|      [no-debug-code-in-production](./docs/rules/no-debug-code-in-production.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-489      |      M7      |      7.5      |      Detect debug code      |
|      [require-code-minification](./docs/rules/require-code-minification.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-656      |      M7      |      7.5      |      Require minification config      |
|      [no-verbose-error-messages](./docs/rules/no-verbose-error-messages.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-209      |      M8      |      7.5      |      Prevent stack trace exposure      |      ⚠️      |
|      [require-secure-defaults](./docs/rules/require-secure-defaults.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-276      |      M8      |      7.5      |      Require secure default configs      |
|      [no-sensitive-data-in-cache](./docs/rules/no-sensitive-data-in-cache.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-524      |      M9      |      7.5      |      Prevent sensitive cache data      |
|      [no-data-in-temp-storage](./docs/rules/no-data-in-temp-storage.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-312      |      M9      |      7.5      |      Prevent sensitive temp data      |
|      [require-secure-deletion](./docs/rules/require-secure-deletion.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-459      |      M9      |      7.5      |      Require secure data deletion      |
|      [require-storage-encryption](./docs/rules/require-storage-encryption.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-311      |      M9      |      7.5      |      Require encrypted storage      |
|      [no-unencrypted-local-storage](./docs/rules/no-unencrypted-local-storage.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-312      |      M9      |      7.5      |      Prevent unencrypted local storage      |
|      [require-credential-storage](./docs/rules/require-credential-storage.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-522      |      M10      |      7.5      |      Require secure credential storage      |
|      [no-exposed-debug-endpoints](./docs/rules/no-exposed-debug-endpoints.md)      | General |  General  |   General   |    General    |     Mobile Security     |      CWE-489      |      M8      |      7.5      |      Prevent exposed debug endpoints      |
|      [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md)      | General |  General  |   General   |    General    |     Path & File Security     |      CWE-22      |      A01      |      7.5      |      Detect path traversal in fs operations      |      💼      |
|      [no-zip-slip](./docs/rules/no-zip-slip.md)      | General |  General  |   General   |    General    |     Path & File Security     |      CWE-22      |      A01      |      8.1      |      Prevent zip slip vulnerabilities      |      💼      |
|      [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md)      | General |  General  |   General   |    General    |     Path & File Security     |      CWE-367      |      A01      |      7.0      |      Detect time-of-check to time-of-use races      |      💼      |      💡      |
|      [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md)      | General |  General  |   General   |    General    |     Regex Security     |      CWE-400      |      A03      |      7.5      |      Detect ReDoS in RegExp construction      |      ⚠️      |
|      [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md)      | General |  General  |   General   |    General    |     Regex Security     |      CWE-1333      |      A03      |      7.5      |      Detect ReDoS-vulnerable patterns      |      💼      |      💡      |
|      [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md)      | General |  General  |   General   |    General    |     Regex Security     |      CWE-400      |      A03      |      7.5      |      Prevent unsafe regex from user input      |      ⚠️      |      💡      |
|      [detect-object-injection](./docs/rules/detect-object-injection.md)      | General |  General  |   General   |    General    |     Object & Prototype     |      CWE-915      |      A03      |      7.3      |      Detect prototype pollution      |      ⚠️      |
|      [no-unsafe-deserialization](./docs/rules/no-unsafe-deserialization.md)      | General |  General  |   General   |    General    |     Object & Prototype     |      CWE-502      |      A08      |      9.8      |      Prevent unsafe deserialization      |      💼      |
|      [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md)      | General |  General  |   General   |    General    |     Cryptography     |      CWE-798      |      A07      |      7.5      |      Detect hardcoded passwords/keys      |      💼      |
|      [no-weak-crypto](./docs/rules/no-weak-crypto.md)      | General |  General  |   General   |    General    |     Cryptography     |      CWE-327      |      A02      |      7.5      |      Detect weak algorithms (MD5, SHA1)      |      💼      |      🚫      |
|      [no-insufficient-random](./docs/rules/no-insufficient-random.md)      | General |  General  |   General   |    General    |     Cryptography     |      CWE-330      |      A02      |      5.3      |      Detect Math.random() for security      |      ⚠️      |      🚫      |
|      [no-timing-attack](./docs/rules/no-timing-attack.md)      | General |  General  |   General   |    General    |     Cryptography     |      CWE-208      |      A02      |      5.9      |      Detect timing attack vulnerabilities      |      💼      |      🚫      |
|      [no-insecure-comparison](./docs/rules/no-insecure-comparison.md)      | General |  General  |   General   |    General    |     Cryptography     |      CWE-697      |      A02      |      5.3      |      Detect insecure string comparison      |      ⚠️      |      🔧      |      🚫      |
|      [no-insecure-jwt](./docs/rules/no-insecure-jwt.md)      | General |  General  |   General   |    General    |     Cryptography     |      CWE-347      |      A02      |      7.5      |      Detect JWT security issues      |      💼      |      🚫      |
|      [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md)      | General |  General  |   General   |    General    |     Input Validation & XSS     |      CWE-20      |      A03      |      8.6      |      Detect unvalidated user input      |      ⚠️      |
|      [no-unsanitized-html](./docs/rules/no-unsanitized-html.md)      | General |  General  |   General   |    General    |     Input Validation & XSS     |      CWE-79      |      A03      |      6.1      |      Detect XSS via innerHTML      |      💼      |
|      [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md)      | General |  General  |   General   |    General    |     Input Validation & XSS     |      CWE-79      |      A03      |      6.1      |      Detect XSS via URL parameters      |      ⚠️      |
|      [no-improper-sanitization](./docs/rules/no-improper-sanitization.md)      | General |  General  |   General   |    General    |     Input Validation & XSS     |      CWE-116      |      A03      |      7.5      |      Detect improper output encoding      |      💼      |
|      [no-improper-type-validation](./docs/rules/no-improper-type-validation.md)      | General |  General  |   General   |    General    |     Input Validation & XSS     |      CWE-20      |      A04      |      5.3      |      Detect type confusion vulnerabilities      |      ⚠️      |
|      [no-missing-authentication](./docs/rules/no-missing-authentication.md)      | General |  General  |   General   |    General    |     Authentication & Authorization     |      CWE-306      |      A07      |      9.8      |      Detect missing auth checks      |      ⚠️      |
|      [no-privilege-escalation](./docs/rules/no-privilege-escalation.md)      | General |  General  |   General   |    General    |     Authentication & Authorization     |      CWE-269      |      A01      |      8.8      |      Detect privilege escalation      |      ⚠️      |
|      [no-weak-password-recovery](./docs/rules/no-weak-password-recovery.md)      | General |  General  |   General   |    General    |     Authentication & Authorization     |      CWE-640      |      A07      |      9.8      |      Detect insecure password reset      |      💼      |
|      [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md)      | General |  General  |   General   |    General    |     Session & Cookies     |      CWE-614      |      A07      |      5.3      |      Detect missing Secure/HttpOnly      |      ⚠️      |      🚫      |
|      [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md)      | General |  General  |   General   |    General    |     Session & Cookies     |      CWE-352      |      A07      |      8.8      |      Detect missing CSRF tokens      |      ⚠️      |      🚫      |
|      [no-document-cookie](./docs/rules/no-document-cookie.md)      | General |  General  |   General   |    General    |     Session & Cookies     |      CWE-565      |      A07      |      4.3      |      Detect direct cookie manipulation      |      ⚠️      |      💡      |
|      [no-missing-cors-check](./docs/rules/no-missing-cors-check.md)      | General |  General  |   General   |    General    |     Network & Headers     |      CWE-942      |      A05      |      7.5      |      Detect missing CORS validation      |      ⚠️      |      🚫      |
|      [no-missing-security-headers](./docs/rules/no-missing-security-headers.md)      | General |  General  |   General   |    General    |     Network & Headers     |      CWE-693      |      A05      |      5.3      |      Detect missing security headers      |      ⚠️      |      💡      |      🚫      |
|      [no-insecure-redirects](./docs/rules/no-insecure-redirects.md)      | General |  General  |   General   |    General    |     Network & Headers     |      CWE-601      |      A01      |      6.1      |      Detect open redirect vulnerabilities      |      ⚠️      |      💡      |
|      [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md)      | General |  General  |   General   |    General    |     Network & Headers     |      CWE-319      |      A02      |      7.5      |      Detect HTTP instead of HTTPS      |      ⚠️      |
|      [no-clickjacking](./docs/rules/no-clickjacking.md)      | General |  General  |   General   |    General    |     Network & Headers     |      CWE-1021      |      A05      |      6.1      |      Detect clickjacking vulnerabilities      |      💼      |      🚫      |
|      [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md)      | General |  General  |   General   |    General    |     Data Exposure     |      CWE-200      |      A01      |      7.5      |      Detect sensitive data in responses      |      💼      |
|      [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md)      | General |  General  |   General   |    General    |     Data Exposure     |      CWE-532      |      A09      |      5.5      |      Detect sensitive data in logs      |      ⚠️      |      💡      |
|      [no-buffer-overread](./docs/rules/no-buffer-overread.md)      | General |  General  |   General   |    General    |     Buffer, Memory & DoS     |      CWE-126      |      A06      |      7.5      |      Detect buffer over-read      |      💼      |
|      [no-unlimited-resource-allocation](./docs/rules/no-unlimited-resource-allocation.md)      | General |  General  |   General   |    General    |     Buffer, Memory & DoS     |      CWE-770      |      A05      |      7.5      |      Detect unbounded allocations      |      💼      |
|      [no-unchecked-loop-condition](./docs/rules/no-unchecked-loop-condition.md)      | General |  General  |   General   |    General    |     Buffer, Memory & DoS     |      CWE-835      |      A05      |      7.5      |      Detect infinite loop conditions      |      💼      |
|      [no-electron-security-issues](./docs/rules/no-electron-security-issues.md)      | General |  General  |   General   |    General    |     Platform-Specific     |      CWE-693      |      A05      |      8.8      |      Detect Electron security misconfig      |      💼      |
|      [no-insufficient-postmessage-validation](./docs/rules/no-insufficient-postmessage-validation.md)      | General |  General  |   General   |    General    |     Platform-Specific     |      CWE-346      |      A07      |      8.8      |      Detect postMessage origin issues      |      💼      |

## 🚀 Quick Start (Org-friendly)

```bash
# Install
npm install --save-dev eslint-plugin-secure-coding

# Add to eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs.recommended, // baseline for most repos
  { files: ['apps/**'], ...secureCoding.configs['owasp-top-10'] }, // public-facing
  { files: ['services/auth/**', 'services/payments/**'], ...secureCoding.configs.strict }, // crown jewels
];

# Run
npx eslint .
```

---

## 📋 Available Presets (policy tiers)

| Preset                    | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| **`recommended`**         | Balanced security for most projects (Web + key Mobile security) |
| **`strict`**              | Maximum security enforcement (all rules as errors)              |
| **`owasp-top-10`**        | OWASP Top 10 Web 2021 compliance focused                        |
| **`owasp-mobile-top-10`** | OWASP Mobile Top 10 2024 compliance focused                     |

---

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)** - Complete list of all 75 rules with configuration options

---

### What an error looks like (LLM-optimized)

```bash
src/api.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
                    Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
```

Each finding includes:

- CWE + OWASP + CVSS for compliance mapping
- Severity and compliance tags
- A ready-to-apply fix suggestion and a doc link (LLM-friendly)

---

## 🏢 Enterprise Integration Example

```bash
# Install once at the repo root
pnpm add -D eslint-plugin-secure-coding

# eslint.config.js (org-standard)
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  // Baseline for all services (balanced)
  secureCoding.configs.recommended,

  // Add OWASP Top 10 enforcement for internet-facing apps
  {
    files: ['apps/web/**'],
    ...secureCoding.configs['owasp-top-10'],
  },

  // Add OWASP Mobile Top 10 for mobile/native apps
  {
    files: ['apps/mobile/**'],
    ...secureCoding.configs['owasp-mobile-top-10'],
  },

  // Force strict mode for critical backend services
  {
    files: ['services/payments/**', 'services/auth/**'],
    ...secureCoding.configs.strict,
  },
];
```

What this gives organizations:

- OWASP/CWE/CVSS metadata in every finding for compliance mapping
- Consistent, LLM-ready fixes that teammates and AI can apply safely
- Tiered policies (baseline, OWASP-focused, strict) per surface area

---

## 🧭 Type-safe rule configuration (eslint.config.ts)

This package ships rule option types to keep flat configs type-safe.

```ts
import type { Linter } from 'eslint';
import type { AllSecurityRulesOptions } from 'eslint-plugin-secure-coding/types';
import secureCoding from 'eslint-plugin-secure-coding';

const secureCodingRuleOptions: AllSecurityRulesOptions = {
  'no-sql-injection': { strategy: 'parameterize' },
  'no-unsafe-deserialization': { allowJSON: false },
};

export default [
  {
    ...secureCoding.configs.recommended,
    rules: {
      ...secureCoding.configs.recommended.rules,
      'secure-coding/no-sql-injection': [
        'error',
        secureCodingRuleOptions['no-sql-injection'],
      ],
      'secure-coding/no-unsafe-deserialization': [
        'error',
        secureCodingRuleOptions['no-unsafe-deserialization'],
      ],
    },
  },
  secureCoding.configs['owasp-top-10'],
  secureCoding.configs.strict,
] satisfies Linter.FlatConfig[];
```

---

## 🤖 LLM & AI Integration

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 🔒 Privacy

This plugin runs **100% locally**. No data ever leaves your machine.

---

**Q: Does it work with ESLint 9 flat config?**
A: Yes, fully compatible.

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

### Migration Guide (v3.0.0)

For **better coverage**, use these dedicated plugins instead of deprecated rules:

| Deprecated Rules                                                                                                                                             | Migrate To                                                                                       | Why                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `no-insecure-jwt`                                                                                                                                            | [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                           | 13 specialized rules vs 1 generic rule, CVE-2022-23540 coverage |
| `no-weak-crypto`, `no-insufficient-random`, `no-timing-attack`, `no-insecure-comparison`                                                                     | [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                     | 24 rules, CVE-specific detection, library-aware                 |
| `no-permissive-cors`, `no-missing-cors-check`, `no-missing-csrf-protection`, `no-insecure-cookie-settings`, `no-missing-security-headers`, `no-clickjacking` | [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | Framework-aware, helmet integration                             |

### All Ecosystem Plugins

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |
## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

```

```

<a href="https://eslint.interlace.tools/docs/secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>