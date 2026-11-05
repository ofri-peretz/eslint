---
title: no-object-type-as-default-prop
description: no-object-type-as-default-prop rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-object-type-as-default-prop rule
<!-- @/rule-summary -->

# no-object-type-as-default-prop

> **Keywords:** React, defaultProps, object, reference equality, re-renders, performance, ESLint rule, LLM-optimized

Prevent object types as default prop values. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (performance)                                                |
| **Auto-Fix**   | ❌ No (requires extraction)                                          |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React components with object defaults                                |

## Rule Details

Using object literals as default prop values creates new object references on every render, breaking memoization and causing unnecessary re-renders.

### Why This Matters

| Issue                         | Impact                              | Solution                         |
| ----------------------------- | ----------------------------------- | -------------------------------- |
| 🔄 **New reference each render** | Breaks React.memo/PureComponent  | Extract to constant              |
| 🐛 **Performance**            | Unnecessary child re-renders        | Use factory function             |
| 🔍 **Memoization failure**    | useMemo/useCallback ineffective     | Stable reference outside         |

## Examples

### ❌ Incorrect

```tsx
// BAD: Object literal creates new reference every render
function UserCard({ 
  user,
  style = { padding: 10 },           // New object every render!
  options = { animate: true },        // New object every render!
  items = []                          // New array every render!
}) {
  return <Card style={style} options={options} items={items} />;
}
```

The rule reports an object, array or function literal used as the default of a destructured prop of a function component (a PascalCase function that returns JSX, or a function passed to React's `memo` / `forwardRef`). A class's `static defaultProps` is evaluated once, when the class is defined, so it is not reported; neither is a default in a function that is not a component.

### ✅ Correct

```tsx
// GOOD: Constants defined outside component
const DEFAULT_STYLE = { padding: 10 };
const DEFAULT_OPTIONS = { animate: true };
const EMPTY_ARRAY = [];

function UserCard({ 
  user,
  style = DEFAULT_STYLE,
  options = DEFAULT_OPTIONS,
  items = EMPTY_ARRAY
}) {
  return <Card style={style} options={options} items={items} />;
}

// Or use a factory pattern for truly dynamic defaults
function UserCard({ user, style, options }) {
  const mergedStyle = useMemo(
    () => ({ ...DEFAULT_STYLE, ...style }),
    [style]
  );
  
  return <Card style={mergedStyle} options={options} />;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-object-type-as-default-prop': 'warn'
  }
}
```

## Related Rules

- [`react-render-optimization`](./react-render-optimization.md) - Render performance
- [`no-unnecessary-rerenders`](./no-unnecessary-rerenders.md) - Re-render prevention

## Further Reading

- **[Default Props](https://react.dev/learn/passing-props-to-a-component#specifying-default-values-for-props)** - React docs
- **[Reference Equality](https://react.dev/reference/react/memo#minimizing-props-changes)** - Memoization patterns

## Known False Negatives

- **Other fresh values**: `new Map()`, a regular expression literal or a class expression as a default also create a new value per render and are not reported.
- **Components the rule does not recognise**: a function wrapped by a higher-order function other than React's `memo` / `forwardRef`, or one that returns JSX only through a helper call.

Not reported by design: a class's `static defaultProps` (evaluated once, when the class is defined) and defaults in functions that are not components.
