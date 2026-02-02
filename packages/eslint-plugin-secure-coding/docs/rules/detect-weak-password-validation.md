---
title: detect-weak-password-validation
description: Detects weak password length requirements (less than 8 characters) in validation code.
tags: ['security', 'core']
category: security
severity: medium
cwe: CWE-521
owasp: "A07:2021"
autofix: false
---

> **Keywords:** password policy, weak password, CWE-521, authentication, password length, security


<!-- @rule-summary -->
Detects weak password length requirements (less than 8 characters) in validation code.
<!-- @/rule-summary -->

Detects weak password length requirements (less than 8 characters) in validation code.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-521](https://cwe.mitre.org/data/definitions/521.html) (Weak Password Requirements)                                             |
| **OWASP**         | [A07:2021 Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/) |
| **Severity**      | Critical                                                                                                                            |
| **Category**   | Security |

## Rule Details

Weak password requirements allow attackers to easily brute-force or guess user credentials. This rule detects password length checks that are too permissive (less than 8 characters).

Modern security standards recommend minimum 12 characters with complexity requirements.

## Examples

### ❌ Incorrect

```javascript
// Too short - easily brute-forced
if (password.length >= 4) {
  return true;
}

// Still too weak
if (pwd.length > 5) {
  acceptPassword();
}

// Exact match is weak
if (pass.length === 6) {
  // Accept password
}
```

### ✅ Correct

```javascript
// NIST minimum recommendation
if (password.length >= 8) {
  return validateComplexity(password);
}

// Better - 12+ characters
if (password.length >= 12) {
  return true;
}

// Best - use a password validation library
import { zxcvbn } from 'zxcvbn';
const result = zxcvbn(password);
if (result.score >= 3) {
  return true;
}
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-521 OWASP:A07 CVSS:5.3 | Weak Password Requirements detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A07_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-521](https://cwe.mitre.org/data/definitions/521.html) [OWASP:A07](https://owasp.org/Top10/A07_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description** | Specific vulnerability | `Weak Password Requirements detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A07_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Configuration-Based Length

**Why**: Length values from configuration are not traced.

```typescript
// ❌ NOT DETECTED - Config value
const minLength = config.passwordMinLength; // Could be 4!
if (password.length >= minLength) {
}
```

**Mitigation**: Audit configuration files separately.

### Validation in External Functions

**Why**: Password validation in helper functions not analyzed.

```typescript
// ❌ NOT DETECTED - External validator
validatePassword(password); // May have weak internal checks
```

**Mitigation**: Apply rule to all password validation code.

### Non-Standard Variable Names

**Why**: Only detects variables containing "password", "pwd", or "pass".

```typescript
// ❌ NOT DETECTED - Non-standard naming
if (userCredential.length >= 4) {
}
if (secretInput.length >= 4) {
}
```

**Mitigation**: Use consistent naming conventions.

## When Not To Use It

- When using a dedicated password validation library (zxcvbn, password-validator)
- In test files mocking password validation
- When the length check is combined with other complexity requirements

## Further Reading

- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [CWE-521: Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)

## Related Rules

- [no-hardcoded-credentials](./no-hardcoded-credentials.md) (in eslint-plugin-pg)
- [no-client-side-auth-logic](./no-client-side-auth-logic.md)

---

**Category:** Security  
**Type:** Problem  
**Recommended:** Yes