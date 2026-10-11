---
title: require-audience-validation
description: 'The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:'
tags: ['security', 'jwt']
category: security
severity: medium
cwe: CWE-287
autofix: false
---

> Require audience (aud) claim validation in JWT verify operations

<!-- @rule-summary -->

The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:
<!-- @/rule-summary -->

**Severity:** 🟡 Medium  
**CWE:** [CWE-287](https://cwe.mitre.org/data/definitions/287.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
🔒 CWE-287 OWASP:A07 CVSS:9.8 | Improper Authentication detected | CRITICAL
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A07_2021/
```

### Message Components

| Component                 | Purpose                | Example                                                                                                                                                                                                                                                       |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Risk Standards**        | Security benchmarks    | [CWE-287](https://cwe.mitre.org/data/definitions/287.html) [OWASP:A07](https://owasp.org/Top10/A07_2021-Injection/) [CVSS:9.8](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV%3AN%2FAC%3AL%2FPR%3AN%2FUI%3AN%2FS%3AU%2FC%3AH%2FI%3AH%2FA%3AH) |
| **Issue Description**     | Specific vulnerability | `Improper Authentication detected`                                                                                                                                                                                                                            |
| **Severity & Compliance** | Impact assessment      | `CRITICAL`                                                                                                                                                                                                                                                    |
| **Fix Instruction**       | Actionable remediation | `Follow the remediation steps below`                                                                                                                                                                                                                          |
| **Technical Truth**       | Official reference     | [OWASP Top 10](https://owasp.org/Top10/A07_2021-Injection/)                                                                                                                                                                                                   |

## Rule Details

This rule mandates audience validation. Without it, tokens intended for other services are accepted.

## Examples

### ❌ Incorrect

```javascript
jwt.verify(token, secret);
jwt.verify(token, secret, { issuer: 'auth.example.com' });
```

### ✅ Correct

```javascript
jwt.verify(token, secret, { audience: 'https://api.example.com' });
jwt.verify(token, secret, {
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});
```

## Options

| Option               | Type       | Default | Description                                                      |
| -------------------- | ---------- | ------- | ---------------------------------------------------------------- |
| `knownAudiences`     | `string[]` | `[]`    | Known valid audiences to suggest                                 |
| `trustedSanitizers`  | `string[]` | `[]`    | Extra function names to treat as sanitizers                      |
| `trustedAnnotations` | `string[]` | `[]`    | Extra JSDoc annotations to treat as safe markers                 |
| `strictMode`         | `boolean`  | `false` | Disable false-positive suppression — report even sanitized input |

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variables, Casts and Spreads

**What is read**: options are resolved structurally — an inline object, a same-file `const`, an `as` / `satisfies` cast, and a spread of such a `const`. NestJS `JwtService` calls are read at the second argument, where `@nestjs/jwt` takes them.

```typescript
const verifyOptions = { algorithms: ['RS256'], audience: 'api://orders' };
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

### Runtime Audience Configuration

**Why**: Audience from runtime config is not visible.

```typescript
// ❌ NOT DETECTED - Audience from config
jwt.verify(token, secret, { audience: config.audience }); // Might be undefined
```

**Mitigation**: Validate config at startup. Use required fields in TypeScript config types.

### Wrapper Function

**Why**: Options passed through wrappers are not traced.

```typescript
// ❌ NOT DETECTED - Wrapper hides options
function verifyToken(token: string) {
  return jwt.verify(token, secret, { algorithms: ['RS256'] }); // No audience
}
```

**Mitigation**: Apply this rule to all modules including utilities.

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
