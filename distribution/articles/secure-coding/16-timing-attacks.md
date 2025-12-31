---
title: "Timing Attacks: The Side-Channel You're Ignoring"
published: false
description: "String comparison leaks information through timing. Here's how attackers exploit it and how to defend."
tags: javascript, security, cryptography, nodejs
cover_image:
canonical_url:
---

# Timing Attacks: The Side-Channel You're Ignoring

```javascript
if (providedToken === storedToken) {
  grantAccess();
}
```

This code is vulnerable. The comparison leaks information through time.

## How It Works

String comparison (`===`) typically:

1. Compares characters one by one
2. Returns `false` on first mismatch
3. Returns `true` if all characters match

The time taken reveals how many characters matched:

| Input      | Match   | Time   |
| ---------- | ------- | ------ |
| `a0000000` | 1 char  | ≈0.1ms |
| `abcd0000` | 4 chars | ≈0.4ms |
| `abcdefgh` | 8 chars | ≈0.8ms |

## The Attack

1. Attacker measures response time for different first characters
2. Finds `a` is slower than `b-z` → First char is `a`
3. Repeat for each position
4. Eventually recovers entire secret

With enough precision, an 8-char token can be brute-forced in ~256 requests, not 2^64.

## Vulnerable Patterns

```javascript
// ❌ All of these are timing-vulnerable
if (userToken === secretToken) { ... }
if (userToken == secretToken) { ... }
if (password === storedHash) { ... }
if (signature === expectedSignature) { ... }
if (apiKey !== validKey) { ... }
```

## The Fix: Constant-Time Comparison

```javascript
import crypto from 'crypto';

// ✅ Constant-time comparison
function secureCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ✅ Usage
if (secureCompare(providedToken, storedToken)) {
  grantAccess();
}
```

`timingSafeEqual` compares all bytes regardless of where mismatches occur.

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

String comparisons with sensitive-looking variable names trigger:

```bash
src/auth.ts
  12:5  error  🔒 CWE-208 OWASP:A02 CVSS:5.9 | Potential timing attack
               Fix: Use crypto.timingSafeEqual() for secret comparison
```

## Detection Heuristics

The rule flags comparisons involving:

- Variables named `*token*`, `*secret*`, `*key*`, `*password*`
- Variables named `*signature*`, `*hash*`, `*credential*`
- Variables named `*apiKey*`, `*authCode*`

## Not Just Passwords

Timing attacks affect:

- API key validation
- HMAC signature verification
- Session token comparison
- CSRF token validation
- OAuth state parameter checks

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Equal time for equal security.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-timing-attack](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-timing-attack.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
