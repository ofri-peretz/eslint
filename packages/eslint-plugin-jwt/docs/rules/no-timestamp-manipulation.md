---
title: no-timestamp-manipulation
description: no-timestamp-manipulation
category: security
severity: medium
tags: ['security', 'jwt']
autofix: false
---


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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options Object from Variable

**Why**: Variable contents are not analyzed.

```typescript
// ❌ NOT DETECTED - Options from variable
const opts = { noTimestamp: true };
jwt.sign(payload, secret, opts); // Variable not analyzed
```

**Mitigation**: Use inline options objects. Use TypeScript to forbid `noTimestamp: true`.

### Spread Options Object

**Why**: Spread properties are not visible at lint time.

```typescript
// ❌ NOT DETECTED - noTimestamp in spread
const baseOpts = { noTimestamp: true };
jwt.sign(payload, secret, { ...baseOpts, expiresIn: '1h' });
```

**Mitigation**: Avoid spreading sign options. Build options explicitly.

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
