# no-unsafe-query

> **Keywords:** SQL injection, CWE-89, pg, node-postgres, security, parameterized queries, prepared statements

Prevents SQL injection by detecting string concatenation or template literals with variables in `client.query()` calls.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                   |
| ----------------- | ----------------------------------------- |
| **CWE Reference** | CWE-89 (SQL Injection)                    |
| **Severity**      | Critical (CVSS: 9.8)                      |
| **Category**      | Security                                  |
| **ESLint MCP**    | ✅ Optimized for AI assistant integration |

## Rule Details

SQL injection is one of the most critical security vulnerabilities. This rule detects potentially unsafe SQL query construction in `pg` driver calls.

### ❌ Incorrect

```typescript
// Template literal with variable
const result = await client.query(`SELECT * FROM users WHERE id = ${userId}`);

// String concatenation
const query = "SELECT * FROM users WHERE name = '" + userName + "'";
await pool.query(query);
```

### ✅ Correct

```typescript
// Parameterized query
const result = await client.query('SELECT * FROM users WHERE id = $1', [
  userId,
]);

// Named parameters (with pg-named or similar)
const result = await client.query({
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId],
});
```

## Error Message Format

```
🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | Unsafe query detected | CRITICAL
   Fix: Use parameterized query: client.query('SELECT * FROM users WHERE id = $1', [userId])
```

## When Not To Use It

- When using a query builder (Drizzle, Kysely) that handles parameterization
- In migration files with static SQL

## Related Rules

- [check-query-params](./check-query-params.md) - Validates parameter count
- [no-batch-insert-loop](./no-batch-insert-loop.md) - Prevents N+1 queries
