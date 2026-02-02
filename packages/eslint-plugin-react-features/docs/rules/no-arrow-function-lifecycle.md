---
title: no-arrow-function-lifecycle
description: no-arrow-function-lifecycle rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-arrow-function-lifecycle rule
<!-- @/rule-summary -->

# no-arrow-function-lifecycle

> **Keywords:** React, lifecycle, arrow function, class component, binding, ESLint rule, LLM-optimized

Prevent arrow functions in React lifecycle methods. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

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

## Further Reading

- **[Component Lifecycle](https://react.dev/reference/react/Component#adding-lifecycle-methods-to-a-class-component)** - React docs
- **[Class vs Arrow Methods](https://react.dev/reference/react/Component#defining-a-class-component)** - Method definitions
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