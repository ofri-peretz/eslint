# require-issued-at

> Require iat (issued at) claim for token freshness validation

**Severity:** 🟡 Medium  
**CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html)

## Rule Details

This rule ensures tokens have the `iat` claim for freshness validation. Most libraries add `iat` automatically unless explicitly disabled.

## Examples

### ❌ Incorrect

```javascript
// Explicitly disables iat
jwt.sign(payload, secret, { noTimestamp: true });
```

### ✅ Correct

```javascript
// Default - iat is added automatically
jwt.sign(payload, secret);

// Explicit iat in payload
jwt.sign({ sub: 'user', iat: Math.floor(Date.now() / 1000) }, secret);
```

## Further Reading

- [LightSEC 2025 - Token Freshness](https://securitypattern.com/post/jwt-back-to-the-future)
