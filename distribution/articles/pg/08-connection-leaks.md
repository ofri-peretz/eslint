---
title: 'PostgreSQL Connection Leaks: The pool.connect() Trap'
published: false
description: 'Forgetting client.release() exhausts your connection pool. Here is the pattern that causes 90% of pg connection issues.'
tags: postgresql, nodejs, database, eslint
cover_image:
series: PostgreSQL Security
---

```javascript
app.get('/users', async (req, res) => {
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM users');
  res.json(result.rows);
  // 💀 Forgot client.release()
});
```

After enough requests, your app hangs. No new connections available.

## The Problem

Every `pool.connect()` **borrows** a connection. Every `client.release()` **returns** it.

```javascript
// Pool starts with 10 connections
pool.connect(); // 9 available
pool.connect(); // 8 available
pool.connect(); // 7 available
// ...
pool.connect(); // 0 available
pool.connect(); // HANGS! Waiting for connection...
```

## Why It Happens

### Pattern 1: Early Return

```javascript
async function getUser(id) {
  const client = await pool.connect();

  if (!id) {
    return null; // 💀 Connection leaked!
  }

  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  client.release();
  return result.rows[0];
}
```

### Pattern 2: Unhandled Error

```javascript
async function createUser(data) {
  const client = await pool.connect();
  await client.query('INSERT INTO users VALUES ($1)', [data]); // 💥 Throws
  client.release(); // Never reached!
}
```

### Pattern 3: Missing in Branch

```javascript
async function conditionalQuery(condition) {
  const client = await pool.connect();

  if (condition) {
    const result = await client.query('...');
    client.release();
    return result;
  }
  // 💀 No release in else branch!
}
```

## The Fix: try/finally

```javascript
// ✅ Guaranteed release
async function getUser(id) {
  const client = await pool.connect();

  try {
    if (!id) {
      return null;
    }

    const result = await client.query('SELECT * FROM users WHERE id = $1', [
      id,
    ]);
    return result.rows[0];
  } finally {
    client.release(); // Always runs!
  }
}
```

## Better Fix: pool.query()

```javascript
// ✅ Even better: Let pool manage connections
async function getUser(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}
// No connect(), no release(), no leak!
```

## When You Need pool.connect()

For **transactions**, you must use the same client:

```javascript
async function transferMoney(from, to, amount) {
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
    client.release(); // ✅ Always release, even on error
  }
}
```

## Double Release Problem

```javascript
// ❌ Dangerous: Double release
const client = await pool.connect();
try {
  // ...
  client.release();
} catch (e) {
  client.release(); // 💥 Already released!
}
```

```javascript
// ✅ Safe: Use finally only
const client = await pool.connect();
try {
  // ...
} finally {
  client.release();
}
```

## ESLint Rules

```javascript
// eslint.config.js
import pg from 'eslint-plugin-pg';

export default [
  {
    rules: {
      'pg/no-missing-client-release': 'error',
      'pg/prevent-double-release': 'error',
      'pg/prefer-pool-query': 'warn',
      'pg/no-transaction-on-pool': 'error',
    },
  },
];
```

### Error Output

```bash
src/db.ts
  15:3  error  🔒 CWE-772 | pool.connect() without client.release()
               Risk: Connection leak exhausts pool, causing app hang
               Fix: Add client.release() in finally block

  28:5  warn   💡 Use pool.query() instead of pool.connect()
               Reason: No transaction needed - pool handles connection lifecycle
```

## Connection Pool Monitoring

```javascript
// Log pool status
setInterval(() => {
  console.log({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}, 10000);

// Alert on waiting connections
pool.on('acquire', () => {
  if (pool.waitingCount > 0) {
    console.warn('Clients waiting for connections!');
  }
});
```

## Quick Install


```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule: no-missing-client-release](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-pg/docs/rules/no-missing-client-release.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Count your pool.connect() calls. Are they all released?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
