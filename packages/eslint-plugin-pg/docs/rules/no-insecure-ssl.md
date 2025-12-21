# no-insecure-ssl

> **Keywords:** SSL, TLS, CWE-295, pg, node-postgres, security, certificate validation

Prevents disabling SSL certificate validation in PostgreSQL connections.

⚠️ This rule **errors** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                   |
| ----------------- | ----------------------------------------- |
| **CWE Reference** | CWE-295 (Improper Certificate Validation) |
| **Severity**      | High (CVSS: 7.5)                          |
| **Category**      | Security                                  |

## Rule Details

Setting `rejectUnauthorized: false` disables SSL certificate verification, making connections vulnerable to man-in-the-middle attacks.

### ❌ Incorrect

```typescript
const client = new Client({
  ssl: {
    rejectUnauthorized: false, // Dangerous!
  },
});

const pool = new Pool({
  ssl: {
    rejectUnauthorized: false,
  },
});
```

### ✅ Correct

```typescript
// Default (secure)
const client = new Client({ ssl: true });

// With CA certificate
const client = new Client({
  ssl: {
    ca: fs.readFileSync('/path/to/server-ca.pem').toString(),
  },
});

// Explicit secure setting
const client = new Client({
  ssl: {
    rejectUnauthorized: true,
  },
});
```

## Error Message Format

```
🔒 CWE-295 | Insecure SSL: rejectUnauthorized: false disables certificate validation | HIGH
   Fix: Remove rejectUnauthorized: false or set to true, and provide CA certificate
```

## When Not To Use It

- In development environments with self-signed certificates (use environment variables instead)
- Never disable in production

## Related Rules

- [no-hardcoded-credentials](./no-hardcoded-credentials.md) - Prevents hardcoded passwords
