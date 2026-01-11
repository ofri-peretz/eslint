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

## Limitations

- Only checks static string literals
- Cannot analyze dynamic query construction

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Queries

**Why**: The rule requires a string literal to count placeholders. Variables or function calls cannot be analyzed.

```typescript
// ❌ NOT DETECTED - query text is in a variable
const sql = 'SELECT * FROM users WHERE id = $1 AND active = $2';
await client.query(sql, [userId]); // Missing second param!
```

### Spread Operators

**Why**: The rule checks `ArrayExpression` element count, not runtime array length.

```typescript
// ❌ NOT DETECTED - spread operator
const params = [userId];
await client.query('SELECT * FROM users WHERE id = $1 AND active = $2', [
  ...params, // Might have wrong count
]);
```

### Gap Detection

**Why**: PostgreSQL allows gaps (e.g., `$1, $3` without `$2`), but the rule only checks max index.

```typescript
// ❌ NOT DETECTED - gap in parameters
await client.query('SELECT * FROM users WHERE id = $1 AND name = $3', [
  userId,
  name, // Should be 3 elements, not 2
]);
```

> **Workaround**: Use TypeScript with strict query typing (e.g., kysely, drizzle) for compile-time safety.

## When Not To Use It

- When using query builders (Drizzle, Kysely) that handle parameters automatically
- For dynamic query construction where parameters are validated elsewhere

## Related Rules

- [no-unsafe-query](./no-unsafe-query.md) - Prevents SQL injection
