# no-dynamic-require

> **Keywords:** dynamic require, CommonJS, static analysis, bundler, ESLint rule, webpack, LLM-optimized

Forbid `require()` calls with non-literal arguments. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (architecture)                                               |
| **Auto-Fix**   | ❌ No (requires architecture change)                                 |
| **Category**   | Architecture                                                         |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Bundler optimization, static analysis                                |

## Rule Details

Dynamic `require()` calls prevent static analysis and break tree-shaking in bundlers.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📦 **Bundle size**        | Can't tree-shake                | Static imports            |
| 🔍 **Static analysis**    | Tools can't analyze deps        | Literal paths             |
| 🔒 **Security**           | Arbitrary module loading        | Explicit imports          |

## Examples

### ❌ Incorrect

```typescript
const moduleName = getModuleName();
const mod = require(moduleName);  // Dynamic

const plugin = require(`./plugins/${name}`);  // Template literal

const handler = require(path.join(__dirname, name));  // Computed
```

### ✅ Correct

```typescript
// Static requires
const mod = require('./module');

// Dynamic import (when truly needed)
const mod = await import(`./plugins/${name}`);

// Explicit mapping
const plugins = {
  a: require('./plugins/a'),
  b: require('./plugins/b'),
};
const plugin = plugins[name];
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-dynamic-require': 'warn'
  }
}
```

## Related Rules

- [`no-commonjs`](./no-commonjs.md) - Prevent CommonJS usage
- [`no-unsafe-dynamic-require`](./no-unsafe-dynamic-require.md) - Security-focused variant

## Further Reading

- **[Webpack Dynamic Imports](https://webpack.js.org/guides/code-splitting/#dynamic-imports)** - Code splitting guide

