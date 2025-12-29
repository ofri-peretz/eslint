# no-algorithm-none

> Disallow JWT "none" algorithm which bypasses signature verification (CVE-2022-23540)

**Severity:** 🔴 Critical  
**CWE:** [CWE-347](https://cwe.mitre.org/data/definitions/347.html)  
**CVE:** [CVE-2022-23540](https://nvd.nist.gov/vuln/detail/CVE-2022-23540)

## Rule Details

This rule detects attempts to use the `none` algorithm which completely bypasses JWT signature verification. An attacker can forge any JWT payload and it will be accepted.

## Examples

### ❌ Incorrect

```javascript
// Direct 'none' algorithm
jwt.verify(token, secret, { algorithm: 'none' });

// 'none' in algorithms array
jwt.verify(token, secret, { algorithms: ['none'] });

// Mixed with other algorithms
jwt.verify(token, secret, { algorithms: ['RS256', 'none'] });

// Case variations
jwt.verify(token, secret, { algorithm: 'NONE' });
jwt.verify(token, secret, { algorithm: 'None' });

// Empty algorithms array
jwt.verify(token, secret, { algorithms: [] });
```

### ✅ Correct

```javascript
// Explicit secure algorithm
jwt.verify(token, secret, { algorithms: ['RS256'] });

// Multiple secure algorithms
jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });

// HMAC with strong secret
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

## Options

```javascript
{
  "jwt/no-algorithm-none": ["error", {
    "allowInTests": false
  }]
}
```

| Option         | Type    | Default | Description         |
| -------------- | ------- | ------- | ------------------- |
| `allowInTests` | boolean | false   | Allow in test files |

## When Not To Use It

Never disable this rule in production code. You may use `allowInTests: true` for security testing.

## Further Reading

- [CVE-2022-23540](https://nvd.nist.gov/vuln/detail/CVE-2022-23540)
- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
