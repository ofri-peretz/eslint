# no-deprecated-cipher-method

> No Deprecated Cipher Method

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                    |
| ----------------- | ---------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) |
| **Severity**      | High (security risk)                                       |
| **Auto-Fix**      | ✅ Auto-fix available                                      |
| **Category**      | Security                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                    |
| **Best For**      | Modernizing Node.js crypto calls, ensuring IV usage        |

## Description

Disallow the use of the deprecated `crypto.createCipher()` and `crypto.createDecipher()` methods. These methods derive keys and IVs using an insecure, non-standard method (MD5 with no salt) and do not allow providing a dedicated IV.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-327 - Use of a Broken or Risky Cryptographic Algorithm

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-327 OWASP:A04 CVSS:7.5 | Broken Cryptographic Algorithm detected | HIGH [PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Broken Cryptographic Algorithm detected`                                                                                                                                                                                       |
| **Severity & Compliance** | Impact assessment      | `HIGH [PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                                        |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Disallows calling `crypto.createCipher()` or `crypto.createDecipher()`. Suggests using `crypto.createCipheriv()` or `crypto.createDecipheriv()` instead.

## Examples

### ❌ Incorrect

```javascript
crypto.createCipher('aes-256-cbc', password);
crypto.createDecipher('aes-256-cbc', password);
```

### ✅ Correct

```javascript
crypto.createCipheriv('aes-256-cbc', key, iv);
crypto.createDecipheriv('aes-256-cbc', key, iv);
```

## Options

This rule has no options.

## When Not To Use It

Only if you are maintaining extremely old legacy code that cannot be updated to provide IVs, though this is a significant security risk.

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
