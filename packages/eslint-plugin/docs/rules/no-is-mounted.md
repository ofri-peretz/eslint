# no-is-mounted

> **Keywords:** React, isMounted, deprecated, memory leaks, ESLint rule, anti-pattern, LLM-optimized

Prevent using `isMounted()` in React class components. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-is-mounted': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[isMounted is an Antipattern](https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html)** - React blog
- **[AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)** - MDN reference

