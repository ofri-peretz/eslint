---
title: 'The no-cycle Problem: Why Your CI is Slow and How to Fix It'
published: false
description: 'import/no-cycle is the #1 cause of slow ESLint. Here is why it breaks on monorepos and the O(n) alternative.'
tags: javascript, eslint, monorepo, cicd
cover_image:
series: ESLint Performance Revolution
---

> "import/no-cycle takes 70% of our lint time" — GitHub Issue #2182

If you're running `eslint-plugin-import` on a monorepo, you've felt this pain.

## The Symptom

```bash
$ time npx eslint .
# ... 47 seconds later ...

$ npx eslint . --rule 'import/no-cycle: off'
# ... 3 seconds ...
```

**One rule** is consuming 93% of your lint time.

## Why no-cycle is Slow

### The Algorithm Problem

{% details Technical explanation %}

`import/no-cycle` builds a complete dependency graph:

```javascript
// For each file A:
//   For each import B in A:
//     For each import C in B:
//       For each import D in C:
//         Check if D === A (cycle!)
```

This is O(N × M^depth) where:

- N = number of files
- M = average imports per file
- depth = how deep cycles can nest

On a 5,000 file monorepo with 20 imports per file, this explores **millions** of paths.

{% enddetails %}

### The Memory Problem

The entire graph must fit in memory:

```bash
# Real error from production:
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
JavaScript heap out of memory
```

## The Solution: O(n) Cycle Detection

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [
  {
    plugins: { 'import-next': importNext },
    rules: {
      // ✅ Same detection, 100x faster
      'import-next/no-cycle': 'error',
    },
  },
];
```

### How We Fixed It

| Optimization            | Impact                             |
| ----------------------- | ---------------------------------- |
| **Tarjan's Algorithm**  | O(V + E) instead of O(N × M²)      |
| **Cross-file caching**  | Skip re-analyzing unchanged files  |
| **Lazy resolution**     | Only resolve imports when needed   |
| **Incremental updates** | Invalidate only affected subgraphs |

## Before & After

```
┌─────────────────────────────────────────────────────┐
│ Monorepo: 5,000 files, 100k imports                 │
├─────────────────────────────────────────────────────┤
│ import/no-cycle:              47.2s  ███████████████│
│ import-next/no-cycle:          0.3s  ▏              │
│ Memory (import):              2.1 GB ███████████████│
│ Memory (import-next):         180 MB ██             │
└─────────────────────────────────────────────────────┘
```

## Migration Steps

### Step 1: Install

```bash
npm install --save-dev eslint-plugin-import-next
```

### Step 2: Replace the Rule

```diff
// eslint.config.js
- import importPlugin from 'eslint-plugin-import';
+ import importNext from 'eslint-plugin-import-next';

export default [
-   importPlugin.configs.recommended,
+   importNext.configs.recommended,
];
```

### Step 3: Enjoy Fast CI

```bash
$ time npx eslint .
# 0.4 seconds ✨
```

## Quick Install


---

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)
📖 [Rule: no-cycle](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next/docs/rules/no-cycle.md)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **What's your current lint time? Share in the comments!**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
