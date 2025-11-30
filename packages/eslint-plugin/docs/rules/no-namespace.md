# no-namespace

> **Keywords:** React, namespace import, named imports, tree shaking, bundle size, ESLint rule, LLM-optimized

Prevent namespace imports in React applications. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (optimization)                                               |
| **Auto-Fix**   | ❌ No (requires import conversion)                                   |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Bundle optimization, tree shaking                                    |

## Rule Details

Namespace imports (`import * as X from 'module'`) prevent effective tree shaking and increase bundle size. Use named imports instead for better optimization.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **No tree shaking**        | Larger bundle size                  | Use named imports            |
| 🐛 **Unclear dependencies**   | Hard to see what's used             | Explicit imports             |
| 🔍 **Analysis difficulty**    | Static analysis less effective      | Named imports enable tooling |

## Examples

### ❌ Incorrect

```tsx
// BAD: Namespace import imports everything
import * as React from 'react';
import * as utils from './utils';
import * as lodash from 'lodash';

function MyComponent() {
  const value = lodash.get(data, 'nested.value');
  return <React.Fragment>{value}</React.Fragment>;
}
```

### ✅ Correct

```tsx
// GOOD: Named imports enable tree shaking
import React, { Fragment, useState, useEffect } from 'react';
import { formatDate, parseQuery } from './utils';
import get from 'lodash/get';

function MyComponent() {
  const value = get(data, 'nested.value');
  return <Fragment>{value}</Fragment>;
}

// Even better: Use JSX shorthand
function MyComponent() {
  const value = get(data, 'nested.value');
  return <>{value}</>;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-namespace': 'warn'
  }
}
```

## Related Rules

- [`no-commonjs`](./no-commonjs.md) - Enforce ES modules
- [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) - Import validation

## Further Reading

- **[Tree Shaking](https://webpack.js.org/guides/tree-shaking/)** - Webpack docs
- **[ES Modules](https://react.dev/learn/importing-and-exporting-components)** - React import patterns

