---
title: no-console-spaces
description: Disallow leading/trailing whitespace in console arguments. This rule is part of eslint-plugin-conventions.
tags: ['quality', 'conventions', 'style']
category: quality
autofix: code
---

> **Keywords:** console, logging, spaces, formatting, ESLint rule, auto-fix, LLM-optimized


<!-- @rule-summary -->
Disallow leading/trailing whitespace in console arguments. This rule is part of eslint-plugin-conventions.
<!-- @/rule-summary -->

Disallow leading/trailing whitespace in console arguments. This rule is part of [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ✅ Yes, for strings (removes the redundant spaces); templates are reported only |
| **Category**   | Development                                                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Clean console output, consistent logging                             |

## Rule Details

Console methods join their arguments with a space, so a space on the side of
a string argument that touches another argument prints twice. The rule
reports a leading space on an argument that has another argument before it,
and a trailing space on an argument that has another after it, in quoted
strings and template literals (only the outer edges of a template count; the
spaces around an interpolation are its interior).

It reads the global `console` by binding — `console.log`, `console['log']`,
`globalThis.console.log`, or the `console` / `node:console` module — on
`log`, `debug`, `info`, `warn`, `error`, `table`, `trace`, `group` and
`groupCollapsed`.

It does not report:

- a leading space on the first argument or a trailing space on the last (or
  only) one: nothing is joined there, so the space is the message's own (an
  indented line, a prompt);
- a string that is only whitespace (a deliberate spacer);
- a `console` the code binds itself, such as an injected logger parameter.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📝 **Double spaces**      | Inconsistent output             | Remove redundant spaces   |
| 🔍 **Log parsing**        | Affects log analysis            | Clean formatting          |

## Examples

### ❌ Incorrect

```typescript
console.log('Value: ', value);  // Double space in output
console.log(value, ' items');   // Double space in output
console.log(' Debug: ', data);  // The trailing space doubles the separator
```

### ✅ Correct

```typescript
console.log('hello', 'world');
console.log('Value:', value);
console.log('  indented line'); // only argument: the indent is the message's
console.log(count, 'items ');   // last argument: nothing follows it
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'conventions/no-console-spaces': 'warn'
  }
}
```

## Related Rules

- [`no-console-log`](./no-console-log.md) - Console logging control

## Further Reading

- **[Console API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Console)** - Console reference
## Known False Negatives

- A `console` reached through another object (`deps.console.log(...)`) or a
  wrapper function is not recognised as the global console.
- A string assigned to a variable first (`const label = 'a '; console.log(label, b)`)
  is not read.
