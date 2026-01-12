# jsx-no-bind

> **Keywords:** React, bind, arrow function, performance, ESLint rule, render, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent using `.bind()` or arrow functions in JSX props. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (performance)                                                |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Performance-critical React applications                              |

## Rule Details

Using `.bind()` or inline arrow functions in JSX creates new function instances on every render.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚡ **Performance**        | New function every render       | Extract handlers          |
| 🔄 **Re-renders**         | Child PureComponent re-renders  | Stable references         |
| 💾 **Memory**             | Creates garbage                 | useCallback               |

## Examples

### ❌ Incorrect

```tsx
// Bind in render
<button onClick={this.handleClick.bind(this)}>Click</button>

// Arrow function in render
<button onClick={() => this.handleClick()}>Click</button>

// Arrow with arguments
<button onClick={(e) => this.handleClick(id, e)}>Click</button>
```

### ✅ Correct

```tsx
// Class: bind in constructor
class MyComponent extends React.Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// Class: arrow function property
class MyComponent extends React.Component {
  handleClick = () => { /* ... */ };
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// Function: useCallback
function MyComponent({ id }) {
  const handleClick = useCallback(() => {
    doSomething(id);
  }, [id]);
  
  return <button onClick={handleClick}>Click</button>;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/jsx-no-bind': 'warn'
  }
}
```

## Related Rules

- [`react-no-inline-functions`](./react-no-inline-functions.md) - Similar rule

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

- **[useCallback](https://react.dev/reference/react/useCallback)** - React docs
- **[Performance Optimization](https://react.dev/reference/react/memo)** - React memo

