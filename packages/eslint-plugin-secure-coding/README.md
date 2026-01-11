# eslint-plugin-secure-coding

<div align="center">
  <img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace - eslint-plugin-secure-coding" width="100%" />
</div>

> **Feature-based security rules that AI assistants can actually understand and fix.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=secure_coding)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=secure_coding)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

> **A complete security standard:** This plugin provides **full mitigation** for both **OWASP Top 10 Web (2021)** AND **OWASP Mobile Top 10 (2024)**.  
> With **75 active rules** mapped to CWE and CVSS, it transforms your linter into an enterprise-grade security auditor that AI assistants can understand and fix.

> [!NOTE]
> **v3.0.0**: 14 legacy rules have been **removed** and migrated to dedicated plugins with better coverage. See [Related ESLint Plugins](#-related-eslint-plugins) for migration guidance.

---

## 💡 What you get

- **Feature-based coverage:** 75 rules grouped by attack surface (injection, crypto, auth, cookies, headers, mobile security, resource limits, platform specifics).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Top 10 Web + Mobile, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict`, `owasp-top-10` for fast policy rollout.
- **False-positive reduction:** Sanitizer awareness, annotations, ORM patterns, and safe-library detection keep noise low for org rollouts.

Every security rule produces a **structured 2-line error message**:

```bash
src/components/Display.tsx
  18:5   error  🔒 CWE-79 OWASP:A03-Injection CVSS:6.1 | XSS via innerHTML | HIGH [SOC2,PCI-DSS]
                    Fix: Use textContent or sanitize with DOMPurify: element.textContent = userInput | https://owasp.org/...
```

**Each message includes:**

- 🔒 **CWE reference** - vulnerability classification
- 📋 **OWASP category** - Top 10 mapping (Web or Mobile)
- 📊 **CVSS score** - severity rating (0.0-10.0)
- 🏢 **Compliance tags** - affected frameworks (SOC2, PCI-DSS, HIPAA)
- ✅ **Fix instruction** - exact code to write
- 📚 **Documentation link** - learn more

---

## 📊 OWASP Coverage Matrix

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

## 🔐 75 Active Security Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

### Injection Prevention (11 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-sql-injection](./docs/rules/no-sql-injection.md) | CWE-89 | A03 | 9.8 | Prevent SQL injection via string concatenation | 💼 |  |  |  |  |
| [database-injection](./docs/rules/database-injection.md) | CWE-89 | A03 | 9.8 | Comprehensive SQL/NoSQL/ORM injection detection | 💼 |  |  |  |  |
| [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md) | CWE-95 | A03 | 9.8 | Detect eval() with dynamic expressions | 💼 |  |  |  |  |
| [detect-child-process](./docs/rules/detect-child-process.md) | CWE-78 | A03 | 9.8 | Detect command injection in child_process | 💼 |  |  |  |  |
| [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md) | CWE-95 | A03 | 7.5 | Forbid dynamic require() calls | 💼 |  |  |  |  |
| [no-graphql-injection](./docs/rules/no-graphql-injection.md) | CWE-943 | A03 | 8.6 | Prevent GraphQL injection attacks | 💼 |  |  |  |  |
| [no-xxe-injection](./docs/rules/no-xxe-injection.md) | CWE-611 | A03 | 9.1 | Prevent XML External Entity injection | 💼 |  |  |  |  |
| [no-xpath-injection](./docs/rules/no-xpath-injection.md) | CWE-643 | A03 | 9.8 | Prevent XPath injection attacks | 💼 |  |  |  |  |
| [no-ldap-injection](./docs/rules/no-ldap-injection.md) | CWE-90 | A03 | 9.8 | Prevent LDAP injection attacks | 💼 |  |  |  |  |
| [no-directive-injection](./docs/rules/no-directive-injection.md) | CWE-94 | A03 | 8.8 | Prevent template directive injection | 💼 |  |  |  |  |
| [no-format-string-injection](./docs/rules/no-format-string-injection.md) | CWE-134 | A03 | 9.8 | Prevent format string vulnerabilities | 💼 |  |  |  |  |
### Mobile Security (30 rules)

> **Note:** These rules map to OWASP Mobile Top 10 but are **framework-agnostic** and highly effective for general web application security (e.g., preventing PII leaks, insecure communication, and credential misuse).

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-http-urls](./docs/rules/no-http-urls.md) | CWE-319 | M5 | 7.5 | Prevent insecure HTTP URLs | 💼 |  |  |  |  |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | CWE-798 | M1 | 7.5 | Detect hardcoded secrets | 💼 |  | 🔧 | 💡 |  |
| [no-credentials-in-storage-api](./docs/rules/no-credentials-in-storage-api.md) | CWE-522 | M1 | 7.5 | Prevent credentials in localStorage | 💼 |  |  |  |  |
| [no-credentials-in-query-params](./docs/rules/no-credentials-in-query-params.md) | CWE-598 | M1 | 7.5 | Detect credentials in URLs | 💼 |  |  |  |  |
| [no-allow-arbitrary-loads](./docs/rules/no-allow-arbitrary-loads.md) | CWE-295 | M5 | 7.5 | Prevent insecure ATS configuration |  |  |  |  |  |
| [no-disabled-certificate-validation](./docs/rules/no-disabled-certificate-validation.md) | CWE-295 | M5 | 7.5 | Detect disabled cert validation |  |  |  |  |  |
| [require-https-only](./docs/rules/require-https-only.md) | CWE-319 | M5 | 7.5 | Enforce HTTPS-only connections | 💼 |  |  |  |  |
| [require-network-timeout](./docs/rules/require-network-timeout.md) | CWE-400 | M5 | 7.5 | Require network timeouts |  |  |  |  |  |
| [detect-weak-password-validation](./docs/rules/detect-weak-password-validation.md) | CWE-521 | M3 | 7.5 | Detect weak password requirements |  |  |  |  |  |
| [no-client-side-auth-logic](./docs/rules/no-client-side-auth-logic.md) | CWE-602 | M3 | 7.5 | Prevent client-side auth |  |  |  |  |  |
| [no-hardcoded-session-tokens](./docs/rules/no-hardcoded-session-tokens.md) | CWE-798 | M3 | 9.8 | Detect hardcoded session tokens | 💼 |  |  |  |  |
| [no-unvalidated-deeplinks](./docs/rules/no-unvalidated-deeplinks.md) | CWE-939 | M4 | 7.5 | Require deeplink validation | 💼 |  |  |  |  |
| [require-url-validation](./docs/rules/require-url-validation.md) | CWE-601 | M4 | 7.5 | Require URL validation |  |  |  |  |  |
| [require-mime-type-validation](./docs/rules/require-mime-type-validation.md) | CWE-434 | M4 | 7.5 | Require MIME type validation |  |  |  |  |  |
| [no-arbitrary-file-access](./docs/rules/no-arbitrary-file-access.md) | CWE-22 | M4 | 7.5 | Prevent path traversal |  |  |  |  |  |
| [no-pii-in-logs](./docs/rules/no-pii-in-logs.md) | CWE-532 | M6 | 7.5 | Prevent PII in logs |  | ⚠️ |  |  |  |
| [no-tracking-without-consent](./docs/rules/no-tracking-without-consent.md) | CWE-359 | M6 | 7.5 | Require tracking consent |  |  |  |  |  |
| [no-sensitive-data-in-analytics](./docs/rules/no-sensitive-data-in-analytics.md) | CWE-359 | M6 | 7.5 | Prevent PII in analytics |  |  |  |  |  |
| [require-data-minimization](./docs/rules/require-data-minimization.md) | CWE-213 | M6 | 7.5 | Identify excessive data collection |  |  |  |  |  |
| [no-debug-code-in-production](./docs/rules/no-debug-code-in-production.md) | CWE-489 | M7 | 7.5 | Detect debug code |  |  |  |  |  |
| [require-code-minification](./docs/rules/require-code-minification.md) | CWE-656 | M7 | 7.5 | Require minification config |  |  |  |  |  |
| [no-verbose-error-messages](./docs/rules/no-verbose-error-messages.md) | CWE-209 | M8 | 7.5 | Prevent stack trace exposure |  | ⚠️ |  |  |  |
| [require-secure-defaults](./docs/rules/require-secure-defaults.md) | CWE-276 | M8 | 7.5 | Require secure default configs |  |  |  |  |  |
| [no-sensitive-data-in-cache](./docs/rules/no-sensitive-data-in-cache.md) | CWE-524 | M9 | 7.5 | Prevent sensitive cache data |  |  |  |  |  |
| [no-data-in-temp-storage](./docs/rules/no-data-in-temp-storage.md) | CWE-312 | M9 | 7.5 | Prevent sensitive temp data |  |  |  |  |  |
| [require-secure-deletion](./docs/rules/require-secure-deletion.md) | CWE-459 | M9 | 7.5 | Require secure data deletion |  |  |  |  |  |
| [require-storage-encryption](./docs/rules/require-storage-encryption.md) | CWE-311 | M9 | 7.5 | Require encrypted storage |  |  |  |  |  |
| [no-unencrypted-local-storage](./docs/rules/no-unencrypted-local-storage.md) | CWE-312 | M9 | 7.5 | Prevent unencrypted local storage |  |  |  |  |  |
| [require-credential-storage](./docs/rules/require-credential-storage.md) | CWE-522 | M10 | 7.5 | Require secure credential storage |  |  |  |  |  |
| [no-exposed-debug-endpoints](./docs/rules/no-exposed-debug-endpoints.md) | CWE-489 | M8 | 7.5 | Prevent exposed debug endpoints |  |  |  |  |  |
### Path & File Security (3 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md) | CWE-22 | A01 | 7.5 | Detect path traversal in fs operations | 💼 |  |  |  |  |
| [no-zip-slip](./docs/rules/no-zip-slip.md) | CWE-22 | A01 | 8.1 | Prevent zip slip vulnerabilities | 💼 |  |  |  |  |
| [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md) | CWE-367 | A01 | 7.0 | Detect time-of-check to time-of-use races | 💼 |  |  | 💡 |  |
### Regex Security (3 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md) | CWE-400 | A03 | 7.5 | Detect ReDoS in RegExp construction |  | ⚠️ |  |  |  |
| [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md) | CWE-1333 | A03 | 7.5 | Detect ReDoS-vulnerable patterns | 💼 |  |  | 💡 |  |
| [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md) | CWE-400 | A03 | 7.5 | Prevent unsafe regex from user input |  | ⚠️ |  | 💡 |  |
### Object & Prototype (2 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [detect-object-injection](./docs/rules/detect-object-injection.md) | CWE-915 | A03 | 7.3 | Detect prototype pollution |  | ⚠️ |  |  |  |
| [no-unsafe-deserialization](./docs/rules/no-unsafe-deserialization.md) | CWE-502 | A08 | 9.8 | Prevent unsafe deserialization | 💼 |  |  |  |  |
### Cryptography (6 rules)

> [!WARNING]
> **5 rules deprecated** — Use [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) (13 rules) and [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) (24 rules) for comprehensive coverage.

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | CWE-798 | A07 | 7.5 | Detect hardcoded passwords/keys | 💼 |  |  |  |  |
| [no-weak-crypto](./docs/rules/no-weak-crypto.md) | CWE-327 | A02 | 7.5 | Detect weak algorithms (MD5, SHA1) | 💼 |  |  |  | 🚫 |
| [no-insufficient-random](./docs/rules/no-insufficient-random.md) | CWE-330 | A02 | 5.3 | Detect Math.random() for security |  | ⚠️ |  |  | 🚫 |
| [no-timing-attack](./docs/rules/no-timing-attack.md) | CWE-208 | A02 | 5.9 | Detect timing attack vulnerabilities | 💼 |  |  |  | 🚫 |
| [no-insecure-comparison](./docs/rules/no-insecure-comparison.md) | CWE-697 | A02 | 5.3 | Detect insecure string comparison |  | ⚠️ | 🔧 |  | 🚫 |
| [no-insecure-jwt](./docs/rules/no-insecure-jwt.md) | CWE-347 | A02 | 7.5 | Detect JWT security issues | 💼 |  |  |  | 🚫 |
### Input Validation & XSS (5 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md) | CWE-20 | A03 | 8.6 | Detect unvalidated user input |  | ⚠️ |  |  |  |
| [no-unsanitized-html](./docs/rules/no-unsanitized-html.md) | CWE-79 | A03 | 6.1 | Detect XSS via innerHTML | 💼 |  |  |  |  |
| [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md) | CWE-79 | A03 | 6.1 | Detect XSS via URL parameters |  | ⚠️ |  |  |  |
| [no-improper-sanitization](./docs/rules/no-improper-sanitization.md) | CWE-116 | A03 | 7.5 | Detect improper output encoding | 💼 |  |  |  |  |
| [no-improper-type-validation](./docs/rules/no-improper-type-validation.md) | CWE-20 | A04 | 5.3 | Detect type confusion vulnerabilities |  | ⚠️ |  |  |  |
### Authentication & Authorization (3 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-missing-authentication](./docs/rules/no-missing-authentication.md) | CWE-306 | A07 | 9.8 | Detect missing auth checks |  | ⚠️ |  |  |  |
| [no-privilege-escalation](./docs/rules/no-privilege-escalation.md) | CWE-269 | A01 | 8.8 | Detect privilege escalation |  | ⚠️ |  |  |  |
| [no-weak-password-recovery](./docs/rules/no-weak-password-recovery.md) | CWE-640 | A07 | 9.8 | Detect insecure password reset | 💼 |  |  |  |  |
### Session & Cookies (3 rules)

> [!WARNING]
> **2 rules deprecated** — Use [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) or [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) for framework-specific cookie/CSRF detection.

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md) | CWE-614 | A07 | 5.3 | Detect missing Secure/HttpOnly |  | ⚠️ |  |  | 🚫 |
| [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md) | CWE-352 | A07 | 8.8 | Detect missing CSRF tokens |  | ⚠️ |  |  | 🚫 |
| [no-document-cookie](./docs/rules/no-document-cookie.md) | CWE-565 | A07 | 4.3 | Detect direct cookie manipulation |  | ⚠️ |  | 💡 |  |
### Network & Headers (5 rules)

> [!WARNING]
> **4 rules deprecated** — Use [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) or [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) for framework-specific CORS/header detection (helmet integration).

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-missing-cors-check](./docs/rules/no-missing-cors-check.md) | CWE-942 | A05 | 7.5 | Detect missing CORS validation |  | ⚠️ |  |  | 🚫 |
| [no-missing-security-headers](./docs/rules/no-missing-security-headers.md) | CWE-693 | A05 | 5.3 | Detect missing security headers |  | ⚠️ |  | 💡 | 🚫 |
| [no-insecure-redirects](./docs/rules/no-insecure-redirects.md) | CWE-601 | A01 | 6.1 | Detect open redirect vulnerabilities |  | ⚠️ |  | 💡 |  |
| [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md) | CWE-319 | A02 | 7.5 | Detect HTTP instead of HTTPS |  | ⚠️ |  |  |  |
| [no-clickjacking](./docs/rules/no-clickjacking.md) | CWE-1021 | A05 | 6.1 | Detect clickjacking vulnerabilities | 💼 |  |  |  | 🚫 |
### Data Exposure (2 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md) | CWE-200 | A01 | 7.5 | Detect sensitive data in responses | 💼 |  |  |  |  |
| [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md) | CWE-532 | A09 | 5.5 | Detect sensitive data in logs |  | ⚠️ |  | 💡 |  |
### Buffer, Memory & DoS (3 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-buffer-overread](./docs/rules/no-buffer-overread.md) | CWE-126 | A06 | 7.5 | Detect buffer over-read | 💼 |  |  |  |  |
| [no-unlimited-resource-allocation](./docs/rules/no-unlimited-resource-allocation.md) | CWE-770 | A05 | 7.5 | Detect unbounded allocations | 💼 |  |  |  |  |
| [no-unchecked-loop-condition](./docs/rules/no-unchecked-loop-condition.md) | CWE-835 | A05 | 7.5 | Detect infinite loop conditions | 💼 |  |  |  |  |
### Platform-Specific (2 rules)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-electron-security-issues](./docs/rules/no-electron-security-issues.md) | CWE-693 | A05 | 8.8 | Detect Electron security misconfig | 💼 |  |  |  |  |
| [no-insufficient-postmessage-validation](./docs/rules/no-insufficient-postmessage-validation.md) | CWE-346 | A07 | 8.8 | Detect postMessage origin issues | 💼 |  |  |  |  |
---

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

| Plugin                                                                                               | Description                                                                | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |  |  |  |  |  |  |  |
## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

```

```
