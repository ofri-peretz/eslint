---
title: no-static-iv
description: Disallow static or hardcoded initialization vectors (IVs)
tags: ['security', 'cryptography', 'cwe-329', 'nodejs']
category: security
severity: high
cwe: CWE-329
owasp: "A02:2021"
autofix: false
---

> **Keywords:** IV, initialization vector, hardcoded, static, nonce, CWE-329, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-329](https://cwe.mitre.org/data/definitions/329.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Disallow static or hardcoded initialization vectors (IVs)
<!-- @/rule-summary -->

Detects usage of hardcoded or static initialization vectors (IVs) in encryption operations. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| **CWE Reference** | [CWE-329](https://cwe.mitre.org/data/definitions/329.html) (Static IV) |
| **Severity**      | High (security vulnerability)                                          |
| **Auto-Fix**      | ❌ No auto-fix (requires randomBytes)                                  |
| **Category**      | Security                                                               |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                |
| **Best For**      | Node.js applications using symmetric encryption                        |

## Vulnerability and Risk

**Vulnerability:** Using a static or hardcoded IV makes encryption deterministic. When the same key and IV are used, encrypting the same plaintext produces the same ciphertext every time, allowing attackers to detect repeated messages.

**Risk:** Static IVs enable pattern analysis attacks. In CBC mode, identical first blocks produce identical first ciphertext blocks. In GCM mode, reusing a nonce with the same key completely breaks the authentication guarantees.

## Rule Details

This rule detects hardcoded IVs passed to `crypto.createCipheriv()` including:

- String literal IVs
- `Buffer.from('static-string')`
- `Buffer.alloc()` with literal values
- Hardcoded hex or base64 strings

## Why This Matters

| Risk                     | Impact                             | Solution                          |
| ------------------------ | ---------------------------------- | --------------------------------- |
| 🔄 **Deterministic**     | Same plaintext = same ciphertext   | Use crypto.randomBytes(16)        |
| 🔓 **GCM Nonce Reuse**   | Complete authentication bypass     | Generate unique IV per encryption |
| 🔒 **Pattern Detection** | Attackers detect repeated messages | Never hardcode IVs                |

## Configuration

| Option         | Type      | Default | Description                    |
| -------------- | --------- | ------- | ------------------------------ |
| `allowInTests` | `boolean` | `false` | Allow static IVs in test files |

```javascript
{
  rules: {
    'node-security/no-static-iv': ['error', {
      allowInTests: true // Only for unit tests
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// Hardcoded string IV - HIGH risk
const cipher = crypto.createCipheriv('aes-256-gcm', key, '1234567890123456');

// Hardcoded hex IV - HIGH risk
const iv = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
const cipher2 = crypto.createCipheriv('aes-256-cbc', key, iv);

// Static buffer - HIGH risk
const staticIv = Buffer.alloc(16, 0);
const cipher3 = crypto.createCipheriv('aes-256-gcm', key, staticIv);
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// Generate random IV for each encryption
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// Store IV with ciphertext (it's not secret)
const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()]);

// For GCM, use 12-byte IV (nonce)
const gcmNonce = crypto.randomBytes(12);
const gcmCipher = crypto.createCipheriv('aes-256-gcm', key, gcmNonce);
```

## Security Impact

| Vulnerability | CWE | OWASP    | CVSS       | Impact                       |
| ------------- | --- | -------- | ---------- | ---------------------------- |
| Static IV     | 329 | A02:2021 | 5.9 Medium | Deterministic encryption     |
| Nonce Reuse   | 323 | A02:2021 | 7.5 High   | Authentication bypass in GCM |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-static-iv': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace static IV with randomBytes
const iv = '0000000000000000'; // ❌ Before
const iv = crypto.randomBytes(16); // ✅ After

// Prepend IV to ciphertext for decryption
const encrypted = Buffer.concat([iv, encryptedData]);
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-static-iv': 'error'
  }
}
```

## Related Rules

- [`no-ecb-mode`](./no-ecb-mode.md) - Detect ECB encryption mode
- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) - Detect weak encryption algorithms
- [`no-deprecated-cipher-method`](./no-deprecated-cipher-method.md) - Detect deprecated cipher methods

## Known False Negatives

### Variable IVs

**Why**: Variables are not tracked across scopes.

```typescript
// ❌ NOT DETECTED - Variable IV
const config = { iv: '1234567890123456' };
crypto.createCipheriv('aes-256-gcm', key, config.iv);
```

**Mitigation**: Ensure IV generation uses randomBytes at generation site.

### Dynamic Buffer Creation

**Why**: Complex expressions not analyzed.

```typescript
// ❌ NOT DETECTED
const iv = getStaticIv();
crypto.createCipheriv('aes-256-gcm', key, iv);
```

**Mitigation**: Code review for IV generation patterns.

## Further Reading

- **[OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#initialization-vectors)** - IV best practices
- **[CWE-329: Not Using Random IV](https://cwe.mitre.org/data/definitions/329.html)** - Official CWE entry
- **[GCM Nonce Misuse](https://blog.cloudflare.com/tls-nonce-nse/)** - Why GCM nonce reuse is catastrophic