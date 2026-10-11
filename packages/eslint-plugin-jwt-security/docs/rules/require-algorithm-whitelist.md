---
title: require-algorithm-whitelist
description: This rule enforces explicit algorithm specification in verify() calls
tags: ['security', 'jwt']
category: security
severity: medium
cwe: CWE-757
autofix: false
---

> Require explicit algorithm specification in JWT verify operations

<!-- @rule-summary -->

This rule enforces explicit algorithm specification in verify() calls
<!-- @/rule-summary -->

**Severity:** 🟠 High  
**CWE:** [CWE-757](https://cwe.mitre.org/data/definitions/757.html)

## Rule Details

This rule enforces explicit algorithm specification in `verify()` calls. Without explicit algorithms, the token's header algorithm is trusted, enabling algorithm substitution attacks.

## Examples

### ❌ Incorrect

```javascript
// No algorithms specified - trusts token header
jwt.verify(token, secret);
jwt.verify(token, secret, {});
jwt.verify(token, secret, { complete: true });
```

### ✅ Correct

```javascript
// Explicit algorithm whitelist
jwt.verify(token, secret, { algorithms: ['RS256'] });
jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });
jwt.verify(token, secret, { algorithm: 'RS256' });
```

## Options

| Option                  | Type       | Default             | Description                                                      |
| ----------------------- | ---------- | ------------------- | ---------------------------------------------------------------- |
| `recommendedAlgorithms` | `string[]` | `["RS256","ES256"]` | Algorithms to suggest in auto-fix                                |
| `trustedSanitizers`     | `string[]` | `[]`                | Extra function names to treat as sanitizers                      |
| `trustedAnnotations`    | `string[]` | `[]`                | Extra JSDoc annotations to treat as safe markers                 |
| `strictMode`            | `boolean`  | `false`             | Disable false-positive suppression — report even sanitized input |

```javascript
{
  "jwt/require-algorithm-whitelist": ["error", {
    "recommendedAlgorithms": ["RS256", "ES256"]
  }]
}
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variables, Casts and Spreads

**What is read**: options are resolved structurally — an inline object, a same-file `const`, an `as` / `satisfies` cast, and a spread of such a `const`. NestJS `JwtService` calls are read at the second argument, where `@nestjs/jwt` takes them.

```typescript
const verifyOptions = { algorithms: ['RS256'] };
jwt.verify(token, key, verifyOptions); // ✅ read through the const
jwt.verify(token, key, { ...verifyOptions, complete: true }); // ✅ spread of a const
jwt.verify(token, key, { ...verifyOptions } as VerifyOptions); // ✅ through the cast
```

**What is not**: options from a parameter, an import, a function call, or a spread of one of those cannot be seen. The rule stays **silent** rather than report an option it cannot prove is missing. NestJS per-call options merge over `JwtModule` `verifyOptions` in another file, so they are treated the same way.

```typescript
// ⚠️ NOT DETECTED - options built elsewhere
jwt.verify(token, key, getVerifyOptions());
```

**Mitigation**: Keep verify options in a module-level `const` in the file that verifies.

### Wrapper Function Options

**Why**: Options passed through wrapper functions are not visible.

```typescript
// ❌ NOT DETECTED - Wrapper hides options
function verifyToken(token: string, opts = {}) {
  return jwt.verify(token, secret, opts); // opts may lack algorithms
}
verifyToken(userToken); // Looks safe
```

**Mitigation**: Apply this rule to all modules. Add algorithms in wrappers.

### Spread of an Unresolvable Value

**Why**: `{ ...getDefaults() }` may carry the option where this file cannot see it, so a missing option is not reported. A spread of a same-file `const` is read (see above).

```typescript
// ⚠️ NOT DETECTED - the spread source is a call
jwt.verify(token, key, { ...getVerifyOptions() });
```

### Dynamic Options Construction

**Why**: Options built at runtime cannot be analyzed statically.

```typescript
// ❌ NOT DETECTED - Dynamic options building
const options = getVerifyOptions(); // May or may not have algorithms
jwt.verify(token, secret, options);
```

**Mitigation**: Use TypeScript interfaces requiring `algorithms` property.

### Library Defaults

**Why**: Some JWT libraries have secure defaults that aren't visible to the rule.

```typescript
// ⚠️ FALSE POSITIVE RISK - Some libraries default to safe algorithms
import { verify } from 'secure-jwt-lib';
verify(token, key); // Library may have secure defaults
```

**Mitigation**: Use `trustedAnnotations` to mark verified patterns.

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
