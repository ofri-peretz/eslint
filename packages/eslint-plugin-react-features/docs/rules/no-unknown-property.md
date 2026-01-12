# no-unknown-property

> **Keywords:** React, JSX, props, HTML attributes, className, ESLint rule, DOM, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent unknown DOM properties in JSX. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ✅ Yes (converts to correct prop)                                    |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | All React/JSX projects                                               |

## Rule Details

React uses camelCase for DOM attributes and has some renamed attributes (e.g., `className` instead of `class`).

### Common Corrections

| HTML Attribute | JSX Property    |
| -------------- | --------------- |
| `class`        | `className`     |
| `for`          | `htmlFor`       |
| `tabindex`     | `tabIndex`      |
| `colspan`      | `colSpan`       |
| `rowspan`      | `rowSpan`       |
| `readonly`     | `readOnly`      |
| `maxlength`    | `maxLength`     |
| `cellpadding`  | `cellPadding`   |
| `cellspacing`  | `cellSpacing`   |
| `frameborder`  | `frameBorder`   |

## Examples

### ❌ Incorrect

```tsx
<div class="container">Content</div>
<label for="input">Label</label>
<input tabindex="1" readonly />
<table cellpadding="5" cellspacing="0">
```

### ✅ Correct

```tsx
<div className="container">Content</div>
<label htmlFor="input">Label</label>
<input tabIndex={1} readOnly />
<table cellPadding={5} cellSpacing={0}>
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-unknown-property': 'error'
  }
}
```

## Related Rules

- [`no-invalid-html-attribute`](./no-invalid-html-attribute.md) - Validate attribute values

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

- **[DOM Elements](https://react.dev/reference/react-dom/components/common)** - React docs
- **[JSX Differences](https://react.dev/learn/writing-markup-with-jsx#jsx-is-like-html-but-stricter)** - HTML vs JSX

