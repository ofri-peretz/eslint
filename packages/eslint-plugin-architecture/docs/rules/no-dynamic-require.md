# no-dynamic-require

> **Keywords:** dynamic require, CommonJS, static analysis, bundler, ESLint rule, webpack, LLM-optimized

Forbid `require()` calls with non-literal arguments. This rule is part of [`@eslint/eslint-plugin-architecture`](https://www.npmjs.com/package/@eslint/eslint-plugin-architecture).

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
    'architecture/no-dynamic-require': 'warn'
  }
}
```

## Related Rules

- [`no-commonjs`](./no-commonjs.md) - Prevent CommonJS usage
- [`no-unsafe-dynamic-require`](./no-unsafe-dynamic-require.md) - Security-focused variant

## Further Reading

- **[Webpack Dynamic Imports](https://webpack.js.org/guides/code-splitting/#dynamic-imports)** - Code splitting guide
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = externalSource();
processValue(value); // Variable origin not tracked
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Cross-Module Data Flow

**Why**: ESLint rules analyze one file at a time. Values imported from other modules cannot be traced.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Apply the same rule to imported modules. Use module boundaries and explicit exports.



