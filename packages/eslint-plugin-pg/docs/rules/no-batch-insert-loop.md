# no-batch-insert-loop

> **Keywords:** N+1 queries, performance, CWE-400, pg, node-postgres, bulk operations

Prevents INSERT/UPDATE/DELETE queries inside loops (N+1 query anti-pattern).

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                       |
| ----------------- | ----------------------------- |
| **CWE Reference** | CWE-400 (Resource Exhaustion) |
| **Severity**      | Medium (performance)          |
| **Category**      | Performance                   |

## Rule Details

Executing mutation queries in loops creates N+1 query problems, causing:

- Database connection exhaustion
- Slow execution times
- Transaction timeout issues

### ❌ Incorrect

```typescript
// N+1 inserts
for (const user of users) {
  await client.query('INSERT INTO users VALUES ($1, $2)', [user.id, user.name]);
}

// forEach with mutations
users.forEach(async (user) => {
  await pool.query('UPDATE users SET active = true WHERE id = $1', [user.id]);
});

// map with mutations
users.map((user) => client.query('INSERT INTO users VALUES ($1)', [user.id]));
```

### ✅ Correct

```typescript
// Bulk insert with unnest
await client.query(
  'INSERT INTO users SELECT * FROM unnest($1::int[], $2::text[])',
  [users.map((u) => u.id), users.map((u) => u.name)],
);

// pg-format for batching
const values = users.map((u) => [u.id, u.name]);
await client.query(format('INSERT INTO users VALUES %L', values));

// ANY for bulk updates
await client.query('UPDATE users SET active = true WHERE id = ANY($1)', [
  userIds,
]);
```

## Error Message Format

```
⚠️ CWE-400 | Mutation query inside loop - use bulk operations | MEDIUM
   Fix: Use bulk insert with unnest() or ANY() for updates
```

## When Not To Use It

- When processing results in a streaming fashion with backpressure
- For operations that must be transactionally isolated per item
- When using a batching library (e.g., DataLoader) that coalesces queries

## Related Rules

- [no-select-all](./no-select-all.md) - Query performance
