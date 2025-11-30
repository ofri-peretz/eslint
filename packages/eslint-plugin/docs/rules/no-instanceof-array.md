# no-instanceof-array

> **Keywords:** instanceof, Array.isArray, type checking, ESLint rule, cross-realm, LLM-optimized

Require `Array.isArray()` instead of `instanceof Array`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (correctness)                                                |
| **Auto-Fix**   | ✅ Yes (converts to Array.isArray)                                   |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Cross-realm code, iframes, Web Workers                               |

## Rule Details

`instanceof Array` fails for arrays from different JavaScript realms (iframes, Web Workers).

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🖼️ **Cross-realm**        | False negatives                 | Array.isArray()           |
| 🔧 **Web Workers**        | Type checks fail                | Static method             |
| 📦 **Library code**       | Unexpected behavior             | Universal check           |

## Examples

### ❌ Incorrect

```typescript
if (value instanceof Array) {
  // May fail for arrays from iframes/workers
}

function isArray(val: unknown) {
  return val instanceof Array;  // Unreliable
}
```

### ✅ Correct

```typescript
if (Array.isArray(value)) {
  // Works across realms
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);  // Reliable
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-instanceof-array': 'warn'
  }
}
```

## Related Rules

- [`no-unsafe-type-narrowing`](./no-unsafe-type-narrowing.md) - Type narrowing safety

## Further Reading

- **[Array.isArray() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray)** - MDN reference

