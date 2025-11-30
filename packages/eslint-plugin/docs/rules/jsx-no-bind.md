# jsx-no-bind

> **Keywords:** React, bind, arrow function, performance, ESLint rule, render, LLM-optimized

Prevent using `.bind()` or arrow functions in JSX props. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/jsx-no-bind': 'warn'
  }
}
```

## Related Rules

- [`react-no-inline-functions`](./react-no-inline-functions.md) - Similar rule

## Further Reading

- **[useCallback](https://react.dev/reference/react/useCallback)** - React docs
- **[Performance Optimization](https://react.dev/reference/react/memo)** - React memo

