# require-tls-connection

> **Keywords:** CWE-295, TLS, SSL, encryption, MongoDB, MitM, security

Requires TLS/SSL encryption for MongoDB connections in production environments.

⚠️ This rule **warns** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                   |
| ----------------- | ----------------------------------------- |
| **CWE Reference** | CWE-295 (Improper Certificate Validation) |
| **OWASP**         | A02:2021 - Cryptographic Failures         |
| **Severity**      | High (CVSS: 7.4)                          |
| **Category**      | Security                                  |

## Rule Details

MongoDB connections without TLS are vulnerable to:

- Man-in-the-Middle (MitM) attacks
- Credential interception
- Data exfiltration during transit

### ❌ Incorrect

```typescript
// No TLS enabled
mongoose.connect('mongodb://localhost:27017/db');

// Explicit TLS disabled
mongoose.connect(uri, { tls: false });

// Legacy ssl option disabled
mongoose.connect(uri, { ssl: false });
```

### ✅ Correct

```typescript
// TLS enabled via URI parameter
mongoose.connect('mongodb://localhost:27017/db?tls=true');

// TLS enabled via options
mongoose.connect(uri, { tls: true });

// Full TLS configuration
mongoose.connect(uri, {
  tls: true,
  tlsCAFile: '/path/to/ca.pem',
  tlsCertificateKeyFile: '/path/to/client.pem',
});

// MongoDB Atlas (uses TLS by default)
mongoose.connect('mongodb+srv://cluster.mongodb.net/db');
```

## Known False Positives

### Local Development

```typescript
// FP: Intentionally no TLS for local dev
mongoose.connect('mongodb://localhost:27017/devdb');
```

**Workaround**: Use `allowInTests: true` or configure environment-specific rules.

## Known False Negatives

### Dynamic Configuration

```typescript
// ❌ NOT DETECTED
const options = getConfig();
mongoose.connect(uri, options); // TLS may or may not be enabled
```

## When Not To Use It

- Local development with Docker containers
- Test environments with ephemeral databases
- Environments where TLS is handled at network level (VPC, SSH tunnel)

## References

- [MongoDB TLS/SSL Configuration](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/)
- [CWE-295](https://cwe.mitre.org/data/definitions/295.html)
