---
title: 'Stop Using MD5: A Complete Guide to Node.js Cryptography'
published: false
description: 'MD5 and SHA1 are broken. Here is how to detect them in your Node.js apps using eslint-plugin-node-security.'
tags: nodejs, security, cryptography, eslint
series: Node.js Security
---

```javascript
const hash = crypto.createHash('md5').update(password).digest('hex');
```

If this looks normal to you, keep reading. In 2026, **MD5 is not just "weak"—it's broken.**

But existing tools often miss this. That's why we built `eslint-plugin-node-security`.

## The Problem with MD5/SHA1

| Algorithm | Status    | Collision Time | Use Case  |
| --------- | --------- | -------------- | --------- |
| MD5       | 💀 Broken | Seconds        | Never     |
| SHA1      | 💀 Broken | Hours          | Never     |
| SHA256    | ✅ Secure | Impractical    | Hashing   |

## Anti-Pattern #1: Weak Hash Algorithms

The `node-security/no-weak-hash-algorithm` rule specifically targets the Node.js `crypto` module.

```javascript
// ❌ MD5 is cryptographically broken
const hash = crypto.createHash('md5').update(data);
// Error: 🔒 Weak hash algorithm detected: md5 (node-security/no-weak-hash-algorithm)

// ❌ SHA1 is cryptographically broken
const hash = crypto.createHash('sha1').update(data);
// Error: 🔒 Weak hash algorithm detected: sha1 (node-security/no-sha1-hash)
```

**The Fix:**

```javascript
// ✅ Use SHA-256 or SHA-3
const hash = crypto.createHash('sha256').update(data).digest('hex');
```

## Anti-Pattern #2: Hashing Passwords with `createHash`

Even if you use a strong algorithm like SHA-256, `crypto.createHash` is **wrong for passwords**.

```javascript
// ❌ Even SHA-256 is too fast for passwords
const hash = crypto.createHash('sha256').update(password);
// Error: 🔒 Do not use fast hashes for passwords (node-security/no-insecure-key-derivation)
```

**The Fix:** Use `scrypt` or `pbkdf2`.

```javascript
// ✅ Use scrypt (memory-hard)
const key = crypto.scryptSync(password, salt, 64);
```

## Setup eslint-plugin-node-security

Stop relying on manual code reviews to catch crypto mistakes.

1.  **Install the plugin:**

    ```bash
    npm install --save-dev eslint-plugin-node-security
    ```

2.  **Add to your configuration:**

    ```javascript
    // eslint.config.js
    import nodeSecurity from 'eslint-plugin-node-security';

    export default [
      nodeSecurity.configs.recommended,
    ];
    ```

Now, your build will fail if anyone tries to sneak in an MD5 hash.

---

**Get the plugin:** [eslint-plugin-node-security on npm](https://www.npmjs.com/package/eslint-plugin-node-security)
