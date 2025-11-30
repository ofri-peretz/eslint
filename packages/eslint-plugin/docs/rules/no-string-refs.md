# no-string-refs

> **Keywords:** React, refs, createRef, useRef, string refs, ESLint rule, deprecated, LLM-optimized

Prevent string refs in React components (deprecated pattern). This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-string-refs': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[Refs and the DOM](https://react.dev/learn/manipulating-the-dom-with-refs)** - React docs
- **[useRef Hook](https://react.dev/reference/react/useRef)** - useRef reference

