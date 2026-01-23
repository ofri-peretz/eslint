# no-insecure-key-derivation

> No Insecure Key Derivation

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                          |
| ----------------- | ---------------------------------------------------------------- |
| **CWE Reference** | [CWE-916](https://cwe.mitre.org/data/definitions/916.html)       |
| **Severity**      | Critical (security risk)                                         |
| **Auto-Fix**      | ✅ Auto-fix available (iterations)                               |
| **Category**      | Security                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                          |
| **Best For**      | Protecting passwords and sensitive keys from brute-force attacks |

## Description

Disallow the use of insecure key derivation parameters, specifically insufficient iterations in PBKDF2. Low iteration counts make it significantly easier for attackers to crack passwords via brute-force or rainbow table attacks.

## OWASP Mapping

- **OWASP Top 10**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-916 - Use of Password Hash with Insufficient Computational Effort

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-916 OWASP:A04 CVSS:9.1 | Insecure Key Derivation detected | CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001,NIST-CSF]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A02_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-916](https://cwe.mitre.org/data/definitions/916.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:9.1](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description**     | Specific vulnerability | `Insecure Key Derivation detected`                                                                                                                                                                                              |
| **Severity & Compliance** | Impact assessment      | `CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001,NIST-CSF]`                                                                                                                                                                               |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                            |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A02_2021-Injection/)                                                                                                                                                                     |

## Rule Details

Enforces a minimum iteration count for `pbkdf2` and `pbkdf2Sync` (default: 100,000 for SHA-256).

## Examples

### ❌ Incorrect

```javascript
crypto.pbkdf2(password, salt, 1000, 32, 'sha256', callback);
crypto.pbkdf2Sync(password, salt, 5000, 32, 'sha256');
```

### ✅ Correct

```javascript
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', callback);
crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256');
```

## Options

| Option          | Type     | Default   | Description                             |
| --------------- | -------- | --------- | --------------------------------------- |
| `minIterations` | `number` | `100,000` | Minimum iterations for PBKDF2 (SHA-256) |

## When Not To Use It

Only if you are using an extremely slow hashing algorithm where lower iterations are equivalent in effort (highly uncommon for web apps).

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Iterations from Variable

**Why**: Iteration counts from variables not resolved.

```typescript
// ❌ NOT DETECTED
const iterations = 100;
crypto.pbkdf2(pw, salt, iterations, 32, 'sha256', cb);
```

**Mitigation**: Hardcode iteration counts as constants.

### Custom PBKDF2 Wrappers

**Why**: Custom functions wrapping crypto calls are not traced.

```typescript
// ❌ NOT DETECTED
myHashPass(pw, salt, 100);
```

**Mitigation**: Apply the rule to wrapper implementations.
