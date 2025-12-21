# no-select-all

> **Keywords:** SELECT \*, performance, quality, pg, node-postgres

Discourages `SELECT *` in favor of explicit column lists.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect       | Details                   |
| ------------ | ------------------------- |
| **Severity** | Low (quality/performance) |
| **Category** | Performance               |

## Rule Details

`SELECT *` fetches all columns, which can:

- Transfer unnecessary data
- Break when schema changes
- Prevent query plan optimizations

### ❌ Incorrect

```typescript
await client.query('SELECT * FROM users WHERE id = $1', [id]);

await pool.query('SELECT a, b, * FROM table'); // Mixed
```

### ✅ Correct

```typescript
await client.query('SELECT id, name, email FROM users WHERE id = $1', [id]);

// COUNT(*) is acceptable
await pool.query('SELECT COUNT(*) FROM users');
```

## Error Message Format

```
📋 | Avoid SELECT * - explicitly list required columns | LOW
   Fix: Replace * with specific column names
```

## When Not To Use It

- In development/debugging scripts
- When schema is stable and all columns are needed

## Related Rules

- [no-batch-insert-loop](./no-batch-insert-loop.md) - Performance patterns
