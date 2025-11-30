# prefer-es6-class

> **Keywords:** React, ES6 class, createClass, migration, ESLint rule, modern syntax, LLM-optimized

Prefer ES6 class syntax over `React.createClass`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/prefer-es6-class': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Modern migration

## Further Reading

- **[Migrating from createClass](https://react.dev/reference/react/Component)** - React docs

