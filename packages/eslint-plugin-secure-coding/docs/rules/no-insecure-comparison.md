---
title: no-insecure-comparison
description: no-insecure-comparison
category: security
severity: medium
tags: ['security', 'core']
autofix: false
---


> **Keywords:** insecure comparison, CWE-697, security, ESLint rule, loose equality, type coercion, == vs ===, strict equality, JavaScript security, auto-fix, LLM-optimized, code security
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects insecure comparison operators (`==`, `!=`) that can lead to type coercion vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) and provides LLM-optimized error messages that AI assistants can automatically fix.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | CWE-697 (Incorrect Comparison)                                             |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | ✅ Yes (replaces == with ===, != with !==)                                 |
| **Category**   | Security |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | All JavaScript/TypeScript applications, especially security-sensitive code |

## Vulnerability and Risk

**Vulnerability:** Insecure comparison occurs when using loose equality operators (`==` or `!=`) which perform type coercion before comparison.

**Risk:** This can lead to logic bypasses where different values are treated as equal (e.g., `0 == "0"` or `[] == 0`). Attackers can often exploit this behavior to bypass authentication checks or authorization logic.

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-697 OWASP:A06 CVSS:5.3 | Incorrect Comparison detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-697](https://cwe.mitre.org/data/definitions/697.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Incorrect Comparison detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Rule Details

Insecure comparison operators (`==`, `!=`) use type coercion, which can lead to unexpected behavior and security vulnerabilities. This rule enforces strict equality (`===`, `!==`) which compares both value and type.

### Why This Matters

| Issue                | Impact                             | Solution                   |
| -------------------- | ---------------------------------- | -------------------------- |
| 🔒 **Security**      | Type coercion can bypass checks    | Use strict equality (===)  |
| 🐛 **Bugs**          | Unexpected type conversions        | Compare type and value     |
| 🔐 **Reliability**   | Hard-to-debug issues               | Predictable comparisons    |
| 📊 **Best Practice** | Violates JavaScript best practices | Always use strict equality |

## Detection Patterns

The rule detects:

- **Loose equality**: `==` operator
- **Loose inequality**: `!=` operator

## Examples

### ❌ Incorrect

```typescript
// Insecure comparison with type coercion
if (user.id == userId) {
  // ❌ Type coercion
  // Process user
}

// Insecure inequality
if (value != null) {
  // ❌ Type coercion
  // Handle value
}

// Ternary with loose equality
const result = a == b ? 1 : 0; // ❌ Type coercion
```

### ✅ Correct

```typescript
// Strict equality - no type coercion
if (user.id === userId) {
  // ✅ Type and value match
  // Process user
}

// Strict inequality
if (value !== null && value !== undefined) {
  // ✅ Explicit checks
  // Handle value
}

// Ternary with strict equality
const result = a === b ? 1 : 0; // ✅ Type and value match
```

## Configuration

### Default Configuration

```json
{
  "secure-coding/no-insecure-comparison": "warn"
}
```

### Options

| Option           | Type       | Default | Description                        |
| ---------------- | ---------- | ------- | ---------------------------------- |
| `allowInTests`   | `boolean`  | `false` | Allow insecure comparison in tests |
| `ignorePatterns` | `string[]` | `[]`    | Additional patterns to ignore      |

### Example Configuration

```json
{
  "secure-coding/no-insecure-comparison": [
    "warn",
    {
      "allowInTests": true,
      "ignorePatterns": ["x == y"]
    }
  ]
}
```

## Best Practices

1. **Always use strict equality** (`===`, `!==`) for all comparisons
2. **Explicit null checks**: Use `value !== null && value !== undefined` instead of `value != null`
3. **Type safety**: Strict equality prevents accidental type coercion bugs
4. **Consistency**: Use strict equality throughout the codebase

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Validate all user inputs.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(userInput); // Uses dangerous API internally
```

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic
obj[method](userInput);
```

**Mitigation**: Avoid dynamic method invocation.

## Related Rules

- [`no-unvalidated-user-input`](./no-unvalidated-user-input.md) - Detects unvalidated user input
- [`no-privilege-escalation`](./no-privilege-escalation.md) - Detects privilege escalation vulnerabilities

## Resources

- [CWE-697: Incorrect Comparison](https://cwe.mitre.org/data/definitions/697.html)
- [MDN: Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
- [JavaScript Equality Table](https://dorey.github.io/JavaScript-Equality-Table/)
