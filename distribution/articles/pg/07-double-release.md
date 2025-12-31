---
title: 'Double Release: The Silent PostgreSQL Pool Killer'
published: false
description: "Calling client.release() twice corrupts your pool state. Here's how it happens and how ESLint catches it."
tags: postgresql, nodejs, database, eslint
cover_image:
canonical_url:
---

# Double Release: The Silent PostgreSQL Pool Killer

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
// ❌ Double release
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

### Pattern 2: Early Return

```javascript
// ❌ Double release
async function query(shouldQuery) {
  const client = await pool.connect();

  if (!shouldQuery) {
    client.release();
    return null;
  }

  try {
    return await client.query('SELECT ...');
  } finally {
    client.release(); // If shouldQuery was false, this is second release
  }
}
```

### Pattern 3: Callback Hell

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

## The Correct Pattern

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

Or better: only use `finally`:

```javascript
// ✅ Single release point
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
  18:5  warning  🔒 CWE-415 | Potential double client.release() detected
                 Fix: Ensure client.release() is called exactly once, preferably in finally block
```

## Detection Logic

The rule tracks:

- All `pool.connect()` calls
- All `.release()` calls on the resulting client
- Multiple paths that could lead to release
- Conditional releases without guards

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

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: prevent-double-release](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/prevent-double-release.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
