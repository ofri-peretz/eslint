---
title: 'Hardcoded Secrets: The #1 Vulnerability AI Agents Can Auto-Fix'
published: true
canonical_url: https://dev.to/ofri-peretz/hardcoded-secrets-the-1-vulnerability-ai-agents-can-auto-fix-47cg
description: 'Learn why hardcoded credentials remain the most common security vulnerability and how ESLint can catch and fix them automatically.'
tags: javascript, security, eslint, devops
cover_image:
canonical_url:
---

Every week, secrets leak. API keys committed to GitHub. Database passwords in config files. AWS credentials in environment variable defaults.

**The fix is trivial. The detection is not.**

Until now.

## The Problem

```javascript
// ❌ This ships to production more than you'd think
const db = new Pool({
  host: 'prod-db.example.com',
  user: 'admin',
  password: 'super_secret_password_123', // CWE-798
});

const stripe = new Stripe('sk_live_abc123xyz789'); // Hardcoded API key
```

These patterns are obvious in isolation. In a 50,000-line codebase? They hide in plain sight.

## Why Traditional Tools Fail

| Tool                    | Problem                      |
| ----------------------- | ---------------------------- |
| **grep for "password"** | Too many false positives     |
| **Secret scanners**     | Only catch committed secrets |
| **Code review**         | Humans miss things           |

## The ESLint Solution

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [secureCoding.configs.recommended];
```

Now run `npx eslint .` and get:

```bash
src/db.ts
  5:3  error  🔒 CWE-798 OWASP:A02 CVSS:7.5 | Hardcoded credential detected
              Fix: Use environment variable: process.env.DATABASE_PASSWORD
```

## The Fixed Code

```javascript
// ✅ Secure pattern
const db = new Pool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

## Why AI Agents Love This Rule

The error message is structured for AI consumption:

- **CWE-798**: Machine-readable vulnerability ID
- **Fix instruction**: Exact pattern to apply
- **Location**: Precise line and column

Cursor, Copilot, and Claude can read this and auto-fix without human intervention.

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

**That's it.** One line of config. 75 security rules. Zero hardcoded secrets.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-hardcoded-credentials](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-hardcoded-credentials.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)