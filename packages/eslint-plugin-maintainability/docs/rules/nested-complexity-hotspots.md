---
title: nested-complexity-hotspots
description: "Report control structures nested deeper than a readable limit."
tags: ['quality', 'maintainability']
category: quality
autofix: suggestions
---

> **Keywords:** nesting depth, max depth, nested if, nested loops, arrow code, ESLint rule, JavaScript, TypeScript

<!-- @rule-summary -->
Report a control structure nested more than `maxDepth` levels deep. Deep nesting forces a reader to hold every enclosing condition in mind at once.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability).

## Quick Summary

| Aspect          | Details                                                  |
| --------------- | -------------------------------------------------------- |
| **Severity**    | Error (code quality)                                     |
| **Auto-Fix**    | ❌ No                                                    |
| **Category**    | Quality                                                  |
| **Suggestions** | 💡 Early return, guard clauses, extract method           |

## Rule Details

A structure's depth is itself plus every control structure enclosing it: `if`,
`switch`, the loops (`for`, `for...of`, `for...in`, `while`, `do...while`) and
`try`. The rule reports a conditional (`if`, `switch`) or a loop whose depth
exceeds `maxDepth` (default 4).

An `else if` is a link of a flat chain, not a nested level: a long
`if / else if / else` chain sits at depth one.

## Configuration

| Option              | Type      | Default | Description                                         |
| ------------------- | --------- | ------- | --------------------------------------------------- |
| `maxDepth`          | `number`  | `4`     | Deepest nesting allowed                             |
| `countConditionals` | `boolean` | `true`  | Report `if` and `switch` structures                 |
| `countLoops`        | `boolean` | `true`  | Report `for`, `for...of`, `for...in`, `while` and `do...while` loops |

A kind turned off is not reported; it still adds a level to the structures
nested inside it.

## Examples

### ❌ Incorrect

```typescript
function process(orders: Order[]) {
  for (const order of orders) {
    if (order.active) {
      for (const item of order.items) {
        if (item.stock > 0) {
          if (item.price > 100) {
            // depth 5
            discount(item);
          }
        }
      }
    }
  }
}
```

### ✅ Correct

```typescript
function process(orders: Order[]) {
  for (const order of orders) {
    if (!order.active) continue;
    order.items.filter(isDiscountable).forEach(discount);
  }
}

// A flat chain is depth one
if (a) {
  first();
} else if (b) {
  second();
} else if (c) {
  third();
}
```

## Configuration Examples

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'maintainability/nested-complexity-hotspots': ['error', { maxDepth: 3 }],
    },
  },
];
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Scores nesting along with branching
- [`no-lonely-if`](./no-lonely-if.md) - Flattens `else { if }` into `else if`

## Further Reading

- **[ESLint max-depth](https://eslint.org/docs/latest/rules/max-depth)** - The core rule this one follows
- **[Replace Nested Conditional with Guard Clauses](https://refactoring.guru/replace-nested-conditional-with-guard-clauses)** - The refactoring it suggests

## Known False Negatives

### A `try` block as the deepest structure

**Why**: `try` adds a level to what it encloses but is neither a conditional nor
a loop, so it is not reported itself.
