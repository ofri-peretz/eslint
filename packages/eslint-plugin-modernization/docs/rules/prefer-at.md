---
title: prefer-at
description: Prefer using Array.at() for accessing elements, especially with negative indices
tags: ['architecture', 'modernization']
category: modernization
autofix: suggestions
---

> **Keywords:** Array.at(), negative index, last element, ESLint rule, ES2022, auto-fix, LLM-optimized


<!-- @rule-summary -->
Prefer using Array.at() for accessing elements, especially with negative indices
<!-- @/rule-summary -->

Prefer using `Array.at()` for accessing elements, especially with negative indices. This rule is part of [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (modern JavaScript)                                          |
| **Auto-Fix**   | ✅ Partial (`array.length - <literal>` only; the variable-offset and `array[-n]` forms report without a fix) |
| **Category**   | Modernization |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | ES2022+ codebases, cleaner array access                              |

## Rule Details

`Array.at()` provides a cleaner way to access array elements, especially the last element or elements from the end.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | `arr[arr.length - 1]` is verbose| Use `arr.at(-1)`          |
| 🐛 **Off-by-one errors**  | Easy to make mistakes           | Negative indices          |
| 🔄 **Consistency**        | Multiple patterns in codebase   | Standardize on .at()      |

## Examples

### ❌ Incorrect

```typescript
// Accessing last element
const last = array[array.length - 1];

// Second to last
const secondLast = array[array.length - 2];

// Dynamic negative access
const item = array[array.length - offset];
```

### ✅ Correct

```typescript
// Clean last element access
const last = array.at(-1);

// Second to last
const secondLast = array.at(-2);

// Dynamic negative access — equivalent only while `offset` is a positive
// integer, so this one is reported but never rewritten for you. At
// `offset === 0` the bracket form reads past the end (undefined) while
// `.at(-0)` reads the FIRST element, because -0 normalises to 0.
const item = array.at(-offset);

// Also works with strings
const lastChar = string.at(-1);
```

> **Not auto-fixed.** Two of the reported shapes are left for you to edit,
> because the rewrite is not equivalent in general:
>
> - `array[array.length - n]` with a variable `n` — see above.
> - `array[-1]` — on an array this is a plain property read that is always
>   `undefined`, whereas `array.at(-1)` is the last element. The rule also
>   cannot prove the object is an array: on a `Record<number, string>` holding
>   a `-1` key the bracket form reads a real value, and on that object (or on
>   `arguments`) `.at` does not exist at all.
>
> Both still report — `array[-1]` is almost always a mistake — but naming the
> mistake is as far as a semantics-preserving fixer can go.

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'modernization/prefer-at': 'warn'
  }
}
```

## Related Rules

- [`prefer-node-protocol`](./prefer-node-protocol.md) - Modern Node.js imports

## Further Reading

- **[Array.at() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)** - MDN reference
- **[ES2022 Features](https://tc39.es/ecma262/)** - ECMAScript specification
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