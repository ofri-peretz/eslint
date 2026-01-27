---
title: jsx-no-script-url
description: "Prevent javascript: URLs in JSX. This rule is part of @interlace/eslint-plugin-react-features and provides LLM-optimized error messages."
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** React, JSX, javascript URL, XSS, security, ESLint rule, LLM-optimized

Prevent javascript: URLs in JSX. This rule is part of [`@interlace/eslint-plugin-react-features`](https://www.npmjs.com/package/@interlace/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (security)                        |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React Security                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Using `javascript:` URLs is a security risk and can lead to XSS vulnerabilities.

## Examples

### ❌ Incorrect

```jsx
<a href="javascript:void(0)">Click</a>

<a href="javascript:alert('XSS')">Click</a>
```

### ✅ Correct

```jsx
<a href="#" onClick={handleClick}>Click</a>

<button onClick={handleClick}>Click</button>
```

## Related Rules

- [`jsx-no-target-blank`](./jsx-no-target-blank.mdx) - Require rel attributes
