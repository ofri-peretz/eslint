---
title: prevent-double-release
description: Prevents calling client.release() multiple times on the same client.
tags: ['security', 'postgres']
category: security
severity: medium
cwe: CWE-415
autofix: false
---

> **Keywords:** double release, connection pool, CWE-415, pg, node-postgres, pool corruption

<!-- @rule-summary -->
Prevents calling client.release() multiple times on the same client.
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevents calling `client.release()` multiple times on the same client.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                   |
| ----------------- | ------------------------- |
| **CWE Reference** | CWE-415 (Double Free)     |
| **Severity**      | HIGH (CVSS: 6.5)          |
| **Category**   | Security |

## Rule Details

Releasing a PostgreSQL client twice corrupts the connection pool state:

1. First call: Returns client to pool ✅
2. Second call: Pool thinks it received a "new" client ❌
3. Result: Pool tracks phantom connections, queries timeout, memory leaks

### Detection Patterns (13 Cases)

| #   | Pattern                     | Description                                |
| --- | --------------------------- | ------------------------------------------ |
| 1   | **Try + Catch**             | Release in try AND catch blocks            |
| 2   | **Catch + Try**             | Reversed order detection                   |
| 3   | **Switch Fallthrough**      | Missing break causes double release        |
| 4   | **If Branch + After**       | Release in either branch of an `if` + release after it |
| 5   | **Two If Statements**       | Sequential ifs without guards              |
| 6   | **Same Block**              | Direct sequential releases                 |
| 7   | **Catch + Finally**         | Release in catch AND finally               |
| 8   | **Try + Finally**           | Release in try AND finally                 |
| 9   | **Finally + After**         | Release in finally AND after try           |
| 10  | **Try + After**             | Release in try AND after try statement     |
| 11  | **If + Finally**            | If-release (no exit) + finally release     |
| 12  | **Catch + After**           | Release in a catch that falls through AND after try |
| 13  | **Expression + Sequential** | Ternary/short-circuit release + sequential |

### ❌ Incorrect

```typescript
// Pattern: Catch + Finally
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT ...');
  } catch (e) {
    client.release(); // Released on error
    throw e;
  } finally {
    client.release(); // Released again! ❌
  }
}

// Pattern: Try + Finally
async function query() {
  const client = await pool.connect();
  try {
    client.release(); // Released in try
  } finally {
    client.release(); // Released again! ❌
  }
}

// Pattern: Switch Fallthrough
async function query(type: string) {
  const client = await pool.connect();
  switch (type) {
    case 'a':
      client.release(); // Missing break!
    case 'b':
      client.release(); // Falls through ❌
      break;
  }
}

// Pattern: Expression + Sequential
async function query() {
  const client = await pool.connect();
  condition ? client.release() : null;
  client.release(); // ❌
}

// Pattern: Short-circuit
async function query() {
  const client = await pool.connect();
  shouldRelease && client.release();
  client.release(); // ❌
}

// Pattern: Destructured release
async function query() {
  const { release } = await pool.connect();
  release();
  release(); // ❌
}
```

### ✅ Correct

```typescript
// Best: Single release point in finally
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } catch (e) {
    throw e; // Don't release here
  } finally {
    client.release(); // Only release point ✅
  }
}

// Guarded release pattern
async function queryWithGuard() {
  const client = await pool.connect();
  let released = false;

  const safeRelease = () => {
    if (!released) {
      released = true;
      client.release();
    }
  };

  try {
    return await client.query('SELECT 1');
  } finally {
    safeRelease();
  }
}

// Mutually exclusive branches (valid)
async function query() {
  const client = await pool.connect();
  if (condition) {
    client.release();
  } else {
    client.release();
  }
} // ✅ Only one path executes
```

## Error Message Format

```
📚 Client release() called multiple times on the same object. | HIGH
   Fix: Ensure client.release() is called exactly once per acquisition, preferably in a finally block. | https://node-postgres.com/api/client#clientrelease
```

## Known False Negatives

The following patterns are **not detected** due to static AST analysis limitations:

### A Release Nested Deeper Than the `if` or `switch` Before It

**Why**: a release is compared with a later one only through the statement
that directly holds it — its own `if`, `try` or `catch`. A release two levels
down, or inside a `switch` case that `break`s, is not followed out to the
release after the outer statement.

```typescript
// ❌ NOT DETECTED
async function nested(a: boolean, b: boolean) {
  const client = await pool.connect();
  if (a) {
    if (b) {
      client.release();
    }
  }
  client.release(); // Double release when a && b
}

// ❌ NOT DETECTED
async function viaSwitch(kind: string) {
  const client = await pool.connect();
  switch (kind) {
    case 'a':
      client.release();
      break;
  }
  client.release(); // Double release when kind === 'a'
}
```

### Releases Directly in a `switch` Case or at Module Top Level

**Why**: two releases are compared as statements of one block (`{ … }`). The
statement list of a `case`, and the top level of a module, are not blocks, so
releases written straight into them are not paired.

```typescript
// ❌ NOT DETECTED
switch (kind) {
  case 'a':
    client.release();
    client.release(); // Double release
    break;
}

// ❌ NOT DETECTED — a script with top-level await
const client = await pool.connect();
client.release();
client.release(); // Double release
```

### Dynamic Dispatch

**Why**: When `release()` is called through array methods or callbacks, the rule cannot track which client instance is being released because the reference is indirect.

```typescript
// ❌ NOT DETECTED
const clients = [await pool.connect()];
clients.forEach((c) => c.release());
clients[0].release(); // Double release!
```

### Aliased Functions

**Why**: When `release` is assigned to a variable or bound, the rule loses the connection between the function and the original client variable.

```typescript
// ❌ NOT DETECTED
const client = await pool.connect();
const rel = client.release.bind(client);
rel();
rel(); // Double release!
```

### Callback `done()` Pattern

Calls in opposite branches of one `if`/`else` or `?:` — `if (err) done(err);
else done();` — run at most once and are not reported (since 2026-10). A
release at the very end of a `try` block plus one in its `catch` is also one
release per execution, as is a retry loop that checks out a new client on each
pass. So is a release in a `catch` that rethrows or returns plus one after the
`try`: the catch path never reaches the second.

A release followed by `return` or `throw` in its own block ends that path, so
nothing after it — the release after the `try`, the next pass of a loop —
runs on it:

```typescript
// ✅ Not reported: the early return gives the client back and leaves
async function find(id: string) {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT * FROM t WHERE id = $1', [id]);
    if (!r.rows.length) {
      client.release();
      return null;
    }
  } catch (err) {
    client.release();
    throw err;
  }
  client.release();
}
```

Inside the `try` block of a `try … catch` — this function's own, or one around
it — only a `return` of an already-computed value counts (`return null`,
`return rows`): a `throw`, or a `return notFound(id)` whose call can throw,
lands in that catch, which can release again or fall through to the next
release. A `throw` inside a callback leaves the callback, not the caller.

In the callback form, `if (err) return done(err);` releases and leaves in one
statement, so a later `done()` is the other path.

> **Workaround**: For any of these patterns, use the **guarded release pattern** shown in the examples above.

## When Not To Use It

- Generally, keep this rule enabled — double release is always a bug
- If using a wrapper library that tracks release state internally

## Related Rules

- [no-missing-client-release](./no-missing-client-release.md) - Ensures release is called
- [prefer-pool-query](./prefer-pool-query.md) - Use `pool.query()` for simple queries