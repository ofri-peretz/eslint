# no-typos

> **Keywords:** React, typos, lifecycle, static properties, ESLint rule, autocorrect, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Detect common typos in React component properties and lifecycle methods. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

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
    'react-features/no-typos': 'error'
  }
}
```

## Related Rules

- [`display-name`](./display-name.md) - Component naming
- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration to hooks

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

- **[React Component Lifecycle](https://react.dev/reference/react/Component)** - React docs

