---
title: require-expiration
description: 'require-expiration'
category: security
tags: ['security', 'jwt']
---


> Require expiration claim (exp) or expiresIn option in JWT signing

**Severity:** 🟡 Medium  
**CWE:** [CWE-613](https://cwe.mitre.org/data/definitions/613.html)

## Error Message Format

The rule provides **LLM-optimized error messages** (Compact 2-line format) with actionable security guidance:

```text
⚠️ CWE-613 OWASP:A07 CVSS:5.4 | Insufficient Session Expiration detected | MEDIUM
   Fix: Review and apply the recommended fix | https://owasp.org/Top10/A07_2021/
```

### Message Components

| Component | Purpose | Example |
| :--- | :--- | :--- |
| **Risk Standards** | Security benchmarks | [CWE-613](https://cwe.mitre.org/data/definitions/613.html) [OWASP:A07](https://owasp.org/Top10/A07_2021-Injection/) [CVSS:5.4](https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator?vector=AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **Issue Description** | Specific vulnerability | `Insufficient Session Expiration detected` |
| **Severity & Compliance** | Impact assessment | `MEDIUM` |
| **Fix Instruction** | Actionable remediation | `Follow the remediation steps below` |
| **Technical Truth** | Official reference | [OWASP Top 10](https://owasp.org/Top10/A07_2021-Injection/) |

## Rule Details

This rule mandates expiration in JWT tokens. Tokens without expiration are valid forever, increasing the exposure window if compromised.

## Examples

### ❌ Incorrect

```javascript
jwt.sign(payload, secret);
jwt.sign(payload, secret, {});
jwt.sign(payload, secret, { algorithm: 'RS256' });
```

### ✅ Correct

```javascript
// expiresIn option
jwt.sign(payload, secret, { expiresIn: '1h' });

// exp in payload
jwt.sign({ sub: 'user', exp: Math.floor(Date.now() / 1000) + 3600 }, secret);
```

## Options

```javascript
{
  "jwt/require-expiration": ["error", {
    "maxExpirationSeconds": 86400
  }]
}
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Payload Construction

**Why**: The rule checks literal payload objects; computed payloads are not analyzed.

```typescript
// ❌ NOT DETECTED - Payload built dynamically
function buildPayload(userId: string) {
  return { sub: userId }; // No exp claim
}
jwt.sign(buildPayload('user123'), secret); // Missing expiration
```

**Mitigation**: Add expiration in the `sign()` options as a backup.

### Spread Operator Payload

**Why**: Spread objects hide the actual claims at lint time.

```typescript
// ❌ NOT DETECTED - exp might be missing in baseClaims
const baseClaims = getBaseClaims();
jwt.sign({ ...baseClaims, sub: userId }, secret);
```

**Mitigation**: Always include `expiresIn` in options, not just `exp` in payload.

### Variable Payload Reference

**Why**: Variable contents are not tracked across assignments.

```typescript
// ❌ NOT DETECTED - Payload from variable
const payload = { sub: 'user' }; // No exp
jwt.sign(payload, secret); // Variable reference not analyzed
```

**Mitigation**: Use inline objects with TypeScript interfaces that require `exp`.

### Cross-File Payload Creation

**Why**: Payloads created in other modules are not visible.

```typescript
// ❌ NOT DETECTED - Payload from imported function
import { createTokenPayload } from './tokens';
jwt.sign(createTokenPayload(user), secret); // Depends on implementation
```

**Mitigation**: Apply rule to all modules. Use TypeScript interfaces with required `exp` field.

### Excessive Expiration Values

**Why**: Very large `expiresIn` values (e.g., `'100y'`) pass the check but are effectively non-expiring.

```typescript
// ❌ NOT DETECTED (by default) - Effectively non-expiring
jwt.sign(payload, secret, { expiresIn: '100y' });
```

**Mitigation**: Use `maxExpirationSeconds` option to enforce reasonable limits.

## Further Reading

- [RFC 8725 - JWT Best Practices](https://tools.ietf.org/html/rfc8725)
