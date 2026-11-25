---
title: jsx-uses-react
description: 'Disallow React to be incorrectly marked as unused'
tags: ['quality', 'react']
category: quality
autofix: none
---

> **Keywords:** React, JSX, jsx-uses-react, eslint-plugin-react, ESLint rule, LLM-optimized

<!-- @rule-summary -->

Disallow React to be incorrectly marked as unused
<!-- @/rule-summary -->

Classic-runtime JSX compiles to `React.createElement`, so a file that imports `React` for it uses it, though no identifier says so. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and follows [`eslint-plugin-react/jsx-uses-react`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-uses-react.md) in behaviour and options.

## Quick Summary

| Aspect         | Details                                                       |
| -------------- | ------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                           |
| **Auto-Fix**   | ❌ No auto-fix                                                |
| **Category**   | React                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                       |
| **Best For**   | Projects on the classic JSX runtime, with `no-unused-vars` on |

## Rule Details

The rule never reports. It marks the JSX factory as used, so the core `no-unused-vars` rule does not flag an `import React from 'react'` that only JSX needs. The factory is `React`, the first name of a `@jsx Foo.bar` pragma comment, or `settings.react.pragma`; a fragment (`<></>`) uses `settings.react.fragment` (default `Fragment`).

Under the automatic runtime (`@jsxRuntime automatic`, React 17+) no import is needed and this rule has nothing to do.

## Settings

The binding is read from, in order: a `@jsx` comment, `settings.react.pragma`, `React`. `settings.react.fragment` names the fragment binding.

```js
// eslint.config.js
export default [
  {
    plugins: { 'react-features': reactFeatures },
    settings: { react: { pragma: 'h', fragment: 'Fragment' } },
    rules: {
      'react-features/jsx-uses-react': 'error',
      'no-unused-vars': 'error',
    },
  },
];
```
