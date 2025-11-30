# no-direct-mutation-state

> **Keywords:** React, state, mutation, setState, ESLint rule, hooks, LLM-optimized

Prevent direct mutation of `this.state` in React class components. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires setState)                                            |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

Directly mutating `this.state` bypasses React's update mechanism, causing bugs and missing renders.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🔄 **No re-render**       | UI doesn't update               | Use setState()            |
| 🐛 **State inconsistency**| Batched updates break           | Immutable updates         |
| 🔍 **Debug difficulty**   | State changes not tracked       | Proper state flow         |

## Examples

### ❌ Incorrect

```tsx
class Counter extends React.Component {
  handleClick = () => {
    this.state.count = this.state.count + 1;  // Direct mutation!
    this.state.items.push(newItem);  // Mutating array
  }
}
```

### ✅ Correct

```tsx
class Counter extends React.Component {
  handleClick = () => {
    this.setState({ count: this.state.count + 1 });
    this.setState(prev => ({
      items: [...prev.items, newItem]  // Immutable update
    }));
  }
}

// Or use hooks (recommended)
function Counter() {
  const [count, setCount] = useState(0);
  const handleClick = () => setCount(c => c + 1);
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-direct-mutation-state': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[State and Lifecycle](https://react.dev/learn/state-a-components-memory)** - React docs
- **[Using setState Correctly](https://react.dev/reference/react/Component#setstate)** - setState reference

