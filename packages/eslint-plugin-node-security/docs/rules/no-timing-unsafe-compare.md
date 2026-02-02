---
title: no-timing-unsafe-compare
description: Disallow timing-unsafe comparison of secrets
tags: ['security', 'timing-attack', 'cwe-208', 'nodejs']
category: security
severity: high
cwe: CWE-208
owasp: "A02:2021"
autofix: false
---

> **Keywords:** timing attack, constant-time, timingSafeEqual, secret comparison, CWE-208, security, ESLint rule
> **CWE:** [CWE-208](https://cwe.mitre.org/data/definitions/208.html)  
> **OWASP:** [A02:2021-Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)


<!-- @rule-summary -->
Disallow timing-unsafe comparison of secrets
<!-- @/rule-summary -->

Detects timing-unsafe comparison of secrets using `===` or `==` operators. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with fix suggestions.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-208](https://cwe.mitre.org/data/definitions/208.html) (Timing Attack) |
| **Severity**      | High (security vulnerability)                                              |
| **Auto-Fix**      | 💡 Suggests crypto.timingSafeEqual()                                       |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Node.js applications comparing tokens, secrets, or signatures              |

## Vulnerability and Risk

**Vulnerability:** Using `===` to compare secrets enables timing attacks. The comparison short-circuits on the first mismatched character, so the time taken reveals information about how many characters matched.

**Risk:** An attacker can measure comparison times to guess secret values character-by-character. For example, comparing API keys or HMAC signatures with `===` allows attackers to brute-force the correct value.

## Rule Details

This rule detects `===`, `==`, `!==`, and `!=` comparisons where at least one operand has a name suggesting it's a secret (token, password, key, secret, hash, signature, etc.).

## Why This Matters

| Risk                      | Impact                               | Solution                     |
| ------------------------- | ------------------------------------ | ---------------------------- |
| ⏱️ **Timing Leak**        | Comparison time reveals match length | Use crypto.timingSafeEqual() |
| 🔑 **Secret Brute Force** | Attack one character at a time       | Constant-time comparison     |
| 🔒 **Token Bypass**       | Forge tokens by timing analysis      | Never use === for secrets    |

## Configuration

| Option           | Type       | Default                           | Description                        |
| ---------------- | ---------- | --------------------------------- | ---------------------------------- |
| `secretPatterns` | `string[]` | `['token', 'secret', 'key', ...]` | Variable name patterns for secrets |

```javascript
{
  rules: {
    'node-security/no-timing-unsafe-compare': ['error', {
      secretPatterns: [
        'token', 'secret', 'key', 'password', 'hash', 'signature',
        'mac', 'hmac', 'digest', 'apiKey', 'api_key', 'auth',
        'credential', 'bearer', 'jwt', 'csrf', 'nonce'
      ]
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// Timing-unsafe comparison of API key - HIGH risk
function validateApiKey(userKey: string, storedKey: string) {
  return userKey === storedKey; // ❌ Leaks timing information
}

// Comparing tokens with ===
if (submittedToken === validToken) {
  // ❌ Vulnerable
  grantAccess();
}

// HMAC verification with ===
const expectedHash = crypto.createHmac('sha256', secret).update(data).digest();
if (receivedHash === expectedHash) {
  // ❌ Timing attack possible
  processData();
}
```

### ✅ Correct

```typescript
import crypto from 'crypto';

// Constant-time comparison
function validateApiKey(userKey: string, storedKey: string) {
  const userBuffer = Buffer.from(userKey);
  const storedBuffer = Buffer.from(storedKey);

  // Lengths must match for timingSafeEqual
  if (userBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(userBuffer, storedBuffer); // ✅ Safe
}

// HMAC verification (constant-time)
function verifyHmac(data: Buffer, receivedHmac: Buffer, secret: Buffer) {
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();

  if (receivedHmac.length !== expectedHmac.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedHmac, expectedHmac); // ✅ Safe
}

// JWT verification (use library)
import jwt from 'jsonwebtoken';
jwt.verify(token, secret); // ✅ Library handles timing-safe comparison
```

## How Timing Attacks Work

```
Secret:   "s3cr3t_k3y"
Guess 1:  "aaaaaaaaaa" → Fast rejection (0 chars match)
Guess 2:  "saaaaaaaaa" → Slightly slower (1 char matches)
Guess 3:  "s3aaaaaaaa" → Even slower (2 chars match)
...
Guess N:  "s3cr3t_k3y" → Slowest (all chars match)
```

Each additional matching character adds measurable time, allowing attackers to discover secrets character-by-character.

## Security Impact

| Vulnerability      | CWE | OWASP    | CVSS       | Impact                 |
| ------------------ | --- | -------- | ---------- | ---------------------- |
| Timing Discrepancy | 208 | A02:2021 | 5.9 Medium | Secret value leak      |
| Observable Timing  | 208 | A02:2021 | 5.3 Medium | Brute force enablement |

## Migration Guide

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-timing-unsafe-compare': 'warn'
  }
}
```

### Phase 2: Replacement

```javascript
// Replace === with timingSafeEqual
if (userToken === validToken)  // ❌ Before
if (crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(validToken)))  // ✅ After
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-timing-unsafe-compare': 'error'
  }
}
```

## Related Rules

- [`no-hardcoded-credentials`](../secure-coding/no-hardcoded-credentials.md) - Detect hardcoded secrets
- [`no-weak-hash-algorithm`](./no-weak-hash-algorithm.md) - Detect weak hash algorithms

## Known False Negatives

### Non-Standard Variable Names

**Why**: Only configured patterns are detected.

```typescript
// ❌ NOT DETECTED - unusual variable name
if (userValue === dbValue) { ... }  // Actually comparing tokens
```

**Mitigation**: Add patterns to configuration or use consistent naming.

### Indirect Comparisons

**Why**: Cross-function data flow not tracked.

```typescript
// ❌ NOT DETECTED
function compare(a, b) {
  return a === b;
}
compare(userToken, validToken);
```

**Mitigation**: Search codebase for comparison patterns.

## Further Reading

- **[Node.js timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)** - Official documentation
- **[CWE-208: Observable Timing Discrepancy](https://cwe.mitre.org/data/definitions/208.html)** - Official CWE entry
- **[Timing Attacks Explained](https://codahale.com/a-lesson-in-timing-attacks/)** - Classic article on timing attacks