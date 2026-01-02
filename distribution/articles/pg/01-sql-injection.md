---
title: 'SQL Injection in node-postgres: The Pattern Everyone Gets Wrong'
published: true
description: 'Even experienced developers make this mistake with pg. Learn the correct pattern and how ESLint catches it before production.'
tags: postgresql, nodejs, security, eslint
cover_image:
canonical_url:
---

I've reviewed hundreds of Node.js + PostgreSQL codebases. The same vulnerability appears in 80% of them.

## The Pattern That Looks Safe

```javascript
// ❌ This looks fine, right?
async function getUser(userId) {
  const query = `SELECT * FROM users WHERE id = '${userId}'`;
  const result = await pool.query(query);
  return result.rows[0];
}
```

It's clean. It's readable. It's also a critical security vulnerability.

## The Attack

```javascript
// Attacker input:
const userId = "'; DROP TABLE users; --";

// Generated query:
// SELECT * FROM users WHERE id = ''; DROP TABLE users; --'
```

Your users table is gone. Your data is gone. Your job might be gone.

## Why Developers Keep Making This Mistake

| Reason                       | Reality                           |
| ---------------------------- | --------------------------------- |
| "I validate the input"       | Validation can be bypassed        |
| "It's an internal API"       | Internal APIs get exposed         |
| "Template literals are safe" | They're just string concatenation |
| "ORM handles this"           | Not if you use raw queries        |

## The Correct Pattern

```javascript
// ✅ Parameterized query - the ONLY safe pattern
async function getUser(userId) {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  return result.rows[0];
}
```

The `$1` placeholder tells PostgreSQL to treat the value as data, not code. No amount of SQL injection can escape this.

## Let ESLint Enforce This

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
// eslint.config.js
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Now run your linter:

```bash
src/users.ts
  4:17  error  🔒 CWE-89 OWASP:A03 CVSS:9.8 | Unsafe query detected
               Fix: Use parameterized query: client.query('SELECT * FROM users WHERE id = $1', [userId])
```

## More Examples

### ❌ Dynamic table names

```javascript
const table = userInput;
pool.query(`SELECT * FROM ${table}`); // SQL injection
```

### ✅ Allowlist tables

```javascript
const ALLOWED_TABLES = ['users', 'orders', 'products'];
if (!ALLOWED_TABLES.includes(table)) throw new Error('Invalid table');
pool.query(`SELECT * FROM ${table}`); // Now safe
```

### ❌ Building WHERE clauses

```javascript
let query = 'SELECT * FROM users WHERE 1=1';
if (name) query += ` AND name = '${name}'`; // Injection!
```

### ✅ Build params array

```javascript
const params = [];
let query = 'SELECT * FROM users WHERE 1=1';
if (name) {
  params.push(name);
  query += ` AND name = $${params.length}`;
}
await pool.query(query, params);
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

**13 rules.** PostgreSQL security. Connection management. Query optimization.

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: no-unsafe-query](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-query.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)