---
title: 'Getting Started with eslint-plugin-express-security'
published: false
description: 'Express.js security in 60 seconds. 9 rules for CORS, cookies, rate limiting, and middleware security.'
tags: express, nodejs, security, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-express-security

**9 Express security rules. CORS, cookies, rate limiting, Helmet.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-express-security
```

## Flat Config

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [expressSecurity.configs.recommended];
```

## Rule Overview

| Rule                                  | CWE      | What it catches          |
| ------------------------------------- | -------- | ------------------------ |
| `require-helmet`                      | CWE-693  | Missing security headers |
| `no-cors-credentials-wildcard`        | CWE-346  | CORS \* + credentials    |
| `no-permissive-cors`                  | CWE-942  | Overly permissive CORS   |
| `no-insecure-cookie-options`          | CWE-614  | Missing cookie flags     |
| `require-csrf-protection`             | CWE-352  | No CSRF protection       |
| `require-rate-limiting`               | CWE-307  | No rate limiting         |
| `require-express-body-parser-limits`  | CWE-400  | Unlimited body size      |
| `no-express-unsafe-regex-route`       | CWE-1333 | ReDoS in routes          |
| `no-graphql-introspection-production` | CWE-200  | Schema exposed           |

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-express-security

# Config (eslint.config.js)
import expressSecurity from 'eslint-plugin-express-security';
export default [expressSecurity.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-express-security](https://www.npmjs.com/package/eslint-plugin-express-security)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-express-security/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Running Express? Try the linter!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
