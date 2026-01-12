# no-password-in-url

> Prevents passwords in URL query parameters or fragments

**Severity:** 🔴 CRITICAL  
**CWE:** [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)  
**OWASP Mobile:** [M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects when URLs contain password-related query parameters or URL fragments. Passwords in URLs are logged in browser history, server logs, proxy logs, and referrer headers, creating permanent credential leaks.

### Why This Matters

URLs with passwords are fundamentally insecure:

- **Browser history**: Passwords saved in autocomplete and history
- **Server logs**: All web servers log full URLs including query params
- **Referrer headers**: Passwords leaked to third-party sites via Referer header
- **Proxy logs**: Corporate/ISP proxies log all URLs
- **Compliance**: Violates PCI-DSS, HIPAA, and security best practices

## ❌ Incorrect

```typescript
// Password in query parameter
window.location.href = 'https://example.com/login?password=secret123'; // ❌ Logged everywhere

// Password in URLSearchParams
const params = new URLSearchParams({
  username: 'user',
  password: userPassword, // ❌ Will appear in URL
});
fetch(`https://api.example.com/auth?${params}`);

// Password in hash fragment
window.location.hash = `#password=${pwd}`; // ❌ Visible in browser history

// Mailto with password
window.open(`mailto:support@example.com?subject=Reset&body=password:${pwd}`); // ❌ Email leak
```

## ✅ Correct

```typescript
// POST passwords in request body (never URL)
fetch('https://api.example.com/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user',
    password: userPassword, // ✅ In POST body, not URL
  }),
});

// Use Authorization header for credentials
fetch('https://api.example.com/data', {
  headers: {
    Authorization: `Basic ${btoa(`${username}:${password}`)}`, // ✅ Header, not URL
  },
});

// OAuth flow with authorization code (no password in URL)
const authUrl = new URL('https://oauth.example.com/authorize');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code'); // ✅ No password, just auth code
window.location.href = authUrl.toString();

// Never pass credentials in URLs - use secure cookies/tokens
document.cookie = `session=${sessionToken}; Secure; HttpOnly; SameSite=Strict`; // ✅ Cookie, not URL
```

## Known False Negatives

### Passwords in Dynamically Constructed URLs

**Why**: We only detect literal URL strings with password params. Dynamic URL construction is not traced.

```typescript
// ❌ NOT DETECTED - Dynamic construction
const baseUrl = 'https://example.com/auth';
const fullUrl = `${baseUrl}?password=${pwd}`; // Dynamic template
window.location.href = fullUrl;
```

**Mitigation**: Never construct URLs with password parameters. Always use POST body or headers.

### Password in URL Objects

**Why**: We detect string literals, not URL object manipulation.

```typescript
// ❌ NOT DETECTED - URL object
const url = new URL('https://example.com/login');
url.searchParams.set('password', pwd); // Object method, not literal
fetch(url.toString());
```

**Mitigation**: Code review for all URL parameter assignments. Ban password in query params.

### Third-Party Library URL Building

**Why**: Libraries that internally construct URLs are not analyzed.

```typescript
// ❌ NOT DETECTED - Library handles URL
await httpClient.get('/auth', { params: { password: pwd } }); // axios/similar
```

**Mitigation**: Configure HTTP libraries to never allow credentials in URLs. Review library docs.

## 🔗 Related Rules

- [`no-hardcoded-credentials`](./no-hardcoded-credentials. md) - Detect hardcoded passwords
- [`no-credentials-in-query-params`](./no-credentials-in-query-params.md) - General credential leak prevention

## 📚 References

- [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)
- [OWASP M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)
- [RFC 3986: URI Generic Syntax](https://tools.ietf.org/html/rfc3986)
