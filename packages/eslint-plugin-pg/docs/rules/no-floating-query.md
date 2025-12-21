# no-floating-query

> **Keywords:** unhandled promise, CWE-252, pg, node-postgres, async

Ensures query promises are awaited or handled.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                          |
| ----------------- | -------------------------------- |
| **CWE Reference** | CWE-252 (Unchecked Return Value) |
| **Severity**      | Medium (CVSS: 5.0)               |
| **Category**      | Correctness                      |

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

```
⚠️ CWE-252 | Unhandled query promise | MEDIUM
   Fix: Add await, .then()/.catch(), or assign to a variable
```

## When Not To Use It

- For intentional fire-and-forget logging where failures are acceptable
- When using a global unhandledRejection handler

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Connection management
