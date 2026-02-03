---
title: 'DES, RC4, and Blowfish: The Ghost of Crypto Past'
published: false
description: 'Legacy crypto algorithms are hiding in your codebase. Here is how to clean them up with eslint-plugin-node-security.'
tags: nodejs, security, cryptography, eslint
series: Node.js Security
---

We've all inherited that one legacy codebase. The one written in 2014. The one that still uses `blowfish` because "it was fast."

These algorithms are considered **broken** or **weak** by modern standards.

- **DES**: 56-bit key is trivial to brute force.
- **RC4**: Biases in the keystream (remember the WEP hacks?).
- **Blowfish**: Small block size (64-bit) makes it vulnerable to birthday attacks (Sweet32).

## The Rule: `node-security/no-weak-cipher-algorithm`

You don't need to be a cryptographer to know which strings to ban. The plugin does it for you.

```javascript
// ❌ Legacy crypto
const cipher = crypto.createCipheriv('des-ede3', key, null);
// Error: 🔒 Weak cipher algorithm detected: des (node-security/no-weak-cipher-algorithm)

const cipher2 = crypto.createCipheriv('rc4', key, null);
// Error: 🔒 Weak cipher algorithm detected: rc4 (node-security/no-weak-cipher-algorithm)
```

## The Fix: Upgrade to AES

The industry standard is AES (Advanced Encryption Standard).

```javascript
// ✅ Upgrade to AES-256-GCM
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

## Action Plan

1.  Installing `eslint-plugin-node-security`.
2.  Run `eslint .`
3.  See if any ghosts from 2014 are haunting your code.

---

**Get the plugin:** [eslint-plugin-node-security on npm](https://www.npmjs.com/package/eslint-plugin-node-security)
