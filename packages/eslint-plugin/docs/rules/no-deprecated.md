# no-deprecated

> **Keywords:** deprecated, JSDoc, TypeScript, migration, ESLint rule, warnings, LLM-optimized

Disallow using deprecated variables, functions, and classes. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (maintenance)                                                |
| **Auto-Fix**   | ❌ No (requires migration)                                           |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | API migrations, removing legacy code usage                           |

## Rule Details

Detects usage of items marked with `@deprecated` JSDoc tag or TypeScript deprecation.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Breaking changes**   | Deprecated APIs may be removed  | Migrate to new API        |
| 🔧 **Maintenance**        | Accumulates technical debt      | Update usage              |
| 📖 **Documentation**      | Shows intent to remove          | Follow migration path     |

## Examples

### ❌ Incorrect

```typescript
/**
 * @deprecated Use newFunction instead
 */
function oldFunction() {}

oldFunction();  // ❌ Using deprecated function

/** @deprecated */
class LegacyService {}

const service = new LegacyService();  // ❌ Using deprecated class
```

### ✅ Correct

```typescript
// Use the new API
function newFunction() {}
newFunction();

// Use replacement class
class ModernService {}
const service = new ModernService();
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-deprecated': 'warn'
  }
}
```

## Related Rules

- [`no-deprecated-api`](./no-deprecated-api.md) - Specific API deprecations

## Further Reading

- **[@deprecated - JSDoc](https://jsdoc.app/tags-deprecated.html)** - JSDoc deprecation
- **[TypeScript Deprecated](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/#deprecated-tag)** - TS support

