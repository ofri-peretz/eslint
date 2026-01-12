# consistent-existence-index-check

> **Keywords:** indexOf, includes, array, consistency, ESLint rule, auto-fix, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Enforce consistent style for checking if an element exists in an array. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

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
    'architecture/consistent-existence-index-check': 'warn'
  }
}
```

## Related Rules

- [`prefer-at`](./prefer-at.md) - Modern array access

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

- **[Array.includes() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes)** - MDN reference

