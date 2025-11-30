# prefer-dom-node-text-content

> **Keywords:** textContent, innerText, DOM, performance, ESLint rule, auto-fix, LLM-optimized

Prefer `textContent` over `innerText`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (performance)                                                |
| **Auto-Fix**   | ✅ Yes (converts property)                                           |
| **Category**   | Quality                                                              |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | DOM manipulation, performance-critical code                          |

## Rule Details

`innerText` triggers reflow and is slower. `textContent` is more performant and works in all contexts.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚡ **Performance**        | innerText triggers reflow       | textContent               |
| 🎨 **Style awareness**    | innerText reads computed style  | Avoid when not needed     |
| 🖥️ **SSR support**        | innerText requires layout       | textContent works always  |

## Examples

### ❌ Incorrect

```typescript
const text = element.innerText;  // Triggers reflow
element.innerText = 'Hello';  // Slower
```

### ✅ Correct

```typescript
const text = element.textContent;  // No reflow
element.textContent = 'Hello';  // Faster

// Use innerText only when you need style-aware text
// (hidden elements, CSS text-transform, etc.)
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/prefer-dom-node-text-content': 'warn'
  }
}
```

## Related Rules

- [`prefer-code-point`](./prefer-code-point.md) - Unicode handling

## Further Reading

- **[textContent - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)** - MDN reference
- **[Difference between textContent and innerText](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText#differences_from_textcontent)** - Comparison

