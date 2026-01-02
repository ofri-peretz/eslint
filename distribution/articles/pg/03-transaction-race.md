---
title: 'Transaction Race Conditions: Why BEGIN on Pool Breaks Everything'
published: true
description: "Using BEGIN/COMMIT on a PostgreSQL pool instead of a dedicated client creates subtle race conditions. Here's how to fix it."
tags: postgresql, nodejs, database, eslint
cover_image:
canonical_url:
---

This code looks correct. It passes all tests. It works in development.

In production with 100 concurrent users, it corrupts data.

## The Bug

```javascript
// ❌ Dangerous: Transaction on pool
async function transferFunds(from, to, amount) {
  await pool.query('BEGIN');
  await pool.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [
    amount,
    from,
  ]);
  await pool.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [
    amount,
    to,
  ]);
  await pool.query('COMMIT');
}
```

## Why It Fails

A PostgreSQL **pool** is a set of client connections. Each `pool.query()` can use a **different client**.

```
Request 1: pool.query('BEGIN')     → Client A
Request 1: pool.query('UPDATE...')  → Client B (different!)
Request 2: pool.query('BEGIN')     → Client A (reused!)
```

Your transaction is now spread across multiple clients. Your data is now inconsistent.

## The Correct Pattern

```javascript
// ✅ Safe: Get dedicated client, use it for entire transaction
async function transferFunds(from, to, amount) {
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

**Same client** for `BEGIN`, all queries, and `COMMIT`. Transaction integrity guaranteed.

## The Rule

```javascript
// ❌ pool.query('BEGIN')      → Error
// ❌ pool.query('COMMIT')     → Error
// ❌ pool.query('ROLLBACK')   → Error
// ❌ pool.query('SAVEPOINT')  → Error

// ✅ client.query('BEGIN')    → OK
// ✅ pool.query('SELECT...')  → OK (no transaction)
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

The `no-transaction-on-pool` rule catches every case:

```bash
src/transfer.ts
  3:9  error  🔒 CWE-362 | Transaction command on pool - use pool.connect() for transactions
               Fix: const client = await pool.connect(); client.query('BEGIN');
```

## Helper Function Pattern

```javascript
// ✅ Reusable transaction wrapper
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Usage
await withTransaction(async (client) => {
  await client.query('UPDATE accounts SET...', [amount, from]);
  await client.query('UPDATE accounts SET...', [amount, to]);
});
```

## When To Use What

| Scenario                     | Use                                 |
| ---------------------------- | ----------------------------------- |
| Single query                 | `pool.query()`                      |
| Multiple independent queries | `pool.query()`                      |
| Transaction (BEGIN/COMMIT)   | `pool.connect()` → `client.query()` |
| Long-running session         | `pool.connect()` → `client.query()` |

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Don't let race conditions corrupt your data.

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: no-transaction-on-pool](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-transaction-on-pool.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)