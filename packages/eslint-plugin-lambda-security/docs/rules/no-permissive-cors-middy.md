# no-permissive-cors-middy

> **Keywords:** CORS, Middy, Lambda middleware, CWE-942, security, wildcard origin

Detects permissive CORS configurations in Middy middleware. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security).

⚠️ This rule **_errors_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                  |
| ----------------- | ---------------------------------------- |
| **CWE Reference** | CWE-942 (Permissive Cross-domain Policy) |
| **Severity**      | 🔴 High                                  |
| **Auto-Fix**      | ✅ Yes                                   |
| **Category**      | Security                                 |
| **Best For**      | Lambda functions using Middy middleware  |

## Vulnerability and Risk

**Vulnerability:** Middy's `@middy/http-cors` middleware configured with `origin: '*'` allows any website to access your API.

**Risk:** Same as permissive CORS in responses - credential theft and unauthorized API access.

## Examples

### ❌ Incorrect

```javascript
import middy from '@middy/core';
import cors from '@middy/http-cors';

// Wildcard origin - VULNERABLE
export const handler = middy(baseHandler).use(cors({ origin: '*' }));

// No origin = defaults to '*' - VULNERABLE
export const handler = middy(baseHandler).use(cors());

// credentials with wildcard - CRITICAL
export const handler = middy(baseHandler).use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
```

### ✅ Correct

```javascript
import middy from '@middy/core';
import cors from '@middy/http-cors';

// Specific origin - SAFE
export const handler = middy(baseHandler).use(
  cors({
    origin: 'https://app.example.com',
  }),
);

// Multiple origins - SAFE
export const handler = middy(baseHandler).use(
  cors({
    origins: ['https://app.example.com', 'https://admin.example.com'],
  }),
);

// Dynamic origin validation - SAFE
export const handler = middy(baseHandler).use(
  cors({
    origin: (incomingOrigin) => {
      const allowed = ['https://app.example.com'];
      return allowed.includes(incomingOrigin) ? incomingOrigin : '';
    },
  }),
);
```

## Options

| Option         | Type      | Default | Description                         |
| -------------- | --------- | ------- | ----------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow permissive CORS in test files |

```json
{
  "rules": {
    "lambda-security/no-permissive-cors-middy": "error"
  }
}
```

## Related Rules

- [`no-permissive-cors-response`](./no-permissive-cors-response.md) - CORS in direct responses

## Resources

- [CWE-942: Permissive Cross-domain Policy](https://cwe.mitre.org/data/definitions/942.html)
- [Middy CORS Middleware](https://middy.js.org/docs/middlewares/http-cors/)
