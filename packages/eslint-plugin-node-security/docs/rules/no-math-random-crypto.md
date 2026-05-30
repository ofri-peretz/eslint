---
title: no-math-random-crypto
description: Disallow Math.random() for cryptographic purposes (tokens, keys, secrets, salts, IVs)
tags: ['security', 'cryptography', 'cwe-338', 'nodejs']
category: security
severity: critical
cwe: CWE-338
owasp: 'A02:2021'
autofix: false
---

> **Keywords:** Math.random, insecure randomness, CSPRNG, token generation, session id, CWE-338, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-338](https://cwe.mitre.org/data/definitions/338.html)
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

<!-- @rule-summary -->

Disallow Math.random() for cryptographic purposes (tokens, keys, secrets, salts, IVs)

<!-- @/rule-summary -->

Detects `Math.random()` used in a cryptographic context in Node.js code. `Math.random()` is a non-cryptographic PRNG: its output is predictable and must never seed tokens, keys, passwords, salts, IVs, nonces, or session identifiers. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

> Migrated from the deprecated standalone `crypto` plugin into `eslint-plugin-node-security`, which now ships every cryptography rule that plugin had — including this one.

## Rule Details

The rule flags `Math.random()` only when the value flows into a cryptographic context, so benign randomness (shuffles, jitter, sampling, UI) does not trigger it. A context is treated as cryptographic when the result is:

- assigned to a variable or property whose name matches `token`, `key`, `secret`, `password`, `salt`, `iv`, `nonce`, `seed`, `session`, `csrf`, `otp`, `pin`, `auth`, `verify`, etc.; or
- returned from a function whose name suggests credential/token generation.

### ❌ Incorrect

```js
function generateSessionToken() {
  return Math.random().toString(36).substring(2); // CWE-338: predictable token
}

const apiKey = Math.random().toString(36);
```

### ✅ Correct

```js
import { randomBytes, randomUUID } from 'node:crypto';

function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

const requestId = randomUUID();

// Non-crypto randomness is fine — not flagged
const j = Math.floor(Math.random() * deck.length);
```

## Options

```js
{
  "node-security/no-math-random-crypto": ["error", { "allowInTests": false }]
}
```

- `allowInTests` (default `false`) — when `true`, allows `Math.random()` in `*.test.*` / `*.spec.*` files.

## When Not To Use

If your codebase never uses `Math.random()` for anything security-sensitive and you want zero overhead, you can disable it — but the context-aware heuristic is designed to stay silent on non-crypto randomness, so leaving it on `error` is recommended.

## Further Reading

- [OWASP — Secure Random Number Generation](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#secure-random-number-generation)
- [Node.js `crypto.randomBytes()`](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback)
- [CWE-338](https://cwe.mitre.org/data/definitions/338.html)
