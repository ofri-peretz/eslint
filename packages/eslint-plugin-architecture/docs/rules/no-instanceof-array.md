# no-instanceof-array

> **Keywords:** instanceof, Array.isArray, type checking, ESLint rule, cross-realm, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Require `Array.isArray()` instead of `instanceof Array`. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

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
    'architecture/no-instanceof-array': 'warn'
  }
}
```

## Related Rules

- [`no-unsafe-type-narrowing`](./no-unsafe-type-narrowing.md) - Type narrowing safety

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

- **[Array.isArray() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray)** - MDN reference

