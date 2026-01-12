# no-set-state

> **Keywords:** React, setState, hooks, functional components, migration, useState, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Disallow usage of `setState` to encourage functional components with hooks. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (modernization)                                              |
| **Auto-Fix**   | ❌ No (requires component refactor)                                  |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Projects migrating to hooks                                          |

## Rule Details

This rule flags all usages of `setState` to encourage migration to functional components with the `useState` hook. Hooks provide a cleaner API for state management.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Verbose syntax**         | More boilerplate code               | Use useState hook            |
| 🐛 **Complex this binding**   | Common source of bugs               | Hooks avoid `this`           |
| 🔍 **Logic reuse**            | Hard to share stateful logic        | Custom hooks enable reuse    |

## Examples

### ❌ Incorrect

```tsx
class Counter extends React.Component {
  state = { count: 0 };
  
  increment = () => {
    // BAD: Using setState in class component
    this.setState({ count: this.state.count + 1 });
    
    // Also flagged
    this.setState(prevState => ({
      count: prevState.count + 1
    }));
  };
  
  render() {
    return (
      <button onClick={this.increment}>
        Count: {this.state.count}
      </button>
    );
  }
}
```

### ✅ Correct

```tsx
// GOOD: Functional component with useState
function Counter() {
  const [count, setCount] = useState(0);
  
  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  
  return (
    <button onClick={increment}>
      Count: {count}
    </button>
  );
}

// GOOD: Complex state with useReducer
function TodoList() {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  
  const addTodo = useCallback((text) => {
    dispatch({ type: 'ADD_TODO', payload: text });
  }, []);
  
  return <TodoItems items={state.todos} onAdd={addTodo} />;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-set-state': 'warn'
  }
}
```

### Strict (for new projects)

```javascript
{
  rules: {
    'react-features/no-set-state': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration guidance
- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - Lifecycle patterns

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

- **[useState Hook](https://react.dev/reference/react/useState)** - React docs
- **[useReducer Hook](https://react.dev/reference/react/useReducer)** - Complex state
- **[Migrating to Hooks](https://react.dev/reference/react/Component)** - Migration guide

