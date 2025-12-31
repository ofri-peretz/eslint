---
title: 'CORS Misconfiguration: The Credentials + Wildcard Trap'
published: false
description: 'CORS with credentials and wildcard origin is a critical vulnerability. Here is why and how to fix it.'
tags: security, cors, nodejs, eslint
cover_image:
series: Express Security
---

# CORS Misconfiguration: The Credentials + Wildcard Trap

```javascript
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
```

This configuration is **impossible** and **dangerous**.

## Why This Breaks

Browsers block this by design:

```
Access to fetch at 'https://api.example.com' from origin 'https://evil.com'
has been blocked by CORS policy: Credential is not supported if the CORS
header 'Access-Control-Allow-Origin' is '*'.
```

**The browser is protecting you.** But your server is still misconfigured.

## The Security Issue

If browsers DID allow this:

1. Any website could make authenticated requests to your API
2. User sessions would be sent to attacker sites
3. Your API would trust all cross-origin requests

```javascript
// Attacker's site:
fetch('https://api.bank.com/transfer', {
  method: 'POST',
  credentials: 'include', // Sends victim's cookies!
  body: JSON.stringify({ to: 'attacker', amount: 10000 }),
});
```

## CORS Patterns

### Pattern 1: Public API (No Credentials)

```javascript
// ✅ Correct: Wildcard but no credentials
app.use(
  cors({
    origin: '*',
    credentials: false, // Or omit entirely
  }),
);
```

### Pattern 2: Private API (With Credentials)

```javascript
// ✅ Correct: Specific origins with credentials
app.use(
  cors({
    origin: ['https://app.example.com', 'https://admin.example.com'],
    credentials: true,
  }),
);
```

### Pattern 3: Dynamic Origin Validation

```javascript
// ✅ Correct: Validate against allowlist
const allowedOrigins = ['https://app.example.com', 'https://admin.example.com'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
```

### Pattern 4: Subdomain Matching

```javascript
// ✅ Correct: Allow all subdomains
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Match *.example.com
      const pattern = /^https:\/\/([a-z0-9-]+\.)?example\.com$/;
      if (pattern.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
```

## Anti-Patterns

### ❌ Reflecting Origin

```javascript
// DANGEROUS: Reflects any origin that asks
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin); // Trusts everything!
    },
    credentials: true,
  }),
);
```

### ❌ Regex Without Anchors

```javascript
// DANGEROUS: Matches evilexample.com
const pattern = /example\.com/; // Missing ^ and $

// ✅ Safe
const pattern = /^https:\/\/([a-z0-9-]+\.)?example\.com$/;
```

### ❌ null Origin Allowed

```javascript
// DANGEROUS: "null" origin can be faked
origin: ['https://app.example.com', 'null'],
```

Files opened with `file://` or sandboxed iframes have `null` origin.

## ESLint Rules

```javascript
// eslint.config.js
import expressSecurity from 'eslint-plugin-express-security';

export default [
  {
    rules: {
      // Catches wildcard + credentials
      'express-security/no-cors-credentials-wildcard': 'error',

      // Catches overly permissive CORS
      'express-security/no-permissive-cors': 'error',
    },
  },
];
```

### Error Output

```bash
src/app.ts
  12:1  error  🔒 CWE-346 CVSS:7.5 | CORS with credentials and wildcard origin
               Risk: Any website can make authenticated cross-origin requests
               Fix: Replace '*' with specific allowed origins

  25:1  error  🔒 CWE-346 | CORS origin callback reflects request origin
               Risk: Cross-origin attacks bypass same-origin policy
               Fix: Validate against explicit allowlist
```

## Complete Secure Configuration

```javascript
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'https://app.example.com',
  'https://admin.example.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Log rejected origins for debugging
    console.warn(`CORS rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-express-security %}
📦 npm install eslint-plugin-express-security
{% endcta %}

```javascript
import expressSecurity from 'eslint-plugin-express-security';
export default [expressSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-express-security](https://www.npmjs.com/package/eslint-plugin-express-security)
📖 [Rule: no-cors-credentials-wildcard](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-express-security/docs/rules/no-cors-credentials-wildcard.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Check your CORS config. Is it wildcard + credentials?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
