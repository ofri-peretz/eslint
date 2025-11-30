# no-invalid-html-attribute

> **Keywords:** React, JSX, HTML attributes, validation, ESLint rule, accessibility, LLM-optimized

Validate HTML attribute values in JSX. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-invalid-html-attribute': 'warn'
  }
}
```

## Related Rules

- [`no-unknown-property`](./no-unknown-property.md) - Validate property names
- [`no-missing-aria-labels`](./no-missing-aria-labels.md) - Accessibility

## Further Reading

- **[HTML Attributes - MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes)** - Reference

