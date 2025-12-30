# no-cookie-auth-tokens

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

## 📚 Related Resources

- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
