---
title: 'Math.random() is Not Random: Cryptographic Security in JavaScript'
published: false
description: 'Math.random() is predictable. Here is why it is dangerous for security and what to use instead.'
tags: javascript, security, cryptography, eslint
cover_image:
series: Cryptography Security
---

```javascript
const token = Math.random().toString(36).substring(2);
```

This "random" token is **predictable**.

## The Problem

`Math.random()` uses a pseudorandom number generator (PRNG):

- Same seed = same sequence
- Predictable after observing outputs
- Not suitable for security

```javascript
// An attacker who knows your Math.random() state
// can predict ALL future "random" values
```

## Real Attacks

### 1. Session Token Prediction

```javascript
// ❌ Dangerous
function generateSessionId() {
  return Math.random().toString(36).substring(2);
}

// Attacker observes a few tokens → predicts future tokens
// → Hijacks user sessions
```

### 2. Password Reset Token

```javascript
// ❌ Dangerous
function createResetToken() {
  return Math.floor(Math.random() * 1000000).toString();
}

// ~1 million possibilities
// Brute-forceable in seconds
```

### 3. CSRF Token

```javascript
// ❌ Dangerous
function generateCsrfToken() {
  return Math.random().toString(16).slice(2);
}

// Attacker predicts token → CSRF attack succeeds
```

## The Fix: crypto.randomBytes

```javascript
import { randomBytes, randomUUID } from 'crypto';

// ✅ Cryptographically secure token
const token = randomBytes(32).toString('hex');
// 256 bits of entropy - practically unguessable

// ✅ UUID v4
const id = randomUUID();
// 122 bits of entropy
```

## Use Cases

### Session IDs

```javascript
// ❌ Dangerous
const sessionId = Math.random().toString();

// ✅ Secure
import { randomBytes } from 'crypto';
const sessionId = randomBytes(32).toString('hex');
```

### Reset Tokens

```javascript
// ❌ Dangerous: 6-digit code
const code = Math.floor(Math.random() * 1000000);

// ✅ Secure: If you must use numeric codes
import { randomInt } from 'crypto';
const code = randomInt(100000, 999999); // Cryptographic random

// ✅ Better: Long random token
const token = randomBytes(32).toString('hex');
```

### CSRF Tokens

```javascript
// ❌ Dangerous
const csrf = Math.random().toString(36).slice(2);

// ✅ Secure
const csrf = randomBytes(32).toString('base64url');
```

### API Keys

```javascript
// ❌ Dangerous
const apiKey = 'key_' + Math.random().toString(36).slice(2);

// ✅ Secure
const apiKey = 'key_' + randomBytes(24).toString('base64url');
```

## Browser Environment

```javascript
// ❌ Dangerous
const random = Math.random();

// ✅ Secure: Web Crypto API
const array = new Uint8Array(32);
crypto.getRandomValues(array);
const token = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join(
  '',
);

// ✅ Or use randomUUID
const id = crypto.randomUUID();
```

## When Math.random() is OK

```javascript
// ✅ Fine for non-security uses:
const color = colors[Math.floor(Math.random() * colors.length)];
const shuffled = array.sort(() => Math.random() - 0.5);
const dice = Math.ceil(Math.random() * 6);
```

## ESLint Rules

```javascript
// eslint.config.js
import cryptoPlugin from 'eslint-plugin-crypto';

export default [
  {
    rules: {
      'crypto/no-math-random-crypto': 'error',
    },
  },
];
```

### Detection Patterns

The rule triggers when `Math.random()` is used in:

- Token generation functions
- Session/auth-related code
- Crypto-named variables
- Password/secret handling

### Error Output

```bash
src/auth.ts
  15:22 error  🔒 CWE-338 CVSS:7.5 | Math.random() used for security
               Risk: Predictable random values enable attacks
               Fix: Use crypto.randomBytes(32).toString('hex')
```

## Entropy Comparison

| Method               | Entropy  | Security           |
| -------------------- | -------- | ------------------ |
| `Math.random()`      | ~52 bits | ❌ Predictable     |
| `randomInt(1000000)` | ~20 bits | ⚠️ Brute-forceable |
| `randomBytes(16)`    | 128 bits | ✅ Secure          |
| `randomBytes(32)`    | 256 bits | ✅ High security   |
| `randomUUID()`       | 122 bits | ✅ Secure          |

## Quick Install


```javascript
import cryptoPlugin from 'eslint-plugin-crypto';
export default [cryptoPlugin.configs.recommended];
```

---

📦 [npm: eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto)
📖 [Rule: no-math-random-crypto](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto/docs/rules/no-math-random-crypto.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **grep -r "Math.random" in your codebase. How is it used?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
