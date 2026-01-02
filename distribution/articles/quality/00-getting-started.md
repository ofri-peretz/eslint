---
title: 'Getting Started with eslint-plugin-quality'
published: false
description: 'Code quality in 60 seconds. Correctness rules, not style opinions. The enterprise alternative to Unicorn.'
tags: javascript, eslint, quality, typescript
cover_image:
series: Getting Started
---

**Correctness over style. Maintainability over syntax sugar.**

> For any **JavaScript/TypeScript** codebase that values maintainability over style debates.

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

## Run ESLint

```bash
npx eslint .
```

You'll see output like:

```bash
src/services/user-service.ts
  45:1  error  🔧 Function exceeds 50 lines (current: 127)
               Fix: Extract into smaller functions

src/handlers/process.ts
  82:5  error  🔧 Nesting depth exceeds 4 levels (current: 6)
               Fix: Use early returns or extract conditions

src/utils/api.ts
  23:3  error  🔧 Floating promise without await or .catch()
               Fix: Add await or handle the rejection
```

## Quick Wins

### Complexity

```javascript
// ❌ Deep nesting
function process(data) {
  if (data) {
    if (data.valid) {
      if (data.items) {
        if (data.items.length > 0) {
          // 4 levels deep...
        }
      }
    }
  }
}

// ✅ Early returns
function process(data) {
  if (!data?.valid) return;
  if (!data.items?.length) return;
  // Clear logic
}
```

### Error Handling

```javascript
// ❌ Floating promise
fetchUser(id);

// ✅ Handled promise
await fetchUser(id);
// or
fetchUser(id).catch(handleError);
```

## Custom Configuration

```javascript
// eslint.config.js
import quality from 'eslint-plugin-quality';

export default [
  quality.configs.recommended,
  {
    rules: {
      // Adjust complexity thresholds
      'quality/max-function-lines': ['error', { max: 80 }],
      'quality/no-deep-nesting': ['error', { maxDepth: 5 }],

      // Allow TODO in development
      'quality/no-todo-comments': 'warn',
    },
  },
];
```

## Strongly-Typed Options (TypeScript)

```typescript
// eslint.config.ts
import quality, { type RuleOptions } from 'eslint-plugin-quality';

const complexityOptions: RuleOptions['max-function-lines'] = {
  max: 100,
  skipComments: true,
  skipBlankLines: true,
};

export default [
  quality.configs.recommended,
  {
    rules: {
      'quality/max-function-lines': ['error', complexityOptions],
    },
  },
];
```

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

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
