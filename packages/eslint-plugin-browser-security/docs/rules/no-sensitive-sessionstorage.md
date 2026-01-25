---
title: no-sensitive-sessionstorage
description: 'no-sensitive-sessionstorage'
category: security
tags: ['security', 'browser']
---


> No Sensitive Sessionstorage

Prevent storing sensitive data in sessionStorage.

## ⚠️ Security Issue

| Property     | Value                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| **CWE**      | [CWE-922: Insecure Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/922.html) |
| **OWASP**    | A02:2021 - Cryptographic Failures                                                                     |
| **CVSS**     | 7.5 (High)                                                                                            |
| **Severity** | HIGH                                                                                                  |

## 📋 Description

sessionStorage is accessible via JavaScript and vulnerable to XSS attacks. While data is cleared when the tab closes, it can still be stolen during the session.

## ❌ Incorrect

```javascript
// Storing sensitive data
sessionStorage.setItem('password', pwd);
sessionStorage.setItem('apiKey', key);
sessionStorage.setItem('accessToken', token);

// Bracket notation
sessionStorage['authToken'] = token;
```

## ✅ Correct

```javascript
// Store non-sensitive data
sessionStorage.setItem('theme', 'dark');
sessionStorage.setItem('searchQuery', query);

// Use HttpOnly cookies for auth
// Server-side: res.cookie('token', value, { httpOnly: true });
```

## 🛠️ Options

```json
{
  "rules": {
    "@interlace/browser-security/no-sensitive-sessionstorage": [
      "error",
      {
        "allowInTests": true,
        "additionalPatterns": ["customSecret"]
      }
    ]
  }
}
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Key Names

**Why**: Computed key names not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic key
const key = 'accessToken';
sessionStorage.setItem(key, value);
```

**Mitigation**: Configure additional key patterns.

### Values from Variables

**Why**: Sensitive values in variables not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const data = jwt;
sessionStorage.setItem('data', data);
```

**Mitigation**: Never store tokens in sessionStorage.

### Wrapper Functions

**Why**: Storage wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
sessionManager.save('token', jwt);
```

**Mitigation**: Apply rule to wrapper implementations.

## 📚 Related Resources

- [MDN: sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [OWASP: HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
