---
title: 'Mapping Your Codebase to OWASP Top 10'
published: false
description: "Use ESLint to automatically verify OWASP Top 10 coverage. Here's the complete mapping."
tags: security, owasp, eslint, devsecops
cover_image:
canonical_url:
---

# Mapping Your Codebase to OWASP Top 10

Your security audit asks: "How do you address OWASP Top 10?"

Here's how to answer with automated evidence.

## OWASP Top 10 2021 + ESLint Rules

| #   | Category                  | Risk     | ESLint Rules                                                              |
| --- | ------------------------- | -------- | ------------------------------------------------------------------------- |
| A01 | Broken Access Control     | High     | `no-privilege-escalation`, `no-missing-authorization`, `no-zip-slip`      |
| A02 | Cryptographic Failures    | High     | `no-weak-crypto`, `no-hardcoded-credentials`, `no-http-urls`              |
| A03 | Injection                 | Critical | `detect-eval-with-expression`, `detect-child-process`, `no-sql-injection` |
| A04 | Insecure Design           | Medium   | `no-improper-type-validation`, `detect-weak-password-validation`          |
| A05 | Security Misconfiguration | High     | `no-missing-cors-check`, `no-missing-security-headers`                    |
| A06 | Vulnerable Components     | Medium   | `detect-suspicious-dependencies`, `require-package-lock`                  |
| A07 | Auth Failures             | High     | `no-missing-authentication`, `no-insecure-cookie-settings`                |
| A08 | Integrity Failures        | Medium   | `no-unsafe-deserialization`, `no-unsafe-dynamic-require`                  |
| A09 | Logging Failures          | Medium   | `no-sensitive-data-exposure`, `no-pii-in-logs`                            |
| A10 | SSRF                      | High     | `no-unvalidated-url-input`, `require-url-validation`                      |

## The OWASP Preset

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs['owasp-top-10']];
```

One line. Full OWASP Top 10 coverage.

## Getting Audit Evidence

Run ESLint with JSON output:

```bash
npx eslint . --format json > security-report.json
```

Parse for OWASP tags:

```javascript
const report = require('./security-report.json');

const owaspFindings = report
  .flatMap((file) => file.messages)
  .filter((msg) => msg.message.includes('OWASP:'));

console.log(`Total OWASP findings: ${owaspFindings.length}`);
```

## Example Output

```bash
src/api.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | SQL Injection detected
                Fix: Use parameterized query

src/auth.ts
  18:3   error  🔒 CWE-614 OWASP:A07-Auth CVSS:5.3 | Insecure cookie settings
                Fix: Add { httpOnly: true, secure: true, sameSite: 'strict' }
```

## For OWASP Mobile Top 10

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    files: ['apps/mobile/**'],
    ...secureCoding.configs['owasp-mobile-top-10'],
  },
];
```

Covers all 10 mobile categories:

- M1: Improper Credential Usage
- M2: Inadequate Supply Chain
- M3: Insecure Auth
- M4: Insufficient I/O Validation
- M5: Insecure Communication
- M6: Inadequate Privacy
- M7: Binary Protection
- M8: Security Misconfiguration
- M9: Insecure Data Storage
- M10: Insufficient Crypto

## CI Badge

Add to your README:

```markdown
[![OWASP Top 10](https://img.shields.io/badge/OWASP-Top%2010%20Covered-success)]
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs['owasp-top-10']];
```

Turn compliance questions into automated answers.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [OWASP Coverage Matrix](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-secure-coding#owasp-coverage-matrix)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
