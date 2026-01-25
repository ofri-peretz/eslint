---
title: prefer-pool-query
description: 'prefer-pool-query'
category: security
tags: ['security', 'postgres']
---


> **Keywords:** pool, simplicity, quality, pg, node-postgres
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Suggests using `pool.query()` for single-shot queries instead of manual connect/release.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect       | Details                  |
| ------------ | ------------------------ |
| **Severity** | Low (quality/simplicity) |
| **Category**   | Security |

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Multiple Queries Across Functions

**Why**: Control flow across functions is not tracked.

```typescript
// ❌ FALSE POSITIVE RISK - May flag valid multi-query pattern
async function processUser(id: string) {
  const client = await pool.connect();
  try {
    const user = await getUser(client, id); // First query
    await updateLastSeen(client, id); // Second query - justified connect!
    return user;
  } finally {
    client.release();
  }
}
```

**Mitigation**: Use inline queries or disable rule locally with comment.

### Session State Requirements

**Why**: Session-level needs like prepared statements are not detected.

```typescript
// ❌ FALSE POSITIVE RISK - Session state needed
async function batchInsert(items: Item[]) {
  const client = await pool.connect();
  try {
    await client.query('PREPARE insert_item AS INSERT INTO items VALUES ($1)');
    for (const item of items) {
      await client.query('EXECUTE insert_item($1)', [item]); // Legit connect use
    }
  } finally {
    client.release();
  }
}
```

**Mitigation**: Disable rule for files with session-stateful patterns.

### Aliased Pool

**Why**: Renamed pool references are not recognized.

```typescript
// ❌ NOT DETECTED - Aliased pool
const db = pool;
const client = await db.connect();
// ... single query pattern not flagged
```

**Mitigation**: Use consistent naming for database pools.

### Complex Control Flow

**Why**: Loops or conditionals may hide multi-query patterns.

```typescript
// ❌ FALSE POSITIVE RISK - Loop may execute multiple queries
async function process(ids: string[]) {
  const client = await pool.connect();
  try {
    for (const id of ids) {
      await client.query('SELECT * FROM users WHERE id = $1', [id]);
    }
  } finally {
    client.release();
  }
}
```

**Mitigation**: Use `// eslint-disable-next-line` for legitimate patterns.

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Connection management
- [no-transaction-on-pool](./no-transaction-on-pool.md) - Transaction patterns
