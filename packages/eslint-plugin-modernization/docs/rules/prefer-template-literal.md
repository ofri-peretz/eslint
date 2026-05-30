---
title: prefer-template-literal
description: Prefer template literals over string concatenation with runtime values
tags: ['architecture', 'modernization']
category: modernization
autofix: code
---

> **Keywords:** template literal, string concatenation, plus operator, interpolation, ESLint rule, ES2015, auto-fix, LLM-optimized


<!-- @rule-summary -->
Prefer template literals over string concatenation with runtime values
<!-- @/rule-summary -->

Prefer template literals over string concatenation with `+` when at least one operand is a runtime value. This rule is part of [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization).

## Quick Summary

| Aspect         | Details                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| **Severity**   | Warning (modern JavaScript)                                              |
| **Auto-Fix**   | ✅ Yes (replaces `+` chain with a template literal)                      |
| **Category**   | Modernization |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                                  |
| **Best For**   | ES2015+ codebases, cleaner string building                               |

## Rule Details

Template literals with `${}` interpolation are more readable and less error-prone than concatenating strings with `+`. This rule flags any `+` expression that mixes string literals with runtime values (variables, member expressions, function calls, etc.) and rewrites the entire chain as a single template literal.

Pure string-literal concatenation (`"foo" + "bar"`) and numeric addition (`1 + 2`) are intentionally ignored.

### Why This Matters

| Issue                    | Impact                                     | Solution                       |
| ------------------------ | ------------------------------------------ | ------------------------------ |
| 📖 **Readability**       | Mixed `+` chains are hard to scan          | Use `\`...\${expr}...\``       |
| 🐛 **Implicit coercion** | `+` coerces operands unpredictably         | Interpolation is unambiguous   |
| 🔄 **Consistency**       | Multiple string-building styles in codebase | Standardize on template literals |

## Examples

### ❌ Incorrect

```javascript
// String concatenation with runtime value
const greeting = "Hello, " + name + "!";
const path = "/api/v1/" + resource + "/" + id;
const message = "Error: " + err.message;
```

### ✅ Correct

```javascript
// Template literal with interpolation
const greeting = `Hello, ${name}!`;
const path = `/api/v1/${resource}/${id}`;
const message = `Error: ${err.message}`;
// Pure string concat is fine (no runtime values)
const url = "https://" + "example.com";
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'modernization/prefer-template-literal': 'warn'
  }
}
```

## Related Rules

- [`prefer-at`](./prefer-at.md) - Modern array element access
- [`prefer-event-target`](./prefer-event-target.md) - Modern event handling

## Further Reading

- **[Template literals - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)** - MDN reference
- **[ES2015 Features](https://tc39.es/ecma262/)** - ECMAScript specification

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot always determine whether a variable holds a string or a number at the point of `+` use.

```javascript
// ❌ NOT DETECTED - ambiguous operand type
const result = a + b; // could be numeric addition
```

**Mitigation**: Add TypeScript types so the linter has enough signal, or review concatenation chains manually.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```javascript
// ❌ NOT DETECTED - Value from import
import { prefix } from './constants';
const path = prefix + resource; // Cross-file origin not tracked
```

**Mitigation**: Ensure imported string values are typed as `string` in TypeScript so the rule can flag the concatenation.
