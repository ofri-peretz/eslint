# no-process-exit

> **Keywords:** process.exit, Node.js, graceful shutdown, ESLint rule, server, LLM-optimized

Prevents direct `process.exit()` calls to encourage graceful shutdown patterns. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    process.exit(1);  // eslint-disable-line @forge-js/no-process-exit
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
    '@forge-js/no-process-exit': 'warn'
  }
}
```

## When To Disable

```typescript
// CLI tools may legitimately use process.exit
// eslint-disable-next-line @forge-js/no-process-exit
process.exit(exitCode);
```

## Related Rules

- [`no-console-log`](./no-console-log.md) - Console logging control

## Further Reading

- **[Node.js process.exit()](https://nodejs.org/api/process.html#processexitcode)** - Official docs
- **[Graceful Shutdown](https://blog.heroku.com/best-practices-nodejs-graceful-shutdown)** - Best practices

