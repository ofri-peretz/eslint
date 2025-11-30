# no-mutable-exports

> **Keywords:** mutable, exports, const, let, var, ESLint rule, immutability, LLM-optimized

Forbid mutable exports (using `let` or `var`). This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (architecture)                                               |
| **Auto-Fix**   | ❌ No (may change behavior)                                          |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Predictable module behavior, avoiding side effects                   |

## Rule Details

Mutable exports can be modified from outside the module, leading to unpredictable behavior.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🔄 **Unexpected changes** | External modification           | Use const                 |
| 🐛 **Hidden state**       | Hard to debug                   | Immutable exports         |
| 🧪 **Testing**            | State leaks between tests       | Fresh module state        |

## Examples

### ❌ Incorrect

```typescript
export let counter = 0;  // Can be modified externally
export var config = {};  // Mutable
```

### ✅ Correct

```typescript
export const counter = 0;  // Immutable binding
export const config = Object.freeze({});  // Frozen object

// If mutation is needed, export functions
let _counter = 0;
export const getCounter = () => _counter;
export const increment = () => _counter++;
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-mutable-exports': 'warn'
  }
}
```

## Related Rules

- [`no-default-export`](./no-default-export.md) - Export style control

## Further Reading

- **[ES Modules - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)** - Module guide

