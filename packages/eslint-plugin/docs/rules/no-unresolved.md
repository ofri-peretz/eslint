# no-unresolved

> **Keywords:** unresolved, imports, module resolution, TypeScript, ESLint rule, paths, LLM-optimized

Ensure imported modules can be resolved. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires fixing path or installation)                         |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Catching typos, missing packages, broken imports                     |

## Rule Details

Detects imports that cannot be resolved, catching errors before runtime.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🔤 **Typos**              | Runtime import errors           | Early detection           |
| 📦 **Missing packages**   | Build/runtime failures          | Install dependencies      |
| 📁 **Wrong paths**        | File not found                  | Fix path                  |

## Examples

### ❌ Incorrect

```typescript
import { util } from './utlis';  // Typo: utlis -> utils
import _ from 'lodahs';  // Typo: lodahs -> lodash
import { Component } from './components/Buton';  // Typo
```

### ✅ Correct

```typescript
import { util } from './utils';
import _ from 'lodash';
import { Component } from './components/Button';
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-unresolved': 'error'
  }
}
```

## Related Rules

- [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) - Ensure deps are declared

## Further Reading

- **[Module Resolution - TypeScript](https://www.typescriptlang.org/docs/handbook/module-resolution.html)** - TypeScript docs

