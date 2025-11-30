# require-render-return

> **Keywords:** React, render, return, class component, ESLint rule, correctness, LLM-optimized

Require `return` statement in render methods. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No                                                                |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

The `render()` method must return a React element, `null`, or nothing (`undefined` implicitly returns `null`).

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🐛 **Silent failure**     | Component renders nothing       | Add return statement      |
| ❓ **Unclear intent**     | Is missing return intentional?  | Explicit return           |
| 🧪 **Testing**            | Hard to catch in tests          | Static analysis           |

## Examples

### ❌ Incorrect

```tsx
class MyComponent extends React.Component {
  render() {
    <div>Hello</div>;  // Missing return!
  }
}

class AnotherComponent extends React.Component {
  render() {
    if (this.props.show) {
      return <div>Content</div>;
    }
    // Missing return for else case
  }
}
```

### ✅ Correct

```tsx
class MyComponent extends React.Component {
  render() {
    return <div>Hello</div>;
  }
}

class AnotherComponent extends React.Component {
  render() {
    if (this.props.show) {
      return <div>Content</div>;
    }
    return null;  // Explicit return
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/require-render-return': 'error'
  }
}
```

## Related Rules

- [`display-name`](./display-name.md) - Component naming
- [`prefer-stateless-function`](./prefer-stateless-function.md) - Function components

## Further Reading

- **[Render Method](https://react.dev/reference/react/Component#render)** - React docs

