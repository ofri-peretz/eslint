# no-arrow-function-lifecycle

> **Keywords:** React, lifecycle, arrow function, class component, binding, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent arrow functions in React lifecycle methods. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires method conversion)                                   |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

Lifecycle methods should be defined as regular methods, not arrow functions. Arrow functions in lifecycle methods prevent proper inheritance and can cause issues with testing and debugging.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Inheritance issues**     | Can't override in subclass          | Use regular methods          |
| 🐛 **Testing difficulties**   | Harder to spy/mock                  | Standard method syntax       |
| 🔍 **Memory overhead**        | Arrow creates new instance          | Regular method shares proto  |

## Examples

### ❌ Incorrect

```tsx
class MyComponent extends React.Component {
  // Arrow function lifecycle - BAD
  componentDidMount = () => {
    this.fetchData();
  };
  
  componentDidUpdate = () => {
    this.updateUI();
  };
  
  componentWillUnmount = () => {
    this.cleanup();
  };
}
```

### ✅ Correct

```tsx
class MyComponent extends React.Component {
  // Regular method syntax - GOOD
  componentDidMount() {
    this.fetchData();
  }
  
  componentDidUpdate() {
    this.updateUI();
  }
  
  componentWillUnmount() {
    this.cleanup();
  }
  
  // Arrow functions ARE appropriate for event handlers
  handleClick = () => {
    this.setState({ clicked: true });
  };
}

// Better: Use functional components with hooks
function MyComponent() {
  useEffect(() => {
    fetchData();
    return () => cleanup();
  }, []);
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-arrow-function-lifecycle': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks
- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - Lifecycle best practices

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

- **[Component Lifecycle](https://react.dev/reference/react/Component#adding-lifecycle-methods-to-a-class-component)** - React docs
- **[Class vs Arrow Methods](https://react.dev/reference/react/Component#defining-a-class-component)** - Method definitions
