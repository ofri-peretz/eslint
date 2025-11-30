# no-nodejs-modules

> **Keywords:** Node.js, browser, modules, fs, path, ESLint rule, isomorphic, LLM-optimized

Prevents importing Node.js built-in modules in browser-targeted code. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (compatibility)                                                |
| **Auto-Fix**   | ❌ No (requires alternative)                                         |
| **Category**   | Development                                                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Browser code, isomorphic libraries, frontend applications            |

## Rule Details

Node.js built-in modules like `fs`, `path`, `crypto` are not available in browser environments and will cause runtime errors.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 🌐 **Browser errors**     | Runtime crashes                 | Use browser alternatives  |
| 📦 **Bundle bloat**       | Polyfills increase size         | Avoid Node.js modules     |
| 🔄 **Isomorphic code**    | Different behavior per env      | Universal libraries       |

## Examples

### ❌ Incorrect

```typescript
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
```

### ✅ Correct

```typescript
// Use browser-compatible alternatives
import { join } from 'path-browserify';
import { sha256 } from 'js-sha256';

// Or conditional imports
const fs = typeof window === 'undefined' ? require('fs') : null;
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-nodejs-modules': 'error'
  }
}
```

## Related Rules

- [`prefer-node-protocol`](./prefer-node-protocol.md) - Use node: protocol for Node.js code

## Further Reading

- **[Node.js Built-in Modules](https://nodejs.org/api/)** - Node.js API reference

