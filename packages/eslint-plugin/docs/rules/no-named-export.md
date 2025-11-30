# no-named-export

> **Keywords:** named export, default export, module style, ESLint rule, LLM-optimized

Forbid named exports in favor of default exports. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (style)                                                      |
| **Auto-Fix**   | ❌ No (changes export structure)                                     |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Teams preferring default-only export style                           |

## Rule Details

Enforces using only default exports, forbidding named exports.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🎯 **Single responsibility** | One export per file         | Default only              |
| 📦 **Consistent style**   | Mixed export styles             | Standardize               |

## Examples

### ❌ Incorrect

```typescript
export const helper = () => {};  // Named export
export function processData() {}  // Named export
```

### ✅ Correct

```typescript
const helper = () => {};
export default helper;

// Or for multiple values
export default {
  helper,
  processData,
};
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-named-export': 'warn'
  }
}
```

## Related Rules

- [`no-default-export`](./no-default-export.md) - Opposite rule
- [`prefer-default-export`](./prefer-default-export.md) - Softer version

## Further Reading

- **[ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)** - MDN guide

