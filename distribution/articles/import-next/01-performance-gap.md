---
title: 'Why eslint-plugin-import Takes 45 Seconds (And How We Fixed It)'
published: true
description: 'Linting 10k files dropped from 45s to 0.4s. Here is the performance gap in eslint-plugin-import and the fix.'
tags: javascript, eslint, performance, typescript
cover_image:
canonical_url: https://dev.to/ofri-peretz/why-eslint-plugin-import-takes-45-seconds-and-how-we-fixed-it-2nmh
series: ESLint Performance Revolution
---

Your CI is slow. Your pre-commit hooks timeout. Developers disable linting to ship faster.

**The culprit?** `eslint-plugin-import`.

## The Performance Gap

```
┌─────────────────────────────────────────────────────┐
│ Linting 10,000 files                                │
├─────────────────────────────────────────────────────┤
│ eslint-plugin-import:      45.0s  ███████████████████│
│ eslint-plugin-import-next:  0.4s  ▏                  │
└─────────────────────────────────────────────────────┘
```

That's **100x faster**. Not a typo.

## Why Is It So Slow?

### 1. Cold Module Resolution

```javascript
// eslint-plugin-import resolves EVERY import from scratch
import { Button } from '@company/ui'; // Resolves entire package

// On every lint run. Every file. Every import.
```

### 2. The `no-cycle` Problem

{% details Click to see why no-cycle is a performance killer %}

The `import/no-cycle` rule builds a complete dependency graph.

For N files with M imports each:

- **Time complexity**: O(N × M²)
- **Memory**: Entire graph in RAM
- **Result**: OOM on large monorepos

```bash
# Real GitHub issues:
# "import/no-cycle takes 70% of lint time" (#2182)
# "OOM checking circular dependencies"
# "Minutes to lint a monorepo"
```

{% enddetails %}

### 3. No Caching

Every lint run repeats the same work. No incremental analysis.

## The Solution

We rebuilt module resolution with:

| Feature         | eslint-plugin-import | eslint-plugin-import-next  |
| --------------- | -------------------- | -------------------------- |
| Caching         | ❌ None              | ✅ Cross-file shared cache |
| Cycle Detection | O(N × M²)            | O(N) with memoization      |
| TypeScript      | 🐌 Slow resolver     | ⚡ Native TS support       |
| Flat Config     | ⚠️ Partial           | ✅ Native                  |

## Quick Migration

```bash
npm uninstall eslint-plugin-import
npm install --save-dev eslint-plugin-import-next
```

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [importNext.configs.recommended];
```

**That's it.** Same rules, 100x faster.

## Benchmark It Yourself


```bash
# Compare on your own codebase
time npx eslint --no-cache . # With eslint-plugin-import
time npx eslint --no-cache . # With eslint-plugin-import-next
```

---

📦 [npm: eslint-plugin-import-next](https://www.npmjs.com/package/eslint-plugin-import-next)
📖 [Migration Guide](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-import-next#migration)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Is your CI slow? Drop a comment with your lint times!**

_Follow for more performance deep-dives:_
[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)