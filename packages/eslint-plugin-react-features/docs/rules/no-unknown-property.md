---
title: no-unknown-property
description: no-unknown-property rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-unknown-property rule
<!-- @/rule-summary -->

# no-unknown-property

> **Keywords:** React, JSX, props, HTML attributes, className, ESLint rule, DOM, LLM-optimized

Prevent unknown DOM properties in JSX. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

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
<table cellpadding="5" cellspacing="0"></table>
```

### ✅ Correct

```tsx
<div className="container">Content</div>
<label htmlFor="input">Label</label>
<input tabIndex={1} readOnly />
<table cellPadding={5} cellSpacing={0}></table>
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

## Further Reading

- **[DOM Elements](https://react.dev/reference/react-dom/components/common)** - React docs
- **[JSX Differences](https://react.dev/learn/writing-markup-with-jsx#jsx-is-like-html-but-stricter)** - HTML vs JSX
## Known False Negatives

- An attribute name React does not know at all (`<div foo="x">`) is not
  reported unless it is the HTML spelling of a React property: React 16+
  passes unknown attributes through to the DOM.
- Namespaced names (`xlink:href`) are not checked.
- Components and custom elements (`<my-widget>`) take any prop and are never
  checked.
