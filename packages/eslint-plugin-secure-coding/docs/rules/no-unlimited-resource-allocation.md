---
title: no-unlimited-resource-allocation
description: Detects unlimited resource allocation that could cause DoS
tags: ['security', 'core']
category: security
severity: medium
cwe: CWE-770
autofix: false
---

> **Keywords:** resource allocation, CWE-770, DoS, memory exhaustion, security, rate limiting

<!-- @rule-summary -->
Detects unlimited resource allocation that could cause DoS
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects unlimited resource allocation that could cause DoS. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-770](https://cwe.mitre.org/data/definitions/770.html) (Allocation Without Limits) |
| **Severity**      | High (CVSS 7.5)                                                                        |
| **Auto-Fix**      | 💡 Suggestions available                                                               |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** Unlimited resource allocation occurs when an application allocates resources (like memory, file descriptors, or database connections) based on untrusted user input without any upper bounds.

**Risk:** An attacker can trigger the allocation of massive amounts of resources (e.g., sending a request with a very large `size` parameter), causing the application to crash due to Out-Of-Memory (OOM) errors or exhaustion of system limits (Denial of Service).

## Rule Details

Unlimited resource allocation can cause denial of service by exhausting system resources like memory, file handles, or network connections. Attackers can:

- Crash the application with memory exhaustion
- Exhaust file descriptors
- Overwhelm network resources
- Cause system-wide resource starvation

### Why This Matters

| Issue                    | Impact              | Solution                 |
| ------------------------ | ------------------- | ------------------------ |
| 💾 **Memory Exhaustion** | Application crash   | Limit allocation sizes   |
| 📂 **FD Exhaustion**     | Service unavailable | Close resources properly |
| 🌐 **Connection Flood**  | Network DoS         | Implement rate limiting  |

## Examples

### ❌ Incorrect

```typescript
const buf = Buffer.alloc(req.query.size);
```

### ✅ Correct

```typescript
// Limit allocation size
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const size = parseInt(req.query.size);
if (size > MAX_SIZE || size <= 0) {
  throw new Error('Invalid size');
}
const buffer = Buffer.alloc(size);

// Stream large files
const stream = fs.createReadStream(userFile);
stream.pipe(response);

// Limit array size
const MAX_ITEMS = 1000;
const length = Math.min(userInput.length, MAX_ITEMS);
const array = new Array(length).fill(0);

// Limit concurrent connections
import pLimit from 'p-limit';
const limit = pLimit(10); // Max 10 concurrent
const results = await Promise.all(urls.map((url) => limit(() => fetch(url))));
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-unlimited-resource-allocation': ['error', {
      maxResourceSize: 10485760, // 10MB
      userInputVariables: ['req', 'request', 'input'],
      safeResourceFunctions: ['limitedAlloc', 'safeBuffer'],
      requireResourceValidation: true
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `sizeProperties` | `string[]` | `["length","size","byteLength","count"]` | Property names that carry a magnitude. Replaces the default. |
| `limitOptionNames` | `string[]` | `["maxOutputLength","maxSize","limit"]` | Option keys a library accepts to cap an operation. Replaces the default. |
| `maxResourceSize` | `number` | `1048576` | Allocation size in bytes above which a call is reported |
| `userInputVariables` | `string[]` | `["req","request","body","query","params","input","data"]` | Variable names treated as user-controlled input |
| `safeResourceFunctions` | `string[]` | `["validateSize","checkLimits","limitResource","safeAlloc"]` | Function names that bound an allocation |
| `requireResourceValidation` | `boolean` | `true` | Require an explicit size check before allocating |
| `trustedSanitizers` | `string[]` | `[]` | Additional function names to consider as resource validators |
| `trustedAnnotations` | `string[]` | `[]` | Additional JSDoc annotations to consider as safe markers |
| `strictMode` | `boolean` | `false` | Disable all false positive detection (strict mode) |

## Error Message Format

```
🔒 CWE-770 OWASP:A05-Misconfig CVSS:7.5 | Unlimited Resource Allocation | HIGH [SOC2,PCI-DSS]
   Fix: Add size limits and validate user input before allocation | https://cwe.mitre.org/...
```

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Values stored in variables are not traced.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Validate all user inputs.

### Wrapper Functions

**Why**: Custom wrappers not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper
myWrapper(userInput); // Uses dangerous API internally
```

**Mitigation**: Apply rule to wrapper implementations.

### Dynamic Invocation

**Why**: Dynamic calls not analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic
obj[method](userInput);
```

**Mitigation**: Avoid dynamic method invocation.

## Further Reading

- **[CWE-770](https://cwe.mitre.org/data/definitions/770.html)** - Allocation without limits
- **[Node.js Streams](https://nodejs.org/api/stream.html)** - Efficient data handling
- **[OWASP DoS](https://owasp.org/www-community/attacks/Denial_of_Service)** - DoS attack prevention

## Related Rules

- [`no-unchecked-loop-condition`](./no-unchecked-loop-condition.md) - Infinite loop conditions
- [`no-buffer-overread`](./no-buffer-overread.md) - Buffer over-read