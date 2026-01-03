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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variable

**Why**: CORS options stored in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Options from variable
const corsOptions = { origin: '*' };
export const handler = middy(baseHandler).use(cors(corsOptions));
```

**Mitigation**: Use inline CORS options. Validate config at startup.

### Dynamic Origin Validation Flaws

**Why**: The logic inside origin validation functions is not analyzed.

```typescript
// ❌ NOT DETECTED - Flawed validation
cors({
  origin: (incomingOrigin) => incomingOrigin, // Always returns origin!
});
```

**Mitigation**: Use exact match with allowlist. Test validation logic.

### Spread Configuration

**Why**: Spread objects hide their configuration.

```typescript
// ❌ NOT DETECTED - Origin in spread
const base = { origin: '*' };
export const handler = middy(baseHandler).use(cors({ ...base }));
```

**Mitigation**: Avoid spreading CORS options. Define inline.

### Middleware Chain Variables

**Why**: Middleware stored in variables may not be recognized.

```typescript
// ❌ NOT DETECTED - Middleware from variable
const corsMiddleware = cors({ origin: '*' });
export const handler = middy(baseHandler).use(corsMiddleware);
```

**Mitigation**: Use inline middleware configuration.

## Resources

- [CWE-942: Permissive Cross-domain Policy](https://cwe.mitre.org/data/definitions/942.html)
- [Middy CORS Middleware](https://middy.js.org/docs/middlewares/http-cors/)
