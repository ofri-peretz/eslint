---
title: 'Why ECB Mode Reveals Your Data Patterns in Node.js'
published: false
description: 'AES-256-ECB encryption leaks patterns. Learn why you should avoid it and how eslint-plugin-node-security blocks it.'
tags: nodejs, security, cryptography, eslint
series: Node.js Security
---

You've probably seen the "Linux Penguin" image encrypted with ECB mode. You can still see the penguin.

**ECB (Electronic Codebook)** mode encrypts each block of data independently. Identical blocks of plaintext = identical blocks of ciphertext. Your encrypted database still reveals the structure of the data.

## The Anti-Pattern

```javascript
// ❌ using aes-256-ecb
const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
```

In Node.js, `createCipheriv` allows this if you pass `null` as the IV (because ECB doesn't use an IV—another weakness).

## The Rule: `node-security/no-ecb-mode`

The linter simply bans the string `ecb` in crypto algo arguments.

```javascript
const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
// Error: 🔒 Insecure encryption mode (ECB) detected (node-security/no-ecb-mode)
```

## The Fix: Use GCM or CBC

Authenticated encryption (GCM) is the gold standard.

```javascript
// ✅ Use AES-256-GCM
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

If you catch yourself typing `ecb`, stop. Install the linter.

---

**Get the plugin:** [eslint-plugin-node-security on npm](https://www.npmjs.com/package/eslint-plugin-node-security)
