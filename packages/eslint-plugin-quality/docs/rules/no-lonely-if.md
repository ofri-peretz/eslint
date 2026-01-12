# no-lonely-if

> **Keywords:** if, else, refactoring, readability, ESLint rule, code quality, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Disallow `if` statements as the only statement in `else` blocks. This rule is part of [`@eslint/eslint-plugin-quality`](https://www.npmjs.com/package/@eslint/eslint-plugin-quality).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ✅ Yes (converts to else if)                                         |
| **Category**   | Quality                                                              |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Code readability, reducing nesting                                   |

## Rule Details

A "lonely if" occurs when an `if` statement is the only statement inside an `else` block. This can be simplified to `else if`.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | Unnecessary nesting             | Use else if               |
| 🔍 **Code Review**        | Extra indentation to parse      | Flatten structure         |
| 📏 **Line Length**        | Wasted horizontal space         | Simplify                  |

## Examples

### ❌ Incorrect

```typescript
if (condition1) {
  doSomething();
} else {
  if (condition2) {  // Lonely if
    doSomethingElse();
  }
}

// Deeply nested
if (a) {
  // ...
} else {
  if (b) {
    // ...
  } else {
    if (c) {  // Multiple lonely ifs
      // ...
    }
  }
}
```

### ✅ Correct

```typescript
if (condition1) {
  doSomething();
} else if (condition2) {
  doSomethingElse();
}

// Cleaner chain
if (a) {
  // ...
} else if (b) {
  // ...
} else if (c) {
  // ...
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'quality/no-lonely-if': 'warn'
  }
}
```

## Related Rules

- [`no-nested-ternary`](./no-nested-ternary.md) - Prevents nested ternaries
- [`cognitive-complexity`](./cognitive-complexity.md) - Complexity limits

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

- **[ESLint no-lonely-if](https://eslint.org/docs/latest/rules/no-lonely-if)** - Built-in ESLint rule

