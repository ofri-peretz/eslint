---
title: no-magic-numbers
description: "Disallow magic numbers (numeric literals without a named constant)"
tags: ['quality', 'conventions']
category: quality
autofix: suggestions
---

> Disallow numeric literals whose meaning is not carried by a named constant

<!-- @rule-summary -->

Disallow magic numbers (numeric literals without a named constant)
<!-- @/rule-summary -->

## Rule Details

`if (retries > 3)` makes the reader reverse-engineer what `3` means;
`if (retries > MAX_RETRIES)` does not. The rule reports numeric literals used
directly in logic and offers a suggestion to extract a named constant.

Structural, allowlisted exceptions keep the rule quiet where a bare number IS
the clearest spelling: `0`, `1`, `-1`, `2` (indexing, off-by-one arithmetic,
parity), and any literal already assigned to a SCREAMING_CASE constant.

## Examples

### ❌ Incorrect

```js
setTimeout(poll, 5000);
if (attempts > 3) giveUp();
```

### ✅ Correct

```js
const TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;

setTimeout(poll, TIMEOUT_MS);
if (attempts > MAX_RETRIES) giveUp();

const first = items[0];   // structural allowlist: 0, 1, -1, 2
```

## Configuration Examples

### Basic Usage

```js
// eslint.config.js
{
  rules: {
    'conventions/no-magic-numbers': 'warn',
  },
}
```

## When Not To Use It

Test files and fixtures, where literal values are the point. Scope the rule to
production source in your config rather than disabling it globally.
