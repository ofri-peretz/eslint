---
title: require-secure-pbkdf2-digest
description: "CWE: [CWE-328](https://cwe.mitre.org/data/definitions/328.html)"
category: security
severity: medium
tags: ['security', 'crypto']
autofix: false
---

> **Keywords:** require-secure-pbkdf2-digest, PBKDF2, hashing, SHA1, weak algorithm, security, ESLint rule, CWE-328, password storage
> **CWE:** [CWE-328: Use of Weak Hash](https://cwe.mitre.org/data/definitions/328.html)  
> **OWASP:** [OWASP Top 10 A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

ESLint Rule: require-secure-pbkdf2-digest. This rule is part of [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto).

## Quick Summary

| Aspect         | Details                                  |
| -------------- | ---------------------------------------- |
| **Severity**   | High (Cryptographic Failure)             |
| **Auto-Fix**   | ❌ No (requires hash migration)          |
| **Category**   | Security |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration  |
| **Best For**   | Applications performing password hashing |

## Vulnerability and Risk

**Vulnerability:** Using weak hashing algorithms like SHA1 or MD5 with PBKDF2. SHA1 is no longer considered secure for cryptographic purposes and is susceptible to collision attacks and rapid brute-forcing.

**Risk:** If a database of hashed passwords is leaked, using a weak algorithm like SHA1 makes it significantly easier and faster for attackers to recover the original plain-text passwords using rainbow tables or high-speed cracking hardware (GPU arrays).

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-328 OWASP:A02 | Weak PBKDF2 digest detected | HIGH [WeakHash]
   Fix: Use SHA-256 or SHA-512 as the digest algorithm for PBKDF2 | https://cwe.mitre.org/data/definitions/328.html
```

### Message Components

| Component                 | Purpose                | Example                                                                                                   |
| :------------------------ | :--------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Risk Standards**        | Security benchmarks    | [CWE-328](https://cwe.mitre.org/data/definitions/328.html) [OWASP:A02](https://owasp.org/Top10/A02_2021/) |
| **Issue Description**     | Specific vulnerability | `Weak PBKDF2 digest detected`                                                                             |
| **Severity & Compliance** | Impact assessment      | `HIGH [WeakHash]`                                                                                         |
| **Fix Instruction**       | Actionable remediation | `Use SHA-256 or SHA-512`                                                                                  |
| **Technical Truth**       | Official reference     | [Weak Hash](https://cwe.mitre.org/data/definitions/328.html)                                              |

## Rule Details

This rule flags calls to `crypto.pbkdf2()` and `crypto.pbkdf2Sync()` (and some common libraries like `Crypto-JS`) where the specified hashing algorithm is known to be weak (e.g., `'sha1'`, `'md5'`).

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f8fafc',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#334155',
    'lineColor': '#475569',
    'c0': '#f8fafc',
    'c1': '#f1f5f9',
    'c2': '#e2e8f0',
    'c3': '#cbd5e1'
  }
}}%%
flowchart TD
    A[PBKDF2 Call detected] --> B{Digest algorithm weak?}
    B -->|Yes (SHA1/MD5)| C[🚨 Cryptographic Risk]
    B -->|No (SHA256/512)| D[✅ Secure Hashing]
    C --> E[💡 Suggest SHA-256 / PBKDF2 config update]
```

### Why This Matters

| Issue               | Impact                              | Solution                                                     |
| ------------------- | ----------------------------------- | ------------------------------------------------------------ |
| 🕵️ **Brute Force**  | Fast recovery of user passwords     | Use modern, slow-hashing algorithms (SHA-256+)               |
| 🚀 **Exfiltration** | Leaked DB is easily decrypted       | Ensure high iteration counts and strong hash functions       |
| 🔒 **Compliance**   | Failure to meet NIST/FIPS standards | Migrate to SHA-2 or SHA-3 based hashing for all new entrants |

## Configuration

This rule supports an options object to define allowed digests:

```javascript
{
  "rules": {
    "crypto/require-secure-pbkdf2-digest": ["error", {
      "allowedDigests": ["sha256", "sha384", "sha512"] // Defaults
    }]
  }
}
```

## Examples

### ❌ Incorrect

```javascript
// Using SHA1 in Node.js crypto
crypto.pbkdf2(password, salt, 100000, 64, 'sha1', (err, key) => { ... });

// Using MD5 (even worse)
crypto.pbkdf2Sync(password, salt, 10000, 512, 'md5');

// CryptoJS defaults to SHA1 if no hasher is specified
const hash = CryptoJS.PBKDF2(password, salt, { keySize: 512/32, iterations: 1000 });
```

### ✅ Correct

```javascript
// Using SHA-512 (Recommended)
crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => { ... });

// Using SHA-256
crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');

// Explicitly setting a secure hasher in CryptoJS
const hash = CryptoJS.PBKDF2(password, salt, {
  hasher: CryptoJS.algo.SHA256,
  keySize: 256/32,
  iterations: 1000
});
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: If the digest name is stored in a complex variable or constant that is not statically determinable.

```javascript
const myAlgo = getAlgoFromRemoteConfig();
crypto.pbkdf2(pass, salt, iter, len, myAlgo, cb); // ❌ NOT DETECTED
```

**Mitigation**: Hardcode security algorithms or use a strict whitelist in your crypto utility.

### Legacy Support

**Why**: This rule doesn't know if you are using SHA1 _only_ for verifying old hashes while using a better algo for new ones.

**Mitigation**: Use `// eslint-disable-next-line` for legacy verification code blocks and implement "Rehash on Login" logic.

## References

- [CWE-328: Use of Weak Hash](https://cwe.mitre.org/data/definitions/328.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js Crypto PBKDF2](https://nodejs.org/api/crypto.html#cryptopbkdf2password-salt-iterations-keylen-digest-callback)
