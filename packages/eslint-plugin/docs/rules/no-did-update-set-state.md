# no-did-update-set-state

> **Keywords:** React, componentDidUpdate, setState, infinite loop, lifecycle, ESLint rule, LLM-optimized

Prevent calling `setState` in `componentDidUpdate` without a conditional. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires conditional logic)                                   |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

Calling `setState` unconditionally in `componentDidUpdate` creates an infinite render loop. Always wrap `setState` calls in a condition that compares previous and current props/state.

### Why This Matters

| Issue                         | Impact                              | Solution                        |
| ----------------------------- | ----------------------------------- | ------------------------------- |
| 🔄 **Infinite loop**          | Application crash                   | Add conditional check           |
| 🐛 **Performance**            | Excessive re-renders                | Compare prev/current values     |
| 🔍 **Memory leak**            | Growing call stack                  | Proper update conditions        |

## Examples

### ❌ Incorrect

```tsx
class UserProfile extends React.Component {
  componentDidUpdate() {
    // BAD: Unconditional setState causes infinite loop!
    this.setState({ updated: true });
  }
  
  componentDidUpdate(prevProps) {
    // BAD: No condition check
    this.setState({ user: this.props.userId });
  }
}
```

### ✅ Correct

```tsx
class UserProfile extends React.Component {
  componentDidUpdate(prevProps, prevState) {
    // GOOD: Conditional check prevents infinite loop
    if (prevProps.userId !== this.props.userId) {
      this.setState({ user: null, loading: true });
      this.fetchUser(this.props.userId);
    }
    
    // GOOD: Check state changes too
    if (prevState.count !== this.state.count) {
      this.updateAnalytics(this.state.count);
    }
  }
}

// Better: Use functional components with hooks
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // Dependency array handles the condition
}
```

## Options

| Option            | Type    | Default | Description                           |
| ----------------- | ------- | ------- | ------------------------------------- |
| `allowInCallback` | boolean | `false` | Allow setState inside async callbacks |

### Configuration with Options

```javascript
{
  rules: {
    '@forge-js/no-did-update-set-state': ['error', {
      allowInCallback: true
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-did-update-set-state': 'error'
  }
}
```

## Related Rules

- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - Similar for componentDidMount
- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[componentDidUpdate](https://react.dev/reference/react/Component#componentdidupdate)** - React docs
- **[Infinite Loop Prevention](https://react.dev/learn/you-might-not-need-an-effect)** - Effect patterns

