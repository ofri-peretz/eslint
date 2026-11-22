---
title: jsx-no-comment-textnodes
description: 'Disallow comments from being inserted as text nodes'
tags: ['quality', 'react']
category: quality
autofix: none
---

> **Keywords:** React, JSX, jsx-no-comment-textnodes, eslint-plugin-react, ESLint rule, LLM-optimized

<!-- @rule-summary -->

Disallow comments from being inserted as text nodes
<!-- @/rule-summary -->

A comment written between JSX tags is not a comment: it renders as text. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and follows [`eslint-plugin-react/jsx-no-comment-textnodes`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-comment-textnodes.md) in behaviour and options.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (correctness)                     |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

JSX has no comment syntax between tags. `<div>// note</div>` renders the characters `// note`. A comment belongs in braces: `<div>{/* note */}</div>`.

The rule reports a line of JSX text that starts with `//` or `/*`.

## Examples

### ❌ Incorrect

```jsx
<div>// TODO: remove</div>

<div>/* old markup */</div>

<>// note</>
```

### ✅ Correct

```jsx
<div>{/* TODO: remove */}</div>

<a href="https://example.com">see http://example.com</a>

<div title="// not text" />
```
