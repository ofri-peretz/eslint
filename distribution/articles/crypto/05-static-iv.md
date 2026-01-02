---
title: 'Static IV: Why Your Encryption is Predictable'
published: false
description: 'Reusing the same IV breaks encryption security. Here is why and how to generate random IVs correctly.'
tags: cryptography, security, encryption, eslint
cover_image:
series: Cryptography Security
---

```javascript
const iv = Buffer.from('1234567890123456'); // Static!
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
```

Same IV + same key = **same ciphertext for same plaintext**.

## The Problem

```javascript
// Message 1
encrypt('hello', key, staticIV); // → "abc123..."

// Message 2
encrypt('hello', key, staticIV); // → "abc123..." (same!)

// Attacker knows: same ciphertext = same message
```

## Why It Matters

| Attack             | Static IV Risk                    |
| ------------------ | --------------------------------- |
| Pattern detection  | Repeated messages visible         |
| Chosen plaintext   | Can determine if guess is correct |
| Block manipulation | CBC bit-flipping easier           |

## The Fix

```javascript
// ✅ Random IV for each encryption
const iv = crypto.randomBytes(16); // 128 bits for AES
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// Prepend IV to ciphertext (IV is not secret)
const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()]);
```

## Complete Pattern

```javascript
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: IV + authTag + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(data, key) {
  const buffer = Buffer.from(data, 'base64');
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted) + decipher.final('utf8');
}
```

## ESLint Rules

```javascript
import cryptoPlugin from 'eslint-plugin-crypto';

export default [
  {
    rules: {
      'crypto/no-static-iv': 'error',
      'crypto/require-random-iv': 'error',
    },
  },
];
```

## Quick Install


---

📦 [npm: eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto)

---

🚀 **Is your IV random for every encryption?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
