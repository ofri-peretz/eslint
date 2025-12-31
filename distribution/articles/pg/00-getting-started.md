---
title: 'Getting Started with eslint-plugin-pg'
published: false
description: 'PostgreSQL security and best practices in 60 seconds. 13 rules for SQL injection, connection leaks, and query optimization.'
tags: postgresql, nodejs, database, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-pg

**13 PostgreSQL-specific rules. SQL injection, connection pools, transactions.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

## Flat Config

```javascript
// eslint.config.js
import pg from 'eslint-plugin-pg';

export default [pg.configs.recommended];
```

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/users.ts
  15:3  error  🔒 CWE-89 OWASP:A03 CVSS:9.8 | Unsafe SQL query detected
               Fix: Use parameterized query: client.query('SELECT * FROM users WHERE id = $1', [id])

src/orders.ts
  28:5  error  🔒 CWE-772 | pool.connect() without client.release()
               Fix: Add client.release() in finally block
```

## Rule Overview

| Rule                        | CWE     | What it catches                        |
| --------------------------- | ------- | -------------------------------------- |
| `no-unsafe-query`           | CWE-89  | SQL injection via string concatenation |
| `no-missing-client-release` | CWE-772 | Connection pool leaks                  |
| `prevent-double-release`    | CWE-415 | Double release crashes                 |
| `no-transaction-on-pool`    | CWE-362 | Transaction race conditions            |
| `prefer-pool-query`         | CWE-400 | Unnecessary connect/release            |
| `no-unsafe-copy-from`       | CWE-22  | Path traversal in COPY FROM            |
| `no-unsafe-search-path`     | CWE-426 | search_path hijacking                  |
| `no-n-plus-one-query`       | Perf    | N+1 query patterns                     |
| Plus 5 more...              |         |                                        |

## Quick Wins

### Before

```javascript
// ❌ SQL Injection
const query = `SELECT * FROM users WHERE id = '${userId}'`;
await pool.query(query);
```

### After

```javascript
// ✅ Parameterized Query
const query = 'SELECT * FROM users WHERE id = $1';
await pool.query(query, [userId]);
```

### Before

```javascript
// ❌ Connection Leak
const client = await pool.connect();
const result = await client.query('SELECT * FROM users');
return result.rows;
// Missing client.release()!
```

### After

```javascript
// ✅ Guaranteed Release
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  return result.rows;
} finally {
  client.release();
}
```

## Available Presets

```javascript
// Security + best practices
pg.configs.recommended;

// All rules enabled
pg.configs.all;
```

## Customizing Rules

```javascript
// eslint.config.js
import pg from 'eslint-plugin-pg';

export default [
  pg.configs.recommended,
  {
    rules: {
      // Downgrade to warning
      'pg/prefer-pool-query': 'warn',

      // Increase strictness
      'pg/no-unsafe-query': [
        'error',
        {
          allowLiteral: false,
        },
      ],
    },
  },
];
```

## Performance

```
┌─────────────────────────────────────────────────────┐
│ Benchmark: 1000 files                               │
├─────────────────────────────────────────────────────┤
│ eslint-plugin-pg:          785ms                    │
│ 100% precision (0 false positives in tests)         │
└─────────────────────────────────────────────────────┘
```

## Combine with Other Plugins

```javascript
import pg from 'eslint-plugin-pg';
import secureCoding from 'eslint-plugin-secure-coding';

export default [pg.configs.recommended, secureCoding.configs.recommended];
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-pg

# Config (eslint.config.js)
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Full Rule List](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-pg/docs/rules)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Using node-postgres? Drop a star on GitHub!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
