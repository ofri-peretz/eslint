---
title: no-sensitive-payload
description: JWT payloads are NOT encrypted, only base64-encoded
tags: ['security', 'jwt']
category: security
severity: medium
cwe: CWE-359
autofix: false
---

> Prevent storing sensitive data in JWT payload which is only base64-encoded

<!-- @rule-summary -->

JWT payloads are NOT encrypted, only base64-encoded
<!-- @/rule-summary -->

**Severity:** 🟡 Medium  
**CWE:** [CWE-359](https://cwe.mitre.org/data/definitions/359.html)

## Rule Details

JWT payloads are NOT encrypted, only base64-encoded. Anyone can decode and read the payload contents. Sensitive data like passwords, PII, or financial information should never be stored in JWT payloads.

## Detected Sensitive Fields

- **Passwords**: password, passwd, pwd, secret
- **PII**: email, phone, ssn, address, dob
- **Financial**: creditCard, cardNumber, cvv, bankAccount
- **Tokens**: accessToken, refreshToken, apiKey
- Supports camelCase, snake_case, and kebab-case variants

## Examples

### ❌ Incorrect

```javascript
jwt.sign({ password: 'secret123' }, secret);
jwt.sign({ email: 'user@example.com' }, secret);
jwt.sign({ ssn: '123-45-6789' }, secret);
jwt.sign({ credit_card: '4111111111111111' }, secret);
jwt.sign({ sub: user.id, passwordHash: user.passwordHash }, secret);

// The payload one const away, a spread of a const, jose's constructor claims
const payload = { sub: user.id, password: user.password };
jwt.sign(payload, secret);
await new SignJWT({ sub: user.id, password: user.password })
  .setProtectedHeader({ alg: 'HS256' })
  .sign(key);

// A whole record spread into the claims (CWE-200): every field it has —
// the password hash included, and any column added later — goes in the token
function issue(user) {
  return jwt.sign({ ...user }, secret);
}
const row = await prisma.user.findUnique({ where: { id } });
jwt.sign({ ...row, role: 'user' }, secret);
```

A spread whose source cannot be followed to an object literal in the file is
reported as a whole-record exposure, with a "pick the claims" fix. With type
information (`parserOptions.projectService`) the declared fields of the
spread source are known, and the spread is reported only when one of them is
sensitive — `{ ...claims }` of `{ sub; scope }` is then left alone.

### ✅ Correct

```javascript
// Store sensitive data server-side, reference by ID
jwt.sign({ sub: 'user-id-123', role: 'admin' }, secret);
jwt.sign({ userId: 'abc123', permissions: ['read'] }, secret);

// Pick the claims explicitly instead of spreading the record
jwt.sign({ sub: user.id, role: user.role }, secret);
```

## Options

| Option                      | Type       | Default | Description                                                      |
| --------------------------- | ---------- | ------- | ---------------------------------------------------------------- |
| `additionalSensitiveFields` | `string[]` | `[]`    | Additional field names to flag as sensitive                      |
| `trustedSanitizers`         | `string[]` | `[]`    | Extra function names to treat as sanitizers                      |
| `trustedAnnotations`        | `string[]` | `[]`    | Extra JSDoc annotations to treat as safe markers                 |
| `strictMode`                | `boolean`  | `false` | Disable false-positive suppression — report even sanitized input |

```javascript
{
  "jwt/no-sensitive-payload": ["error", {
    "additionalSensitiveFields": ["customSecret", "internalId"]
  }]
}
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Computed Property Names

**Why**: The rule checks literal property names; computed properties are not resolved.

```typescript
// ❌ NOT DETECTED - Dynamic property name
const field = 'password';
jwt.sign({ [field]: 'secret123' }, secret); // Property name unknown
```

**Mitigation**: Avoid computed property names in JWT payloads. Use TypeScript interfaces.

### A Whole Record Passed Without a Spread

**Why**: the whole-record check reads spreads. A record passed as the payload itself is not resolved to its fields.

```typescript
// ⚠️ NOT DETECTED - the record is the payload, not a spread into it
function issue(user) {
  return jwt.sign(user, secret);
}
```

**Mitigation**: Build the payload as an object literal of the claims you mean to send.

### Nested Sensitive Data

**Why**: The rule checks top-level properties by default.

```typescript
// ❌ NOT DETECTED - Sensitive data in nested object
jwt.sign(
  {
    sub: '123',
    profile: { email: 'user@example.com' }, // Nested - not detected
  },
  secret,
);
```

**Mitigation**: Configure `checkNestedProperties: true` if available. Flatten sensitive checks in code review.

### Obfuscated Field Names

**Why**: Field name patterns don't match intentionally obfuscated names.

```typescript
// ❌ NOT DETECTED - Obfuscated field name
jwt.sign(
  {
    sub: '123',
    e: 'user@example.com', // 'e' for email - not in pattern
    p: '555-1234', // 'p' for phone - not in pattern
  },
  secret,
);
```

**Mitigation**: Use `additionalSensitiveFields` to add custom patterns.

### Payloads Built Elsewhere

**Why**: a payload in a same-file `const` is read — `const payload = { ssn }; jwt.sign(payload, secret)` IS detected — but a payload from a parameter, an import or a call is not.

```typescript
// ⚠️ NOT DETECTED - payload from a parameter
function issue(payload) {
  return jwt.sign(payload, secret);
}
```

**Mitigation**: Use inline objects. Apply TypeScript types that exclude sensitive fields.

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
