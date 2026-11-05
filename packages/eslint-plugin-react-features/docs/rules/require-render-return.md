---
title: require-render-return
description: require-render-return rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
require-render-return rule
<!-- @/rule-summary -->

# require-render-return

> **Keywords:** React, render, return, class component, ESLint rule, correctness, LLM-optimized

Require `return` statement in render methods. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

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
    'react-features/require-render-return': 'error'
  }
}
```

## Related Rules

- [`display-name`](./display-name.md) - Component naming
- [`prefer-stateless-function`](./prefer-stateless-function.md) - Function components

## Further Reading

- **[Render Method](https://react.dev/reference/react/Component#render)** - React docs
## Known False Negatives

- A class extending a `Component` the file never imports or declares is not
  checked.
- Loops are not analysed: a `return` inside a `for` / `while` body does not
  count as returning on every path.
