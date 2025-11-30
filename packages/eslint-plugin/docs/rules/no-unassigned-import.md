# no-unassigned-import

> **Keywords:** side effects, imports, polyfills, ESLint rule, explicit imports, LLM-optimized

Forbid unassigned imports (imports without a binding). This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (may have side effects)                                        |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Explicit dependency tracking, avoiding hidden side effects           |

## Rule Details

Unassigned imports (`import 'module'`) execute side effects without clear binding, making dependencies less explicit.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 👻 **Hidden effects**     | Unclear what's happening        | Document side effects     |
| 🔍 **Traceability**       | Hard to find module usage       | Explicit imports          |
| 🧪 **Testing**            | Side effects in tests           | Control imports           |

## Examples

### ❌ Incorrect

```typescript
import 'reflect-metadata';  // What does this do?
import './styles.css';  // Side effect import
import 'polyfill-library';  // Hidden polyfill
```

### ✅ Correct

```typescript
// Explicit polyfill with comment
import 'reflect-metadata'; // Required for TypeORM decorators
// eslint-disable-next-line @forge-js/no-unassigned-import

// Or use explicit imports where possible
import { something } from 'module';

// For CSS, consider CSS modules
import styles from './styles.module.css';
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-unassigned-import': 'warn'
  }
}
```

## Related Rules

- [`no-commonjs`](./no-commonjs.md) - Module style control

## Further Reading

- **[Side Effects - MDN](https://developer.mozilla.org/en-US/docs/Glossary/Side_effect)** - Side effects concept

