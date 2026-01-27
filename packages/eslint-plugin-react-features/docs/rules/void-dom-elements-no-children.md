---
title: void-dom-elements-no-children
description: Prevent void DOM elements from receiving children. This rule is part of @interlace/eslint-plugin-react-features and provides LLM-optimized error messages.
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** React, JSX, void elements, children, ESLint rule, code quality, LLM-optimized

Prevent void DOM elements from receiving children. This rule is part of [`@interlace/eslint-plugin-react-features`](https://www.npmjs.com/package/@interlace/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (bug prevention)                  |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Void DOM elements like `<br>`, `<hr>`, `<img>`, `<input>` cannot have children. React ignores them but it's a mistake.

## Examples

### ❌ Incorrect

```jsx
<br>Some text</br>

<img src="photo.jpg">Caption</img>

<input type="text">Value</input>

<hr children="divider" />
```

### ✅ Correct

```jsx
<br />

<img src="photo.jpg" alt="Photo" />

<input type="text" value={value} />

<hr />
```

## Related Rules

- [`jsx-no-duplicate-props`](./jsx-no-duplicate-props.mdx) - Prevent duplicate props
