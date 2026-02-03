---
title: 'Timing Attacks: Why String Comparison is Dangerous in Node.js'
published: false
description: 'Comparing secrets with === leaks information. Learn how to use timingSafeEqual properly.'
tags: nodejs, security, cryptography, eslint
series: Node.js Security
---

```javascript
if (userToken === expectedToken) {
  // Authorized
}
```

This comparison **leaks information**. It's vulnerable to a **Timing Attack**.

## How Timing Attacks Work

When you use `===`, the comparison stops at the first mismatching character.

- `'abc' === 'xyz'` failure happens instantly (index 0).
- `'abc' === 'abz'` failure happens slightly later (index 2).

An attacker can measure these microsecond differences to guess your secret token, character by character.

## The Rule: `node-security/no-timing-unsafe-compare`

Our plugin, `eslint-plugin-node-security`, detects when you use insecure comparison operators on sensitive variable names (like `token`, `secret`, `hash`, `key`).

```javascript
// ❌ Catching unsafe comparison of potentially sensitive values
if (req.headers.token === process.env.SECRET_TOKEN) {
  return true;
}
// Error: 🔒 Timing-unsafe comparison checking on 'token' detected (node-security/no-timing-unsafe-compare)
```

## The Fix: `crypto.timingSafeEqual`

Node.js provides a built-in method for constant-time comparison.

```javascript
import { timingSafeEqual } from 'node:crypto';

// ✅ Constant time comparison
const userBuf = Buffer.from(userToken);
const secretBuf = Buffer.from(expectedToken);

// Always check length first to prevent errors
if (userBuf.length === secretBuf.length && timingSafeEqual(userBuf, secretBuf)) {
  // Authorized
}
```

`timingSafeEqual` always takes the same amount of time to execute, regardless of where the characters differ, making the timing attack impossible.

## Automate This Check

Don't hope you remember this. Enforce it.

```javascript
// eslint.config.js
import nodeSecurity from 'eslint-plugin-node-security';

export default [
    nodeSecurity.configs.recommended
];
```

Your CI/CD pipeline is now timing-attack resistant.

---

**Get the plugin:** [eslint-plugin-node-security on npm](https://www.npmjs.com/package/eslint-plugin-node-security)
