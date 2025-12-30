# no-cors-credentials-wildcard

> Disallow CORS credentials with wildcard origin

**Severity:** 🔴 Critical  
**CWE:** [CWE-942](https://cwe.mitre.org/data/definitions/942.html)

## Rule Details

This rule detects the dangerous combination of `credentials: true` with `origin: '*'` or `origin: true` in CORS configuration. While browsers block this specific combination, misconfigurations can still lead to credential leakage.

## Examples

### ❌ Incorrect

```javascript
// Credentials with wildcard - VULNERABLE
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

// Credentials with origin reflection - VULNERABLE
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
```

### ✅ Correct

```javascript
// Explicit origin with credentials - SAFE
app.use(
  cors({
    origin: 'https://app.example.com',
    credentials: true,
  }),
);

// Whitelist with credentials - SAFE
app.use(
  cors({
    origin: ['https://app.example.com', 'https://admin.example.com'],
    credentials: true,
  }),
);
```

## Options

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `false` | Allow in test files |

```json
{
  "rules": {
    "express-security/no-cors-credentials-wildcard": "error"
  }
}
```

## When Not To Use It

Never disable this rule. The combination of credentials with permissive origins is always dangerous.

## Further Reading

- [OWASP CORS Misconfiguration](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)
- [MDN: CORS and Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#requests_with_credentials)
