---
title: no-algorithm-none
description: no-algorithm-none
category: security
severity: critical
tags: ['security', 'jwt']
autofix: false
---


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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Algorithm Configuration

**Why**: The rule checks for literal `'none'` strings, not dynamically constructed values.

```typescript
// ❌ NOT DETECTED - Variable contains 'none'
const algo = getAlgorithmFromConfig(); // Returns 'none'
jwt.verify(token, secret, { algorithm: algo });
```

**Mitigation**: Use TypeScript strict typing for algorithm options. Implement runtime validation.

### Spread Operator Options

**Why**: Spread objects are not statically analyzable.

```typescript
// ❌ NOT DETECTED - Algorithm in spread object
const maliciousOptions = { algorithm: 'none' };
jwt.verify(token, secret, { ...maliciousOptions });
```

**Mitigation**: Avoid spreading untrusted option objects. Validate options at runtime.

### External Configuration Files

**Why**: ESLint cannot trace values from JSON/YAML config files.

```typescript
// ❌ NOT DETECTED - Algorithm from config file
// config.json: { "jwt": { "algorithm": "none" } }
import config from './config.json';
jwt.verify(token, secret, { algorithm: config.jwt.algorithm });
```

**Mitigation**: Validate configuration at application startup. Use schema validation for config files.

### Library Wrapper Defaults

**Why**: Default options set inside wrapper functions are not visible.

```typescript
// ❌ NOT DETECTED - Wrapper function with unsafe defaults
function verifyToken(token: string) {
  // 'none' hardcoded in wrapper
  return jwt.verify(token, secret, { algorithms: ['none', 'HS256'] });
}
verifyToken(userToken); // Looks safe, but isn't
```

**Mitigation**: Apply this rule to all files including utility modules.

## Further Reading

- [CVE-2022-23540](https://nvd.nist.gov/vuln/detail/CVE-2022-23540)
- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
