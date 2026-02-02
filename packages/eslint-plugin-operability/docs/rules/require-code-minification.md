---
title: require-code-minification
description: Require minification configuration in build tools
tags: ['quality', 'operability', 'production', 'build', 'cwe-656']
category: quality
autofix: false
---

> **Keywords:** minification, webpack, build, production, obfuscation, CWE-656, bundle size
> **CWE:** [CWE-656](https://cwe.mitre.org/data/definitions/656.html)


<!-- @rule-summary -->
Require minification configuration in build tools
<!-- @/rule-summary -->

Detects build configurations where minification is explicitly disabled. This rule is part of [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) and provides LLM-optimized error messages.

**📋 Quality rule** | **🟡 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-656](https://cwe.mitre.org/data/definitions/656.html) (Security Through Obscurity) |
| **Severity**      | Low (quality concern)                                                                   |
| **Auto-Fix**      | ❌ No auto-fix (build configuration change)                                             |
| **Category**      | Quality / Operability                                                                   |
| **Best For**      | Webpack, Vite, or similar build configurations                                          |

## Why Minification Matters

**Purpose:** Minification reduces bundle size and provides a basic layer of code obscurity, making reverse engineering slightly more difficult.

**Concerns:** While not a security feature by itself, disabling minification:

- Exposes readable source code in production
- Increases bundle size and load times
- Makes debugging by attackers easier
- May indicate misconfigured production builds

## Rule Details

This rule detects:

- `minimize: false` in webpack/build configurations
- Explicitly disabled minification settings

## Why This Matters

| Risk                    | Impact                                 | Solution                      |
| ----------------------- | -------------------------------------- | ----------------------------- |
| 📦 **Bundle Size**      | Larger downloads, slower load times    | Enable minification           |
| 🔍 **Source Exposure**  | Readable code aids reverse engineering | Use production build settings |
| ⚙️ **Misconfiguration** | Indicates potential build issue        | Review build configuration    |

## Configuration

This rule has no configuration options.

```javascript
{
  rules: {
    'operability/require-code-minification': 'warn'
  }
}
```

## Examples

### ❌ Incorrect

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    minimize: false, // ❌ Minification disabled in production
  },
};

// vite.config.js
export default {
  build: {
    minify: false, // ❌ Disabled minification
  },
};
```

### ✅ Correct

```javascript
// webpack.config.js - Production
module.exports = {
  mode: 'production',
  optimization: {
    minimize: true, // ✅ Minification enabled
  },
};

// webpack.config.js - Development (OK to disable)
module.exports = {
  mode: 'development',
  optimization: {
    minimize: false, // ✅ OK for development
  },
};

// vite.config.js
export default {
  build: {
    minify: 'terser', // ✅ Terser minification
  },
};

// Default behavior (minification enabled by default in production)
module.exports = {
  mode: 'production',
  // minimize defaults to true in production mode ✅
};
```

## Build Configuration Best Practices

### Webpack Production Config

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log
            drop_debugger: true, // Remove debugger statements
          },
          mangle: true, // Shorten variable names
          output: {
            comments: false, // Remove comments
          },
        },
      }),
    ],
  },
};
```

### Vite Production Config

```javascript
export default {
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
};
```

### Environment-Based Configuration

```javascript
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  optimization: {
    minimize: isProduction, // ✅ Only in production
  },
};
```

## When Not To Use It

Disable this rule if:

- You're configuring development-only builds
- You have a specific debugging requirement
- Source maps provide sufficient debugging capability

```javascript
// eslint-disable-next-line operability/require-code-minification
optimization: {
  minimize: false; // Intentionally disabled for debugging
}
```

## Related Rules

- [`no-debug-code-in-production`](./no-debug-code-in-production.md) - Remove debug code
- [`no-console-log`](./no-console-log.md) - Control console statements

## Further Reading

- **[CWE-656: Reliance on Security Through Obscurity](https://cwe.mitre.org/data/definitions/656.html)** - Official CWE entry
- **[Webpack Optimization](https://webpack.js.org/configuration/optimization/)** - Webpack documentation
- **[Vite Build Options](https://vitejs.dev/config/build-options.html)** - Vite documentation
- **[Terser Options](https://terser.org/docs/api-reference/)** - Terser minifier options