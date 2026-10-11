---
title: no-timestamp-manipulation
description: "This rule detects noTimestamp: true which disables automatic iat (issued at) claim generation"
tags: ['security', 'jwt']
category: security
severity: medium
cwe: CWE-294
autofix: false
---

> Prevent disabling automatic timestamp generation which enables replay attacks


<!-- @rule-summary -->
This rule detects noTimestamp: true which disables automatic iat (issued at) claim generation
<!-- @/rule-summary -->

**Severity:** 🟠 High  
**CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html)

## Rule Details

This rule detects `noTimestamp: true` which disables automatic `iat` (issued at) claim generation. This enables the "Back to the Future" replay attack described in LightSEC 2025 research.

## Examples

### ❌ Incorrect

```javascript
// Disables iat - enables replay attacks
jwt.sign(payload, secret, { noTimestamp: true });

// Accepts expired tokens - a leaked token never stops working
jwt.verify(token, secret, { algorithms: ['HS256'], ignoreExpiration: true });
new JwtStrategy({ secretOrKey, jwtFromRequest, ignoreExpiration: true }, verify); // passport-jwt
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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variables, Casts and Spreads

**What is read**: an inline object, a same-file `const`, an `as` / `satisfies` cast, and a spread of such a `const`.

```typescript
const opts = { noTimestamp: true };
jwt.sign(payload, secret, opts); // ❌ detected through the const
```

**What is not**: options from a parameter, an import or a call.

```typescript
// ⚠️ NOT DETECTED - options built elsewhere
jwt.sign(payload, secret, getSignOptions());
```

### Spread of an Unresolvable Value

```typescript
// ⚠️ NOT DETECTED - the spread source is a call
jwt.sign(payload, secret, { ...getSignOptions() });
```

### Dynamic Boolean Values

**Why**: Boolean computed at runtime is not evaluated.

```typescript
// ❌ NOT DETECTED - Dynamic boolean
const disableTimestamp = getConfig().disableIat; // Returns true
jwt.sign(payload, secret, { noTimestamp: disableTimestamp });
```

**Mitigation**: Use TypeScript literal types. Validate config at startup.

### Cross-Module Options

**Why**: Options imported from other modules are not traced.

```typescript
// ❌ NOT DETECTED - Options from import
import { JWT_OPTIONS } from './config'; // { noTimestamp: true }
jwt.sign(payload, secret, JWT_OPTIONS);
```

**Mitigation**: Apply this rule to all modules including config files.

## Further Reading

- [LightSEC 2025 - "Back to the Future" Attack](https://securitypattern.com/post/jwt-back-to-the-future)