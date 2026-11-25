---
title: jsx-no-undef
description: 'Disallow undeclared variables in JSX'
tags: ['quality', 'react']
category: quality
autofix: none
---

> **Keywords:** React, JSX, jsx-no-undef, eslint-plugin-react, ESLint rule, LLM-optimized

<!-- @rule-summary -->

Disallow undeclared variables in JSX
<!-- @/rule-summary -->

A JSX tag that names no binding is a ReferenceError at render time. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and follows [`eslint-plugin-react/jsx-no-undef`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-undef.md) in behaviour and options.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (correctness)                     |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

`<Foo />` compiles to a reference to `Foo`. When no import, declaration or configured global provides it, the page throws when it renders. The rule reports the tag (or, for `<Foo.Bar />`, the leftmost name) when nothing in scope declares it. Intrinsic elements (`<div />`) and namespaced tags (`<svg:circle />`) name no binding and are skipped.

## Examples

### ❌ Incorrect

```jsx
<Foo />

<Foo.Bar />
```

### ✅ Correct

```jsx
import Foo from './Foo';

<Foo />

<div />
```

## Options

| Option         | Type      | Default | Description                                                                                                                     |
| -------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `allowGlobals` | `boolean` | `false` | In a module, count a configured global (`languageOptions.globals`) as declared; by default only the module's own bindings count |
