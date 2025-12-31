---
title: 'N+1 Queries: The Database Performance Silent Killer'
published: false
description: 'Querying in a loop kills performance. Here is the N+1 pattern, why it happens, and how ESLint catches it.'
tags: postgresql, nodejs, performance, eslint
cover_image:
series: PostgreSQL Security
---

# N+1 Queries: The Database Performance Silent Killer

```javascript
const users = await pool.query('SELECT * FROM users LIMIT 100');

for (const user of users.rows) {
  const orders = await pool.query('SELECT * FROM orders WHERE user_id = $1', [
    user.id,
  ]);
  user.orders = orders.rows;
}
```

**101 queries** instead of 2.

## The Problem

| Users | Queries | Time  |
| ----- | ------- | ----- |
| 10    | 11      | 110ms |
| 100   | 101     | 1.1s  |
| 1000  | 1001    | 11s   |
| 10000 | 10001   | 110s  |

**Linear scaling = production disaster.**

## The Fix: JOINs or IN

### Option 1: JOIN

```javascript
const result = await pool.query(`
  SELECT u.*, o.* 
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  LIMIT 100
`);
```

### Option 2: Two Queries with IN

```javascript
const users = await pool.query('SELECT * FROM users LIMIT 100');
const userIds = users.rows.map((u) => u.id);

const orders = await pool.query(
  'SELECT * FROM orders WHERE user_id = ANY($1)',
  [userIds],
);

// Group orders by user_id in JavaScript
const ordersByUser = groupBy(orders.rows, 'user_id');
users.rows.forEach((u) => (u.orders = ordersByUser[u.id] || []));
```

## ESLint Detection

```javascript
import pg from 'eslint-plugin-pg';

export default [
  {
    rules: {
      'pg/no-n-plus-one-query': 'warn',
    },
  },
];
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-pg %}
📦 npm install eslint-plugin-pg
{% endcta %}

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)

---

🚀 **How many queries does your endpoint make?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
