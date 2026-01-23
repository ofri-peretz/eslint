# no-insecure-rsa-padding

> No Insecure Rsa Padding

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html)             |
| **Severity**      | Critical (security risk)                                               |
| **Auto-Fix**      | ✅ Auto-fix available                                                  |
| **Category**      | Security                                                               |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                |
| **Best For**      | Protecting RSA operations from side-channel and padding oracle attacks |

## Description

Disallow the use of insecure RSA padding schemes, specifically PKCS#1 v1.5 padding. PKCS#1 v1.5 padding is vulnerable to various attacks, including the Marvin attack, and should be replaced with RSA-OAEP padding.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-327 - Use of a Broken or Risky Cryptographic Algorithm

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-327 OWASP:A04 CVSS:7.5 | Insecure RSA Padding detected | CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Insecure RSA Padding detected`                                                                                                                                                                                                 |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                                    |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Detects the use of `crypto.constants.RSA_PKCS1_PADDING` in encryption and decryption operations.

## Examples

### ❌ Incorrect

```javascript
crypto.privateDecrypt(
  { key, padding: crypto.constants.RSA_PKCS1_PADDING },
  buffer,
);
crypto.publicEncrypt(
  { key, padding: crypto.constants.RSA_PKCS1_PADDING },
  buffer,
);
```

### ✅ Correct

```javascript
crypto.privateDecrypt(
  { key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
  buffer,
);
crypto.publicEncrypt(
  { key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
  data,
);
```

## Options

This rule has no options.

## When Not To Use It

Only if you are communicating with a legacy system that _only_ supports PKCS#1 v1.5 and cannot be upgraded to use OAEP.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Padding from Variable

**Why**: Padding constants stored in variables are not resolved.

```typescript
// ❌ NOT DETECTED
const PAD = crypto.constants.RSA_PKCS1_PADDING;
crypto.privateDecrypt({ key, padding: PAD }, buffer);
```

**Mitigation**: Use constants directly in the options object.

### Custom RSA Implementations

**Why**: Rules focus on the built-in `crypto` module.

```typescript
// ❌ NOT DETECTED
myRsaLib.decrypt(data, { padding: 'pkcs1' });
```

**Mitigation**: Audit third-party library configurations.
