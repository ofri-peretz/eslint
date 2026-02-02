---
title: no-cookie-auth-tokens
description: Prevent storing authentication tokens in JavaScript-accessible cookies.
tags: ['security', 'browser']
category: security
severity: high
cwe: CWE-1004
owasp: "A02:2021"
autofix: false
---

> No Cookie Auth Tokens


<!-- @rule-summary -->
Prevent storing authentication tokens in JavaScript-accessible cookies.
<!-- @/rule-summary -->

Prevent storing authentication tokens in JavaScript-accessible cookies.

## ⚠️ Security Issue

| Property     | Value                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| **CWE**      | [CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag](https://cwe.mitre.org/data/definitions/1004.html) |
| **OWASP**    | A02:2021 - Cryptographic Failures                                                                      |
| **CVSS**     | 8.5 (High)                                                                                             |
| **Severity** | HIGH                                                                                                   |

## 📋 Description

Authentication tokens (JWT, session tokens, bearer tokens) stored in cookies accessible via JavaScript are vulnerable to XSS attacks. Attackers can steal these tokens and impersonate users.

## ❌ Incorrect

```javascript
// Setting auth token in cookie
document.cookie = 'authToken=' + token;

// JWT in cookie
document.cookie = `jwt=${response.token}; path=/`;

// Bearer token
document.cookie = 'bearer=' + bearerToken;

// Session ID
document.cookie = 'sessionId=' + session.id;
```

## ✅ Correct

```javascript
// Set cookies server-side with HttpOnly flag
// Server (Express.js example):
res.cookie('authToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});

// Use non-sensitive cookies in JavaScript
document.cookie = 'theme=dark';
document.cookie = 'locale=en-US';
```

## 🛠️ Options

```json
{
  "rules": {
    "@interlace/browser-security/no-cookie-auth-tokens": [
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

### Token Value from Variable

**Why**: Token patterns in variables not traced.

```typescript
// ❌ NOT DETECTED - Token from variable
const value = jwt;
document.cookie = 'data=' + value;
```

**Mitigation**: Never set auth cookies client-side.

### Dynamic Cookie Names

**Why**: Computed cookie names not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic name
const key = 'authToken';
document.cookie = `${key}=${value}`;
```

**Mitigation**: Set auth cookies server-side with HttpOnly.

### Cookie Library Wrappers

**Why**: Library methods not recognized.

```typescript
// ❌ NOT DETECTED - Library wrapper
Cookies.set('token', jwt); // Uses document.cookie internally
```

**Mitigation**: Apply rule to library implementations.

## 📚 Related Resources

- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-1004 OWASP:A02 CVSS:5.3 | Sensitive Cookie Without HttpOnly detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A02_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-1004](https://cwe.mitre.org/data/definitions/1004.html) [OWASP:A02](https://owasp.org/Top10/A02_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description** | Specific vulnerability | `Sensitive Cookie Without HttpOnly detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A02_2021-Injection/) |