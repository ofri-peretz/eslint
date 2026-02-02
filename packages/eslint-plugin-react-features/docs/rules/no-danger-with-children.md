---
title: no-danger-with-children
description: Prevent using children and dangerouslySetInnerHTML together. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
tags: ['quality', 'react']
category: quality
autofix: suggestions
---

> **Keywords:** React, dangerouslySetInnerHTML, children, ESLint rule, code quality, LLM-optimized


<!-- @rule-summary -->
Prevent using children and dangerouslySetInnerHTML together. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
<!-- @/rule-summary -->

Prevent using children and dangerouslySetInnerHTML together. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (bug prevention)                  |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Using both children and `dangerouslySetInnerHTML` is ambiguous - React will throw an error.

## Examples

### ❌ Incorrect

```jsx
<div dangerouslySetInnerHTML={{ __html: html }}>
  Some text
</div>

<div dangerouslySetInnerHTML={{ __html: html }} children="text" />
```

### ✅ Correct

```jsx
<div dangerouslySetInnerHTML={{ __html: html }} />

<div>Some text</div>
```

## Related Rules

- [`no-danger`](./no-danger.mdx) - Warn about dangerouslySetInnerHTML usage