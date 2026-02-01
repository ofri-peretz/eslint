---
title: no-find-dom-node
description: Prevent using findDOMNode. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** React, findDOMNode, deprecated, refs, ESLint rule, code quality, LLM-optimized

Prevent using findDOMNode. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (deprecated API)                  |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

`findDOMNode` is deprecated and will be removed in future React versions. Use refs instead.

## Examples

### ❌ Incorrect

```jsx
import { findDOMNode } from 'react-dom';

class MyComponent extends React.Component {
  componentDidMount() {
    const node = findDOMNode(this);
    node.focus();
  }
}
```

### ✅ Correct

```jsx
import React, { useRef, useEffect } from 'react';

function MyComponent() {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return <div ref={ref}>Content</div>;
}
```

## Related Rules

- [`no-string-refs`](./no-string-refs.mdx) - Prevent string refs
