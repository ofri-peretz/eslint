---
title: no-express-unsafe-regex-route
description: no-express-unsafe-regex-route
category: security
severity: medium
tags: ['security', 'express']
autofix: false
---


> Disallow vulnerable regular expressions in route definitions

**Severity:** 🔴 Critical  
**CWE:** [CWE-1333](https://cwe.mitre.org/data/definitions/1333.html)

## Rule Details

This rule detects Regular Expression Denial of Service (ReDoS) vulnerabilities in Express route patterns. Malicious input can cause exponential backtracking in vulnerable regex patterns, freezing your server.

## Examples

### ❌ Incorrect

```javascript
// Nested quantifiers - VULNERABLE to ReDoS
app.get(/^\/api\/(.*)*$/, handler);

// Overlapping alternations - VULNERABLE
app.get(/^(a+)+$/, handler);

// Evil regex patterns
app.get(/^([a-zA-Z]+)*$/, handler);
```

### ✅ Correct

```javascript
// Simple patterns - SAFE
app.get('/api/:resource', handler);

// Non-vulnerable regex - SAFE
app.get(/^\/api\/[a-z]+$/, handler);

// Use atomic groups or possessive quantifiers
app.get(/^\/api\/\w+$/, handler);
```

## Vulnerable Patterns

| Pattern        | Risk   | Example Attack                  |
| -------------- | ------ | ------------------------------- |
| `(a+)+`        | High   | `aaaaaaaaaaaaaaaaaaaaaaaaaaaa!` |
| `(.*)*`        | High   | Long strings with no match      |
| `([a-zA-Z]+)*` | High   | `aaaaaaaaaaaaaaaaaaaaaaaaaaa!`  |
| `(a\|aa)+`     | Medium | Alternation with overlap        |

## Options

| Option         | Type      | Default | Description                      |
| -------------- | --------- | ------- | -------------------------------- |
| `allowInTests` | `boolean` | `false` | Allow unsafe regex in test files |

```json
{
  "rules": {
    "express-security/no-express-unsafe-regex-route": "error"
  }
}
```

## When Not To Use It

Never disable this rule. ReDoS can completely freeze your server.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Regex from Variable

**Why**: Regex stored in variables is not analyzed.

```typescript
// ❌ NOT DETECTED - Regex from variable
const pattern = /^(.*)*$/;
app.get(pattern, handler);
```

**Mitigation**: Use inline regex. Apply safe-regex checks at startup.

### Dynamic Regex Construction

**Why**: Regex built at runtime is not evaluated.

```typescript
// ❌ NOT DETECTED - Dynamic regex
const pattern = new RegExp(userInput + '*');
app.get(pattern, handler); // Could be vulnerable!
```

**Mitigation**: Never use user input in regex. Use static patterns.

### Custom Router Methods

**Why**: Non-standard router methods are not tracked.

```typescript
// ❌ NOT DETECTED - Custom router
customRouter.route(/^(a+)+$/, handler);
```

**Mitigation**: Configure rule for custom router method names.

### Nested Router Patterns

**Why**: Patterns combined through nested routers may create ReDoS.

```typescript
// ❌ NOT DETECTED - Nested pattern combination
const outer = /^\\/api.*/;
const inner = /.*\\/data$/;
// Combined may be vulnerable
```

**Mitigation**: Review router hierarchy. Test combined patterns.

## Further Reading

- [OWASP ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [safe-regex npm](https://www.npmjs.com/package/safe-regex)
