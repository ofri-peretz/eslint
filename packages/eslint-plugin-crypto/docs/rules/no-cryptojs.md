# no-cryptojs

> No Cryptojs

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html)                |
| **Severity**      | High (security risk)                                                        |
| **Auto-Fix**      | ⚠️ Suggests fixes (manual application)                                      |
| **Category**      | Security                                                                    |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                     |
| **Best For**      | Modernizing crypto implementations, moving away from unmaintained libraries |

## Description

Disallow the use of the `crypto-js` library. This library is unmaintained and has better native alternatives available in Node.js and modern browsers.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-1104 - Use of Unmaintained Third Party Components

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-1104 OWASP:A04 CVSS:7.5 | Broken Cryptographic Algorithm detected | HIGH [PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                           |
| :------------------------ | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Risk Standards**        | Security benchmarks    | [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Broken Cryptographic Algorithm detected`                                                                                                                                                                                         |
| **Severity & Compliance** | Impact assessment      | `HIGH [PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                                          |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                              |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                       |

## Rule Details

Disallows importing or requiring the `crypto-js` package or any of its submodules.

## Examples

### ❌ Incorrect

```javascript
import CryptoJS from 'crypto-js';
import { AES } from 'crypto-js/aes';
const CryptoJS = require('crypto-js');
const MD5 = require('crypto-js/md5');
```

### ✅ Correct

```javascript
import crypto from 'node:crypto';
const crypto = require('crypto');
import hash from 'crypto-hash';
```

## Options

This rule has no options.

## When Not To Use It

Only if you are working on a legacy project where migrating away from `crypto-js` is not feasible, or if you specifically need a feature that `crypto-js` provides which is not available elsewhere (rare).

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
