---
title: 'Stop Using MD5: A Complete Guide to Node.js Cryptography'
published: false
description: 'MD5 and SHA1 are broken. Here is every crypto anti-pattern ESLint can catch and the secure alternatives.'
tags: nodejs, security, cryptography, eslint
cover_image:
series: Cryptography Security
---

# Stop Using MD5: A Complete Guide to Node.js Cryptography

```javascript
const hash = crypto.createHash('md5').update(password).digest('hex');
```

If this looks normal to you, keep reading.

## The Problem with MD5/SHA1

| Algorithm | Status    | Collision Time | Use Case  |
| --------- | --------- | -------------- | --------- |
| MD5       | 💀 Broken | Seconds        | Never     |
| SHA1      | 💀 Broken | Hours          | Never     |
| SHA256    | ✅ Secure | Impractical    | Hashing   |
| SHA3-256  | ✅ Secure | Impractical    | Hashing   |
| bcrypt    | ✅ Secure | Impractical    | Passwords |

## Anti-Pattern #1: Weak Hash Algorithms

```javascript
// ❌ MD5 is cryptographically broken
const hash = crypto.createHash('md5').update(data);

// ❌ SHA1 is cryptographically broken
const hash = crypto.createHash('sha1').update(data);
```

```javascript
// ✅ Use SHA-256 or SHA-3
const hash = crypto.createHash('sha256').update(data).digest('hex');
```

## Anti-Pattern #2: Hashing Passwords

```javascript
// ❌ Even SHA-256 is wrong for passwords
const hash = crypto.createHash('sha256').update(password);
// Rainbow tables can crack this instantly
```

```javascript
// ✅ Use bcrypt or Argon2 for passwords
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);

// ✅ Or Argon2 (recommended)
import argon2 from 'argon2';
const hash = await argon2.hash(password);
```

## Anti-Pattern #3: Math.random() for Security

```javascript
// ❌ Predictable "random" - NOT cryptographically secure
const token = Math.random().toString(36).substring(2);
const sessionId = Math.random().toString();
```

```javascript
// ✅ Cryptographically secure random
import { randomBytes, randomUUID } from 'crypto';

const token = randomBytes(32).toString('hex');
const sessionId = randomUUID();
```

## Anti-Pattern #4: Static IV/Salt

```javascript
// ❌ Same IV for every encryption
const iv = Buffer.from('1234567890123456');
cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
```

```javascript
// ✅ Random IV for each encryption
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// Store IV with ciphertext
const result = Buffer.concat([iv, cipher.update(data), cipher.final()]);
```

## Anti-Pattern #5: ECB Mode

```javascript
// ❌ ECB mode reveals patterns
const cipher = crypto.createCipher('aes-256-ecb', key);
```

```javascript
// ✅ Use CBC, GCM, or CTR mode
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Anti-Pattern #6: Weak Key Derivation

```javascript
// ❌ Simple hashing for key derivation
const key = crypto.createHash('sha256').update(password).digest();
```

```javascript
// ✅ Use PBKDF2 with sufficient iterations
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

// ✅ Or scrypt (memory-hard)
const key = crypto.scryptSync(password, salt, 32);
```

## Anti-Pattern #7: Timing-Unsafe Comparison

```javascript
// ❌ Vulnerable to timing attacks
if (hash === expectedHash) {
  // Attacker can measure comparison time
}
```

```javascript
// ✅ Constant-time comparison
import { timingSafeEqual } from 'crypto';

const isValid = timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
```

## ESLint Catches All of These

```javascript
// eslint.config.js
import cryptoPlugin from 'eslint-plugin-crypto';

export default [cryptoPlugin.configs.recommended];
```

### 24 Cryptography Rules

| Rule                               | CWE     | What it catches               |
| ---------------------------------- | ------- | ----------------------------- |
| `no-weak-hash-algorithm`           | CWE-328 | MD5, SHA1 usage               |
| `no-sha1-hash`                     | CWE-328 | SHA1 specifically             |
| `no-math-random-crypto`            | CWE-338 | Math.random() for security    |
| `no-static-iv`                     | CWE-329 | Hardcoded IV                  |
| `no-ecb-mode`                      | CWE-327 | ECB mode encryption           |
| `no-weak-cipher-algorithm`         | CWE-327 | DES, RC4, Blowfish            |
| `no-insecure-key-derivation`       | CWE-916 | Simple hash as key            |
| `no-timing-unsafe-compare`         | CWE-208 | String comparison for secrets |
| `require-random-iv`                | CWE-329 | Missing random IV             |
| `require-authenticated-encryption` | CWE-353 | No auth tag                   |
| `require-key-length`               | CWE-326 | Short encryption keys         |
| `no-hardcoded-crypto-key`          | CWE-798 | Keys in source code           |

## Error Messages

```bash
src/auth.ts
  12:27 error  🔒 CWE-328 CVSS:7.5 | Weak hash algorithm: MD5
               Risk: Collision attacks allow forgery
               Fix: Use crypto.createHash('sha256')

  25:10 error  🔒 CWE-338 | Math.random() used for security
               Risk: Predictable output enables token guessing
               Fix: Use crypto.randomBytes(32)
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-crypto %}
📦 npm install eslint-plugin-crypto
{% endcta %}

```javascript
import cryptoPlugin from 'eslint-plugin-crypto';
export default [cryptoPlugin.configs.recommended];
```

**24 rules. NIST-compliant cryptography. Zero weak algorithms.**

---

📦 [npm: eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Search your codebase for 'md5' or 'sha1' right now. What did you find?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
