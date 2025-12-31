---
title: 'Getting Started with eslint-plugin-jwt'
published: false
description: 'JWT security in 60 seconds. 13 rules for algorithm confusion, weak secrets, and missing validation.'
tags: jwt, security, authentication, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-jwt

**13 JWT security rules. Algorithm attacks. Token validation. Secret management.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-jwt
```

## Flat Config

```javascript
// eslint.config.js
import jwt from 'eslint-plugin-jwt';

export default [jwt.configs.recommended];
```

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/auth.ts
  15:3  error  🔒 CWE-347 CVSS:9.8 | JWT algorithm 'none' is allowed
               Fix: Remove 'none' from algorithms: ['HS256']

src/verify.ts
  28:5  error  🔒 CWE-613 | JWT missing expiration
               Fix: Add expiresIn: '1h' or exp claim
```

## Rule Overview

| Rule                          | CWE     | What it catches         |
| ----------------------------- | ------- | ----------------------- |
| `no-algorithm-none`           | CWE-347 | Algorithm 'none' bypass |
| `no-algorithm-confusion`      | CWE-327 | RS256/HS256 confusion   |
| `no-weak-secret`              | CWE-326 | Brute-forceable secrets |
| `no-hardcoded-secret`         | CWE-798 | Secrets in source code  |
| `no-sensitive-payload`        | CWE-312 | PII in token payload    |
| `require-expiration`          | CWE-613 | Missing exp claim       |
| `require-algorithm-whitelist` | CWE-327 | No explicit algorithms  |
| `require-issuer-validation`   | CWE-345 | Missing iss check       |
| `require-audience-validation` | CWE-345 | Missing aud check       |
| `no-decode-without-verify`    | CWE-347 | jwt.decode() misuse     |
| `require-issued-at`           | CWE-613 | Missing iat claim       |
| `require-max-age`             | CWE-613 | No maxAge in verify     |
| `no-timestamp-manipulation`   | CWE-345 | Clock skew exploits     |

## Quick Wins

### Before

```javascript
// ❌ Algorithm none allowed
jwt.verify(token, secret, {
  algorithms: ['HS256', 'none'],
});
```

### After

```javascript
// ✅ Explicit safe algorithm
jwt.verify(token, secret, {
  algorithms: ['HS256'],
});
```

### Before

```javascript
// ❌ No expiration
jwt.sign({ userId: 123 }, secret);
```

### After

```javascript
// ✅ Short-lived token
jwt.sign({ userId: 123 }, secret, {
  expiresIn: '1h',
});
```

## Complete Secure Pattern

```javascript
// Signing
const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET, {
  expiresIn: '1h',
  algorithm: 'HS256',
  issuer: 'your-app',
  audience: 'your-api',
});

// Verifying
const payload = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
  issuer: 'your-app',
  audience: 'your-api',
  maxAge: '1h',
});
```

## Available Presets

```javascript
// Security-focused configuration
jwt.configs.recommended;

// All rules enabled
jwt.configs.all;
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-jwt

# Config (eslint.config.js)
import jwt from 'eslint-plugin-jwt';
export default [jwt.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-jwt](https://www.npmjs.com/package/eslint-plugin-jwt)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-jwt/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Got JWT? Run the linter!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
