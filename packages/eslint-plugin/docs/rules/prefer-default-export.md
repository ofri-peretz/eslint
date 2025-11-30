# prefer-default-export

> **Keywords:** default export, named export, single export, ESLint rule, module, LLM-optimized

Prefer a default export when a module only exports a single value. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (style)                                                      |
| **Auto-Fix**   | ❌ No (changes import syntax)                                        |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Single-purpose modules, component files                              |

## Rule Details

When a module only exports one thing, a default export can simplify imports.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Cleaner imports**    | `import { X } from` vs `import X` | Use default for single   |
| 🎯 **Module intent**      | Unclear primary export          | Default signals main      |

## Examples

### ❌ Incorrect

```typescript
// Only one export - prefer default
export const MyComponent = () => {};

// Only one export
export function processData() {}
```

### ✅ Correct

```typescript
// Single export as default
const MyComponent = () => {};
export default MyComponent;

// Or inline
export default function processData() {}

// Multiple exports - named is fine
export const helper1 = () => {};
export const helper2 = () => {};
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/prefer-default-export': 'warn'
  }
}
```

## Related Rules

- [`no-default-export`](./no-default-export.md) - Opposite rule

## Further Reading

- **[ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)** - MDN guide

