# no-unreadable-iife

> **Keywords:** IIFE, immediately invoked, readability, ESLint rule, function expressions, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

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
    'architecture/no-unreadable-iife': 'warn'
  }
}
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Code complexity limits

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

- **[IIFE - MDN](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)** - IIFE pattern explanation

