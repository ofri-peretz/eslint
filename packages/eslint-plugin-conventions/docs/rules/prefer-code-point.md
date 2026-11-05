---
title: prefer-code-point
description: Prefer String.codePointAt() over String.charCodeAt(). This rule is part of eslint-plugin-conventions.
tags: ['quality', 'conventions', 'style']
category: quality
autofix: false
---

> **Keywords:** codePointAt, charCodeAt, Unicode, emoji, ESLint rule, auto-fix, LLM-optimized


<!-- @rule-summary -->
Prefer String.codePointAt() over String.charCodeAt(). This rule is part of eslint-plugin-conventions.
<!-- @/rule-summary -->

Prefer `String.codePointAt()` over `String.charCodeAt()`. This rule is part of [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (correctness)                                                |
| **Auto-Fix**   | ❌ No                                                                |
| **Category**   | Quality                                                              |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Unicode handling, emoji support                                      |

## Rule Details

`charCodeAt()` only works for Basic Multilingual Plane characters. `codePointAt()` handles all Unicode including emoji.

The rule reports a call of a `charCodeAt` method in every spelling:
`s.charCodeAt(0)`, `s['charCodeAt'](0)`, an optional call (`s?.charCodeAt(0)`)
and a non-null receiver (`s!.charCodeAt(0)`). It does not report
`codePointAt`, a method chosen by a runtime key (`s[method](0)`), or a plain
function that happens to be named `charCodeAt`. The rule has no options.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 😀 **Emoji handling**     | Incorrect code points           | codePointAt()             |
| 🌍 **Unicode support**    | Astral characters fail          | Full Unicode support      |
| 📏 **String length**      | Surrogate pairs miscounted      | Correct iteration         |

## Examples

### ❌ Incorrect

```typescript
const code = string.charCodeAt(0);  // Fails for emoji
'😀'.charCodeAt(0);  // Returns 55357 (wrong!)
```

### ✅ Correct

```typescript
const code = string.codePointAt(0);  // Works for all Unicode
'😀'.codePointAt(0);  // Returns 128512 (correct!)

// Iterate over code points
for (const char of string) {
  const codePoint = char.codePointAt(0);
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'conventions/prefer-code-point': 'warn'
  }
}
```

## Related Rules

- [`prefer-dom-node-text-content`](./prefer-dom-node-text-content.md) - DOM text handling

## Further Reading

- **[codePointAt() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt)** - MDN reference
## Known False Negatives

- `String.prototype.charCodeAt.call(s, 0)` and a reference that is called
  later (`const at = s.charCodeAt; at.call(s, 0)`) are not reported.
- `String.fromCharCode()` (the inverse, which `String.fromCodePoint()`
  replaces) is not in scope.
