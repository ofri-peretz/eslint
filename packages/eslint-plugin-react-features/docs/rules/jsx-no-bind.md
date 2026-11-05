---
title: jsx-no-bind
description: jsx-no-bind rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
jsx-no-bind rule
<!-- @/rule-summary -->

# jsx-no-bind

> **Keywords:** React, bind, arrow function, performance, ESLint rule, render, LLM-optimized

Prevent using `.bind()` or arrow functions in JSX props. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (performance)                                                |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Performance-critical React applications                              |

## Rule Details

A `.bind()` call written as a JSX prop value creates a new function instance on every
render. It is reported in every spelling of the call: `h.bind(this)`, `h['bind'](this)`,
`h.bind?.(this)`, and as a branch of a conditional or the right of `&&` / `||` / `??`.

Inline arrow functions are **not** reported: whether a fresh function matters depends on
a memoized child the file cannot see, so it is left to judgment.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚡ **Performance**        | New function every render       | Extract handlers          |
| 🔄 **Re-renders**         | Child PureComponent re-renders  | Stable references         |
| 💾 **Memory**             | Creates garbage                 | useCallback               |

## Examples

### ❌ Incorrect

```tsx
// Bind in render
<button onClick={this.handleClick.bind(this)}>Click</button>

// Bind in a conditional
<button onClick={enabled ? this.handleClick.bind(this) : undefined}>Click</button>
```

### ✅ Correct

```tsx
// Class: bind in constructor
class MyComponent extends React.Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this);
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// Class: arrow function property
class MyComponent extends React.Component {
  handleClick = () => { /* ... */ };
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// Function: useCallback
function MyComponent({ id }) {
  const handleClick = useCallback(() => {
    doSomething(id);
  }, [id]);
  
  return <button onClick={handleClick}>Click</button>;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/jsx-no-bind': 'warn'
  }
}
```

## Related Rules

- [`react-no-inline-functions`](./react-no-inline-functions.md) - Similar rule

## Further Reading

- **[useCallback](https://react.dev/reference/react/useCallback)** - React docs
- **[Performance Optimization](https://react.dev/reference/react/memo)** - React memo
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Prop from variable
const propValue = computedValue;
<Component prop={propValue} /> // Computation not analyzed
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.