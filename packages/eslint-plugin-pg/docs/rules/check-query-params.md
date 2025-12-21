# check-query-params

> **Keywords:** query parameters, CWE-89, pg, node-postgres, quality, parameterized queries

Ensures the number of placeholders in SQL queries matches the provided parameters.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                           |
| ----------------- | --------------------------------- |
| **CWE Reference** | CWE-89 (SQL Injection Prevention) |
| **Severity**      | Medium (CVSS: 5.0)                |
| **Category**      | Quality                           |

## Rule Details

Mismatched parameter counts lead to runtime errors or security issues. This rule statically checks placeholder count vs provided arguments.

### ❌ Incorrect

```typescript
// Missing parameter
await client.query('SELECT * FROM users WHERE id = $1 AND active = $2', [
  userId,
]);

// Extra parameter
await pool.query('SELECT * FROM users WHERE id = $1', [userId, name, email]);
```

### ✅ Correct

```typescript
// Matching parameter count
await client.query('SELECT * FROM users WHERE id = $1 AND active = $2', [
  userId,
  isActive,
]);

// Single parameter
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

## Error Message Format

```
📋 CWE-89 | Parameter count mismatch: Query expects 2 but got 1 | MEDIUM
   Fix: Ensure the number of $N placeholders matches the values array length
```

## Limitations

- Only checks static string literals
- Cannot analyze dynamic query construction

## When Not To Use It

- When using query builders (Drizzle, Kysely) that handle parameters automatically
- For dynamic query construction where parameters are validated elsewhere

## Related Rules

- [no-unsafe-query](./no-unsafe-query.md) - Prevents SQL injection
