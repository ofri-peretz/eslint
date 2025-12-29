---
title: 'The Connection Leak That Took Down Our Production Database'
published: false
description: "A missing client.release() caused our PostgreSQL connections to exhaust. Here's how ESLint prevents this from ever happening again."
tags: postgresql, nodejs, database, eslint
cover_image:
canonical_url:
---

# The Connection Leak That Took Down Our Production Database

It was 3 AM. PagerDuty woke me up. Our API was returning 500 errors.

The database was fine. CPU was fine. Memory was fine. But every query was timing out.

## The Problem

```
FATAL: too many connections for role "app_user"
```

We had exhausted our 100-connection limit. But our traffic was normal. Where were all the connections going?

## The Leak

After hours of debugging, we found it:

```javascript
// ❌ The connection leak hiding in our codebase
async function getUserOrders(userId) {
  const client = await pool.connect();
  const orders = await client.query('SELECT * FROM orders WHERE user_id = $1', [
    userId,
  ]);
  return orders.rows;
  // Where's client.release()? 🤔
}
```

Every call leaked a connection. With 50 requests/minute, we exhausted the pool in 2 minutes.

## Why This Happens

| Scenario                        | Result                          |
| ------------------------------- | ------------------------------- |
| Forgot `release()` entirely     | Connection never returned       |
| Early return before `release()` | Connection leaked               |
| Exception thrown                | `finally` block missing         |
| Async error                     | Unhandled rejection, no cleanup |

## The Correct Pattern

```javascript
// ✅ Always release in finally block
async function getUserOrders(userId) {
  const client = await pool.connect();
  try {
    const orders = await client.query(
      'SELECT * FROM orders WHERE user_id = $1',
      [userId],
    );
    return orders.rows;
  } finally {
    client.release(); // Always executes
  }
}
```

Or even better—don't use `connect()` at all for simple queries:

```javascript
// ✅ Best pattern: use pool.query() directly
async function getUserOrders(userId) {
  const orders = await pool.query('SELECT * FROM orders WHERE user_id = $1', [
    userId,
  ]);
  return orders.rows;
}
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Now every missing release is caught:

```bash
src/orders.ts
  3:17  error  🔒 CWE-772 | Missing client.release() detected
               Fix: Add client.release() in finally block or use pool.query() for simple queries
```

## The Rule: `no-missing-client-release`

This rule tracks:

- Every `pool.connect()` call
- Every code path through the function
- Whether `client.release()` is called on all paths
- Whether it's in a `finally` block (recommended)

## Production Impact

After deploying this rule:

- **0 connection leaks** in 6 months
- **No more 3 AM pages** for connection exhaustion
- **CI catches issues** before they reach staging

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Don't wait for the 3 AM wake-up call.

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: no-missing-client-release](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-missing-client-release.md)

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
