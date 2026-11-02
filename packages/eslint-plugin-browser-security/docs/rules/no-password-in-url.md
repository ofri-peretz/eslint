---
title: no-password-in-url
description: This rule detects passwords carried in a URL's userinfo or fragment
tags: ['security', 'browser']
category: security
severity: medium
cwe: CWE-521
autofix: false
---

> Prevents passwords in a URL's userinfo or fragment

<!-- @rule-summary -->

This rule detects passwords carried in a URL's userinfo or fragment
<!-- @/rule-summary -->

**Severity:** 🔴 CRITICAL  
**CWE:** [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)  
**OWASP Mobile:** [M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects a password carried in a URL string — a literal, a template, or a `+` concatenation — in either of two positions:

- **the userinfo**: `scheme://user:password@host`, for `http`, `https`, `ftp`, `ftps`, `ws` and `wss` (the URLs a browser or `fetch` sends). A username alone (`https://token@host`), a port (`host:8443`) or an `@` later in the path is not a password.
- **the fragment**: a parameter whose name ends in `password`, `passwd`, `pwd` or `passphrase` after the `#` (`#password=…`, `#user=bob&pwd=…`). A route that only names a password page (`#/settings/password`) is not a value.

Passwords in URLs are logged in browser history, server logs, proxy logs, and referrer headers, creating permanent credential leaks.

**Partition:** a password in the **query string** (`?password=`, `?pwd=`, `?passwd=`) is reported by [`no-credentials-in-query-params`](./no-credentials-in-query-params.md), which owns every credential there — one finding per defect. Database connection strings (`postgres://user:pass@db`) are server configuration, not URLs a browser sends, and belong to the hardcoded-credentials rules.

### Why This Matters

URLs with passwords are fundamentally insecure:

- **Browser history**: Passwords saved in autocomplete and history
- **Server logs**: All web servers log full URLs including query params
- **Referrer headers**: Passwords leaked to third-party sites via Referer header
- **Proxy logs**: Corporate/ISP proxies log all URLs
- **Compliance**: Violates PCI-DSS, HIPAA, and security best practices

## ❌ Incorrect

```typescript
const url = 'https://user:password@example.com';
const upload = 'ftp://deploy:hunter2@files.example.com/pub';
location.href = 'https://example.com/app#user=bob&pwd=hunter2';

// Reported by no-credentials-in-query-params, not this rule:
const login = 'https://example.com/login?user=bob&password=hunter2';
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

## ⚙️ Configuration

This rule has no configuration options.

## Known False Negatives

### Passwords in Dynamically Constructed URLs

**Why**: The userinfo and fragment are read from the string as written; a URL assembled from a variable holding its authority is not traced.

```typescript
// ❌ NOT DETECTED - Dynamic construction
const base = `https://${user}`;
const fullUrl = `${base}:${pwd}@example.com`;
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

- [`no-hardcoded-credentials`](./no-hardcoded-credentials.md) - Detect hardcoded passwords
- [`no-credentials-in-query-params`](./no-credentials-in-query-params.md) - Credentials (passwords included) in the query string

## 📚 References

- [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)
- [OWASP M1: Improper Credential Usage](https://owasp.org/www-project-mobile-top-10/)
- [RFC 3986: URI Generic Syntax](https://tools.ietf.org/html/rfc3986)
