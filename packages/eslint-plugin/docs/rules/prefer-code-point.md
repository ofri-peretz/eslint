# prefer-code-point

> **Keywords:** codePointAt, charCodeAt, Unicode, emoji, ESLint rule, auto-fix, LLM-optimized

Prefer `String.codePointAt()` over `String.charCodeAt()`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (correctness)                                                |
| **Auto-Fix**   | ✅ Yes (converts method)                                             |
| **Category**   | Quality                                                              |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Unicode handling, emoji support                                      |

## Rule Details

`charCodeAt()` only works for Basic Multilingual Plane characters. `codePointAt()` handles all Unicode including emoji.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 😀 **Emoji handling**     | Incorrect code points           | codePointAt()             |
| 🌍 **Unicode support**    | Astral characters fail          | Full Unicode support      |
| 📏 **String length**      | Surrogate pairs miscounted      | Correct iteration         |

## Examples

### ❌ Incorrect

```typescript
const code = string.charCodeAt(0);  // Fails for emoji
'😀'.charCodeAt(0);  // Returns 55357 (wrong!)
```

### ✅ Correct

```typescript
const code = string.codePointAt(0);  // Works for all Unicode
'😀'.codePointAt(0);  // Returns 128512 (correct!)

// Iterate over code points
for (const char of string) {
  const codePoint = char.codePointAt(0);
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/prefer-code-point': 'warn'
  }
}
```

## Related Rules

- [`prefer-dom-node-text-content`](./prefer-dom-node-text-content.md) - DOM text handling

## Further Reading

- **[codePointAt() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt)** - MDN reference

