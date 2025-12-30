# require-rate-limiting

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

## Further Reading

- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
