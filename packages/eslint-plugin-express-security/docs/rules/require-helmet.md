# require-helmet

> Require helmet middleware for security headers in Express.js applications

**Severity:** 🔴 High  
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

## Rule Details

This rule detects Express.js applications that are missing the helmet middleware. Helmet sets various HTTP headers to help protect your app from well-known web vulnerabilities.

Missing security headers can expose your application to:

- Clickjacking attacks (X-Frame-Options)
- XSS attacks (X-XSS-Protection, Content-Security-Policy)
- MIME-type sniffing attacks (X-Content-Type-Options)
- Man-in-the-middle attacks (Strict-Transport-Security)

## Examples

### ❌ Incorrect

```javascript
import express from 'express';
const app = express();

// Missing helmet middleware - VULNERABLE
app.get('/', (req, res) => res.send('Hello'));

app.listen(3000);
```

### ✅ Correct

```javascript
import express from 'express';
import helmet from 'helmet';

const app = express();

// Helmet adds security headers
app.use(helmet());

app.get('/', (req, res) => res.send('Hello'));

app.listen(3000);
```

## Options

| Option                  | Type       | Default | Description                                             |
| ----------------------- | ---------- | ------- | ------------------------------------------------------- |
| `allowInTests`          | `boolean`  | `false` | Allow missing helmet in test files                      |
| `alternativeMiddleware` | `string[]` | `[]`    | Alternative security headers middleware names to accept |

```json
{
  "rules": {
    "express-security/require-helmet": [
      "error",
      {
        "allowInTests": true,
        "alternativeMiddleware": ["securityHeaders"]
      }
    ]
  }
}
```

## When Not To Use It

Never disable this rule in production. Security headers are a fundamental protection layer.

## Further Reading

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
