# require-cookie-secure-attrs

Require Secure and SameSite attributes on cookies.

## ⚠️ Security Issue

| Property     | Value                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **CWE**      | [CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute](https://cwe.mitre.org/data/definitions/614.html) |
| **OWASP**    | A05:2021 - Security Misconfiguration                                                                                     |
| **CVSS**     | 6.5 (Medium)                                                                                                             |
| **Severity** | MEDIUM                                                                                                                   |

## 📋 Description

Cookies without `Secure` can be transmitted over HTTP (man-in-the-middle attacks). Cookies without `SameSite` are vulnerable to CSRF attacks.

## ❌ Incorrect

```javascript
// Missing both attributes
document.cookie = 'name=value';

// Missing SameSite
document.cookie = 'name=value; Secure';

// Missing Secure
document.cookie = 'name=value; SameSite=Strict';
```

## ✅ Correct

```javascript
// Both attributes present
document.cookie = 'name=value; Secure; SameSite=Strict';

// Lax SameSite (allows top-level GET)
document.cookie = 'name=value; Secure; SameSite=Lax';

// Server-side (preferred)
res.cookie('name', 'value', {
  secure: true,
  sameSite: 'strict',
});
```

## 🛠️ Options

```json
{
  "rules": {
    "@interlace/browser-security/require-cookie-secure-attrs": [
      "error",
      {
        "allowInTests": true
      }
    ]
  }
}
```

## 📚 Related Resources

- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP: SameSite Cookies](https://owasp.org/www-community/SameSite)
