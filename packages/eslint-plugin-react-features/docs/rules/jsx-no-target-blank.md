---
title: jsx-no-target-blank
description: "Require rel='noopener noreferrer' with target='_blank'. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages."
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** React, JSX, target blank, noopener, security, ESLint rule, LLM-optimized

Require rel="noopener noreferrer" with target="\_blank". This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Warning (security)                      |
| **Auto-Fix**   | 💡 Suggests fixes                       |
| **Category**   | React Security                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Links with `target="_blank"` without `rel="noopener noreferrer"` are vulnerable to tabnabbing attacks.

## Examples

### ❌ Incorrect

```jsx
<a target="_blank" href="https://example.com">Link</a>

<a target="_blank" href={url}>External</a>
```

### ✅ Correct

```jsx
<a target="_blank" rel="noopener noreferrer" href="https://example.com">Link</a>

<a target="_blank" rel="noopener" href="https://example.com">Link</a>
```

## Related Rules

- [`jsx-no-script-url`](./jsx-no-script-url.mdx) - Prevent javascript URLs
