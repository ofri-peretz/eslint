---
title: 'Weak Crypto Still Ships in 2025'
published: false
description: "MD5 and SHA1 are broken. Yet they still appear in production code. Here's why and how ESLint prevents it."
tags: javascript, security, cryptography, nodejs
cover_image:
canonical_url:
---

# Weak Crypto Still Ships in 2025

MD5 was broken in 2004. SHA1 in 2017.

It's 2025. They're still in your codebase.

## The Problem

```javascript
// ❌ Still seen in production
const hash = crypto.createHash('md5').update(password).digest('hex');
const checksum = crypto.createHash('sha1').update(data).digest('hex');
```

"But it's just for checksums." "We're not using it for passwords."

Until you are. Until someone copies that pattern. Until it becomes a vulnerability.

## Why These Are Broken

| Algorithm | Status         | Attack                 |
| --------- | -------------- | ---------------------- |
| **MD5**   | Broken (2004)  | Collision in seconds   |
| **SHA1**  | Broken (2017)  | Collision demonstrated |
| **DES**   | Broken (1990s) | Brute force viable     |
| **RC4**   | Broken (2015)  | Statistical attacks    |

## Real-World Impact

- **Flame malware (2012)**: Used MD5 collision to forge Microsoft certificate
- **SHA1 collision (2017)**: Google created two different PDFs with same hash
- **SSL/TLS downgrade**: Legacy crypto enables man-in-the-middle

## The Correct Algorithms

```javascript
// ✅ For hashing data
const hash = crypto.createHash('sha256').update(data).digest('hex');

// ✅ For hashing passwords (use bcrypt or argon2)
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);

// ✅ For encryption
import { createCipheriv, randomBytes } from 'crypto';
const key = randomBytes(32); // 256-bit key
const iv = randomBytes(16);
const cipher = createCipheriv('aes-256-gcm', key, iv);
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Now weak algorithms are caught:

```bash
src/auth.ts
  15:17  error  🔒 CWE-327 OWASP:A02 CVSS:7.5 | Weak cryptographic algorithm: MD5
                Fix: Use crypto.createHash('sha256') or bcrypt for passwords

  22:17  error  🔒 CWE-327 OWASP:A02 CVSS:7.5 | Weak cryptographic algorithm: DES
                Fix: Use aes-256-gcm for encryption
```

## The Six Crypto Rules

| Rule                       | Catches                      |
| -------------------------- | ---------------------------- |
| `no-weak-crypto`           | MD5, SHA1, DES, RC4          |
| `no-insufficient-random`   | Math.random() for security   |
| `no-timing-attack`         | String comparison of secrets |
| `no-insecure-comparison`   | Non-constant-time comparison |
| `no-insecure-jwt`          | JWT with 'none' algorithm    |
| `no-hardcoded-credentials` | Secrets in source            |

## Crypto Checklist

| Use Case         | Recommended                   |
| ---------------- | ----------------------------- |
| Password hashing | bcrypt (cost 12+) or argon2id |
| Data hashing     | SHA-256 or SHA-3              |
| Signatures       | HMAC-SHA256 or Ed25519        |
| Encryption       | AES-256-GCM                   |
| Random values    | crypto.randomBytes()          |

## Quick Install

```bash
npm install --save-dev eslint-plugin-secure-coding
```

```javascript
import secureCoding from 'eslint-plugin-secure-coding';
export default [secureCoding.configs.recommended];
```

Stop shipping broken crypto. Enforce modern algorithms.

---

📦 [npm: eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)
📖 [Rule docs: no-weak-crypto](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-weak-crypto.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
