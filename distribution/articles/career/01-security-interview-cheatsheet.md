---
title: 'The Security Engineer Interview Cheat Sheet for JavaScript Developers'
published: true
description: 'Landing a security-focused role? Here are the 15 JavaScript security concepts interviewers actually ask about—with code examples.'
tags: career, security, javascript, interview
cover_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zk4jc9lawnhiojvr86tr.png
canonical_url: https://dev.to/ofri-peretz/the-security-engineer-interview-cheat-sheet-for-javascript-developers-pgn
series: Career Growth
---

As an Engineering Manager, I've interviewed 50+ full-stack and backend candidates. Security questions are part of almost every technical interview—even for roles that aren't explicitly "security." Here are the 15 concepts that separate the prepared from the panicked.

## The Fundamentals (Asked 90% of the time)

### 1. "What is SQL Injection and how do you prevent it?"

```javascript
// ❌ Vulnerable
db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ Safe
db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Key phrase**: "Parameterized queries separate data from code."

### 2. "What is XSS and what are the three types?"

- **Stored XSS**: Malicious script saved to database
- **Reflected XSS**: Script in URL reflected back
- **DOM XSS**: Script manipulates DOM directly

```javascript
// ❌ DOM XSS
element.innerHTML = userInput;

// ✅ Safe
element.textContent = userInput;
```

### 3. "How do you store passwords securely?"

```javascript
// ❌ Never
const hash = crypto.createHash('md5').update(password);

// ✅ Always
const hash = await bcrypt.hash(password, 12);
```

**Key phrases**: "bcrypt", "argon2", "salt", "work factor"

## Intermediate (Asked 70% of the time)

### 4. "What is CSRF and how do you prevent it?"

**Cross-Site Request Forgery**: Attacker tricks authenticated user into performing actions.

**Prevention**: Synchronizer tokens, SameSite cookies, origin validation.

### 5. "Explain the Same-Origin Policy"

Browsers block requests to different origins (scheme + host + port).

**Bypass mechanisms**: CORS headers, JSONP (deprecated), postMessage.

### 6. "What are timing attacks?"

```javascript
// ❌ Vulnerable (leaks information via timing)
if (userToken === secretToken) {
}

// ✅ Safe (constant-time comparison)
crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(secretToken));
```

### 7. "How do you handle JWTs securely?"

- Always verify signature
- Check expiration (`exp`)
- Don't use `algorithm: 'none'`
- Store in httpOnly cookies, not localStorage

## Advanced (Asked 50% of the time)

### 8. "What is prototype pollution?"

```javascript
// ❌ Vulnerable
obj[key] = value; // If key = "__proto__", pollutes Object.prototype

// ✅ Safe
if (key !== '__proto__' && key !== 'constructor') {
  obj[key] = value;
}
```

### 9. "Explain Content Security Policy"

HTTP header that restricts what resources can load:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123'
```

### 10. "What is ReDoS?"

Regular Expression Denial of Service:

```javascript
// ❌ Evil regex (catastrophic backtracking)
const regex = /^(a+)+$/;
regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaa!'); // Hangs
```

## Architecture Questions (Asked 40% of the time)

### 11. "How would you design a secure authentication system?"

- Password hashing (bcrypt/argon2)- Rate limiting on login- Account lockout after failures
- MFA option
- Secure session management
- Password reset via email (time-limited tokens)

### 12. "What's your approach to secrets management?"

- Environment variables (minimum)
- Secrets managers (AWS Secrets Manager, Vault)
- No secrets in code or git history
- Rotation policies

### 13. "How do you secure a REST API?"

- Authentication (JWT, OAuth2)
- Authorization (RBAC, ABAC)
- Input validation
- Rate limiting
- HTTPS only
- CORS configuration

## The "How Do You Stay Current?" Question

**Good answers**:

- "I follow OWASP updates"
- "I use automated security linting"
- "I read CVE disclosures"
- "I contribute to security tools"

**Great answer**:
"I enforce security automatically. My ESLint config includes security rules that catch 80% of common vulnerabilities before code review."

## Quick Reference Card

| Vulnerability  | Prevention            | CWE     |
| -------------- | --------------------- | ------- |
| SQL Injection  | Parameterized queries | CWE-89  |
| XSS            | Output encoding       | CWE-79  |
| CSRF           | Tokens + SameSite     | CWE-352 |
| Broken Auth    | MFA + secure sessions | CWE-287 |
| Sensitive Data | Encryption            | CWE-311 |
| Injection      | Input validation      | CWE-20  |

---

## Enforce It Automatically

Each vulnerability category has a dedicated ESLint plugin:

| Category      | Plugin                                                                                       | Rules |
| ------------- | -------------------------------------------------------------------------------------------- | ----- |
| SQL Injection | [`eslint-plugin-pg`](https://npmjs.com/package/eslint-plugin-pg)                             | 13    |
| XSS/Browser   | [`eslint-plugin-browser-security`](https://npmjs.com/package/eslint-plugin-browser-security) | 8     |
| Crypto/Timing | [`eslint-plugin-crypto`](https://npmjs.com/package/eslint-plugin-crypto)                     | 10    |
| JWT Security  | [`eslint-plugin-jwt`](https://npmjs.com/package/eslint-plugin-jwt)                           | 6     |
| Auth/Secrets  | [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding)       | 89    |

```bash
# Install the full security suite
npm install --save-dev eslint-plugin-secure-coding
npm install --save-dev eslint-plugin-crypto
npm install --save-dev eslint-plugin-jwt
npm install --save-dev eslint-plugin-pg
npm install --save-dev eslint-plugin-browser-security
```

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star the Interlace ESLint Ecosystem
{% endcta %}

---

🚀 **What security questions have you been asked in interviews?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)