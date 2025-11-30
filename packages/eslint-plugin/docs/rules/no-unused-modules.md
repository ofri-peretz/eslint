# no-unused-modules

> **Keywords:** unused, exports, dead code, tree-shaking, ESLint rule, cleanup, LLM-optimized

Report modules without any exports or exports that are not imported anywhere. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ❌ No (requires manual cleanup)                                      |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Dead code elimination, codebase cleanup                              |

## Rule Details

Detects:
- Exports that are never imported anywhere
- Files that export nothing (may be unused)

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📦 **Bundle size**        | Unused code in bundle           | Remove dead exports       |
| 🧹 **Code hygiene**       | Clutter in codebase             | Clean up unused code      |
| 🔍 **Maintainability**    | Confusion about usage           | Clear dependencies        |

## Examples

### ❌ Incorrect

```typescript
// utils.ts
export function usedFunction() {}
export function unusedFunction() {}  // Never imported anywhere!

// empty.ts
// File with no exports - possibly unused
```

### ✅ Correct

```typescript
// utils.ts
export function usedFunction() {}  // Imported in other files

// Or remove unused exports
// export function unusedFunction() {}  // Deleted
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-unused-modules': 'warn'
  }
}
```

## Related Rules

- [`no-extraneous-dependencies`](./no-extraneous-dependencies.md) - Dependency management

## Further Reading

- **[Tree Shaking - Webpack](https://webpack.js.org/guides/tree-shaking/)** - Dead code elimination

