---
title: 'Getting Started with eslint-plugin-import-next'
published: false
description: 'Drop-in replacement for eslint-plugin-import. 100x faster, flat config native, plus bundle optimization rules.'
tags: javascript, eslint, imports, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-import-next

**100x faster than eslint-plugin-import. Flat config native. Bundle optimization included.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-import-next
```

## Flat Config

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [importNext.configs.recommended];
```

## Run ESLint

```bash
npx eslint .
```

## Performance

```
┌─────────────────────────────────────────────────────┐
│ Linting 10,000 files                                │
├─────────────────────────────────────────────────────┤
│ eslint-plugin-import:      45.0s  ███████████████████│
│ eslint-plugin-import-next:  0.4s  ▏                  │
└─────────────────────────────────────────────────────┘
```

## Available Presets

```javascript
// Full compatibility with eslint-plugin-import
importNext.configs.recommended;

// TypeScript-optimized
importNext.configs.typescript;

// Bundle size optimization
importNext.configs.performance;

// Enterprise governance
importNext.configs.enterprise;
```

## Rule Categories

| Category            | Rules | Examples                                   |
| ------------------- | ----- | ------------------------------------------ |
| Static Analysis     | 15    | no-unresolved, named, namespace            |
| Module Systems      | 8     | no-commonjs, no-amd, unambiguous           |
| Style Guide         | 10    | order, newline-after-import, first         |
| Bundle Optimization | 5     | no-barrel-file, prefer-direct-import       |
| Enterprise          | 3     | enforce-team-boundaries, no-legacy-imports |

## Migration from eslint-plugin-import

```bash
# Remove old plugin
npm uninstall eslint-plugin-import eslint-import-resolver-typescript

# Install new plugin
npm install --save-dev eslint-plugin-import-next
```

```javascript
// Update config
// Before:
import importPlugin from 'eslint-plugin-import';
export default [importPlugin.configs.recommended];

// After:
import importNext from 'eslint-plugin-import-next';
export default [importNext.configs.recommended];
```

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-import-next

# Config (eslint.config.js)
import importNext from 'eslint-plugin-import-next';
export default [importNext.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)
📖 [Migration Guide](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#migration)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
📖 [Performance Benchmarks](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#benchmarks)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Tired of slow linting? Give it a try!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
