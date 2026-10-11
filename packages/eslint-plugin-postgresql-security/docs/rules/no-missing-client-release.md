---
title: no-missing-client-release
description: Ensures acquired pool clients are released back to the pool.
tags: ['security', 'postgres']
category: security
severity: medium
cwe: CWE-772
autofix: false
---

> **Keywords:** connection leak, resource management, CWE-772, pg, node-postgres, pool

<!-- @rule-summary -->
Ensures acquired pool clients are released back to the pool.
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Ensures acquired pool clients are released back to the pool.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                               |
| ----------------- | ------------------------------------- |
| **CWE Reference** | CWE-772 (Missing Release of Resource) |
| **Severity**      | High (CVSS: 7.5)                      |
| **Category**   | Security |

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Destructured Client

**Why**: The rule tracks variable references by identifier, not destructured properties.

```typescript
// ❌ NOT DETECTED
async function query() {
  const { query, release } = await pool.connect();
  await query('SELECT 1');
  // Missing release() call - not detected!
}
```

### Callback Pattern

**Why**: The callback `done` parameter requires different tracking.

```typescript
// ❌ NOT DETECTED
pool.connect((err, client, done) => {
  if (err) return callback(err);
  client.query('SELECT 1', (err, res) => {
    // Missing done() call - not detected!
    callback(err, res);
  });
});
```

### Client Passed to Functions

**Why**: When the client is handed to another function and this function runs
no query on it itself, the helper owns the lifetime (the `withClient(client,
work)` wrapper) and the rule abstains. A function that runs `client.query(...)`
itself and also lends the client to a helper is its owner, and IS checked.

```typescript
// ❌ NOT DETECTED — ownership handed off
async function query() {
  const client = await pool.connect();
  await executeQueries(client); // Does this release? Rule can't tell
}

// ✅ DETECTED (since 2026-10) — this function owns the transaction
async function signup(name) {
  const client = await pool.connect();
  await client.query('BEGIN');
  await insertUser(client, name);
  await client.query('COMMIT'); // never released
}
```

### Which receivers count as a pool

A `new Pool()` in the same file, a binding or `this.x` declared with pg's
`Pool` type (an injected pool), or any `.connect()` whose result then runs
`.query(...)` — the pool checkout shape, whatever the pool is called. A route
file that imports its pool from a relative module (`import { pool } from
'../db'`) is linted when that module imports a PostgreSQL driver.

### Thrown Exceptions Before Release

**Why**: The rule checks for presence of `.release()` call, not control flow paths.

```typescript
// ❌ NOT DETECTED - release exists but may not execute
async function query() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  throw new Error('Oops'); // Release never reached!
  client.release();
}
```

> **Workaround**: Always use try/finally pattern or `pool.query()` for simple queries.

## When Not To Use It

- When using connection wrappers that handle release

## Related Rules

- [prevent-double-release](./prevent-double-release.md) - Prevents releasing twice
- [prefer-pool-query](./prefer-pool-query.md) - Suggests simpler pattern