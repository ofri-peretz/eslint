---
title: 'ECB Mode: The Encryption Pattern That Reveals Your Data'
published: false
description: 'ECB mode encryption shows patterns in your data. Here is the famous ECB penguin and why you should use CBC/GCM.'
tags: security, cryptography, encryption, eslint
cover_image:
series: Cryptography Security
---

# ECB Mode: The Encryption Pattern That Reveals Your Data

```javascript
const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
```

This encrypted data **still reveals patterns**.

## The ECB Penguin

The most famous example in cryptography:

```
Original Image → ECB Encrypt → Encrypted Image
  [Penguin]         ↓         [Still visible!]
```

In ECB mode, identical blocks encrypt to identical ciphertext. The penguin's shape is visible because:

- White background = same encrypted block
- Black body = different encrypted block
- Pattern preserved!

## Why ECB is Dangerous

### The Problem

```
Plaintext:  [Block A][Block A][Block B][Block A]
ECB Output: [Cipher1][Cipher1][Cipher2][Cipher1]
           Same blocks = Same output!
```

### What This Reveals

- **Structure**: Repetitive data patterns
- **Frequency**: How often values appear
- **Relationships**: Which blocks match

```javascript
// Example: Encrypting user actions
"click_button" → always encrypts to "X8j3..."
"view_profile" → always encrypts to "K2m9..."

// Attacker sees pattern:
"X8j3...", "K2m9...", "X8j3...", "X8j3..."
// Knows: click, view, click, click (even without decrypting)
```

## Encryption Mode Comparison

| Mode | Pattern Safe | IV Required | Auth'd |
| ---- | ------------ | ----------- | ------ |
| ECB  | ❌ No        | No          | ❌     |
| CBC  | ✅ Yes       | Yes         | ❌     |
| CTR  | ✅ Yes       | Yes (nonce) | ❌     |
| GCM  | ✅ Yes       | Yes         | ✅     |

## The Fix: Use GCM

```javascript
// ❌ Dangerous: ECB mode
const cipher = crypto.createCipheriv('aes-256-ecb', key, null);

// ✅ Safe: GCM mode with authentication
const iv = crypto.randomBytes(12); // 96-bit IV for GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// Encrypt
let encrypted = cipher.update(plaintext, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

// Store: IV + encrypted + authTag
const result = iv.toString('hex') + encrypted + authTag.toString('hex');
```

## Complete GCM Pattern

```javascript
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: IV (24 hex) + ciphertext + authTag (32 hex)
  return iv.toString('hex') + encrypted + authTag.toString('hex');
}

function decrypt(ciphertext: string, key: Buffer): string {
  const iv = Buffer.from(ciphertext.slice(0, 24), 'hex');
  const authTag = Buffer.from(ciphertext.slice(-32), 'hex');
  const encrypted = ciphertext.slice(24, -32);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

## Why GCM > CBC

| Feature              | CBC        | GCM       |
| -------------------- | ---------- | --------- |
| Confidentiality      | ✅         | ✅        |
| Authentication       | ❌         | ✅        |
| Parallelizable       | ❌         | ✅        |
| Bit-flipping attacks | Vulnerable | Protected |

```javascript
// CBC is vulnerable to padding oracle attacks
// GCM includes authentication tag to prevent tampering
```

## ESLint Rules

```javascript
// eslint.config.js
import cryptoPlugin from 'eslint-plugin-crypto';

export default [
  {
    rules: {
      'crypto/no-ecb-mode': 'error',
      'crypto/require-authenticated-encryption': 'warn',
      'crypto/require-random-iv': 'error',
    },
  },
];
```

### Error Output

```bash
src/encryption.ts
  15:30 error  🔒 CWE-327 CVSS:7.5 | ECB block cipher mode
               Risk: Identical plaintext blocks produce identical ciphertext
               Fix: Use GCM mode: createCipheriv('aes-256-gcm', key, iv)
```

## Quick Reference

```javascript
// ❌ Dangerous modes
'aes-128-ecb';
'aes-256-ecb';
'des-ecb';

// ✅ Safe modes (prefer GCM)
'aes-256-gcm'; // Best: authenticated
'aes-256-cbc'; // Good: with HMAC
'aes-256-ctr'; // Good: with HMAC
'chacha20-poly1305'; // Excellent: authenticated
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-crypto %}
📦 npm install eslint-plugin-crypto
{% endcta %}

```javascript
import cryptoPlugin from 'eslint-plugin-crypto';
export default [cryptoPlugin.configs.recommended];
```

---

📦 [npm: eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto)
📖 [Rule: no-ecb-mode](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto/docs/rules/no-ecb-mode.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Search your code for 'ecb'. Hopefully nothing!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
