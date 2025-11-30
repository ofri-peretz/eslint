# no-unknown-property

> **Keywords:** React, JSX, props, HTML attributes, className, ESLint rule, DOM, LLM-optimized

Prevent unknown DOM properties in JSX. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-unknown-property': 'error'
  }
}
```

## Related Rules

- [`no-invalid-html-attribute`](./no-invalid-html-attribute.md) - Validate attribute values

## Further Reading

- **[DOM Elements](https://react.dev/reference/react-dom/components/common)** - React docs
- **[JSX Differences](https://react.dev/learn/writing-markup-with-jsx#jsx-is-like-html-but-stricter)** - HTML vs JSX

