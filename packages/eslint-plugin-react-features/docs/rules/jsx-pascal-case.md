---
title: jsx-pascal-case
description: 'Enforce PascalCase for user-defined JSX components'
tags: ['quality', 'react']
category: quality
autofix: none
---

> **Keywords:** React, JSX, jsx-pascal-case, eslint-plugin-react, ESLint rule, LLM-optimized

<!-- @rule-summary -->

Enforce PascalCase for user-defined JSX components
<!-- @/rule-summary -->

A JSX tag that starts with a capital letter is a component reference, and the convention is PascalCase: `<MyComponent />`, not `<my_component />` or `<Foo_bar />`. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and follows [`eslint-plugin-react/jsx-pascal-case`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-pascal-case.md) in behaviour and options. Its upstream test cases (eslint-plugin-react 7.37.5, MIT) run against it: 85 of 85 agree.

## Quick Summary

| Aspect         | Details                                     |
| -------------- | ------------------------------------------- |
| **Severity**   | Warning (style)                             |
| **Auto-Fix**   | ❌ No auto-fix                              |
| **Category**   | React                                       |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration     |
| **Best For**   | Projects that name components in PascalCase |

## Rule Details

Intrinsic elements (`<div />`, `<svg:rect />`) start with a lower-case letter and are never checked, and neither is a single-letter name (`<T />`), which cannot be told from a type parameter. Every other tag name must be PascalCase: an upper-case first letter, letters and digits only, and at least one lower-case letter or digit (`<YMCA />` is not PascalCase, unless `allowAllCaps` is on). For `<Foo.Bar />` and `<Foo:Bar />` each part is checked, unless `allowNamespace` limits the check to the first.

Letters are judged by Unicode case, so `<Año />` and `<Éurströmming />` pass.

## Examples

### ❌ Incorrect

```jsx
<Test_component />

<TEST_COMPONENT />

<Styled.h1 />
```

### ✅ Correct

```jsx
<div />

<TestComponent />

<Test1Component />

<Modal.Header />

<T />
```

## Options

| Option                   | Type       | Default | Description                                                                                                                           |
| ------------------------ | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `allowAllCaps`           | `boolean`  | `false` | Also accept `SCREAMING_SNAKE_CASE`: `<TEST_COMPONENT />`, `<YMCA />`                                                                  |
| `allowLeadingUnderscore` | `boolean`  | `false` | Ignore one leading `_` before judging the name: `<_TestComponent />`                                                                  |
| `allowNamespace`         | `boolean`  | `false` | Judge only the first part of `<Foo.bar />`, so a lower-case member such as `<Styled.h1 />` passes                                     |
| `ignore`                 | `string[]` | `[]`    | Names to leave alone, each a name or a glob (`*`, `?`, `[ab]`, `{a,b}`, `+(a\|b)`). A part is matched on its own, not the whole `A.B` |

```js
'react-features/jsx-pascal-case': ['error', { allowAllCaps: true, ignore: [] }]
```

The `ignore` globs are matched by a small matcher inside the package (the package has no runtime dependencies), written to agree with minimatch for the patterns a component name can meet.
