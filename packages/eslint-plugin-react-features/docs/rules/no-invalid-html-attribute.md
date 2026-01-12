# no-invalid-html-attribute

> **Keywords:** React, JSX, HTML attributes, validation, ESLint rule, accessibility, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Validate HTML attribute values in JSX. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (correctness)                                                |
| **Auto-Fix**   | 💡 Suggests corrections                                              |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | HTML/JSX correctness, accessibility                                  |

## Rule Details

Validates that HTML attribute values are valid according to HTML spec.

### Validated Attributes

| Attribute     | Valid Values                                    |
| ------------- | ----------------------------------------------- |
| `rel`         | `noopener`, `noreferrer`, `nofollow`, etc.     |
| `target`      | `_blank`, `_self`, `_parent`, `_top`           |
| `type` (input)| `text`, `email`, `password`, etc.              |
| `autocomplete`| `on`, `off`, `name`, `email`, etc.             |

## Examples

### ❌ Incorrect

```tsx
<a rel="noopner">Link</a>  // Typo: noopner -> noopener
<a target="_new">Link</a>  // Invalid: _new -> _blank
<input type="mail" />  // Invalid: mail -> email
```

### ✅ Correct

```tsx
<a rel="noopener noreferrer">Link</a>
<a target="_blank">Link</a>
<input type="email" />
<input autoComplete="email" />
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-invalid-html-attribute': 'warn'
  }
}
```

## Related Rules

- [`no-unknown-property`](./no-unknown-property.md) - Validate property names
- [`no-missing-aria-labels`](./no-missing-aria-labels.md) - Accessibility

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

- **[HTML Attributes - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes)** - Reference

