# no-missing-client-release

> **Keywords:** connection leak, resource management, CWE-772, pg, node-postgres, pool

Ensures acquired pool clients are released back to the pool.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                               |
| ----------------- | ------------------------------------- |
| **CWE Reference** | CWE-772 (Missing Release of Resource) |
| **Severity**      | High (CVSS: 7.5)                      |
| **Category**      | Resource Management                   |

## Rule Details

Failing to release clients causes connection pool exhaustion, leading to application hangs.

### ❌ Incorrect

```typescript
async function query() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  // Missing client.release() - connection leak!
}
```

### ✅ Correct

```typescript
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

// Using pool.query() directly (auto-releases)
async function simpleQuery() {
  await pool.query('SELECT 1');
}
```

## Error Message Format

```
⚠️ CWE-772 | Pool client acquired but never released | HIGH
   Fix: Add client.release() in a finally block
```

## When Not To Use It

- When using connection wrappers that handle release

## Related Rules

- [prevent-double-release](./prevent-double-release.md) - Prevents releasing twice
- [prefer-pool-query](./prefer-pool-query.md) - Suggests simpler pattern
