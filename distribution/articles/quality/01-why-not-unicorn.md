---
title: 'Why We Stopped Using eslint-plugin-unicorn'
published: false
description: 'eslint-plugin-unicorn has 100+ rules. Half are style preferences. Here is why we built the enterprise alternative.'
tags: javascript, eslint, quality, programming
cover_image:
series: Code Quality
---

`eslint-plugin-unicorn` is popular. 100+ rules. Sindre's stamp of approval.

**But half those rules are just opinions.**

## The Problem

```javascript
// Unicorn says this is wrong:
for (let i = 0; i < array.length; i++) {}

// Unicorn wants this:
for (const item of array) {
}
```

Is the `for` loop actually wrong? No. It's just style.

## Style vs Correctness

| eslint-plugin-unicorn | Type  | Impact   |
| --------------------- | ----- | -------- |
| `prefer-array-flat`   | Style | Zero     |
| `prefer-spread`       | Style | Zero     |
| `prefer-module`       | Style | Zero     |
| `no-nested-ternary`   | Style | Marginal |
| `prefer-for-of`       | Style | Zero     |

| eslint-plugin-quality    | Type            | Impact   |
| ------------------------ | --------------- | -------- |
| `no-complexity-hotspots` | Maintainability | High     |
| `no-deep-nesting`        | Maintainability | High     |
| `require-error-handling` | Reliability     | Critical |
| `no-floating-promise`    | Bugs            | Critical |
| `max-function-lines`     | Maintainability | Medium   |

## The Enterprise Reality

Unicorn's rules create noise in code review:

> "Fix: Use spread operator instead of Array.from"

Meanwhile, actual bugs ship:

```javascript
// No unicorn rule catches this:
async function getData() {
  fetch('/api/data'); // 🐛 Floating promise!
}
```

## Our Philosophy: Correctness > Style

### Unicorn: Syntax Sugar

```javascript
// Unicorn: "Use Array.from({ length }) pattern"
const arr = Array.from({ length: 5 }, (_, i) => i);

// Who cares? Both work. Neither has bugs.
const arr = [];
for (let i = 0; i < 5; i++) arr.push(i);
```

### Quality: Actual Problems

```javascript
// Quality catches this:
function processData(data) {
  if (data) {
    if (data.items) {
      if (data.items.length > 0) {
        for (const item of data.items) {
          if (item.valid) {
            // Deeply nested = hard to maintain
          }
        }
      }
    }
  }
}
```

```bash
src/process.ts
  3:5  error  🏗️ Deep nesting detected (5 levels)
              Maintainability Impact: High
              Fix: Extract to separate functions or use early returns
```

## What Quality Catches

### 1. Complexity Hotspots

```javascript
// ❌ 25 cyclomatic complexity
function processOrder(order, user, settings, payment, shipping) {
  // 100 if/else branches
}
```

### 2. Swallowed Errors

```javascript
// ❌ Error hidden
try {
  await riskyOperation();
} catch (e) {
  // Empty catch block
}
```

### 3. Floating Promises

```javascript
// ❌ Promise result ignored
async function cleanup() {
  deleteFiles(); // Not awaited!
}
```

### 4. Unreachable Code

```javascript
// ❌ Dead code
function process() {
  return result;
  console.log('This never runs');
}
```

### 5. Inconsistent Returns

```javascript
// ❌ Sometimes returns, sometimes doesn't
function getValue(condition) {
  if (condition) {
    return value;
  }
  // Implicit undefined return
}
```

## ESLint Configuration

```javascript
// eslint.config.js
import qualityPlugin from 'eslint-plugin-quality';

export default [qualityPlugin.configs.recommended];
```

### Quality vs Unicorn Rules

| Concern        | Unicorn Rule | Quality Rule             |
| -------------- | ------------ | ------------------------ |
| Complexity     | ❌ None      | `no-complexity-hotspots` |
| Nesting        | ❌ None      | `no-deep-nesting`        |
| Error handling | ❌ None      | `require-error-handling` |
| Dead code      | ❌ None      | `no-unreachable`         |
| Promise safety | ❌ None      | `no-floating-promise`    |
| Function size  | ❌ None      | `max-function-lines`     |

## The Migration

```bash
# Remove style-focused plugin
npm uninstall eslint-plugin-unicorn

# Add correctness-focused plugin
npm install --save-dev eslint-plugin-quality
```

```javascript
// eslint.config.js
import qualityPlugin from 'eslint-plugin-quality';

export default [
  qualityPlugin.configs.recommended,
  // Keep specific unicorn rules you actually want:
  // { rules: { 'unicorn/prefer-node-protocol': 'error' } }
];
```

## Quick Install


```javascript
import qualityPlugin from 'eslint-plugin-quality';
export default [qualityPlugin.configs.recommended];
```

**Correctness over style. Maintainability over syntax sugar.**

---

📦 [npm: eslint-plugin-quality](https://www.npmjs.com/package/eslint-plugin-quality)
📖 [Philosophy](https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-quality#philosophy)

{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}

---

🚀 **What's your take: style rules or correctness rules?**

[GitHub](https://github.com/interlace-collie) | [X](https://x.com/ofriperetzdev) | [LinkedIn](https://linkedin.com/in/ofri-peretz) | [Dev.to](https://dev.to/ofriperetz)
