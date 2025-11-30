# no-unreadable-iife

> **Keywords:** IIFE, immediately invoked, readability, ESLint rule, function expressions, LLM-optimized

Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Code readability, avoiding confusing patterns                        |

## Rule Details

Complex IIFEs with multiple nested functions or unclear structure reduce readability.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | Hard to understand intent       | Named functions           |
| 🐛 **Debugging**          | Confusing stack traces          | Clear structure           |
| 🔄 **Maintainability**    | Difficult to modify             | Extract functions         |

## Examples

### ❌ Incorrect

```typescript
// Unreadable nested IIFE
const result = (function() {
  return (function() {
    return (function() {
      return value;
    })();
  })();
})();

// Complex arrow IIFE
const data = (() => (() => (() => fetch())())())();
```

### ✅ Correct

```typescript
// Named function for clarity
function processValue() {
  return value;
}
const result = processValue();

// Or simple IIFE when needed
const config = (() => {
  const defaults = { a: 1 };
  return Object.freeze(defaults);
})();

// Async IIFE (common pattern)
(async () => {
  await initialize();
})();
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-unreadable-iife': 'warn'
  }
}
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Code complexity limits

## Further Reading

- **[IIFE - MDN](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)** - IIFE pattern explanation

