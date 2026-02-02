---
title: no-lonely-if
description: Disallow if statements as the only statement in else blocks
tags: ['quality', 'maintainability']
category: quality
autofix: suggestions
---

> **Keywords:** if, else, refactoring, readability, ESLint rule, code quality, LLM-optimized


<!-- @rule-summary -->
Disallow if statements as the only statement in else blocks
<!-- @/rule-summary -->

Disallow `if` statements as the only statement in `else` blocks. This rule is part of [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability).

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Warning (code quality)                  |
| **Auto-Fix**   | ✅ Yes (converts to else if)            |
| **Category**   | Quality |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | Code readability, reducing nesting      |

## Rule Details

A "lonely if" occurs when an `if` statement is the only statement inside an `else` block. This can be simplified to `else if`.

### Why This Matters

| Issue              | Impact                     | Solution          |
| ------------------ | -------------------------- | ----------------- |
| 📖 **Readability** | Unnecessary nesting        | Use else if       |
| 🔍 **Code Review** | Extra indentation to parse | Flatten structure |
| 📏 **Line Length** | Wasted horizontal space    | Simplify          |

## Examples

### ❌ Incorrect

```typescript
if (condition1) {
  doSomething();
} else {
  if (condition2) {
    // Lonely if
    doSomethingElse();
  }
}

// Deeply nested
if (a) {
  // ...
} else {
  if (b) {
    // ...
  } else {
    if (c) {
      // Multiple lonely ifs
      // ...
    }
  }
}
```

### ✅ Correct

```typescript
if (condition1) {
  doSomething();
} else if (condition2) {
  doSomethingElse();
}

// Cleaner chain
if (a) {
  // ...
} else if (b) {
  // ...
} else if (c) {
  // ...
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'maintainability/no-lonely-if': 'warn'
  }
}
```

## Related Rules

- [`no-nested-ternary`](./no-nested-ternary.md) - Prevents nested ternaries
- [`cognitive-complexity`](./cognitive-complexity.md) - Complexity limits

## Further Reading

- **[ESLint no-lonely-if](https://eslint.org/docs/latest/rules/no-lonely-if)** - Built-in ESLint rule

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