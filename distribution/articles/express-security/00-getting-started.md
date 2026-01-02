---
title: 'Getting Started with eslint-plugin-express-security'
published: true
description: 'Express.js security in 60 seconds. 9 rules for CORS, cookies, rate limiting, and middleware security.'
tags: express, eslint, security, nodejs
cover_image:
series: Getting Started
---

**9 Express security rules. CORS, cookies, rate limiting, Helmet.**

> This plugin is for **Node.js teams** building web applications with [Express.js](https://expressjs.com/).

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

| Rule                                                                                                                                                                               | CWE      | What it catches          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------ |
| [`require-helmet`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-helmet.md)                                           | CWE-693  | Missing security headers |
| [`no-cors-credentials-wildcard`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-cors-credentials-wildcard.md)               | CWE-346  | CORS \* + credentials    |
| [`no-permissive-cors`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-permissive-cors.md)                                   | CWE-942  | Overly permissive CORS   |
| [`no-insecure-cookie-options`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-insecure-cookie-options.md)                   | CWE-614  | Missing cookie flags     |
| [`require-csrf-protection`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-csrf-protection.md)                         | CWE-352  | No CSRF protection       |
| [`require-rate-limiting`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-rate-limiting.md)                             | CWE-307  | No rate limiting         |
| [`require-express-body-parser-limits`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-express-body-parser-limits.md)   | CWE-400  | Unlimited body size      |
| [`no-express-unsafe-regex-route`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-express-unsafe-regex-route.md)             | CWE-1333 | ReDoS in routes          |
| [`no-graphql-introspection-production`](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-graphql-introspection-production.md) | CWE-200  | Schema exposed           |

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/app.ts
  15:1  error  🔒 CWE-693 | Missing Helmet middleware
               Fix: Add app.use(helmet()) before routes

src/routes/api.ts
  8:1   error  🔒 CWE-346 | CORS with credentials and wildcard origin
               Fix: Specify explicit origin when using credentials

src/middleware/auth.ts
  22:3  error  🔒 CWE-614 | Cookie missing secure/httpOnly flags
               Fix: Add { secure: true, httpOnly: true, sameSite: 'strict' }
```

## Quick Wins

### Security Headers

```javascript
// ❌ Missing security headers
const app = express();
app.use(cors());

// ✅ Safe: Helmet adds security headers
import helmet from 'helmet';
const app = express();
app.use(helmet());
app.use(cors({ origin: 'https://app.example.com' }));
```

### Cookie Security

```javascript
// ❌ Insecure cookie
res.cookie('session', token);

// ✅ Safe: All security flags
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000,
});
```

## Custom Configuration

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  expressSecurity.configs.recommended,
  {
    rules: {
      // Override severity
      'express-security/require-rate-limiting': 'warn',

      // Configure with options
      'express-security/require-express-body-parser-limits': [
        'error',
        {
          maxBodySize: '1mb',
        },
      ],
    },
  },
];
```

## Strongly-Typed Options (TypeScript)

```typescript
// eslint.config.ts
import expressSecurity, {
  type RuleOptions,
} from 'eslint-plugin-express-security';

const corsOptions: RuleOptions['no-permissive-cors'] = {
  allowedOrigins: ['https://app.example.com'],
};

export default [
  expressSecurity.configs.recommended,
  {
    rules: {
      'express-security/no-permissive-cors': ['error', corsOptions],
    },
  },
];
```

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

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
