---
title: 'The Encryption Mistake 90% of Node.js Devs Make: Static IVs'
published: false
description: 'Reusing an Initialization Vector (IV) destroys your encryption security. See how eslint-plugin-node-security catches this.'
tags: nodejs, security, cryptography, eslint
series: Node.js Security
---

You're using AES-256-GCM. You have a strong key. But you hardcoded the IV.

```javascript
const iv = Buffer.from('1234567890123456'); // ❌ Static IV
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

**Congratulations, your encryption is now broken.**

Reusing an IV with the same key means that identical plaintexts produce identical ciphertexts. In some modes (like GCM), it can even allow attackers to recover the key.

## The Rule: `node-security/no-static-iv`

`eslint-plugin-node-security` scans your usage of `createCipheriv` and checks where the IV comes from.

```javascript
// ❌ Detecting a variable that doesn't look effectively random or is a literal
const iv = Buffer.alloc(16, 0); 
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
// Error: 🔒 Static Initialization Vector (IV) detected (node-security/no-static-iv)
```

## The Fix: `crypto.randomBytes`

You must generate a new, random IV for *every single message*.

```javascript
// ✅ Generate random IV
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// Store the IV alongside the ciphertext (it's not secret, just needs to be unique)
const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()]);
```

## Why Linter?

Because it's easy to copy-paste a StackOverflow example with a hardcoded IV "just to get it working" and forget to change it. The linter won't let you commit that.

---

**Get the plugin:** [eslint-plugin-node-security on npm](https://www.npmjs.com/package/eslint-plugin-node-security)
