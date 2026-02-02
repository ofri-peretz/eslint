---
title: no-sha1-hash
description: Disallow sha1() from crypto-hash package (use sha256 or sha512)
tags: ['security', 'cryptography', 'cwe-327', 'nodejs']
category: security
severity: high
cwe: CWE-327
owasp: "A02:2021"
autofix: false
---

> **Keywords:** SHA-1, crypto-hash, hash, cryptography, CWE-327, security, ESLint rule, LLM-optimized, broken hash, sha256, sha512
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Disallow sha1() from crypto-hash package (use sha256 or sha512)
<!-- @/rule-summary -->

Detects `sha1()` usage from the `crypto-hash` package which is cryptographically broken. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Crypto) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests fixes (sha256 or sha512)                                       |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications using the crypto-hash package                         |

## Vulnerability and Risk

**Vulnerability:** The `sha1()` function from the `crypto-hash` package produces SHA-1 hashes which are cryptographically broken. SHA-1 has known collision vulnerabilities demonstrated by the SHAttered attack.

**Risk:** Using SHA-1 for security-sensitive operations (password hashing, digital signatures, integrity verification) can allow attackers to forge signatures or create files with matching hashes. Even the crypto-hash package itself warns: "SHA-1 is insecure and should not be used".

## Rule Details

This rule detects imports and usage of `sha1()` from the `crypto-hash` package and suggests migrating to `sha256()` or `sha512()`.

## Why This Matters

| Risk                     | Impact                                     | Solution                           |
| ------------------------ | ------------------------------------------ | ---------------------------------- |
| 🔓 **Hash Collisions**   | Attackers can create colliding hashes      | Migrate to SHA-256 or SHA-512      |
| 📜 **Signature Forgery** | Digital signatures can be forged           | Use SHA-256 minimum for signatures |
| 🔒 **Compliance**        | Fails PCI-DSS, NIST, and SOC2 requirements | Replace all SHA-1 usage            |

## Configuration

| Option         | Type      | Default | Description               |
| -------------- | --------- | ------- | ------------------------- |
| `allowInTests` | `boolean` | `false` | Allow SHA-1 in test files |

```javascript
{
  rules: {
    'node-security/no-sha1-hash': ['error', {
      allowInTests: false
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// Importing sha1 from crypto-hash - HIGH risk
import { sha1 } from 'crypto-hash';

// Using sha1() for hashing - HIGH risk
const hash = await sha1(data);

// Aliased import still detected
import { sha1 as hash } from 'crypto-hash';
```

### ✅ Correct

```typescript
// Use sha256 instead (adequate for most use cases)
import { sha256 } from 'crypto-hash';
const hash = await sha256(data);

// Use sha512 for stronger security
import { sha512 } from 'crypto-hash';
const hash = await sha512(data);

// sha1 from other packages is not flagged (use at your own risk)
import { sha1 } from 'some-other-package';

// Node.js crypto module with SHA-256
import crypto from 'crypto';
const hash = crypto.createHash('sha256').update(data).digest('hex');
```

## Security Impact

| Vulnerability       | CWE | OWASP    | CVSS       | Impact                         |
| ------------------- | --- | -------- | ---------- | ------------------------------ |
| Broken Crypto       | 327 | A02:2021 | 7.5 High   | Hash collision attacks         |
| Weak Hash Algorithm | 328 | A02:2021 | 5.3 Medium | Reduced cryptographic strength |

## Migration Guide

### Phase 1: Discovery

```javascript
// Enable rule with warnings first
{
  rules: {
    'node-security/no-sha1-hash': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace sha1 imports with sha256 or sha512
import { sha1 } from 'crypto-hash'; // ❌ Before
import { sha256 } from 'crypto-hash'; // ✅ After

// Update function calls
await sha1(data); // ❌ Before
await sha256(data); // ✅ After
```

### Phase 3: Enforcement

```javascript
// Strict enforcement
{
  rules: {
    'node-security/no-sha1-hash': 'error'
  }
}
```

## Related Rules

- [`no-weak-hash-algorithm`](./no-weak-hash-algorithm.md) - Detects weak hash algorithms in Node.js crypto
- [`no-weak-cipher-algorithm`](./no-weak-cipher-algorithm.md) - Prevents weak encryption algorithms
- [`prefer-native-crypto`](./prefer-native-crypto.md) - Prefer Node.js native crypto over third-party packages

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Other Packages

**Why**: Only `crypto-hash` package imports are tracked.

```typescript
// ❌ NOT DETECTED - Different package
import { sha1 } from 'another-hash-lib';
sha1(data);
```

**Mitigation**: Use `no-weak-hash-algorithm` for Node.js crypto module.

### Dynamic Imports

**Why**: Dynamic imports are not statically analyzable.

```typescript
// ❌ NOT DETECTED - Dynamic import
const { sha1 } = await import('crypto-hash');
sha1(data);
```

**Mitigation**: Use import analysis tools in CI/CD pipeline.

## Further Reading

- **[SHAttered Attack](https://shattered.io/)** - Practical SHA-1 collision attack demonstration
- **[NIST Transition from SHA-1](https://csrc.nist.gov/projects/hash-functions)** - NIST guidance on hash function transition
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry
- **[crypto-hash Package](https://www.npmjs.com/package/crypto-hash)** - Package documentation with SHA-1 warning