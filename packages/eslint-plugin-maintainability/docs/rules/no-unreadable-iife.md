---
title: no-unreadable-iife
description: Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns
tags: ['quality', 'maintainability']
category: quality
autofix: suggestions
---

> **Keywords:** IIFE, immediately invoked, readability, ESLint rule, function expressions, LLM-optimized


<!-- @rule-summary -->
Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns
<!-- @/rule-summary -->

Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns. This rule is part of [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | Quality |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Code readability, avoiding confusing patterns                        |

## Rule Details

An immediately invoked function expression (IIFE) is a function or arrow
expression called on the spot: `(() => { ... })()`, `(function () { ... })()`,
`async` too, and through `.call(...)` / `.apply(...)`. A long one hides logic a
named function would document. The rule reports an IIFE whose block body:

- holds more than `maxStatements` statements, or
- nests control flow (`if`, loops, `switch`, `try`) more than `maxDepth`
  levels deep.

A short IIFE is not reported for holding a single `if` or `try`, declaring a
helper, or taking several parameters: none of those exceeds a limit. The
`(async () => { try { await main(); } catch (e) { ... } })()` entry point is the
standard pattern.

## Configuration

| Option               | Type      | Default | Description                                                                 |
| -------------------- | --------- | ------- | --------------------------------------------------------------------------- |
| `maxStatements`      | `number`  | `3`     | Most statements the IIFE body may hold                                      |
| `maxDepth`           | `number`  | `2`     | Deepest control-flow nesting allowed inside the IIFE                        |
| `allowReturningIIFE` | `boolean` | `true`  | An IIFE that returns a value is a scoped initializer: its statement count is not checked (its nesting still is) |

## Examples

### ❌ Incorrect

```typescript
(() => {
  const a = read();
  const b = read();
  use(a);
  use(b);
})();

(function () {
  if (ready()) {
    for (const x of list()) {
      if (x) use(x); // depth 3
    }
  }
}).call(this);
```

### ✅ Correct

```typescript
// Named function for clarity
function processValue() {
  return value;
}
const result = processValue();

// A scoped initializer (allowReturningIIFE)
const config = (() => {
  const env = process.env.NODE_ENV;
  const debug = env === 'development';
  const level = debug ? 'debug' : 'info';
  return { env, debug, level };
})();

// The async entry point
(async () => {
  try {
    await main();
  } catch (error) {
    fail(error);
  }
})();
```

## Configuration Examples

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'maintainability/no-unreadable-iife': ['warn', { maxStatements: 5 }],
    },
  },
];
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Code complexity limits

## Further Reading

- **[IIFE - MDN](https://developer.mozilla.org/en-US/docs/Glossary/IIFE)** - IIFE pattern explanation

## Known False Negatives

### Expression-bodied IIFEs

**Why**: an arrow with an expression body is one expression, however long.

```typescript
// ❌ NOT DETECTED
const v = ((a) => a && a.b && a.b.c && a.b.c.d)(input);
```
