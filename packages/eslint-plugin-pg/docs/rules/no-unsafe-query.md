# no-unsafe-query

> **Keywords:** SQL injection, CWE-89, pg, node-postgres, security, parameterized queries, prepared statements
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

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

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-89 OWASP:A05 CVSS:9.8 | SQL Injection detected | CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001]
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A05_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-89](https://cwe.mitre.org/data/definitions/89.html) [OWASP:A05](https://owasp.org/Top10/A05_2021-Injection/) [CVSS:9.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `SQL Injection detected` |
| **Severity & Compliance** | Impact assessment | `CRITICAL [SOC2,PCI-DSS,HIPAA,ISO27001]` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A05_2021-Injection/) |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Tagged Template Literals (sql`...`)

**Why**: Tagged templates like `sql` from libraries are function calls, not template literals.

```typescript
// ❌ NOT DETECTED - appears safe but may not be
import { sql } from 'some-library';
await client.query(sql`SELECT * FROM users WHERE id = ${userId}`);
// If 'sql' doesn't properly escape, this is vulnerable!
```

### Dynamic Query Variables

**Why**: When the query is stored in a variable, we can't analyze its construction.

```typescript
// ❌ NOT DETECTED
const unsafeQuery = buildQuery(userInput); // May concatenate strings internally
await client.query(unsafeQuery);
```

### Nested Function Calls

**Why**: Queries passed through helper functions aren't traced.

```typescript
// ❌ NOT DETECTED
function executeQuery(query: string) {
  return client.query(query);
}
executeQuery(`SELECT * FROM users WHERE id = ${userId}`);
```

### Format Functions with User Input

**Why**: The rule doesn't track data flow through `pg-format` or similar.

```typescript
// ❌ NOT DETECTED - but format() should handle escaping
import format from 'pg-format';
await client.query(format('SELECT * FROM %I.users', userSchema));
// Safe if format() escapes, but rule can't verify
```

> **Workaround**: Always use parameterized queries `($1, $2)` directly in literals.

## When Not To Use It

- When using a query builder (Drizzle, Kysely) that handles parameterization
- In migration files with static SQL

## Related Rules

- [check-query-params](./check-query-params.md) - Validates parameter count
- [no-batch-insert-loop](./no-batch-insert-loop.md) - Prevents N+1 queries
