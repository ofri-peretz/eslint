---
title: consistent-existence-index-check
description: Enforce consistent style for checking if an element exists in an array
tags: ['quality', 'conventions']
category: quality
autofix: suggestions
---

> **Keywords:** indexOf, includes, array, consistency, ESLint rule, auto-fix, LLM-optimized

<!-- @rule-summary -->

Enforce consistent style for checking if an element exists in an array
<!-- @/rule-summary -->

Enforce consistent style for checking if an element exists in an array. This rule is part of [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions).

## Quick Summary

| Aspect         | Details                                       |
| -------------- | --------------------------------------------- |
| **Severity**   | Warning (code quality)                        |
| **Auto-Fix**   | ✅ Yes (converts pattern)                     |
| **Category**   | Quality                                       |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration       |
| **Best For**   | Code consistency, modern JavaScript practices |

## Rule Details

Prefer `includes()` over `indexOf() !== -1` for existence checks.

### Why This Matters

| Issue              | Impact                        | Solution              |
| ------------------ | ----------------------------- | --------------------- |
| 📖 **Readability** | `!== -1` is less clear        | Use includes()        |
| 🎯 **Intent**      | indexOf suggests index needed | Clear existence check |
| 🔄 **Consistency** | Mixed patterns in codebase    | Standardize           |

## Examples

The default preference is `Object.hasOwn`.

### ❌ Incorrect

```typescript
key in obj; // answers true for INHERITED keys
obj.hasOwnProperty(key); // looks the method up ON obj
Object.prototype.hasOwnProperty.call(obj, key); // the long way round
```

### ✅ Correct

```typescript
Object.hasOwn(obj, key);
```

### What is and is not autofixed

Only `Object.prototype.hasOwnProperty.call(obj, key)` → `Object.hasOwn(obj, key)`.
Those two ask the same question through the same dispatch, so the rewrite is safe.

Everything else is **reported without a fix**, because rewriting it would change
what the code does:

- `in` walks the prototype chain and the own-property checks do not, so the two
  disagree on an inherited key.
- `obj.hasOwnProperty(key)` looks the method up on `obj`: it throws on a
  null-prototype object and calls whatever a shadowing own property points at.

### Options

`preferred: 'Object.hasOwn' | 'in' | 'hasOwnProperty'` — default `'Object.hasOwn'`.

Set `'in'` when a prototype-chain lookup is what the code means. It is a choice
worth making deliberately; it is not a good default, which is why it is no longer
one.

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'conventions/consistent-existence-index-check': 'warn'
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
