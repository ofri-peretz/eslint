# react-in-jsx-scope

> **Keywords:** React, JSX, import, scope, ESLint rule, React 17, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent missing React in scope when using JSX. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (for React <17)                                                |
| **Auto-Fix**   | ✅ Yes (adds import)                                                 |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React projects before version 17                                     |

## Rule Details

Before React 17, JSX was transformed to `React.createElement()`, requiring React in scope.

### React Version Behavior

| React Version | JSX Transform | React Import Required |
| ------------- | ------------- | --------------------- |
| < 17          | Classic       | ✅ Yes                |
| 17+           | New           | ❌ No                 |

## Examples

### ❌ Incorrect (React < 17)

```tsx
// Missing React import
export function Component() {
  return <div>Hello</div>;  // Error: React must be in scope
}
```

### ✅ Correct

```tsx
// React < 17: Import required
import React from 'react';

export function Component() {
  return <div>Hello</div>;
}

// React 17+: Import optional (rule can be disabled)
export function Component() {
  return <div>Hello</div>;
}
```

## Configuration Examples

### Basic Usage (React < 17)

```javascript
{
  rules: {
    'react-features/react-in-jsx-scope': 'error'
  }
}
```

### React 17+ (Disable Rule)

```javascript
{
  rules: {
    'react-features/react-in-jsx-scope': 'off'
  }
}
```

## Related Rules

- [`jsx-key`](./jsx-key.md) - JSX key requirements
- [`display-name`](./display-name.md) - Component naming

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

- **[New JSX Transform](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)** - React blog

