---
title: consistent-existence-index-check
description: Enforce one form for checking whether an object has a property
tags: ['quality', 'conventions']
category: quality
autofix: suggestions
---

> **Keywords:** Object.hasOwn, hasOwnProperty, in operator, prototype chain, property existence, ESLint rule, LLM-optimized

<!-- @rule-summary -->

Enforce one form for checking whether an object has a property
<!-- @/rule-summary -->

Enforce one form for checking whether an object has a property — `Object.hasOwn`, `in`, or one of the `hasOwnProperty` spellings. This rule is part of [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions).

> **The name is about property existence, not array indexing.** Despite `index` in
> the rule id, this rule never looks at `indexOf` or `includes`. It reads
> `key in obj`, `obj.hasOwnProperty(key)`,
> `Object.prototype.hasOwnProperty.call(obj, key)` and `Object.hasOwn(obj, key)`.

## Quick Summary

| Aspect         | Details                                                   |
| -------------- | --------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                    |
| **Auto-Fix**   | ⚠️ One conversion only — see below                        |
| **Category**   | Quality                                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                   |
| **Best For**   | Consistency, and keeping prototype lookups out by default |

## Rule Details

JavaScript has four ways to ask whether an object has a property, and they do not
all answer the same question. This rule picks one and reports the others.

| Form                                             | Answers for an inherited key | Looks the method up on `obj` |
| ------------------------------------------------ | ---------------------------- | ---------------------------- |
| `Object.hasOwn(obj, key)`                        | no                           | no                           |
| `Object.prototype.hasOwnProperty.call(obj, key)` | no                           | no                           |
| `obj.hasOwnProperty(key)`                        | no                           | **yes**                      |
| `key in obj`                                     | **yes**                      | no                           |

### Why This Matters

| Issue                  | Impact                                                    | Solution                    |
| ---------------------- | --------------------------------------------------------- | --------------------------- |
| 🛡️ **Prototype chain** | `in` is true for inherited keys — the pollution direction | Default to `Object.hasOwn`  |
| 💥 **Dispatch**        | `obj.hasOwnProperty` throws on a null-prototype object    | Never call it through `obj` |
| 🔄 **Consistency**     | Four spellings of one question                            | Standardize on one          |

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
    // Default: preferred is 'Object.hasOwn'
    'conventions/consistent-existence-index-check': 'warn',

    // Or state a different preference deliberately
    // 'conventions/consistent-existence-index-check': ['warn', { preferred: 'in' }],
  }
}
```

## Related Rules

- [`prefer-object-has-own`](https://eslint.org/docs/latest/rules/prefer-object-has-own) — eslint core, same direction

## Further Reading

- **[Object.hasOwn() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)** — why it was added
- **[in operator - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in)** — including the prototype-chain behaviour

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
