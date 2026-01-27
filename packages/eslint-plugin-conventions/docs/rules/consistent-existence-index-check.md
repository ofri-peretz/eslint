---
title: consistent-existence-index-check
description: consistent-existence-index-check
category: quality
severity: low
tags: ['quality', 'conventions']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---


> **Keywords:** indexOf, includes, array, consistency, ESLint rule, auto-fix, LLM-optimized

Enforce consistent style for checking if an element exists in an array. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ✅ Yes (converts pattern)                                            |
| **Category**   | Quality |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Code consistency, modern JavaScript practices                        |

## Rule Details

Prefer `includes()` over `indexOf() !== -1` for existence checks.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | `!== -1` is less clear          | Use includes()            |
| 🎯 **Intent**             | indexOf suggests index needed   | Clear existence check     |
| 🔄 **Consistency**        | Mixed patterns in codebase      | Standardize               |

## Examples

### ❌ Incorrect

```typescript
if (array.indexOf(item) !== -1) { }
if (array.indexOf(item) >= 0) { }
if (array.indexOf(item) > -1) { }
if (string.indexOf(substring) !== -1) { }
```

### ✅ Correct

```typescript
if (array.includes(item)) { }
if (string.includes(substring)) { }

// indexOf is fine when you need the actual index
const index = array.indexOf(item);
if (index !== -1) {
  array.splice(index, 1);  // Using the index
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'architecture/consistent-existence-index-check': 'warn'
  }
}
```

## Related Rules

- [`prefer-at`](./prefer-at.md) - Modern array access

## Further Reading

- **[Array.includes() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)** - MDN reference
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

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.



