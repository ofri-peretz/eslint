---
title: no-select-all
description: no-select-all
category: security
severity: medium
tags: ['security', 'postgres']
autofix: false
---


> **Keywords:** SELECT \*, performance, quality, pg, node-postgres
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Discourages `SELECT *` in favor of explicit column lists.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect       | Details                   |
| ------------ | ------------------------- |
| **Severity** | Low (quality/performance) |
| **Category**   | Security |

## Rule Details

`SELECT *` fetches all columns, which can:

- Transfer unnecessary data
- Break when schema changes
- Prevent query plan optimizations

### ❌ Incorrect

```typescript
await client.query('SELECT * FROM users WHERE id = $1', [id]);

await pool.query('SELECT a, b, * FROM table'); // Mixed
```

### ✅ Correct

```typescript
await client.query('SELECT id, name, email FROM users WHERE id = $1', [id]);

// COUNT(*) is acceptable
await pool.query('SELECT COUNT(*) FROM users');
```

## Error Message Format

```
📋 | Avoid SELECT * - explicitly list required columns | LOW
   Fix: Replace * with specific column names
```

## When Not To Use It

- In development/debugging scripts
- When schema is stable and all columns are needed

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Query Construction

**Why**: Queries built at runtime are not analyzed.

```typescript
// ❌ NOT DETECTED - Query from variable
const query = 'SELECT * FROM users';
await client.query(query);
```

**Mitigation**: Use template literals directly in query calls. Enable strict query typing.

### Query in String Variable

**Why**: String contents from variables are not traced.

```typescript
// ❌ NOT DETECTED - Query concatenation
const cols = '*';
await client.query(`SELECT ${cols} FROM users`);
```

**Mitigation**: Use explicit column lists stored in typed constants.

### Imported Query Strings

**Why**: Queries from other modules are not visible.

```typescript
// ❌ NOT DETECTED - Query from import
import { USERS_QUERY } from './queries'; // Contains SELECT *
await client.query(USERS_QUERY);
```

**Mitigation**: Apply this rule to query files. Use query builders with column selection.

### ORM Generated Queries

**Why**: ORMs may generate SELECT \* internally.

```typescript
// ❌ NOT DETECTED - ORM may use SELECT * under the hood
const users = await User.find({ where: { active: true } });
```

**Mitigation**: Configure ORM to select explicit fields. Use projections/select options.

## Related Rules

- [no-batch-insert-loop](./no-batch-insert-loop.md) - Performance patterns
