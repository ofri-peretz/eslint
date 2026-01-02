---
title: 'ESLint Flat Config: Why eslint-plugin-import Broke (And What We Did)'
published: false
description: 'eslint-plugin-import has 200+ open issues about flat config. Here is why, and a drop-in replacement that works.'
tags: javascript, eslint, typescript, configuration
cover_image:
series: ESLint Performance Revolution
---

ESLint 9.0 shipped flat config as the default. It's cleaner, faster, and... **broke half the ecosystem**.

The biggest casualty? `eslint-plugin-import`.

## The Problem

```javascript
// ❌ This doesn't work in ESLint 9+
// eslint.config.js
import importPlugin from 'eslint-plugin-import';

export default [
  importPlugin.configs.recommended, // 💥 Error
];
```

```bash
Error: Key "plugins": Cannot redefine plugin "import"
```

## Why It's Broken

### 1. Legacy Plugin Architecture

`eslint-plugin-import` was built for `.eslintrc`:

```javascript
// .eslintrc.js (legacy)
module.exports = {
  plugins: ['import'],
  extends: ['plugin:import/recommended'],
};
```

Flat config requires a different structure:

```javascript
// eslint.config.js (flat)
export default [
  {
    plugins: { import: importPlugin },
    rules: importPlugin.configs.recommended.rules,
  },
];
```

### 2. Resolver Incompatibility

The `eslint-import-resolver-typescript` package doesn't work with flat config out of the box.

### 3. Maintenance Status

Over 500 open issues. Slow release cadence. Many flat config issues unresolved.

## The Solution

```bash
npm uninstall eslint-plugin-import eslint-import-resolver-typescript
npm install --save-dev eslint-plugin-import-next
```

```javascript
// eslint.config.js ✅ Just works
import importNext from 'eslint-plugin-import-next';

export default [importNext.configs.recommended];
```

## Feature Comparison

| Feature      | eslint-plugin-import  | eslint-plugin-import-next |
| ------------ | --------------------- | ------------------------- |
| Flat Config  | ⚠️ Workarounds needed | ✅ Native                 |
| TypeScript   | Needs extra resolver  | ✅ Built-in               |
| ESLint 9+    | ⚠️ Issues             | ✅ Full support           |
| Rule Parity  | 45 rules              | 53 rules                  |
| Bundle Rules | ❌ None               | ✅ 5 new rules            |

## Migration Cheat Sheet

### Before (Legacy)

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['import'],
  extends: ['plugin:import/recommended'],
  settings: {
    'import/resolver': {
      typescript: true,
    },
  },
};
```

### After (Flat Config)

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [
  importNext.configs.recommended,
  importNext.configs.typescript, // TypeScript support built-in
];
```

## Rule Name Mapping

```javascript
// Most rules have the same name:
'import/no-cycle' → 'import-next/no-cycle'
'import/named' → 'import-next/named'
'import/no-unresolved' → 'import-next/no-unresolved'

// Just change the prefix!
```

## New Rules (Not in eslint-plugin-import)

```javascript
rules: {
  // Bundle optimization
  'import-next/no-barrel-file': 'error',
  'import-next/no-barrel-import': 'error',
  'import-next/prefer-tree-shakeable-imports': 'warn',
  'import-next/prefer-direct-import': 'warn',
  'import-next/no-full-package-import': 'error',

  // Enterprise governance
  'import-next/enforce-team-boundaries': 'error',
  'import-next/no-legacy-imports': 'warn',
}
```

## Quick Install


---

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)
📖 [Flat Config Guide](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#flat-config)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Had trouble migrating to flat config? Share your experience!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
