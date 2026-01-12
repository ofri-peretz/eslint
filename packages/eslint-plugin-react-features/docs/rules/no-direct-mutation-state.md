# no-direct-mutation-state

> **Keywords:** React, state, mutation, setState, ESLint rule, hooks, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent direct mutation of `this.state` in React class components. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

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
    'react-features/no-direct-mutation-state': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

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

- **[State and Lifecycle](https://react.dev/learn/state-a-components-memory)** - React docs
- **[Using setState Correctly](https://react.dev/reference/react/Component#setstate)** - setState reference

