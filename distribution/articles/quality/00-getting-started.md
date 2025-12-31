---
title: 'Getting Started with eslint-plugin-quality'
published: false
description: 'Code quality in 60 seconds. Correctness rules, not style opinions. The enterprise alternative to Unicorn.'
tags: javascript, eslint, quality, tutorial
cover_image:
series: Getting Started
---

# Getting Started with eslint-plugin-quality

**Correctness over style. Maintainability over syntax sugar.**

## Quick Install

```bash
npm install --save-dev eslint-plugin-quality
```

## Flat Config

```javascript
// eslint.config.js
import quality from 'eslint-plugin-quality';

export default [quality.configs.recommended];
```

## Philosophy

| eslint-plugin-unicorn  | eslint-plugin-quality  |
| ---------------------- | ---------------------- |
| Prefer array.flat()    | No complexity hotspots |
| Prefer spread operator | Require error handling |
| Prefer for...of        | No floating promises   |
| Style preferences      | Actual bug prevention  |

## Rule Categories

| Category       | Examples                               |
| -------------- | -------------------------------------- |
| Complexity     | no-deep-nesting, max-function-lines    |
| Error Handling | require-error-handling, no-empty-catch |
| Development    | no-todo-comments, no-debug-code        |
| Duplication    | no-duplicate-code                      |
| Deprecation    | no-deprecated-api                      |

## Quick Reference

```bash
# Install
npm install --save-dev eslint-plugin-quality

# Config (eslint.config.js)
import quality from 'eslint-plugin-quality';
export default [quality.configs.recommended];

# Run
npx eslint .
```

---

📦 [npm: eslint-plugin-quality](https://www.npmjs.com/package/eslint-plugin-quality)
📖 [Philosophy](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-quality#philosophy)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **Correctness over style. Try it!**

[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
