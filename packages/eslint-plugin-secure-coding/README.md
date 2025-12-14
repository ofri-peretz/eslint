# eslint-plugin-secure-coding

**Feature-based security rules that AI assistants can actually understand and fix.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://www.npmjs.com/package/eslint-plugin-secure-coding)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A comprehensive, feature-based security ESLint plugin with **89 rules** mapped to OWASP Top 10 2021, **OWASP Mobile Top 10 2024**, CWE, and CVSS, featuring LLM-optimized (MCP-ready) messages that guide developers toward secure code in enterprise environments.

---

## 💡 What you get

- **Feature-based coverage:** 89 rules grouped by attack surface (injection, crypto, auth, cookies, headers, mobile security, resource limits, platform specifics).
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + OWASP + CVSS + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Standards aligned:** OWASP Top 10 Web + Mobile, CWE tagging, CVSS scoring in every finding for compliance mapping.
- **Tiered presets:** `recommended`, `strict`, `owasp-top-10` for fast policy rollout.
- **False-positive reduction:** Sanitizer awareness, annotations, ORM patterns, and safe-library detection keep noise low for org rollouts.

Every security rule produces a **structured 2-line error message**:

```bash
src/api.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA]
                    Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
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

### OWASP Top 10 Web 2021

| Category     | Description               | Rules                                                                                                                                                                                 |
| ------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01:2021** | Broken Access Control     | `no-privilege-escalation`, `no-missing-authorization`, `no-zip-slip`, `detect-non-literal-fs-filename`                                                                                |
| **A02:2021** | Cryptographic Failures    | `no-weak-crypto`, `no-http-urls`, `require-https-only`, `no-timing-attack`, `no-insufficient-random`, `no-hardcoded-credentials`                                                      |
| **A03:2021** | Injection                 | `no-sql-injection`, `database-injection`, `detect-eval-with-expression`, `detect-child-process`, `no-xxe-injection`, `no-xpath-injection`, `no-ldap-injection`, `no-unsanitized-html` |
| **A04:2021** | Insecure Design           | `no-improper-type-validation`, `detect-weak-password-validation`                                                                                                                      |
| **A05:2021** | Security Misconfiguration | `no-missing-cors-check`, `no-missing-security-headers`, `no-permissive-cors`, `require-csp-headers`                                                                                   |
| **A06:2021** | Vulnerable Components     | `detect-suspicious-dependencies`, `require-package-lock`, `require-dependency-integrity`                                                                                              |
| **A07:2021** | Auth/Session Failures     | `no-missing-authentication`, `no-insecure-cookie-settings`, `no-missing-csrf-protection`, `no-weak-password-recovery`                                                                 |
| **A08:2021** | Software/Data Integrity   | `no-unsafe-deserialization`, `no-unsafe-dynamic-require`                                                                                                                              |
| **A09:2021** | Security Logging          | `no-sensitive-data-exposure`, `no-pii-in-logs`                                                                                                                                        |
| **A10:2021** | SSRF                      | `no-unvalidated-url-input`, `require-url-validation`                                                                                                                                  |

### OWASP Mobile Top 10 2024

| Category | Description                    | Rules                                                                                                                                            |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M1**   | Improper Credential Usage      | `no-credentials-in-storage-api`, `no-hardcoded-credentials`                                                                                      |
| **M2**   | Inadequate Supply Chain        | `detect-suspicious-dependencies`, `require-package-lock`, `require-dependency-integrity`                                                         |
| **M3**   | Insecure Authentication        | `no-client-side-auth-logic`, `detect-weak-password-validation`                                                                                   |
| **M4**   | Insufficient Input/Output      | `no-unvalidated-deeplinks`, `require-mime-type-validation`, `require-url-validation`, `no-arbitrary-file-access`                                 |
| **M5**   | Insecure Communication         | `no-allow-arbitrary-loads`, `no-http-urls`, `require-https-only`, `no-disabled-certificate-validation`                                           |
| **M6**   | Inadequate Privacy             | `no-pii-in-logs`, `no-tracking-without-consent`, `no-sensitive-data-in-analytics`, `require-data-minimization`                                   |
| **M7**   | Insufficient Binary Protection | `no-debug-code-in-production`, `require-code-minification`                                                                                       |
| **M8**   | Security Misconfiguration      | `no-verbose-error-messages`, `require-secure-defaults`                                                                                           |
| **M9**   | Insecure Data Storage          | `no-sensitive-data-in-cache`, `no-data-in-temp-storage`, `require-secure-deletion`, `require-storage-encryption`, `no-unencrypted-local-storage` |
| **M10**  | Insufficient Crypto            | `no-weak-crypto`, `require-credential-storage`                                                                                                   |

---

## 🔐 89 Security Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

### Injection Prevention (11 rules)

| Rule                                                                       | CWE     | OWASP | CVSS | Description                                     | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | ----- | ---- | ----------------------------------------------- | --- | --- | --- | --- |
| [no-sql-injection](./docs/rules/no-sql-injection.md)                       | CWE-89  | A03   | 9.8  | Prevent SQL injection via string concatenation  | 💼  |     |     |     |
| [database-injection](./docs/rules/database-injection.md)                   | CWE-89  | A03   | 9.8  | Comprehensive SQL/NoSQL/ORM injection detection | 💼  |     |     |     |
| [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md) | CWE-95  | A03   | 9.8  | Detect eval() with dynamic expressions          | 💼  |     |     |     |
| [detect-child-process](./docs/rules/detect-child-process.md)               | CWE-78  | A03   | 9.8  | Detect command injection in child_process       | 💼  |     |     |     |
| [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md)     | CWE-95  | A03   | 7.5  | Forbid dynamic require() calls                  | 💼  |     |     |     |
| [no-graphql-injection](./docs/rules/no-graphql-injection.md)               | CWE-943 | A03   | 8.6  | Prevent GraphQL injection attacks               | 💼  |     |     |     |
| [no-xxe-injection](./docs/rules/no-xxe-injection.md)                       | CWE-611 | A03   | 9.1  | Prevent XML External Entity injection           | 💼  |     |     |     |
| [no-xpath-injection](./docs/rules/no-xpath-injection.md)                   | CWE-643 | A03   | 9.8  | Prevent XPath injection attacks                 | 💼  |     |     |     |
| [no-ldap-injection](./docs/rules/no-ldap-injection.md)                     | CWE-90  | A03   | 9.8  | Prevent LDAP injection attacks                  | 💼  |     |     |     |
| [no-directive-injection](./docs/rules/no-directive-injection.md)           | CWE-94  | A03   | 8.8  | Prevent template directive injection            | 💼  |     |     |     |
| [no-format-string-injection](./docs/rules/no-format-string-injection.md)   | CWE-134 | A03   | 9.8  | Prevent format string vulnerabilities           | 💼  |     |     |     |

### Mobile Security (30 rules)

| Rule                                 | CWE     | OWASP Mobile | Description                         |
| ------------------------------------ | ------- | ------------ | ----------------------------------- |
| `no-http-urls`                       | CWE-319 | M5           | Prevent insecure HTTP URLs          |
| `no-hardcoded-credentials`           | CWE-798 | M1           | Detect hardcoded secrets            |
| `no-credentials-in-storage-api`      | CWE-522 | M1           | Prevent credentials in localStorage |
| `no-credentials-in-query-params`     | CWE-598 | M1           | Detect credentials in URLs          |
| `no-allow-arbitrary-loads`           | CWE-295 | M5           | Prevent insecure ATS configuration  |
| `no-disabled-certificate-validation` | CWE-295 | M5           | Detect disabled cert validation     |
| `require-https-only`                 | CWE-319 | M5           | Enforce HTTPS-only connections      |
| `require-network-timeout`            | CWE-400 | M5           | Require network timeouts            |
| `detect-weak-password-validation`    | CWE-521 | M3           | Detect weak password requirements   |
| `no-client-side-auth-logic`          | CWE-602 | M3           | Prevent client-side auth            |
| `no-hardcoded-session-tokens`        | CWE-798 | M3           | Detect hardcoded session tokens     |
| `no-unvalidated-deeplinks`           | CWE-939 | M4           | Require deeplink validation         |
| `require-url-validation`             | CWE-601 | M4           | Require URL validation              |
| `require-mime-type-validation`       | CWE-434 | M4           | Require MIME type validation        |
| `no-arbitrary-file-access`           | CWE-22  | M4           | Prevent path traversal              |
| `no-pii-in-logs`                     | CWE-532 | M6           | Prevent PII in logs                 |
| `no-tracking-without-consent`        | CWE-359 | M6           | Require tracking consent            |
| `no-sensitive-data-in-analytics`     | CWE-359 | M6           | Prevent PII in analytics            |
| `require-data-minimization`          | CWE-213 | M6           | Identify excessive data collection  |
| `no-debug-code-in-production`        | CWE-489 | M7           | Detect debug code                   |
| `require-code-minification`          | CWE-656 | M7           | Require minification config         |
| `no-verbose-error-messages`          | CWE-209 | M8           | Prevent stack trace exposure        |
| `require-secure-defaults`            | CWE-276 | M8           | Require secure default configs      |
| `no-sensitive-data-in-cache`         | CWE-524 | M9           | Prevent sensitive cache data        |
| `no-data-in-temp-storage`            | CWE-312 | M9           | Prevent sensitive temp data         |
| `require-secure-deletion`            | CWE-459 | M9           | Require secure data deletion        |
| `require-storage-encryption`         | CWE-311 | M9           | Require encrypted storage           |
| `no-unencrypted-local-storage`       | CWE-312 | M9           | Prevent unencrypted local storage   |
| `require-credential-storage`         | CWE-522 | M10          | Require secure credential storage   |
| `no-exposed-debug-endpoints`         | CWE-489 | M8           | Prevent exposed debug endpoints     |

### Path & File Security (3 rules)

| Rule                                                                             | CWE     | OWASP | CVSS | Description                               | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------------- | ------- | ----- | ---- | ----------------------------------------- | --- | --- | --- | --- |
| [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md) | CWE-22  | A01   | 7.5  | Detect path traversal in fs operations    | 💼  |     |     |     |
| [no-zip-slip](./docs/rules/no-zip-slip.md)                                       | CWE-22  | A01   | 8.1  | Prevent zip slip vulnerabilities          | 💼  |     |     |     |
| [no-toctou-vulnerability](./docs/rules/no-toctou-vulnerability.md)               | CWE-367 | A01   | 7.0  | Detect time-of-check to time-of-use races | 💼  |     |     | 💡  |

### Regex Security (3 rules)

| Rule                                                                         | CWE      | OWASP | CVSS | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------------- | -------- | ----- | ---- | ------------------------------------ | --- | --- | --- | --- |
| [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md)       | CWE-400  | A03   | 7.5  | Detect ReDoS in RegExp construction  |     | ⚠️  |     |     |
| [no-redos-vulnerable-regex](./docs/rules/no-redos-vulnerable-regex.md)       | CWE-1333 | A03   | 7.5  | Detect ReDoS-vulnerable patterns     | 💼  |     |     | 💡  |
| [no-unsafe-regex-construction](./docs/rules/no-unsafe-regex-construction.md) | CWE-400  | A03   | 7.5  | Prevent unsafe regex from user input |     | ⚠️  |     | 💡  |

### Object & Prototype (2 rules)

| Rule                                                                   | CWE     | OWASP | CVSS | Description                    | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------ | --- | --- | --- | --- |
| [detect-object-injection](./docs/rules/detect-object-injection.md)     | CWE-915 | A03   | 7.3  | Detect prototype pollution     |     | ⚠️  |     |     |
| [no-unsafe-deserialization](./docs/rules/no-unsafe-deserialization.md) | CWE-502 | A08   | 9.8  | Prevent unsafe deserialization | 💼  |     |     |     |

### Cryptography (6 rules)

| Rule                                                                 | CWE     | OWASP | CVSS | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------------ | --- | --- | --- | --- |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | CWE-798 | A07   | 7.5  | Detect hardcoded passwords/keys      | 💼  |     |     |     |
| [no-weak-crypto](./docs/rules/no-weak-crypto.md)                     | CWE-327 | A02   | 7.5  | Detect weak algorithms (MD5, SHA1)   | 💼  |     |     |     |
| [no-insufficient-random](./docs/rules/no-insufficient-random.md)     | CWE-330 | A02   | 5.3  | Detect Math.random() for security    |     | ⚠️  |     |     |
| [no-timing-attack](./docs/rules/no-timing-attack.md)                 | CWE-208 | A02   | 5.9  | Detect timing attack vulnerabilities | 💼  |     |     |     |
| [no-insecure-comparison](./docs/rules/no-insecure-comparison.md)     | CWE-697 | A02   | 5.3  | Detect insecure string comparison    |     | ⚠️  | 🔧  |     |
| [no-insecure-jwt](./docs/rules/no-insecure-jwt.md)                   | CWE-347 | A02   | 7.5  | Detect JWT security issues           | 💼  |     |     |     |

### Input Validation & XSS (5 rules)

| Rule                                                                       | CWE     | OWASP | CVSS | Description                           | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------------- | --- | --- | --- | --- |
| [no-unvalidated-user-input](./docs/rules/no-unvalidated-user-input.md)     | CWE-20  | A03   | 8.6  | Detect unvalidated user input         |     | ⚠️  |     |     |
| [no-unsanitized-html](./docs/rules/no-unsanitized-html.md)                 | CWE-79  | A03   | 6.1  | Detect XSS via innerHTML              | 💼  |     |     |     |
| [no-unescaped-url-parameter](./docs/rules/no-unescaped-url-parameter.md)   | CWE-79  | A03   | 6.1  | Detect XSS via URL parameters         |     | ⚠️  |     |     |
| [no-improper-sanitization](./docs/rules/no-improper-sanitization.md)       | CWE-116 | A03   | 7.5  | Detect improper output encoding       | 💼  |     |     |     |
| [no-improper-type-validation](./docs/rules/no-improper-type-validation.md) | CWE-20  | A04   | 5.3  | Detect type confusion vulnerabilities |     | ⚠️  |     |     |

### Authentication & Authorization (3 rules)

| Rule                                                                   | CWE     | OWASP | CVSS | Description                    | 💼  | ⚠️  | 🔧  | 💡  |
| ---------------------------------------------------------------------- | ------- | ----- | ---- | ------------------------------ | --- | --- | --- | --- |
| [no-missing-authentication](./docs/rules/no-missing-authentication.md) | CWE-306 | A07   | 9.8  | Detect missing auth checks     |     | ⚠️  |     |     |
| [no-privilege-escalation](./docs/rules/no-privilege-escalation.md)     | CWE-269 | A01   | 8.8  | Detect privilege escalation    |     | ⚠️  |     |     |
| [no-weak-password-recovery](./docs/rules/no-weak-password-recovery.md) | CWE-640 | A07   | 9.8  | Detect insecure password reset | 💼  |     |     |     |

### Session & Cookies (3 rules)

| Rule                                                                       | CWE     | OWASP | CVSS | Description                       | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | ----- | ---- | --------------------------------- | --- | --- | --- | --- |
| [no-insecure-cookie-settings](./docs/rules/no-insecure-cookie-settings.md) | CWE-614 | A07   | 5.3  | Detect missing Secure/HttpOnly    |     | ⚠️  |     |     |
| [no-missing-csrf-protection](./docs/rules/no-missing-csrf-protection.md)   | CWE-352 | A07   | 8.8  | Detect missing CSRF tokens        |     | ⚠️  |     |     |
| [no-document-cookie](./docs/rules/no-document-cookie.md)                   | CWE-565 | A07   | 4.3  | Detect direct cookie manipulation |     | ⚠️  |     | 💡  |

### Network & Headers (5 rules)

| Rule                                                                       | CWE      | OWASP | CVSS | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | -------- | ----- | ---- | ------------------------------------ | --- | --- | --- | --- |
| [no-missing-cors-check](./docs/rules/no-missing-cors-check.md)             | CWE-942  | A05   | 7.5  | Detect missing CORS validation       |     | ⚠️  |     |     |
| [no-missing-security-headers](./docs/rules/no-missing-security-headers.md) | CWE-693  | A05   | 5.3  | Detect missing security headers      |     | ⚠️  |     | 💡  |
| [no-insecure-redirects](./docs/rules/no-insecure-redirects.md)             | CWE-601  | A01   | 6.1  | Detect open redirect vulnerabilities |     | ⚠️  |     | 💡  |
| [no-unencrypted-transmission](./docs/rules/no-unencrypted-transmission.md) | CWE-319  | A02   | 7.5  | Detect HTTP instead of HTTPS         |     | ⚠️  |     |     |
| [no-clickjacking](./docs/rules/no-clickjacking.md)                         | CWE-1021 | A05   | 6.1  | Detect clickjacking vulnerabilities  | 💼  |     |     |     |

### Data Exposure (2 rules)

| Rule                                                                     | CWE     | OWASP | CVSS | Description                        | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------ | ------- | ----- | ---- | ---------------------------------- | --- | --- | --- | --- |
| [no-exposed-sensitive-data](./docs/rules/no-exposed-sensitive-data.md)   | CWE-200 | A01   | 7.5  | Detect sensitive data in responses | 💼  |     |     |     |
| [no-sensitive-data-exposure](./docs/rules/no-sensitive-data-exposure.md) | CWE-532 | A09   | 5.5  | Detect sensitive data in logs      |     | ⚠️  |     | 💡  |

### Buffer, Memory & DoS (3 rules)

| Rule                                                                                 | CWE     | OWASP | CVSS | Description                     | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------------ | ------- | ----- | ---- | ------------------------------- | --- | --- | --- | --- |
| [no-buffer-overread](./docs/rules/no-buffer-overread.md)                             | CWE-126 | A06   | 7.5  | Detect buffer over-read         | 💼  |     |     |     |
| [no-unlimited-resource-allocation](./docs/rules/no-unlimited-resource-allocation.md) | CWE-770 | A05   | 7.5  | Detect unbounded allocations    | 💼  |     |     |     |
| [no-unchecked-loop-condition](./docs/rules/no-unchecked-loop-condition.md)           | CWE-835 | A05   | 7.5  | Detect infinite loop conditions | 💼  |     |     |     |

### Platform-Specific (2 rules)

| Rule                                                                                             | CWE     | OWASP | CVSS | Description                        | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------------------------ | ------- | ----- | ---- | ---------------------------------- | --- | --- | --- | --- |
| [no-electron-security-issues](./docs/rules/no-electron-security-issues.md)                       | CWE-693 | A05   | 8.8  | Detect Electron security misconfig | 💼  |     |     |     |
| [no-insufficient-postmessage-validation](./docs/rules/no-insufficient-postmessage-validation.md) | CWE-346 | A07   | 8.8  | Detect postMessage origin issues   | 💼  |     |     |     |

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

| Preset             | Description                                           |
| ------------------ | ----------------------------------------------------- |
| **`recommended`**  | Balanced security for most projects (89 rules, mixed) |
| **`strict`**       | Maximum security enforcement (all rules as errors)    |
| **`owasp-top-10`** | OWASP Top 10 2021 compliance focused                  |

---

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)** - Complete list of all 89 rules with configuration options

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
    files: ['apps/**'],
    ...secureCoding.configs['owasp-top-10'],
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

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
