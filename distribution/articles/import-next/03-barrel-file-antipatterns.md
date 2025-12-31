---
title: '5 Barrel File Anti-Patterns Killing Your Bundle Size'
published: false
description: 'Barrel files look convenient but destroy tree-shaking. Here are 5 patterns to avoid and the ESLint rules to enforce them.'
tags: javascript, webpack, bundling, eslint
cover_image:
series: Bundle Optimization
---

# 5 Barrel File Anti-Patterns Killing Your Bundle Size

Barrel files (`index.ts` re-exports) look clean:

```typescript
// components/index.ts
export * from './Button';
export * from './Modal';
export * from './Table';
// ... 50 more components
```

But they're **silently bloating** your production bundle.

## The Hidden Cost

```javascript
// You import ONE component:
import { Button } from '@company/ui';

// Bundler loads ALL 50 components to find it
// Result: 500KB instead of 5KB
```

**Tree-shaking can't save you.** Here's why.

## Anti-Pattern #1: Deep Barrel Chains

```typescript
// ❌ components/forms/index.ts
export * from './inputs';
export * from './selects';

// ❌ components/forms/inputs/index.ts
export * from './TextInput';
export * from './NumberInput';

// ❌ Import triggers entire chain
import { TextInput } from '@company/ui';
// Loads: forms → inputs → ALL inputs → ALL selects
```

### ✅ The Fix

```typescript
// Direct import, no barrel
import { TextInput } from '@company/ui/components/forms/inputs/TextInput';
```

### ESLint Rule

```javascript
import importNext from 'eslint-plugin-import-next';

export default [
  {
    rules: {
      'import-next/no-barrel-import': 'error',
    },
  },
];
```

## Anti-Pattern #2: Side-Effect Exports

```typescript
// ❌ index.ts with side effects
import './polyfills'; // Side effect!
export * from './Button';
export * from './Modal';
```

Side effects **prevent** tree-shaking entirely.

## Anti-Pattern #3: Default + Named Mix

```typescript
// ❌ Hard for bundlers to analyze
export { default as Button } from './Button';
export { ButtonProps } from './Button';
export * from './Modal';
```

## Anti-Pattern #4: Circular Barrel Deps

```typescript
// ❌ components/index.ts
export * from './Button'; // Button imports from utils/index.ts

// ❌ utils/index.ts
export * from './theme'; // theme imports from components/index.ts
```

Circular barrels = **entire codebase in bundle**.

## Anti-Pattern #5: Monorepo Cross-Package Barrels

```typescript
// ❌ packages/ui/index.ts
export * from './Button';
export * from './Modal';
// ... 100 components

// ❌ packages/app/src/App.tsx
import { Button } from '@company/ui'; // Loads ALL 100 components
```

## The Bundle Size Impact

| Pattern       | Bundle Size      | Tree-Shaken |
| ------------- | ---------------- | ----------- |
| Barrel import | 487 KB           | ❌          |
| Direct import | 12 KB            | ✅          |
| **Savings**   | **475 KB (97%)** |             |

## ESLint Rules to Enforce This

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [
  {
    plugins: { 'import-next': importNext },
    rules: {
      // Block barrel file creation
      'import-next/no-barrel-file': 'error',

      // Block imports from barrels
      'import-next/no-barrel-import': 'error',

      // Suggest tree-shakeable alternatives
      'import-next/prefer-tree-shakeable-imports': 'warn',

      // Enforce direct paths
      'import-next/prefer-direct-import': 'warn',

      // Block full package imports
      'import-next/no-full-package-import': 'error',
    },
  },
];
```

## Quick Install

{% cta https://npmjs.com/package/eslint-plugin-import-next %}
📦 npm install eslint-plugin-import-next
{% endcta %}

```javascript
import importNext from 'eslint-plugin-import-next';
export default [importNext.configs.performance];
```

---

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)
📖 [Bundle Optimization Preset](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#performance-preset)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **What's the biggest barrel file in your codebase? Drop a comment!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
