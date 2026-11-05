---
title: consistent-function-scoping
description: Move functions to the highest possible scope
tags: ['quality', 'maintainability']
category: quality
autofix: suggestions
---

> **Keywords:** function scope, hoisting, nested functions, ESLint rule, performance, LLM-optimized


<!-- @rule-summary -->
Move functions to the highest possible scope
<!-- @/rule-summary -->

Move functions to the highest possible scope. This rule is part of [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (requires manual move)                                         |
| **Category**   | Quality |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Performance optimization, code organization                          |

## Rule Details

A helper declared inside a function - a function declaration, or a function or
arrow expression bound to a variable - that references no binding of its
enclosing function is recreated on every call and can move to module scope.

What counts is the binding, resolved by scope, not the name:

- a variable the helper declares itself under an outer name shadows the outer
  one and is not a use;
- a module-level binding is reachable after the move, so using only module
  bindings still lets the helper move;
- a use counts wherever it is: in a nested callback, a default parameter value,
  a type annotation naming a type the enclosing function declares, or a call of
  a sibling helper.

It does not report a function at module level, a function passed as an
argument (an inline callback), an object or class member, or an arrow that uses
`this` (an arrow's `this` is the enclosing one). A `function` helper's `this`
is its own, so using it does not tie the helper to the enclosing scope.

## Configuration

| Option                | Type      | Default | Description                                                          |
| --------------------- | --------- | ------- | -------------------------------------------------------------------- |
| `checkArrowFunctions` | `boolean` | `true`  | Check arrow helpers; `false` checks only function declarations and expressions |

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚡ **Performance**        | Recreated on each call          | Move to outer scope       |
| 📖 **Readability**        | Deep nesting                    | Flatten structure         |
| 🧪 **Testability**        | Hard to test nested functions   | Extract for testing       |

## Examples

### ❌ Incorrect

```typescript
function outer() {
  // This function doesn't use any variables from outer
  function helper(x: number) {
    return x * 2;
  }
  
  return [1, 2, 3].map(helper);
}
```

### ✅ Correct

```typescript
// Moved to module scope
function helper(x: number) {
  return x * 2;
}

function outer() {
  return [1, 2, 3].map(helper);
}

// Or when closure is needed (correct nesting)
function createMultiplier(factor: number) {
  return function multiply(x: number) {  // Uses factor from parent
    return x * factor;
  };
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'maintainability/consistent-function-scoping': 'warn'
  }
}
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Code complexity

## Further Reading

- **[Closures - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)** - JavaScript closures
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