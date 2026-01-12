# prefer-es6-class

> **Keywords:** React, ES6 class, createClass, migration, ESLint rule, modern syntax, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prefer ES6 class syntax over `React.createClass`. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (deprecated)                                                   |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Migrating legacy React code                                          |

## Rule Details

`React.createClass` is deprecated. Use ES6 class or function components.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Deprecated**         | Removed from React              | ES6 class or hooks        |
| 📦 **Bundle size**        | Requires separate package       | Native syntax             |
| 🔧 **Modern tooling**     | Poor TypeScript support         | Standard patterns         |

## Examples

### ❌ Incorrect

```javascript
const MyComponent = React.createClass({
  getInitialState() {
    return { count: 0 };
  },
  render() {
    return <div>{this.state.count}</div>;
  }
});
```

### ✅ Correct

```tsx
// ES6 Class
class MyComponent extends React.Component {
  state = { count: 0 };
  
  render() {
    return <div>{this.state.count}</div>;
  }
}

// Or function with hooks (recommended)
function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/prefer-es6-class': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Modern migration

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

- **[Migrating from createClass](https://react.dev/reference/react/Component)** - React docs

