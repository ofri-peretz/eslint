# prefer-at

> **Keywords:** Array.at(), negative index, last element, ESLint rule, ES2022, auto-fix, LLM-optimized

Prefer using `Array.at()` for accessing elements, especially with negative indices. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (modern JavaScript)                                          |
| **Auto-Fix**   | ✅ Yes (converts to .at())                                           |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | ES2022+ codebases, cleaner array access                              |

## Rule Details

`Array.at()` provides a cleaner way to access array elements, especially the last element or elements from the end.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | `arr[arr.length - 1]` is verbose| Use `arr.at(-1)`          |
| 🐛 **Off-by-one errors**  | Easy to make mistakes           | Negative indices          |
| 🔄 **Consistency**        | Multiple patterns in codebase   | Standardize on .at()      |

## Examples

### ❌ Incorrect

```typescript
// Accessing last element
const last = array[array.length - 1];

// Second to last
const secondLast = array[array.length - 2];

// Dynamic negative access
const item = array[array.length - offset];
```

### ✅ Correct

```typescript
// Clean last element access
const last = array.at(-1);

// Second to last
const secondLast = array.at(-2);

// Dynamic negative access
const item = array.at(-offset);

// Also works with strings
const lastChar = string.at(-1);
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/prefer-at': 'warn'
  }
}
```

## Related Rules

- [`prefer-node-protocol`](./prefer-node-protocol.md) - Modern Node.js imports

## Further Reading

- **[Array.at() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)** - MDN reference
- **[ES2022 Features](https://tc39.es/ecma262/)** - ECMAScript specification

