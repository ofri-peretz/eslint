---
title: 'Hashing Passwords? crypto.createHash is Wrong'
published: false
description: 'SHA-256 is too fast for passwords. Use scrypt or PBKDF2. eslint-plugin-node-security enforces this.'
tags: nodejs, security, cryptography, eslint, authentication
series: Node.js Security
---

If you are building a login system, you might think: "SHA-256 is secure, I'll use that."

```javascript
// ❌ FAILS SECURITY AUDITS
const hash = crypto.createHash('sha256').update(password).digest('hex');
```

**Why? It's too fast.**
A modern GPU can calculate billions of SHA-256 hashes per second. An attacker with a leaked database can crack your passwords instantly using Rainbow Tables or brute force.

## The Rule: `node-security/no-insecure-key-derivation`

We wrote a rule that understands the intent. If it sees `createHash` being used with variables named like `password`, `pass`, `auth`, it triggers.

```javascript
const hash = crypto.createHash('sha256').update(userPassword);
// Error: 🔒 Do not use fast hashes for passwords (node-security/no-insecure-key-derivation)
```

## The Fix: Slow Hashes

You need "Memory-Hard" or "CPU-Hard" functions (Key Derivation Functions).

### Good: PBKDF2
Built-in to Node.js, standard, and adjustable slows directly.

```javascript
// ✅ PBKDF2
const salt = crypto.randomBytes(16);
crypto.pbkdf2(password, salt, 310000, 32, 'sha256', (err, derivedKey) => {
  if (err) throw err;
  // save salt and derivedKey
});
```

### Better: scrypt
Also built-in and resistant to hardware acceleration attacks.

```javascript
// ✅ scrypt
const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(password, salt, 64);
```

Don't roll your own crypto. And definitely don't use `createHash` for passwords.

---

**Get the plugin:** [eslint-plugin-node-security on npm](https://www.npmjs.com/package/eslint-plugin-node-security)
