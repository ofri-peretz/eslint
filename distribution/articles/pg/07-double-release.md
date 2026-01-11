---
title: 'Double Release: The Silent PostgreSQL Pool Killer'
published: false
description: "Calling client.release() twice corrupts your pool state. Here's how it happens and how ESLint catches it."
tags: postgresql, nodejs, database, eslint, javascript
cover_image:
canonical_url:
series: PostgreSQL Security
---

```javascript
client.release();
// ... later in error handling ...
client.release(); // 💥 Pool state corrupted
```

This bug doesn't throw. It silently corrupts your connection pool.

## The Problem

When you call `release()` twice on the same client:

1. First call: Returns client to pool ✅
2. Second call: Pool thinks it got a "new" client ❌
3. Pool state: Now tracks one extra phantom connection

Over time:

- Pool reports connections available that don't exist
- Queries time out waiting for phantom connections
- Memory leaks from orphaned connection objects

## How It Happens

### Pattern 1: Error Handling + Finally

```javascript
// ❌ Double release - DETECTED
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT ...');
  } catch (e) {
    client.release(); // Released on error
    throw e;
  } finally {
    client.release(); // Released again!
  }
}
```

### Pattern 2: Try + Finally

```javascript
// ❌ Double release - DETECTED
async function query() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    client.release(); // Released in try
  } finally {
    client.release(); // Released again!
  }
}
```

### Pattern 3: Switch Fallthrough

```javascript
// ❌ Double release - DETECTED
async function query(type) {
  const client = await pool.connect();
  switch (type) {
    case 'a':
      client.release();
    // Missing break! Falls through...
    case 'b':
      client.release(); // Double release!
      break;
  }
}
```

### Pattern 4: Ternary/Short-Circuit + Sequential

```javascript
// ❌ Double release - DETECTED
async function query() {
  const client = await pool.connect();
  shouldRelease && client.release();
  client.release(); // Double if shouldRelease was true!
}
```

### Pattern 5: Callback Hell

```javascript
// ❌ Double release in callbacks
pool.connect((err, client, done) => {
  if (err) {
    done(); // Released
    return callback(err);
  }

  client.query('SELECT ...', (err, result) => {
    done(); // Released again if first query errored
    callback(err, result);
  });
});
```

## The Correct Patterns

### Pattern A: Single Release in Finally (Recommended)

```javascript
// ✅ Best practice
async function query() {
  const client = await pool.connect();
  try {
    return await client.query('SELECT ...');
  } catch (e) {
    // Log but don't release here
    throw e;
  } finally {
    client.release(); // Only release point
  }
}
```

### Pattern B: Guarded Release (Complex Control Flow)

```javascript
// ✅ Track release state
async function query() {
  const client = await pool.connect();
  let released = false;

  const release = () => {
    if (!released) {
      released = true;
      client.release();
    }
  };

  try {
    return await client.query('SELECT ...');
  } finally {
    release();
  }
}
```

### Pattern C: Mutually Exclusive Branches (Valid)

```javascript
// ✅ Only one path executes
async function query() {
  const client = await pool.connect();
  if (condition) {
    client.release();
  } else {
    client.release();
  }
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

Multiple release calls are detected:

```bash
src/db.ts
  18:5  error  📚 Client release() called multiple times on the same object. | HIGH
               Fix: Ensure client.release() is called exactly once per acquisition
```

## Detection Coverage (13 Patterns)

The rule detects all these scenarios:

| Pattern                       | Detection          |
| ----------------------------- | ------------------ |
| Sequential in same block      | ✅                 |
| Catch + Finally               | ✅                 |
| Try + Finally                 | ✅                 |
| Finally + After try           | ✅                 |
| Try + After try               | ✅                 |
| Catch + After try             | ✅                 |
| Switch fallthrough            | ✅                 |
| If without else + sequential  | ✅                 |
| Two sequential if statements  | ✅                 |
| Ternary + sequential          | ✅                 |
| Short-circuit && + sequential | ✅                 |
| Destructured `release()`      | ✅                 |
| Mutually exclusive branches   | ✅ Allowed (no FP) |
| Guarded with `!released`      | ✅ Allowed (no FP) |

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Release once. Release correctly. Release in finally.

---

## Quick Install

📦 [`eslint-plugin-secure-coding`](https://npmjs.com/package/eslint-plugin-secure-coding) — 75 security rules
📦 [`eslint-plugin-pg`](https://npmjs.com/package/eslint-plugin-pg) — PostgreSQL security
📦 [`eslint-plugin-crypto`](https://npmjs.com/package/eslint-plugin-crypto) — Cryptography security

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
