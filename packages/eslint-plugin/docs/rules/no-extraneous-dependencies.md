# no-extraneous-dependencies

> **Keywords:** dependencies, package.json, devDependencies, ESLint rule, npm, imports, LLM-optimized

Forbid importing packages not listed in package.json dependencies. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires package.json update)                                 |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Monorepos, published packages, dependency hygiene                    |

## Rule Details

Importing packages that aren't declared in package.json can cause:
- Installation failures for consumers
- Unexpected behavior in production
- Phantom dependencies from hoisting

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 👻 **Phantom deps**       | Works locally, fails in prod    | Explicit dependencies     |
| 📦 **Missing in bundle**  | Runtime errors                  | Add to package.json       |
| 🔄 **Version mismatch**   | Different versions used         | Pin dependencies          |

## Examples

### ❌ Incorrect

```typescript
// lodash not in package.json
import _ from 'lodash';

// Using devDependency in production code
import { render } from '@testing-library/react';  // devDependency
```

### ✅ Correct

```typescript
// Listed in dependencies
import _ from 'lodash';  // "lodash": "^4.17.21" in package.json

// devDependency in test file
// tests/component.test.ts
import { render } from '@testing-library/react';  // OK in test files
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-extraneous-dependencies': 'error'
  }
}
```

## Related Rules

- [`max-dependencies`](./max-dependencies.md) - Limit dependency count
- [`no-unresolved`](./no-unresolved.md) - Ensure imports resolve

## Further Reading

- **[npm dependencies](https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file)** - npm documentation

