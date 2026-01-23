# no-key-reuse

> No Key Reuse

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                    |
| ----------------- | ---------------------------------------------------------- |
| **CWE Reference** | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) |
| **Severity**      | Critical (security risk)                                   |
| **Auto-Fix**      | ❌ No auto-fix available                                   |
| **Category**      | Security                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                    |
| **Best For**      | Ensuring unique keys for sensitive encryption operations   |

## Description

Disallow the reuse of the same cryptographic key for different purposes or across multiple encryption operations within the same scope. Reusing keys can significantly weaken encryption and leak information about the plaintext.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-327 - Use of a Broken or Risky Cryptographic Algorithm

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-327 OWASP:A04 CVSS:7.5 | Cryptographic Key Reuse detected | CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A04_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Cryptographic Key Reuse detected`                                                                                                                                                                                              |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                                    |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Detects cases where the same identifier is used as a key in multiple `createCipheriv` calls in the same file.

## Examples

### ❌ Incorrect

```javascript
crypto.createCipheriv('aes-256-gcm', sharedKey, iv1);
crypto.createCipheriv('aes-256-gcm', sharedKey, iv2);
```

### ✅ Correct

```javascript
crypto.createCipheriv('aes-256-gcm', key1, iv1);
crypto.createCipheriv('aes-256-gcm', key2, iv2);
```

## Options

This rule has no options.

## When Not To Use It

Only if key reuse is explicitly required by a specific protocol (extremely rare and dangerous).

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Inter-file Key Reuse

**Why**: ESLint analyzes files in isolation. Reusing a key in two different files is not detected.

```typescript
// file1.ts
crypto.createCipheriv('aes', sharedKey, iv1);
// file2.ts
crypto.createCipheriv('aes', sharedKey, iv2);
```

**Mitigation**: Manage keys centrally.

### Reuse via Different Identifiers

**Why**: If the same key is stored in two variables, the rule won't know they are the same key.

```typescript
const key1 = getSecret();
const key2 = key1;
crypto.createCipheriv('aes', key1, iv1);
crypto.createCipheriv('aes', key2, iv2);
```

**Mitigation**: Avoid variable duplication for secrets.
