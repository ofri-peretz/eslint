# require-algorithm-whitelist

> Require explicit algorithm specification in JWT verify operations

**Severity:** 🟠 High  
**CWE:** [CWE-757](https://cwe.mitre.org/data/definitions/757.html)

## Rule Details

This rule enforces explicit algorithm specification in `verify()` calls. Without explicit algorithms, the token's header algorithm is trusted, enabling algorithm substitution attacks.

## Examples

### ❌ Incorrect

```javascript
// No algorithms specified - trusts token header
jwt.verify(token, secret);
jwt.verify(token, secret, {});
jwt.verify(token, secret, { complete: true });
```

### ✅ Correct

```javascript
// Explicit algorithm whitelist
jwt.verify(token, secret, { algorithms: ['RS256'] });
jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });
jwt.verify(token, secret, { algorithm: 'RS256' });
```

## Options

```javascript
{
  "jwt/require-algorithm-whitelist": ["error", {
    "recommendedAlgorithms": ["RS256", "ES256"]
  }]
}
```

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
