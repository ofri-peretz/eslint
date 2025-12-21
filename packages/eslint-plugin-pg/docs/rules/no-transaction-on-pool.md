# no-transaction-on-pool

> **Keywords:** transactions, race condition, CWE-362, pg, node-postgres, pool

Prevents running transaction commands directly on pool (must use dedicated client).

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                  |
| ----------------- | ------------------------ |
| **CWE Reference** | CWE-362 (Race Condition) |
| **Severity**      | High (CVSS: 7.5)         |
| **Category**      | Correctness              |

## Rule Details

`pool.query()` acquires a different client for each call. Transaction commands (`BEGIN`, `COMMIT`, `ROLLBACK`) on pool may execute on different connections, breaking transaction semantics.

### ❌ Incorrect

```typescript
// Each query might use a different connection!
await pool.query('BEGIN');
await pool.query('INSERT INTO users VALUES ($1)', [user]);
await pool.query('COMMIT'); // May commit nothing
```

### ✅ Correct

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO users VALUES ($1)', [user]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Error Message Format

```
⚠️ CWE-362 | Transaction command on pool causes race condition | HIGH
   Fix: Use pool.connect() and run transaction commands on the returned client
```

## When Not To Use It

- Never disable this rule - transactions on pool are always incorrect

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Ensures client release
