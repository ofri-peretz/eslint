---
title: no-unsafe
description: Warn about UNSAFE_ lifecycle methods. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
tags: ['quality', 'react']
category: quality
autofix: suggestions
---

> **Keywords:** React, UNSAFE, lifecycle, deprecated, ESLint rule, code quality, LLM-optimized


<!-- @rule-summary -->
Warn about UNSAFE_ lifecycle methods. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
<!-- @/rule-summary -->

Warn about UNSAFE\_ lifecycle methods. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Warning (code quality)                  |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

UNSAFE\_ lifecycle methods may cause issues with async rendering and will be removed in future React versions.

## Examples

### ❌ Incorrect

```jsx
class MyComponent extends React.Component {
  UNSAFE_componentWillMount() {
    this.loadData();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.updateState(nextProps);
  }

  UNSAFE_componentWillUpdate(nextProps, nextState) {
    this.prepareUpdate();
  }
}
```

### ✅ Correct

```jsx
class MyComponent extends React.Component {
  componentDidMount() {
    this.loadData();
  }

  static getDerivedStateFromProps(props, state) {
    return { derivedValue: props.value };
  }

  getSnapshotBeforeUpdate(prevProps, prevState) {
    return this.divRef.scrollHeight;
  }
}
```

## Related Rules

- [`no-deprecated`](./no-deprecated.mdx) - Warn about deprecated APIs