# no-hardcoded-secret

> Disallow hardcoded secrets in JWT sign/verify operations

**Severity:** 🟠 High  
**CWE:** [CWE-798](https://cwe.mitre.org/data/definitions/798.html)

## Rule Details

This rule detects hardcoded secrets in source code. Secrets committed to repositories can be extracted by anyone with code access.

## Examples

### ❌ Incorrect

```javascript
// Hardcoded string
jwt.sign(payload, 'my-secret-key');
jwt.verify(token, 'my-secret-key');

// Template literal
jwt.sign(payload, `static-secret`);
```

### ✅ Correct

```javascript
// Environment variable
jwt.sign(payload, process.env.JWT_SECRET);

// Config object
jwt.sign(payload, config.jwtSecret);

// Function call
jwt.sign(payload, getSecretFromVault());
```

## Further Reading

- [CWE-798: Hardcoded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [12 Factor App - Config](https://12factor.net/config)
