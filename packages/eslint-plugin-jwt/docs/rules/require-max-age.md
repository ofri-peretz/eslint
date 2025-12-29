# require-max-age

> Require maxAge option in verify operations to enforce token freshness

**Severity:** 🟡 Medium  
**CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html)

## Rule Details

This rule mandates `maxAge` in verify operations. Without it, tokens can be replayed years after issuance.

## Examples

### ❌ Incorrect

```javascript
jwt.verify(token, secret);
jwt.verify(token, secret, { algorithms: ['RS256'] });
```

### ✅ Correct

```javascript
jwt.verify(token, secret, { maxAge: '1h' });
jwt.verify(token, secret, {
  algorithms: ['RS256'],
  maxAge: '24h',
});
```

## Further Reading

- [LightSEC 2025 - Replay Attack Prevention](https://securitypattern.com/post/jwt-back-to-the-future)
