---
title: 'The N+1 Insert Loop That Slowed Our API to a Crawl'
published: true
description: "50ms per insert × 1000 rows = 50 seconds. Here's how to detect and fix N+1 loop patterns in PostgreSQL."
tags: postgresql, performance, nodejs, eslint
cover_image:
canonical_url:
---

Our CSV import endpoint was timing out. 30 seconds wasn't enough.

## The Problem

```javascript
// ❌ The pattern that killed our performance
async function importUsers(users) {
  for (const user of users) {
    await pool.query('INSERT INTO users (name, email) VALUES ($1, $2)', [
      user.name,
      user.email,
    ]);
  }
}
```

For 1000 users:

- 1000 round trips to database
- ~50ms per query
- **50 seconds total**

## Why It Matters

| Rows  | N+1 Time | Bulk Time | Speedup |
| ----- | -------- | --------- | ------- |
| 100   | 5s       | 50ms      | 100x    |
| 1000  | 50s      | 100ms     | 500x    |
| 10000 | 500s     | 500ms     | 1000x   |

## The Correct Pattern: Bulk Insert

```javascript
// ✅ Single query, any number of rows
async function importUsers(users) {
  const values = users
    .map((u, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
    .join(', ');

  const params = users.flatMap((u) => [u.name, u.email]);

  await pool.query(`INSERT INTO users (name, email) VALUES ${values}`, params);
}
```

Or even better with `unnest()`:

```javascript
// ✅ PostgreSQL unnest pattern
async function importUsers(users) {
  await pool.query(
    `INSERT INTO users (name, email)
     SELECT * FROM unnest($1::text[], $2::text[])`,
    [users.map((u) => u.name), users.map((u) => u.email)],
  );
}
```

## The Rule: `pg/no-batch-insert-loop`

This pattern is detected by the `pg/no-batch-insert-loop` rule from `eslint-plugin-pg`.

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-pg
```

### Use Recommended Config (All Rules)

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

### Enable Only This Rule

```javascript
import pg from 'eslint-plugin-pg';

export default [
  {
    plugins: { pg },
    rules: {
      'pg/no-batch-insert-loop': 'error',
    },
  },
];
```

## What You'll See

When N+1 loops are detected:

```bash
src/import.ts
  5:3  error  ⚡ CWE-1049 | Database query loop detected. | HIGH
                 Fix: Batch queries using arrays and "UNNEST" or a single batched INSERT. | https://use-the-index-luke.com/sql/joins/nested-loops-join-n1-problem
```

## Detection Patterns

The `pg/no-batch-insert-loop` rule catches:

- `query('INSERT...')` inside `for`, `for...of`, `for...in` loops
- `query('INSERT...')` inside `while` and `do...while` loops
- `query('INSERT...')` inside `forEach`, `map`, `reduce`, `filter` callbacks
- `query('UPDATE...')` inside any loop construct
- `query('DELETE...')` inside any loop construct

## Other Bulk Patterns

### Bulk Update

```javascript
// ✅ Update with unnest
await pool.query(
  `
  UPDATE users SET status = data.status
  FROM unnest($1::int[], $2::text[]) AS data(id, status)
  WHERE users.id = data.id
`,
  [ids, statuses],
);
```

### Bulk Delete

```javascript
// ✅ Delete with ANY
await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Turn 50-second imports into 100ms operations.

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: pg/no-batch-insert-loop](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-batch-insert-loop.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more performance articles & updates:**

[GitHub](https://github.com/ofri-peretz) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofri-peretz)
