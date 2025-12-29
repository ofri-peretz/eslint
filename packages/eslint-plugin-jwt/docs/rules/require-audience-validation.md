# require-audience-validation

> Require audience (aud) claim validation in JWT verify operations

**Severity:** 🟡 Medium  
**CWE:** [CWE-287](https://cwe.mitre.org/data/definitions/287.html)

## Rule Details

This rule mandates audience validation. Without it, tokens intended for other services are accepted.

## Examples

### ❌ Incorrect

```javascript
jwt.verify(token, secret);
jwt.verify(token, secret, { issuer: 'auth.example.com' });
```

### ✅ Correct

```javascript
jwt.verify(token, secret, { audience: 'https://api.example.com' });
jwt.verify(token, secret, {
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});
```

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
