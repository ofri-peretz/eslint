# no-insecure-cookie-options

> Require secure cookie flags (httpOnly, secure, sameSite)

**Severity:** 🔴 High  
**CWE:** [CWE-614](https://cwe.mitre.org/data/definitions/614.html)

## Rule Details

This rule detects cookies set without proper security flags. Missing flags can expose sensitive cookie data to XSS attacks, man-in-the-middle attacks, and CSRF.

Required flags:

- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `secure: true` - Cookie only sent over HTTPS
- `sameSite: 'strict'` or `'lax'` - CSRF protection

## Examples

### ❌ Incorrect

```javascript
// No options - VULNERABLE
res.cookie('session', token);

// Missing httpOnly - VULNERABLE to XSS
res.cookie('session', token, { secure: true });

// sameSite: 'none' - VULNERABLE to CSRF
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
});
```

### ✅ Correct

```javascript
// All security flags set - SAFE
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});

// Lax is acceptable for most use cases
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
});
```

## Options

| Option                     | Type       | Default             | Description                          |
| -------------------------- | ---------- | ------------------- | ------------------------------------ |
| `allowInTests`             | `boolean`  | `false`             | Allow insecure cookies in test files |
| `requireHttpOnly`          | `boolean`  | `true`              | Require httpOnly flag                |
| `requireSecure`            | `boolean`  | `true`              | Require secure flag                  |
| `requireSameSite`          | `boolean`  | `true`              | Require sameSite flag                |
| `acceptableSameSiteValues` | `string[]` | `['strict', 'lax']` | Acceptable sameSite values           |

```json
{
  "rules": {
    "express-security/no-insecure-cookie-options": [
      "error",
      {
        "requireHttpOnly": true,
        "requireSecure": true,
        "acceptableSameSiteValues": ["strict"]
      }
    ]
  }
}
```

## When Not To Use It

Never disable for session cookies or cookies containing sensitive data.

## Further Reading

- [OWASP Secure Cookie Attribute](https://owasp.org/www-community/controls/SecureCookieAttribute)
- [MDN: Cookie Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)
