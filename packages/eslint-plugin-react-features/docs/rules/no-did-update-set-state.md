# no-did-update-set-state

> **Keywords:** React, componentDidUpdate, setState, infinite loop, lifecycle, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent calling `setState` in `componentDidUpdate` without a conditional. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

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
    'react-features/no-did-update-set-state': ['error', {
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
    'react-features/no-did-update-set-state': 'error'
  }
}
```

## Related Rules

- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - Similar for componentDidMount
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

- **[componentDidUpdate](https://react.dev/reference/react/Component#componentdidupdate)** - React docs
- **[Infinite Loop Prevention](https://react.dev/learn/you-might-not-need-an-effect)** - Effect patterns

