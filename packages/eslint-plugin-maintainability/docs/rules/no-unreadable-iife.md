---
title: no-unreadable-iife
description: no-unreadable-iife
category: quality
severity: low
tags: ['quality', 'maintainability']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---


> **Keywords:** IIFE, immediately invoked, readability, ESLint rule, function expressions, LLM-optimized

Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | Quality |
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

## Further Reading

- **[IIFE - MDN](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)** - IIFE pattern explanation
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



