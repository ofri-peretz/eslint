# no-hardcoded-credentials

> **Keywords:** credentials, passwords, secrets, CWE-798, pg, node-postgres, security

Prevents hardcoded passwords and connection strings in PostgreSQL client initialization.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                         |
| ----------------- | ------------------------------- |
| **CWE Reference** | CWE-798 (Hardcoded Credentials) |
| **Severity**      | High (CVSS: 7.5)                |
| **Category**      | Security                        |

## Rule Details

Hardcoded credentials in source code can be exposed through version control, logs, or error messages.

### ❌ Incorrect

```typescript
// Hardcoded password
const client = new Client({
  password: 'supersecret123',
});

// Hardcoded connection string
const pool = new Pool('postgres://user:password@localhost/db');
```

### ✅ Correct

```typescript
// Environment variables
const client = new Client({
  password: process.env.PG_PASSWORD,
});

// Connection string from environment
const pool = new Pool(process.env.DATABASE_URL);

// Config file (not committed to VCS)
const config = require('./config.local.json');
const client = new Client(config.database);
```

## Error Message Format

```
🔒 CWE-798 | Hardcoded credentials in Client/Pool initialization | HIGH
   Fix: Use environment variables: process.env.DATABASE_PASSWORD
```

## When Not To Use It

- In test files with fixture data
- In documentation examples

## Related Rules

- [no-insecure-ssl](./no-insecure-ssl.md) - Prevents insecure SSL settings
