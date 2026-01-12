# prefer-dom-node-text-content

> **Keywords:** textContent, innerText, DOM, performance, ESLint rule, auto-fix, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


## Further Reading

- **[textContent - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)** - MDN reference
- **[Difference between textContent and innerText](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText#differences_from_textcontent)** - Comparison

