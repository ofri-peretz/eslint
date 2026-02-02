---
title: jsx-no-duplicate-props
description: Prevent duplicate props in JSX elements. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
tags: ['quality', 'react']
category: quality
autofix: suggestions
---

> **Keywords:** React, JSX, props, duplicate, ESLint rule, code quality, LLM-optimized


<!-- @rule-summary -->
Prevent duplicate props in JSX elements. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
<!-- @/rule-summary -->

Prevent duplicate props in JSX elements. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (bug prevention)                  |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Duplicate JSX props cause one value to override another, which is almost always a mistake.

## Examples

### ❌ Incorrect

```jsx
<Button onClick={handleClick} onClick={handleSubmit} />

<Input name="email" name="username" />
```

### ✅ Correct

```jsx
<Button onClick={handleClick} />

<Input name="email" />
```

## Related Rules

- [`jsx-key`](./jsx-key.mdx) - Require key prop in iterators