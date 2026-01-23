# no-hardcoded-crypto-key

> No Hardcoded Crypto Key

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                    |
| ----------------- | ---------------------------------------------------------- |
| **CWE Reference** | [CWE-321](https://cwe.mitre.org/data/definitions/321.html) |
| **Severity**      | Critical (security risk)                                   |
| **Auto-Fix**      | ❌ No auto-fix available                                   |
| **Category**      | Security                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                    |
| **Best For**      | Protecting cryptographic keys from source code exposure    |

## Description

Disallow the use of hardcoded cryptographic keys in `crypto.createCipheriv()` and `crypto.createDecipheriv()` calls. Hardcoding keys in source code makes them easily discoverable by attackers.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-321 - Use of Hard-coded Cryptographic Key

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-321 OWASP:A04 CVSS:9.1 | Hardcoded Cryptographic Key detected | CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-321](https://cwe.mitre.org/data/definitions/321.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:9.1](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Hardcoded Cryptographic Key detected`                                                                                                                                                                                          |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [SOC2,PCI-DSS,HIPAA,GDPR,ISO27001,NIST-CSF]`                                                                                                                                                                          |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Detects string literals or hardcoded byte arrays used as keys in cryptographic operations.

## Examples

### ❌ Incorrect

```javascript
crypto.createCipheriv('aes-256-gcm', 'my-secret-key-123456', iv);
crypto.createCipheriv('aes-256-gcm', Buffer.from('hardcodedkey'), iv);
crypto.createDecipheriv('aes-256-gcm', 'hardcoded-key', iv);
```

### ✅ Correct

```javascript
crypto.createCipheriv('aes-256-gcm', process.env.KEY, iv);
crypto.createCipheriv('aes-256-gcm', keyFromKms, iv);
crypto.createCipheriv('aes-256-gcm', Buffer.from(envKey), iv);
```

## Options

This rule has no options.

## When Not To Use It

Never. Cryptographic keys should never be hardcoded in production code.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Key from External Module

**Why**: Keys imported from other modules are not traceable as "hardcoded" if they are identifiers.

```typescript
// ❌ NOT DETECTED - if keys.ts has a hardcoded string
import { JWT_KEY } from './keys';
crypto.createCipheriv('aes-256-gcm', JWT_KEY, iv);
```

**Mitigation**: Run the rule across the entire project.

### Computed Keys

**Why**: Keys built via complex string manipulation are not resolved.

```typescript
// ❌ NOT DETECTED
const key = 'part1' + 'part2';
crypto.createCipheriv('aes-256-gcm', key, iv);
```

**Mitigation**: Avoid building keys via concatenation.
