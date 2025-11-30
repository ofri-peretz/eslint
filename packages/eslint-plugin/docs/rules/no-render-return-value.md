# no-render-return-value

> **Keywords:** React, render, ReactDOM, deprecated, ESLint rule, migration, LLM-optimized

Prevent using the return value of `ReactDOM.render()`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (deprecated)                                                   |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React 18+ migration                                                  |

## Rule Details

`ReactDOM.render()` returns the root component instance, but this is deprecated and doesn't work with concurrent mode.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Deprecated**         | Removed in React 18+            | Use refs                  |
| 🔄 **Concurrent mode**    | Doesn't work                    | createRoot API            |
| 🐛 **Unreliable**         | May return null                 | Proper patterns           |

## Examples

### ❌ Incorrect

```tsx
const instance = ReactDOM.render(<App />, container);
instance.doSomething();  // Using return value
```

### ✅ Correct

```tsx
// React 18+ with createRoot
import { createRoot } from 'react-dom/client';

const root = createRoot(container);
root.render(<App />);

// Use refs for component instances
const appRef = React.createRef();
root.render(<App ref={appRef} />);

// Access via ref
appRef.current?.doSomething();
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-render-return-value': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Modernization

## Further Reading

- **[React 18 - createRoot](https://react.dev/reference/react-dom/client/createRoot)** - React 18 API
- **[Upgrading to React 18](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)** - Migration guide

