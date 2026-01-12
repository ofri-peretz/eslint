# no-namespace

> **Keywords:** React, namespace import, named imports, tree shaking, bundle size, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent namespace imports in React applications. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

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
    'react-features/no-namespace': 'warn'
  }
}
```

## Related Rules

- [`no-commonjs`](./no-commonjs.md) - Enforce ES modules
- [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) - Import validation

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


## Further Reading

- **[Tree Shaking](https://webpack.js.org/guides/tree-shaking/)** - Webpack docs
- **[ES Modules](https://react.dev/learn/importing-and-exporting-components)** - React import patterns

