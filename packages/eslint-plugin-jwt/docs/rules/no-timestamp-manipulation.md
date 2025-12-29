# no-timestamp-manipulation

> Prevent disabling automatic timestamp generation which enables replay attacks

**Severity:** 🟠 High  
**CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html)

## Rule Details

This rule detects `noTimestamp: true` which disables automatic `iat` (issued at) claim generation. This enables the "Back to the Future" replay attack described in LightSEC 2025 research.

## Examples

### ❌ Incorrect

```javascript
// Disables iat - enables replay attacks
jwt.sign(payload, secret, { noTimestamp: true });
```

### ✅ Correct

```javascript
// Default behavior - iat is added
jwt.sign(payload, secret);
jwt.sign(payload, secret, { expiresIn: '1h' });

// Explicit false (redundant but clear)
jwt.sign(payload, secret, { noTimestamp: false });
```

## The "Back to the Future" Attack

From LightSEC 2025 research:

1. Attacker manipulates device time to the future
2. Device signs tokens with future `iat` timestamps
3. Tokens are stored for later use
4. Years later, the tokens become valid and can impersonate the device

## Further Reading

- [LightSEC 2025 - "Back to the Future" Attack](https://securitypattern.com/post/jwt-back-to-the-future)
