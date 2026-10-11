---
title: require-max-age
description: This rule mandates maxAge in verify operations
tags: ['security', 'jwt']
category: security
severity: medium
cwe: CWE-294
autofix: false
---

> Require maxAge option in verify operations to enforce token freshness

<!-- @rule-summary -->

This rule mandates maxAge in verify operations
<!-- @/rule-summary -->

**Severity:** 🟡 Medium  
**CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html)

## Rule Details

This rule mandates `maxAge` in verify operations. Without it, tokens can be replayed years after issuance.

## Examples

### ❌ Incorrect

```javascript
jwt.verify(token, secret);
jwt.verify(token, secret, { algorithms: ['RS256'] });
```

### ✅ Correct

```javascript
jwt.verify(token, secret, { maxAge: '1h' });
jwt.verify(token, secret, {
  algorithms: ['RS256'],
  maxAge: '24h',
});

// jose spells it maxTokenAge
await jwtVerify(token, JWKS, { algorithms: ['RS256'], maxTokenAge: '15m' });
```

`clockTolerance` does not satisfy this rule: it widens the `exp` / `nbf`
window and caps nothing.

## Options

| Option               | Type       | Default | Description                                                      |
| -------------------- | ---------- | ------- | ---------------------------------------------------------------- |
| `trustedSanitizers`  | `string[]` | `[]`    | Extra function names to treat as sanitizers                      |
| `trustedAnnotations` | `string[]` | `[]`    | Extra JSDoc annotations to treat as safe markers                 |
| `strictMode`         | `boolean`  | `false` | Disable false-positive suppression — report even sanitized input |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variables, Casts and Spreads

**What is read**: options are followed within the file — an inline object, a `const` or a never-reassigned `let`, a destructure, a member of an object literal, an `as` / `satisfies` cast, a spread of any of those, and the single `return` of a same-file function. NestJS `JwtService` calls are read at the second argument, where `@nestjs/jwt` takes them. An injected `this.<member>` counts as a JWT client only on evidence the class gives (a type annotation resolving to a JWT library, an `@Inject(X)` of a JWT import, or an assignment from one).

```typescript
const verifyOptions = { algorithms: ['RS256'], maxAge: '15m' };
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

### Spread of an Unresolvable Value

**Why**: `{ ...getDefaults() }` may carry the option where this file cannot see it, so a missing option is not reported. A spread of a same-file `const` is read (see above).

```typescript
// ⚠️ NOT DETECTED - the spread source is a call
jwt.verify(token, key, { ...getVerifyOptions() });
```

### Runtime MaxAge Configuration

**Why**: MaxAge from runtime config is not visible.

```typescript
// ❌ NOT DETECTED - MaxAge from config
jwt.verify(token, secret, { maxAge: config.tokenMaxAge }); // Might be undefined
```

**Mitigation**: Validate config at startup. Use required fields in TypeScript config types.

### Excessive MaxAge Values

**Why**: Very large maxAge values (e.g., `'100y'`) pass but are effectively non-enforcing.

```typescript
// ❌ NOT DETECTED - Effectively no max age enforcement
jwt.verify(token, secret, { maxAge: '100y' });
```

**Mitigation**: Add option for maximum allowed maxAge value. Validate at runtime.

### Wrapper Function

**Why**: Options passed through wrappers are not traced.

```typescript
// ❌ NOT DETECTED - Wrapper hides options
function verifyToken(token: string, opts = {}) {
  return jwt.verify(token, secret, opts); // opts may lack maxAge
}
```

**Mitigation**: Apply this rule to all modules including utilities.

## Further Reading

- [LightSEC 2025 - Replay Attack Prevention](https://securitypattern.com/post/jwt-back-to-the-future)
