---
title: no-weak-dh-parameters
description: Disallow Diffie-Hellman and ECDH parameters below a safe strength
tags: ['security', 'cryptography', 'cwe-326', 'nodejs']
category: security
severity: high
cwe: CWE-326
owasp: 'A02:2021'
autofix: false
---

> **Keywords:** Diffie-Hellman, DH, ECDH, MODP group, Logjam, weak curve, key agreement, CWE-326, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-326](https://cwe.mitre.org/data/definitions/326.html)
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

<!-- @rule-summary -->

Disallow Diffie-Hellman and ECDH parameters below a safe strength
<!-- @/rule-summary -->

Detects Diffie-Hellman key agreement configured with a modulus or curve too small to resist a precomputation attack. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-326](https://cwe.mitre.org/data/definitions/326.html) (Inadequate Strength) |
| **Severity**      | High (security vulnerability)                                                    |
| **Auto-Fix**      | None — the replacement is a deployment decision                                  |
| **Category**      | Security                                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                          |
| **Best For**      | Node.js services performing key agreement with `node:crypto`                     |

## Vulnerability and Risk

**Vulnerability:** A _named_ Diffie-Hellman group is a fixed prime. The expensive part of breaking DH depends only on that prime, not on the session — so an attacker pays the cost once and then breaks every session that used the group cheaply. This is [Logjam](https://weakdh.org) (CVE-2015-4000): the 512-bit export groups fell to an academic budget, and the 768- and 1024-bit groups (`modp1`, `modp2`) are within reach of a well-resourced adversary.

The same reasoning applies to elliptic curves by field size: a curve under 224 bits does not offer contemporary security margins.

**Risk:** Recorded traffic is decrypted retroactively. Forward secrecy, which is the entire reason for ephemeral key agreement, is lost.

## Rule Details

Three call shapes are checked, all by their literal argument:

| Call                                    | Checked                                |
| --------------------------------------- | -------------------------------------- |
| `crypto.getDiffieHellman(name)`         | MODP group size vs `minPrimeBits`      |
| `crypto.createDiffieHellmanGroup(name)` | MODP group size vs `minPrimeBits`      |
| `crypto.createDiffieHellman(bits)`      | numeric prime length vs `minPrimeBits` |
| `crypto.createECDH(curve)`              | curve against the weak-curve list      |

A constant is followed to its declaration, so `const GROUP = 'modp2'` is the same finding as the literal spelled at the call site.

### What this rule deliberately does not do

- **An unrecognised group name is not reported.** A future RFC group must not become a finding by being unknown to this list.
- **`createDiffieHellman(prime, encoding)` — the string/Buffer overload — is not reported.** That form supplies a prime chosen elsewhere; judging its strength means reading the prime, which a structural rule cannot do.
- **A computed group or curve name is not reported.** There is nothing to measure.

## Why This Matters

| Risk                         | Impact                                                       | Solution                          |
| ---------------------------- | ------------------------------------------------------------ | --------------------------------- |
| 🔓 **Precomputation**        | One offline computation breaks every session using the group | Use `modp14` (2048-bit) or larger |
| 🕰 **Retroactive decryption** | Recorded traffic is readable later                           | Prefer ECDH on a modern curve     |
| 🔒 **Compliance**            | Below NIST SP 800-57 minimums                                | Raise `minPrimeBits` to policy    |

## Configuration

| Option                 | Type       | Default | Description                                       |
| ---------------------- | ---------- | ------- | ------------------------------------------------- |
| `minPrimeBits`         | `integer`  | `2048`  | Smallest acceptable Diffie-Hellman prime, in bits |
| `additionalWeakCurves` | `string[]` | `[]`    | Curves to treat as weak beyond the built-in list  |
| `allowInTests`         | `boolean`  | `false` | Allow weak parameters in test files               |

```javascript
{
  rules: {
    'node-security/no-weak-dh-parameters': ['error', {
      minPrimeBits: 3072,
      additionalWeakCurves: ['brainpoolP224r1'],
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// modp1 is the 768-bit group Logjam broke
const dh = crypto.getDiffieHellman('modp1');

// modp2 is 1024-bit — within reach of a state-level adversary
const dh2 = crypto.getDiffieHellman('modp2');

// A generated prime below the floor
const weak = crypto.createDiffieHellman(1024);

// A curve with a field size under 224 bits
const ecdh = crypto.createECDH('secp192k1');
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// modp14 is the 2048-bit group
const dh = crypto.getDiffieHellman('modp14');

// Or generate at or above the floor
const generated = crypto.createDiffieHellman(3072);

// ECDH on a modern curve
const ecdh = crypto.createECDH('prime256v1');
const wider = crypto.createECDH('secp384r1');
```

## Security Impact

| Vulnerability       | CWE | OWASP    | CVSS         | Impact                  |
| ------------------- | --- | -------- | ------------ | ----------------------- |
| Inadequate Strength | 326 | A02:2021 | 7.5 High     | Retroactive decryption  |
| Broken Crypto       | 327 | A02:2021 | 9.1 Critical | Loss of forward secrecy |

## Migration Guide

### Phase 1: Discovery

Run the rule as a warning to find every key-agreement site:

```javascript
{
  rules: {
    'node-security/no-weak-dh-parameters': 'warn'
  }
}
```

### Phase 2: Replace

Named groups move to `modp14` or larger. Generated primes move to `3072`. Anything doing DH for a new protocol should use ECDH on `prime256v1` or `secp384r1` instead — it is faster and the parameters are not shared across the internet.

### Phase 3: Raise the floor

Once the codebase is clean, set `minPrimeBits` to whatever your compliance regime requires and let the rule hold the line.

## Related Rules

- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) — weak symmetric ciphers
- [`no-weak-hash-algorithm`](./no-weak-hash-algorithm.md) — weak digests
- [`no-insecure-rsa-padding`](./no-insecure-rsa-padding.md) — RSA padding modes

## ⚙️ Options

| Option                 | Type       | Default | Description                                       |
| ---------------------- | ---------- | ------- | ------------------------------------------------- |
| `minPrimeBits`         | `integer`  | `2048`  | Smallest acceptable Diffie-Hellman prime, in bits |
| `additionalWeakCurves` | `string[]` | `[]`    | Curves to treat as weak beyond the built-in list  |
| `allowInTests`         | `boolean`  | `false` | Allow weak parameters in test files               |
