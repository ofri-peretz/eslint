---
title: no-unbounded-find
description: Requires limit() on find queries to prevent resource exhaustion from unbounded result sets.
tags: ['security', 'mongodb']
category: security
severity: medium
cwe: CWE-400
owasp: "A04:2021"
autofix: false
---

> **Keywords:** CWE-400, resource exhaustion, limit, MongoDB, DoS, security


<!-- @rule-summary -->
Requires limit() on find queries to prevent resource exhaustion from unbounded result sets.
<!-- @/rule-summary -->

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
| **Risk Standards** | Security benchmarks | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) [OWASP:A06](https://owasp.org/Top10/A06_2021-Injection/) [CVSS:7.5](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
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
const x = 1;
```

## Receiver Requirement

`find()` is are not MongoDB-exclusive. This rule only fires when the receiver is
plausibly a Mongo model, collection or database handle — a PascalCase model
identifier (`User.find(...)`), a name ending in `Model`/`Collection`/`Schema`
(`this.userModel`, the idiomatic `@InjectModel()` injection), a bare
`db`/`model`/`collection`, a `db.collection('users')` chain, or a value bound
to a `mongodb`/`mongoose` import. PascalCase counts only for a module-level
identifier, not for a property reached through `this` — `this.UserRepository`
is an injected service, not a model.

It stays silent on:

- `Array.prototype.find` — an array-literal receiver (`[a, b].find(Boolean)`)
  or any call whose first argument is a predicate (`list.find((x) => x.id)`).
  A Mongo `find()` takes a filter object; an array `find` takes a function.
- Generic repository wrappers and other ORMs (`this.repository.find(...)` on a
  TypeORM `Repository<T>`).

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