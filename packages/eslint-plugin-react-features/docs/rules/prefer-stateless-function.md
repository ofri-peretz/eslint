# prefer-stateless-function

> **Keywords:** React, class component, function component, hooks, ESLint rule, migration, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prefer stateless function components over class components. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (best practice)                                              |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Modern React codebases                                               |

## Rule Details

Class components without state or lifecycle methods should be function components.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📦 **Bundle size**        | Classes add overhead            | Functions are smaller     |
| 📖 **Readability**        | More boilerplate                | Cleaner syntax            |
| ⚡ **Performance**        | Class instance creation         | Function call only        |

## Examples

### ❌ Incorrect

```tsx
// Class without state or lifecycle
class Greeting extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}

// Pure render class
class List extends React.Component {
  render() {
    return (
      <ul>
        {this.props.items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );
  }
}
```

### ✅ Correct

```tsx
// Function component
function Greeting({ name }) {
  return <h1>Hello, {name}</h1>;
}

// Arrow function component
const List = ({ items }) => (
  <ul>
    {items.map(item => (
      <li key={item.id}>{item.name}</li>
    ))}
  </ul>
);

// Class with state (appropriate)
class Counter extends React.Component {
  state = { count: 0 };
  render() {
    return <span>{this.state.count}</span>;
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/prefer-stateless-function': 'warn'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Full migration guide

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

- **[Function vs Class Components](https://react.dev/learn/your-first-component)** - React docs

