# no-lonely-if

> **Keywords:** if, else, refactoring, readability, ESLint rule, code quality, LLM-optimized

Disallow `if` statements as the only statement in `else` blocks. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-lonely-if': 'warn'
  }
}
```

## Related Rules

- [`no-nested-ternary`](./no-nested-ternary.md) - Prevents nested ternaries
- [`cognitive-complexity`](./cognitive-complexity.md) - Complexity limits

## Further Reading

- **[ESLint no-lonely-if](https://eslint.org/docs/latest/rules/no-lonely-if)** - Built-in ESLint rule

