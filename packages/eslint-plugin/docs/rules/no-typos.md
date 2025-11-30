# no-typos

> **Keywords:** React, typos, lifecycle, static properties, ESLint rule, autocorrect, LLM-optimized

Detect common typos in React component properties and lifecycle methods. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | 💡 Suggests corrections                                              |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | All React projects                                                   |

## Rule Details

Detects misspellings in React lifecycle methods and static properties.

### Common Typos Detected

| Typo                  | Correct                    |
| --------------------- | -------------------------- |
| `componentDidUpate`   | `componentDidUpdate`       |
| `componentWillUnmout` | `componentWillUnmount`     |
| `getDerivedStateFromProp` | `getDerivedStateFromProps` |
| `propTypes` (wrong case) | `propTypes`             |
| `defaultProps` (wrong) | `defaultProps`            |

## Examples

### ❌ Incorrect

```tsx
class MyComponent extends React.Component {
  // Typo in lifecycle
  componentDidUpate() {}  // Should be componentDidUpdate
  componentWillUnmout() {}  // Should be componentWillUnmount
  
  // Typo in static property
  static PropTypes = {};  // Should be propTypes (lowercase p)
}
```

### ✅ Correct

```tsx
class MyComponent extends React.Component {
  componentDidUpdate() {}
  componentWillUnmount() {}
  
  static propTypes = {};
  static defaultProps = {};
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-typos': 'error'
  }
}
```

## Related Rules

- [`display-name`](./display-name.md) - Component naming
- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration to hooks

## Further Reading

- **[React Component Lifecycle](https://react.dev/reference/react/Component)** - React docs

