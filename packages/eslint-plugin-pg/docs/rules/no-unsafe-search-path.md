# no-unsafe-search-path

> **Keywords:** search_path, schema hijacking, CWE-426, pg, node-postgres, security

Prevents dynamic `SET search_path` queries that could enable schema hijacking.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                         |
| ----------------- | ------------------------------- |
| **CWE Reference** | CWE-426 (Untrusted Search Path) |
| **Severity**      | High (CVSS: 7.5)                |
| **Category**      | Security                        |

## Rule Details

If an attacker controls the `search_path`, they can redirect function/table lookups to malicious schema objects.

### ❌ Incorrect

```typescript
// Dynamic schema from user input
await client.query(`SET search_path TO ${userSchema}`);

// Template literal with variable
await pool.query(`SET search_path = ${schema}`);

// Concatenation
await client.query('SET search_path = ' + userSchema);
```

### ✅ Correct

```typescript
// Static schema name
await client.query('SET search_path = public, my_schema');

// Safe: using pg-format with schema validation
if (!ALLOWED_SCHEMAS.includes(schema)) throw new Error('Invalid schema');
await client.query(format('SET search_path = %I', schema));

// Using validated schema from allowlist
const safeSchema = validateSchema(userInput); // throws if invalid
await client.query('SET search_path = $1', [safeSchema]);
```

## Error Message Format

```
🔒 CWE-426 | Dynamic search_path enables schema hijacking | HIGH
   Fix: Use hardcoded schema or validate against allowlist
```

## When Not To Use It

- For multi-tenant apps where schema is validated from a trusted source
- In admin tools where schema input is fully controlled

## Related Rules

- [no-unsafe-query](./no-unsafe-query.md) - SQL injection prevention
