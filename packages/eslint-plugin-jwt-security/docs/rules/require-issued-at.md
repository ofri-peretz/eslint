---
title: require-issued-at
description: This rule ensures tokens have the iat claim for freshness validation
tags: ['security', 'jwt']
category: security
severity: medium
cwe: CWE-294
autofix: false
---

> Require iat (issued at) claim for token freshness validation


<!-- @rule-summary -->
This rule ensures tokens have the iat claim for freshness validation
<!-- @/rule-summary -->

**Severity:** 🟡 Medium  
**CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html)

## Rule Details

This rule ensures tokens have the `iat` claim for freshness validation. Most libraries add `iat` automatically unless explicitly disabled.

## Examples

### ❌ Incorrect

```javascript
// Explicitly disables iat
jwt.sign(payload, secret, { noTimestamp: true });
```

### ✅ Correct

```javascript
// Default - iat is added automatically
jwt.sign(payload, secret);

// Explicit iat in payload
jwt.sign({ sub: 'user', iat: Math.floor(Date.now() / 1000) }, secret);
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variable

**Why**: Variable contents are not analyzed.

```typescript
// ❌ NOT DETECTED - noTimestamp in variable
const opts = { noTimestamp: true };
jwt.sign(payload, secret, opts);
```

**Mitigation**: Use inline options. Use TypeScript types forbidding `noTimestamp: true`.

### Payload Without iat When noTimestamp Is Not Used

**Why**: The rule primarily checks for `noTimestamp: true`, not payload contents.

```typescript
// ⚠️ EDGE CASE - Most libraries auto-add iat, so this is usually safe
jwt.sign({ sub: 'user' }, secret); // iat added automatically
```

**Mitigation**: Rely on library defaults. Use `require-max-age` for verification-side checks.

### Library Without Auto-iat

**Why**: Some JWT libraries don't auto-add `iat`, which the rule assumes.

```typescript
// ❌ NOT DETECTED - Library doesn't auto-add iat
import { sign } from 'minimal-jwt-lib';
sign({ sub: 'user' }, secret); // No iat and none added by library
```

**Mitigation**: Verify library behavior. Add explicit `iat` in payload.

### Spread Options

**Why**: Spread properties hide the actual options at lint time.

```typescript
// ❌ NOT DETECTED - noTimestamp in spread
const baseOpts = { noTimestamp: true };
jwt.sign(payload, secret, { ...baseOpts, expiresIn: '1h' });
```

**Mitigation**: Avoid spreading sign options. Specify options explicitly.

## Further Reading

- [LightSEC 2025 - Token Freshness](https://securitypattern.com/post/jwt-back-to-the-future)