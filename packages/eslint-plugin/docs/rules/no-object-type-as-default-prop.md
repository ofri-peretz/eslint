# no-object-type-as-default-prop

> **Keywords:** React, defaultProps, object, reference equality, re-renders, performance, ESLint rule, LLM-optimized

Prevent object types as default prop values. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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

// Class component version
class UserCard extends React.Component {
  static defaultProps = {
    style: { padding: 10 },          // Still problematic
    items: []
  };
}
```

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
    '@forge-js/no-object-type-as-default-prop': 'warn'
  }
}
```

## Related Rules

- [`react-render-optimization`](./react-render-optimization.md) - Render performance
- [`no-unnecessary-rerenders`](./no-unnecessary-rerenders.md) - Re-render prevention

## Further Reading

- **[Default Props](https://react.dev/learn/passing-props-to-a-component#specifying-default-values-for-props)** - React docs
- **[Reference Equality](https://react.dev/reference/react/memo#minimizing-props-changes)** - Memoization patterns

