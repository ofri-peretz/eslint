---
title: no-insecure-rsa-padding
description: Disallow RSA PKCS#1 v1.5 padding (CVE-2023-46809 Marvin Attack)
category: security
severity: high
tags: ['security', 'cryptography', 'cwe-327', 'nodejs', 'rsa']
autofix: false
cwe: CWE-327
cve: CVE-2023-46809
owasp: A02:2021-Cryptographic-Failures
---

> **Keywords:** RSA, PKCS#1, padding, Marvin Attack, CVE-2023-46809, OAEP, CWE-327, security, ESLint rule
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **CVE:** [CVE-2023-46809](https://nvd.nist.gov/vuln/detail/CVE-2023-46809)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

Detects usage of RSA PKCS#1 v1.5 padding which is vulnerable to the Marvin Attack. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **CVE Reference** | [CVE-2023-46809](https://nvd.nist.gov/vuln/detail/CVE-2023-46809)          |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests OAEP padding                                                   |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications using RSA encryption                                  |

## Vulnerability and Risk

**Vulnerability:** RSA PKCS#1 v1.5 padding is vulnerable to timing side-channel attacks known as the "Marvin Attack" (CVE-2023-46809). Node.js's `privateDecrypt()` function had a timing vulnerability that allowed attackers to decrypt ciphertexts or forge signatures.

**Risk:** An attacker who can measure the time taken to decrypt ciphertexts can use statistical analysis to recover the plaintext without knowing the private key. This attack was demonstrated against Node.js in 2023.

## Rule Details

This rule detects usage of `RSA_PKCS1_PADDING` in `crypto.privateDecrypt()`, `crypto.publicDecrypt()`, `crypto.privateEncrypt()`, and `crypto.publicEncrypt()` calls.

## Why This Matters

| Risk                     | Impact                                  | Solution                             |
| ------------------------ | --------------------------------------- | ------------------------------------ |
| ⏱️ **Timing Attack**     | Measure decryption time to decrypt data | Use RSA_PKCS1_OAEP_PADDING           |
| 📜 **Signature Forgery** | Create valid signatures without key     | Never use PKCS#1 v1.5 for encryption |
| 🔒 **CVE-2023-46809**    | Specific Node.js vulnerability          | Update Node.js and use OAEP          |

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `false` | Allow in test files |

```javascript
{
  rules: {
    'node-security/no-insecure-rsa-padding': ['error', {
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// PKCS#1 v1.5 padding - vulnerable to Marvin Attack
const decrypted = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING, // ❌ Vulnerable
  },
  encryptedData,
);

// Also vulnerable patterns
crypto.publicEncrypt(
  {
    key: publicKey,
    padding: constants.RSA_PKCS1_PADDING, // ❌ Vulnerable
  },
  data,
);
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// Use OAEP padding - secure against padding oracle attacks
const decrypted = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, // ✅ Secure
    oaepHash: 'sha256', // Specify hash for OAEP
  },
  encryptedData,
);

// For encryption
const encrypted = crypto.publicEncrypt(
  {
    key: publicKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
  },
  data,
);

// For signatures, use RSA-PSS instead of PKCS#1 v1.5
const sign = crypto.createSign('RSA-SHA256');
sign.update(data);
const signature = sign.sign({
  key: privateKey,
  padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
});
```

## The Marvin Attack

The Marvin Attack (named after the paranoid android from Hitchhiker's Guide) exploits timing differences in RSA decryption:

1. **Padding Check Timing**: PKCS#1 v1.5 decryption checks if padding is valid
2. **Error Timing**: Different error paths take different times
3. **Statistical Analysis**: Attackers measure thousands of decryption attempts
4. **Key Recovery**: Timing differences reveal the plaintext

## Security Impact

| Vulnerability | CWE | OWASP    | CVSS       | Impact                        |
| ------------- | --- | -------- | ---------- | ----------------------------- |
| Broken Crypto | 327 | A02:2021 | 7.5 High   | Plaintext recovery            |
| Timing Attack | 208 | A02:2021 | 5.9 Medium | Side-channel information leak |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-insecure-rsa-padding': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace PKCS#1 v1.5 with OAEP
padding: crypto.constants.RSA_PKCS1_PADDING; // ❌ Before
padding: crypto.constants.RSA_PKCS1_OAEP_PADDING; // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-insecure-rsa-padding': 'error'
  }
}
```

## Related Rules

- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) - Detect weak encryption algorithms
- [`no-insecure-key-derivation`](./no-insecure-key-derivation.md) - Detect weak key derivation

## Known False Negatives

### Variable Padding Constants

**Why**: Dynamic values cannot be analyzed statically.

```typescript
// ❌ NOT DETECTED
const padding = getPaddingFromConfig();
crypto.privateDecrypt({ key, padding }, data);
```

**Mitigation**: Use constants directly, avoid indirection.

## Further Reading

- **[Marvin Attack Paper](https://people.redhat.com/~hkario/marvin/)** - Original research
- **[CVE-2023-46809](https://nvd.nist.gov/vuln/detail/CVE-2023-46809)** - Node.js vulnerability
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry
- **[OAEP Explained](https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding)** - Wikipedia
