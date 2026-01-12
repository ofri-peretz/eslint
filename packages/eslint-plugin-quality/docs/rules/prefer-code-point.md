# prefer-code-point

> **Keywords:** codePointAt, charCodeAt, Unicode, emoji, ESLint rule, auto-fix, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prefer `String.codePointAt()` over `String.charCodeAt()`. This rule is part of [`@eslint/eslint-plugin-quality`](https://www.npmjs.com/package/@eslint/eslint-plugin-quality).

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
    'quality/prefer-code-point': 'warn'
  }
}
```

## Related Rules

- [`prefer-dom-node-text-content`](./prefer-dom-node-text-content.md) - DOM text handling

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

- **[codePointAt() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt)** - MDN reference

