---
title: no-deprecated-cipher-method
description: Disallow deprecated crypto.createCipher/createDecipher methods
tags: ['security', 'cryptography', 'cwe-327', 'nodejs', 'deprecated']
category: security
severity: high
cwe: CWE-327
owasp: "A02:2021"
autofix: false
---

> **Keywords:** createCipher, createDecipher, deprecated, createCipheriv, CWE-327, security, ESLint rule
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Disallow deprecated crypto.createCipher/createDecipher methods
<!-- @/rule-summary -->

Detects usage of deprecated `crypto.createCipher()` and `crypto.createDecipher()` methods which don't use an IV. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests createCipheriv/createDecipheriv                                |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications using crypto module                                   |

## Vulnerability and Risk

**Vulnerability:** `crypto.createCipher()` and `crypto.createDecipher()` derive the encryption key from the password using MD5 (one iteration, no salt) and use no initialization vector (IV). This makes encryption deterministic and vulnerable.

**Risk:** Same password + same plaintext = same ciphertext. This enables pattern analysis, replay attacks, and makes brute-forcing passwords easier due to weak key derivation.

## Rule Details

This rule detects calls to:

- `crypto.createCipher(algorithm, password)`
- `crypto.createDecipher(algorithm, password)`

## Why This Matters

| Risk                       | Impact                             | Solution                                |
| -------------------------- | ---------------------------------- | --------------------------------------- |
| 🔄 **No IV**               | Deterministic encryption           | Use createCipheriv with random IV       |
| 🔑 **Weak Key Derivation** | MD5 with no salt or iterations     | Use scrypt or PBKDF2 for key derivation |
| ⚠️ **Deprecated**          | Removed in future Node.js versions | Migrate now                             |

## Configuration

| Option         | Type      | Default | Description                            |
| -------------- | --------- | ------- | -------------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow deprecated methods in test files |

```javascript
{
  rules: {
    'node-security/no-deprecated-cipher-method': ['error', {
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// Deprecated - no IV, weak key derivation
const cipher = crypto.createCipher('aes-256-cbc', password); // ❌
const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');

// Decryption also deprecated
const decipher = crypto.createDecipher('aes-256-cbc', password); // ❌
const decrypted =
  decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// Proper key derivation using scrypt
const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(password, salt, 32);

// Use createCipheriv with random IV
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv); // ✅
const encrypted = Buffer.concat([
  salt, // Store salt for key derivation
  iv, // Store IV for decryption
  cipher.update(data),
  cipher.final(),
]);

// Decryption with proper IV
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv); // ✅
const decrypted = Buffer.concat([
  decipher.update(encryptedData),
  decipher.final(),
]);
```

## Proper Encryption Pattern

```typescript
import crypto from 'crypto';

function encrypt(plaintext: string, password: string): Buffer {
  // Generate random salt and IV
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);

  // Derive key using scrypt (memory-hard)
  const key = crypto.scryptSync(password, salt, 32);

  // Encrypt with GCM (authenticated encryption)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Return salt + iv + authTag + ciphertext
  return Buffer.concat([salt, iv, authTag, ciphertext]);
}

function decrypt(encrypted: Buffer, password: string): string {
  // Extract components
  const salt = encrypted.subarray(0, 16);
  const iv = encrypted.subarray(16, 32);
  const authTag = encrypted.subarray(32, 48);
  const ciphertext = encrypted.subarray(48);

  // Derive key
  const key = crypto.scryptSync(password, salt, 32);

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
```

## Security Impact

| Vulnerability       | CWE | OWASP    | CVSS       | Impact                   |
| ------------------- | --- | -------- | ---------- | ------------------------ |
| Broken Crypto       | 327 | A02:2021 | 7.5 High   | Deterministic encryption |
| Weak Key Derivation | 916 | A02:2021 | 5.9 Medium | Password brute-force     |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-deprecated-cipher-method': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace deprecated methods
crypto.createCipher('aes-256-cbc', password); // ❌ Before
crypto.createCipheriv('aes-256-cbc', key, iv); // ✅ After

crypto.createDecipher('aes-256-cbc', password); // ❌ Before
crypto.createDecipheriv('aes-256-cbc', key, iv); // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-deprecated-cipher-method': 'error'
  }
}
```

## Related Rules

- [`no-static-iv`](./no-static-iv.md) - Detect hardcoded IVs
- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) - Detect weak ciphers
- [`no-insecure-key-derivation`](./no-insecure-key-derivation.md) - Detect weak key derivation

## Known False Negatives

### Aliased Methods

**Why**: Method aliases not tracked.

```typescript
// ❌ NOT DETECTED
const cipher = crypto['createCipher']('aes-256-cbc', pwd);
```

**Mitigation**: Search for all createCipher occurrences.

## Further Reading

- **[Node.js Crypto Deprecation](https://nodejs.org/api/crypto.html#cryptocreatecipheralgorithm-password-options)** - Official deprecation notice
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry
- **[OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)** - Best practices