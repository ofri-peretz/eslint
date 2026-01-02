---
title: 'The Cookie Security Checklist'
published: false
description: "Missing Secure, HttpOnly, or SameSite on your cookies? Here's why each flag matters and how to enforce them with ESLint."
tags: javascript, security, webdev, cookies
cover_image:
canonical_url:
---

You set a cookie. Your user is authenticated.

But is that cookie secure?

## The Vulnerability

```javascript
// ❌ Common pattern, completely insecure
res.cookie('session', token);
```

This cookie:

- Transmits over HTTP (can be intercepted)
- Accessible via JavaScript (can be stolen via XSS)
- Sent on cross-site requests (CSRF vulnerable)

## The Checklist

Every security cookie needs THREE flags:

| Flag       | Purpose                    | Without It        |
| ---------- | -------------------------- | ----------------- |
| `Secure`   | Only send over HTTPS       | HTTP interception |
| `HttpOnly` | No JavaScript access       | XSS cookie theft  |
| `SameSite` | Control cross-site sending | CSRF attacks      |

## The Correct Pattern

```javascript
// ✅ Secure cookie settings
res.cookie('session', token, {
  httpOnly: true, // JavaScript can't read it
  secure: true, // HTTPS only
  sameSite: 'strict', // No cross-site requests
  maxAge: 3600000, // 1 hour expiry
  path: '/', // Scope to entire site
});
```

## Understanding SameSite

| Value    | Behavior                      | Use Case           |
| -------- | ----------------------------- | ------------------ |
| `strict` | Never sent cross-site         | Session cookies    |
| `lax`    | Sent on top-level navigation  | Default, balanced  |
| `none`   | Always sent (requires Secure) | Third-party, OAuth |

```javascript
// ✅ For OAuth/SSO flows
res.cookie('oauth_state', state, {
  httpOnly: true,
  secure: true,
  sameSite: 'none', // Cross-site needed for OAuth
});
```

## Express Best Practice

```javascript
// Set defaults for all cookies
import cookieParser from 'cookie-parser';

app.use(cookieParser());

// Configure session
app.use(
  session({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);
```

## Let ESLint Enforce This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Now missing flags are caught:

```bash
src/auth.ts
  15:3  warning  🔒 CWE-614 OWASP:A07 CVSS:5.3 | Insecure cookie settings
                 Fix: Add { httpOnly: true, secure: true, sameSite: 'strict' }
```

## Additional Cookie Rules

| Rule                          | Catches                  |
| ----------------------------- | ------------------------ |
| `no-insecure-cookie-settings` | Missing flags            |
| `no-document-cookie`          | Direct DOM cookie access |
| `no-missing-csrf-protection`  | Missing CSRF tokens      |

## The Document.cookie Problem

```javascript
// ❌ Direct cookie access is a smell
document.cookie = 'session=' + token;
const session = document.cookie.match(/session=([^;]+)/);
```

This pattern:

- Bypasses HttpOnly
- Indicates XSS-accessible session
- Makes CSP harder to implement

```bash
src/client.ts
  8:1  warning  🔒 CWE-565 | Direct document.cookie access
                Fix: Use HttpOnly cookies with server-side session management
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Three flags. Three protection layers. Zero excuses.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-insecure-cookie-settings](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-cookie-settings.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)