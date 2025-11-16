# no-sql-injection

> **Keywords:** SQL injection, CWE-89, security, ESLint rule, database security, parameterized queries, prepared statements, OWASP, SQL injection prevention, auto-fix, LLM-optimized, code security

Disallows SQL injection vulnerabilities by detecting string concatenation in SQL queries. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages that AI assistants can automatically fix.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-89 (SQL Injection) |
| **Severity** | Critical (security vulnerability) |
| **Auto-Fix** | ✅ Yes (suggests parameterized queries) |
| **Category** | Security |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For** | Applications with database interactions, security-critical code |

## Rule Details

SQL injection is one of the most critical web application security risks. This rule detects potentially unsafe SQL query construction where user input could be directly interpolated into queries.

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔒 **Security** | Attackers can read/modify/delete data | Use parameterized queries |
| 🐛 **Data Loss** | Malicious SQL can drop tables | Prepared statements |
| 🔐 **Auth Bypass** | Login forms can be compromised | ORM query builders |
| 📊 **Compliance** | OWASP Top 10 vulnerability | Input validation |

## Examples

### ❌ Incorrect

```typescript
// String concatenation with user input
const query = `SELECT * FROM users WHERE id = ${userId}`;
db.execute(query);

// Template literals with variables
const deleteQuery = `DELETE FROM posts WHERE author = '${username}'`;
connection.query(deleteQuery);

// String concatenation
const sql = "INSERT INTO logs VALUES ('" + userInput + "')";
```

### ✅ Correct

```typescript
// Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
db.execute(query, [userId]);

// Named parameters
const query = 'SELECT * FROM users WHERE id = :userId';
db.execute(query, { userId });

// ORM query builder
const user = await User.findOne({ where: { id: userId } });

// Prepared statements
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
stmt.get(userId);
```

## Configuration

```javascript
{
  rules: {
    '@forge-js/llm-optimized/no-sql-injection': ['error', {
      allowDynamicTableNames: false,  // Allow table names from variables
      trustedFunctions: []             // Functions considered safe
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowDynamicTableNames` | `boolean` | `false` | Allow dynamic table/column names (still flag concatenated values) |
| `trustedFunctions` | `string[]` | `[]` | Function names that are considered safe (e.g., `sanitize`, `escape`) |

### Using Trusted Functions

```javascript
{
  rules: {
    '@forge-js/llm-optimized/no-sql-injection': ['error', {
      trustedFunctions: ['escape', 'sanitize', 'escapeId']
    }]
  }
}
```

```typescript
// ✅ Won't flag if value comes from trusted function
const safe = escape(userInput);
const query = `SELECT * FROM users WHERE id = '${safe}'`;
```

## When Not To Use It

| Scenario | Recommendation |
|----------|----------------|
| **Type-safe query builders** | Disable for Prisma, Drizzle, TypeORM (they prevent SQL injection by design) |
| **Non-database files** | Add to `ignorePatterns` for files without database interactions |
| **SQL migrations** | Add migration directories to `ignorePatterns` |
| **Seed scripts** | Add seed script directories to `ignorePatterns` |

## Error Message Format

This rule provides LLM-optimized error messages:

```
🔒 CWE-89 | SQL Injection detected | CRITICAL
   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/www-community/attacks/SQL_Injection
```

**Why this format?**
- **Structured** - AI assistants can parse and understand
- **Actionable** - Shows both problem and solution
- **Educational** - Includes CWE reference and documentation link
- **Auto-fixable** - AI can apply the fix automatically

## Comparison with Alternatives

| Feature | no-sql-injection | eslint-plugin-security | eslint-plugin-sql |
|---------|------------------|------------------------|-------------------|
| **CWE Reference** | ✅ CWE-89 included | ⚠️ Limited | ❌ No |
| **Auto-Fix** | ✅ Suggests fixes | ❌ No | ⚠️ Limited |
| **LLM-Optimized** | ✅ Yes | ❌ No | ❌ No |
| **ESLint MCP** | ✅ Optimized | ❌ No | ❌ No |
| **Error Quality** | ✅ Structured with examples | ⚠️ Basic | ⚠️ Basic |

## Further Reading

- **[OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)** - Comprehensive SQL injection guide
- **[Node.js SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)** - Prevention cheat sheet
- **[Parameterized Queries Guide](https://bobby-tables.com/)** - How to prevent SQL injection
- **[CWE-89 Documentation](https://cwe.mitre.org/data/definitions/89.html)** - Official CWE entry
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration

## Version

This rule is available in `@forge-js/eslint-plugin-llm-optimized` v0.0.1+

## Related Rules

- [`no-unsafe-dynamic-require`](./no-unsafe-dynamic-require.md) - Prevents code injection via require()
- [`detect-eval-with-expression`](./detect-eval-with-expression.md) - Prevents code injection via eval()
- [`database-injection`](./database-injection.md) - General database injection detection

