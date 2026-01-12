# prefer-at

> **Keywords:** Array.at(), negative index, last element, ESLint rule, ES2022, auto-fix, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prefer using `Array.at()` for accessing elements, especially with negative indices. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

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
    'architecture/prefer-at': 'warn'
  }
}
```

## Related Rules

- [`prefer-node-protocol`](./prefer-node-protocol.md) - Modern Node.js imports

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

- **[Array.at() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at)** - MDN reference
- **[ES2022 Features](https://tc39.es/ecma262/)** - ECMAScript specification

