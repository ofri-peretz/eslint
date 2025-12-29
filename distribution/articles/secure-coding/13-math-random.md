---
title: 'Math.random() is Not Random Enough'
published: false
description: "Using Math.random() for tokens, IDs, or anything security-related? Here's why it's predictable and what to use instead."
tags: javascript, security, cryptography, eslint
cover_image:
canonical_url:
---

# Math.random() is Not Random Enough

```javascript
const token = Math.random().toString(36).slice(2);
```

This code appears in tutorials, Stack Overflow answers, and production codebases.

It's also completely insecure.

## The Problem

`Math.random()` is a **Pseudo-Random Number Generator (PRNG)**. It's:

- **Predictable**: Same seed = same sequence
- **Not cryptographic**: Designed for speed, not security
- **Observable**: Attacker can infer future values from past ones

## The Attack

```javascript
// Attacker observes several tokens:
// 'k8f3j2h9', 'x7m4n1p6', 'q9w2e5r8'

// With enough samples, they can:
// 1. Determine the PRNG state
// 2. Predict future tokens
// 3. Forge valid password reset links
```

This is not theoretical. PRNG state recovery attacks exist for JavaScript engines.

## Where It Goes Wrong

```javascript
// ❌ Session tokens
const sessionId = Math.random().toString(36);

// ❌ Password reset tokens
const resetToken = Math.random().toString(36) + Math.random().toString(36);

// ❌ CSRF tokens
const csrfToken = Math.random().toString(16);

// ❌ API keys
const apiKey = 'key_' + Math.random().toString(36);

// ❌ OTP codes
const otp = Math.floor(Math.random() * 1000000);
```

## The Correct Pattern

```javascript
import crypto from 'crypto';

// ✅ Cryptographically secure random bytes
const token = crypto.randomBytes(32).toString('hex');

// ✅ Secure UUID
const id = crypto.randomUUID();

// ✅ Secure OTP
const otp = crypto.randomInt(100000, 999999);

// ✅ Browser: Web Crypto API
const array = new Uint8Array(32);
crypto.getRandomValues(array);
const token = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join(
  '',
);
```

## Key Differences

| Feature               | Math.random()     | crypto.randomBytes() |
| --------------------- | ----------------- | -------------------- |
| Entropy source        | PRNG algorithm    | OS entropy pool      |
| Predictable           | Yes (with effort) | No                   |
| Suitable for security | ❌ Never          | ✅ Always            |
| Performance           | Faster            | Slightly slower      |

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Insecure randomness is detected:

```bash
src/auth.ts
  8:19  warning  🔒 CWE-330 OWASP:A02 CVSS:5.3 | Insufficient random values
                 Fix: Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive values
```

## When Math.random() is Fine

| Use Case              | Safe?    |
| --------------------- | -------- |
| Shuffling UI elements | ✅       |
| Random colors         | ✅       |
| Game mechanics        | ✅       |
| Test data             | ✅       |
| Tokens/keys/secrets   | ❌ Never |
| Session IDs           | ❌ Never |
| Password resets       | ❌ Never |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Use real randomness for real security.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-insufficient-random](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insufficient-random.md)

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
