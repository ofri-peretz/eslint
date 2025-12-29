# no-insecure-key-derivation

Require sufficient PBKDF2 iterations (≥100,000).

## Rule Details

Detects PBKDF2 with insufficient computational effort.

**CWE:** [CWE-916](https://cwe.mitre.org/data/definitions/916.html) - Insufficient Computational Effort

## ❌ Incorrect

```javascript
crypto.pbkdf2(password, salt, 1000, 32, 'sha256', callback);
crypto.pbkdf2(password, salt, 10000, 32, 'sha256', callback);
```

## ✅ Correct

```javascript
crypto.pbkdf2(password, salt, 100000, 32, 'sha256', callback);
// Or better: use scrypt or Argon2
crypto.scrypt(password, salt, 32, callback);
```

## Options

```json
{
  "crypto/no-insecure-key-derivation": ["error", { "minIterations": 100000 }]
}
```

## OWASP Recommendation

OWASP 2023 recommends:

- PBKDF2-SHA256: 600,000 iterations
- PBKDF2-SHA512: 210,000 iterations
- Minimum: 100,000 iterations
