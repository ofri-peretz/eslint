# no-console-spaces

> **Keywords:** console, logging, spaces, formatting, ESLint rule, auto-fix, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Disallow leading/trailing whitespace in console arguments. This rule is part of [`@eslint/eslint-plugin-quality`](https://www.npmjs.com/package/@eslint/eslint-plugin-quality).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ✅ Yes (removes extra spaces)                                        |
| **Category**   | Development                                                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Clean console output, consistent logging                             |

## Rule Details

Console methods automatically add spaces between arguments, so leading/trailing spaces in strings are redundant.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📝 **Double spaces**      | Inconsistent output             | Remove redundant spaces   |
| 🔍 **Log parsing**        | Affects log analysis            | Clean formatting          |
| 📖 **Readability**        | Cluttered logs                  | Trim strings              |

## Examples

### ❌ Incorrect

```typescript
// Leading/trailing spaces are redundant
console.log('Value: ', value);  // Double space in output
console.log(value, ' items');   // Double space in output
console.log(' Debug: ', data);  // Leading space unnecessary
```

### ✅ Correct

```typescript
// Console adds spaces automatically
console.log('Value:', value);
console.log(value, 'items');
console.log('Debug:', data);

// Or use template literals for exact control
console.log(`Value: ${value}`);
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'quality/no-console-spaces': 'warn'
  }
}
```

## Related Rules

- [`no-console-log`](./no-console-log.md) - Console logging control

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

- **[Console API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Console)** - Console reference

