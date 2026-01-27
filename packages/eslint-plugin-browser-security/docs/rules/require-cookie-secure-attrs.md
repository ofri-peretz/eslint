---
title: require-cookie-secure-attrs
description: require-cookie-secure-attrs
category: security
severity: medium
tags: ['security', 'browser']
autofix: false
---


> Require Cookie Secure Attrs

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Cookie String from Variable

**Why**: Cookie values from variables not traced.

```typescript
// ❌ NOT DETECTED - Cookie from variable
const cookie = 'name=value'; // Missing attrs
document.cookie = cookie;
```

**Mitigation**: Build cookie strings with attributes inline.

### Cookie Library Wrappers

**Why**: Library methods not recognized.

```typescript
// ❌ NOT DETECTED - Library wrapper
Cookies.set('name', 'value'); // May not set Secure
```

**Mitigation**: Review cookie library configurations.

### Conditional Attributes

**Why**: Dynamic conditions not evaluated.

```typescript
// ❌ NOT DETECTED - Conditional attributes
const attrs = isDev ? ' : '; Secure';
document.cookie = 'name=value' + attrs;
```

**Mitigation**: Always use secure attributes in production.

## 📚 Related Resources

- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP: SameSite Cookies](https://owasp.org/www-community/SameSite)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-614 OWASP:A02 CVSS:5.3 | Sensitive Cookie in HTTPS without Secure detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A02_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-614](https://cwe.mitre.org/data/definitions/614.html) [OWASP:A02](https://owasp.org/Top10/A02_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Sensitive Cookie in HTTPS without Secure detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A02_2021-Injection/) |
