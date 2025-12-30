# require-csrf-protection

> Require CSRF protection middleware for state-changing HTTP methods

**Severity:** 🔴 High  
**CWE:** [CWE-352](https://cwe.mitre.org/data/definitions/352.html)

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

## Further Reading

- [OWASP CSRF Prevention](https://owasp.org/www-community/attacks/csrf)
- [csurf npm package](https://www.npmjs.com/package/csurf)
