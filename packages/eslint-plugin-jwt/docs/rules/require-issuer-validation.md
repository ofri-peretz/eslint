# require-issuer-validation

> Require issuer (iss) claim validation in JWT verify operations

**Severity:** 🟡 Medium  
**CWE:** [CWE-287](https://cwe.mitre.org/data/definitions/287.html)

## Rule Details

This rule mandates issuer validation in `verify()` calls. Without issuer validation, tokens from any issuer are accepted.

## Examples

### ❌ Incorrect

```javascript
jwt.verify(token, secret);
jwt.verify(token, secret, { algorithms: ['RS256'] });
```

### ✅ Correct

```javascript
jwt.verify(token, secret, { issuer: 'https://auth.example.com' });
jwt.verify(token, secret, {
  algorithms: ['RS256'],
  issuer: 'https://auth.example.com',
});
```

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
