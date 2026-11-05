---
title: react-render-optimization
description: Report inline object, array and function props passed to a component that compares props by identity, and props computed by expensive expressions.
tags: ['quality', 'react']
category: quality
autofix: suggestions
---

<!-- @rule-summary -->
Report inline object, array and function props passed to a component that compares props by identity, and props computed by expensive expressions.
<!-- @/rule-summary -->

# react-render-optimization

> **Keywords:** React.memo, PureComponent, useMemo, useCallback, re-render, performance, ESLint rule

## Quick Summary

| Aspect          | Details                                     |
| --------------- | ------------------------------------------- |
| **Severity**    | Suggestion (performance)                    |
| **Auto-Fix**    | No (suggestions: `useMemo` / `useCallback`) |
| **Category**    | Performance                                 |
| **Best For**    | Components that use `memo` or `PureComponent` |

## Rule Details

### Inline props

An object literal, an array literal (`detectInlineProps`) or an inline
function (`detectInlineFunctions`) written as a prop has a new identity every
render. That costs a re-render only when the receiver skips re-rendering on
equal props: a component the file wraps in React's `memo` (any spelling,
including `memo(forwardRef(...))`) or a class extending React's
`PureComponent`. The rule reports those.

It does not report a host element (`<div style={{…}}>`): React sets the new
value on the DOM node and there is no render to save. Nor a component the file
defines without `memo` (a function, an arrow, `forwardRef(...)`, a `Component`
class): it re-renders with its parent whatever its props are.

A conditional whose two branches are both fresh values of the same kind is a
fresh value; TypeScript's `as`, `satisfies` and `!` are seen through.

### Expensive computations

With `detectExpensiveComputations`, a prop expression is reported as expensive
when its estimated complexity reaches `minComputationComplexity`: a loop counts
3, a call or a conditional 1, measured on the expression and up to five
enclosing nodes. This is an estimate, not a measurement.

## Options

| Option                        | Type      | Default | Description                                         |
| ----------------------------- | --------- | ------- | --------------------------------------------------- |
| `detectInlineProps`           | `boolean` | `true`  | Report inline object / array props.                 |
| `detectInlineFunctions`       | `boolean` | `true`  | Report inline function props.                       |
| `detectExpensiveComputations` | `boolean` | `true`  | Report props whose estimated complexity is high.    |
| `minComputationComplexity`    | `number`  | `3`     | Complexity at which a prop expression is reported.  |
| `ignoreInTests`               | `boolean` | `true`  | Skip `*.test.*` / `*.spec.*` files.                 |

## Examples

### ❌ Incorrect

```tsx
const Chart = memo(function Chart({ options }: Props) {
  /* … */
});

function Dashboard() {
  // A new object every render: Chart's memo never holds.
  return <Chart options={{ stacked: true }} />;
}
```

### ✅ Correct

```tsx
const CHART_OPTIONS = { stacked: true };

function Dashboard() {
  return <Chart options={CHART_OPTIONS} />;
}

// A host element has no render to save.
<div style={{ display: 'flex' }} />;
```

## Known False Positives

- **A component the file cannot see** (an import, `<Ctx.Provider>`) is still
  checked for inline props: whether it compares props by identity is unknown.
- **Expensive computations** are an estimate from node counts, not a
  measurement.

## Related Rules

- [`no-unnecessary-rerenders`](./no-unnecessary-rerenders.md)
- [`react-no-inline-functions`](./react-no-inline-functions.md)

## Further Reading

- **[memo](https://react.dev/reference/react/memo)** - when props are compared
- **[useMemo](https://react.dev/reference/react/useMemo)**
