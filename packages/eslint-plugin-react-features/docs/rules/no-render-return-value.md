---
title: no-render-return-value
description: no-render-return-value rule
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---# no-render-return-value

> **Keywords:** React, render, ReactDOM, deprecated, ESLint rule, migration, LLM-optimized

Prevent using the return value of `ReactDOM.render()`. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

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
    'react-features/no-render-return-value': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Modernization

## Further Reading

- **[React 18 - createRoot](https://react.dev/reference/react-dom/client/createRoot)** - React 18 API
- **[Upgrading to React 18](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)** - Migration guide
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



