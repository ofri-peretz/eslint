# require-optimization

> **Keywords:** React, performance, memo, useMemo, useCallback, optimization, re-renders, ESLint rule, LLM-optimized
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

Suggest performance optimizations for React components based on usage patterns. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Suggestion (performance)                                             |
| **Auto-Fix**   | ❌ No (requires manual optimization)                                 |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React applications needing performance tuning                        |

## Rule Details

Analyzes React components and suggests appropriate optimizations based on their structure, props count, and usage patterns.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Unnecessary re-renders** | Poor performance                    | Use React.memo              |
| 🐛 **Expensive computations** | Slow renders                        | Use useMemo                 |
| 🔍 **Function recreation**    | Child component re-renders          | Use useCallback             |

## Optimization Messages

| Message ID              | When Suggested                              | Optimization              |
| ----------------------- | ------------------------------------------- | ------------------------- |
| `considerMemo`          | Component has many props                    | Wrap with React.memo()    |
| `considerUseMemo`       | Contains array operations                   | Wrap computation with useMemo() |
| `considerUseCallback`   | Inline event handlers                       | Wrap with useCallback()   |
| `considerLazy`          | Large component (50+ lines)                 | Use React.lazy()          |
| `considerPureComponent` | Class component with many props             | Extend PureComponent      |

## Examples

### ❌ Unoptimized

```tsx
// Component with many props - may benefit from memo
function UserCard({ name, email, avatar, role, status, onClick, onEdit }) {
  // Expensive computation on every render
  const permissions = roles.map(r => getPermissions(r)).flat();
  
  // Inline function recreated every render
  return (
    <Card onClick={() => onClick(name)}>
      <Avatar src={avatar} />
      <div>{name}</div>
      <div>{email}</div>
    </Card>
  );
}

// Class component that could be PureComponent
class DataTable extends React.Component {
  render() {
    const { data, columns, sortBy, filterBy, onSort, onFilter } = this.props;
    return <Table data={data} columns={columns} />;
  }
}
```

### ✅ Optimized

```tsx
// GOOD: Memoized component with many props
const UserCard = React.memo(function UserCard({ 
  name, email, avatar, role, status, onClick, onEdit 
}) {
  // GOOD: Expensive computation memoized
  const permissions = useMemo(
    () => roles.map(r => getPermissions(r)).flat(),
    [roles]
  );
  
  // GOOD: Callback memoized
  const handleClick = useCallback(() => {
    onClick(name);
  }, [onClick, name]);
  
  return (
    <Card onClick={handleClick}>
      <Avatar src={avatar} />
      <div>{name}</div>
      <div>{email}</div>
    </Card>
  );
});

// GOOD: Using PureComponent for shallow comparison
class DataTable extends React.PureComponent {
  render() {
    const { data, columns, sortBy, filterBy, onSort, onFilter } = this.props;
    return <Table data={data} columns={columns} />;
  }
}

// GOOD: Large component with code splitting
const Dashboard = React.lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

## Options

| Option             | Type    | Default | Description                                    |
| ------------------ | ------- | ------- | ---------------------------------------------- |
| `suggestMemo`      | boolean | `true`  | Suggest React.memo for components              |
| `suggestUseMemo`   | boolean | `true`  | Suggest useMemo for expensive computations     |
| `suggestUseCallback` | boolean | `true` | Suggest useCallback for event handlers        |
| `minPropsForMemo`  | number  | `3`     | Minimum props count to suggest memo            |

### Configuration with Options

```javascript
{
  rules: {
    'react-features/require-optimization': ['warn', {
      suggestMemo: true,
      suggestUseMemo: true,
      suggestUseCallback: true,
      minPropsForMemo: 5  // More conservative threshold
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/require-optimization': 'warn'
  }
}
```

### Conservative (fewer suggestions)

```javascript
{
  rules: {
    'react-features/require-optimization': ['warn', {
      minPropsForMemo: 6,
      suggestUseCallback: false  // Only for critical paths
    }]
  }
}
```

## Related Rules

- [`react-render-optimization`](./react-render-optimization.md) - Render patterns
- [`no-unnecessary-rerenders`](./no-unnecessary-rerenders.md) - Re-render prevention
- [`react-no-inline-functions`](./react-no-inline-functions.md) - Inline function detection

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

- **[React.memo](https://react.dev/reference/react/memo)** - Component memoization
- **[useMemo](https://react.dev/reference/react/useMemo)** - Value memoization
- **[useCallback](https://react.dev/reference/react/useCallback)** - Function memoization
- **[React.lazy](https://react.dev/reference/react/lazy)** - Code splitting

