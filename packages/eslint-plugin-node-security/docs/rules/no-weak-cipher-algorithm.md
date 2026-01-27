---
title: no-weak-cipher-algorithm
description: Disallow weak cipher algorithms (DES, 3DES, RC4, Blowfish, RC2, IDEA)
category: security
severity: critical
tags: ['security', 'cryptography', 'cwe-327', 'nodejs']
autofix: false
cwe: CWE-327
owasp: A02:2021-Cryptographic-Failures
---

> **Keywords:** DES, 3DES, RC4, Blowfish, weak cipher, encryption, CWE-327, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

Detects usage of weak cipher algorithms (DES, 3DES, RC4, Blowfish, RC2, IDEA) in Node.js crypto operations. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **Severity**      | Critical (security vulnerability)                                          |
| **Auto-Fix**      | 💡 Suggests fixes (AES-256-GCM, ChaCha20-Poly1305)                         |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications using crypto.createCipheriv()                         |

## Vulnerability and Risk

**Vulnerability:** DES, 3DES, RC4, Blowfish, RC2, and IDEA are obsolete cipher algorithms with known vulnerabilities. DES has a 56-bit key (brute-forceable), RC4 has statistical biases, and 3DES is deprecated by NIST since 2023.

**Risk:** Using weak ciphers allows attackers to decrypt sensitive data through brute force attacks, statistical analysis, or known cryptographic attacks like BEAST and POODLE.

## Rule Details

This rule detects weak cipher algorithms passed to `crypto.createCipheriv()`, `crypto.createDecipheriv()`, and deprecated `crypto.createCipher/createDecipher` methods.

## Why This Matters

| Risk                       | Impact                                  | Solution                      |
| -------------------------- | --------------------------------------- | ----------------------------- |
| 🔓 **Brute Force**         | DES can be cracked in hours             | Use AES-256-GCM               |
| 📊 **Statistical Attacks** | RC4 leaks data through biases           | Use ChaCha20-Poly1305         |
| 🔒 **Compliance**          | Fails PCI-DSS, HIPAA, NIST requirements | Replace all weak cipher usage |

## Configuration

| Option                  | Type       | Default | Description                      |
| ----------------------- | ---------- | ------- | -------------------------------- |
| `additionalWeakCiphers` | `string[]` | `[]`    | Additional weak ciphers to flag  |
| `allowInTests`          | `boolean`  | `false` | Allow weak ciphers in test files |

```javascript
{
  rules: {
    'node-security/no-weak-cipher-algorithm': ['error', {
      additionalWeakCiphers: ['cast5'],
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// DES - 56-bit key, brute-forceable
const cipher = crypto.createCipheriv('des', key, iv);

// 3DES - deprecated by NIST since 2023
const tripleDesCipher = crypto.createCipheriv('des-ede3', key, iv);

// RC4 - statistical biases, completely broken
const rc4Cipher = crypto.createCipheriv('rc4', key, iv);

// Blowfish - weak 64-bit block size
const bfCipher = crypto.createCipheriv('bf', key, iv);
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// AES-256-GCM - authenticated encryption (recommended)
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// ChaCha20-Poly1305 - fast, secure, constant-time
const chachaCipher = crypto.createCipheriv('chacha20-poly1305', key, iv);

// AES-256-CBC with HMAC - if GCM not available
const cbcCipher = crypto.createCipheriv('aes-256-cbc', key, iv);
```

## Security Impact

| Vulnerability   | CWE | OWASP    | CVSS         | Impact              |
| --------------- | --- | -------- | ------------ | ------------------- |
| Broken Crypto   | 327 | A02:2021 | 9.1 Critical | Data decryption     |
| Weak Encryption | 326 | A02:2021 | 7.5 High     | Brute force attacks |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-weak-cipher-algorithm': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace weak ciphers with AES-256-GCM
crypto.createCipheriv('des', key, iv); // ❌ Before
crypto.createCipheriv('aes-256-gcm', key, iv); // ✅ After

crypto.createCipheriv('rc4', key, iv); // ❌ Before
crypto.createCipheriv('chacha20-poly1305', key, iv); // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-weak-cipher-algorithm': 'error'
  }
}
```

## Related Rules

- [`no-ecb-mode`](./no-ecb-mode.md) - Detect ECB encryption mode
- [`no-weak-hash-algorithm`](./no-weak-hash-algorithm.md) - Detect weak hash algorithms
- [`no-static-iv`](./no-static-iv.md) - Detect hardcoded initialization vectors

## Known False Negatives

### Dynamic Algorithm Names

**Why**: Dynamic strings cannot be analyzed statically.

```typescript
// ❌ NOT DETECTED
const algo = getConfig().cipher;
crypto.createCipheriv(algo, key, iv);
```

**Mitigation**: Use constants for algorithm names.

## Further Reading

- **[NIST Cipher Recommendations](https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final)** - NIST guidance
- **[OWASP Cryptographic Storage](https://owasp.org/www-community/vulnerabilities/Weak_Cryptography)** - OWASP guidance
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry
