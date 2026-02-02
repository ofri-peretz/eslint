---
title: no-bypass-middleware
description: Detects Mongoose operations that bypass middleware hooks (pre/post hooks).
tags: ['security', 'mongodb']
category: security
severity: medium
cwe: CWE-284
owasp: "A01:2021"
autofix: false
---

> **Keywords:** CWE-284, middleware, hooks, Mongoose, pre, post, security


<!-- @rule-summary -->
Detects Mongoose operations that bypass middleware hooks (pre/post hooks).
<!-- @/rule-summary -->

Detects Mongoose operations that bypass middleware hooks (pre/post hooks).

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                           |
| ----------------- | --------------------------------- |
| **CWE Reference** | CWE-284 (Improper Access Control) |
| **OWASP**         | A01:2021 - Broken Access Control  |
| **Severity**      | Medium (CVSS: 5.3)                |
| **Category**   | Security |

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-284 OWASP:A01 CVSS:7.5 | Improper Access Control detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A01_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-284](https://cwe.mitre.org/data/definitions/284.html) [OWASP:A01](https://owasp.org/Top10/A01_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Improper Access Control detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A01_2021-Injection/) |

## Rule Details

Some Mongoose methods bypass middleware hooks, which may skip:

- Password hashing
- Audit logging
- Access control checks
- Data sanitization

### Methods That Bypass Middleware

| Method                      | Runs `save` Middleware? |
| --------------------------- | ----------------------- |
| `Model.updateOne()`         | ❌ No                   |
| `Model.updateMany()`        | ❌ No                   |
| `Model.findOneAndUpdate()`  | ❌ No                   |
| `Model.findByIdAndUpdate()` | ❌ No                   |
| `document.save()`           | ✅ Yes                  |

### ❌ Incorrect

```typescript
// Bypasses pre('save') middleware - password won't be hashed!
User.findByIdAndUpdate(id, { password: 'newpassword' });

// Bypasses all document middleware
User.updateMany({ role: 'user' }, { verified: true });
```

### ✅ Correct

```typescript
// Use findOne + save to trigger middleware
const user = await User.findById(id);
user.password = 'newpassword';
await user.save(); // pre('save') runs, password gets hashed

// Or use update hooks (if implemented)
userSchema.pre('findOneAndUpdate', function () {
  // Hash password here if modified
});
```

## Known False Negatives

### Dynamic Method Calls

```typescript
// ❌ NOT DETECTED
const method = 'updateOne';
Model[method]({ ... });
```

## When Not To Use It

- When you've implemented `pre('updateOne')` and similar hooks
- For operations that intentionally skip middleware

## References

- [Mongoose Middleware](https://mongoosejs.com/docs/middleware.html)
- [CWE-284](https://cwe.mitre.org/data/definitions/284.html)