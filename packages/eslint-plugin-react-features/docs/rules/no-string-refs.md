---
title: no-string-refs
description: no-string-refs rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-string-refs rule
<!-- @/rule-summary -->

# no-string-refs

> **Keywords:** React, refs, createRef, useRef, string refs, ESLint rule, deprecated, LLM-optimized

Prevent string refs in React components (deprecated pattern). This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (deprecated)                                                   |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | All React projects                                                   |

## Rule Details

String refs (`ref="myRef"`) are deprecated and have issues. Use `createRef` or `useRef` instead.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Deprecated**         | Will be removed                 | useRef/createRef          |
| 🔗 **Owner issues**       | Wrong component gets ref        | Callback refs             |
| 🧪 **Static analysis**    | Can't be type-checked           | Typed refs                |

## Examples

### ❌ Incorrect

```tsx
class MyComponent extends React.Component {
  render() {
    return <input ref="myInput" />;  // String ref
  }
  
  focusInput() {
    this.refs.myInput.focus();  // Using string ref
  }
}
```

### ✅ Correct

```tsx
// Class component with createRef
class MyComponent extends React.Component {
  inputRef = React.createRef<HTMLInputElement>();
  
  render() {
    return <input ref={this.inputRef} />;
  }
  
  focusInput() {
    this.inputRef.current?.focus();
  }
}

// Function component with useRef
function MyComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const focusInput = () => inputRef.current?.focus();
  
  return <input ref={inputRef} />;
}

// Callback ref
<input ref={(el) => { this.inputRef = el; }} />
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-string-refs': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[Refs and the DOM](https://react.dev/learn/manipulating-the-dom-with-refs)** - React docs
- **[useRef Hook](https://react.dev/reference/react/useRef)** - useRef reference
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