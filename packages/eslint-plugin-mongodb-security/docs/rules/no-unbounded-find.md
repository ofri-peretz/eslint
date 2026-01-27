---
title: no-unbounded-find
description: no-unbounded-find
category: security
severity: medium
tags: ['security', 'mongodb']
autofix: false
---


> **Keywords:** CWE-400, resource exhaustion, limit, MongoDB, DoS, security

Requires `limit()` on find queries to prevent resource exhaustion from unbounded result sets.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                       |
| ----------------- | ----------------------------- |
| **CWE Reference** | CWE-400 (Resource Exhaustion) |
| **OWASP**         | A04:2021 - Insecure Design    |
| **Severity**      | Low (CVSS: 4.3)               |
| **Category**   | Security |

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-400 OWASP:A06 CVSS:7.5 | Uncontrolled Resource Consumption (ReDoS) detected | HIGH
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A06_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Uncontrolled Resource Consumption (ReDoS) detected` |
| **Severity & Compliance** | Impact assessment | `HIGH` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A06_2021-Injection/) |

## Rule Details

Unbounded queries can:

- Exhaust server memory
- Cause denial of service
- Impact database performance
- Expose excessive data

### ❌ Incorrect

```typescript
// No limit - could return millions of documents
const users = await User.find({ active: true });

// Cursor without limit
const cursor = db.collection('logs').find({});
```

### ✅ Correct

```typescript
// Explicit limit
const users = await User.find({ active: true }).limit(100);

// Pagination
const users = await User.find()
  .skip((page - 1) * pageSize)
  .limit(pageSize);

// findOne is inherently limited
const user = await User.findOne({ email });
```

## Known False Negatives

### Limit in Options Object

```typescript
// ❌ NOT DETECTED
User.find({}, null, { limit: 100 });
```

### Dynamic Limit

```typescript
// ❌ NOT DETECTED
User.find().limit(config.maxResults);
```

## When Not To Use It

- For batch processing jobs that intentionally process all documents
- When using streaming cursors for pagination
- Admin dashboards with controlled access

## References

- [MongoDB cursor.limit()](https://www.mongodb.com/docs/manual/reference/method/cursor.limit/)
- [CWE-400](https://cwe.mitre.org/data/definitions/400.html)
