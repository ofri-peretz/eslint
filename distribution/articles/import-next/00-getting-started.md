---
title: 'Getting Started with eslint-plugin-import-next'
published: true
description: 'Drop-in replacement for eslint-plugin-import. 100x faster, flat config native, plus bundle optimization rules.'
tags: javascript, eslint, imports, tutorial
cover_image:
series: Getting Started
---

**Up to 100x faster than eslint-plugin-import. Flat config native. Bundle optimization included.**

> 🔄 **Drop-in replacement** — 100% compatible with all `eslint-plugin-import` rules, but faster, LLM-optimized error messages, and fewer false positives/negatives.

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

| Benchmark            | Speedup            |
| -------------------- | ------------------ |
| Core Rules (9 rules) | **5.2x** faster    |
| Recommended Preset   | **5.5x** faster    |
| `no-cycle` Rule Only | **100x** faster 🔥 |

_Tested on 5,000-10,000 files. [Full benchmark methodology →](https://github.com/ofri-peretz/eslint-benchmark-suite)_

> 📊 **[See the full benchmark comparison →](/ofri-peretz/eslint-plugin-import-vs-import-next-100x-faster-benchmarks)**

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

## Quick Install

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)
📖 [Migration Guide](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#migration)
📖 [Performance Benchmarks](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#benchmarks)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Tired of slow linting? Share your experience in the comments!**

For more updates, follow me on:

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
