# no-sql-injection

Disallows SQL injection vulnerabilities by detecting string concatenation in SQL queries.

⚠️ This rule **_warns_** by default in the `recommended` config.

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

- When using a type-safe query builder that prevents SQL injection by design (e.g., Prisma, Drizzle)
- In files that don't interact with databases
- For hardcoded SQL migrations or seed scripts (add to `ignorePatterns`)

## Further Reading

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Node.js SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Parameterized Queries Guide](https://bobby-tables.com/)

## Version

This rule is available in `@forge-js/eslint-plugin-llm-optimized` v0.0.1+

