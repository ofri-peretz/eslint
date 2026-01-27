---
title: no-weak-hash-algorithm
description: Disallow weak hash algorithms (MD5, MD4, SHA-1, RIPEMD)
category: security
severity: high
tags: ['security', 'cryptography', 'cwe-327', 'nodejs']
autofix: false
cwe: CWE-327
owasp: A02:2021-Cryptographic-Failures
---

> **Keywords:** MD5, SHA-1, MD4, RIPEMD, weak hash, cryptography, CWE-327, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

Detects usage of weak hash algorithms (MD5, MD4, SHA-1, RIPEMD) in Node.js crypto operations. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests fixes (SHA-256, SHA-512, SHA-3)                                |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications using crypto.createHash()                             |

## Vulnerability and Risk

**Vulnerability:** MD5, MD4, SHA-1, and RIPEMD are cryptographically broken hash algorithms. They are vulnerable to collision attacks which allow attackers to create different messages with the same hash.

**Risk:** Using weak hash algorithms for security-sensitive operations (password hashing, digital signatures, file integrity) can allow attackers to forge signatures, create colliding files, or perform preimage attacks.

## Rule Details

This rule detects usage of weak hash algorithms in `crypto.createHash()` calls and suggests secure alternatives like SHA-256, SHA-512, or SHA-3.

## Why This Matters

| Risk                     | Impact                                     | Solution                              |
| ------------------------ | ------------------------------------------ | ------------------------------------- |
| 🔓 **Hash Collisions**   | Attackers can create colliding messages    | Migrate to SHA-256, SHA-512, or SHA-3 |
| 📜 **Signature Forgery** | Digital signatures can be forged           | Use SHA-256 minimum for signatures    |
| 🔒 **Compliance**        | Fails PCI-DSS, NIST, and SOC2 requirements | Replace all weak hash usage           |

## Configuration

| Option                     | Type       | Default | Description                        |
| -------------------------- | ---------- | ------- | ---------------------------------- |
| `additionalWeakAlgorithms` | `string[]` | `[]`    | Additional weak algorithms to flag |
| `allowInTests`             | `boolean`  | `false` | Allow weak hashes in test files    |

```javascript
{
  rules: {
    'node-security/no-weak-hash-algorithm': ['error', {
      additionalWeakAlgorithms: ['whirlpool'],
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// MD5 - completely broken
const hash = crypto.createHash('md5').update(data).digest('hex');

// SHA-1 - collision attacks demonstrated
const sha1Hash = crypto.createHash('sha1').update(data).digest('hex');

// MD4 - severely broken
const md4Hash = crypto.createHash('md4').update(data).digest('hex');

// RIPEMD - deprecated
const ripemdHash = crypto.createHash('ripemd160').update(data).digest('hex');
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// SHA-256 - recommended for most use cases
const hash = crypto.createHash('sha256').update(data).digest('hex');

// SHA-512 - stronger, use for high-security needs
const sha512Hash = crypto.createHash('sha512').update(data).digest('hex');

// SHA-3 - newest, NIST-approved
const sha3Hash = crypto.createHash('sha3-256').update(data).digest('hex');
```

## Security Impact

| Vulnerability       | CWE | OWASP    | CVSS       | Impact                         |
| ------------------- | --- | -------- | ---------- | ------------------------------ |
| Broken Crypto       | 327 | A02:2021 | 7.5 High   | Hash collision attacks         |
| Weak Hash Algorithm | 328 | A02:2021 | 5.3 Medium | Reduced cryptographic strength |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-weak-hash-algorithm': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace MD5/SHA-1 with SHA-256
crypto.createHash('md5'); // ❌ Before
crypto.createHash('sha256'); // ✅ After

crypto.createHash('sha1'); // ❌ Before
crypto.createHash('sha256'); // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-weak-hash-algorithm': 'error'
  }
}
```

## Related Rules

- [`no-sha1-hash`](./no-sha1-hash.md) - Specific SHA-1 detection for crypto-hash package
- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) - Detect weak encryption algorithms
- [`prefer-native-crypto`](./prefer-native-crypto.md) - Prefer Node.js native crypto

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Algorithm Names

**Why**: Dynamic strings cannot be analyzed statically.

```typescript
// ❌ NOT DETECTED - Dynamic algorithm
const algorithm = getAlgorithm();
crypto.createHash(algorithm);
```

**Mitigation**: Use constants for algorithm names.

### Variable Reassignment

**Why**: Cross-function data flow is not tracked.

```typescript
// ❌ NOT DETECTED - Variable algorithm
let algo = 'md5';
crypto.createHash(algo);
```

**Mitigation**: Apply linting at integration points.

## Further Reading

- **[NIST Hash Function Guidelines](https://csrc.nist.gov/projects/hash-functions)** - NIST recommendations
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry
- **[Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)** - Node.js crypto module
