# require-auth-mechanism

> **Keywords:** CWE-287, authentication, SCRAM-SHA-256, MongoDB, security

Requires explicit authentication mechanism specification for MongoDB connections.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                 |
| ----------------- | --------------------------------------- |
| **CWE Reference** | CWE-287 (Improper Authentication)       |
| **OWASP**         | A07:2021 - Identification/Auth Failures |
| **Severity**      | Medium (CVSS: 6.5)                      |
| **Category**      | Security                                |

## Rule Details

Explicit authentication mechanism ensures:

- No fallback to weaker mechanisms
- Clear security configuration
- Defense against downgrade attacks

### ❌ Incorrect

```typescript
// No explicit auth mechanism - may default to legacy SCRAM-SHA-1
mongoose.connect('mongodb://user:pass@host/db');

// Only credentials, no mechanism specified
mongoose.connect(uri, {
  user: 'admin',
  pass: 'secret',
});
```

### ✅ Correct

```typescript
// Explicit SCRAM-SHA-256 (recommended)
mongoose.connect(uri, {
  authMechanism: 'SCRAM-SHA-256',
});

// MongoDB Atlas X.509
mongoose.connect(uri, {
  authMechanism: 'MONGODB-X509',
  tlsCertificateKeyFile: '/path/to/client.pem',
});

// AWS IAM authentication
mongoose.connect(uri, {
  authMechanism: 'MONGODB-AWS',
});
```

## When Not To Use It

- Development environments with passwordless local MongoDB
- When using MongoDB Atlas with default secure configuration

## References

- [MongoDB Authentication Mechanisms](https://www.mongodb.com/docs/manual/core/authentication/)
- [CWE-287](https://cwe.mitre.org/data/definitions/287.html)
