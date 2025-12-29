# require-expiration

> Require expiration claim (exp) or expiresIn option in JWT signing

**Severity:** 🟡 Medium  
**CWE:** [CWE-613](https://cwe.mitre.org/data/definitions/613.html)

## Rule Details

This rule mandates expiration in JWT tokens. Tokens without expiration are valid forever, increasing the exposure window if compromised.

## Examples

### ❌ Incorrect

```javascript
jwt.sign(payload, secret);
jwt.sign(payload, secret, {});
jwt.sign(payload, secret, { algorithm: 'RS256' });
```

### ✅ Correct

```javascript
// expiresIn option
jwt.sign(payload, secret, { expiresIn: '1h' });

// exp in payload
jwt.sign({ sub: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
```

## Options

```javascript
{
  "jwt/require-expiration": ["error", {
    "maxExpirationSeconds": 86400
  }]
}
```

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
