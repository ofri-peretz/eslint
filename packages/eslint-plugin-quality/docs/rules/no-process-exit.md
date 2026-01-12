# no-process-exit

> **Keywords:** process.exit, Node.js, graceful shutdown, ESLint rule, server, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevents direct `process.exit()` calls to encourage graceful shutdown patterns. This rule is part of [`@eslint/eslint-plugin-quality`](https://www.npmjs.com/package/@eslint/eslint-plugin-quality).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (development)                                                |
| **Auto-Fix**   | ❌ No (requires architecture change)                                 |
| **Category**   | Development                                                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Node.js servers, long-running processes, graceful shutdown           |

## Rule Details

Direct `process.exit()` calls terminate the process immediately without allowing cleanup operations, pending I/O, or graceful connection closing.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🔌 **Open connections**   | Clients receive errors          | Graceful shutdown         |
| 💾 **Unsaved data**       | Data loss on exit               | Flush before exit         |
| 🔄 **Pending requests**   | Interrupted operations          | Wait for completion       |
| 🧹 **Cleanup**            | Resources not released          | Use exit handlers         |

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
  process.exit(1);  // Immediate termination
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
    process.exit(1);  // eslint-disable-line quality/no-process-exit
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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


## Further Reading

- **[Node.js process.exit()](https://nodejs.org/api/process.html#processexitcode)** - Official docs
- **[Graceful Shutdown](https://blog.heroku.com/best-practices-nodejs-graceful-shutdown)** - Best practices

