# no-did-mount-set-state

> **Keywords:** React, componentDidMount, setState, lifecycle, performance, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent calling `setState` in `componentDidMount`. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (performance)                                                |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

Calling `setState` immediately in `componentDidMount` causes an additional render cycle. Initial state should be set in the constructor or derived from props.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Double render**          | Performance degradation             | Set state in constructor     |
| 🐛 **Wasted cycles**          | Unnecessary DOM updates             | Use derived state            |
| 🔍 **Flicker**                | UI may flash between states         | Initialize state properly    |

## Examples

### ❌ Incorrect

```tsx
class UserProfile extends React.Component {
  state = { user: null };
  
  componentDidMount() {
    // BAD: Immediate setState causes extra render
    this.setState({ loading: true });
    
    // This is also problematic
    this.setState({
      windowWidth: window.innerWidth
    });
  }
}
```

### ✅ Correct

```tsx
class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    // Initialize state in constructor
    this.state = {
      loading: true,
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0
    };
  }
  
  componentDidMount() {
    // Only setState for async operations is acceptable
    fetchUser().then(user => {
      this.setState({ user, loading: false });
    });
  }
}

// Better: Use functional components with hooks
function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser().then(user => {
      setUser(user);
      setLoading(false);
    });
  }, []);
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-did-mount-set-state': 'warn'
  }
}
```

## Related Rules

- [`no-did-update-set-state`](./no-did-update-set-state.md) - Similar for componentDidUpdate
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

- **[componentDidMount](https://react.dev/reference/react/Component#componentdidmount)** - React docs
- **[State Initialization](https://react.dev/reference/react/Component#constructor)** - Constructor patterns

