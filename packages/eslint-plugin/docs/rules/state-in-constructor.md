# state-in-constructor

> **Keywords:** React, state, constructor, initialization, class component, ESLint rule, LLM-optimized

Enforce state initialization in the constructor. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (consistency)                                                |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components with consistent patterns                      |

## Rule Details

Enforces initializing state in the constructor rather than as a class property. This provides a consistent pattern and makes state initialization more explicit.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Inconsistent patterns**  | Different initialization styles     | Standardize to constructor   |
| 🐛 **Props dependency**       | State derived from props unclear    | Constructor shows dependency |
| 🔍 **Initialization order**   | Class property order varies         | Constructor is predictable   |

## Examples

### ❌ Incorrect

```tsx
class Counter extends React.Component {
  // BAD: State as class property
  state = {
    count: 0,
    name: ''
  };
  
  // No constructor
  
  handleClick = () => {
    this.setState({ count: this.state.count + 1 });
  };
  
  render() {
    return <button onClick={this.handleClick}>{this.state.count}</button>;
  }
}

// BAD: Mixed patterns
class UserProfile extends React.Component {
  state = { loading: true };  // Class property
  
  constructor(props) {
    super(props);
    // State not initialized here
    this.handleSubmit = this.handleSubmit.bind(this);
  }
}
```

### ✅ Correct

```tsx
class Counter extends React.Component {
  constructor(props) {
    super(props);
    // GOOD: State in constructor
    this.state = {
      count: props.initialCount || 0,
      name: ''
    };
    
    // Bind methods here too
    this.handleClick = this.handleClick.bind(this);
  }
  
  handleClick() {
    this.setState(prev => ({ count: prev.count + 1 }));
  }
  
  render() {
    return <button onClick={this.handleClick}>{this.state.count}</button>;
  }
}

// GOOD: State derived from props clearly visible
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      userId: props.userId,
      user: null
    };
  }
  
  componentDidMount() {
    this.fetchUser();
  }
}

// BETTER: Use functional components with hooks
function Counter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  );
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/state-in-constructor': 'warn'
  }
}
```

### Disabled (allow class properties)

```javascript
{
  rules: {
    '@forge-js/state-in-constructor': 'off'
  }
}
```

## Related Rules

- [`sort-comp`](./sort-comp.md) - Method ordering
- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - State initialization timing
- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration to hooks

## Further Reading

- **[Constructor](https://react.dev/reference/react/Component#constructor)** - React docs
- **[State Initialization](https://react.dev/learn/state-a-components-memory)** - State concepts

