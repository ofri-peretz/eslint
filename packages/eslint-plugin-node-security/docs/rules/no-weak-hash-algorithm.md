---
title: no-weak-hash-algorithm
description: Disallow weak hash algorithms (MD5, MD4, SHA-1, RIPEMD)
tags: ['security', 'cryptography', 'cwe-327', 'nodejs']
category: security
severity: high
cwe: CWE-327
owasp: 'A02:2021'
autofix: false
---

> **Keywords:** MD5, SHA-1, MD4, RIPEMD, weak hash, cryptography, CWE-327, security, ESLint rule, LLM-optimized
> **CWE:** [CWE-327](https://cwe.mitre.org/data/definitions/327.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)

<!-- @rule-summary -->

Disallow weak hash algorithms (MD5, MD4, SHA-1, RIPEMD)
<!-- @/rule-summary -->

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

| Option                     | Type       | Default                                                           | Description                                                                       |
| -------------------------- | ---------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `additionalWeakAlgorithms` | `string[]` | `[]`                                                              | Additional weak algorithms to flag                                                |
| `allowInTests`             | `boolean`  | `false`                                                           | Allow weak hashes in test files                                                   |
| `nonCryptographicNames`    | `string[]` | `['sha', 'etag', 'cachekey', 'cachebuster', 'thumbprint', 'x5t']` | Assignment-target names that mark a hash as an identifier, not a security control |

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
const passwordHash = crypto.createHash('md5').update(data).digest('hex');

// SHA-1 - collision attacks demonstrated
const signatureHash = crypto.createHash('sha1').update(data).digest('hex');

// MD4 - severely broken
const tokenHash = crypto.createHash('md4').update(data).digest('hex');

// RIPEMD - deprecated
const integrityHash = crypto.createHash('ripemd160').update(data).digest('hex');
```

> These examples name a security use (`password`, `signature`, `token`,
> `integrity`), which is what makes them fire under the default options. The
> block previously used neutral names like `hash` and `sha1Hash` and therefore
> reported **nothing** — see [Unclassified hashes](#unclassified-hashes) below
> for why, and set `reportUnclassifiedHashes: true` to also flag weak hashes
> whose name gives no purpose. Names listed in `nonCryptographicNames` stay
> exempt either way.

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

### Unclassified hashes

**Why**: This is the largest false-negative class, and it is a deliberate
trade rather than an analysis limit. By default (`reportUnclassifiedHashes:
false`) a weak hash is reported only when a `securityUseNames` word is visible
at the site. A digest whose surrounding identifiers name no security use is
**not** reported, however the value is then used:

```typescript
// ❌ NOT DETECTED - no securityUseNames word at the site
const sha1 = (buf: Buffer) => createHash('sha1').update(buf).digest('hex');
const shasum = sha1(archive);
if (published !== shasum) throw new Error('tarball integrity mismatch');
```

This is a real supply-chain integrity check on a downloaded archive, and it is
silent. Renaming `shasum` to `integrity` makes the identical code report
CRITICAL, because `integrity` IS in `securityUseNames` — so the discriminator
is the vocabulary that happens to appear, not the security semantics.

**Mitigation**: set `reportUnclassifiedHashes: true`, or name the binding after
what it protects so the classifier can see it.

## Further Reading

- **[NIST Hash Function Guidelines](https://csrc.nist.gov/projects/hash-functions)** - NIST recommendations
- **[CWE-327: Broken Crypto Algorithm](https://cwe.mitre.org/data/definitions/327.html)** - Official CWE entry
- **[Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)** - Node.js crypto module

## Non-cryptographic hashing

Not every hash is a security control. `redis/ioredis` computes the EVALSHA
script identifier the Redis wire protocol mandates:

```ts
this.sha = createHash('sha1').update(lua).digest('hex');
```

SHA-1 is genuinely used here, but the algorithm is not the author's choice and
breaking its collision resistance buys nothing — the value indexes a script the
server already holds. The same shape covers HTTP ETags, content-addressed
caches, and cache busting.

A hash **assigned to** a name in `nonCryptographicNames` is not reported. The
test is where the value lands, not which API produced it: the rule walks out
through the `.update(...).digest(...)` receiver chain and reads the assignment
target. A hash that is returned, passed as an argument, compared, or stored
under a computed key is not exempted **by this rule** — so renaming a variable
to `sha` cannot silence a hash the classifier had already decided to report.

That is a statement about the `nonCryptographicNames` exemption only, and it is
not a promise that such a hash reports. Under the default
`reportUnclassifiedHashes: false`, a digest with no `securityUseNames` word at
the site is never classified as a security control in the first place, so there
is nothing for the exemption to override. See
[Unclassified hashes](#unclassified-hashes).

Set `nonCryptographicNames: []` to switch the exemption off.

## ⚙️ Options

| Option                     | Type       | Default                                                                                                                                                                                                                                                                                                                                                                                                                                            | Description                                                                                  |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `additionalWeakAlgorithms` | `string[]` | `[]`                                                                                                                                                                                                                                                                                                                                                                                                                                               | Additional weak algorithms to detect                                                         |
| `allowInTests`             | `boolean`  | `false`                                                                                                                                                                                                                                                                                                                                                                                                                                            | Allow weak hashes in test files                                                              |
| `nonCryptographicNames`    | `string[]` | `["sha","etag","cachekey","cachebuster","thumbprint","x5t"]`                                                                                                                                                                                                                                                                                                                                                                                       | Assignment target names that mark a hash as an identifier rather than a security control     |
| `securityUseNames`         | `string[]` | `["password","passwd","secret","secrets","token","tokens","signature","signing","signed","sign","hmac","credential","credentials","certificate","cert","certs","apikey","privatekey","secretkey","signingkey","encryptionkey","session","csrf","salt","jwt","nonce","integrity","auth","authorization","authenticate","otp","mfa","totp","passphrase","pincode","mnemonic","seedphrase","masterkey","securityanswer","recoverycode","backupcode"]` | Names that mark a hash as a security control (whole-word matched)                            |
| `reportUnclassifiedHashes` | `boolean`  | `false`                                                                                                                                                                                                                                                                                                                                                                                                                                            | Report weak hashes whose purpose cannot be determined. Restores the pre-inversion behaviour. |
