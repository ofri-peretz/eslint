---
title: no-deprecated
description: Warn about using deprecated React APIs. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** React, deprecated, API, migration, ESLint rule, code quality, LLM-optimized

Warn about using deprecated React APIs. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Warning (code quality)                  |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React                                   |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Deprecated APIs will be removed in future React versions. Update to modern alternatives.

## Examples

### ❌ Incorrect

```jsx
import React from 'react';

class MyComponent extends React.Component {
  componentWillMount() {
    // Deprecated
    this.loadData();
  }

  componentWillReceiveProps(nextProps) {
    // Deprecated
    this.setState({ data: nextProps.data });
  }
}
```

### ✅ Correct

```jsx
import React, { useEffect, useState } from 'react';

function MyComponent({ data }) {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setLocalData(data);
  }, [data]);
}
```

## Related Rules

- [`no-unsafe`](./no-unsafe.mdx) - Warn about UNSAFE\_ lifecycle methods
