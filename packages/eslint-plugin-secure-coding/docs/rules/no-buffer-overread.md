# no-buffer-overread

> **Keywords:** buffer overread, CWE-126, out-of-bounds, memory safety, security, Node.js

Detects buffer access beyond bounds. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-126 (Buffer Over-read) |
| **Severity** | High (CVSS 7.5) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Buffer, Memory & DoS |

## Rule Details

Buffer overread occurs when reading from buffers beyond their allocated length. This can lead to:
- Information disclosure (reading adjacent memory)
- Application crashes
- Security vulnerabilities like Heartbleed
- Undefined behavior

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 📤 **Info Leak** | Sensitive data exposure | Validate buffer indices |
| 💥 **Crash** | Denial of service | Check bounds before access |
| 🔓 **Security Bypass** | Memory corruption | Use safe buffer methods |

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
    'secure-coding/no-buffer-overread': ['error', {
      bufferMethods: ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'slice'],
      boundsCheckFunctions: ['validateIndex', 'checkBounds'],
      bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bufferMethods` | `string[]` | `['readUInt8', 'slice']` | Buffer methods to check |
| `boundsCheckFunctions` | `string[]` | `['validateIndex']` | Bounds checking functions |
| `bufferTypes` | `string[]` | `['Buffer', 'Uint8Array']` | Buffer types to monitor |

## Error Message Format

```
🔒 CWE-126 OWASP:A06-Vulnerable CVSS:7.5 | Buffer Overread | HIGH [SOC2,PCI-DSS]
   Fix: Add bounds check before buffer access | https://nodejs.org/api/buffer.html
```

## Further Reading

- **[CWE-126](https://cwe.mitre.org/data/definitions/126.html)** - Buffer over-read
- **[Node.js Buffer](https://nodejs.org/api/buffer.html)** - Buffer documentation
- **[Heartbleed](https://heartbleed.com/)** - Famous buffer overread vulnerability

## Related Rules

- [`no-unlimited-resource-allocation`](./no-unlimited-resource-allocation.md) - Unbounded allocations
- [`detect-non-literal-fs-filename`](./detect-non-literal-fs-filename.md) - Path traversal

