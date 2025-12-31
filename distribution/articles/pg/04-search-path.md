---
title: "search_path Hijacking: The PostgreSQL Attack You've Never Heard Of"
published: false
description: "A dynamic search_path lets attackers hijack your SQL queries. Here's how this obscure attack works and how to prevent it."
tags: postgresql, security, database, nodejs
cover_image:
canonical_url:
---

# search_path Hijacking: The PostgreSQL Attack You've Never Heard Of

Most developers know about SQL injection. Few know about search_path hijacking.

It's just as dangerous.

## What is search_path?

PostgreSQL's `search_path` determines which schema to look in when you reference an unqualified table name.

```sql
-- With search_path = public, these are equivalent:
SELECT * FROM users;
SELECT * FROM public.users;
```

## The Attack

If an attacker can control the search_path, they can redirect your queries to malicious tables:

```javascript
// ❌ Dynamic search_path from user input
const schema = req.query.tenant; // Attacker controls this
await client.query(`SET search_path TO ${schema}`);
await client.query('SELECT * FROM users'); // Now queries attacker's schema
```

The attacker:

1. Creates a schema with a malicious `users` table
2. Sets search_path to their schema
3. Your query returns their fake data

## Why This Matters

| Attack                   | Impact                          |
| ------------------------ | ------------------------------- |
| **Data theft**           | Return fake data, capture input |
| **Privilege escalation** | Replace security functions      |
| **Code execution**       | Malicious triggers, functions   |

## The Correct Pattern

```javascript
// ✅ Static search_path
await client.query(`SET search_path TO tenant_${tenantId}`);

// ✅ Validated against allowlist
const ALLOWED_SCHEMAS = ['tenant_1', 'tenant_2', 'tenant_3'];
if (!ALLOWED_SCHEMAS.includes(schema)) {
  throw new Error('Invalid schema');
}
await client.query(`SET search_path TO ${schema}`);

// ✅ Fully qualified table names
await client.query('SELECT * FROM public.users'); // Explicit schema
```

## Let ESLint Catch This

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Dynamic search_path is caught:

```bash
src/tenants.ts
  8:15  error  🔒 CWE-426 | Dynamic search_path detected
               Fix: Use static schema name or validate against allowlist
```

## Multi-Tenant Pattern

```javascript
// ✅ Safe multi-tenant with validated schema
async function queryTenant(tenantId, sql, params) {
  // Validate tenant exists
  const tenant = await getTenant(tenantId);
  if (!tenant) throw new Error('Unknown tenant');

  const client = await pool.connect();
  try {
    // Schema name from trusted source, not user input
    await client.query(`SET search_path TO tenant_${tenant.id}`);
    return await client.query(sql, params);
  } finally {
    // Reset search_path
    await client.query('SET search_path TO public');
    client.release();
  }
}
```

## Quick Install

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
import pg from 'eslint-plugin-pg';
export default [pg.configs.recommended];
```

Don't let attackers hijack your queries.

---

📦 [npm: eslint-plugin-pg](https://www.npmjs.com/package/eslint-plugin-pg)
📖 [Rule docs: no-unsafe-search-path](https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-search-path.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Follow me for more security articles & updates:**
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://www.linkedin.com/in/ofri-peretz/)
