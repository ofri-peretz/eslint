---
title: no-unescaped-entities
description: no-unescaped-entities rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-unescaped-entities rule
<!-- @/rule-summary -->

# no-unescaped-entities

> **Keywords:** React, JSX, entities, quotes, apostrophe, ESLint rule, HTML, LLM-optimized

Detect unescaped HTML entities in JSX. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (syntax)                                                       |
| **Auto-Fix**   | ✅ Yes (escapes entities)                                            |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | All React/JSX projects                                               |

## Rule Details

A raw `"` in JSX text reads like an attribute delimiter that was never closed.
The rule reads the source as written, so the escaped spellings (`&quot;`,
`&#34;`, `{'"'}`) and quotes inside attribute values or string expressions
are not reported.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Syntax errors**      | JSX parsing fails               | Use HTML entities         |
| 📖 **Readability**        | Ambiguous characters            | Explicit escaping         |
| 🐛 **Silent failures**    | Wrong output                    | Proper encoding           |

## Examples

### ❌ Incorrect

```tsx
<div>Use "quotes"</div>
```

`>` and `}` in JSX text do not parse in TypeScript, and the parser reports
them before this rule runs.

### ✅ Correct

```tsx
<div>Hello World</div>
<div>Use &quot;quotes&quot;</div>
<div>Use {'"'}quotes{'"'}</div>
<div>It's working</div>
```

### Entity Reference

| Character | Entity       | Alternative      |
| --------- | ------------ | ---------------- |
| `>`       | `&gt;`       | `{'>'}` or `&#62;` |
| `<`       | `&lt;`       | `{'<'}` or `&#60;` |
| `"`       | `&quot;`     | `{'"'}` or `&#34;` |
| `'`       | `&apos;`     | `{"'"}` or `&#39;` |
| `}`       | `&#125;`     | `{'}'}`          |
| `{`       | `&#123;`     | `{'{'}`          |

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-unescaped-entities': 'error'
  }
}
```

## Related Rules

- [`no-danger`](./no-danger.md) - HTML injection safety

## Further Reading

- **[JSX In Depth](https://react.dev/learn/writing-markup-with-jsx)** - React docs
- **[HTML Entities](https://www.w3schools.com/html/html_entities.asp)** - Reference
## Known False Negatives

- `'` is not reported: an apostrophe renders as written and is ordinary prose.
- `>` and `}` in JSX text are a TypeScript parse error, so the rule never sees
  them in a `.tsx` file.
