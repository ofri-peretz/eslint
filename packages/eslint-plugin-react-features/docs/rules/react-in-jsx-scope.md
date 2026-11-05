---
title: react-in-jsx-scope
description: react-in-jsx-scope rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
react-in-jsx-scope rule
<!-- @/rule-summary -->

# react-in-jsx-scope

> **Keywords:** React, JSX, import, scope, ESLint rule, React 17, LLM-optimized

Prevent missing React in scope when using JSX. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (for React `<17`)                                              |
| **Auto-Fix**   | ✅ Yes (adds import)                                                 |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React projects before version 17                                     |

## Rule Details

Before React 17, JSX was transformed to `React.createElement()`, requiring React in scope.

### React Version Behavior

| React Version | JSX Transform | React Import Required |
| ------------- | ------------- | --------------------- |
| < 17          | Classic       | ✅ Yes                |
| 17+           | New           | ❌ No                 |

## Examples

### ❌ Incorrect (React < 17)

```tsx
// No React binding: the classic runtime compiles this to React.createElement
export function Component() {
  return <div>Hello</div>;
}

// Named imports do not bring `React` into scope
import { useState } from 'react';
export const Fragment = () => <>Hello</>;

// A type-only import is erased at compile time
import type React from 'react';
export const el: React.ReactNode = <span />;
```

Every JSX element and fragment needs a value named `React` in scope: a default
or namespace import, a `require`, or any other binding. A file that declares
`/** @jsxRuntime automatic */` needs none.

### ✅ Correct

```tsx
// React < 17: Import required
import React from 'react';

export function Component() {
  return <div>Hello</div>;
}

// React 17+: Import optional (rule can be disabled)
export function Component() {
  return <div>Hello</div>;
}
```

## Configuration Examples

### Basic Usage (React < 17)

```javascript
{
  rules: {
    'react-features/react-in-jsx-scope': 'error'
  }
}
```

### React 17+ (Disable Rule)

```javascript
{
  rules: {
    'react-features/react-in-jsx-scope': 'off'
  }
}
```

## Related Rules

- [`jsx-key`](./jsx-key.md) - JSX key requirements
- [`display-name`](./display-name.md) - Component naming

## Further Reading

- **[New JSX Transform](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html)** - React blog
## Known False Negatives

- A custom `@jsx` pragma (`/** @jsx h */`) is not read: the rule still asks for
  `React`.
