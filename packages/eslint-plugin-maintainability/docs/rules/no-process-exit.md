---
title: no-process-exit
description: 'no-process-exit'
category: quality
tags: ['quality', 'maintainability']
---


> **Keywords:** process.exit, Node.js, graceful shutdown, ESLint rule, server, LLM-optimized

Prevents direct `process.exit()` calls to encourage graceful shutdown patterns. This rule is part of [`@eslint/eslint-plugin-quality`](https://www.npmjs.com/package/@eslint/eslint-plugin-quality).

## Quick Summary

| Aspect         | Details                                                    |
| -------------- | ---------------------------------------------------------- |
| **Severity**   | Warning (development)                                      |
| **Auto-Fix**   | ❌ No (requires architecture change)                       |
| **Category**   | Quality |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                    |
| **Best For**   | Node.js servers, long-running processes, graceful shutdown |

## Rule Details

Direct `process.exit()` calls terminate the process immediately without allowing cleanup operations, pending I/O, or graceful connection closing.

### Why This Matters

| Issue                   | Impact                 | Solution            |
| ----------------------- | ---------------------- | ------------------- |
| 🔌 **Open connections** | Clients receive errors | Graceful shutdown   |
| 💾 **Unsaved data**     | Data loss on exit      | Flush before exit   |
| 🔄 **Pending requests** | Interrupted operations | Wait for completion |
| 🧹 **Cleanup**          | Resources not released | Use exit handlers   |

## Examples

### ❌ Incorrect

```typescript
// Direct process.exit
if (error) {
  process.exit(1);
}

// In error handlers
process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1); // Immediate termination
});
```

### ✅ Correct

```typescript
// Use throw for errors
if (error) {
  throw new Error('Configuration error');
}

// Graceful shutdown pattern
function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed');
    database.close(() => {
      console.log('Database connection closed');
      // Process will exit naturally
    });
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1); // eslint-disable-line quality/no-process-exit
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'quality/no-process-exit': 'warn'
  }
}
```

## When To Disable

```typescript
// CLI tools may legitimately use process.exit
// eslint-disable-next-line quality/no-process-exit
process.exit(exitCode);
```

## Related Rules

- [`no-console-log`](./no-console-log.md) - Console logging control

## Further Reading

- **[Node.js process.exit()](https://nodejs.org/api/process.html#processexitcode)** - Official docs
- **[Graceful Shutdown](https://blog.heroku.com/best-practices-nodejs-graceful-shutdown)** - Best practices

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = externalSource();
processValue(value); // Variable origin not tracked
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.
