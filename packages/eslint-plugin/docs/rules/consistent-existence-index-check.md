# consistent-existence-index-check

> **Keywords:** indexOf, includes, array, consistency, ESLint rule, auto-fix, LLM-optimized

Enforce consistent style for checking if an element exists in an array. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ✅ Yes (converts pattern)                                            |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Code consistency, modern JavaScript practices                        |

## Rule Details

Prefer `includes()` over `indexOf() !== -1` for existence checks.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | `!== -1` is less clear          | Use includes()            |
| 🎯 **Intent**             | indexOf suggests index needed   | Clear existence check     |
| 🔄 **Consistency**        | Mixed patterns in codebase      | Standardize               |

## Examples

### ❌ Incorrect

```typescript
if (array.indexOf(item) !== -1) { }
if (array.indexOf(item) >= 0) { }
if (array.indexOf(item) > -1) { }
if (string.indexOf(substring) !== -1) { }
```

### ✅ Correct

```typescript
if (array.includes(item)) { }
if (string.includes(substring)) { }

// indexOf is fine when you need the actual index
const index = array.indexOf(item);
if (index !== -1) {
  array.splice(index, 1);  // Using the index
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/consistent-existence-index-check': 'warn'
  }
}
```

## Related Rules

- [`prefer-at`](./prefer-at.md) - Modern array access

## Further Reading

- **[Array.includes() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)** - MDN reference

