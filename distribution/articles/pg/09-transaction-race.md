---
title: 'Transactions on Pool: The Race Condition Bug in pg'
published: false
description: 'Using BEGIN/COMMIT on pool instead of client causes race conditions. Here is why and how ESLint catches it.'
tags: postgresql, nodejs, database, eslint
cover_image:
series: PostgreSQL Security
---

# Transactions on Pool: The Race Condition Bug in pg

```javascript
await pool.query('BEGIN');
await pool.query('UPDATE accounts SET balance = balance - 100');
await pool.query('UPDATE accounts SET balance = balance + 100');
await pool.query('COMMIT');
```

This code looks correct. It's a **race condition bomb**.

## The Problem

`pool.query()` can use **any available connection**:

```
Request 1: BEGIN     (Connection A)
Request 2: BEGIN     (Connection B)
Request 1: UPDATE    (Connection B!)  ← Wrong connection!
Request 2: UPDATE    (Connection A!)  ← Wrong connection!
Request 1: COMMIT    (Connection A)   ← Commits Request 2's work!
Request 2: COMMIT    (Connection B)   ← Commits Request 1's work!
```

Each `pool.query()` might use a different connection. Your transaction is spread across connections.

## Real-World Impact

```javascript
// Payment processor
await pool.query('BEGIN');
await pool.query('UPDATE accounts SET balance = balance - $1', [amount]);
// Another request's query runs on this connection!
await pool.query('INSERT INTO transactions VALUES (...)');
await pool.query('COMMIT');

// Result: Money disappears, transactions half-complete
```

## The Fix: Use Client

```javascript
// ✅ Same client for entire transaction
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1', [amount]);
  await client.query('INSERT INTO transactions VALUES (...)');
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Why This Works

```
Request 1: connect() → Client A
Request 1: BEGIN     (Client A)
Request 1: UPDATE    (Client A)  ← Same client!
Request 1: COMMIT    (Client A)  ← Same client!
Request 1: release() Client A → Pool
```

The client is **reserved** for your transaction.

## Transaction Helper Pattern

```javascript
// ✅ Reusable transaction wrapper
async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Usage:
await withTransaction(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - $1', [amount]);
  await client.query('INSERT INTO transactions VALUES (...)');
});
```

## Detecting the Bug

The symptoms:

- Random data corruption
- "Transaction already committed" errors
- Impossible database states
- Works in development, fails in production

Hard to debug because it only happens under **concurrent load**.

## ESLint Rules

```javascript
// eslint.config.js
import pg from 'eslint-plugin-pg';

export default [
  {
    rules: {
      'pg/no-transaction-on-pool': 'error',
    },
  },
];
```

### Detection Pattern

The rule flags:

- `pool.query('BEGIN')`
- `pool.query('COMMIT')`
- `pool.query('ROLLBACK')`
- `pool.query('START TRANSACTION')`

### Error Output

```bash
src/payments.ts
  22:3  error  🔒 CWE-362 CVSS:7.5 | Transaction command on pool
               Risk: Race condition - queries may execute on different connections
               Fix: Use pool.connect() client for transactions

               async function transfer() {
                 const client = await pool.connect();
                 try {
                   await client.query('BEGIN');
                   // ... your queries with client, not pool
                   await client.query('COMMIT');
                 } catch (e) {
                   await client.query('ROLLBACK');
                   throw e;
                 } finally {
                   client.release();
                 }
               }
```

## When pool.query() is Fine

```javascript
// ✅ Single query (no transaction)
const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

// ✅ Independent queries
await pool.query('UPDATE stats SET views = views + 1');
await pool.query('INSERT INTO logs VALUES ($1)', [log]);
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-pg %}
📦 npm install eslint-plugin-pg
{% endcta %}

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule: no-transaction-on-pool](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-pg/docs/rules/no-transaction-on-pool.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Search for pool.query('BEGIN'). Found any?**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
