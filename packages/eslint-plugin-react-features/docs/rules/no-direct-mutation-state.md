---
title: no-direct-mutation-state
description: no-direct-mutation-state rule
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---# no-direct-mutation-state

> **Keywords:** React, state, mutation, setState, ESLint rule, hooks, LLM-optimized

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

## Further Reading

- **[State and Lifecycle](https://react.dev/learn/state-a-components-memory)** - React docs
- **[Using setState Correctly](https://react.dev/reference/react/Component#setstate)** - setState reference
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Prop from variable
const propValue = computedValue;
<Component prop={propValue} /> // Computation not analyzed
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.



