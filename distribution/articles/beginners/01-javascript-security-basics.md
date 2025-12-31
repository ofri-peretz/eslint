---
title: 'Absolute Beginner Guide to JavaScript Security'
published: false
description: 'New to security? Here are the 5 vulnerabilities every JavaScript developer should know—explained simply with code examples.'
tags: beginners, security, javascript, webdev
cover_image:
series: Security Fundamentals
---

# Absolute Beginner Guide to JavaScript Security

You've learned JavaScript. You can build apps. But are they secure?

Here are the 5 vulnerabilities every JavaScript developer should understand—no prior security knowledge required.

## 1. SQL Injection: When Users Control Your Database

### The Problem

```javascript
// ❌ Dangerous: User input becomes part of the query
const email = req.body.email; // User types: '; DROP TABLE users; --
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Result: SELECT * FROM users WHERE email = ''; DROP TABLE users; --'
```

The user just deleted your entire database.

### The Fix

```javascript
// ✅ Safe: User input is a parameter, not part of the query
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);
// The database knows $1 is DATA, not a COMMAND
```

**Rule**: Never concatenate user input into queries.

## 2. XSS: When Users Control Your HTML

### The Problem

```javascript
// ❌ Dangerous: User input becomes HTML
const username = '<script>alert("hacked")</script>';
document.getElementById('welcome').innerHTML = `Hello, ${username}`;
// Result: The script runs in every visitor's browser
```

### The Fix

```javascript
// ✅ Safe: Use textContent (no HTML parsing)
document.getElementById('welcome').textContent = `Hello, ${username}`;
// Result: Shows the literal text "<script>..."
```

**Rule**: Use `textContent` or sanitize HTML properly.

## 3. Hardcoded Secrets: When Credentials Are in Code

### The Problem

```javascript
// ❌ Dangerous: Anyone who sees your code has your password
const API_KEY = 'sk_live_abc123xyz789';
const DB_PASSWORD = 'supersecret123';
```

If you push this to GitHub, bots will find it within seconds.

### The Fix

```javascript
// ✅ Safe: Read from environment variables
const API_KEY = process.env.STRIPE_API_KEY;

// Set in your environment:
// export STRIPE_API_KEY=sk_live_abc123xyz789
```

**Rule**: Secrets go in environment variables, never in code.

## 4. Weak Passwords: When You Store Them Wrong

### The Problem

```javascript
// ❌ Dangerous: MD5 is broken, no salt
const crypto = require('crypto');
const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
```

MD5 can be cracked in seconds with rainbow tables.

### The Fix

```javascript
// ✅ Safe: bcrypt is designed for passwords
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 12);

// To verify:
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Rule**: Use bcrypt or argon2 for passwords.

## 5. Insecure Cookies: When Sessions Leak

### The Problem

```javascript
// ❌ Dangerous: Cookies can be stolen by JavaScript
document.cookie = `session=${token}`;
```

Any XSS vulnerability can now steal user sessions.

### The Fix

```javascript
// ✅ Safe: Server sets secure cookie flags
res.cookie('session', token, {
  httpOnly: true, // JavaScript can't access
  secure: true, // HTTPS only
  sameSite: 'lax', // CSRF protection
});
```

**Rule**: Set `httpOnly`, `secure`, and `sameSite` on sensitive cookies.

## Quick Reference

| Vulnerability         | Cause                     | Fix                          |
| --------------------- | ------------------------- | ---------------------------- |
| SQL Injection         | Concatenating user input  | Parameterized queries        |
| XSS                   | innerHTML with user input | textContent or sanitize      |
| Hardcoded Secrets     | Passwords in code         | Environment variables        |
| Weak Password Storage | MD5/SHA1                  | bcrypt/argon2                |
| Insecure Cookies      | Missing flags             | httpOnly + secure + sameSite |

## How to Learn More

1. **Practice**: Try the free PortSwigger Web Security Academy
2. **Read**: OWASP Top 10 (the "greatest hits" of vulnerabilities)
3. **Automate**: Install a security linter to catch these automatically

## Automate with ESLint

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Now you'll get warnings when you write vulnerable code!

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 Catch These Vulnerabilities Automatically
{% endcta %}

---

🚀 **What security concepts confused you when starting out?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
