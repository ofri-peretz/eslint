---
title: 'Getting Started with eslint-plugin-crypto'
published: true
description: 'Cryptography security in 60 seconds. 24 rules for weak algorithms, random generation, and key management.'
tags: cryptography, security, nodejs, tutorial
cover_image:
series: Getting Started
---

**24 cryptography rules. Weak algorithms. Secure random. Key management.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-crypto
```

## Flat Config

```javascript
// eslint.config.js
import crypto from 'eslint-plugin-crypto';

export default [crypto.configs.recommended];
```

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/hash.ts
  15:27 error  🔒 CWE-328 CVSS:7.5 | Weak hash algorithm: MD5
               Fix: Use crypto.createHash('sha256')

src/token.ts
  28:22 error  🔒 CWE-338 | Math.random() used for security
               Fix: Use crypto.randomBytes(32).toString('hex')
```

## Rule Overview

| Category             | Rules | Examples                            |
| -------------------- | ----- | ----------------------------------- |
| Hash Algorithms      | 3     | MD5, SHA1, weak hash                |
| Random Generation    | 3     | Math.random(), predictable salt     |
| Symmetric Encryption | 6     | ECB mode, static IV, weak cipher    |
| Key Management       | 4     | Hardcoded keys, weak key derivation |
| Timing Attacks       | 1     | Unsafe string comparison            |
| Key Length           | 2     | Short keys, insufficient entropy    |

## Quick Wins

### Before

```javascript
// ❌ Weak hash
crypto.createHash('md5').update(data);

// ❌ Predictable random
const token = Math.random().toString(36);

// ❌ ECB mode
crypto.createCipheriv('aes-256-ecb', key, null);
```

### After

```javascript
// ✅ Strong hash
crypto.createHash('sha256').update(data);

// ✅ Secure random
const token = crypto.randomBytes(32).toString('hex');

// ✅ GCM mode
crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Available Presets

```javascript
// Security-focused configuration
crypto.configs.recommended;

// All rules enabled
crypto.configs.all;
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-crypto

# Config (eslint.config.js)
import crypto from 'eslint-plugin-crypto';
export default [crypto.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-crypto](https://www.npmjs.com/package/eslint-plugin-crypto)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-crypto/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **grep -r "md5" in your codebase!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
