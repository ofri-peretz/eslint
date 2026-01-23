# no-sha1-hash

> No Sha1 Hash

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) (Broken Algorithm) |
| **Severity**      | Critical                                                                      |
| **Auto-Fix**      | ✅ Auto-fix available                                                         |
| **Category**      | Security                                                                      |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                       |
| **Best For**      | Modernizing hashing operations, moving away from SHA-1                        |

## Description

Disallow the use of the SHA-1 hashing algorithm specifically from the `crypto-hash` library. SHA-1 is cryptographically broken and should no longer be used for security-sensitive operations.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-327 - Use of a Broken or Risky Cryptographic Algorithm

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-327 OWASP:A04 CVSS:7.5 | Broken Cryptographic Algorithm detected | CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Broken Cryptographic Algorithm detected`                                                                                                                                                                                       |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                                    |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Disallows importing `sha1` from the `crypto-hash` package and suggests using `sha256` or `sha512` instead.

## Examples

### ❌ Incorrect

```javascript
import { sha1 } from 'crypto-hash';
sha1(data);
```

### ✅ Correct

```javascript
import { sha256 } from 'crypto-hash';
sha256(data);

import { sha512 } from 'crypto-hash';
sha512(data);
```

## Options

This rule has no options.

## When Not To Use It

Only when verifying legacy data that was already hashed with SHA-1, although even then, a migration plan to re-hash with a stronger algorithm should be considered.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### SHA-1 from Other Packages

**Why**: The rule specifically targets the `crypto-hash` package.

```typescript
// ❌ NOT DETECTED
import { sha1 } from 'some-other-package';
sha1(data);
```

**Mitigation**: Use `no-weak-hash-algorithm` for a broader check.

### Dynamic Import

**Why**: Dynamic imports are not statically resolved by this rule.

```typescript
// ❌ NOT DETECTED
const { sha1 } = await import('crypto-hash');
```

**Mitigation**: Use static imports for security-sensitive modules.
