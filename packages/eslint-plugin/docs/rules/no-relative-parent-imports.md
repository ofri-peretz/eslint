# no-relative-parent-imports

> **Keywords:** relative imports, parent directory, path aliases, ESLint rule, module resolution, LLM-optimized

Forbid imports from parent directories using `../`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (architecture)                                               |
| **Auto-Fix**   | ❌ No (requires path alias setup)                                    |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Monorepos, large projects with path aliases                          |

## Rule Details

Parent-relative imports (`../`) create tight coupling and become hard to maintain as projects grow.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🔗 **Tight coupling**     | Moving files breaks imports     | Use path aliases          |
| 📖 **Readability**        | `../../..` is confusing        | Absolute paths            |
| 🔄 **Refactoring**        | Hard to reorganize              | Module boundaries         |

## Examples

### ❌ Incorrect

```typescript
import { util } from '../utils';
import { Component } from '../../components/Button';
import { config } from '../../../config';
```

### ✅ Correct

```typescript
// Use path aliases (tsconfig.json paths)
import { util } from '@/utils';
import { Component } from '@/components/Button';
import { config } from '@/config';

// Or absolute from package
import { util } from 'my-package/utils';
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-relative-parent-imports': 'warn'
  }
}
```

### tsconfig.json Setup

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Related Rules

- [`no-internal-modules`](./no-internal-modules.md) - Module boundaries

## Further Reading

- **[TypeScript Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)** - TypeScript docs

