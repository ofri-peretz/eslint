# no-set-state

> **Keywords:** React, setState, hooks, functional components, migration, useState, ESLint rule, LLM-optimized

Disallow usage of `setState` to encourage functional components with hooks. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-set-state': 'warn'
  }
}
```

### Strict (for new projects)

```javascript
{
  rules: {
    '@forge-js/no-set-state': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration guidance
- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - Lifecycle patterns

## Further Reading

- **[useState Hook](https://react.dev/reference/react/useState)** - React docs
- **[useReducer Hook](https://react.dev/reference/react/useReducer)** - Complex state
- **[Migrating to Hooks](https://react.dev/reference/react/Component)** - Migration guide

