# no-unlimited-resource-allocation

> **Keywords:** resource allocation, CWE-770, DoS, memory exhaustion, security, rate limiting

Detects unlimited resource allocation that could cause DoS. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-770 (Allocation Without Limits) |
| **Severity** | High (CVSS 7.5) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Buffer, Memory & DoS |

## Rule Details

Unlimited resource allocation can cause denial of service by exhausting system resources like memory, file handles, or network connections. Attackers can:
- Crash the application with memory exhaustion
- Exhaust file descriptors
- Overwhelm network resources
- Cause system-wide resource starvation

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 💾 **Memory Exhaustion** | Application crash | Limit allocation sizes |
| 📂 **FD Exhaustion** | Service unavailable | Close resources properly |
| 🌐 **Connection Flood** | Network DoS | Implement rate limiting |

## Examples

### ❌ Incorrect

```typescript
// Allocating buffer with user-controlled size
const size = parseInt(req.query.size);
const buffer = Buffer.alloc(size); // Can be huge!

// Reading entire file into memory
const data = fs.readFileSync(userFile);

// Creating array with user-controlled length
const array = new Array(userInput.length);
array.fill(0);

// Unlimited network connections
const connections = [];
for (const url of urls) {
  connections.push(fetch(url)); // No limit!
}
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
const results = await Promise.all(
  urls.map(url => limit(() => fetch(url)))
);
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
|--------|------|---------|-------------|
| `maxResourceSize` | `number` | `10485760` | Maximum allowed resource size (bytes) |
| `userInputVariables` | `string[]` | `['req', 'request']` | User input variable patterns |
| `safeResourceFunctions` | `string[]` | `[]` | Safe allocation functions |
| `requireResourceValidation` | `boolean` | `true` | Require validation before allocation |

## Error Message Format

```
🔒 CWE-770 OWASP:A05-Misconfig CVSS:7.5 | Unlimited Resource Allocation | HIGH [SOC2,PCI-DSS]
   Fix: Add size limits and validate user input before allocation | https://cwe.mitre.org/...
```

## Further Reading

- **[CWE-770](https://cwe.mitre.org/data/definitions/770.html)** - Allocation without limits
- **[Node.js Streams](https://nodejs.org/api/stream.html)** - Efficient data handling
- **[OWASP DoS](https://owasp.org/www-community/attacks/Denial_of_Service)** - DoS attack prevention

## Related Rules

- [`no-unchecked-loop-condition`](./no-unchecked-loop-condition.md) - Infinite loop conditions
- [`no-buffer-overread`](./no-buffer-overread.md) - Buffer over-read

