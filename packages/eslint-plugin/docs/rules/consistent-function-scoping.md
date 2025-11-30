# consistent-function-scoping

> **Keywords:** function scope, hoisting, nested functions, ESLint rule, performance, LLM-optimized

Move functions to the highest possible scope. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (requires manual move)                                         |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Performance optimization, code organization                          |

## Rule Details

Functions that don't use variables from their parent scope should be moved to a higher scope.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚡ **Performance**        | Recreated on each call          | Move to outer scope       |
| 📖 **Readability**        | Deep nesting                    | Flatten structure         |
| 🧪 **Testability**        | Hard to test nested functions   | Extract for testing       |

## Examples

### ❌ Incorrect

```typescript
function outer() {
  // This function doesn't use any variables from outer
  function helper(x: number) {
    return x * 2;
  }
  
  return [1, 2, 3].map(helper);
}
```

### ✅ Correct

```typescript
// Moved to module scope
function helper(x: number) {
  return x * 2;
}

function outer() {
  return [1, 2, 3].map(helper);
}

// Or when closure is needed (correct nesting)
function createMultiplier(factor: number) {
  return function multiply(x: number) {  // Uses factor from parent
    return x * factor;
  };
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/consistent-function-scoping': 'warn'
  }
}
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Code complexity

## Further Reading

- **[Closures - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)** - JavaScript closures

