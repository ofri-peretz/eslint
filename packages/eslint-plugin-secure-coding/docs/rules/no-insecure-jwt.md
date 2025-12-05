# no-insecure-jwt

> **Keywords:** JWT, CWE-347, algorithm confusion, signature verification, token security

Detects insecure JWT operations and missing signature verification. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-347 (Improper Verification of Cryptographic Signature) |
| **Severity** | High (CVSS 7.5) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Cryptography |

## Rule Details

Insecure JWT handling can allow attackers to:
- Bypass authentication using algorithm confusion (`alg: "none"`)
- Forge tokens with weak secrets
- Use unverified token data
- Escalate privileges by modifying claims

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔓 **Auth Bypass** | Unauthorized access | Validate algorithm |
| 🔑 **Weak Secret** | Token forgery | Use 256-bit+ secrets |
| ⚠️ **Unverified Data** | Security bypass | Always verify signatures |

## Examples

### ❌ Incorrect

```typescript
// Algorithm confusion vulnerability
const token = jwt.sign(payload, secret, { algorithm: 'none' });

// Using jwt.decode() instead of jwt.verify()
const decoded = jwt.decode(token); // NO signature verification!
const userId = decoded.userId; // Trusting unverified data!

// Weak secret
const token = jwt.sign(payload, 'secret123'); // Too short!

// Not validating algorithm
const decoded = jwt.verify(token, secret);
// Vulnerable to algorithm switching attacks

// Accepting alg from token
const { alg } = jwt.decode(token, { complete: true }).header;
const decoded = jwt.verify(token, secret, { algorithms: [alg] }); // DANGEROUS!
```

### ✅ Correct

```typescript
// Verify with explicit algorithm whitelist
const decoded = jwt.verify(token, secret, {
  algorithms: ['RS256', 'ES256'], // Whitelist only!
});

// Use strong secrets (256 bits minimum)
import { randomBytes } from 'crypto';
const secret = randomBytes(32).toString('hex');

// Always verify before trusting
try {
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'trusted-issuer',
    audience: 'my-app',
  });
  const userId = decoded.userId;
} catch (err) {
  // Handle verification failure
  throw new Error('Invalid token');
}

// Use asymmetric algorithms for better security
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
});
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-insecure-jwt': ['error', {
      allowedInsecureAlgorithms: [],
      minSecretLength: 32,
      trustedJwtLibraries: ['jsonwebtoken', 'jose', 'jwt']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedInsecureAlgorithms` | `string[]` | `[]` | Allow specific algorithms for legacy |
| `minSecretLength` | `number` | `32` | Minimum secret length (chars) |
| `trustedJwtLibraries` | `string[]` | `['jsonwebtoken', 'jose']` | JWT libraries to check |

## Error Message Format

```
🔒 CWE-347 OWASP:A02-Crypto CVSS:7.5 | Insecure JWT Algorithm | CRITICAL [SOC2,PCI-DSS,HIPAA]
   Fix: Use RS256/ES256 and validate algorithm before verification | https://tools.ietf.org/html/rfc8725
```

## Further Reading

- **[RFC 8725 JWT Best Practices](https://tools.ietf.org/html/rfc8725)** - JWT security recommendations
- **[CWE-347](https://cwe.mitre.org/data/definitions/347.html)** - Improper verification
- **[Auth0 JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)** - Complete JWT guide
- **[Algorithm Confusion Attack](https://portswigger.net/web-security/jwt/algorithm-confusion)** - Attack explanation

## Related Rules

- [`no-weak-crypto`](./no-weak-crypto.md) - Weak cryptographic algorithms
- [`no-hardcoded-credentials`](./no-hardcoded-credentials.md) - Hardcoded secrets

