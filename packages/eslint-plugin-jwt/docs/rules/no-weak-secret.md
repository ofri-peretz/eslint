# no-weak-secret

> Require strong secrets (256+ bits) for HMAC-based JWT signing

**Severity:** 🟠 High  
**CWE:** [CWE-326](https://cwe.mitre.org/data/definitions/326.html)

## Rule Details

This rule detects weak secrets used for HMAC-based JWT signing. Weak secrets can be brute-forced offline, allowing attackers to forge tokens.

## Examples

### ❌ Incorrect

```javascript
// Known weak patterns
jwt.sign(payload, 'secret');
jwt.sign(payload, 'password');
jwt.sign(payload, 'changeme');

// Short secrets (< 32 characters)
jwt.sign(payload, 'shortkey');
```

### ✅ Correct

```javascript
// Environment variable
jwt.sign(payload, process.env.JWT_SECRET);

// Long secret (32+ characters)
jwt.sign(payload, 'ThisIsAVeryStrongSecretThatIs32Ch+');

// Generated secret
jwt.sign(payload, crypto.randomBytes(32).toString('hex'));
```

## Options

```javascript
{
  "jwt/no-weak-secret": ["error", {
    "minSecretLength": 32
  }]
}
```

| Option            | Type    | Default | Description                   |
| ----------------- | ------- | ------- | ----------------------------- |
| `minSecretLength` | integer | 32      | Minimum secret length (chars) |

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
