# no-object-type-as-default-prop

> **Keywords:** React, defaultProps, object, reference equality, re-renders, performance, ESLint rule, LLM-optimized
**CWE:** [CWE-276](https://cwe.mitre.org/data/definitions/276.html)

Prevent object types as default prop values. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

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
    'react-features/no-object-type-as-default-prop': 'warn'
  }
}
```

## Related Rules

- [`react-render-optimization`](./react-render-optimization.md) - Render performance
- [`no-unnecessary-rerenders`](./no-unnecessary-rerenders.md) - Re-render prevention

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


## Further Reading

- **[Default Props](https://react.dev/learn/passing-props-to-a-component#specifying-default-values-for-props)** - React docs
- **[Reference Equality](https://react.dev/reference/react/memo#minimizing-props-changes)** - Memoization patterns

