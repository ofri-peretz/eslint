---
title: require-rate-limiting
description: require-rate-limiting
category: security
severity: medium
tags: ['security', 'express']
autofix: false
---


> Require rate limiting middleware to prevent DDoS and brute-force attacks

**Severity:** 🟡 Warning  
**CWE:** [CWE-770](https://cwe.mitre.org/data/definitions/770.html)

## Rule Details

This rule detects Express.js applications missing rate limiting middleware. Without rate limiting, your application is vulnerable to:

- Denial of Service (DoS) attacks
- Brute-force login attempts
- API abuse and scraping
- Resource exhaustion

## Examples

### ❌ Incorrect

```javascript
import express from 'express';
const app = express();

// No rate limiting - VULNERABLE
app.post('/login', (req, res) => {
  authenticate(req.body);
});

app.listen(3000);
```

### ✅ Correct

```javascript
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
});

app.use(limiter);

// Stricter limiter for login
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
});

app.post('/login', loginLimiter, (req, res) => {
  authenticate(req.body);
});
```

## Options

| Option         | Type      | Default | Description                               |
| -------------- | --------- | ------- | ----------------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow missing rate limiting in test files |

```json
{
  "rules": {
    "express-security/require-rate-limiting": [
      "warn",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## When Not To Use It

- Internal microservices behind a load balancer with rate limiting
- Development environments (use `allowInTests`)

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Rate Limiter in External Module

**Why**: Middleware applied in other modules is not tracked.

```typescript
// ❌ NOT DETECTED - Limiter in security.ts
import { setupSecurity } from './security'; // Applies rate limiting
setupSecurity(app);
```

**Mitigation**: Apply rate limiting in main file. Document middleware location.

### Reverse Proxy Rate Limiting

**Why**: Infrastructure-level rate limiting is not visible to ESLint.

```typescript
// ❌ NOT DETECTED (correctly) - Rate limiting in Nginx/Cloudflare
app.post('/api', handler); // Nginx handles rate limiting
```

**Mitigation**: Document infrastructure rate limits. Add inline comment.

### Custom Rate Limiting Implementation

**Why**: Custom rate limiting logic is not recognized.

```typescript
// ❌ NOT DETECTED - Custom rate limiting
const rateLimits = new Map();
app.use((req, res, next) => {
  // Custom rate limiting logic
});
```

**Mitigation**: Use standard middleware. Configure rule to recognize custom names.

### Per-Route vs Global

**Why**: Route-level limiters may miss some endpoints.

```typescript
// ❌ NOT DETECTED - Some routes may be unprotected
app.use('/api', rateLimiter);
app.get('/public/data', handler); // No limiter!
```

**Mitigation**: Apply rate limiting globally. Review all routes.

## Further Reading

- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
