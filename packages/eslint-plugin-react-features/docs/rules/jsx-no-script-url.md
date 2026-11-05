---
title: jsx-no-script-url
description: "Prevent javascript: URLs in JSX. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages."
tags: ['quality', 'react']
category: quality
autofix: suggestions
---

> **Keywords:** React, JSX, javascript URL, XSS, security, ESLint rule, LLM-optimized


<!-- @rule-summary -->
Prevent javascript: URLs in JSX. This rule is part of eslint-plugin-react-features and provides LLM-optimized error messages.
<!-- @/rule-summary -->

Prevent javascript: URLs in JSX. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages.

## Quick Summary

| Aspect         | Details                                 |
| -------------- | --------------------------------------- |
| **Severity**   | Error (security)                        |
| **Auto-Fix**   | ❌ No auto-fix                          |
| **Category**   | React Security                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For**   | All React/JSX projects                  |

## Rule Details

Using `javascript:` URLs is a security risk and can lead to XSS vulnerabilities.

## Examples

### ❌ Incorrect

```jsx
<a href="javascript:void(0)">Click</a>

<a href="javascript:alert('XSS')">Click</a>
```

### ✅ Correct

```jsx
<a href="#" onClick={handleClick}>Click</a>

<button onClick={handleClick}>Click</button>
```

## What is checked

- **Props**: `href`, `src`, `action`, `formAction`, `data`, `poster`, `background` and
  SVG's `xlink:href`, plus the component props named by the options.
- **Values**: a string in any letter case, after the leading control characters and the
  embedded tab / newline characters the URL parser strips; braced (`{'javascript:…'}`);
  a template whose text before the first placeholder is the scheme; either branch of a
  conditional. A dynamic value is not judged.

## Options

```javascript
{
  rules: {
    'react-features/jsx-no-script-url': ['error',
      // Component props to check, in addition to the URL props above
      [{ name: 'Link', props: ['to'] }],
      // Also read `settings.linkComponents` (eslint-plugin-react's shared setting:
      // `'Hyperlink'` checks its `href`; `{ name: 'Link', linkAttribute: 'to' }`
      // or `linkAttribute: ['to', 'href']` checks the named props)
      { includeFromSettings: true },
    ],
  },
}
```

## Related Rules

- [`jsx-no-target-blank`](./jsx-no-target-blank.mdx) - Require rel attributes