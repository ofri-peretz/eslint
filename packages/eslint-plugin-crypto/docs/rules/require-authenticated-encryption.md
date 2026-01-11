# require-authenticated-encryption

## Description

TODO: Add description for this rule.

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

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-327](https://cwe.mitre.org/data/definitions/327.html) [OWASP:A04](https://owasp.org/Top10/A04_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Broken Cryptographic Algorithm detected` |
| **Severity & Compliance** | Impact assessment | `HIGH [PCI-DSS,HIPAA,ISO27001,NIST-CSF]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A04_2021-Injection/) |

## Rule Details

TODO: Add rule details.

## Examples

### ❌ Incorrect

```javascript
// TODO: Add incorrect example
```

### ✅ Correct

```javascript
// TODO: Add correct example
```

## Options

This rule has no options.

## When Not To Use It

TODO: Add when not to use.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Credentials from Config

**Why**: Config values not traced.

```typescript
// ❌ NOT DETECTED - From config
const password = config.dbPassword;
```

**Mitigation**: Use proper secrets management.

### Environment Variables

**Why**: Env var content not analyzed.

```typescript
// ❌ NOT DETECTED - Env var
const secret = process.env.API_KEY;
```

**Mitigation**: Never hardcode or expose secrets.

### Dynamic Credential Access

**Why**: Dynamic property access not traced.

```typescript
// ❌ NOT DETECTED - Dynamic
const cred = credentials[type];
```

**Mitigation**: Audit all credential access patterns.
