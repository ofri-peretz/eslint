# prefer-pool-query

> **Keywords:** pool, simplicity, quality, pg, node-postgres

Suggests using `pool.query()` for single-shot queries instead of manual connect/release.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect       | Details                  |
| ------------ | ------------------------ |
| **Severity** | Low (quality/simplicity) |
| **Category** | Best Practices           |

## Rule Details

When executing a single query without transactions, `pool.query()` is simpler and handles client release automatically.

### ❌ Incorrect

```typescript
async function getUser(id: string) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    return result.rows[0];
  } finally {
    client.release();
  }
}
```

### ✅ Correct

```typescript
// Simple: pool.query() handles connect/release
async function getUser(id: string) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// Use connect() for transactions
async function transferFunds(from: string, to: string, amount: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, from],
    );
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, to],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

## Error Message Format

```
📋 | Single query with connect/release - use pool.query() instead | LOW
   Fix: Replace with pool.query() for simpler code
```

## When Not To Use It

- When you need session variables or prepared statements
- When connection reuse is critical for performance

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Connection management
- [no-transaction-on-pool](./no-transaction-on-pool.md) - Transaction patterns
