---
title: no-ecb-mode
description: Disallow ECB encryption mode (use GCM or CBC instead)
tags: ['security', 'cryptography', 'cwe-327', 'nodejs']
category: security
severity: high
cwe: CWE-327
owasp: "A02:2021"
autofix: false
---

> **Keywords:** ECB, encryption mode, block cipher, ECB penguin, CWE-327, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Disallow ECB encryption mode (use GCM or CBC instead)
<!-- @/rule-summary -->

Detects usage of ECB (Electronic Codebook) encryption mode which leaks data patterns. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests fixes (GCM, CBC)                                               |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications using symmetric encryption                            |

## Vulnerability and Risk

**Vulnerability:** ECB mode encrypts identical plaintext blocks to identical ciphertext blocks. This means patterns in the plaintext are preserved in the ciphertext, leaking information about the data structure.

**Risk:** The famous "ECB Penguin" demonstrates this perfectly - an encrypted image still shows the original image's structure. This weakness can reveal message lengths, patterns, and repeated data to attackers.

## Rule Details

This rule detects ECB mode usage in `crypto.createCipheriv()` calls (e.g., `aes-128-ecb`, `aes-256-ecb`) and suggests using GCM or CBC mode instead.

## Why This Matters

| Risk                   | Impact                               | Solution                     |
| ---------------------- | ------------------------------------ | ---------------------------- |
| 🎨 **Pattern Leakage** | Data patterns visible in ciphertext  | Use GCM or CBC mode          |
| 📊 **Block Analysis**  | Repeated blocks reveal repeated data | Use authenticated encryption |
| 🔒 **Compliance**      | Fails security audits and pen tests  | Replace all ECB usage        |

## Configuration

| Option         | Type      | Default | Description                  |
| -------------- | --------- | ------- | ---------------------------- |
| `allowInTests` | `boolean` | `false` | Allow ECB mode in test files |

```javascript
{
  rules: {
    'node-security/no-ecb-mode': ['error', {
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// ECB mode leaks patterns - HIGH risk
const cipher = crypto.createCipheriv('aes-128-ecb', key, null);

// AES-256-ECB - still insecure despite key size
const strongKeyEcb = crypto.createCipheriv('aes-256-ecb', key, null);
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// GCM mode - authenticated encryption (recommended)
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// CBC mode with random IV
const cbcCipher = crypto.createCipheriv('aes-256-cbc', key, iv);

// ChaCha20-Poly1305 - authenticated stream cipher
const chachaCipher = crypto.createCipheriv('chacha20-poly1305', key, iv);
```

## The ECB Penguin

![ECB Penguin](https://upload.wikimedia.org/wikipedia/commons/f/f0/Tux_ecb.jpg)

The "ECB Penguin" is a famous example showing how ECB mode preserves patterns. The original Tux penguin image, when encrypted with ECB mode, still shows the penguin's outline because identical pixel blocks produce identical ciphertext blocks.

## Security Impact

| Vulnerability        | CWE | OWASP    | CVSS       | Impact                  |
| -------------------- | --- | -------- | ---------- | ----------------------- |
| Broken Crypto        | 327 | A02:2021 | 5.9 Medium | Pattern leakage         |
| Information Exposure | 200 | A02:2021 | 5.3 Medium | Data structure revealed |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-ecb-mode': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace ECB with GCM
crypto.createCipheriv('aes-256-ecb', key, null); // ❌ Before
crypto.createCipheriv('aes-256-gcm', key, iv); // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-ecb-mode': 'error'
  }
}
```

## Related Rules

- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) - Detect weak encryption algorithms
- [`no-static-iv`](./no-static-iv.md) - Detect hardcoded initialization vectors
- [`no-deprecated-cipher-method`](./no-deprecated-cipher-method.md) - Detect deprecated cipher methods

## Known False Negatives

### Dynamic Mode Strings

**Why**: Dynamic strings cannot be analyzed statically.

```typescript
// ❌ NOT DETECTED
const mode = config.cipherMode;
crypto.createCipheriv(`aes-256-${mode}`, key, iv);
```

**Mitigation**: Use constants for cipher specifications.

## Further Reading

- **[ECB Mode Visualization](https://blog.cloudflare.com/why-are-some-images-more-secure-than-others/)** - Cloudflare article on ECB weaknesses
- **[Block Cipher Modes](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation)** - Wikipedia comparison of modes
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry