# no-cryptojs-weak-random

> No Cryptojs Weak Random

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                       |
| ----------------- | ------------------------------------------------------------- |
| **CWE Reference** | [CWE-338](https://cwe.mitre.org/data/definitions/338.html)    |
| **Severity**      | Critical (security risk)                                      |
| **Auto-Fix**      | ❌ No auto-fix available                                      |
| **Category**      | Security                                                      |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                       |
| **Best For**      | Applications requiring cryptographically strong random values |

## Description

Disallow the use of the weak PRNG in `crypto-js`. The `WordArray.random()` method in older versions of `crypto-js` uses `Math.random()`, which is not cryptographically secure.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-338 - Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-338 OWASP:A04 CVSS:9.1 | Weak PRNG detected | CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-338](https://cwe.mitre.org/data/definitions/338.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:9.1](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Weak PRNG detected`                                                                                                                                                                                                            |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                                    |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Disallows the use of `WordArray.random()` from the `crypto-js` library.

## Examples

### ❌ Incorrect

```javascript
import CryptoJS from 'crypto-js';
const random = CryptoJS.lib.WordArray.random(16);
const random2 = CryptoJS.random(16);
```

### ✅ Correct

```javascript
import crypto from 'node:crypto';
const random = crypto.randomBytes(32);
const randomValues = crypto.getRandomValues(new Uint8Array(32));
```

## Options

This rule has no options.

## When Not To Use It

Only if you are using a version of `crypto-js` that has been verified to use a secure PRNG, or if the random values are not used for security-sensitive operations.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Algorithm from Variable

**Why**: Algorithm names from variables not traced.

```typescript
// ❌ NOT DETECTED - Algorithm from variable
const algo = config.hashAlgorithm; // May be weak
crypto.createHash(algo);
```

**Mitigation**: Hardcode secure algorithms.

### Third-party Crypto Libraries

**Why**: Non-standard crypto APIs not recognized.

```typescript
// ❌ NOT DETECTED - Third-party
customCrypto.encrypt(data, key);
```

**Mitigation**: Review all crypto implementations.

### Configuration-based Security

**Why**: Config-driven security not analyzed.

```typescript
// ❌ NOT DETECTED - Config-based
const options = getSecurityOptions(); // May be weak
```

**Mitigation**: Validate security configurations.
