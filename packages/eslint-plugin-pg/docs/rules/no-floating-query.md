---
title: no-floating-query
description: Ensures query promises are awaited or handled.
tags: ['security', 'postgres']
category: security
severity: medium
cwe: CWE-252
autofix: false
---

> **Keywords:** unhandled promise, CWE-252, pg, node-postgres, async

<!-- @rule-summary -->
Ensures query promises are awaited or handled.
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Ensures query promises are awaited or handled.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                          |
| ----------------- | -------------------------------- |
| **CWE Reference** | CWE-252 (Unchecked Return Value) |
| **Severity**      | Medium (CVSS: 5.0)               |
| **Category**   | Security |

## Rule Details

Unhandled query promises can lead to silent failures, data inconsistency, and unhandled rejections.

### ❌ Incorrect

```typescript
// Promise not awaited
client.query('INSERT INTO logs VALUES ($1)', [message]);

// Fire and forget
pool.query('UPDATE stats SET count = count + 1');
```

### ✅ Correct

```typescript
// Awaited
await client.query('INSERT INTO logs VALUES ($1)', [message]);

// With .then/.catch
pool
  .query('UPDATE stats SET count = count + 1')
  .catch((err) => console.error('Stats update failed', err));

// Assigned for later
const promise = client.query('SELECT 1');
await promise;
```

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-252 OWASP:A10 CVSS:5.3 | Unchecked Return Value detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A10_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-252](https://cwe.mitre.org/data/definitions/252.html) [OWASP:A10](https://owasp.org/Top10/A10_2021-Injection/) [CVSS:5.3](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Unchecked Return Value detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A10_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### void Operator

**Why**: The `void` operator is sometimes used to explicitly ignore promises.

```typescript
// ❌ NOT DETECTED - void suppresses the warning
void client.query('INSERT INTO logs VALUES ($1)', [msg]);
```

### Promise.allSettled Wrappers

**Why**: Queries passed into array methods for batch execution aren't traced.

```typescript
// ❌ NOT DETECTED
const queries = items.map((i) => client.query('INSERT ...', [i]));
// These floating promises might not be awaited later
```

### Callback Ignoring Result

**Why**: When the query is passed to a callback that ignores it.

```typescript
// ❌ NOT DETECTED
setImmediate(() => client.query('DELETE FROM temp_data'));
```

### Conditional Execution

**Why**: Queries in short-circuit expressions may float.

```typescript
// ❌ NOT DETECTED
shouldLog && client.query('INSERT INTO logs VALUES ($1)', [msg]);
```

> **Workaround**: Use `@typescript-eslint/no-floating-promises` for comprehensive coverage.

## When Not To Use It

- For intentional fire-and-forget logging where failures are acceptable
- When using a global unhandledRejection handler

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Connection management