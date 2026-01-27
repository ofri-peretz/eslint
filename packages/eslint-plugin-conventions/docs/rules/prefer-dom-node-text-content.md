---
title: prefer-dom-node-text-content
description: Prefer textContent over innerText. This rule is part of @eslint/eslint-plugin-quality.
category: quality
severity: low
tags: ['quality', 'conventions', 'style']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---

> **Keywords:** textContent, innerText, DOM, performance, ESLint rule, auto-fix, LLM-optimized

Prefer `textContent` over `innerText`. This rule is part of [`@eslint/eslint-plugin-quality`](https://www.npmjs.com/package/@eslint/eslint-plugin-quality).

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
    'quality/prefer-dom-node-text-content': 'warn'
  }
}
```

## Related Rules

- [`prefer-code-point`](./prefer-code-point.md) - Unicode handling

## Further Reading

- **[textContent - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)** - MDN reference
- **[Difference between textContent and innerText](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText#differences_from_textcontent)** - Comparison
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = externalSource();
processValue(value); // Variable origin not tracked
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.
