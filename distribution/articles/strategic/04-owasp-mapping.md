---
title: 'Mapping Your Codebase to OWASP Top 10 with 247 ESLint Rules'
published: true
description: 'Use ESLint to automatically verify OWASP Top 10 coverage. Complete mapping across 10 specialized security plugins.'
tags: security, owasp, eslint, devsecops
cover_image:
canonical_url:
---

Your security audit asks: "How do you address OWASP Top 10?"

Here's how to answer with **automated evidence** using 247 rules across 10 specialized ESLint plugins.

## The Multi-Plugin Approach

One plugin can't cover everything. SQL injection needs database-aware rules. JWT attacks need token-specific detection. Here's the complete mapping:

## OWASP Top 10 2021 → Plugin Coverage

| #   | Category                  | Risk     | Plugins                                                  | Key Rules                                                                     |
| --- | ------------------------- | -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| A01 | Broken Access Control     | High     | `secure-coding`, `nestjs-security`, `lambda-security`    | `no-privilege-escalation`, `require-guards`, `no-missing-authorization-check` |
| A02 | Cryptographic Failures    | High     | `crypto`, `pg`, `jwt`                                    | `no-weak-hash-algorithm`, `no-hardcoded-credentials`, `no-weak-secret`        |
| A03 | Injection                 | Critical | `secure-coding`, `pg`, `browser-security`                | `detect-eval-with-expression`, `no-unsafe-query`, `no-innerhtml`              |
| A04 | Insecure Design           | Medium   | `secure-coding`, `nestjs-security`                       | `no-improper-type-validation`, `no-missing-validation-pipe`                   |
| A05 | Security Misconfiguration | High     | `express-security`, `lambda-security`                    | `require-helmet`, `no-permissive-cors`, `no-exposed-error-details`            |
| A06 | Vulnerable Components     | Medium   | `secure-coding`, `import-next`                           | `detect-suspicious-dependencies`, `no-extraneous-dependencies`                |
| A07 | Auth Failures             | High     | `jwt`, `express-security`                                | `no-algorithm-none`, `no-algorithm-confusion`, `no-insecure-cookie-options`   |
| A08 | Integrity Failures        | Medium   | `secure-coding`                                          | `no-unsafe-deserialization`, `no-unsafe-dynamic-require`                      |
| A09 | Logging Failures          | Medium   | `secure-coding`, `lambda-security`                       | `no-pii-in-logs`, `no-error-swallowing`                                       |
| A10 | SSRF                      | High     | `secure-coding`, `lambda-security`, `vercel-ai-security` | `require-url-validation`, `no-user-controlled-requests`                       |

## Quick Install: Full OWASP Coverage

```bash
# Core Security (75 rules)
npm install -D eslint-plugin-secure-coding

# Specialized Security
npm install -D eslint-plugin-crypto         # 24 crypto rules
npm install -D eslint-plugin-jwt            # 13 JWT rules
npm install -D eslint-plugin-pg             # 13 PostgreSQL rules

# Browser Security
npm install -D eslint-plugin-browser-security  # 21 DOM/XSS rules

# Framework-Specific (choose yours)
npm install -D eslint-plugin-express-security  # Express.js
npm install -D eslint-plugin-nestjs-security   # NestJS
npm install -D eslint-plugin-lambda-security   # AWS Lambda
```

## The Complete Config

```javascript
// eslint.config.js - Full OWASP Top 10 Coverage
import secureCoding from 'eslint-plugin-secure-coding';
import crypto from 'eslint-plugin-crypto';
import jwt from 'eslint-plugin-jwt';
import pg from 'eslint-plugin-pg';
import browserSecurity from 'eslint-plugin-browser-security';
import expressSecurity from 'eslint-plugin-express-security';

export default [
  // Core OWASP preset (A01-A10 general coverage)
  secureCoding.configs['owasp-top-10'],

  // A02: Cryptographic Failures - specialized detection
  crypto.configs.recommended,

  // A07: Authentication Failures - JWT-specific
  jwt.configs.recommended,

  // A03: Injection - PostgreSQL-specific SQL injection
  {
    files: ['**/db/**', '**/repositories/**', '**/models/**'],
    ...pg.configs.recommended,
  },

  // A03: Injection - DOM XSS for frontend
  {
    files: ['**/components/**', '**/pages/**', 'src/**/*.tsx'],
    ...browserSecurity.configs.recommended,
  },

  // A05: Security Misconfiguration - Express-specific
  {
    files: ['**/routes/**', '**/middleware/**', 'app.ts', 'server.ts'],
    ...expressSecurity.configs.recommended,
  },
];
```

## Example Output

```bash
src/db/users.ts
  42:15  error  🔒 CWE-89 OWASP:A03 | SQL Injection detected
                [pg/no-unsafe-query] Use parameterized query: client.query($1, [id])

src/auth/jwt.ts
  18:3   error  🔒 CWE-347 OWASP:A07 | Algorithm confusion vulnerability
                [jwt/no-algorithm-confusion] Specify algorithms: { algorithms: ['RS256'] }

src/api/crypto.ts
  55:10  error  🔒 CWE-328 OWASP:A02 | Weak hash algorithm: MD5
                [crypto/no-weak-hash-algorithm] Use SHA-256 or SHA-3

src/components/Comment.tsx
  12:5   error  🔒 CWE-79 OWASP:A03 | XSS via innerHTML
                [browser-security/no-innerhtml] Use textContent or sanitize with DOMPurify
```

## A03 Injection: Multi-Layer Protection

Injection is #1 for a reason. Here's complete coverage:

| Attack Vector              | Plugin               | Rule                          |
| -------------------------- | -------------------- | ----------------------------- |
| SQL Injection (PostgreSQL) | `pg`                 | `no-unsafe-query`             |
| SQL Injection (general)    | `secure-coding`      | `detect-eval-with-expression` |
| Command Injection          | `secure-coding`      | `detect-child-process`        |
| LDAP Injection             | `secure-coding`      | `no-ldap-injection`           |
| XPath Injection            | `secure-coding`      | `no-xpath-injection`          |
| XXE Injection              | `secure-coding`      | `no-xxe-injection`            |
| DOM XSS                    | `browser-security`   | `no-innerhtml`, `no-eval`     |
| Prompt Injection           | `vercel-ai-security` | `require-validated-prompt`    |

## A02 Cryptographic Failures: 24 Specialized Rules

```javascript
// crypto plugin catches what generic plugins miss
import crypto from 'eslint-plugin-crypto';

// Detects:
// - CVE-2023-46809 (Marvin Attack) via no-insecure-rsa-padding
// - CVE-2020-36732 (CryptoJS) via no-cryptojs-weak-random
// - Weak algorithms: MD5, SHA1, DES, RC4, Blowfish
// - Static IVs, ECB mode, predictable salts
```

## A07 Auth Failures: JWT-Specific Detection

```javascript
// jwt plugin catches token-specific vulnerabilities
import jwt from 'eslint-plugin-jwt';

// Detects:
// - Algorithm "none" attack
// - Algorithm confusion (CVE-2022-23540)
// - jwt.decode() without verify
// - Weak/hardcoded secrets
// - Missing expiration
```

## For OWASP Mobile Top 10

```javascript
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  {
    files: ['apps/mobile/**', '**/*.native.ts'],
    ...secureCoding.configs['owasp-mobile-top-10'],
  },
];
```

Covers all 10 mobile categories:

| #   | Category                    | Rules                                                            |
| --- | --------------------------- | ---------------------------------------------------------------- |
| M1  | Improper Credential Usage   | `require-secure-credential-storage`                              |
| M2  | Inadequate Supply Chain     | `detect-suspicious-dependencies`, `require-package-lock`         |
| M3  | Insecure Auth               | `no-client-side-auth-logic`, `require-backend-authorization`     |
| M4  | Insufficient I/O Validation | `no-unvalidated-user-input`, `no-unvalidated-deeplinks`          |
| M5  | Insecure Communication      | `no-http-urls`, `require-https-only`, `no-allow-arbitrary-loads` |
| M6  | Inadequate Privacy          | `no-pii-in-logs`, `no-tracking-without-consent`                  |
| M7  | Binary Protection           | `require-code-minification`                                      |
| M8  | Security Misconfiguration   | `require-secure-defaults`, `no-verbose-error-messages`           |
| M9  | Insecure Data Storage       | `require-storage-encryption`, `no-data-in-temp-storage`          |
| M10 | Insufficient Crypto         | Use `eslint-plugin-crypto`                                       |

## For OWASP LLM Top 10

Building AI applications? Add the Vercel AI Security plugin:

```javascript
import vercelAI from 'eslint-plugin-vercel-ai-security';

export default [
  {
    files: ['**/ai/**', '**/agents/**'],
    ...vercelAI.configs.recommended,
  },
];
```

**100% OWASP LLM Top 10 2024 coverage** with 19 rules.

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

// Group by OWASP category
const byCategory = owaspFindings.reduce((acc, finding) => {
  const match = finding.message.match(/OWASP:(A\d+)/);
  if (match) {
    acc[match[1]] = (acc[match[1]] || 0) + 1;
  }
  return acc;
}, {});

console.log('OWASP Coverage Report:', byCategory);
```

## Rule Count Summary

| Plugin                             | Rules   | Focus               |
| ---------------------------------- | ------- | ------------------- |
| `eslint-plugin-secure-coding`      | 75      | Core OWASP coverage |
| `eslint-plugin-crypto`             | 24      | Cryptography        |
| `eslint-plugin-jwt`                | 13      | JWT/Authentication  |
| `eslint-plugin-pg`                 | 13      | PostgreSQL          |
| `eslint-plugin-browser-security`   | 21      | Browser/DOM         |
| `eslint-plugin-vercel-ai-security` | 19      | AI/LLM              |
| `eslint-plugin-express-security`   | 9       | Express.js          |
| `eslint-plugin-lambda-security`    | 13      | AWS Lambda          |
| `eslint-plugin-nestjs-security`    | 5       | NestJS              |
| `eslint-plugin-import-next`        | 55      | Import/Dependencies |
| **Total**                          | **247** |                     |

Turn compliance questions into automated answers.

---

📦 **All Plugins:**

- [eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding) — Core OWASP coverage
- [eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto) — Cryptography
- [eslint-plugin-jwt](https://www.npmjs.com/package/eslint-plugin-jwt) — JWT security
- [eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg) — PostgreSQL
- [eslint-plugin-browser-security](https://www.npmjs.com/package/eslint-plugin-browser-security) — Browser/DOM
- [eslint-plugin-vercel-ai-security](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) — AI/LLM
- [eslint-plugin-express-security](https://www.npmjs.com/package/eslint-plugin-express-security) — Express.js
- [eslint-plugin-lambda-security](https://www.npmjs.com/package/eslint-plugin-lambda-security) — AWS Lambda
- [eslint-plugin-nestjs-security](https://www.npmjs.com/package/eslint-plugin-nestjs-security) — NestJS
- [eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next) — Import management

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub — 10 plugins, 247 rules
{% endcta %}

---

🚀 **What's your biggest OWASP compliance gap? Drop a comment!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)