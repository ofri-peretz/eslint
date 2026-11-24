---
title: style-prop-object
description: 'Enforce style prop value is an object'
tags: ['quality', 'react']
category: quality
autofix: none
---

> **Keywords:** React, JSX, style-prop-object, eslint-plugin-react, ESLint rule, LLM-optimized

<!-- @rule-summary -->

Enforce style prop value is an object
<!-- @/rule-summary -->

React's `style` prop takes an object of CSS properties. A string, number or boolean throws at render time. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and follows [`eslint-plugin-react/style-prop-object`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/style-prop-object.md) in behaviour and options. Its upstream test cases (eslint-plugin-react 7.37.5, MIT) run against it: 70 of 70 agree.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (correctness)                     |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

`<div style="color: red" />` is HTML. In React it throws `The style prop expects a mapping from style properties to values, not a string`. The rule reports a `style` attribute that is a string, or a braced literal that is not `null`, and a `style` value that resolves to one through a `const`/`let` declared in the file. The same applies to the `style` key of the props object in `React.createElement(type, props)`, however `createElement` is imported.

Nothing else is reported: an identifier the rule cannot trace to a literal (a parameter, an import, a call result), a template literal and `null`/`undefined` are left alone.

## Examples

### ❌ Incorrect

```jsx
<div style="color: red" />

<div style={true} />

const styles = 'color: red';
<div style={styles} />

React.createElement('div', { style: 'color: red' });
```

### ✅ Correct

```jsx
<div style={{ color: 'red' }} />

const styles = { color: 'red' };
<div style={styles} />

<div style={props.styles} />

<div style={null} />

React.createElement('div', { style: { color: 'red' } });
```

## Options

| Option  | Type       | Default | Description                                                                                                       |
| ------- | ---------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `allow` | `string[]` | `[]`    | Component names whose `style` prop is not an object: `<Hello style="x" />` and `createElement(Hello, {...})` pass |

```js
'react/style-prop-object': ['error', { allow: ['MyComponent'] }]
```

## When Not To Use It

When every `style` prop in the project is passed to a component that turns a string into an object. Name those components in `allow` first.
