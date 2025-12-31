---
title: 'The JWT Algorithm "none" Attack: The Vulnerability in 1 Line of Code'
published: false
description: 'One misconfiguration lets attackers forge any JWT. Here is the attack, the CVE, and the ESLint rule that catches it.'
tags: security, jwt, nodejs, eslint
cover_image:
series: JWT Security
---

# The JWT Algorithm "none" Attack: The Vulnerability in 1 Line of Code

JWT authentication is everywhere. It's also one of the most misconfigured security mechanisms.

**One line of code can compromise everything.**

## The Vulnerable Code

```javascript
// ❌ This looks fine...
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256', 'none'], // 💀 The vulnerability
});
```

## The Attack

```javascript
// 1. Attacker takes a valid JWT:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTYiLCJyb2xlIjoidXNlciJ9.
signature_here

// 2. Modifies the header to use "none" algorithm:
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.
eyJzdWIiOiIxMjM0NTYiLCJyb2xlIjoiYWRtaW4ifQ.
// No signature needed!

// 3. Server accepts it because "none" is in algorithms list
// Attacker is now admin
```

## Real CVEs

| CVE            | Library    | Impact                |
| -------------- | ---------- | --------------------- |
| CVE-2015-2951  | jwt-simple | Algorithm confusion   |
| CVE-2016-10555 | jose2go    | None algorithm bypass |
| CVE-2018-0114  | node-jose  | Key confusion         |

## The Fix

```javascript
// ✅ Explicitly whitelist algorithms
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'], // Only what you use!
});
```

## All JWT Vulnerabilities

### 1. Algorithm None

```javascript
// ❌ Dangerous
jwt.verify(token, secret, { algorithms: ['none'] });

// ✅ Safe
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

### 2. Algorithm Confusion

```javascript
// ❌ Dangerous: RS256 token verified with symmetric secret
jwt.verify(token, publicKey);

// ✅ Safe: Explicit algorithm
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### 3. Weak Secret

```javascript
// ❌ Dangerous: Brute-forceable
jwt.sign(payload, 'password123');

// ✅ Safe: Strong secret
jwt.sign(payload, process.env.JWT_SECRET); // 256+ bits
```

### 4. Missing Expiration

```javascript
// ❌ Dangerous: Token valid forever
jwt.sign({ userId: 123 }, secret);

// ✅ Safe: Short expiration
jwt.sign({ userId: 123 }, secret, { expiresIn: '1h' });
```

### 5. Sensitive Payload

```javascript
// ❌ Dangerous: Password in token (tokens can be decoded!)
jwt.sign({ userId: 123, password: 'secret' }, key);

// ✅ Safe: Only IDs
jwt.sign({ userId: 123 }, key);
```

## ESLint Coverage

```javascript
// eslint.config.js
import jwtPlugin from 'eslint-plugin-jwt';

export default [jwtPlugin.configs.recommended];
```

### 13 JWT Rules

| Rule                          | CWE     | What it catches          |
| ----------------------------- | ------- | ------------------------ |
| `no-algorithm-none`           | CWE-347 | Algorithm "none" allowed |
| `no-algorithm-confusion`      | CWE-327 | RS/HS confusion attacks  |
| `no-weak-secret`              | CWE-326 | Brute-forceable secrets  |
| `no-hardcoded-secret`         | CWE-798 | Secrets in code          |
| `no-sensitive-payload`        | CWE-312 | PII in tokens            |
| `require-expiration`          | CWE-613 | Missing exp claim        |
| `require-algorithm-whitelist` | CWE-327 | No explicit algorithms   |
| `require-issuer-validation`   | CWE-345 | Missing iss check        |
| `require-audience-validation` | CWE-345 | Missing aud check        |
| `no-decode-without-verify`    | CWE-347 | jwt.decode() misuse      |
| `require-issued-at`           | CWE-613 | Missing iat claim        |
| `require-max-age`             | CWE-613 | No maxAge in verify      |
| `no-timestamp-manipulation`   | CWE-345 | Clock skew exploits      |

## Error Messages

```bash
src/auth.ts
  15:3  error  🔒 CWE-347 CVSS:9.8 | JWT algorithm 'none' is allowed
               Risk: Attackers can forge tokens without a signature
               Fix: Remove 'none' from algorithms: ['HS256']
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-jwt %}
📦 npm install eslint-plugin-jwt
{% endcta %}

```javascript
import jwtPlugin from 'eslint-plugin-jwt';
export default [jwtPlugin.configs.recommended];
```

**13 rules. Full JWT security. Zero false positives.**

---

📦 [npm: eslint-plugin-jwt](https://www.npmjs.com/package/eslint-plugin-jwt)
📖 [Rule: no-algorithm-none](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-jwt/docs/rules/no-algorithm-none.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Check your JWT config now. Is "none" in your algorithms?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
