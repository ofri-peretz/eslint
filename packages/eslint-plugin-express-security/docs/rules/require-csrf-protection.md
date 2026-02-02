---
title: require-csrf-protection
description: "The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:"
tags: ['security', 'express']
category: security
severity: high
cwe: CWE-352
autofix: false
---

> Require CSRF protection middleware for state-changing HTTP methods


<!-- @rule-summary -->
The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:
<!-- @/rule-summary -->

**Severity:** 🔴 High  
**CWE:** [CWE-352](https://cwe.mitre.org/data/definitions/352.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-352 OWASP:A01 CVSS:8.8 | Cross-Site Request Forgery (CSRF) detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A01_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-352](https://cwe.mitre.org/data/definitions/352.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:8.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Cross-Site Request Forgery (CSRF) detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A01_2021-Injection/) |

## Rule Details

This rule detects Express.js routes handling state-changing requests (POST, PUT, PATCH, DELETE) without CSRF protection. CSRF attacks trick authenticated users into performing unwanted actions.

## Examples

### ❌ Incorrect

```javascript
import express from 'express';
const app = express();

// POST without CSRF protection - VULNERABLE
app.post('/transfer', (req, res) => {
  transferFunds(req.body);
});
```

### ✅ Correct

```javascript
import express from 'express';
import csrf from 'csurf';

const app = express();
const csrfProtection = csrf({ cookie: true });

// Global CSRF protection
app.use(csrfProtection);

app.post('/transfer', (req, res) => {
  transferFunds(req.body);
});

// Or per-route protection
app.post('/transfer', csrfProtection, (req, res) => {
  transferFunds(req.body);
});
```

## Options

| Option             | Type       | Default                              | Description                                     |
| ------------------ | ---------- | ------------------------------------ | ----------------------------------------------- |
| `allowInTests`     | `boolean`  | `false`                              | Allow missing CSRF in test files                |
| `protectedMethods` | `string[]` | `['post', 'put', 'patch', 'delete']` | HTTP methods that require CSRF protection       |
| `ignorePatterns`   | `string[]` | `[]`                                 | Route patterns to ignore (e.g., `/api/webhook`) |

```json
{
  "rules": {
    "express-security/require-csrf-protection": [
      "error",
      {
        "ignorePatterns": ["/api/webhook", "/api/public/.*"]
      }
    ]
  }
}
```

## When Not To Use It

Disable for:

- Stateless API-only backends using token-based auth (JWT)
- Webhook endpoints that use signature verification
- Public APIs without session-based authentication

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### CSRF Middleware in External Router

**Why**: Middleware applied in other modules is not tracked.

```typescript
// ❌ NOT DETECTED - CSRF in external router file
// routes.ts applies csrf, but main.ts doesn't see it
import { router } from './routes';
app.use(router);
```

**Mitigation**: Apply CSRF globally in main file. Document middleware location.

### Custom CSRF Implementation

**Why**: Custom CSRF token validation is not recognized.

```typescript
// ❌ NOT DETECTED - Custom CSRF check
app.post('/transfer', (req, res) => {
  if (req.headers['x-csrf-token'] !== req.session.csrf) {
    return res.status(403).send('Invalid CSRF');
  }
  // ... handle request
});
```

**Mitigation**: Configure rule to recognize custom middleware names.

### Framework CSRF Abstraction

**Why**: Framework-specific CSRF is not detected.

```typescript
// ❌ NOT DETECTED - Next.js API routes
export async function POST(req) {
  // Next.js has different CSRF handling
}
```

**Mitigation**: Use framework-specific linting. Configure ignorePatterns.

### Token-Based API with Session Fallback

**Why**: Rule can't determine if endpoint uses session or JWT.

```typescript
// ❌ FALSE POSITIVE RISK - JWT API doesn't need CSRF
app.post('/api/data', jwtAuth, (req, res) => {
  // Safe: JWT auth, not session-based
});
```

**Mitigation**: Use ignorePatterns for API routes. Document auth strategy.

## Further Reading

- [OWASP CSRF Prevention](https://owasp.org/www-community/attacks/csrf)
- [csurf npm package](https://www.npmjs.com/package/csurf)