---
title: no-buffer-overread
description: Detects buffer access beyond bounds
tags: ['security', 'node']
category: security
severity: medium
cwe: CWE-126
autofix: false
---

> **Keywords:** buffer overread, CWE-126, out-of-bounds, memory safety, security, Node.js

<!-- @rule-summary -->
Detects buffer access beyond bounds
<!-- @/rule-summary -->

**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)  
**OWASP Mobile:** [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)

Detects buffer access beyond bounds. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-126](https://cwe.mitre.org/data/definitions/126.html) (Buffer Over-read) |
| **Severity**      | High (CVSS 7.5)                                                               |
| **Auto-Fix**      | 💡 Suggestions available                                                      |
| **Category**   | Security |

## Vulnerability and Risk

**Vulnerability:** Buffer over-read occurs when a program reads from a buffer (memory) past the buffer's boundary or before its beginning.

**Risk:** This can lead to the exposure of sensitive information residing in adjacent memory locations (Information Leakage), cause the application to crash (Denial of Service), or result in unexpected application behavior.

## Rule Details

Buffer overread occurs when reading from buffers beyond their allocated length. This can lead to:

- Information disclosure (reading adjacent memory)
- Application crashes
- Security vulnerabilities like Heartbleed
- Undefined behavior

### Why This Matters

| Issue                  | Impact                  | Solution                   |
| ---------------------- | ----------------------- | -------------------------- |
| 📤 **Info Leak**       | Sensitive data exposure | Validate buffer indices    |
| 💥 **Crash**           | Denial of service       | Check bounds before access |
| 🔓 **Security Bypass** | Memory corruption       | Use safe buffer methods    |

## Examples

### ❌ Incorrect

```typescript
// Reading beyond buffer length
const buf = Buffer.from('hello');
const byte = buf[10]; // Out of bounds!

// User-controlled index without validation
const index = parseInt(req.query.index);
const value = buffer[index]; // Potentially negative or too large!

// Slice without bounds checking
const data = buffer.slice(offset, offset + length);
// No validation that offset + length <= buffer.length

// readUInt32LE without bounds check
const value = buf.readUInt32LE(userOffset);
// Could read past end of buffer
```

### ✅ Correct

```typescript
// Validate index before access
const buf = Buffer.from('hello');
if (index >= 0 && index < buf.length) {
  const byte = buf[index];
}

// Bounds checking for user input
const index = parseInt(req.query.index);
if (!Number.isInteger(index) || index < 0 || index >= buffer.length) {
  throw new Error('Invalid index');
}
const value = buffer[index];

// Safe slice with validation
if (offset >= 0 && length > 0 && offset + length <= buffer.length) {
  const data = buffer.slice(offset, offset + length);
}

// Use safe read methods
function safeRead(buf: Buffer, offset: number): number | undefined {
  if (offset >= 0 && offset + 4 <= buf.length) {
    return buf.readUInt32LE(offset);
  }
  return undefined;
}
```

## Configuration

```javascript
{
  rules: {
    'node-security/no-buffer-overread': ['error', {
      bufferMethods: ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'slice'],
      boundsCheckFunctions: ['validateIndex', 'checkBounds'],
      bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer']
    }]
  }
}
```

## Options

| Option                 | Type       | Default                    | Description               |
| ---------------------- | ---------- | -------------------------- | ------------------------- |
| `bufferMethods`        | `string[]` | `['readUInt8', 'slice']`   | Buffer methods to check   |
| `boundsCheckFunctions` | `string[]` | `['validateIndex']`        | Bounds checking functions |
| `bufferTypes`          | `string[]` | `['Buffer', 'Uint8Array']` | Buffer types to monitor   |

## Error Message Format

```
🔒 CWE-126 OWASP:A06-Vulnerable CVSS:7.5 | Buffer Overread | HIGH [SOC2,PCI-DSS]
   Fix: Add bounds check before buffer access | https://nodejs.org/api/buffer.html
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

- **[CWE-126](https://cwe.mitre.org/data/definitions/126.html)** - Buffer over-read
- **[OWASP Buffer Overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow)** - General buffer overflow info
- **[Node.js Buffer](https://nodejs.org/api/buffer.html)** - Buffer documentation
- **[Heartbleed](https://heartbleed.com/)** - Famous buffer overread vulnerability

## Related Rules

- [`no-unlimited-resource-allocation`](./no-unlimited-resource-allocation.md) - Unbounded allocations
- [`detect-non-literal-fs-filename`](./detect-non-literal-fs-filename.md) - Path traversal