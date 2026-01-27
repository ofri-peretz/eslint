---
title: no-cryptojs-weak-random
description: Disallow crypto-js WordArray.random() (CVE-2020-36732)
category: security
severity: critical
tags: ['security', 'cryptography', 'cwe-338', 'nodejs', 'cve']
autofix: false
cwe: CWE-338
cve: CVE-2020-36732
owasp: A02:2021-Cryptographic-Failures
---

> **Keywords:** crypto-js, WordArray.random, weak random, Math.random, CVE-2020-36732, CWE-338, ESLint rule
> **CWE:** [CWE-338](https://cwe.mitre.org/data/definitions/338.html)  
> **CVE:** [CVE-2020-36732](https://nvd.nist.gov/vuln/detail/CVE-2020-36732)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

Detects usage of `crypto-js` `WordArray.random()` which used insecure `Math.random()` in versions prior to 3.2.1. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| **CWE Reference** | [CWE-338](https://cwe.mitre.org/data/definitions/338.html) (Weak PRNG) |
| **CVE Reference** | [CVE-2020-36732](https://nvd.nist.gov/vuln/detail/CVE-2020-36732)      |
| **Severity**      | Critical (security vulnerability)                                      |
| **Auto-Fix**      | 💡 Suggests crypto.randomBytes()                                       |
| **Category**      | Security                                                               |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                |
| **Best For**      | Projects using or migrating from crypto-js                             |

## Vulnerability and Risk

**Vulnerability:** In crypto-js versions prior to 3.2.1, `CryptoJS.lib.WordArray.random()` used JavaScript's `Math.random()` for generating random bytes. `Math.random()` is not cryptographically secure and produces predictable values.

**Risk:** Keys, IVs, salts, and tokens generated with this function are predictable. An attacker can reproduce the random values and decrypt data, forge signatures, or bypass authentication.

## Rule Details

This rule detects:

- `CryptoJS.lib.WordArray.random()`
- `WordArray.random()`
- `CryptoJS.random()`

## Why This Matters

| Risk                      | Impact                             | Solution                         |
| ------------------------- | ---------------------------------- | -------------------------------- |
| 🎲 **Predictable Random** | Generated values can be reproduced | Use crypto.randomBytes()         |
| 🔑 **Weak Keys/IVs**      | Encryption keys become guessable   | Migrate to native CSPRNG         |
| 🔓 **Token Forge**        | Session tokens can be predicted    | Never use Math.random for crypto |

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `false` | Allow in test files |

```javascript
{
  rules: {
    'node-security/no-cryptojs-weak-random': ['error', {
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import CryptoJS from 'crypto-js';

// Weak random - uses Math.random() in versions < 3.2.1
const salt = CryptoJS.lib.WordArray.random(16); // ❌ CVE-2020-36732

// Generating IV with weak random
const iv = WordArray.random(16); // ❌ Predictable IV

// Generating key material
const key = CryptoJS.lib.WordArray.random(32); // ❌ Weak key
```

### ✅ Correct

```typescript
import crypto from 'node:crypto';

// Use cryptographically secure random bytes
const salt = crypto.randomBytes(16); // ✅ Uses OS CSPRNG

// Generating IV
const iv = crypto.randomBytes(16); // ✅ Secure

// Generating key material
const keyBytes = crypto.randomBytes(32); // ✅ Secure

// In browsers, use Web Crypto API
const browserRandom = new Uint8Array(16);
globalThis.crypto.getRandomValues(browserRandom); // ✅ Secure
```

## CVE-2020-36732 Details

- **Affected Versions:** crypto-js < 3.2.1
- **CVSS Score:** 7.5 (High)
- **Attack Vector:** Remote
- **Issue:** Used `Math.random()` which has only 2^52 possible states

### The Problem with Math.random()

```javascript
// Math.random() internals (V8 example)
// Uses xorshift128+ with only 128 bits of state
// State can be reconstructed from ~5 outputs
// NOT suitable for cryptographic use

// DO NOT USE for crypto:
const weakKey = Array.from({ length: 32 }, () =>
  Math.floor(Math.random() * 256),
);
```

## Security Impact

| Vulnerability        | CWE | OWASP    | CVSS       | Impact                    |
| -------------------- | --- | -------- | ---------- | ------------------------- |
| Weak PRNG            | 338 | A02:2021 | 7.5 High   | Predictable crypto values |
| Insufficient Entropy | 331 | A02:2021 | 5.9 Medium | Key material weakness     |

## Migration Guide

### Phase 1: Audit

```bash
# Check crypto-js version
npm list crypto-js
# If < 3.2.1, vulnerable!
```

### Phase 2: Replace

```typescript
// Before (vulnerable)
import CryptoJS from 'crypto-js';
const random = CryptoJS.lib.WordArray.random(32);

// After (secure)
import crypto from 'node:crypto';
const random = crypto.randomBytes(32);
```

### Phase 3: Remove crypto-js

```bash
npm uninstall crypto-js
```

## Related Rules

- [`no-cryptojs`](./no-cryptojs.md) - Detect all crypto-js usage
- [`prefer-native-crypto`](./prefer-native-crypto.md) - Prefer native crypto

## Known False Negatives

### Aliased Imports

**Why**: Aliased references not tracked.

```typescript
// ❌ NOT DETECTED
const rand = CryptoJS.lib.WordArray.random;
rand(16);
```

**Mitigation**: Search for all WordArray references.

## Further Reading

- **[CVE-2020-36732](https://nvd.nist.gov/vuln/detail/CVE-2020-36732)** - Official CVE entry
- **[CWE-338: Weak PRNG](https://cwe.mitre.org/data/definitions/338.html)** - Official CWE entry
- **[Breaking Math.random()](https://blog.securityevaluators.com/hacking-the-javascript-lottery-80cc437e3b7f)** - How Math.random can be predicted
