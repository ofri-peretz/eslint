# no-is-mounted

> **Keywords:** React, isMounted, deprecated, memory leaks, ESLint rule, anti-pattern, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent using `isMounted()` in React class components. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (deprecated)                                                   |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | All React class components                                           |

## Rule Details

`isMounted()` is deprecated and indicates an anti-pattern. Cancel async operations properly instead.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Deprecated**         | Removed from React              | Cancel in unmount         |
| 🐛 **Anti-pattern**       | Hides real issues               | Proper cleanup            |
| 💾 **Memory leaks**       | Operations not cancelled        | AbortController           |

## Examples

### ❌ Incorrect

```tsx
class MyComponent extends React.Component {
  async fetchData() {
    const data = await api.fetch();
    if (this.isMounted()) {  // Deprecated!
      this.setState({ data });
    }
  }
}
```

### ✅ Correct

```tsx
// Class component with proper cleanup
class MyComponent extends React.Component {
  abortController = new AbortController();
  
  componentWillUnmount() {
    this.abortController.abort();
  }
  
  async fetchData() {
    try {
      const data = await api.fetch({ signal: this.abortController.signal });
      this.setState({ data });
    } catch (e) {
      if (e.name === 'AbortError') return;
      throw e;
    }
  }
}

// Function component (recommended)
function MyComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    api.fetch({ signal: controller.signal })
      .then(setData)
      .catch(e => e.name !== 'AbortError' && console.error(e));
    
    return () => controller.abort();
  }, []);
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-is-mounted': 'error'
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

- **[isMounted is an Antipattern](https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html)** - React blog
- **[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)** - MDN reference

