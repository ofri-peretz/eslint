---
title: no-unsafe
description: Warn about UNSAFE_ lifecycle methods. This rule is part of @interlace/eslint-plugin-react-features and provides LLM-optimized error messages.
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** React, UNSAFE, lifecycle, deprecated, ESLint rule, code quality, LLM-optimized

Warn about UNSAFE\_ lifecycle methods. This rule is part of [`@interlace/eslint-plugin-react-features`](https://www.npmjs.com/package/@interlace/eslint-plugin-react-features) and provides LLM-optimized error messages.

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
