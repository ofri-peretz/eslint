---
title: 'JWT Expiration: Why Your Tokens Need to Die'
published: false
description: 'JWTs without expiration are forever valid. Here is why that is dangerous and how to enforce short-lived tokens.'
tags: security, jwt, authentication, eslint
cover_image:
series: JWT Security
---

# JWT Expiration: Why Your Tokens Need to Die

A JWT without expiration is valid **forever**.

That means:

- Stolen tokens work forever
- Revocation is impossible
- Security breaches are permanent

## The Problem

```javascript
// ❌ Token valid forever
const token = jwt.sign(
  {
    userId: 123,
    role: 'admin',
  },
  secret,
);
// No exp claim = eternal validity
```

```javascript
// 5 years later, stolen token still works:
jwt.verify(token, secret); // ✅ Valid!
```

## Real-World Impact

| Scenario                | Without Expiration       | With Expiration      |
| ----------------------- | ------------------------ | -------------------- |
| Token stolen from logs  | Valid forever            | Invalid after 1 hour |
| Employee leaves company | Still has access         | Token expires        |
| Credential leak         | Manual revocation needed | Auto-expired         |
| Laptop stolen           | Permanent compromise     | Limited window       |

## The Fix

```javascript
// ✅ Short-lived token
const token = jwt.sign(
  {
    userId: 123,
    role: 'admin',
  },
  secret,
  {
    expiresIn: '1h', // Expires in 1 hour
  },
);
```

```javascript
// Verification automatically checks expiration
jwt.verify(token, secret);
// Throws TokenExpiredError after 1 hour
```

## Best Practices

### Access Token Lifetime

| Token Type         | Recommended Lifetime |
| ------------------ | -------------------- |
| API access tokens  | 15 minutes - 1 hour  |
| Session tokens     | 1-24 hours           |
| Refresh tokens     | 7-30 days            |
| Password reset     | 15-60 minutes        |
| Email verification | 24-48 hours          |

### Use Refresh Tokens

```javascript
// Short access token + long refresh token
const accessToken = jwt.sign({ userId }, secret, { expiresIn: '15m' });
const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });

// Store refresh token in httpOnly cookie or secure storage
// Refresh access token when needed
```

### Add Issued At

```javascript
// ✅ Include iat for token freshness
const token = jwt.sign(
  {
    userId: 123,
    iat: Math.floor(Date.now() / 1000),
  },
  secret,
  {
    expiresIn: '1h',
  },
);
```

## ESLint Enforcement

```javascript
// eslint.config.js
import jwtPlugin from 'eslint-plugin-jwt';

export default [
  {
    plugins: { jwt: jwtPlugin },
    rules: {
      // Require expiration
      'jwt/require-expiration': 'error',

      // Require issued-at claim
      'jwt/require-issued-at': 'warn',

      // Enforce max age on verify
      'jwt/require-max-age': 'error',
    },
  },
];
```

### Error Output

```bash
src/auth.ts
  8:17  error  🔒 CWE-613 CVSS:7.5 | JWT missing expiration
               Risk: Tokens are valid forever if stolen
               Fix: Add expiresIn: '1h' or exp claim

  15:3  error  🔒 CWE-613 | jwt.verify() missing maxAge option
               Risk: Old tokens accepted indefinitely
               Fix: Add { maxAge: '1h' } to verify options
```

## Complete Token Pattern

```javascript
import jwt from 'jsonwebtoken';

// Generate secure tokens
function createTokens(userId: string) {
  const now = Math.floor(Date.now() / 1000);

  const accessToken = jwt.sign({
    sub: userId,
    iat: now,
    type: 'access',
  }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
    algorithm: 'HS256',
    issuer: 'your-app',
    audience: 'your-api',
  });

  const refreshToken = jwt.sign({
    sub: userId,
    iat: now,
    type: 'refresh',
  }, process.env.REFRESH_SECRET!, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });

  return { accessToken, refreshToken };
}

// Verify with all checks
function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    algorithms: ['HS256'],
    issuer: 'your-app',
    audience: 'your-api',
    maxAge: '1h', // Extra safety
  });
}
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-jwt %}
📦 npm install eslint-plugin-jwt
{% endcta %}

```javascript
import jwtPlugin from 'eslint-plugin-jwt';
export default [jwtPlugin.configs.recommended];
```

---

📦 [npm: eslint-plugin-jwt](https://www.npmjs.com/package/eslint-plugin-jwt)
📖 [Rule: require-expiration](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-jwt/docs/rules/require-expiration.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **How long do your JWTs live? Share your token strategy!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
