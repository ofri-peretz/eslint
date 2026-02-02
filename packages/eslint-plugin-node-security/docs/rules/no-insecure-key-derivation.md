---
title: no-insecure-key-derivation
description: Disallow PBKDF2 with insufficient iterations (< 100,000)
tags: ['security', 'cryptography', 'cwe-916', 'nodejs', 'password']
category: security
severity: high
cwe: CWE-916
owasp: "A02:2021"
autofix: false
---

> **Keywords:** PBKDF2, key derivation, iterations, password hashing, CWE-916, security, ESLint rule, scrypt, Argon2
> **CWE:** [CWE-916](https://cwe.mitre.org/data/definitions/916.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Disallow PBKDF2 with insufficient iterations (< 100,000)
<!-- @/rule-summary -->

Detects PBKDF2 usage with insufficient iterations. OWASP 2023 recommends minimum 600,000 iterations for PBKDF2-SHA256. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-916](https://cwe.mitre.org/data/definitions/916.html) (Weak Hashing) |
| **Severity**      | High (security vulnerability)                                             |
| **Auto-Fix**      | 💡 Suggests fixes (increase iterations, use scrypt/Argon2)                |
| **Category**      | Security                                                                  |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                   |
| **Best For**      | Node.js applications hashing passwords or deriving keys                   |

## Vulnerability and Risk

**Vulnerability:** PBKDF2 with low iteration counts allows attackers to perform brute-force attacks efficiently. Each iteration adds computational cost, so low counts make password cracking feasible with modern GPUs.

**Risk:** With only 10,000 iterations, an attacker with commodity hardware can test billions of password guesses. OWASP 2023 recommends 600,000+ iterations for PBKDF2-SHA256 to provide adequate protection.

## Rule Details

This rule detects `crypto.pbkdf2()` and `crypto.pbkdf2Sync()` calls where the iteration count is below the configurable minimum (default: 100,000).

## Why This Matters

| Risk                 | Impact                                  | Solution                           |
| -------------------- | --------------------------------------- | ---------------------------------- |
| 💨 **Fast Cracking** | Low iterations = fast brute force       | Use 100,000+ iterations minimum    |
| 🎮 **GPU Attacks**   | GPUs can test billions of hashes/second | Use scrypt or Argon2 (memory-hard) |
| 🔒 **Compliance**    | Fails OWASP, NIST password requirements | Follow OWASP 2023 guidelines       |

## Configuration

| Option          | Type     | Default  | Description                        |
| --------------- | -------- | -------- | ---------------------------------- |
| `minIterations` | `number` | `100000` | Minimum required PBKDF2 iterations |

```javascript
{
  rules: {
    'node-security/no-insecure-key-derivation': ['error', {
      minIterations: 600000 // OWASP 2023 recommendation
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
import crypto from 'crypto';

// Only 10,000 iterations - too weak
crypto.pbkdf2(password, salt, 10000, 32, 'sha256', callback);

// 1,000 iterations - critically weak
const key = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha512');

// 50,000 iterations - still below minimum
crypto.pbkdf2(password, salt, 50000, 32, 'sha256', callback);
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// 100,000+ iterations (minimum)
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', callback);

// 600,000 iterations (OWASP 2023 recommendation)
const key = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');

// Better: Use scrypt (memory-hard)
const scryptKey = crypto.scryptSync(password, salt, 32, {
  N: 16384, // CPU/memory cost
  r: 8, // Block size
  p: 1, // Parallelization
});

// Best: Use Argon2id (winner of Password Hashing Competition)
import argon2 from 'argon2';
const hash = await argon2.hash(password, { type: argon2.argon2id });
```

## Security Impact

| Vulnerability       | CWE | OWASP    | CVSS       | Impact                  |
| ------------------- | --- | -------- | ---------- | ----------------------- |
| Weak Password Hash  | 916 | A02:2021 | 7.5 High   | Password cracking       |
| Insufficient Effort | 916 | A07:2021 | 5.3 Medium | Brute force feasibility |

## OWASP 2023 Recommendations

| Algorithm     | Minimum Work Factor       |
| ------------- | ------------------------- |
| PBKDF2-SHA256 | 600,000 iterations        |
| PBKDF2-SHA512 | 210,000 iterations        |
| bcrypt        | Cost factor 10+           |
| scrypt        | N=2^17 (131072), r=8, p=1 |
| Argon2id      | m=19456, t=2, p=1         |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-insecure-key-derivation': 'warn'
  }
}
```

### Phase 2: Increase Iterations

```javascript
// Increase PBKDF2 iterations
crypto.pbkdf2(password, salt, 10000, 32, 'sha256', cb); // ❌ Before
crypto.pbkdf2(password, salt, 600000, 32, 'sha256', cb); // ✅ After
```

### Phase 3: Consider Alternatives

```javascript
// Migrate to scrypt for memory-hard protection
crypto.scrypt(password, salt, 32, (err, key) => {});

// Or use Argon2id (recommended for new applications)
const hash = await argon2.hash(password, { type: argon2.argon2id });
```

## Related Rules

- [`no-weak-hash-algorithm`](./no-weak-hash-algorithm.md) - Detect weak hash algorithms
- [`no-timing-unsafe-compare`](./no-timing-unsafe-compare.md) - Detect timing-unsafe comparisons

## Known False Negatives

### Variable Iterations

**Why**: Dynamic values cannot be analyzed statically.

```typescript
// ❌ NOT DETECTED
const iterations = config.iterations; // Runtime value
crypto.pbkdf2(password, salt, iterations, 32, 'sha256', cb);
```

**Mitigation**: Validate configuration at startup.

## Further Reading

- **[OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)** - Current recommendations
- **[CWE-916: Insufficient Computational Effort](https://cwe.mitre.org/data/definitions/916.html)** - Official CWE entry
- **[Argon2 Paper](https://www.password-hashing.net/argon2-specs.pdf)** - Password Hashing Competition winner