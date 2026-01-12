# no-invalid-html-attribute

> **Keywords:** React, JSX, HTML attributes, validation, ESLint rule, accessibility, LLM-optimized

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

## Further Reading

- **[HTML Attributes - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes)** - Reference
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



